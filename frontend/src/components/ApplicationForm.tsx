'use client';

import { useState } from 'react';
import { apiUrl, downloadCertificate } from '../lib/api';
import { AuthErrors, DocumentType } from '../types';
import { DocumentInput } from './DocumentInput';
import { FormInput } from './FormInput';
import { ReviewLine } from './ReviewLine';

export function ApplicationForm({
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
    } else if (!files.ID_PROOF || !files.DEGREE_CERTIFICATE)
      setMessage('Upload both required PDF documents');
    else setStep(3);
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
  const document = (label: string, type: DocumentType) => (
    <DocumentInput
      label={label}
      type={type}
      file={files[type]}
      onFile={(file) => setFiles((current) => ({ ...current, [type]: file }))}
      applicationId={applicationId}
      setMessage={setMessage}
    />
  );
  return (
    <div className="fixed inset-0 z-20 grid place-items-center bg-[#18332d99] p-4">
      <section className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-9">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-(--orange)">
              New application
            </p>
            <h2 className="mt-2 font-(--font-display) text-3xl tracking-[-0.04em]">
              Provisional certificate
            </h2>
          </div>
          <button onClick={onClose} className="text-2xl text-(--ink-muted)" aria-label="Close">
            ×
          </button>
        </div>
        <div className="mt-7 grid grid-cols-3 gap-2">
          {['Your details', 'Documents', 'Review'].map((label, index) => (
            <div
              key={label}
              className={`border-t-2 pt-2 text-xs font-bold ${step === index + 1 ? 'border-(--teal) text-(--teal)' : step > index + 1 ? 'border-[#a9d4c5] text-[#6d9688]' : 'border-(--line) text-(--ink-muted)'}`}
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
            {document('ID proof', 'ID_PROOF')}
            {document('Degree certificate', 'DEGREE_CERTIFICATE')}
          </div>
        )}
        {step === 3 && (
          <div className="mt-8 rounded-2xl bg-[#f1f6f3] p-5">
            <h3 className="font-(--font-display) text-xl">Review your application</h3>
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
        <div className="mt-8 flex justify-between gap-3 border-t border-(--line) pt-5">
          <button
            onClick={() => (step === 1 ? onClose() : setStep(step - 1))}
            className="rounded-xl border border-(--line) px-4 py-3 text-sm font-bold"
          >
            {step === 1 ? 'Cancel' : 'Back'}
          </button>
          {step < 3 ? (
            <button
              disabled={loading}
              onClick={next}
              className="rounded-xl bg-(--teal) px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {loading ? 'Saving...' : 'Continue →'}
            </button>
          ) : (
            <button
              disabled={loading}
              onClick={submit}
              className="rounded-xl bg-(--teal) px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {loading ? 'Submitting...' : 'Submit application →'}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
