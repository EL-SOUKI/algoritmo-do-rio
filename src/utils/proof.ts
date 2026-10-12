import { createHash, randomBytes } from "node:crypto";

export function createPublicRecyclingId(): string {
  return `REC-${randomBytes(5).toString("hex").toUpperCase()}`;
}

export function createProofHash(payload: Record<string, unknown>): string {
  const canonicalEntries = Object.entries(payload).sort(([a], [b]) => a.localeCompare(b));
  const canonical = JSON.stringify(Object.fromEntries(canonicalEntries));
  return createHash("sha256").update(canonical).digest("hex");
}
