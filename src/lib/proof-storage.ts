import { supabase } from "@/integrations/supabase/client";

const PROOF_SIGNED_URL_TTL_SECONDS = 60 * 30;
const ABSOLUTE_HTTP_URL_PATTERN = /^https?:\/\//i;

export async function resolveProofUrl(proofReference: string | null): Promise<string | null> {
  if (!proofReference) {
    return null;
  }

  if (ABSOLUTE_HTTP_URL_PATTERN.test(proofReference)) {
    return proofReference;
  }

  const { data, error } = await supabase.storage
    .from("proofs")
    .createSignedUrl(proofReference, PROOF_SIGNED_URL_TTL_SECONDS);

  if (error) {
    return null;
  }

  return data.signedUrl;
}
