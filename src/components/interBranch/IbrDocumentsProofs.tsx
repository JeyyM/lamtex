import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ImageGalleryModal from '@/src/components/ImageGalleryModal';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/Card';
import { ModalPortal } from '@/src/components/ui/ModalPortal';
import { Badge } from '@/src/components/ui/Badge';
import { Button } from '@/src/components/ui/Button';
import {
  deleteIbrProof,
  fetchIbrProofs,
  fileNameFromProofUrl,
  IBR_PROOF_GALLERY_FOLDER,
  ibrProofFileIsImageName,
  insertIbrProofDocuments,
  updateIbrProof,
  uploadIbrProofBinary,
} from '@/src/lib/ibrProofDocuments';
import type { IbrProofDocument, IbrProofType } from '@/src/types/ibrProofs';
import { Edit, FileText, Image as ImageIconLucide, Loader2, Trash2, Truck, Upload, X } from 'lucide-react';

const MAX_PROOF_BATCH = 30;
const PROOF_UPLOAD_ACCEPT = 'image/*,.pdf,.doc,.docx,.xls,.xlsx';
const IBR_PROOF_TYPES: IbrProofType[] = ['delivery', 'other'];

interface Props {
  requestId: string;
  ibrNumber: string;
  canUpload: boolean;
  employeeName: string | null;
  sessionEmail: string | null;
  refreshToken?: number;
  onInsertLog: (
    action: string,
    description: string,
    oldValue?: object | null,
    newValue?: object | null,
    metadata?: object | null,
  ) => Promise<void>;
}

function proofTypeLabel(type: IbrProofType): string {
  return type === 'delivery' ? 'Delivery' : 'Other';
}

export default function IbrDocumentsProofs({
  requestId,
  ibrNumber,
  canUpload,
  employeeName,
  sessionEmail,
  refreshToken = 0,
  onInsertLog,
}: Props) {
  const [proofs, setProofs] = useState<IbrProofDocument[]>([]);
  const [proofsLoading, setProofsLoading] = useState(true);
  const [documentsProofTab, setDocumentsProofTab] = useState<IbrProofType>('delivery');
  const [showProofModal, setShowProofModal] = useState(false);
  const [proofType, setProofType] = useState<IbrProofType>('delivery');
  const [proofNotes, setProofNotes] = useState('');
  const [selectedProofGalleryUrls, setSelectedProofGalleryUrls] = useState<string[]>([]);
  const [selectedProofLocalFiles, setSelectedProofLocalFiles] = useState<File[]>([]);
  const [showProofImageGallery, setShowProofImageGallery] = useState(false);
  const [proofUploadBusy, setProofUploadBusy] = useState(false);
  const [showProofEditModal, setShowProofEditModal] = useState(false);
  const [editingProof, setEditingProof] = useState<IbrProofDocument | null>(null);
  const [editProofTitle, setEditProofTitle] = useState('');
  const [editProofNotes, setEditProofNotes] = useState('');
  const [editProofType, setEditProofType] = useState<IbrProofType>('delivery');
  const [proofEditBusy, setProofEditBusy] = useState(false);

  const loadProofs = useCallback(async () => {
    setProofsLoading(true);
    try {
      const rows = await fetchIbrProofs(requestId);
      setProofs(rows);
    } catch (e) {
      console.warn('[IBR proofs] load failed', e);
      setProofs([]);
    } finally {
      setProofsLoading(false);
    }
  }, [requestId]);

  useEffect(() => {
    void loadProofs();
  }, [loadProofs, refreshToken]);

  const documentProofsFiltered = useMemo(
    () => proofs.filter((p) => p.type === documentsProofTab),
    [proofs, documentsProofTab],
  );

  const openProofEditModal = (proof: IbrProofDocument) => {
    setEditingProof(proof);
    setEditProofTitle(proof.fileName);
    setEditProofNotes(proof.note ?? '');
    setEditProofType(proof.type);
    setShowProofEditModal(true);
  };

  const closeProofEditModal = () => {
    setShowProofEditModal(false);
    setEditingProof(null);
  };

  const handleSaveProofEdit = async () => {
    if (!editingProof || !canUpload) return;
    setProofEditBusy(true);
    try {
      const titleTrim = editProofTitle.trim();
      const notesTrim = editProofNotes.trim();
      const { error } = await updateIbrProof(editingProof.id, {
        file_name: titleTrim || editingProof.fileName,
        note: notesTrim || null,
        proof_type: editProofType,
      });
      if (error) {
        alert(error);
        return;
      }
      await onInsertLog(
        'updated',
        `Updated ${proofTypeLabel(editProofType).toLowerCase()} proof: ${titleTrim || editingProof.fileName}`,
        {
          file_name: editingProof.fileName,
          note: editingProof.note ?? null,
          type: editingProof.type,
        },
        {
          file_name: titleTrim || editingProof.fileName,
          note: notesTrim || null,
          type: editProofType,
        },
        { proof_id: editingProof.id },
      );
      closeProofEditModal();
      await loadProofs();
    } finally {
      setProofEditBusy(false);
    }
  };

  const openProofDocumentModal = () => {
    setProofType(documentsProofTab);
    setProofNotes('');
    setSelectedProofGalleryUrls([]);
    setSelectedProofLocalFiles([]);
    setShowProofModal(true);
  };

  const handleUploadClick = () => {
    if (!canUpload) {
      alert('Proof uploads are not available for this request in its current status.');
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

  const handleUploadProof = async () => {
    if (!canUpload) {
      alert('Proof uploads are not available for this request in its current status.');
      return;
    }

    const nGallery = selectedProofGalleryUrls.length;
    const nFiles = selectedProofLocalFiles.length;
    if (nGallery + nFiles === 0) {
      alert('Select at least one image or document to upload.');
      return;
    }
    if (nGallery + nFiles > MAX_PROOF_BATCH) {
      alert(`You can add at most ${MAX_PROOF_BATCH} files per upload.`);
      return;
    }

    const uploadedBy = employeeName || sessionEmail || 'User';
    const notesValue = proofNotes.trim() || null;
    setProofUploadBusy(true);
    try {
      const rows: Parameters<typeof insertIbrProofDocuments>[0] = [];

      for (let i = 0; i < selectedProofGalleryUrls.length; i++) {
        const url = selectedProofGalleryUrls[i]!;
        rows.push({
          inter_branch_request_id: requestId,
          proof_type: proofType,
          file_name: fileNameFromProofUrl(url, `proof-${i + 1}`),
          file_url: url,
          file_size: 0,
          note: notesValue,
          uploaded_by: uploadedBy,
        });
      }

      for (const file of selectedProofLocalFiles) {
        const { publicUrl } = await uploadIbrProofBinary(requestId, proofType, file);
        rows.push({
          inter_branch_request_id: requestId,
          proof_type: proofType,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          note: notesValue,
          uploaded_by: uploadedBy,
        });
      }

      const { error: insErr } = await insertIbrProofDocuments(rows);
      if (insErr) throw new Error(insErr);

      const names = rows.map((r) => r.file_name).join(', ');
      await onInsertLog(
        'proof_uploaded',
        `${proofTypeLabel(proofType)} proof: ${rows.length} file(s) — ${names}`,
        null,
        null,
        {
          count: rows.length,
          fileNames: names,
          source: 'ibr_proof_modal',
          type: proofType,
        },
      );

      setShowProofModal(false);
      setShowProofImageGallery(false);
      setProofNotes('');
      setSelectedProofGalleryUrls([]);
      setSelectedProofLocalFiles([]);
      await loadProofs();
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setProofUploadBusy(false);
    }
  };

  const handleRemoveProof = async (proof: IbrProofDocument) => {
    if (!canUpload) return;
    if (!window.confirm(`Remove "${proof.fileName}"?`)) return;
    const { error } = await deleteIbrProof(proof.id);
    if (error) {
      alert(error);
      return;
    }
    await onInsertLog(
      'updated',
      `Removed ${proofTypeLabel(proof.type).toLowerCase()} proof: ${proof.fileName}`,
      null,
      null,
      { proof_id: proof.id, file_name: proof.fileName, type: proof.type },
    );
    await loadProofs();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIconLucide className="w-5 h-5" />
              Proof of delivery
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUploadClick}
              disabled={!canUpload || proofUploadBusy}
              className="gap-2 w-full sm:w-auto shrink-0"
            >
              {proofUploadBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              Upload proof
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4 border-b border-gray-200 pb-3">
            {IBR_PROOF_TYPES.map((tab) => (
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
                {proofTypeLabel(tab)}
                <span className="ml-1.5 text-xs opacity-90">({proofs.filter((p) => p.type === tab).length})</span>
              </button>
            ))}
          </div>

          {proofsLoading ? (
            <p className="text-sm text-gray-500 text-center py-8 flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading proofs…
            </p>
          ) : documentProofsFiltered.length > 0 ? (
            <div className="space-y-3">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">
                Uploaded — {proofTypeLabel(documentsProofTab)}
              </h4>
              {documentProofsFiltered.map((proof) => (
                <div
                  key={proof.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div
                      className={`w-10 h-10 flex-shrink-0 rounded-lg flex items-center justify-center ${
                        proof.type === 'delivery' ? 'bg-blue-100' : 'bg-amber-100'
                      }`}
                    >
                      {ibrProofFileIsImageName(proof.fileName) ? (
                        <ImageIconLucide
                          className={`w-5 h-5 ${proof.type === 'delivery' ? 'text-blue-600' : 'text-amber-700'}`}
                        />
                      ) : (
                        <FileText
                          className={`w-5 h-5 ${proof.type === 'delivery' ? 'text-blue-600' : 'text-amber-700'}`}
                        />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{proof.fileName}</p>
                      <p className="text-xs text-gray-500 truncate">{proof.fileName}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge className="text-xs flex-shrink-0">{proofTypeLabel(proof.type)}</Badge>
                        <span className="text-xs text-gray-500">
                          {new Date(proof.createdAt).toLocaleString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {proof.uploadedBy ? (
                          <span className="text-xs text-gray-500">· {proof.uploadedBy}</span>
                        ) : null}
                      </div>
                      {proof.note && (
                        <p className="text-xs text-gray-600 mt-2 pr-1 whitespace-pre-wrap border-t border-gray-200/80 pt-2">
                          {proof.note}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-end sm:justify-start flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openProofEditModal(proof)}
                      disabled={!canUpload}
                    >
                      <Edit className="w-3.5 h-3.5 mr-1" />
                      Edit
                    </Button>
                    {proof.fileUrl ? (
                      <Button variant="outline" size="sm" onClick={() => window.open(proof.fileUrl, '_blank')}>
                        View
                      </Button>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-700 border-red-200 hover:bg-red-50"
                      onClick={() => void handleRemoveProof(proof)}
                      disabled={!canUpload}
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1" />
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 text-center py-8">
              No {documentsProofTab === 'delivery' ? 'delivery' : 'other'} documents yet.
            </p>
          )}
        </CardContent>
      </Card>

      <ModalPortal
        open={showProofModal}
        onBackdropClick={() => {
          if (proofUploadBusy) return;
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
              Upload proof
            </h2>
            <button
              type="button"
              onClick={() => {
                if (proofUploadBusy) return;
                setShowProofModal(false);
                setShowProofImageGallery(false);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-4">
            <p className="text-sm text-gray-600">{ibrNumber}</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Document type</label>
              <div className="grid grid-cols-2 gap-3">
                {IBR_PROOF_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setProofType(t);
                      setSelectedProofGalleryUrls([]);
                      setSelectedProofLocalFiles([]);
                    }}
                    className={`p-3 border-2 rounded-lg text-center transition-colors ${
                      proofType === t
                        ? t === 'delivery'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-amber-500 bg-amber-50 text-amber-800'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {t === 'delivery' ? (
                      <Truck className="w-5 h-5 mx-auto mb-1" />
                    ) : (
                      <FileText className="w-5 h-5 mx-auto mb-1" />
                    )}
                    <span className="text-sm font-semibold">{proofTypeLabel(t)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Notes <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <textarea
                rows={2}
                value={proofNotes}
                onChange={(e) => setProofNotes(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Optional context for approvers or branches…"
              />
            </div>

            <div>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <label className="text-sm font-semibold text-gray-700">Images</label>
                <button
                  type="button"
                  onClick={() => setShowProofImageGallery(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  {selectedProofGalleryUrls.length > 0 ? 'Change selection' : 'Add from gallery'}
                </button>
              </div>
              {selectedProofGalleryUrls.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center py-8 text-center rounded-xl border-2 border-dashed border-gray-300 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-colors"
                  onClick={() => setShowProofImageGallery(true)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setShowProofImageGallery(true)}
                >
                  <ImageIconLucide className="w-8 h-8 text-gray-300 mb-2" />
                  <p className="text-sm text-gray-500">Click to select from image gallery</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {selectedProofGalleryUrls.map((url) => (
                    <div key={url} className="relative rounded-lg overflow-hidden border border-gray-200 aspect-square">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => removeProofGalleryUrl(url)}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-600 text-white rounded-full flex items-center justify-center"
                        aria-label="Remove"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Upload documents (max 25MB each)</label>
              <input
                type="file"
                accept={PROOF_UPLOAD_ACCEPT}
                multiple
                onChange={handleProofFilesSelect}
                className="block w-full text-sm text-gray-600 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200"
              />
              {selectedProofLocalFiles.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {selectedProofLocalFiles.map((file, idx) => (
                    <li key={`${file.name}-${idx}`} className="flex items-center justify-between text-sm text-gray-700">
                      <span className="truncate">{file.name}</span>
                      <button type="button" onClick={() => removeProofLocalFile(idx)} className="text-red-600 hover:underline">
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50">
            <Button
              variant="outline"
              onClick={() => {
                if (proofUploadBusy) return;
                setShowProofModal(false);
                setShowProofImageGallery(false);
              }}
              disabled={proofUploadBusy}
            >
              Cancel
            </Button>
            <Button variant="primary" onClick={() => void handleUploadProof()} disabled={proofUploadBusy} className="gap-2">
              {proofUploadBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {proofUploadBusy ? 'Uploading…' : 'Upload proof'}
            </Button>
          </div>
        </div>
      </ModalPortal>

      <ImageGalleryModal
        isOpen={showProofImageGallery}
        onClose={() => setShowProofImageGallery(false)}
        folder={`${IBR_PROOF_GALLERY_FOLDER}/${requestId}/${proofType}`}
        maxImages={20}
        currentImages={selectedProofGalleryUrls}
        onSelectImages={(urls) => {
          setSelectedProofGalleryUrls(urls);
          setShowProofImageGallery(false);
        }}
        stackOnTopOfModal
      />

      <ModalPortal open={showProofEditModal && !!editingProof} onBackdropClick={closeProofEditModal}>
        <div
          className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Edit className="w-6 h-6 text-red-600" />
              Edit proof
            </h2>
            <button
              type="button"
              onClick={closeProofEditModal}
              className="text-gray-400 hover:text-gray-600"
              disabled={proofEditBusy}
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="p-6 space-y-4">
            <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              <span className="font-medium text-gray-900">{editingProof?.fileName}</span>
              <span className="mx-2 text-gray-400">·</span>
              <Badge className="text-xs align-middle">
                {editingProof ? proofTypeLabel(editingProof.type) : 'Delivery'}
              </Badge>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Document type</label>
              <div className="grid grid-cols-2 gap-3">
                {IBR_PROOF_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEditProofType(t)}
                    className={`p-3 border-2 rounded-lg text-center transition-colors ${
                      editProofType === t
                        ? t === 'delivery'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-amber-500 bg-amber-50 text-amber-800'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {t === 'delivery' ? (
                      <Truck className="w-5 h-5 mx-auto mb-1" />
                    ) : (
                      <FileText className="w-5 h-5 mx-auto mb-1" />
                    )}
                    <span className="text-sm font-semibold">{proofTypeLabel(t)}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title / purpose</label>
              <input
                type="text"
                value={editProofTitle}
                onChange={(e) => setEditProofTitle(e.target.value)}
                placeholder="Proof of delivery"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
              <textarea
                value={editProofNotes}
                onChange={(e) => setEditProofNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-300 focus:border-gray-400 outline-none text-sm"
                placeholder="Additional information…"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={closeProofEditModal} className="flex-1" disabled={proofEditBusy}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => void handleSaveProofEdit()}
                className="flex-1"
                disabled={proofEditBusy || !canUpload}
              >
                {proofEditBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </div>
        </div>
      </ModalPortal>
    </>
  );
}
