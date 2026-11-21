/**
 * Client-Side PDF Text Extractor
 * 
 * Extracts human-readable text directly from PDF binary data (ArrayBuffer or Uint8Array)
 * inside the browser thread using native Web APIs without sending data to any external server.
 * 
 * Privacy Guarantee: 100% Client-Side. Zero network transmission.
 */

export class PDFParserService {
  /**
   * Extracts clean plain text from a PDF File or ArrayBuffer.
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
      // If it's a plain text or markdown resume, return directly
      const textDecoder = new TextDecoder('utf-8', { fatal: false });
      return textDecoder.decode(bytes);
    }

    const textChunks: string[] = [];

    // 1. Extract and decompress all FlateDecode streams
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match: RegExpExecArray | null;

    // Index of streams to locate dictionary metadata (/Filter /FlateDecode)
    while ((match = streamRegex.exec(binaryString)) !== null) {
      const streamStart = match.index + match[0].indexOf('stream') + 6;
      // Skip carriage return/newline after 'stream'
      let actualStart = streamStart;
      if (bytes[actualStart] === 0x0d) actualStart++;
      if (bytes[actualStart] === 0x0a) actualStart++;

      const streamEnd = match.index + match[0].lastIndexOf('endstream');
      // Trim preceding newline before 'endstream'
      let actualEnd = streamEnd;
      if (actualEnd > actualStart && (bytes[actualEnd - 1] === 0x0a || bytes[actualEnd - 1] === 0x0d)) actualEnd--;
      if (actualEnd > actualStart && (bytes[actualEnd - 1] === 0x0a || bytes[actualEnd - 1] === 0x0d)) actualEnd--;

      const streamSlice = bytes.subarray(actualStart, actualEnd);

      // Check dictionary preceding this stream for /FlateDecode
      const precedingDict = binaryString.substring(Math.max(0, match.index - 500), match.index);
      const isFlate = precedingDict.includes('/FlateDecode') || precedingDict.includes('/Fl');

      if (isFlate) {
        try {
          const decompressed = await this.decompressFlate(streamSlice);
          if (decompressed) {
            const parsed = this.parseTextFromStream(decompressed);
            if (parsed.trim()) textChunks.push(parsed);
          }
        } catch {
          // If decompression fails, try parsing raw slice
          const rawParsed = this.parseTextFromStream(this.uint8ArrayToString(streamSlice));
          if (rawParsed.trim()) textChunks.push(rawParsed);
        }
      } else {
        const rawParsed = this.parseTextFromStream(this.uint8ArrayToString(streamSlice));
        if (rawParsed.trim()) textChunks.push(rawParsed);
      }
    }

    // 2. Also inspect raw uncompressed text blocks in the entire document
    const docLevelParsed = this.parseTextFromStream(binaryString);
    if (docLevelParsed.trim()) {
      textChunks.push(docLevelParsed);
    }

    const combined = textChunks.join('\n');
    return this.cleanExtractedText(combined);
  }

  /**
   * Decompresses a FlateDecode (zlib/deflate) byte array using the browser's native DecompressionStream.
   */
  private static async decompressFlate(bytes: Uint8Array): Promise<string | null> {
    if (typeof DecompressionStream === 'undefined') {
      return null;
    }

    // PDF FlateDecode is RFC 1950 (zlib wrapper).
    // Native DecompressionStream('deflate') expects zlib header.
    // DecompressionStream('deflate-raw') expects raw deflate.
    try {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(bytes);
          controller.close();
        },
      });

      const decompressedStream = stream.pipeThrough(new DecompressionStream('deflate'));
      const reader = decompressedStream.getReader();
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
        const rawBytes = bytes.length > 2 && (bytes[0] === 0x78) ? bytes.subarray(2, bytes.length - 4) : bytes;
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
   * Parses PDF text operators (BT ... ET, Tj, TJ, etc.) from a decoded stream.
   */
  private static parseTextFromStream(content: string): string {
    const lines: string[] = [];

    // Match text blocks: BT ... ET
    const btRegex = /BT([\s\S]*?)ET/g;
    let btMatch: RegExpExecArray | null;

    while ((btMatch = btRegex.exec(content)) !== null) {
      const block = btMatch[1];
      const extractedBlockText = this.parseOperators(block);
      if (extractedBlockText.trim()) {
        lines.push(extractedBlockText.trim());
      }
    }

    // If no BT...ET blocks were found, attempt loose operator search
    if (lines.length === 0) {
      const looseText = this.parseOperators(content);
      if (looseText.trim()) lines.push(looseText.trim());
    }

    return lines.join('\n');
  }

  private static parseOperators(block: string): string {
    const tokens: string[] = [];

    // 1. Matches Array of text tokens: [ (text) -10 (more text) ] TJ
    const tjArrayRegex = /\[([\s\S]*?)\]\s*TJ/g;
    let match: RegExpExecArray | null;

    while ((match = tjArrayRegex.exec(block)) !== null) {
      const arrayContent = match[1];
      // Match (strings) or <hex strings>
      const stringMatches = arrayContent.match(/\((?:\\\(|\\\)|[^()])*\)|<[0-9a-fA-F]+>/g);
      if (stringMatches) {
        const line = stringMatches
          .map((s) => this.decodePdfString(s))
          .join('')
          .trim();
        if (line) tokens.push(line);
      }
    }

    // 2. Matches single string operators: (text) Tj or ' or "
    const tjSingleRegex = /(\((?:\\\(|\\\)|[^()])*\)|<[0-9a-fA-F]+>)\s*(?:Tj|'|")/g;
    while ((match = tjSingleRegex.exec(block)) !== null) {
      const decoded = this.decodePdfString(match[1]);
      if (decoded.trim()) tokens.push(decoded.trim());
    }

    return tokens.join(' ');
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
