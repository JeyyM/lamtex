import { supabase } from '@/src/lib/supabase';
import type { IbrProofDocument, IbrProofType } from '@/src/types/ibrProofs';

const STORAGE_BUCKET = 'images';
export const IBR_PROOF_GALLERY_FOLDER = 'ibr-delivery-proofs';

type ProofRow = {
  id: string;
  inter_branch_request_id: string;
  proof_type: string | null;
  file_url: string;
  file_name: string;
  file_size: number | null;
  note: string | null;
  uploaded_by: string | null;
  created_at: string;
};

function normalizeProofType(raw: string | null | undefined): IbrProofType {
  return raw === 'other' ? 'other' : 'delivery';
}

export function ibrProofFileIsImageName(name: string): boolean {
  return /\.(jpe?g|png|gif|webp|bmp|svg|heic|heif)$/i.test(name.trim());
}

export function ibrProofRowToDocument(row: ProofRow): IbrProofDocument {
  return {
    id: row.id,
    requestId: row.inter_branch_request_id,
    type: normalizeProofType(row.proof_type),
    fileName: row.file_name,
    fileUrl: row.file_url,
    fileSize: Number(row.file_size ?? 0),
    note: row.note?.trim() || undefined,
    uploadedBy: row.uploaded_by ?? '',
    createdAt: row.created_at,
  };
}

export type IbrProofInsertInput = {
  inter_branch_request_id: string;
  proof_type: IbrProofType;
  file_name: string;
  file_url: string;
  file_size?: number;
  note?: string | null;
  uploaded_by: string;
};

export async function fetchIbrProofs(requestId: string): Promise<IbrProofDocument[]> {
  const fullSelect =
    'id, inter_branch_request_id, proof_type, file_url, file_name, file_size, note, uploaded_by, created_at';
  const legacySelect = 'id, inter_branch_request_id, file_url, file_name, file_size, note, uploaded_by, created_at';

  let { data, error } = await supabase
    .from('inter_branch_delivery_proofs')
    .select(fullSelect)
    .eq('inter_branch_request_id', requestId)
    .order('created_at', { ascending: false });

  if (error && /proof_type/i.test(error.message)) {
    ({ data, error } = await supabase
      .from('inter_branch_delivery_proofs')
      .select(legacySelect)
      .eq('inter_branch_request_id', requestId)
      .order('created_at', { ascending: false }));
  }

  if (error) throw new Error(error.message);
  return (data ?? []).map((row) =>
    ibrProofRowToDocument({ ...(row as ProofRow), proof_type: (row as ProofRow).proof_type ?? 'delivery' }),
  );
}

export async function insertIbrProofDocuments(
  rows: IbrProofInsertInput[],
): Promise<{ data: { id: string }[] | null; error: string | null }> {
  if (rows.length === 0) return { data: [], error: null };
  const { data, error } = await supabase.from('inter_branch_delivery_proofs').insert(rows).select('id');
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as { id: string }[], error: null };
}

export async function deleteIbrProof(proofId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('inter_branch_delivery_proofs').delete().eq('id', proofId);
  return { error: error?.message ?? null };
}

export type IbrProofUpdateInput = {
  file_name?: string;
  note?: string | null;
  proof_type?: IbrProofType;
};

export async function updateIbrProof(
  proofId: string,
  input: IbrProofUpdateInput,
): Promise<{ error: string | null }> {
  const payload: Record<string, unknown> = {};
  if (input.file_name !== undefined) payload.file_name = input.file_name;
  if (input.note !== undefined) payload.note = input.note;
  if (input.proof_type !== undefined) payload.proof_type = input.proof_type;
  const { error } = await supabase.from('inter_branch_delivery_proofs').update(payload).eq('id', proofId);
  return { error: error?.message ?? null };
}

export async function uploadIbrProofBinary(
  requestId: string,
  proofType: IbrProofType,
  file: File,
): Promise<{ publicUrl: string }> {
  const ext = file.name.includes('.') ? file.name.split('.').pop()! : 'bin';
  const path = `${IBR_PROOF_GALLERY_FOLDER}/${requestId}/${proofType}/${crypto.randomUUID()}.${ext}`;
  const { error: upErr } = await supabase.storage.from(STORAGE_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  });
  if (upErr) throw new Error(upErr.message);
  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path);
  return { publicUrl: data.publicUrl };
}

export function fileNameFromProofUrl(url: string, fallback: string): string {
  const raw = url.split('/').pop()?.split('?')[0] ?? fallback;
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
