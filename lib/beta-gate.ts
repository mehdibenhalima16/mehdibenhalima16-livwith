/**
 * Rideau d'accès HTTP Basic pour la préproduction, activé par BETA_BASIC_AUTH="identifiant:motdepasse".
 * Il cache les pages aux curieux ; la vraie barrière reste l'invitation contrôlée en base.
 */
function safeEqual(a: string, b: string) {
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}

export function basicAuthOk(header: string | null, expected: string): boolean {
  if (!expected.includes(":") || expected.length < 12) return false; // configuration invalide : fermé
  if (!header?.startsWith("Basic ")) return false;
  let decoded: string;
  try {
    decoded = new TextDecoder().decode(Uint8Array.from(atob(header.slice(6).trim()), (c) => c.charCodeAt(0)));
  } catch {
    return false;
  }
  return safeEqual(decoded, expected);
}
