// Server-side check for uploaded files. The browser's `accept=` is only a hint: a script can
// send anything. A file is accepted only when its extension is on the allow-list AND its first
// bytes match what that extension should start with, so a renamed .exe is rejected.

type Rule = { mime: string; signatures: number[][] } | { mime: string; text: true };

const ZIP = [0x50, 0x4b, 0x03, 0x04]; // "PK\x03\x04": docx and pptx are ZIP containers
const OLE2 = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]; // legacy .doc / .ppt

const RULES: Record<string, Rule> = {
  pdf: { mime: "application/pdf", signatures: [[0x25, 0x50, 0x44, 0x46]] }, // "%PDF"
  doc: { mime: "application/msword", signatures: [OLE2] },
  docx: {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    signatures: [ZIP],
  },
  ppt: { mime: "application/vnd.ms-powerpoint", signatures: [OLE2] },
  pptx: {
    mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    signatures: [ZIP],
  },
  jpg: { mime: "image/jpeg", signatures: [[0xff, 0xd8, 0xff]] },
  jpeg: { mime: "image/jpeg", signatures: [[0xff, 0xd8, 0xff]] },
  png: { mime: "image/png", signatures: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]] },
  txt: { mime: "text/plain; charset=utf-8", text: true },
};

export const ALLOWED_EXTENSIONS = Object.keys(RULES);

// Enough bytes for every signature above and for the text check.
export const SNIFF_BYTES = 8192;

export type UploadCheck = { ok: true; extension: string; mime: string } | { ok: false; message: string };

export function extensionOf(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot + 1).trim().toLowerCase();
}

function startsWith(bytes: Uint8Array, signature: number[]): boolean {
  return bytes.length >= signature.length && signature.every((b, i) => bytes[i] === b);
}

// A plain-text file has no signature, so require "no control bytes" (binaries and executables
// contain NUL and other control bytes; the ELF magic starts with DEL) and valid UTF-8 (Thai text
// is UTF-8). Tab, line feed, vertical tab, form feed and carriage return are allowed.
function looksLikeText(bytes: Uint8Array): boolean {
  for (const b of bytes) {
    if (b < 9 || (b > 13 && b < 32) || b === 127) return false;
  }
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return true;
  } catch {
    // The sniffed window may end in the middle of a multi-byte character; allow that case.
    for (let cut = 1; cut <= 3 && cut < bytes.length; cut++) {
      try {
        new TextDecoder("utf-8", { fatal: true }).decode(bytes.subarray(0, bytes.length - cut));
        return true;
      } catch {
        // keep trimming
      }
    }
    return false;
  }
}

export function validateUpload(fileName: string, head: Uint8Array, size: number): UploadCheck {
  const extension = extensionOf(fileName);
  const rule = RULES[extension];

  if (!rule) {
    return {
      ok: false,
      message: `File type not allowed. Allowed types: ${ALLOWED_EXTENSIONS.join(", ")}`,
    };
  }
  if (size === 0) return { ok: false, message: "File is empty" };

  const matches = "text" in rule ? looksLikeText(head) : rule.signatures.some((sig) => startsWith(head, sig));
  if (!matches) return { ok: false, message: "File content does not match its extension" };

  return { ok: true, extension, mime: rule.mime };
}

// Reads just the start of the file, checks it, and on success returns a File whose type is the
// validated one. The browser-supplied `file.type` is never trusted, because Supabase storage
// serves the object with whatever content type it was uploaded with.
export async function checkUpload(
  file: File
): Promise<{ ok: true; file: File } | { ok: false; message: string }> {
  // Some runtimes hand back a nameless Blob for an empty file part, so don't assume `name` exists.
  const name = typeof file.name === "string" ? file.name : "";
  if (file.size === 0) return { ok: false, message: "File is empty" };

  const head = new Uint8Array(await file.slice(0, SNIFF_BYTES).arrayBuffer());
  const result = validateUpload(name, head, file.size);
  if (!result.ok) return result;

  return { ok: true, file: new File([file], name, { type: result.mime }) };
}
