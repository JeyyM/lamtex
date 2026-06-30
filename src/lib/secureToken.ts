/**
 * Cryptographically-strong, URL-safe token generator.
 *
 * Uses the Web Crypto API (`crypto.getRandomValues`) which is available in all
 * modern browsers. Falls back to `Math.random` only if Web Crypto is somehow
 * unavailable (should never happen in our supported environments) so token
 * generation never throws.
 *
 * 16 bytes → 32 hex chars → 128 bits of entropy, which makes guessing a valid
 * token computationally infeasible even without rate limiting.
 */
export function generateSecureToken(byteLength = 16): string {
  const bytes = new Uint8Array(byteLength);
  const cryptoObj =
    typeof globalThis !== 'undefined'
      ? (globalThis.crypto as Crypto | undefined)
      : undefined;

  if (cryptoObj?.getRandomValues) {
    cryptoObj.getRandomValues(bytes);
  } else {
    for (let i = 0; i < byteLength; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}
