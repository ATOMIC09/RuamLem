export type SseFrame = { event: string; data: string };

// Incremental Server-Sent Events parser. Network chunks can split a frame anywhere
// (even between the "\r" and "\n" of a line break), so feed() keeps the unfinished
// tail and only returns frames that are complete.
export function createSseParser() {
  let buffer = "";

  return {
    feed(chunk: string): SseFrame[] {
      buffer += chunk;

      // A trailing "\r" may be the first half of "\r\n"; hold it until the next chunk.
      const held = buffer.endsWith("\r") ? "\r" : "";
      const normalized = buffer.slice(0, buffer.length - held.length).replace(/\r\n?/g, "\n");

      const parts = normalized.split("\n\n");
      buffer = (parts.pop() ?? "") + held;

      const frames: SseFrame[] = [];
      for (const part of parts) {
        const frame = parseFrame(part);
        if (frame) frames.push(frame);
      }
      return frames;
    },
  };
}

function parseFrame(text: string): SseFrame | null {
  let event = "message";
  const data: string[] = [];

  for (const line of text.split("\n")) {
    if (!line || line.startsWith(":")) continue; // blank line or comment
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? "" : line.slice(colon + 1);
    if (value.startsWith(" ")) value = value.slice(1);

    if (field === "event") event = value;
    else if (field === "data") data.push(value);
  }

  return data.length > 0 ? { event, data: data.join("\n") } : null;
}
