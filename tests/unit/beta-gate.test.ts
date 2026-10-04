import { describe, expect, it } from "vitest";
import { basicAuthOk } from "@/lib/beta-gate";

const enc = (s: string) => `Basic ${btoa(String.fromCharCode(...new TextEncoder().encode(s)))}`;
const SECRET = "testeurs:Corde-Tuile-42";

describe("rideau d'accès de préproduction", () => {
  it("laisse passer les bons identifiants, y compris accentués", () => {
    expect(basicAuthOk(enc(SECRET), SECRET)).toBe(true);
    expect(basicAuthOk(enc("équipe:Clé-très-longue"), "équipe:Clé-très-longue")).toBe(true);
  });
  it("refuse l'absence, un mauvais mot de passe, un en-tête mal formé", () => {
    expect(basicAuthOk(null, SECRET)).toBe(false);
    expect(basicAuthOk(enc("testeurs:faux"), SECRET)).toBe(false);
    expect(basicAuthOk("Basic %%%", SECRET)).toBe(false);
    expect(basicAuthOk("Bearer abc", SECRET)).toBe(false);
  });
  it("reste fermé si la configuration est invalide ou trop faible", () => {
    expect(basicAuthOk(enc("a:b"), "a:b")).toBe(false);
    expect(basicAuthOk(enc("sansdeuxpoints"), "sansdeuxpoints")).toBe(false);
  });
});
