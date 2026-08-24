export type User = { id: string; name: string; email: string };
export type AuthMode = 'login' | 'signup';
export type AuthErrors = Record<string, string>;
export type DocumentType = 'ID_PROOF' | 'DEGREE_CERTIFICATE';

export type ApplicationSummary = {
  id: string;
  refNumber: string;
  createdAt: string;
  status: string;
  certificateKey?: string | null;
  documents?: Array<{ type: DocumentType; originalName: string }>;
};
