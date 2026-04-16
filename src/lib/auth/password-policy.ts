/**
 * Shared password policy validator.
 * Used both server-side (auth-actions) and client-side (register form).
 * No Node.js-only imports — pure logic.
 */

const COMMON_WEAK_PASSWORDS = [
  "password", "123456", "12345678", "123456789", "1234567890",
  "qwerty", "abc123", "password1", "admin", "letmein",
  "welcome", "monkey", "dragon", "master", "login",
  "princess", "football", "shadow", "sunshine", "trustno1",
  "iloveyou", "batman", "access", "hello", "charlie",
  "nexora", "nexora123", "nexora1234", "password123",
  "qwerty123", "admin123", "changeme", "secret",
];

const SEQUENTIAL_PATTERNS = [
  "abcdef", "abcdefgh", "123456", "12345678", "qwerty",
  "asdfgh", "zxcvbn", "aaaaaa", "111111", "000000",
];

export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePasswordPolicy(
  password: string,
  context?: { email?: string; companyName?: string }
): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || password.length < 12) {
    errors.push("Mínimo 12 caracteres.");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Debe contener al menos una letra mayúscula.");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Debe contener al menos una letra minúscula.");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Debe contener al menos un número.");
  }

  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push("Debe contener al menos un símbolo (ej: !@#$%&*).");
  }

  // Context-aware checks
  if (context?.email) {
    const emailLower = context.email.toLowerCase();
    const passwordLower = password.toLowerCase();

    if (passwordLower === emailLower) {
      errors.push("La contraseña no puede ser igual al email.");
    }

    const localPart = emailLower.split("@")[0];
    if (localPart.length >= 3 && passwordLower.includes(localPart)) {
      errors.push("La contraseña no puede contener tu dirección de email.");
    }
  }

  if (context?.companyName) {
    const nameLower = context.companyName.toLowerCase().replace(/\s+/g, "");
    const passwordLower = password.toLowerCase();
    if (nameLower.length >= 3 && passwordLower.includes(nameLower)) {
      errors.push("La contraseña no puede contener el nombre de la empresa.");
    }
  }

  // Common passwords check
  const passwordLower = password.toLowerCase();
  if (COMMON_WEAK_PASSWORDS.includes(passwordLower)) {
    errors.push("Esta contraseña es demasiado común. Elegí una más segura.");
  }

  // Sequential patterns
  for (const pattern of SEQUENTIAL_PATTERNS) {
    if (passwordLower.includes(pattern)) {
      errors.push("La contraseña contiene secuencias predecibles.");
      break;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
