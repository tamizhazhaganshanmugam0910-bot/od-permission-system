import { supabase } from "./supabase";

const PROOF_BUCKET = "od-proofs";
const MAX_PROOF_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_PROOF_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];

export function validateODProofFile(file: File): string | null {
  if (!ALLOWED_PROOF_FILE_TYPES.includes(file.type)) {
    return "Choose a PDF, JPG, or PNG proof file.";
  }
  if (file.size > MAX_PROOF_FILE_SIZE) {
    return "Proof files must be 10 MB or smaller.";
  }
  return null;
}

export async function uploadODProof(
  studentId: string,
  requestId: string,
  file: File,
): Promise<{ path: string | null; error: string | null }> {
  const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-120) || "proof";
  const path = `${studentId}/${requestId}/${safeFileName}`;
  const { data, error } = await supabase.storage.from(PROOF_BUCKET).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) return { path: null, error: error.message };
  return { path: data.path, error: null };
}

export async function downloadODProof(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(PROOF_BUCKET)
    .createSignedUrl(path, 60, { download: true });

  if (error || !data?.signedUrl) return error?.message || "Could not create a proof-file download link.";

  const link = document.createElement("a");
  link.href = data.signedUrl;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.click();
  return null;
}