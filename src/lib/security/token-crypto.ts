import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

// ─── AES-256-CBC token vault ───
// Used to wrap OAuth access/refresh tokens (Mercado Pago, Google Ads,
// Meta, TikTok, Sourcing providers) in the DB. The key ONLY exists in
// environment configuration — never in source.
//
// Fail-closed policy:
// - In production runtime (NODE_ENV=production) the FIRST call to
//   encryptToken / decryptToken throws when ENCRYPTION_KEY is unset.
//   This is deliberate: without a real secret, every encrypted value
//   in the vault is equivalent to plaintext, and tokens already stored
//   would be unrecoverable on rotation anyway. Failing at first use
//   surfaces the misconfiguration on the first real OAuth action
//   (connecting an MP account, an Ads provider, etc.) instead of
//   silently corrupting the vault. Resolution is lazy on purpose: the
//   Next.js build step itself runs under NODE_ENV=production for the
//   purpose of collecting page data and must not throw at module load.
// - In development / test, a deterministic dev fallback is allowed so
//   contributors aren't blocked on first checkout; a warning is emitted
//   the first time the vault is used so the condition is visible.
//
// Generate a production key with:  openssl rand -hex 32
const ALGORITHM = "aes-256-cbc";

let cachedKey: Buffer | null = null;
let devWarnEmitted = false;

function getEncryptionKey(): Buffer {
  if (cachedKey) return cachedKey;

  const raw = process.env.ENCRYPTION_KEY;
  if (raw && raw.length > 0) {
    cachedKey = Buffer.from(raw.padEnd(32, "0").slice(0, 32));
    return cachedKey;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "ENCRYPTION_KEY is not set. Refusing to operate the OAuth token " +
        "vault (MercadoPago, Google Ads, Meta, TikTok) without a real " +
        "secret. Generate one with `openssl rand -hex 32` and set " +
        "ENCRYPTION_KEY in the production environment.",
    );
  }

  if (!devWarnEmitted) {
    devWarnEmitted = true;
    console.warn(
      "[token-crypto] ENCRYPTION_KEY is not set — using the deterministic " +
        "dev fallback. DO NOT deploy this configuration to production.",
    );
  }
  cachedKey = Buffer.from(
    "fallback_dev_key_must_be_32_byte!".padEnd(32, "0").slice(0, 32),
  );
  return cachedKey;
}

export function encryptToken(text: string): string {
  if (!text) return text;
  const key = getEncryptionKey();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

export function decryptToken(encryptedText: string): string {
  if (!encryptedText) return encryptedText;

  try {
    const parts = encryptedText.split(":");
    if (parts.length !== 2) return encryptedText;

    const key = getEncryptionKey();
    const iv = Buffer.from(parts[0], "hex");
    const encrypted = Buffer.from(parts[1], "hex");
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    let decrypted = decipher.update(encrypted, undefined, "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    return "";
  }
}
