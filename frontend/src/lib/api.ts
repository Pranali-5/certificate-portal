export const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function downloadCertificate(applicationId: string) {
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

export async function downloadDocument(
  applicationId: string,
  type: 'ID_PROOF' | 'DEGREE_CERTIFICATE',
) {
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
