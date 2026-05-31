export type IbrProofType = 'delivery' | 'other';

export interface IbrProofDocument {
  id: string;
  requestId: string;
  type: IbrProofType;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  note?: string;
  uploadedBy: string;
  createdAt: string;
}
