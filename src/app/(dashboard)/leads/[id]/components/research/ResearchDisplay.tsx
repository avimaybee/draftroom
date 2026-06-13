'use client';

import { ResearchSnapshot } from './types';

interface ResearchDisplayProps {
  initialSnapshot: ResearchSnapshot;
  jobError: string | null;
  activeTab: 'overview' | 'audit' | 'opportunity';
  setActiveTab: (tab: 'overview' | 'audit' | 'opportunity') => void;
  onEnrich: () => void;
  onEdit: () => void;
}

export function ResearchDisplay({
  initialSnapshot,
  jobError,
  activeTab,
  setActiveTab,
  onEnrich,
  onEdit
}: ResearchDisplayProps) {
  const getConfidenceColor = (level: string) => {
    switch (level?.toUpperCase()) {
      case 'HIGH':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'LOW':
        return 'bg-rose-50 text-rose-700 border border-rose-200';
      default:
        return 'bg-slate-100 text-slate-600 border border-slate-200';
    }
  };

  const parseSources = (sourcesStr: string | null): string[] => {
    if (!sourcesStr) return [];
    try {
      return JSON.parse(sourcesStr);
    } catch {
      return [];
    }
  };

  const sourcesList = parseSources(initialSnapshot.sources);

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-fade-in">
      {jobError && (
        jobError.includes('429') ? (
          <div className="bg-amber-50 border-b border-amber-200 text-amber-800 p-3 text-xs font-semibold text-center flex items-center justify-center gap-2">
            <svg className="w-4.5 h-4.5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Cloudflare Browser Run limit exceeded. You can manually edit the research below.
          </div>
        ) : (
          <div className="bg-rose-50 border-b border-rose-100 text-rose-600 p-3 text-xs font-semibold text-center flex items-center justify-center gap-2">
            <svg className="w-4 h-4 text-rose-500 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {jobError}
          </div>
        )
      )}
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex flex-wrap justify-between items-center gap-3 bg-slate-50/40">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-bold text-slate-950 uppercase tracking-wider">Research Snapshot</h4>
            <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase ${getConfidenceColor(initialSnapshot.confidenceLevel)}`}>
              {initialSnapshot.confidenceLevel} Confidence
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
            Origin: {initialSnapshot.origin} &bull; Updated: {new Date(initialSnapshot.updatedAt || '').toLocaleDateString()}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEnrich}
            className="bg-indigo-600/90 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition"
          >
            Re-Enrich
          </button>
          <button
            onClick={onEdit}
            className="border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold px-3.5 py-2 rounded-xl transition"
          >
            Edit Notes
          </button>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-slate-100 px-5 text-xs font-bold text-slate-400">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-3.5 px-4 border-b-2 transition ${
            activeTab === 'overview' ? 'border-slate-900 text-slate-950' : 'border-transparent hover:text-slate-600'
          }`}
        >
          Company Overview
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`py-3.5 px-4 border-b-2 transition ${
            activeTab === 'audit' ? 'border-slate-900 text-slate-950' : 'border-transparent hover:text-slate-600'
          }`}
        >
          Branding & Audit
        </button>
        <button
          onClick={() => setActiveTab('opportunity')}
          className={`py-3.5 px-4 border-b-2 transition ${
            activeTab === 'opportunity' ? 'border-slate-900 text-slate-950' : 'border-transparent hover:text-slate-600'
          }`}
        >
          Pitch Hypothesis
        </button>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Company Summary</span>
              <p className="text-xs text-slate-800 font-medium leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-200/50">
                {initialSnapshot.companySummary || 'No summary registered yet.'}
              </p>
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Products & Services</span>
              <p className="text-xs text-slate-800 font-medium leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-200/50">
                {initialSnapshot.productsServicesSummary || 'No products/services list registered yet.'}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'audit' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Digital Presence</span>
              <p className="text-xs text-slate-800 font-medium leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-200/50 h-full">
                {initialSnapshot.digitalPresenceNotes || 'No notes.'}
              </p>
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Website Critique</span>
              <p className="text-xs text-slate-800 font-medium leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-200/50 h-full">
                {initialSnapshot.websiteNotes || 'No notes.'}
              </p>
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Branding Observations</span>
              <p className="text-xs text-slate-800 font-medium leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-200/50 h-full">
                {initialSnapshot.brandingNotes || 'No notes.'}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'opportunity' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Potential Pain Points</span>
              <p className="text-xs text-slate-800 font-medium leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-200/50">
                {initialSnapshot.painPointsHypotheses || 'No hypotheses compiled.'}
              </p>
            </div>
            <div className="space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Agency Opportunities</span>
              <p className="text-xs text-slate-800 font-medium leading-relaxed bg-slate-50/50 p-4 rounded-xl border border-slate-200/50">
                {initialSnapshot.opportunityHypotheses || 'No hypotheses compiled.'}
              </p>
            </div>
          </div>
        )}

        {/* Sources Footer */}
        {sourcesList.length > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Sources Checked</span>
            <div className="flex flex-wrap gap-2">
              {sourcesList.map((src, i) => (
                <a
                  key={i}
                  href={src}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/60 text-[10px] font-bold text-indigo-600 transition"
                >
                  <svg className="w-3 h-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  {src.replace(/https?:\/\/(www\.)?/, '').substring(0, 30)}
                  {src.length > 30 && '...'}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
