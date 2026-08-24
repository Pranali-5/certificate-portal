'use client';

import { apiUrl } from '../lib/api';
import { DocumentType } from '../types';

export function DocumentInput({
  label,
  type,
  file,
  onFile,
  applicationId,
  setMessage,
}: {
  label: string;
  type: DocumentType;
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
      <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#e0f1eb] text-xl text-(--teal)">
        ↑
      </span>
      <span className="min-w-0 flex-1">
        <strong className="block text-sm">{label}</strong>
        <small className="mt-1 block truncate text-xs text-(--ink-muted)">
          {file
            ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`
            : 'PDF only · maximum 5MB'}
        </small>
      </span>
      <span className="rounded-lg border border-(--line) bg-white px-3 py-2 text-xs font-bold">
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
