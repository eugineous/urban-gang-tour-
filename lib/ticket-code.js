import { randomBytes } from "crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 12;

/**
 * Generates a cryptographically random 12-character uppercase alphanumeric
 * ticket code (A-Z, 0-9).
 *
 * Uses rejection sampling to avoid modulo bias: we generate random bytes and
 * reject any byte value that would cause non-uniform distribution.
 *
 * @returns {string} 12-char uppercase alphanumeric code
 */
export function generateTicketCode() {
  const alphabetLength = ALPHABET.length; // 36
  // The largest multiple of 36 that fits in a byte (0–255): 252
  const maxUnbiased = Math.floor(256 / alphabetLength) * alphabetLength;

  let code = "";
  while (code.length < CODE_LENGTH) {
    const bytes = randomBytes(CODE_LENGTH * 2); // generate extra to reduce iterations
    for (let i = 0; i < bytes.length && code.length < CODE_LENGTH; i++) {
      const byte = bytes[i];
      // Reject bytes >= maxUnbiased to avoid modulo bias
      if (byte < maxUnbiased) {
        code += ALPHABET[byte % alphabetLength];
      }
    }
  }

  return code;
}
