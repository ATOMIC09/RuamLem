// Streaming filter that keeps only [n] citations that point at a source we actually sent.
// Invalid ones such as [7] are dropped before they reach the client. A "[" or "[1" at the end
// of a chunk is held back until the next chunk shows whether it becomes a citation.
export class CitationFilter {
  private pending = "";

  constructor(private readonly sourceCount: number) {}

  push(text: string): string {
    const input = this.pending + text;
    this.pending = "";

    let out = "";
    let i = 0;

    while (i < input.length) {
      const open = input.indexOf("[", i);
      if (open === -1) {
        out += input.slice(i);
        break;
      }

      out += input.slice(i, open);
      const rest = input.slice(open);
      const full = /^\[(\d+)\]/.exec(rest);

      if (full) {
        const n = Number(full[1]);
        if (n >= 1 && n <= this.sourceCount) out += full[0];
        i = open + full[0].length;
      } else if (/^\[\d*$/.test(rest)) {
        this.pending = rest;
        break;
      } else {
        out += "[";
        i = open + 1;
      }
    }

    return out;
  }

  // Call once the stream ends. Whatever is held back was never a complete citation.
  flush(): string {
    const rest = this.pending;
    this.pending = "";
    return rest;
  }
}
