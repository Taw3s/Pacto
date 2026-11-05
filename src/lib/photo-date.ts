// When a proof photo was taken, as the phone reports it. Only a hint for the group: the phone can
// lie, so it never blocks anything (see 0009_photo_date_reactions.sql).
import { spToday, type ISODate } from "./dates";

/** EXIF DateTimeOriginal of a JPEG ("YYYY:MM:DD HH:MM:SS", the phone's local time), or null. */
export function exifDate(bytes: Uint8Array): Date | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.length < 4 || view.getUint16(0) !== 0xffd8) return null;
  let p = 2;
  while (p + 4 <= bytes.length && bytes[p] === 0xff) {
    const marker = bytes[p + 1];
    const len = view.getUint16(p + 2);
    // APP1 "Exif\0\0" followed by a TIFF header
    if (marker === 0xe1 && p + 10 <= bytes.length && String.fromCharCode(...bytes.subarray(p + 4, p + 8)) === "Exif") {
      return tiffDate(view, p + 10, len - 8);
    }
    if (marker === 0xda) break; // start of the image data: no EXIF before it
    p += 2 + len;
  }
  return null;
}

function tiffDate(view: DataView, start: number, size: number): Date | null {
  if (start + 8 > view.byteLength) return null;
  const little = view.getUint16(start) === 0x4949; // "II"
  const u16 = (o: number) => view.getUint16(start + o, little);
  const u32 = (o: number) => view.getUint32(start + o, little);
  const inside = (o: number, n: number) => o >= 0 && o + n <= size && start + o + n <= view.byteLength;
  /** Value offset of `tag` in the IFD at `ifd`, or -1. */
  const find = (ifd: number, tag: number) => {
    if (!inside(ifd, 2)) return -1;
    const count = u16(ifd);
    for (let i = 0; i < count; i++) {
      const e = ifd + 2 + i * 12;
      if (!inside(e, 12)) return -1;
      if (u16(e) === tag) return e;
    }
    return -1;
  };
  const ascii = (entry: number) => {
    const n = u32(entry + 4);
    const at = n > 4 ? u32(entry + 8) : entry + 8;
    if (!inside(at, Math.min(n, 19))) return null;
    let s = "";
    for (let i = 0; i < Math.min(n, 19); i++) s += String.fromCharCode(view.getUint8(start + at + i));
    return s;
  };
  const ifd0 = u32(4);
  const exifPtr = find(ifd0, 0x8769);
  const original = exifPtr >= 0 ? find(u32(exifPtr + 8), 0x9003) : -1;
  const entry = original >= 0 ? original : find(ifd0, 0x0132); // DateTimeOriginal, else DateTime
  const text = entry >= 0 ? ascii(entry) : null;
  const m = text?.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const d = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]);
  return Number.isNaN(d.getTime()) || +m[1] < 2000 ? null : d;
}

/**
 * When the photo was taken: EXIF when the file has it; otherwise the file's own date (screenshots
 * and gallery files keep it; a photo just taken has "now").
 */
export async function photoTakenAt(file: File): Promise<Date | null> {
  try {
    const head = new Uint8Array(await file.slice(0, 256 * 1024).arrayBuffer());
    return exifDate(head) ?? (file.lastModified ? new Date(file.lastModified) : null);
  } catch {
    return null;
  }
}

/** "Foto de ontem" / "Foto de 3 dias atrás" when the photo was taken before the proof's day. */
/** The file says it is from a day before the proof (EXIF date or, without one, the file's own date). */
export function photoIsOlder(takenAt: string | null | undefined, day: ISODate) {
  return !!takenAt && spToday(new Date(takenAt)) < day;
}

/** Whole days between the date the file reports and the proof's day (0 when not older). */
export function photoDaysBefore(takenAt: string | null | undefined, day: ISODate) {
  if (!photoIsOlder(takenAt, day)) return 0;
  return Math.round((Date.parse(day) - Date.parse(spToday(new Date(takenAt!)))) / 86_400_000);
}

export function photoAgeLabel(takenAt: string | null | undefined, day: ISODate): string | null {
  if (!takenAt) return null;
  const taken = spToday(new Date(takenAt));
  if (taken >= day) return null;
  const days = Math.round((Date.parse(day) - Date.parse(taken)) / 86_400_000);
  return days === 1 ? "Foto de ontem" : `Foto de ${days} dias atrás`;
}
