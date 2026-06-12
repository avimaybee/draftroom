'use client';

import { useState, useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ResearchSnapshot } from './components/research/types';
import { ResearchLoadingState } from './components/research/ResearchLoadingState';
import { ResearchEmptyState } from './components/research/ResearchEmptyState';
import { ResearchEditForm } from './components/research/ResearchEditForm';
import { ResearchDisplay } from './components/research/ResearchDisplay';

interface ClientResearchViewProps {
  leadId: string;
  initialSnapshot: ResearchSnapshot | null;
  triggerEnrichmentAction: (leadId: string) => Promise<{ error: string | null }>;
  saveResearchSnapshotAction: (prevState: any, formData: FormData) => Promise<any>;
}

export default function ClientResearchView({
  leadId,
  initialSnapshot,
  triggerEnrichmentAction,
  saveResearchSnapshotAction,
}: ClientResearchViewProps) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'audit' | 'opportunity'>('overview');
  const [state, formAction] = useActionState(saveResearchSnapshotAction, { error: null });

  const [enrichError, setEnrichError] = useState<string | null>(null);

  // Polling state for background jobs
  const [pollingJobId, setPollingJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [jobError, setJobError] = useState<string | null>(null);

  useEffect(() => {
    if (!pollingJobId) return;

    let intervalId: any;
    const checkJob = async () => {
      try {
        const res = await fetch(`/api/jobs/${pollingJobId}`);
        if (!res.ok) {
          throw new Error('Failed to fetch job status');
        }
        const data = (await res.json()) as any;
        setJobStatus(data.status);
        if (data.status === 'COMPLETED') {
          clearInterval(intervalId);
          setPollingJobId(null);
          setJobStatus(null);
          // Reload page data to reflect new snapshot
          router.refresh();
        } else if (data.status === 'FAILED') {
          clearInterval(intervalId);
          setPollingJobId(null);
          setJobStatus(null);
          setJobError(data.errorSummary || 'Research enrichment job failed.');
        }
      } catch (err: any) {
        console.error('Polling error:', err);
        clearInterval(intervalId);
        setPollingJobId(null);
        setJobStatus(null);
        setJobError('Failed to verify job status. Please refresh.');
      }
    };

    // Run first check immediately
    checkJob();

    intervalId = setInterval(checkJob, 2500);

    return () => clearInterval(intervalId);
  }, [pollingJobId, router]);

  const handleEnrich = async () => {
    setEnrichError(null);
    setJobError(null);
    setJobStatus('QUEUED');
    
    try {
      const res = await fetch(`/api/leads/${leadId}/research`, {
        method: 'POST',
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as any;
        throw new Error(errData.error || `Failed to trigger research: status ${res.status}`);
      }

      const { jobId } = (await res.json()) as any;
      setPollingJobId(jobId);
    } catch (err: any) {
      console.error('Failed to launch research job:', err);
      setEnrichError(err.message || 'Failed to start research enrichment.');
      setJobStatus(null);
    }
  };

  // 1. Loading/Triggering State
  if (pollingJobId || jobStatus === 'QUEUED' || jobStatus === 'RUNNING') {
    return <ResearchLoadingState jobStatus={jobStatus} />;
  }

  // 2. Empty State
  if (!initialSnapshot && !isEditing) {
    return (
      <ResearchEmptyState 
        enrichError={enrichError}
        jobError={jobError}
        onEnrich={handleEnrich}
        onEdit={() => setIsEditing(true)}
      />
    );
  }

  // 3. Edit State (Form)
  if (isEditing) {
    const handleFormSubmit = () => {
      // Delay closing editing view until after action completes
      setTimeout(() => setIsEditing(false), 200);
    };

    return (
      <ResearchEditForm
        leadId={leadId}
        initialSnapshot={initialSnapshot}
        formAction={formAction}
        onCancel={() => setIsEditing(false)}
        onSave={handleFormSubmit}
      />
    );
  }

  // 4. View Mode
  if (!initialSnapshot) return null;

  return (
    <ResearchDisplay
      initialSnapshot={initialSnapshot}
      jobError={jobError}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onEnrich={handleEnrich}
      onEdit={() => setIsEditing(true)}
    />
  );
}
