import { z } from 'zod';

export type SavedJobType = 'email' | 'form' | 'other';
export type SavedJobStatus = 'to-apply' | 'applied' | 'needs-review';
export type ExtractionStatus = 'pending' | 'success' | 'failed';

export const SavedJobExtractionSchema = z.object({
  type: z.enum(['email', 'form', 'other']),
  jobTitle: z.string().nullable().catch(null),
  company: z.string().nullable().catch(null),
  applyEmail: z.string().nullable().catch(null),
  requiredSubject: z.string().nullable().catch(null),
  requiredInstructions: z.string().nullable().catch(null),
  formLink: z.string().nullable().catch(null),
  formQuestions: z.array(z.string()).default([]).catch([]),
  deadline: z.string().nullable().catch(null),
  summary: z.string().nullable().catch(null),
});

export type SavedJobExtractionData = z.infer<typeof SavedJobExtractionSchema>;

export interface SavedJobRecord extends SavedJobExtractionData {
  id: string;
  rawText: string;
  status: SavedJobStatus;
  extractionStatus: ExtractionStatus;
  extractionError?: string | null;
  createdAt: string;
  updatedAt: string;
}
