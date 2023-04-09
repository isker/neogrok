import type { MatchRange } from "./search-api";

// We don't pass `fatal: true` to this ctor to do things like handle binary or
// non-utf8 text encodings as the zoekt indexer explicitly skips indexing binary
// content, and text encodings other than utf-8 are explicitly not supported.
const utf8Decoder = new TextDecoder();

export type ContentToken =
  // Parts of the content not matching the query, i.e. context to the matches.
  | { kind: "context"; text: string; startByteOffset: number }
  // Parts of the content matching a query.
  | { kind: "match"; text: string; startByteOffset: number };

/**
 * Parses the given Base64-encoded content into lines suitable for rendering
 * line-by-line, with the parts of each line matching the query, described by
 * the given ranges, distinguished from the rest of the line.
 *
 * @param baseByteOffset - The byte index of the entire file contents at which
 * `contentBase64` begins.
 * @param ranges - The ranges of the content which match the query, described by
 * byte offsets into the entire file content.
 */
export const parseIntoLines = (
  contentBase64: string,
  baseByteOffset: number,
  ranges: ReadonlyArray<MatchRange>
): ContentToken[][] => {
  const contentBytes = base64StringToBytes(contentBase64);

  const lines = [];
  let currentLineTokens: Array<ContentToken> = [];

  const rangeIterator = ranges[Symbol.iterator]();
  // The range that we're currently in, or the next upcoming range, or undefined
  // if we've passed the last range.
  let currentRange: MatchRange | undefined = rangeIterator.next().value;

  let currentTokenStart = 0;
  for (let i = 0; i < contentBytes.length; i++) {
    const byte = contentBytes[i];
    const currentByteOffset = i + baseByteOffset;

    // Handle interactions with ranges at this byte, if any.
    if (
      currentRange &&
      currentByteOffset === currentRange.start.byteOffset &&
      i !== currentTokenStart
    ) {
      // If we've reached the start of a range and there is preceding context,
      // create a token for it.
      currentLineTokens.push({
        kind: "context",
        text: utf8Decoder.decode(contentBytes.subarray(currentTokenStart, i)),
        startByteOffset: currentTokenStart,
      });
      currentTokenStart = i;
    } else if (
      currentRange &&
      currentByteOffset === currentRange.end.byteOffset
    ) {
      // If we've reached the end of a range, create a token for it.
      currentLineTokens.push({
        kind: "match",
        text: utf8Decoder.decode(contentBytes.subarray(currentTokenStart, i)),
        startByteOffset: currentTokenStart,
      });

      currentTokenStart = i;
      currentRange = rangeIterator.next().value;
    }

    // Handle interactions with line endings at this byte, if any.
    if (byte === 0xa) {
      // LF. Conclude any ongoing token and the entire line's tokens. We don't
      // need to exclude newlines from tokens as they are just trailing
      // whitespace that HTML will ignore. For that reason, we don't need to
      // handle CR before LF as it's just more whitespace.

      if (currentRange && currentByteOffset >= currentRange.start.byteOffset) {
        // Ranges can span multiple lines. We need to break this ongoing range
        // into one range for each line it spans.
        currentLineTokens.push({
          kind: "match",
          text: utf8Decoder.decode(
            contentBytes.subarray(currentTokenStart, i + 1)
          ),
          startByteOffset: currentTokenStart,
        });
        currentRange = {
          ...currentRange,
          start: {
            byteOffset: currentByteOffset + 1,
            lineNumber: currentRange.start.lineNumber + 1,
            column: 1,
          },
        };
      } else {
        currentLineTokens.push({
          kind: "context",
          text: utf8Decoder.decode(
            contentBytes.subarray(currentTokenStart, i + 1)
          ),
          startByteOffset: currentTokenStart,
        });
      }

      currentTokenStart = i + 1;
      lines.push(currentLineTokens);
      currentLineTokens = [];
    }
  }

  // Conclude the current token, if any.
  if (currentTokenStart < contentBytes.length) {
    currentLineTokens.push({
      kind: currentRange ? "match" : "context",
      text: utf8Decoder.decode(
        contentBytes.subarray(currentTokenStart, contentBytes.length)
      ),
      startByteOffset: currentTokenStart,
    });
  }

  // Conclude the current line. Note that if `currentLineTokens` is length 0,
  // that is still semantically a line, namely an empty line. `Content` never
  // naturally has a trailing newline; if there's a newline at the last byte,
  // this indicates that there is a final line that is empty.
  lines.push(currentLineTokens);
  // TODO this incorrectly produces an extra line if the newline is the last
  // byte in the file. I don't think there's a way to properly distinguish such
  // a situation using the provided zoekt API response unless we ask it for the
  // contents of the entire file and compare `baseByteOffset +
  // contentBytes.length` to the byte length of the file.
  //
  // I think this is a fundamentally bad design in zoekt? Semantically, a line
  // always includes a newline as its final byte, but zoekt is effectively
  // excluding that final byte from ChunkMatches' `content`, leaving a file's
  // trailing newline as inherently unidentifiable.

  return lines;
};

const base64StringToBytes = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};
