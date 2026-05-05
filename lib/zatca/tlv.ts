/**
 * ZATCA Phase 1 simplified-invoice QR code.
 *
 * Encodes 5 mandatory tags as a Tag-Length-Value byte sequence, then Base64
 * encodes the concatenation. Spec: ZATCA "Guide to Developed FATOORA
 * Compliant QR Code" (QRCodeCreation.pdf, §2).
 *
 *   Tag 1 — Seller name
 *   Tag 2 — VAT registration number
 *   Tag 3 — Timestamp (ISO 8601, Zulu)
 *   Tag 4 — Invoice total (with VAT)
 *   Tag 5 — VAT total
 *
 * All values are UTF-8. Length fits in a single byte (values < 256 bytes).
 */

export interface ZatcaQrFields {
  sellerName: string;
  vatNumber: string;
  /** ISO-8601 timestamp in UTC, e.g. "2022-04-25T15:30:00Z". */
  timestampIso: string;
  /** Total including VAT as a fixed-point string, e.g. "115.00". */
  totalWithVat: string;
  /** VAT amount as a fixed-point string, e.g. "15.00". */
  vatTotal: string;
}

function tlv(tag: number, value: string): Uint8Array {
  const encoded = new TextEncoder().encode(value);
  if (encoded.length > 255) {
    throw new Error(
      `ZATCA TLV field ${tag} exceeds 255 bytes (got ${encoded.length})`,
    );
  }
  const out = new Uint8Array(2 + encoded.length);
  out[0] = tag;
  out[1] = encoded.length;
  out.set(encoded, 2);
  return out;
}

export function buildZatcaTlv(fields: ZatcaQrFields): Uint8Array {
  const parts = [
    tlv(1, fields.sellerName),
    tlv(2, fields.vatNumber),
    tlv(3, fields.timestampIso),
    tlv(4, fields.totalWithVat),
    tlv(5, fields.vatTotal),
  ];
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

export function buildZatcaQrBase64(fields: ZatcaQrFields): string {
  const bytes = buildZatcaTlv(fields);
  // Works in both Node and Edge runtimes.
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  // eslint-disable-next-line no-undef
  return btoa(binary);
}
