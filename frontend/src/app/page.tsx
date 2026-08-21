"use client";

import { FormEvent, useEffect, useState } from "react";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
const applications = [
    { ref: "PC-2026-8F3K9Q", date: "18 Aug 2026", status: "Submitted", tone: "teal" },
    { ref: "PC-2026-2M7LQX", date: "04 Jul 2026", status: "Completed", tone: "orange" },
];

type User = { id: string; name: string; email: string };
type AuthMode = "login" | "signup";
type AuthErrors = Record<string, string>;

export default function Home() {
    const [user, setUser] = useState<User | null>(null);
    const [checkingSession, setCheckingSession] = useState(true);

    useEffect(() => {
        fetch(`${apiUrl}/api/auth/me`, { credentials: "include" })
            .then((response) => response.ok ? response.json() : null)
            .then((result) => setUser(result?.user ?? null))
            .catch(() => setUser(null))
            .finally(() => setCheckingSession(false));
    }, []);

    if (checkingSession) return <div className="grid min-h-screen place-items-center bg-[var(--background)] text-sm text-[var(--ink-muted)]">Loading your workspace...</div>;
    if (!user) return <AuthScreen onAuthenticated={setUser} />;
    return <Dashboard user={user} onLogout={() => setUser(null)} />;
}

function AuthScreen({ onAuthenticated }: { onAuthenticated: (user: User) => void }) {
    const [mode, setMode] = useState<AuthMode>("login");
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [errors, setErrors] = useState<AuthErrors>({});
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    const submit = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setErrors({});
        setMessage("");
        setLoading(true);
        try {
            const body = mode === "signup" ? { name, email, password } : { email, password };
            const response = await fetch(`${apiUrl}/api/auth/${mode}`, { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include", body: JSON.stringify(body) });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) {
                setErrors(result.error?.fields ?? {});
                setMessage(result.error?.message ?? "Something went wrong. Please try again.");
                return;
            }
            onAuthenticated(result.user);
        } catch {
            setMessage("The service is unavailable. Make sure the backend is running and try again.");
        } finally {
            setLoading(false);
        }
    };

    return <main className="flex min-h-screen items-center justify-center bg-[var(--background)] px-5 py-10"><div className="grid w-full max-w-5xl overflow-hidden rounded-[28px] border border-[var(--line)] bg-white shadow-[0_20px_60px_rgba(30,70,58,0.1)] md:grid-cols-2"><section className="paper-grain hidden bg-[var(--cream)] p-12 md:block"><Brand /><div className="mt-36"><p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Your certification journey</p><h1 className="mt-4 font-[var(--font-display)] text-6xl leading-[0.98] tracking-[-0.05em]">A clearer path<br />to <em className="text-[var(--orange)]">what&apos;s next.</em></h1><p className="mt-6 max-w-sm text-sm leading-6 text-[var(--ink-muted)]">Securely apply, track, and receive your provisional certificate from one calm, simple workspace.</p></div></section><section className="p-7 sm:p-12"><div className="mb-9 md:hidden"><Brand /></div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Welcome to Civicert</p><h2 className="mt-3 font-[var(--font-display)] text-4xl tracking-[-0.04em]">{mode === "login" ? "Sign in to Civicert" : "Create your account"}</h2><p className="mt-3 text-sm leading-6 text-[var(--ink-muted)]">{mode === "login" ? "Your application journey is waiting for you." : "Start your provisional certificate application in minutes."}</p><div className="mt-7 flex rounded-xl bg-[#f1f6f3] p-1"><button type="button" className={`flex-1 rounded-lg py-2.5 text-sm font-bold ${mode === "login" ? "bg-white text-[var(--foreground)] shadow-sm" : "text-[var(--ink-muted)]"}`} onClick={() => { setMode("login"); setErrors({}); setMessage(""); }}>Sign in</button><button type="button" className={`flex-1 rounded-lg py-2.5 text-sm font-bold ${mode === "signup" ? "bg-white text-[var(--foreground)] shadow-sm" : "text-[var(--ink-muted)]"}`} onClick={() => { setMode("signup"); setErrors({}); setMessage(""); }}>Create account</button></div><form className="mt-7 grid gap-4" onSubmit={submit} noValidate>{mode === "signup" && <Field label="Full name" type="text" value={name} onChange={setName} error={errors.name} placeholder="Alex Rivera" autoComplete="name" />}<Field label="Email address" type="email" value={email} onChange={setEmail} error={errors.email} placeholder="you@example.com" autoComplete="email" /><Field label="Password" type="password" value={password} onChange={setPassword} error={errors.password} placeholder="At least 8 characters" autoComplete={mode === "login" ? "current-password" : "new-password"} />{message && <p className="rounded-xl bg-[#fff0e8] px-3 py-2.5 text-xs font-semibold text-[#b66038]" role="alert">{message}</p>}<button disabled={loading} className="mt-2 rounded-xl bg-[var(--teal)] py-3.5 text-sm font-bold text-white transition hover:bg-[#095548] disabled:cursor-wait disabled:opacity-60">{loading ? "Please wait..." : mode === "login" ? "Sign in securely" : "Create account"}<span className="ml-2">→</span></button></form><p className="mt-7 text-center text-xs leading-5 text-[var(--ink-muted)]">Your session is protected with an HTTP-only cookie.</p></section></div></main>;
    }

    function Brand() {
         return <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#d6ece4] text-xl text-[var(--teal)]">✦</div><span className="text-xl font-bold tracking-[-0.04em]">civicert</span></div>;
        }
    
    function Field({ label, type, value, onChange, error, placeholder, autoComplete }: { label: string; type: string; value: string; onChange: (value: string) => void; error?: string; placeholder: string; autoComplete: string }) {
         return <label className="grid gap-2 text-xs font-bold text-[#52675f]">{label}<input className={`rounded-xl border bg-white px-3.5 py-3 text-sm font-normal text-[var(--foreground)] outline-none transition placeholder:text-[#abb9b4] focus:border-[var(--teal)] focus:ring-4 focus:ring-[#0e6b5c12] ${error ? "border-[#d76e58]" : "border-[var(--line)]"}`} type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} autoComplete={autoComplete} aria-invalid={Boolean(error)} />{error && <span className="text-xs font-semibold text-[#c55d47]">{error}</span>}</label>;
        }
    
    function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
         const initials = user.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
         const logout = async () => { await fetch(`${apiUrl}/api/auth/logout`, { method: "POST", credentials: "include" }); onLogout(); };
         return <main className="min-h-screen overflow-hidden"><header className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-6 lg:px-10"><Brand /><nav className="hidden items-center gap-8 text-sm text-[var(--ink-muted)] md:flex"><a className="font-semibold text-[var(--foreground)]" href="#applications">Applications</a><a href="#help">Help centre</a></nav><button onClick={logout} className="flex items-center gap-3 text-sm font-semibold"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#e1b99d] text-[#623d2d]">{initials}</span><span className="hidden sm:block">{user.name}</span><span className="text-xs">Sign out</span></button></header><section className="paper-grain border-y border-[var(--line)] bg-[var(--cream)] px-6 py-12 lg:px-10 lg:py-16"><div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[1fr_420px] lg:items-end"><div><p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Applicant dashboard</p><h1 className="max-w-2xl font-[var(--font-display)] text-5xl leading-[0.98] tracking-[-0.05em] text-[#21443a] sm:text-7xl">Your certificates,<br /><em className="text-[var(--orange)]">made simple.</em></h1><p className="mt-6 max-w-lg text-base leading-7 text-[var(--ink-muted)]">Apply for your provisional certificate, track progress, and keep every document in one secure place.</p></div><div className="rounded-[24px] bg-[#deeee8] p-6"><div className="flex items-center justify-between"><span className="text-sm font-semibold">Application progress</span><span className="text-xs font-bold text-[var(--teal)]">1 of 3 complete</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-[#c1ddd3]"><div className="h-full w-1/3 rounded-full bg-[var(--teal)]" /></div><p className="mt-5 text-sm leading-6 text-[var(--ink-muted)]">You&apos;re ready to begin a new application. It takes about 8 minutes.</p><button className="mt-4 w-full rounded-xl bg-[var(--teal)] py-3.5 text-sm font-bold text-white transition hover:bg-[#095548]">Start new application <span className="ml-2">↗</span></button></div></div></section><section id="applications" className="mx-auto max-w-[1280px] px-6 py-12 lg:px-10 lg:py-16"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink-muted)]">Your activity</p><h2 className="mt-2 font-[var(--font-display)] text-4xl tracking-[-0.04em]">Recent applications</h2></div><button className="hidden rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-bold sm:block">View all <span className="ml-2">→</span></button></div><div className="mt-8 grid gap-3">{applications.map((application) => <ApplicationRow key={application.ref} {...application} />)}</div></section><footer id="help" className="border-t border-[var(--line)] px-6 py-8 text-center text-xs text-[var(--ink-muted)]">Civicert · Secure provisional certificate applications · <a className="font-semibold text-[var(--teal)]" href="#help">Help centre</a></footer></main>;
        }
    
    function ApplicationRow({ ref: reference, date, status, tone }: { ref: string; date: string; status: string; tone: string }) {
         const [open, setOpen] = useState(false);
         return <div className="relative flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_4px_20px_rgba(30,70,58,0.04)] transition hover:border-[#afcfc3] sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><div className={`grid h-11 w-11 place-items-center rounded-xl ${tone === "teal" ? "bg-[#e0f1eb] text-[var(--teal)]" : "bg-[#fff0e8] text-[#c86f3f]"}`}>▤</div><div><p className="font-bold tracking-tight">{reference}</p><p className="mt-1 text-sm text-[var(--ink-muted)]">Submitted {date}</p></div></div><div className="flex items-center justify-between gap-5 sm:justify-end"><span className={`rounded-full px-3 py-1 text-xs font-bold ${status === "Submitted" ? "bg-[#e0f1eb] text-[var(--teal)]" : "bg-[#fff0e8] text-[#b66038]"}`}>{status}</span><button onClick={() => setOpen(!open)} className="rounded-lg p-2 text-lg text-[var(--ink-muted)] hover:bg-[#f3f7f5]" aria-label={`Actions for ${reference}`}>•••</button></div>{open && <div className="absolute right-4 top-14 z-10 rounded-xl border border-[var(--line)] bg-white p-3 text-xs shadow-lg">Download certificate</div>}</div>;
        }
