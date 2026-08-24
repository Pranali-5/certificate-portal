'use client';

import { FormEvent, useState } from 'react';
import { apiUrl } from '../lib/api';
import { AuthErrors, AuthMode, User } from '../types';
import { Brand } from './Brand';
import { Field } from './Field';

export function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
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
    else if (password.length < 8)
      validationErrors.password = 'Password must be at least 8 characters';
    if (Object.keys(validationErrors).length) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    try {
      const body =
        mode === 'signup'
          ? { name, email: trimmedEmail, password }
          : { email: trimmedEmail, password };
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
    <main className="flex min-h-screen items-center justify-center bg-background px-5 py-10">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-(--line) bg-white shadow-[0_20px_60px_rgba(30,70,58,0.1)] md:grid-cols-2">
        <section className="paper-grain hidden bg-(--cream) p-12 md:block">
          <Brand />
          <div className="mt-36">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-(--orange)">
              Your certification journey
            </p>
            <h1 className="mt-4 font-(--font-display) text-6xl leading-[0.98] tracking-tighter">
              A clearer path
              <br />
              to <em className="text-(--orange)">what&apos;s next.</em>
            </h1>
            <p className="mt-6 max-w-sm text-sm leading-6 text-(--ink-muted)">
              Securely apply, track, and receive your provisional certificate from one calm, simple
              workspace.
            </p>
          </div>
        </section>
        <section className="p-7 sm:p-12">
          <div className="mb-9 md:hidden">
            <Brand />
          </div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-(--orange)">
            Welcome to Civicert
          </p>
          <h2 className="mt-3 font-(--font-display) text-4xl tracking-[-0.04em]">
            {mode === 'login' ? 'Sign in to Civicert' : 'Create your account'}
          </h2>
          <p className="mt-3 text-sm leading-6 text-(--ink-muted)">
            {mode === 'login'
              ? 'Your application journey is waiting for you.'
              : 'Start your provisional certificate application in minutes.'}
          </p>
          <div className="mt-7 flex rounded-xl bg-[#f1f6f3] p-1">
            {(['login', 'signup'] as AuthMode[]).map((option) => (
              <button
                key={option}
                type="button"
                className={`flex-1 rounded-lg py-2.5 text-sm font-bold ${mode === option ? 'bg-white text-foreground shadow-sm' : 'text-(--ink-muted)'}`}
                onClick={() => {
                  setMode(option);
                  setErrors({});
                  setMessage('');
                }}
              >
                {option === 'login' ? 'Sign in' : 'Create account'}
              </button>
            ))}
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
              className="mt-2 rounded-xl bg-(--teal) py-3.5 text-sm font-bold text-white transition hover:bg-[#095548] disabled:cursor-wait disabled:opacity-60"
            >
              {loading
                ? 'Please wait...'
                : mode === 'login'
                  ? 'Sign in securely'
                  : 'Create account'}
              <span className="ml-2">→</span>
            </button>
          </form>
          <p className="mt-7 text-center text-xs leading-5 text-(--ink-muted)">
            Your session is protected with an HTTP-only cookie.
          </p>
        </section>
      </div>
    </main>
  );
}
