export type PoProofType = 'delivery' | 'payment' | 'other';

export interface PoProofDocument {
  id: string;
  purchaseOrderId: string;
  type: PoProofType;
  title?: string;
  fileName: string;
  fileUrl: string;
  fileSize: number;
  uploadedBy: string;
  uploadedByRole: 'Warehouse' | 'Executive';
  uploadedAt: string;
  status: 'pending' | 'verified' | 'rejected';
  notes?: string;
  paymentCashAmount?: number;
  paymentCreditAmount?: number;
  paymentAdjustment?: number;
}
