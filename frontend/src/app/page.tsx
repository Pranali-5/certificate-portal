'use client';

import { FormEvent, useEffect, useState } from 'react';

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

type User = { id: string; name: string; email: string };
type AuthMode = 'login' | 'signup';
type AuthErrors = Record<string, string>;

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    fetch(`${apiUrl}/api/auth/me`, { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : null))
      .then((result) => setUser(result?.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setCheckingSession(false));
  }, []);

  if (checkingSession)
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--background)] text-sm text-[var(--ink-muted)]">
        Loading your workspace...
      </div>
    );
  if (!user) return <AuthScreen onAuthenticated={setUser} />;
  return <Dashboard user={user} onLogout={() => setUser(null)} />;
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<AuthErrors>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrors({});
    setMessage('');

    const validationErrors: AuthErrors = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) validationErrors.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail))
      validationErrors.email = 'Enter a valid email address';
    if (!password) validationErrors.password = 'Password is required';
    else if (password.length < 8) validationErrors.password = 'Password must be at least 8 characters';
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setLoading(true);
    try {
      const body = mode === 'signup' ? { name, email: trimmedEmail, password } : { email: trimmedEmail, password };
      const response = await fetch(`${apiUrl}/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        setErrors(result.error?.fields ?? {});
        setMessage(result.error?.message ?? 'Something went wrong. Please try again.');
        return;
      }
      onAuthenticated(result.user);
    } catch {
      setMessage('The service is unavailable. Make sure the backend is running and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-[var(--line)] bg-white shadow-[0_20px_60px_rgba(30,70,58,0.1)] md:grid-cols-2">
        <section className="paper-grain hidden bg-[var(--cream)] p-12 md:block">
          <Brand />
          <div className="mt-36">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">
              Your certification journey
            </p>
            <h1 className="mt-4 font-[var(--font-display)] text-6xl leading-[0.98] tracking-[-0.05em]">
              A clearer path
              <br />
              to <em className="text-[var(--orange)]">what&apos;s next.</em>
            </h1>
            <p className="mt-6 max-w-sm text-sm leading-6 text-[var(--ink-muted)]">
              Securely apply, track, and receive your provisional certificate from one calm, simple
              workspace.
            </p>
          </div>
        </section>
        <section className="p-7 sm:p-12">
          <div className="mb-9 md:hidden">
            <Brand />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">
            Welcome to Civicert
          </p>
          <h2 className="mt-3 font-[var(--font-display)] text-4xl tracking-[-0.04em]">
            {mode === 'login' ? 'Sign in to Civicert' : 'Create your account'}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">
            {mode === 'login'
              ? 'Your application journey is waiting for you.'
              : 'Start your provisional certificate application in minutes.'}
          </p>
          <div className="mt-7 flex rounded-xl bg-[#f1f6f3] p-1">
            <button
              type="button"
              className={`flex-1 rounded-lg py-2.5 text-sm font-bold ${mode === 'login' ? 'bg-white text-[var(--foreground)] shadow-sm' : 'text-[var(--ink-muted)]'}`}
              onClick={() => {
                setMode('login');
                setErrors({});
                setMessage('');
              }}
            >
              Sign in
            </button>
            <button
              type="button"
              className={`flex-1 rounded-lg py-2.5 text-sm font-bold ${mode === 'signup' ? 'bg-white text-[var(--foreground)] shadow-sm' : 'text-[var(--ink-muted)]'}`}
              onClick={() => {
                setMode('signup');
                setErrors({});
                setMessage('');
              }}
            >
              Create account
            </button>
          </div>
          <form className="mt-7 grid gap-4" onSubmit={submit} noValidate>
            {mode === 'signup' && (
              <Field
                label="Full name"
                type="text"
                value={name}
                onChange={setName}
                error={errors.name}
                placeholder="Alex Rivera"
                autoComplete="name"
              />
            )}
            <Field
              label="Email address"
              type="email"
              value={email}
              onChange={setEmail}
              error={errors.email}
              placeholder="you@example.com"
              autoComplete="email"
            />
            <Field
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              error={errors.password}
              placeholder="At least 8 characters"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
            {message && (
              <p
                className="rounded-xl bg-[#fff0e8] px-3 py-2.5 text-xs font-semibold text-[#b66038]"
                role="alert"
              >
                {message}
              </p>
            )}
            <button
              disabled={loading}
              className="mt-2 rounded-xl bg-[var(--teal)] py-3.5 text-sm font-bold text-white transition hover:bg-[#095548] disabled:cursor-wait disabled:opacity-60"
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Sign in securely'
                  : 'Create account'}
              <span className="ml-2">→</span>
            </button>
          </form>
          <p className="mt-7 text-center text-xs leading-5 text-[var(--ink-muted)]">
            Your session is protected with an HTTP-only cookie.
          </p>
        </section>
      </div>
    </main>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#d6ece4] text-xl text-[var(--teal)]">
        ✦
      </div>
      <span className="text-xl font-bold tracking-[-0.04em]">civicert</span>
    </div>
  );
}

function Field({
  label,
  type,
  value,
  onChange,
  error,
  placeholder,
  autoComplete,
}: {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder: string;
  autoComplete: string;
}) {
  return (
    <label className="grid gap-2 text-xs font-bold text-[#52675f]">
      {label}
      <input
        className={`rounded-xl border bg-white px-3.5 py-3 text-sm font-normal text-[var(--foreground)] outline-none transition placeholder:text-[#abb9b4] focus:border-[var(--teal)] focus:ring-4 focus:ring-[#0e6b5c12] ${error ? 'border-[#d76e58]' : 'border-[var(--line)]'}`}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
      />
      {error && <span className="text-xs font-semibold text-[#c55d47]">{error}</span>}
    </label>
  );
}

function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [formOpen, setFormOpen] = useState(false);
  const [applicationsFromApi, setApplicationsFromApi] = useState<
    Array<{
      id: string;
      refNumber: string;
      createdAt: string;
      status: string;
      certificateKey?: string | null;
      documents?: Array<{ type: 'ID_PROOF' | 'DEGREE_CERTIFICATE'; originalName: string }>;
    }>
  >([]);
  useEffect(() => {
    fetch(`${apiUrl}/api/applications`, { credentials: 'include' })
      .then((response) => (response.ok ? response.json() : []))
      .then(setApplicationsFromApi)
      .catch(() => setApplicationsFromApi([]));
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
      <header className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-6 lg:px-10">
        <Brand />
        <nav className="hidden items-center gap-8 text-sm text-[var(--ink-muted)] md:flex">
          <a className="font-semibold text-[var(--foreground)]" href="#applications">
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
      <section className="paper-grain border-y border-[var(--line)] bg-[var(--cream)] px-6 py-12 lg:px-10 lg:py-16">
        <div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[1fr_420px] lg:items-end">
          <div>
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">
              Applicant dashboard
            </p>
            <h1 className="max-w-2xl font-[var(--font-display)] text-5xl leading-[0.98] tracking-[-0.05em] text-[#21443a] sm:text-7xl">
              Your certificates,
              <br />
              <em className="text-[var(--orange)]">made simple.</em>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-[var(--ink-muted)]">
              Apply for your provisional certificate, track progress, and keep every document in one
              secure place.
            </p>
          </div>
          <div className="rounded-[24px] bg-[#deeee8] p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">Application progress</span>
              <span className="text-xs font-bold text-[var(--teal)]">3 simple steps</span>
            </div>
            <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#c1ddd3]">
              <div className="h-full w-1/3 rounded-full bg-[var(--teal)]" />
            </div>
            <p className="mt-5 text-sm leading-6 text-[var(--ink-muted)]">
              Keep your details and documents ready. You can review everything before submitting.
            </p>
            <button
              onClick={() => setFormOpen(true)}
              className="mt-4 w-full rounded-xl bg-[var(--teal)] py-3.5 text-sm font-bold text-white transition hover:bg-[#095548]"
            >
              Start new application <span className="ml-2">↗</span>
            </button>
          </div>
        </div>
      </section>
      <section id="applications" className="mx-auto max-w-[1280px] px-6 py-12 lg:px-10 lg:py-16">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink-muted)]">
              Your activity
            </p>
            <h2 className="mt-2 font-[var(--font-display)] text-4xl tracking-[-0.04em]">
              Recent applications
            </h2>
          </div>
        </div>
        <div className="mt-8 grid gap-3">
          {applicationsFromApi.length ? (
            applicationsFromApi.map((application) => (
              <ApplicationRow
                key={application.id}
                applicationId={application.id}
                ref={application.refNumber}
                date={new Date(application.createdAt).toLocaleDateString()}
                status={application.status === 'COMPLETED' ? 'Completed' : 'Submitted'}
                tone={application.status === 'COMPLETED' ? 'orange' : 'teal'}
              />
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-[#c8d9d3] p-8 text-center text-sm text-[var(--ink-muted)]">
              No applications yet. Start your first one above.
            </p>
          )}
        </div>
      </section>
      <footer
        id="help"
        className="border-t border-[var(--line)] px-6 py-8 text-center text-xs text-[var(--ink-muted)]"
      >
        Civicert · Secure provisional certificate applications
      </footer>
      {formOpen && (
        <ApplicationForm
          onClose={() => setFormOpen(false)}
          onSubmitted={() => {
            setFormOpen(false);
            fetch(`${apiUrl}/api/applications`, { credentials: 'include' })
              .then((response) => response.json())
              .then(setApplicationsFromApi);
          }}
        />
      )}
    </main>
  );
}

function ApplicationForm({
  onClose,
  onSubmitted,
}: {
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [step, setStep] = useState(1);
  const [applicationId, setApplicationId] = useState('');
  const [details, setDetails] = useState({ fullName: '', dob: '', regNumber: '', address: '' });
  const [files, setFiles] = useState<{ ID_PROOF?: File; DEGREE_CERTIFICATE?: File }>({});
  const [errors, setErrors] = useState<AuthErrors>({});
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const setDetail = (key: keyof typeof details, value: string) =>
    setDetails((current) => ({ ...current, [key]: value }));
  const next = async () => {
    setErrors({});
    setMessage('');
    if (step === 1) {
      const nextErrors: AuthErrors = {};
      if (details.fullName.trim().length < 2) nextErrors.fullName = 'Enter your full name';
      if (!details.dob) nextErrors.dob = 'Select your date of birth';
      if (details.regNumber.trim().length < 2)
        nextErrors.regNumber = 'Enter your registration number';
      if (details.address.trim().length < 10) nextErrors.address = 'Enter at least 10 characters';
      if (Object.keys(nextErrors).length) {
        setErrors(nextErrors);
        return;
      }
      setLoading(true);
      try {
        const response = await fetch(`${apiUrl}/api/applications`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(details),
        });
        const result = await response.json();
        if (!response.ok) {
          setErrors(result.error?.fields ?? {});
          setMessage(result.error?.message ?? 'Could not save your details');
          return;
        }
        setApplicationId(result.id);
        setStep(2);
      } catch {
        setMessage('Could not connect to the server');
      } finally {
        setLoading(false);
      }
    } else if (step === 2) {
      if (!files.ID_PROOF || !files.DEGREE_CERTIFICATE) {
        setMessage('Upload both required PDF documents');
        return;
      }
      setStep(3);
    }
  };
  const submit = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`${apiUrl}/api/applications/${applicationId}/submit`, {
        method: 'POST',
        credentials: 'include',
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error?.message ?? 'Could not submit application');
        return;
      }
      await downloadCertificate(applicationId);
      onSubmitted();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not connect to the server');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-[#18332d99] p-4">
      <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[24px] bg-white p-6 shadow-2xl sm:p-9">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">
              New application
            </p>
            <h2 className="mt-2 font-[var(--font-display)] text-3xl tracking-[-0.04em]">
              Provisional certificate
            </h2>
          </div>
          <button onClick={onClose} className="text-2xl text-[var(--ink-muted)]" aria-label="Close">
            ×
          </button>
        </div>
        <div className="mt-7 grid grid-cols-3 gap-2">
          {['Your details', 'Documents', 'Review'].map((label, index) => (
            <div
              key={label}
              className={`border-t-2 pt-2 text-xs font-bold ${step === index + 1 ? 'border-[var(--teal)] text-[var(--teal)]' : step > index + 1 ? 'border-[#a9d4c5] text-[#6d9688]' : 'border-[var(--line)] text-[var(--ink-muted)]'}`}
            >
              <span className="mr-1">0{index + 1}</span>
              {label}
            </div>
          ))}
        </div>
        {step === 1 && (
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            <FormInput
              label="Full name"
              value={details.fullName}
              onChange={(value) => setDetail('fullName', value)}
              error={errors.fullName}
              placeholder="Alex Rivera"
            />
            <FormInput
              label="Date of birth"
              type="date"
              value={details.dob}
              onChange={(value) => setDetail('dob', value)}
              error={errors.dob}
            />
            <FormInput
              label="Registration number"
              value={details.regNumber}
              onChange={(value) => setDetail('regNumber', value)}
              error={errors.regNumber}
              placeholder="REG-2026-00421"
            />
            <FormInput
              label="Current address"
              value={details.address}
              onChange={(value) => setDetail('address', value)}
              error={errors.address}
              placeholder="Enter your full address"
              textarea
            />
          </div>
        )}
        {step === 2 && (
          <div className="mt-8 grid gap-4">
            <DocumentInput
              label="ID proof"
              type="ID_PROOF"
              file={files.ID_PROOF}
              onFile={(file) => setFiles((current) => ({ ...current, ID_PROOF: file }))}
              applicationId={applicationId}
              setMessage={setMessage}
            />
            <DocumentInput
              label="Degree certificate"
              type="DEGREE_CERTIFICATE"
              file={files.DEGREE_CERTIFICATE}
              onFile={(file) => setFiles((current) => ({ ...current, DEGREE_CERTIFICATE: file }))}
              applicationId={applicationId}
              setMessage={setMessage}
            />
          </div>
        )}
        {step === 3 && (
          <div className="mt-8 rounded-2xl bg-[#f1f6f3] p-5">
            <h3 className="font-[var(--font-display)] text-xl">Review your application</h3>
            <div className="mt-5 grid gap-3 text-sm">
              <ReviewLine label="Full name" value={details.fullName} />
              <ReviewLine label="Date of birth" value={details.dob} />
              <ReviewLine label="Registration number" value={details.regNumber} />
              <ReviewLine label="Documents" value="ID proof and degree certificate" />
            </div>
          </div>
        )}
        {message && (
          <p
            className="mt-5 rounded-xl bg-[#fff0e8] px-3 py-2.5 text-xs font-semibold text-[#b66038]"
            role="alert"
          >
            {message}
          </p>
        )}
        <div className="mt-8 flex justify-between gap-3 border-t border-[var(--line)] pt-5">
          <button
            onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
            className="rounded-xl border border-[var(--line)] px-4 py-3 text-sm font-bold"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step < 3 ? (
            <button
              disabled={loading}
              onClick={next}
              className="rounded-xl bg-[var(--teal)] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {loading ? 'Saving...' : 'Continue →'}
            </button>
          ) : (
            <button
              disabled={loading}
              onClick={submit}
              className="rounded-xl bg-[var(--teal)] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {loading ? 'Submitting...' : 'Submit application →'}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  error,
  placeholder,
  type = 'text',
  textarea = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  placeholder?: string;
  type?: string;
  textarea?: boolean;
}) {
  return (
    <label className="grid gap-2 text-xs font-bold text-[#52675f] sm:last:col-span-2">
      {label}
      {textarea ? (
        <textarea
          rows={3}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`rounded-xl border px-3.5 py-3 text-sm font-normal outline-none focus:border-[var(--teal)] ${error ? 'border-[#d76e58]' : 'border-[var(--line)]'}`}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={`rounded-xl border px-3.5 py-3 text-sm font-normal outline-none focus:border-[var(--teal)] ${error ? 'border-[#d76e58]' : 'border-[var(--line)]'}`}
        />
      )}{' '}
      {error && <span className="text-xs font-semibold text-[#c55d47]">{error}</span>}
    </label>
  );
}

function DocumentInput({
  label,
  type,
  file,
  onFile,
  applicationId,
  setMessage,
}: {
  label: string;
  type: 'ID_PROOF' | 'DEGREE_CERTIFICATE';
  file?: File;
  onFile: (file: File) => void;
  applicationId: string;
  setMessage: (message: string) => void;
}) {
  const upload = async (selected: File) => {
    if (selected.type !== 'application/pdf') {
      setMessage(`${label} must be a PDF file`);
      return;
    }
    if (selected.size > 5 * 1024 * 1024) {
      setMessage(`${label} must be 5MB or smaller`);
      return;
    }
    try {
      const presign = await fetch(`${apiUrl}/api/applications/${applicationId}/documents/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type,
          originalName: selected.name,
          sizeBytes: selected.size,
          contentType: selected.type,
        }),
      });
      const data = await presign.json();
      if (!presign.ok) throw new Error(data.error?.message ?? 'Could not prepare upload');
      const put = await fetch(data.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/pdf' },
        body: selected,
      });
      if (!put.ok) throw new Error('File upload failed');
      const confirm = await fetch(`${apiUrl}/api/applications/${applicationId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          type,
          originalName: selected.name,
          sizeBytes: selected.size,
          contentType: selected.type,
          s3Key: data.s3Key,
        }),
      });
      if (!confirm.ok) throw new Error('Could not confirm upload');
      onFile(selected);
      setMessage('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not upload file');
    }
  };
  return (
    <label className="flex cursor-pointer items-center gap-4 rounded-2xl border border-dashed border-[#b7d1c8] bg-[#f7fbf9] p-5">
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e0f1eb] text-xl text-[var(--teal)]">
        ↑
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm">{label}</strong>
        <small className="mt-1 block truncate text-xs text-[var(--ink-muted)]">
          {file
            ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`
            : 'PDF only · maximum 5MB'}
        </small>
      </span>
      <span className="rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-bold">
        {file ? 'Replace' : 'Choose file'}
      </span>
      <input
        className="hidden"
        type="file"
        accept="application/pdf,.pdf"
        onChange={(event) => {
          const selected = event.target.files?.[0];
          if (selected) void upload(selected);
        }}
      />
    </label>
  );
}

function ReviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[var(--line)] pb-3">
      <span className="text-[var(--ink-muted)]">{label}</span>
      <strong className="text-right">{value}</strong>
    </div>
  );
}

async function downloadCertificate(applicationId: string) {
  const popup = window.open('about:blank', '_blank');
  const response = await fetch(`${apiUrl}/api/applications/${applicationId}/certificate`, {
    method: 'POST',
    credentials: 'include',
  });
  const result = await response.json();
  if (!response.ok || !result.url) {
    popup?.close();
    throw new Error(result.error?.message ?? 'Certificate download failed');
  }
  if (popup) popup.location.href = result.url;
  else window.location.assign(result.url);
}

async function downloadDocument(applicationId: string, type: 'ID_PROOF' | 'DEGREE_CERTIFICATE') {
  const popup = window.open('about:blank', '_blank');
  const response = await fetch(
    `${apiUrl}/api/applications/${applicationId}/documents/${type}/download`,
    { credentials: 'include' },
  );
  const result = await response.json();
  if (!response.ok || !result.url) {
    popup?.close();
    throw new Error(result.error?.message ?? 'Document download failed');
  }
  if (popup) popup.location.href = result.url;
  else window.location.assign(result.url);
}

function ApplicationRow({
  ref: reference,
  date,
  status,
  tone,
  applicationId,
}: {
  ref: string;
  date: string;
  status: string;
  tone: string;
  applicationId?: string;
}) {
  const [downloading, setDownloading] = useState(false);
  const [actionError, setActionError] = useState('');
  const download = async () => {
    setDownloading(true);
    setActionError('');
    try {
      await downloadCertificate(applicationId ?? reference);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Receipt download failed');
    } finally {
      setDownloading(false);
    }
  };
  const downloadDocumentByType = async (type: 'ID_PROOF' | 'DEGREE_CERTIFICATE') => {
    setDownloading(true);
    setActionError('');
    try {
      await downloadDocument(applicationId ?? reference, type);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Document download failed');
    } finally {
      setDownloading(false);
    }
  };
  const remove = async () => {
    if (
      !window.confirm(
        `Delete application ${reference}? This also removes its uploaded documents and cannot be undone.`,
      )
    )
      return;
    setDownloading(true);
    try {
      const response = await fetch(`${apiUrl}/api/applications/${applicationId ?? reference}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error?.message ?? 'Application could not be deleted');
      }
      window.location.reload();
    } finally {
      setDownloading(false);
    }
  };
  return (
    <div className="relative flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_4px_20px_rgba(30,70,58,0.04)] transition hover:border-[#afcfc3] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <div
          className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tone === 'teal' ? 'bg-[#e0f1eb] text-[var(--teal)]' : 'bg-[#fff0e8] text-[#c86f3f]'}`}
        >
          ▤
        </div>
        <div>
          <p className="font-bold tracking-tight">{reference}</p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">Submitted {date}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => downloadDocumentByType('ID_PROOF')}
              disabled={downloading}
              className="rounded-lg bg-[#f1f6f3] px-2.5 py-1.5 text-xs font-bold text-[var(--teal)] disabled:opacity-50"
            >
              ID proof ↗
            </button>
            <button
              onClick={() => downloadDocumentByType('DEGREE_CERTIFICATE')}
              disabled={downloading}
              className="rounded-lg bg-[#f1f6f3] px-2.5 py-1.5 text-xs font-bold text-[var(--teal)] disabled:opacity-50"
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
          className={`rounded-full px-3 py-1 text-xs font-bold ${status === 'Submitted' ? 'bg-[#e0f1eb] text-[var(--teal)]' : 'bg-[#fff0e8] text-[#b66038]'}`}
        >
          {status}
        </span>
        <button
          onClick={download}
          disabled={downloading}
          className="rounded-lg border border-[var(--line)] px-3 py-2 text-xs font-bold text-[var(--teal)] disabled:opacity-50"
        >
          {downloading ? 'Preparing...' : 'Download receipt'}
        </button>
        <button
          onClick={remove}
          disabled={downloading}
          className="rounded-lg border border-[#f0c7bb] px-3 py-2 text-xs font-bold text-[#b66038] disabled:opacity-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
