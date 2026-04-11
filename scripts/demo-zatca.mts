/**
 * Offline demo of the ZATCA Phase 1 QR encoder.
 *
 * Builds a sample simplified-tax-invoice, prints the TLV bytes in hex, the
 * Base64 payload, and renders the QR code directly in the terminal — all
 * without touching Supabase, Anthropic, or OpenAI.
 *
 * Run:  pnpm demo
 */

import QRCode from "qrcode";
import {
  buildZatcaTlv,
  buildZatcaQrBase64,
  type ZatcaQrFields,
} from "../lib/zatca/tlv.ts";

const invoice: ZatcaQrFields = {
  sellerName: "متجر الاختبار",
  vatNumber: "301122334400003",
  timestampIso: "2026-04-11T12:00:00Z",
  totalWithVat: "115.00",
  vatTotal: "15.00",
};

const hex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(" ");

const bold = (s: string) => `\x1b[1m${s}\x1b[0m`;
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`;

console.log(bold("\n── Sample ZATCA Phase 1 Simplified Invoice ──\n"));
console.log(`  Seller name   : ${invoice.sellerName}`);
console.log(`  VAT number    : ${invoice.vatNumber}`);
console.log(`  Timestamp     : ${invoice.timestampIso}`);
console.log(`  Total w/ VAT  : ${invoice.totalWithVat} SAR`);
console.log(`  VAT total     : ${invoice.vatTotal} SAR`);

const tlvBytes = buildZatcaTlv(invoice);
const base64 = buildZatcaQrBase64(invoice);

console.log(bold("\n── TLV bytes (" + tlvBytes.length + " bytes) ──\n"));
console.log(dim("  " + hex(tlvBytes)));

console.log(bold("\n── Base64 QR payload ──\n"));
console.log("  " + base64);

console.log(bold("\n── QR code ──\n"));
const ascii = await QRCode.toString(base64, {
  type: "terminal",
  small: true,
  errorCorrectionLevel: "M",
});
console.log(ascii);

console.log(
  dim(
    "  Scan with any QR reader — the decoded text is the Base64 string above.\n",
  ),
);
