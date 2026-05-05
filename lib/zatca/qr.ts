import QRCode from "qrcode";
import { buildZatcaQrBase64, type ZatcaQrFields } from "./tlv";

/**
 * Generate a ZATCA-compliant QR code as a PNG data URL.
 * The QR payload is the Base64 TLV string — per spec, the QR *content* is the
 * Base64 string, not the raw bytes.
 */
export async function renderZatcaQrDataUrl(
  fields: ZatcaQrFields,
): Promise<{ payload: string; dataUrl: string }> {
  const payload = buildZatcaQrBase64(fields);
  const dataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 220,
  });
  return { payload, dataUrl };
}
