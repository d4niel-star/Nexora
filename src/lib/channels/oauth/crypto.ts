import { randomBytes, createCipheriv, createDecipheriv } from "crypto";

// For production, ensure you have a 32-byte ENCRYPTION_KEY
const ALGORITHM = "aes-256-cbc";
const RAW_KEY = process.env.ENCRYPTION_KEY || "fallback_dev_key_must_be_32_byte!";
// Pad or truncate to ensure exactly 32 bytes
const ENCRYPTION_KEY = Buffer.from(RAW_KEY.padEnd(32, "0").substring(0, 32));

export function encryptToken(text: string): string {
  if (!text) return text;
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return `${iv.toString('hex')}:${encrypted}`;
}

export function decryptToken(encryptedText: string): string {
  if (!encryptedText) return encryptedText;
  try {
    const textParts = encryptedText.split(':');
    if (textParts.length !== 2) return encryptedText; // Probably was not encrypted
    
    const iv = Buffer.from(textParts[0], 'hex');
    const encrypted = Buffer.from(textParts[1], 'hex');
    const decipher = createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (e) {
    console.error("[decryptToken] Failed to decrypt:", e);
    return "";
  }
}
