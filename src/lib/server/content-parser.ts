/* Parsed content, as emitted by this module. */
export type ContentToken = {
  readonly text: string;
  // true | undefined for less wasteful JSON serialization
  readonly match?: true;
};

type Range = {
  // inclusive
  readonly start: number;
  // exclusive
  readonly end: number;
};

/**
 * Parses a `FileName` match into ContentTokens.
 *
 * `FileName` matches are much simpler to parse than `Content` matches, as they
 * contain only one line of text, so we have this separate function for them.
 */
export const parseFileNameMatch = (
  content: Buffer,
  matchRanges: ReadonlyArray<Range>,
): // Needs to be mutable to satisfy valita.
Array<ContentToken> => {
  const contentTokens: Array<ContentToken> = [];

  let base = 0;
  for (const { start: matchStart, end: matchEnd } of matchRanges) {
    if (matchStart > base) {
      contentTokens.push({
        text: content.toString("utf8", base, matchStart),
      });
    }
    contentTokens.push({
      text: content.toString("utf8", matchStart, matchEnd),
      match: true,
    });
    base = matchEnd;
  }
  if (base < content.length) {
    contentTokens.push({ text: content.toString("utf8", base) });
  }

  return contentTokens;
};

/**
 * Parses the given content into lines of ContentTokens, which will include
 * `match` tokens for the given ranges.
 */
export const parseChunkMatch = (
  content: Buffer,
  matchRanges: ReadonlyArray<Range>,
): // Needs to be mutable to satisfy valita.
Array<Array<ContentToken>> => {
  const lines: Array<Array<ContentToken>> = [];
  let currentLineTokens: Array<ContentToken> = [];

  const matchRangeIterator = matchRanges[Symbol.iterator]();
  // The range that we're currently in, or the next upcoming range, or undefined
  // if we've passed the last range.
  let currentMatchRange: Range | undefined = matchRangeIterator.next().value;
  // Have we previously handled the start of `currentMatchRange` but not its
  // end?
  let inMatch = false;

  const newlineIterator = newlines(content);
  // The next upcoming newline, if any.
  let currentNewline: number | undefined = newlineIterator.next().value;

  // How far into `content` we currently are.
  let tokenStart = 0;
  let tokenBoundary: TokenBoundary | undefined;
  while (
    (tokenBoundary = findNextBoundary(
      inMatch,
      currentMatchRange,
      currentNewline,
    ))
  ) {
    const { index: tokenEnd, match, newline } = tokenBoundary;

    if (match === "start") {
      inMatch = true;
      if (tokenEnd > tokenStart) {
        currentLineTokens.push({
          text: content.toString("utf8", tokenStart, tokenEnd),
        });
      }
      tokenStart = tokenEnd;
    } else if (match === "end") {
      inMatch = false;
      if (tokenEnd > tokenStart) {
        currentLineTokens.push({
          text: content.toString("utf8", tokenStart, tokenEnd),
          match: true,
        });
      }
      currentMatchRange = matchRangeIterator.next().value;
      tokenStart = tokenEnd;
    }

    if (newline) {
      // Key observation: we "split" on newlines, such that the \n char itself
      // is not in the resulting tokens' text. There's no need for it to be,
      // as lines are visually separated from one another in the UI with
      // `display: block`.
      if (tokenEnd > tokenStart) {
        currentLineTokens.push({
          text: content.toString("utf8", tokenStart, tokenEnd),
          ...(inMatch ? { match: true } : {}),
        });
      }
      lines.push(currentLineTokens);
      currentLineTokens = [];
      currentNewline = newlineIterator.next().value;
      tokenStart = tokenEnd + 1;
    }
  }

  if (tokenStart < content.length) {
    currentLineTokens.push({
      text: content.toString("utf8", tokenStart),
      ...(inMatch ? { match: true } : {}),
    });
  }

  // Conclude the current line. Note that if `currentLineTokens` is length 0,
  // that is still semantically a line, namely an empty line. `Content` never
  // naturally has a trailing newline; if there's a newline at the last byte,
  // this indicates that there is a final line that is empty.
  lines.push(currentLineTokens);

  return lines;
};

const newlines = (content: Buffer): Iterator<number, undefined, undefined> => {
  let currentIndex = -1;
  let done = false;
  return {
    next: () => {
      if (done) {
        return { done: true };
      }
      currentIndex = content.indexOf(0xa, currentIndex + 1);
      done = currentIndex === -1;
      if (done) {
        return { done: true };
      } else {
        return { done: false, value: currentIndex };
      }
    },
  };
};

// Describes an index in content at which the current token must end, and a new
// one with different properties begin.
type TokenBoundary = {
  index: number;
  newline?: boolean;
  match?: "start" | "end";
};

// Finds the next boundary, if any.
const findNextBoundary = (
  inMatch: boolean,
  currentMatchRange: Range | undefined,
  currentNewline: number | undefined,
): TokenBoundary | undefined => {
  const candidates: Array<TokenBoundary> = [];
  if (currentNewline !== undefined) {
    candidates.push({ index: currentNewline, newline: true });
  }

  if (!inMatch && currentMatchRange) {
    candidates.push({ index: currentMatchRange.start, match: "start" });
  } else if (inMatch && currentMatchRange) {
    candidates.push({ index: currentMatchRange.end, match: "end" });
  }

  return candidates.reduce<TokenBoundary | undefined>((acc, val) => {
    if (acc === undefined) {
      return val;
    } else if (acc.index < val.index) {
      return acc;
    } else if (acc.index > val.index) {
      return val;
    } else {
      // match boundary and newline at the same index; merge
      return { ...acc, ...val };
    }
  }, undefined);
};
