'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface DiscoveryLead {
  id?: string;
  name: string;
  website: string | null;
  phone: string | null;
  city: string | null;
  industry: string | null;
  sourceUrl: string | null;
}

type SearchPhase = 'idle' | 'starting' | 'waiting' | 'results' | 'error';

export default function DiscoveryPage() {
  const router = useRouter();
  const [niche, setNiche] = useState('');
  const [location, setLocation] = useState('');
  const [limit, setLimit] = useState(20);

  const [phase, setPhase] = useState<SearchPhase>('idle');
  const [isImporting, setIsImporting] = useState(false);
  const [results, setResults] = useState<DiscoveryLead[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);

  // Polling loop — checks job status updated by background workflow/simulation
  const checkJobStatus = useCallback(
    async (jobId: string): Promise<boolean> => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`);
        if (!res.ok) throw new Error('Failed to verify search progress');

        const raw = await res.json() as { status: string; errorSummary?: string };

        if (raw.status === 'COMPLETED') {
          // Results are already saved as candidate_leads in DB.
          // Redirect to candidates page so user can review/import them.
          router.push('/candidates');
          router.refresh();
          return true; // done
        } else if (raw.status === 'FAILED') {
          setError(raw.errorSummary || 'Discovery search failed. Check your Apify token and try again.');
          setPhase('error');
          setPollingJobId(null);
          return true; // done
        }
        return false; // still running
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Polling failed.';
        setError(msg);
        setPhase('error');
        setPollingJobId(null);
        return true; // stop polling
      }
    },
    [router],
  );

  useEffect(() => {
    if (!pollingJobId) return;

    let stopped = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const poll = async () => {
      if (stopped) return;
      const done = await checkJobStatus(pollingJobId);
      if (!done && !stopped) {
        timeoutId = setTimeout(poll, 6000); // 6s between polls
      }
    };

    poll();

    return () => {
      stopped = true;
      clearTimeout(timeoutId);
    };
  }, [pollingJobId, checkJobStatus]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!niche || !location) return;

    setPhase('starting');
    setError(null);
    setResults([]);
    setSelectedIds(new Set());

    try {
      const res = await fetch('/api/discovery/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, location, limit }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || 'Failed to start search');
      }

      const data = (await res.json()) as { jobId: string };
      setPollingJobId(data.jobId);
      setPhase('waiting');
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'An error occurred while searching.';
      setError(errMsg);
      setPhase('error');
    }
  };

  const toggleSelect = (index: number) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setSelectedIds(newSet);
  };

  const handleImport = async () => {
    if (selectedIds.size === 0) return;

    setIsImporting(true);
    setError(null);

    const itemsToImport = results.filter((_, i) => selectedIds.has(i));

    try {
      const res = await fetch('/api/discovery/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: itemsToImport }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error || 'Failed to import');
      }

      router.push('/leads');
      router.refresh();
    } catch (err: unknown) {
      console.error(err);
      const errMsg = err instanceof Error ? err.message : 'An error occurred while importing.';
      setError(errMsg);
      setIsImporting(false);
    }
  };

  const isSearching = phase === 'starting' || phase === 'waiting';

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight">Discovery Engine</h1>
          <p className="text-sm text-slate-500 font-medium mt-1">
            Search Google Maps via Apify to discover local business leads. Results are saved automatically.
          </p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Niche / Keyword</label>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g. Plumbers, Dentists"
              required
              disabled={isSearching}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium transition disabled:opacity-50"
            />
          </div>
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">City &amp; State</label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Abilene, Texas"
              required
              disabled={isSearching}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium transition disabled:opacity-50"
            />
          </div>
          <div className="w-full md:w-32">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Limit</label>
            <select
              value={limit}
              onChange={(e) => setLimit(Number(e.target.value))}
              disabled={isSearching}
              className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl px-4 py-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 font-medium transition disabled:opacity-50"
            >
              <option value={10}>10 Leads</option>
              <option value={20}>20 Leads</option>
              <option value={30}>30 Leads</option>
              <option value={50}>50 Leads</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isSearching ? 'Searching...' : 'Search Engine'}
          </button>
        </form>

        {error && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-medium">
            {error}
          </div>
        )}
      </div>

      {phase === 'starting' && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <p className="text-sm font-semibold text-slate-500">Starting Apify actor...</p>
        </div>
      )}

      {phase === 'waiting' && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
          <div className="text-center space-y-1">
            <p className="text-sm font-semibold text-slate-600">Apify is crawling Google Maps…</p>
            <p className="text-xs text-slate-400">This typically takes 1–4 minutes. You can stay on this page — results will appear automatically.</p>
          </div>
        </div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden animate-fade-in">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 className="text-sm font-bold text-slate-900">Found {results.length} Potential Leads</h2>
            <button
              onClick={handleImport}
              disabled={isImporting || selectedIds.size === 0}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold px-4 py-2 rounded-xl text-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImporting ? 'Importing...' : `Import ${selectedIds.size} Leads`}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="px-4 py-3 w-10 text-center">
                    <input
                      type="checkbox"
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                      checked={selectedIds.size === results.length}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedIds(new Set(results.map((_, i) => i)));
                        } else {
                          setSelectedIds(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="px-4 py-3">Business Name</th>
                  <th className="px-4 py-3">Website</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">City</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {results.map((lead, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition">
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                        checked={selectedIds.has(idx)}
                        onChange={() => toggleSelect(idx)}
                      />
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-900">{lead.name}</td>
                    <td className="px-4 py-3">
                      {lead.website ? (
                        <a href={lead.website} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
                          {lead.website.replace(/^https?:\/\/(www\.)?/, '')}
                        </a>
                      ) : (
                        <span className="text-slate-400 italic">No website</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{lead.phone || '-'}</td>
                    <td className="px-4 py-3">{lead.city || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
