'use client';

import { useEffect, useState } from 'react';
import { apiUrl, downloadCertificate, downloadDocument } from '../lib/api';
import { ApplicationSummary, DocumentType, User } from '../types';
import { ApplicationForm } from './ApplicationForm';
import { Brand } from './Brand';

export function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [formOpen, setFormOpen] = useState(false);
  const [applications, setApplications] = useState<ApplicationSummary[]>([]);
  const loadApplications = () =>
    fetch(`${apiUrl}/api/applications`, { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : []))
      .then(setApplications)
      .catch(() => setApplications([]));
  useEffect(() => {
    void loadApplications();
  }, []);
  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  const logout = async () => {
    await fetch(`${apiUrl}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    onLogout();
  };
  return (
    <main className="min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 lg:px-10">
        <Brand />
        <nav className="hidden items-center gap-8 text-sm text-(--ink-muted) md:flex">
          <a className="font-semibold text-foreground" href="#applications">
            Applications
          </a>
        </nav>
        <button className="flex items-center gap-3 text-sm font-semibold">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#e1b99d] text-[#623d2d]">
            {initials}
          </span>
          <span className="hidden sm:block">{user.name}</span>
          <span className="text-xs" onClick={logout}>
            Sign out
          </span>
        </button>
      </header>
      <section className="paper-grain border-y border-(--line) bg-(--cream) px-6 py-12 lg:px-10 lg:py-16">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-(--orange)">
              Applicant dashboard
            </p>
            <h1 className="max-w-2xl font-(--font-display) text-5xl leading-[0.98] tracking-tighter text-[#21443a] sm:text-7xl">
              Your certificates,
              <br />
              <em className="text-(--orange)">made simple.</em>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-(--ink-muted)">
              Apply for your provisional certificate, track progress, and keep every document in one
              secure place.
            </p>
          </div>
          <div className="rounded-3xl bg-[#deeee8] p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Application progress</span>
              <span className="text-xs font-bold text-(--teal)">3 simple steps</span>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#c1ddd3]">
              <div className="h-full w-1/3 rounded-full bg-(--teal)" />
            </div>
            <p className="mt-5 text-sm leading-6 text-(--ink-muted)">
              Keep your details and documents ready. You can review everything before submitting.
            </p>
            <button
              onClick={() => setFormOpen(true)}
              className="mt-4 w-full rounded-xl bg-(--teal) py-3.5 text-sm font-bold text-white transition hover:bg-[#095548]"
            >
              Start new application <span className="ml-2">↗</span>
            </button>
          </div>
        </div>
      </section>
      <section id="applications" className="mx-auto max-w-7xl px-6 py-12 lg:px-10 lg:py-16">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-(--ink-muted)">
            Your activity
          </p>
          <h2 className="mt-2 font-(--font-display) text-4xl tracking-[-0.04em]">
            Recent applications
          </h2>
        </div>
        <div className="mt-8 grid gap-3">
          {applications.length ? (
            applications.map((application) => (
              <ApplicationRow key={application.id} application={application} />
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-[#c8d9d3] p-8 text-center text-sm text-(--ink-muted)">
              No applications yet. Start your first one above.
            </p>
          )}
        </div>
      </section>
      <footer className="border-t border-(--line) px-6 py-8 text-center text-xs text-(--ink-muted)">
        Civicert · Secure provisional certificate applications
      </footer>
      {formOpen && (
        <ApplicationForm
          onClose={() => setFormOpen(false)}
          onSubmitted={() => {
            setFormOpen(false);
            void loadApplications();
          }}
        />
      )}
    </main>
  );
}

function ApplicationRow({ application }: { application: ApplicationSummary }) {
  const [downloading, setDownloading] = useState(false);
  const [actionError, setActionError] = useState('');
  const applicationId = application.id;
  const runAction = async (action: () => Promise<void>, fallback: string) => {
    setDownloading(true);
    setActionError('');
    try {
      await action();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : fallback);
    } finally {
      setDownloading(false);
    }
  };
  const remove = async () => {
    if (
      !window.confirm(
        `Delete application ${application.refNumber}? This also removes its uploaded documents and cannot be undone.`,
      )
    )
      return;
    await runAction(async () => {
      const response = await fetch(`${apiUrl}/api/applications/${applicationId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error?.message ?? 'Application could not be deleted');
      }
      window.location.reload();
    }, 'Application could not be deleted');
  };
  const downloadFile = (type?: DocumentType) =>
    runAction(
      () => (type ? downloadDocument(applicationId, type) : downloadCertificate(applicationId)),
      type ? 'Document download failed' : 'Receipt download failed',
    );
  const isCompleted = application.status === 'COMPLETED';
  return (
    <div className="relative flex flex-col gap-4 rounded-2xl border border-(--line) bg-white p-5 shadow-[0_4px_20px_rgba(30,70,58,0.04)] transition hover:border-[#afcfc3] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${isCompleted ? 'bg-[#fff0e8] text-[#c86f3f]' : 'bg-[#e0f1eb] text-(--teal)'}`}
        >
          ▤
        </div>
        <div>
          <p className="font-bold tracking-tight">{application.refNumber}</p>
          <p className="mt-1 text-sm text-(--ink-muted)">
            Submitted {new Date(application.createdAt).toLocaleDateString()}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => void downloadFile('ID_PROOF')}
              disabled={downloading}
              className="rounded-lg bg-[#f1f6f3] px-2.5 py-1.5 text-xs font-bold text-(--teal) disabled:opacity-50"
            >
              ID proof ↗
            </button>
            <button
              onClick={() => void downloadFile('DEGREE_CERTIFICATE')}
              disabled={downloading}
              className="rounded-lg bg-[#f1f6f3] px-2.5 py-1.5 text-xs font-bold text-(--teal) disabled:opacity-50"
            >
              Degree certificate ↗
            </button>
          </div>
          {actionError && (
            <p className="mt-2 text-xs font-semibold text-[#b66038]" role="alert">
              {actionError}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <span
          className={`rounded-full px-3 py-1 text-xs font-bold ${isCompleted ? 'bg-[#fff0e8] text-[#b66038]' : 'bg-[#e0f1eb] text-(--teal)'}`}
        >
          {isCompleted ? 'Completed' : 'Submitted'}
        </span>
        <button
          onClick={() => void downloadFile()}
          disabled={downloading}
          className="rounded-lg border border-(--line) px-3 py-2 text-xs font-bold text-(--teal) disabled:opacity-50"
        >
          {downloading ? 'Preparing...' : 'Download receipt'}
        </button>
        <button
          onClick={() => void remove()}
          disabled={downloading}
          className="rounded-lg border border-[#f0c7bb] px-3 py-2 text-xs font-bold text-[#b66038] disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
