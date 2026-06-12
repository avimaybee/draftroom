'use client';

interface ResearchLoadingStateProps {
  jobStatus: string | null;
}

export function ResearchLoadingState({ jobStatus }: ResearchLoadingStateProps) {
  return (
    <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-md max-w-xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Research Pipeline Executing</h4>
            <p className="text-xs text-slate-400 font-semibold mt-0.5">Cloudflare Workflows durable agent run</p>
          </div>
        </div>
        <span className="px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
          {jobStatus || 'QUEUED'}
        </span>
      </div>

      {/* Timeline Steps */}
      <div className="relative pl-6 border-l border-slate-200 space-y-5 ml-4">
        <div className="relative">
          <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
            jobStatus === 'QUEUED' ? 'bg-indigo-600 border-indigo-600 text-white animate-pulse' : 'bg-emerald-500 border-emerald-500 text-white'
          }`}>
            {jobStatus !== 'QUEUED' ? (
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
            )}
          </div>
          <div>
            <p className={`text-xs font-bold ${jobStatus === 'QUEUED' ? 'text-indigo-600' : 'text-slate-700'}`}>
              Queueing Background Work
            </p>
            <p className="text-[10px] text-slate-400 font-semibold">Acquiring sandbox instance</p>
          </div>
        </div>

        <div className="relative">
          <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
            jobStatus === 'QUEUED' ? 'bg-white border-slate-200' :
            jobStatus === 'RUNNING' ? 'bg-indigo-600 border-indigo-600 text-white animate-pulse' : 'bg-emerald-500 border-emerald-500 text-white'
          }`}>
            {jobStatus === 'COMPLETED' ? (
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            ) : jobStatus === 'RUNNING' ? (
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
            ) : null}
          </div>
          <div>
            <p className={`text-xs font-bold ${jobStatus === 'RUNNING' ? 'text-indigo-600 font-bold' : 'text-slate-400 font-semibold'}`}>
              Fetching Website Contents
            </p>
            <p className="text-[10px] text-slate-400 font-medium">Extracting clean markdown via Jina Reader</p>
          </div>
        </div>

        <div className="relative">
          <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
            jobStatus === 'RUNNING' ? 'bg-indigo-50 border-indigo-200 text-indigo-400 animate-pulse' :
            jobStatus === 'COMPLETED' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200'
          }`}>
            {jobStatus === 'COMPLETED' ? (
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            ) : jobStatus === 'RUNNING' ? (
              <div className="w-1 h-1 bg-indigo-500 rounded-full animate-ping"></div>
            ) : null}
          </div>
          <div>
            <p className={`text-xs font-bold ${jobStatus === 'RUNNING' ? 'text-slate-600' : 'text-slate-400 font-semibold'}`}>
              LLM Footprint & Branding Audit
            </p>
            <p className="text-[10px] text-slate-400 font-medium">Analyzing layout, copywriting, positioning, and pain points</p>
          </div>
        </div>

        <div className="relative">
          <div className={`absolute -left-[31px] top-0.5 w-4 h-4 rounded-full border flex items-center justify-center ${
            jobStatus === 'COMPLETED' ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-slate-200'
          }`}>
            {jobStatus === 'COMPLETED' && (
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <div>
            <p className={`text-xs font-bold ${jobStatus === 'COMPLETED' ? 'text-slate-800' : 'text-slate-400 font-semibold'}`}>
              Finalizing Snapshot
            </p>
            <p className="text-[10px] text-slate-400 font-medium">Storing research, evidence URLs, and opportunity hypotheses</p>
          </div>
        </div>
      </div>
    </div>
  );
}
