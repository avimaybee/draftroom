'use client';

interface ResearchEmptyStateProps {
  enrichError: string | null;
  jobError: string | null;
  onEnrich: () => void;
  onEdit: () => void;
}

export function ResearchEmptyState({
  enrichError,
  jobError,
  onEnrich,
  onEdit
}: ResearchEmptyStateProps) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm text-center space-y-4 py-12">
      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl w-fit mx-auto">
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </div>
      <div>
        <h4 className="text-base font-bold text-slate-900">No Research Available</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
          Run an automated enrichment scan or input custom branding observations to kickstart outreach preparation.
        </p>
      </div>

      {(enrichError || jobError) && (
        <div className="bg-rose-50 border border-rose-100 text-rose-600 p-2.5 rounded-lg text-xs font-semibold max-w-md mx-auto">
          {enrichError || jobError}
        </div>
      )}

      <div className="flex justify-center gap-3 pt-2">
        <button
          onClick={onEnrich}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-sm hover:scale-[1.01]"
        >
          Enrich via AI
        </button>
        <button
          onClick={onEdit}
          className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-4 py-2.5 rounded-xl transition"
        >
          Add Notes Manually
        </button>
      </div>
    </div>
  );
}
