"use client";

import { useState } from "react";

const applications = [
  { ref: "PC-2026-8F3K9Q", date: "18 Aug 2026", status: "Submitted", tone: "teal" },
  { ref: "PC-2026-2M7LQX", date: "04 Jul 2026", status: "Completed", tone: "orange" },
];

export default function Home() {
  return (
    <main className="min-h-screen overflow-hidden">
      <header className="mx-auto flex max-w-[1280px] items-center justify-between px-6 py-6 lg:px-10">
        <div className="flex items-center gap-3"><div className="grid h-10 w-10 place-items-center rounded-xl bg-[#d6ece4] text-xl text-[#0e6b5c]">✦</div><span className="text-xl font-bold tracking-[-0.04em]">civicert</span></div>
        <nav className="hidden items-center gap-8 text-sm text-[var(--ink-muted)] md:flex"><a className="font-semibold text-[var(--foreground)]" href="#applications">Applications</a><a href="#help">Help centre</a></nav>
        <button className="flex items-center gap-3 text-sm font-semibold"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#e1b99d] text-[#623d2d]">AR</span><span className="hidden sm:block">Alex Rivera</span><span className="text-xs">⌄</span></button>
      </header>
      <section className="paper-grain border-y border-[var(--line)] bg-[var(--cream)] px-6 py-12 lg:px-10 lg:py-16"><div className="mx-auto grid max-w-[1280px] gap-10 lg:grid-cols-[1fr_420px] lg:items-end"><div><p className="mb-4 text-xs font-bold uppercase tracking-[0.2em] text-[var(--orange)]">Applicant dashboard</p><h1 className="max-w-2xl font-[var(--font-display)] text-5xl leading-[0.98] tracking-[-0.05em] text-[#21443a] sm:text-7xl">Your certificates,<br /><em className="text-[var(--orange)]">made simple.</em></h1><p className="mt-6 max-w-lg text-base leading-7 text-[var(--ink-muted)]">Apply for your provisional certificate, track progress, and keep every document in one secure place.</p></div><div className="rounded-[24px] bg-[#deeee8] p-6"><div className="flex items-center justify-between"><span className="text-sm font-semibold">Application progress</span><span className="text-xs font-bold text-[var(--teal)]">1 of 3 complete</span></div><div className="mt-5 h-2 overflow-hidden rounded-full bg-[#c1ddd3]"><div className="h-full w-1/3 rounded-full bg-[var(--teal)]" /></div><p className="mt-5 text-sm leading-6 text-[var(--ink-muted)]">You&apos;re ready to begin a new application. It takes about 8 minutes.</p><button className="mt-4 w-full rounded-xl bg-[var(--teal)] py-3.5 text-sm font-bold text-white transition hover:bg-[#095548]">Start new application <span className="ml-2">↗</span></button></div></div></section>
      <section id="applications" className="mx-auto max-w-[1280px] px-6 py-12 lg:px-10 lg:py-16"><div className="flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--ink-muted)]">Your activity</p><h2 className="mt-2 font-[var(--font-display)] text-4xl tracking-[-0.04em]">Recent applications</h2></div><button className="hidden rounded-xl border border-[var(--line)] px-4 py-2.5 text-sm font-bold sm:block">View all <span className="ml-2">→</span></button></div><div className="mt-8 grid gap-3">{applications.map((application) => <ApplicationRow key={application.ref} {...application} />)}</div><div className="mt-8 rounded-2xl border border-dashed border-[#c8d9d3] p-7 text-center"><p className="font-[var(--font-display)] text-xl">Ready for the next one?</p><p className="mt-1 text-sm text-[var(--ink-muted)]">Start a fresh application whenever you&apos;re ready.</p><button className="mt-4 rounded-xl bg-[#21443a] px-5 py-3 text-sm font-bold text-white">Start new application <span className="ml-2">↗</span></button></div></section>
      <footer id="help" className="border-t border-[var(--line)] px-6 py-8 text-center text-xs text-[var(--ink-muted)]">Civicert · Secure provisional certificate applications · <a className="font-semibold text-[var(--teal)]" href="#help">Help centre</a></footer>
    </main>
  );
}

function ApplicationRow({ ref: reference, date, status, tone }: { ref: string; date: string; status: string; tone: string }) {
  const [open, setOpen] = useState(false);
  return <div className="relative flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-white p-5 shadow-[0_4px_20px_rgba(30,70,58,0.04)] transition hover:border-[#afcfc3] sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-center gap-4">
      <div className={`grid h-11 w-11 place-items-center rounded-xl ${tone === "teal" ? "bg-[#e0f1eb] text-[var(--teal)]" : "bg-[#fff0e8] text-[#c86b3f]"}`}>▤</div><div><p className="font-bold tracking-tight">{reference}</p><p className="mt-1 text-sm text-[var(--ink-muted)]">Submitted {date}</p></div></div><div className="flex items-center justify-between gap-5 sm:justify-end"><span className={`rounded-full px-3 py-1 text-xs font-bold ${status === "Submitted" ? "bg-[#e0f1eb] text-[var(--teal)]" : "bg-[#fff0e8] text-[#b66038]"}`}>{status}</span><button onClick={() => setOpen(!open)} className="rounded-lg p-2 text-lg text-[var(--ink-muted)] hover:bg-[#f3f7f5]" aria-label={`Actions for ${reference}`}>•••</button></div>{open && <div className="absolute right-4 top-14 z-10 rounded-xl border border-[var(--line)] bg-white p-3 text-xs shadow-lg">Download certificate</div>}</div>;
}
