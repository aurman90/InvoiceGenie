import { describe, expect, it } from "vitest";
import { buildZatcaQrBase64, buildZatcaTlv } from "./tlv";

describe("ZATCA TLV encoder", () => {
  // Reference sample from ZATCA "QRCodeCreation.pdf" §2 test vector.
  const sample = {
    sellerName: "Bob",
    vatNumber: "1234567891",
    timestampIso: "2022-04-25T15:30:00Z",
    totalWithVat: "100.00",
    vatTotal: "15.00",
  };

  it("encodes the reference sample to the expected TLV bytes", () => {
    const bytes = buildZatcaTlv(sample);
    // Tag 1 "Bob"
    expect([...bytes.slice(0, 5)]).toEqual([0x01, 0x03, 0x42, 0x6f, 0x62]);
    // Tag 2 length 10
    expect(bytes[5]).toBe(0x02);
    expect(bytes[6]).toBe(0x0a);
    // Tag 3 length 20
    expect(bytes[17]).toBe(0x03);
    expect(bytes[18]).toBe(0x14);
    // Tag 4 length 6
    expect(bytes[39]).toBe(0x04);
    expect(bytes[40]).toBe(0x06);
    // Tag 5 length 5
    expect(bytes[47]).toBe(0x05);
    expect(bytes[48]).toBe(0x05);
    // Total length: 2+3 + 2+10 + 2+20 + 2+6 + 2+5 = 54
    expect(bytes.length).toBe(54);
  });

  it("encodes the reference sample to the expected Base64 string", () => {
    const expected =
      "AQNCb2ICCjEyMzQ1Njc4OTEDFDIwMjItMDQtMjVUMTU6MzA6MDBaBAYxMDAuMDAFBTE1LjAw";
    expect(buildZatcaQrBase64(sample)).toBe(expected);
  });

  it("round-trips: the TLV can be decoded back into the 5 original fields", () => {
    const bytes = buildZatcaTlv(sample);
    const decoded: Record<number, string> = {};
    let i = 0;
    while (i < bytes.length) {
      const tag = bytes[i++];
      const len = bytes[i++];
      decoded[tag] = new TextDecoder().decode(bytes.slice(i, i + len));
      i += len;
    }
    expect(decoded[1]).toBe("Bob");
    expect(decoded[2]).toBe("1234567891");
    expect(decoded[3]).toBe("2022-04-25T15:30:00Z");
    expect(decoded[4]).toBe("100.00");
    expect(decoded[5]).toBe("15.00");
  });

  it("correctly encodes multibyte Arabic seller names", () => {
    const bytes = buildZatcaTlv({
      ...sample,
      sellerName: "شركة أحمد", // 9 Arabic chars, 17 UTF-8 bytes
    });
    expect(bytes[0]).toBe(0x01);
    // "شركة أحمد" encodes to 17 UTF-8 bytes
    expect(bytes[1]).toBe(17);
    const name = new TextDecoder().decode(bytes.slice(2, 2 + 17));
    expect(name).toBe("شركة أحمد");
  });

  it("throws when a field exceeds 255 bytes", () => {
    expect(() =>
      buildZatcaTlv({ ...sample, sellerName: "a".repeat(256) }),
    ).toThrow(/exceeds 255 bytes/);
  });
});
