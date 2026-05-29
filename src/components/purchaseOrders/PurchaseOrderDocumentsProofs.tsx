import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ImageGalleryModal from '@/src/components/ImageGalleryModal';
import { Card, CardContent } from '@/src/components/ui/Card';
import { ModalPortal } from '@/src/components/ui/ModalPortal';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import {
  attachPoDeliveryProofDocuments,
  computePoAmountPaidAfterProofIncrement,
  deletePurchaseOrderProof,
  fetchPoPaymentProofAggregates,
  fetchPurchaseOrderProofs,
  insertPurchaseOrderProofDocuments,
  poProofFileIsImageName,
  PO_PROOF_GALLERY_FOLDER,
  roundMoney,
  syncPurchaseOrderPaymentsFromProofs,
  updatePurchaseOrderProofDocument,
  uploadPurchaseOrderProofBinary,
} from '@/src/lib/purchaseOrderProofPayments';
import {
  notifyExecutivesPurchaseOrderPaymentRecorded,
  notifyExecutivesPurchaseOrderProofUploaded,
} from '@/src/lib/notifications/notificationsData';
import { formatPoMoney } from '@/src/lib/purchaseOrderTotals';
import type { PoProofDocument, PoProofType } from '@/src/types/purchaseOrderProofs';
import {
  CreditCard,
  Edit,
  FileText,
  Image,
  Loader2,
  Trash2,
  Truck,
  Upload,
  X,
} from 'lucide-react';

const MAX_PROOF_BATCH = 30;
const PROOF_UPLOAD_ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx';

export type PoProofUploadTrigger = { ts: number; type: PoProofType } | null;

interface PoSummary {
  id: string;
  po_number: string;
  total_amount: number;
  amount_paid: number | null;
  payment_status: string | null;
  payment_due_date: string | null;
  currency: string;
}

interface Props {
  po: PoSummary;
  canUpload: boolean;
  role: string;
  employeeName: string | null;
  sessionEmail: string | null;
  uploadModalTrigger?: PoProofUploadTrigger;
  onPoRefresh: () => void;
  onInsertLog: (
    action: string,
    description: string,
    oldValue?: object | null,
    newValue?: object | null,
    metadata?: object | null,
  ) => Promise<void>;
}

function resolveUploaderRole(role: string): PoProofDocument['uploadedByRole'] {
  return role === 'Executive' ? 'Executive' : 'Warehouse';
}

export default function PurchaseOrderDocumentsProofs({
  po,
  canUpload,
  role,
  employeeName,
  sessionEmail,
  uploadModalTrigger,
  onPoRefresh,
  onInsertLog,
}: Props) {
  const [proofs, setProofs] = useState<PoProofDocument[]>([]);
  const [proofsLoading, setProofsLoading] = useState(true);
  const [documentsProofTab, setDocumentsProofTab] = useState<PoProofType>('delivery');
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofType, setProofType] = useState<PoProofType>('delivery');
  const [proofDocTitle, setProofDocTitle] = useState('');
  const [proofNotes, setProofNotes] = useState('');
  const [proofMoneyPayment, setProofMoneyPayment] = useState('');
  const [selectedProofGalleryUrls, setSelectedProofGalleryUrls] = useState<string[]>([]);
  const [selectedProofLocalFiles, setSelectedProofLocalFiles] = useState<File[]>([]);
  const [showProofImageGallery, setShowProofImageGallery] = useState(false);
  const [proofUploadBusy, setProofUploadBusy] = useState(false);

  const [showProofEditModal, setShowProofEditModal] = useState(false);
  const [editingProof, setEditingProof] = useState<PoProofDocument | null>(null);
  const [editProofTitle, setEditProofTitle] = useState('');
  const [editProofNotes, setEditProofNotes] = useState('');
  const [editProofMoney, setEditProofMoney] = useState('');
  const [proofEditBusy, setProofEditBusy] = useState(false);

  const loadProofs = useCallback(async () => {
    setProofsLoading(true);
    try {
      const rows = await fetchPurchaseOrderProofs(po.id, po.po_number);
      setProofs(rows);
    } catch (e) {
      console.warn('[PO proofs] load failed', e);
      setProofs([]);
    } finally {
      setProofsLoading(false);
    }
  }, [po.id, po.po_number]);

  useEffect(() => {
    void loadProofs();
  }, [loadProofs]);

  useEffect(() => {
    if (!uploadModalTrigger) return;
    setProofType(uploadModalTrigger.type);
    setProofDocTitle('');
    setProofNotes('');
    setSelectedProofGalleryUrls([]);
    setSelectedProofLocalFiles([]);
    if (uploadModalTrigger.type === 'payment') {
      const remaining = Math.max(0, po.total_amount - (po.amount_paid ?? 0));
      setProofMoneyPayment(remaining > 0 ? String(remaining) : '');
    } else {
      setProofMoneyPayment('');
    }
    setShowProofModal(true);
  }, [uploadModalTrigger, po.total_amount, po.amount_paid]);

  const documentProofsFiltered = useMemo(
    () => proofs.filter((p) => p.type === documentsProofTab),
    [proofs, documentsProofTab],
  );

  const remainingBalance = Math.max(0, po.total_amount - (po.amount_paid ?? 0));

  const openProofDocumentModal = () => {
    setProofType(documentsProofTab);
    setProofDocTitle('');
    setProofNotes('');
    setProofMoneyPayment('');
    setSelectedProofGalleryUrls([]);
    setSelectedProofLocalFiles([]);
    setShowProofModal(true);
  };

  const handleUploadClick = () => {
    if (!canUpload) {
      alert('Document uploads are not available for this purchase order in its current status.');
      return;
    }
    openProofDocumentModal();
  };

  const removeProofGalleryUrl = (url: string) => {
    setSelectedProofGalleryUrls((prev) => prev.filter((u) => u !== url));
  };

  const removeProofLocalFile = (idx: number) => {
    setSelectedProofLocalFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleProofFilesSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (!files.length) return;
    setSelectedProofLocalFiles((prev) => {
      const merged = [...prev, ...files];
      if (merged.length > MAX_PROOF_BATCH) {
        alert(`You can add at most ${MAX_PROOF_BATCH} files per batch. Extra files were not added.`);
        return merged.slice(0, MAX_PROOF_BATCH);
      }
      return merged;
    });
  };

  const capProofMoney = (raw: string) => {
    const n = Math.max(0, Number(raw) || 0);
    const capped = Math.min(n, remainingBalance);
    setProofMoneyPayment(capped > 0 ? String(capped) : raw === '' ? '' : String(capped));
  };

  const handleUploadProof = async () => {
    if (!canUpload) {
      alert('Document uploads are not available for this purchase order in its current status.');
      return;
    }

    const nGallery = selectedProofGalleryUrls.length;
    const nFiles = selectedProofLocalFiles.length;
    const titleBase = proofDocTitle.trim();
    const notesTrim = proofNotes.trim();
    const notesValue = notesTrim || null;
    const paymentCash = proofType === 'payment' ? Math.max(0, Number(proofMoneyPayment) || 0) : 0;

    if (nGallery + nFiles > MAX_PROOF_BATCH) {
      alert(`You can add at most ${MAX_PROOF_BATCH} files per upload. Remove some attachments first.`);
      return;
    }

    if (proofType === 'payment') {
      const thisPayment = roundMoney(paymentCash);
      const n = nGallery + nFiles;
      if (n > 1 && thisPayment > 0) {
        alert('Payment amounts: upload one file at a time so the amount applies to a single proof.');
        return;
      }
      if (thisPayment > remainingBalance + 0.01) {
        alert(`This payment exceeds the remaining balance of ${formatPoMoney(remainingBalance, po.currency)}.`);
        return;
      }
    }

    const uploadedBy = employeeName || sessionEmail || 'User';
    const uploaderRole = resolveUploaderRole(role);
    setProofUploadBusy(true);
    try {
      const rows: Parameters<typeof insertPurchaseOrderProofDocuments>[0] = [];

      for (const url of selectedProofGalleryUrls) {
        const raw = url.split('/').pop()?.split('?')[0] ?? 'image';
        let fileName = raw;
        try {
          fileName = decodeURIComponent(raw);
        } catch {
          fileName = raw;
        }
        rows.push({
          purchase_order_id: po.id,
          type: proofType,
          file_name: fileName,
          file_url: url,
          file_size: 0,
          uploaded_by: uploadedBy,
          uploaded_by_role: uploaderRole,
          status: 'verified',
          title: titleBase || fileName,
          notes: notesValue,
          payment_cash_amount: proofType === 'payment' ? paymentCash : 0,
          payment_credit_amount: 0,
          payment_adjustment: 0,
        });
      }

      for (const file of selectedProofLocalFiles) {
        const { publicUrl } = await uploadPurchaseOrderProofBinary(po.id, proofType, file);
        rows.push({
          purchase_order_id: po.id,
          type: proofType,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          uploaded_by: uploadedBy,
          uploaded_by_role: uploaderRole,
          status: 'verified',
          title: titleBase || file.name,
          notes: notesValue,
          payment_cash_amount: proofType === 'payment' ? paymentCash : 0,
          payment_credit_amount: 0,
          payment_adjustment: 0,
        });
      }

      if (nGallery === 0 && nFiles === 0) {
        const defaultTitle =
          titleBase ||
          (proofType === 'payment'
            ? 'Payment record'
            : proofType === 'delivery'
              ? 'Delivery record'
              : 'Document');
        rows.push({
          purchase_order_id: po.id,
          type: proofType,
          file_name: `${defaultTitle} (no attachment)`,
          file_url: '',
          file_size: 0,
          uploaded_by: uploadedBy,
          uploaded_by_role: uploaderRole,
          status: 'verified',
          title: defaultTitle,
          notes: notesValue,
          payment_cash_amount: proofType === 'payment' ? paymentCash : 0,
          payment_credit_amount: 0,
          payment_adjustment: 0,
        });
      }

      const { data: inserted, error: insErr } = await insertPurchaseOrderProofDocuments(rows);
      if (insErr) {
        alert(insErr);
        return;
      }
      const insertedIds = (inserted ?? []).map((r) => r.id);
      const actorForNotify =
        employeeName && role ? `${employeeName} (${role})` : uploadedBy;

      if (proofType === 'payment' && paymentCash > 0) {
        const agg = await fetchPoPaymentProofAggregates(po.id);
        const overrideTotalPaid = computePoAmountPaidAfterProofIncrement({
          proofPaidBefore: agg.totalPaid - paymentCash,
          poAmountPaid: po.amount_paid ?? 0,
          cashIncrement: paymentCash,
        });
        const s = await syncPurchaseOrderPaymentsFromProofs(po.id, { overrideTotalPaid });
        if (s.ok === false) {
          if (insertedIds.length) {
            for (const pid of insertedIds) {
              await deletePurchaseOrderProof(pid);
            }
          }
          alert(s.error);
          return;
        }
        try {
          await notifyExecutivesPurchaseOrderPaymentRecorded(po.id, {
            recordedBy: actorForNotify,
            paymentAmount: paymentCash,
          });
        } catch (notifyErr) {
          console.warn('[PO proofs] payment notification failed', notifyErr);
        }
        await onInsertLog(
          'payment_recorded',
          `Recorded payment proof: ₱${paymentCash.toLocaleString()}.`,
          { amount_paid: po.amount_paid, payment_status: po.payment_status },
          null,
          { amount: paymentCash, po_number: po.po_number },
        );
        onPoRefresh();
      } else {
        const label =
          proofType === 'delivery' ? 'delivery' : proofType === 'other' ? 'other' : 'payment';
        await onInsertLog(
          'proof_uploaded',
          `Uploaded ${rows.length} ${label} proof document${rows.length === 1 ? '' : 's'}.`,
          null,
          null,
          { count: rows.length, type: proofType, po_number: po.po_number },
        );
      }

      // Notify executives + warehouse (same client-RPC pattern as the order detail page).
      // Payment proofs that carried an amount already fired notifyExecutivesPurchaseOrderPaymentRecorded.
      if (!(proofType === 'payment' && paymentCash > 0)) {
        void notifyExecutivesPurchaseOrderProofUploaded(po.id, {
          proofType,
          uploadedBy: actorForNotify,
          proofCount: rows.length,
          proofTitle: titleBase || null,
          paymentAmount: proofType === 'payment' ? paymentCash : 0,
        }).catch((notifyErr) => {
          console.warn('[PO proofs] proof notification failed', notifyErr);
        });
      }

      window.dispatchEvent(new Event('lamtex:notifications-refresh'));

      setShowProofModal(false);
      setShowProofImageGallery(false);
      setSelectedProofGalleryUrls([]);
      setSelectedProofLocalFiles([]);
      await loadProofs();
      if (proofType === 'payment') onPoRefresh();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Failed to upload proof');
    } finally {
      setProofUploadBusy(false);
    }
  };

  const openProofEditModal = (proof: PoProofDocument) => {
    setEditingProof(proof);
    setEditProofTitle(proof.title ?? '');
    setEditProofNotes(proof.notes ?? '');
    setEditProofMoney(String(proof.paymentCashAmount ?? 0));
    setShowProofEditModal(true);
  };

  const closeProofEditModal = () => {
    setShowProofEditModal(false);
    setEditingProof(null);
  };

  const handleSaveProofEdit = async () => {
    if (!editingProof) return;
    setProofEditBusy(true);
    try {
      const { error } = await updatePurchaseOrderProofDocument(editingProof.id, {
        title: editProofTitle.trim() || null,
        notes: editProofNotes.trim() || null,
        payment_cash_amount:
          editingProof.type === 'payment' ? Math.max(0, Number(editProofMoney) || 0) : undefined,
      });
      if (error) {
        alert(error);
        return;
      }
      if (editingProof.type === 'payment') {
        const s = await syncPurchaseOrderPaymentsFromProofs(po.id);
        if (s.ok === false) {
          alert(s.error);
          return;
        }
        onPoRefresh();
      }
      closeProofEditModal();
      await loadProofs();
    } finally {
      setProofEditBusy(false);
    }
  };

  const handleRemoveProof = async (proof: PoProofDocument) => {
    if (!confirm(`Remove "${proof.title || proof.fileName}"?`)) return;
    const { error } = await deletePurchaseOrderProof(proof.id);
    if (error) {
      alert(error);
      return;
    }
    if (proof.type === 'payment') {
      await syncPurchaseOrderPaymentsFromProofs(po.id);
      onPoRefresh();
    }
    await onInsertLog(
      'proof_removed',
      `Removed ${proof.type} proof: ${proof.fileName}.`,
      { file_name: proof.fileName },
      null,
      { po_number: po.po_number },
    );
    await loadProofs();
  };

  return (
    <>
      <Card>
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documents & Proofs
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUploadClick}
              disabled={!canUpload}
              className="gap-2 w-full sm:w-auto shrink-0"
            >
              <Upload className="w-4 h-4" />
              Upload Proof
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200 pb-3">
            {(['delivery', 'payment', 'other'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setDocumentsProofTab(tab)}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  documentsProofTab === tab
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tab === 'delivery' ? 'Delivery' : tab === 'payment' ? 'Payment' : 'Other'}
                <span className="ml-1.5 text-xs opacity-90">({proofs.filter((p) => p.type === tab).length})</span>
              </button>
            ))}
          </div>

          {proofsLoading ? (
            <p className="text-sm text-gray-500 text-center py-8 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading documents…
            </p>
          ) : documentProofsFiltered.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Uploaded —{' '}
                {documentsProofTab === 'delivery' ? 'Delivery' : documentsProofTab === 'payment' ? 'Payment' : 'Other'}
              </h4>
              {documentProofsFiltered.map((proof) => (
                <div
                  key={proof.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center ${
                        proof.type === 'delivery'
                          ? 'bg-blue-100'
                          : proof.type === 'payment'
                            ? 'bg-green-100'
                            : 'bg-amber-100'
                      }`}
                    >
                      {poProofFileIsImageName(proof.fileName) ? (
                        <Image
                          className={`w-5 h-5 ${
                            proof.type === 'delivery'
                              ? 'text-blue-600'
                              : proof.type === 'payment'
                                ? 'text-green-600'
                                : 'text-amber-700'
                          }`}
                        />
                      ) : (
                        <FileText
                          className={`w-5 h-5 ${
                            proof.type === 'delivery'
                              ? 'text-blue-600'
                              : proof.type === 'payment'
                                ? 'text-green-600'
                                : 'text-amber-700'
                          }`}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{proof.title || proof.fileName}</p>
                      <p className="text-xs text-gray-500 truncate">{proof.fileName}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className="text-xs flex-shrink-0">
                          {proof.type === 'delivery' ? 'Delivery' : proof.type === 'payment' ? 'Payment' : 'Other'}
                        </Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(proof.uploadedAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </div>
                      {proof.type === 'payment' && (proof.paymentCashAmount ?? 0) > 0 ? (
                        <p className="text-xs text-gray-700 mt-2">
                          {formatPoMoney(proof.paymentCashAmount ?? 0, po.currency)}
                        </p>
                      ) : null}
                      {proof.notes && (
                        <p className="text-xs text-gray-600 mt-2 pr-1 whitespace-pre-wrap border-t border-gray-200/80 pt-2">
                          {proof.notes}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-end sm:justify-start flex-shrink-0">
                    {canUpload && (
                      <Button variant="outline" size="sm" onClick={() => openProofEditModal(proof)}>
                        <Edit className="w-3.5 h-3.5 mr-1" />
                        Edit
                      </Button>
                    )}
                    {proof.fileUrl ? (
                      <Button variant="outline" size="sm" onClick={() => window.open(proof.fileUrl, '_blank')}>
                        View
                      </Button>
                    ) : null}
                    {canUpload && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-700 border-red-200 hover:bg-red-50"
                        onClick={() => void handleRemoveProof(proof)}
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 space-y-3">
              <p className="text-sm text-gray-500">
                No {documentsProofTab === 'delivery' ? 'delivery' : documentsProofTab === 'payment' ? 'payment' : 'other'}{' '}
                documents yet.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={handleUploadClick}
                disabled={!canUpload}
                className="gap-2"
              >
                <Upload className="w-4 h-4" />
                Upload {documentsProofTab === 'delivery' ? 'delivery' : documentsProofTab === 'payment' ? 'payment' : 'other'} proof
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ModalPortal
        open={showProofModal}
        onBackdropClick={() => {
          setShowProofModal(false);
          setShowProofImageGallery(false);
        }}
      >
          <div
            className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Upload className="w-6 h-6 text-red-600" />
                Upload Proof Document
              </h2>
              <button
                onClick={() => {
                  setShowProofModal(false);
                  setShowProofImageGallery(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Document Type</label>
                  <div className="grid grid-cols-3 gap-2 md:gap-3">
                    {(['delivery', 'payment', 'other'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          setProofType(t);
                          setSelectedProofGalleryUrls([]);
                          setSelectedProofLocalFiles([]);
                        }}
                        className={`p-2 md:p-3 border-2 rounded-lg text-center transition-colors ${
                          proofType === t
                            ? t === 'delivery'
                              ? 'border-blue-500 bg-blue-50 text-blue-700'
                              : t === 'payment'
                                ? 'border-green-500 bg-green-50 text-green-700'
                                : 'border-amber-500 bg-amber-50 text-amber-900'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {t === 'delivery' ? (
                          <Truck className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-1" />
                        ) : t === 'payment' ? (
                          <CreditCard className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-1" />
                        ) : (
                          <FileText className="w-4 h-4 md:w-5 md:h-5 mx-auto mb-1" />
                        )}
                        <span className="text-xs font-medium">
                          {t === 'delivery' ? 'Delivery' : t === 'payment' ? 'Payment' : 'Other'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title / purpose (optional)</label>
                  <input
                    type="text"
                    value={proofDocTitle}
                    onChange={(e) => setProofDocTitle(e.target.value)}
                    placeholder="Proofs of delivery or payment"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
                  />
                </div>

                {proofType === 'payment' && (
                  <div className="rounded-lg border border-green-200 bg-green-50/60 p-4 space-y-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <p className="text-sm font-medium text-green-900">Payment amount (applied when you save)</p>
                      <p className="text-sm font-semibold text-green-900 tabular-nums whitespace-nowrap">
                        {formatPoMoney(po.amount_paid ?? 0, po.currency)} / {formatPoMoney(po.total_amount, po.currency)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Money payment (cash / transfer / cheque)
                      </label>
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={proofMoneyPayment}
                        onChange={(e) => capProofMoney(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        placeholder="0"
                      />
                      {remainingBalance > 0 && (
                        <p className="text-xs text-gray-600 mt-1">
                          Up to {formatPoMoney(remainingBalance, po.currency)} remaining on this PO.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Images (optional)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowProofImageGallery(true)}
                    className="w-full rounded-xl border-2 border-dashed border-gray-300 bg-gray-50/80 px-4 py-4 text-sm text-gray-600 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
                  >
                    <span className="font-medium">
                      {selectedProofGalleryUrls.length > 0
                        ? `${selectedProofGalleryUrls.length} image(s) from gallery — click to change`
                        : 'Select from image gallery'}
                    </span>
                    <span className="mt-1 block text-xs text-gray-500">Or upload new images inside the gallery</span>
                  </button>
                  {selectedProofGalleryUrls.length > 0 && (
                    <ul className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                      {selectedProofGalleryUrls.map((url) => {
                        const raw = url.split('/').pop()?.split('?')[0] ?? 'image';
                        let label = raw;
                        try {
                          label = decodeURIComponent(raw);
                        } catch {
                          label = raw;
                        }
                        return (
                          <li
                            key={url}
                            className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-2 text-left"
                          >
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md border border-gray-100">
                              <img src={url} alt="" className="h-full w-full object-cover" />
                            </div>
                            <p className="min-w-0 flex-1 truncate text-xs text-gray-800" title={label}>
                              {label}
                            </p>
                            <button
                              type="button"
                              onClick={() => removeProofGalleryUrl(url)}
                              className="shrink-0 text-xs text-red-600 hover:underline"
                            >
                              Remove
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Upload documents (optional, max 25MB)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept={PROOF_UPLOAD_ACCEPT}
                    onChange={handleProofFilesSelect}
                    className="block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-1.5"
                  />
                  {selectedProofLocalFiles.length > 0 && (
                    <ul className="mt-2 space-y-1.5 max-h-36 overflow-y-auto">
                      {selectedProofLocalFiles.map((file, idx) => (
                        <li
                          key={`${file.name}-${file.size}-${idx}`}
                          className="flex items-center justify-between gap-2 rounded-md border border-gray-100 bg-gray-50 px-2 py-1.5 text-xs"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            {file.type.startsWith('image/') || poProofFileIsImageName(file.name) ? (
                              <Image className="h-4 w-4 shrink-0 text-indigo-600" />
                            ) : (
                              <FileText className="h-4 w-4 shrink-0 text-gray-700" />
                            )}
                            <span className="truncate font-medium text-gray-800" title={file.name}>
                              {file.name}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => removeProofLocalFile(idx)}
                            className="shrink-0 text-red-600 hover:underline"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
                  <textarea
                    value={proofNotes}
                    onChange={(e) => setProofNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-300 focus:border-gray-400 outline-none"
                    placeholder="Add any additional information..."
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowProofModal(false);
                    setShowProofImageGallery(false);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={() => void handleUploadProof()}
                  disabled={proofUploadBusy}
                  className="flex-1 gap-2"
                >
                  {proofUploadBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  Add{' '}
                  {selectedProofGalleryUrls.length + selectedProofLocalFiles.length > 1
                    ? `${selectedProofGalleryUrls.length + selectedProofLocalFiles.length} proofs`
                    : 'proof'}
                </Button>
              </div>
            </div>
          </div>
      </ModalPortal>

      {showProofImageGallery && (
        <ImageGalleryModal
          isOpen={showProofImageGallery}
          onClose={() => setShowProofImageGallery(false)}
          onSelectImages={(urls) => {
            setSelectedProofGalleryUrls(urls.slice(0, MAX_PROOF_BATCH));
            setShowProofImageGallery(false);
          }}
          folder={`${PO_PROOF_GALLERY_FOLDER}/${po.id}/${proofType}`}
          maxImages={MAX_PROOF_BATCH}
          currentImages={selectedProofGalleryUrls}
          stackOnTopOfModal
        />
      )}

      {editingProof && (
      <ModalPortal
        open={showProofEditModal}
        onBackdropClick={closeProofEditModal}
      >
          <div
            className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Edit className="w-6 h-6 text-red-600" />
                Edit proof
              </h2>
              <button type="button" onClick={closeProofEditModal} className="text-gray-400 hover:text-gray-600" disabled={proofEditBusy}>
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
                <span className="font-medium text-gray-900">{editingProof.fileName}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title / purpose</label>
                <input
                  type="text"
                  value={editProofTitle}
                  onChange={(e) => setEditProofTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>
              {editingProof.type === 'payment' && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Payment amount</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={editProofMoney}
                    onChange={(e) => setEditProofMoney(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                <textarea
                  value={editProofNotes}
                  onChange={(e) => setEditProofNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={closeProofEditModal} className="flex-1" disabled={proofEditBusy}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => void handleSaveProofEdit()} className="flex-1" disabled={proofEditBusy}>
                  {proofEditBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
                </Button>
              </div>
            </div>
          </div>
      </ModalPortal>
      )}
    </>
  );
}

/** Attach delivery proofs during receive flow (exported for parent page). */
export { attachPoDeliveryProofDocuments };
