import { describe, expect, it } from "vitest";
import { exifDate, photoAgeLabel } from "./photo-date";

/** A minimal JPEG: SOI + APP1 Exif with IFD0 -> Exif IFD -> DateTimeOriginal, then SOS. */
function jpegWithExif(date: string, little = true): Uint8Array {
  const tiff = new DataView(new ArrayBuffer(8 + 2 + 12 + 4 + 2 + 12 + 4 + 20));
  const u16 = (o: number, v: number) => tiff.setUint16(o, v, little);
  const u32 = (o: number, v: number) => tiff.setUint32(o, v, little);
  tiff.setUint16(0, little ? 0x4949 : 0x4d4d);
  u16(2, 42);
  u32(4, 8); // IFD0 at 8
  u16(8, 1); // one entry: Exif IFD pointer
  u16(10, 0x8769);
  u16(12, 4);
  u32(14, 1);
  u32(18, 26); // Exif IFD at 26
  u32(22, 0);
  u16(26, 1); // one entry: DateTimeOriginal
  u16(28, 0x9003);
  u16(30, 2);
  u32(32, 20);
  u32(36, 44); // string at 44
  u32(40, 0);
  for (let i = 0; i < date.length; i++) tiff.setUint8(44 + i, date.charCodeAt(i));
  const body = new Uint8Array(tiff.buffer);
  const app1 = new Uint8Array(4 + 6 + body.length);
  app1.set([0xff, 0xe1, (app1.length - 2) >> 8, (app1.length - 2) & 0xff]);
  app1.set([0x45, 0x78, 0x69, 0x66, 0, 0], 4);
  app1.set(body, 10);
  return new Uint8Array([0xff, 0xd8, ...app1, 0xff, 0xda, 0, 2]);
}

describe("exifDate", () => {
  it("reads DateTimeOriginal (both byte orders) as the phone's local time", () => {
    for (const little of [true, false]) {
      const d = exifDate(jpegWithExif("2026:10:23 21:15:07", little));
      expect(d && [d.getFullYear(), d.getMonth() + 1, d.getDate(), d.getHours(), d.getMinutes()]).toEqual([2026, 10, 23, 21, 15]);
    }
  });

  it("returns null without EXIF or for garbage", () => {
    expect(exifDate(new Uint8Array([0xff, 0xd8, 0xff, 0xda, 0, 2]))).toBeNull();
    expect(exifDate(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBeNull(); // PNG
    expect(exifDate(jpegWithExif("0000:00:00 00:00:00"))).toBeNull();
    expect(exifDate(new Uint8Array(0))).toBeNull();
  });
});

describe("photoAgeLabel", () => {
  it("flags photos taken before the proof's day (São Paulo)", () => {
    expect(photoAgeLabel("2026-10-26T15:00:00Z", "2026-10-26")).toBeNull();
    expect(photoAgeLabel("2026-10-26T02:00:00Z", "2026-10-26")).toBe("Foto de ontem"); // 23:00 on the 25th in SP
    expect(photoAgeLabel("2026-10-23T15:00:00Z", "2026-10-26")).toBe("Foto de 3 dias atrás");
    expect(photoAgeLabel(null, "2026-10-26")).toBeNull();
  });
});
