import { describe, expect, it } from "bun:test";
import { ALLOWED_EXTENSIONS, checkUpload, extensionOf, validateUpload } from "./file-validation";

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (text: string) => new TextEncoder().encode(text);

const PDF = ascii("%PDF-1.7\n%âãÏÓ");
const ZIP = bytes(0x50, 0x4b, 0x03, 0x04, 0x14, 0x00);
const OLE2 = bytes(0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00);
const EXE = bytes(0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00); // "MZ": Windows executable
const ELF = bytes(0x7f, 0x45, 0x4c, 0x46, 0x02, 0x01);
const HTML = ascii("<!doctype html><script>alert(1)</script>");

const check = (name: string, head: Uint8Array, size = head.length || 1) => validateUpload(name, head, size);

describe("validateUpload: accepts genuine files", () => {
  it.each([
    ["exam.pdf", PDF, "pdf", "application/pdf"],
    ["notes.doc", OLE2, "doc", "application/msword"],
    ["notes.docx", ZIP, "docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    ["slides.ppt", OLE2, "ppt", "application/vnd.ms-powerpoint"],
    ["slides.pptx", ZIP, "pptx", "application/vnd.openxmlformats-officedocument.presentationml.presentation"],
    ["scan.jpg", JPEG, "jpg", "image/jpeg"],
    ["scan.jpeg", JPEG, "jpeg", "image/jpeg"],
    ["scan.png", PNG, "png", "image/png"],
  ])("%s", (name, head, extension, mime) => {
    expect(check(name, head)).toEqual({ ok: true, extension, mime });
  });

  it("accepts plain text, including Thai", () => {
    expect(check("note.txt", ascii("hello"))).toMatchObject({ ok: true, extension: "txt" });
    expect(check("note.txt", ascii("สรุปวิชา Signals และ Systems"))).toMatchObject({ ok: true });
  });

  it("accepts a text window that ends in the middle of a Thai character", () => {
    const thai = ascii("ก".repeat(10));
    expect(check("note.txt", thai.subarray(0, thai.length - 1))).toMatchObject({ ok: true });
  });

  it("matches the extension case-insensitively", () => {
    expect(check("EXAM.PDF", PDF)).toMatchObject({ ok: true, extension: "pdf" });
    expect(check("Scan.JpG", JPEG)).toMatchObject({ ok: true, extension: "jpg" });
  });

  it("uses only the last extension", () => {
    expect(check("midterm.final.pdf", PDF)).toMatchObject({ ok: true, extension: "pdf" });
  });
});

describe("validateUpload: rejects", () => {
  it("a renamed .exe, whatever extension it hides behind", () => {
    for (const name of ["virus.pdf", "virus.docx", "virus.png", "virus.jpg", "virus.txt", "virus.doc"]) {
      expect(check(name, EXE)).toEqual({ ok: false, message: "File content does not match its extension" });
    }
  });

  it("binaries renamed to .txt, because they contain control bytes", () => {
    expect(check("tool.txt", ELF)).toMatchObject({ ok: false }); // starts with DEL, has no NUL
    expect(check("tool.txt", bytes(...ELF, 0x00, 0x00, 0x00))).toMatchObject({ ok: false });
    expect(check("tool.txt", bytes(...EXE, 0x00, 0x00))).toMatchObject({ ok: false });
    expect(check("log.txt", ascii("\u001b[31mred\u001b[0m"))).toMatchObject({ ok: false }); // ANSI escape
  });

  it("still allows tabs, newlines and carriage returns in text", () => {
    expect(check("a.txt", ascii("col1\tcol2\r\nline2\n"))).toMatchObject({ ok: true });
  });

  it("an .exe, .html, .js, .svg or .zip by extension", () => {
    for (const name of ["a.exe", "a.html", "a.js", "a.svg", "a.zip", "a.sh", "a.php", "a.bat"]) {
      const result = check(name, PDF);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.message).toContain("File type not allowed");
    }
  });

  it("HTML renamed to an image", () => {
    expect(check("x.png", HTML)).toMatchObject({ ok: false });
    expect(check("x.jpg", HTML)).toMatchObject({ ok: false });
  });

  it("a file whose content is a different allowed type", () => {
    expect(check("a.png", PDF)).toMatchObject({ ok: false });
    expect(check("a.pdf", PNG)).toMatchObject({ ok: false });
    expect(check("a.docx", OLE2)).toMatchObject({ ok: false }); // legacy format hiding as docx
    expect(check("a.doc", ZIP)).toMatchObject({ ok: false });
  });

  it("a double extension that ends in a forbidden one", () => {
    expect(check("exam.pdf.exe", EXE)).toMatchObject({ ok: false });
    expect(check("exam.pdf.html", HTML)).toMatchObject({ ok: false });
  });

  it("a file with no extension or only a trailing dot", () => {
    expect(check("README", PDF)).toMatchObject({ ok: false });
    expect(check("exam.", PDF)).toMatchObject({ ok: false });
    expect(check(".pdf", PDF)).toMatchObject({ ok: true }); // extension is pdf; bytes are a real PDF
  });

  it("an empty file", () => {
    expect(validateUpload("a.pdf", new Uint8Array(), 0)).toEqual({ ok: false, message: "File is empty" });
  });

  it("a file shorter than its signature", () => {
    expect(check("a.png", bytes(0x89, 0x50))).toMatchObject({ ok: false });
  });

  it("text that is not valid UTF-8", () => {
    expect(check("a.txt", bytes(0xff, 0xfe, 0x41, 0x42))).toMatchObject({ ok: false });
  });
});

describe("extensionOf / ALLOWED_EXTENSIONS", () => {
  it("extracts and lowercases the last extension", () => {
    expect(extensionOf("a.B.PDF")).toBe("pdf");
    expect(extensionOf("noext")).toBe("");
  });

  it("is exactly the list the plan allows", () => {
    expect([...ALLOWED_EXTENSIONS].sort()).toEqual(["doc", "docx", "jpeg", "jpg", "png", "ppt", "pptx", "txt", "pdf"].sort());
  });
});

describe("checkUpload", () => {
  it("sets the content type from the validated type, ignoring what the client claimed", async () => {
    const file = new File([PNG], "scan.png", { type: "text/html" });
    const result = await checkUpload(file);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.file.type).toBe("image/png");
      expect(result.file.name).toBe("scan.png");
      expect(result.file.size).toBe(PNG.length);
    }
  });

  it("rejects a renamed .exe sent as a File", async () => {
    const result = await checkUpload(new File([EXE], "exam.pdf", { type: "application/pdf" }));
    expect(result).toEqual({ ok: false, message: "File content does not match its extension" });
  });

  it("rejects an empty file, even when the runtime gives a nameless Blob", async () => {
    expect(await checkUpload(new File([], "empty.pdf"))).toEqual({ ok: false, message: "File is empty" });
    expect(await checkUpload(new Blob([]) as unknown as File)).toEqual({ ok: false, message: "File is empty" });
  });

  it("does not crash on a non-empty Blob with no name", async () => {
    const result = await checkUpload(new Blob([PDF]) as unknown as File);
    expect(result).toMatchObject({ ok: false });
  });

  it("only reads the start of a large file", async () => {
    const big = new File([PDF, new Uint8Array(5 * 1024 * 1024)], "big.pdf");
    expect((await checkUpload(big)).ok).toBe(true);
  });
});
