/**
 * Client-Side PDF Text & Hyperlink Extractor
 * 
 * Extracts clean plain text and embedded URI annotations directly from PDF binary data
 * (ArrayBuffer or Uint8Array) inside the browser thread using native Web APIs without
 * sending any data to external servers.
 * 
 * Privacy Guarantee: 100% Client-Side. Zero network transmission.
 */

export class PDFParserService {
  /**
   * Extracts clean plain text and embedded hyperlinks from a PDF File or ArrayBuffer.
   */
  static async extractText(fileOrBuffer: File | ArrayBuffer | Uint8Array): Promise<string> {
    let bytes: Uint8Array;

    if (ArrayBuffer.isView(fileOrBuffer)) {
      bytes = new Uint8Array(fileOrBuffer.buffer, fileOrBuffer.byteOffset, fileOrBuffer.byteLength);
    } else if (fileOrBuffer instanceof ArrayBuffer) {
      bytes = new Uint8Array(fileOrBuffer);
    } else if (typeof (fileOrBuffer as any)?.arrayBuffer === 'function') {
      const buffer = await (fileOrBuffer as File).arrayBuffer();
      bytes = new Uint8Array(buffer);
    } else {
      bytes = new Uint8Array(fileOrBuffer as any);
    }

    const binaryString = this.uint8ArrayToString(bytes);

    // Verify PDF header
    if (!binaryString.includes('%PDF-')) {
      const textDecoder = new TextDecoder('utf-8', { fatal: false });
      return textDecoder.decode(bytes);
    }

    // 1. Extract embedded /URI hyperlinks from PDF annotations (e.g. LinkedIn, GitHub, Portfolio URLs)
    const extractedUrls = new Set<string>(this.extractPdfHyperlinks(binaryString));

    const textChunks: string[] = [];

    // 2. Extract and decompress all FlateDecode streams sequentially
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match: RegExpExecArray | null;
    let streamsFound = false;

    while ((match = streamRegex.exec(binaryString)) !== null) {
      const streamStart = match.index + match[0].indexOf('stream') + 6;
      let actualStart = streamStart;
      if (bytes[actualStart] === 0x0d) actualStart++;
      if (bytes[actualStart] === 0x0a) actualStart++;

      const streamEnd = match.index + match[0].lastIndexOf('endstream');
      let actualEnd = streamEnd;
      if (actualEnd > actualStart && (bytes[actualEnd - 1] === 0x0a || bytes[actualEnd - 1] === 0x0d)) actualEnd--;
      if (actualEnd > actualStart && (bytes[actualEnd - 1] === 0x0a || bytes[actualEnd - 1] === 0x0d)) actualEnd--;

      const streamSlice = bytes.subarray(actualStart, actualEnd);

      const precedingDict = binaryString.substring(Math.max(0, match.index - 500), match.index);
      const isFlate = precedingDict.includes('/FlateDecode') || precedingDict.includes('/Fl');

      if (isFlate) {
        try {
          const decompressed = await this.decompressFlate(streamSlice);
          if (decompressed) {
            // Scan decompressed streams (like /ObjStm) for embedded links and annotations
            const streamUrls = this.extractPdfHyperlinks(decompressed);
            for (const u of streamUrls) {
              extractedUrls.add(u);
            }

            const parsed = this.parseTextFromStream(decompressed);
            if (parsed.trim()) {
              textChunks.push(parsed);
              streamsFound = true;
            }
          }
        } catch {
          const rawDecompressed = this.uint8ArrayToString(streamSlice);
          const streamUrls = this.extractPdfHyperlinks(rawDecompressed);
          for (const u of streamUrls) {
            extractedUrls.add(u);
          }

          const rawParsed = this.parseTextFromStream(rawDecompressed);
          if (rawParsed.trim()) {
            textChunks.push(rawParsed);
            streamsFound = true;
          }
        }
      } else {
        const rawContent = this.uint8ArrayToString(streamSlice);
        const streamUrls = this.extractPdfHyperlinks(rawContent);
        for (const u of streamUrls) {
          extractedUrls.add(u);
        }

        const rawParsed = this.parseTextFromStream(rawContent);
        if (rawParsed.trim()) {
          textChunks.push(rawParsed);
          streamsFound = true;
        }
      }
    }

    // 3. Fallback to doc-level search only if streams produced no valid text
    if (!streamsFound) {
      const docLevelParsed = this.parseTextFromStream(binaryString);
      if (docLevelParsed.trim()) {
        textChunks.push(docLevelParsed);
      }
    }

    // Append extracted hyperlinks so resume parser knows about hidden PDF links
    if (extractedUrls.size > 0) {
      textChunks.push('\n[EMBEDDED_LINKS]\n' + Array.from(extractedUrls).join('\n'));
    }

    const combined = textChunks.join('\n');
    return this.cleanExtractedText(combined);
  }

  /**
   * Scans PDF dictionary annotations and stream content for /URI hyperlinks and professional URLs.
   */
  private static extractPdfHyperlinks(binary: string): string[] {
    const urls = new Set<string>();
    const uriRegex = /\/URI\s*(?:\(([^)]+)\)|<([0-9a-fA-F]+)>)/g;
    let match: RegExpExecArray | null;

    while ((match = uriRegex.exec(binary)) !== null) {
      let rawUrl = '';
      if (match[1]) {
        rawUrl = this.decodePdfString(`(${match[1]})`);
      } else if (match[2]) {
        rawUrl = this.decodePdfString(`<${match[2]}>`);
      }
      if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('mailto:')) {
        const clean = rawUrl.replace(/^mailto:/, '').replace(/[)>"';]+$/, '').trim();
        if (clean && !clean.includes('ams.org') && !clean.includes('scripts.sil.org')) {
          urls.add(clean);
        }
      }
    }

    // Also scan for direct URLs (e.g., in /ObjStm or decompressed streams)
    const directRegex = /https?:\/\/[^\s<>()"']+/g;
    while ((match = directRegex.exec(binary)) !== null) {
      const clean = match[0].replace(/[)>"';]+$/, '').trim();
      if (
        clean.includes('linkedin.com') ||
        clean.includes('github.com') ||
        clean.includes('leetcode.com') ||
        clean.includes('vercel.app') ||
        clean.includes('streamlit.app') ||
        clean.includes('render.com') ||
        clean.includes('onrender.com') ||
        /\.(?:dev|me|io)\b/.test(clean)
      ) {
        urls.add(clean);
      }
    }

    return Array.from(urls);
  }

  /**
   * Decompresses a FlateDecode (zlib/deflate) byte array using the browser's native DecompressionStream.
   */
  private static async decompressFlate(bytes: Uint8Array): Promise<string | null> {
    if (typeof DecompressionStream === 'undefined') {
      return null;
    }

    try {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      });

      const decompressed = stream.pipeThrough(new DecompressionStream('deflate'));
      const reader = decompressed.getReader();
      const chunks: Uint8Array[] = [];
      let totalLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          chunks.push(value);
          totalLength += value.length;
        }
      }

      const merged = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of chunks) {
        merged.set(chunk, offset);
        offset += chunk.length;
      }

      const decoder = new TextDecoder('latin1');
      return decoder.decode(merged);
    } catch {
      // Try deflate-raw by stripping 2-byte zlib header if present
      try {
        const rawBytes = bytes.length > 2 && bytes[0] === 0x78 ? bytes.subarray(2, bytes.length - 4) : bytes;
        const rawStream = new ReadableStream({
          start(controller) {
            controller.enqueue(rawBytes);
            controller.close();
          },
        });
        const decompressed = rawStream.pipeThrough(new DecompressionStream('deflate-raw'));
        const reader = decompressed.getReader();
        const chunks: Uint8Array[] = [];
        let totalLength = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            totalLength += value.length;
          }
        }

        const merged = new Uint8Array(totalLength);
        let offset = 0;
        for (const chunk of chunks) {
          merged.set(chunk, offset);
          offset += chunk.length;
        }

        const decoder = new TextDecoder('latin1');
        return decoder.decode(merged);
      } catch {
        return null;
      }
    }
  }

  /**
   * Parses PDF text operators (BT ... ET, Tj, TJ, T*, Td) from a decoded stream sequentially.
   */
  private static parseTextFromStream(content: string): string {
    const lines: string[] = [];

    // Match text blocks: BT ... ET
    const btRegex = /BT([\s\S]*?)ET/g;
    let btMatch: RegExpExecArray | null;

    while ((btMatch = btRegex.exec(content)) !== null) {
      const block = btMatch[1];
      const extractedBlockText = this.parseOperatorsSequential(block);
      if (extractedBlockText.trim()) {
        lines.push(extractedBlockText.trim());
      }
    }

    if (lines.length === 0) {
      const looseText = this.parseOperatorsSequential(content);
      if (looseText.trim()) lines.push(looseText.trim());
    }

    return lines.join('\n');
  }

  /**
   * Parses text operators in strict stream order, preserving line breaks and kerning spaces.
   */
  private static parseOperatorsSequential(block: string): string {
    const result: string[] = [];
    let currentLine = '';

    // Regex matching:
    // 1. TJ arrays: \[([\s\S]*?)\]\s*TJ
    // 2. Tj / ' / " operators: (\((?:\\\(|\\\)|[^()])*\)|<[0-9a-fA-F]+>)\s*(Tj|'|")
    // 3. Newline: T\*
    // 4. Move text position: ([-0-9.]+)\s+([-0-9.]+)\s+(T[dD])
    const operatorRegex = /\[([\s\S]*?)\]\s*TJ|(\((?:\\\(|\\\)|[^()])*\)|<[0-9a-fA-F]+>)\s*(Tj|'|")|T\*|([-0-9.]+)\s+([-0-9.]+)\s+(T[dD])/g;
    let match: RegExpExecArray | null;

    while ((match = operatorRegex.exec(block)) !== null) {
      if (match[1] !== undefined) {
        // TJ Array: [ (str) -250 (str2) ]
        const arrayContent = match[1];
        const tokenRegex = /\((?:\\\(|\\\)|[^()])*\)|<[0-9a-fA-F]+>|[-0-9.]+/g;
        let tokenMatch: RegExpExecArray | null;
        let lastWasSpace = false;

        while ((tokenMatch = tokenRegex.exec(arrayContent)) !== null) {
          const item = tokenMatch[0];
          if (item.startsWith('(') || item.startsWith('<')) {
            const text = this.decodePdfString(item);
            currentLine += text;
            lastWasSpace = text.endsWith(' ');
          } else {
            const num = parseFloat(item);
            // In PDF font coordinates, a negative displacement < -70 corresponds to a word space
            if (!isNaN(num) && num < -70 && !lastWasSpace && currentLine.length > 0 && !currentLine.endsWith(' ')) {
              currentLine += ' ';
              lastWasSpace = true;
            }
          }
        }
      } else if (match[2] !== undefined) {
        // Single Tj, ', "
        const op = match[3];
        if (op === "'" || op === '"') {
          if (currentLine.trim()) result.push(currentLine.trim());
          currentLine = '';
        }
        currentLine += this.decodePdfString(match[2]);
      } else if (match[0] === 'T*') {
        if (currentLine.trim()) result.push(currentLine.trim());
        currentLine = '';
      } else if (match[6] !== undefined) {
        // Td or TD (vertical offset)
        const ty = parseFloat(match[5]);
        if (Math.abs(ty) > 1) {
          if (currentLine.trim()) result.push(currentLine.trim());
          currentLine = '';
        } else if (Math.abs(parseFloat(match[4])) > 10 && !currentLine.endsWith(' ')) {
          currentLine += ' ';
        }
      }
    }

    if (currentLine.trim()) {
      result.push(currentLine.trim());
    }

    return result.join('\n');
  }

  private static decodePdfString(raw: string): string {
    if (!raw) return '';

    // Hex string: <48656c6c6f>
    if (raw.startsWith('<') && raw.endsWith('>')) {
      const hex = raw.slice(1, -1).trim();
      let res = '';
      for (let i = 0; i < hex.length; i += 2) {
        const code = parseInt(hex.substr(i, 2), 16);
        if (!isNaN(code) && code > 0) res += String.fromCharCode(code);
      }
      return res;
    }

    // Literal string: (Hello World)
    if (raw.startsWith('(') && raw.endsWith(')')) {
      let str = raw.slice(1, -1);
      str = str
        .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\b/g, '\b')
        .replace(/\\f/g, '\f')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\');
      return str;
    }

    return raw;
  }

  private static cleanExtractedText(text: string): string {
    return text
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]+/g, ' ')
      .replace(/\s+[j|]\s+/g, ' | ')
      .replace(/\{\s*(\d{4}|[A-Za-z]+)/g, '- $1')
      .replace(/work\s*ows\b/gi, 'workflows')
      .replace(/con\s*icts\b/gi, 'conflicts')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private static uint8ArrayToString(bytes: Uint8Array): string {
    let str = '';
    const chunk = 8192;
    for (let i = 0; i < bytes.length; i += chunk) {
      str += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
    }
    return str;
  }
}
