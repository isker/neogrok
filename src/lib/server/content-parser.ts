import * as v from "@badrap/valita";
import { all, createStarryNight } from "@wooorm/starry-night";

const starryNight = await createStarryNight(all);

/* Parsed content, as emitted by this module. */
export type ContentToken = {
  readonly text: string;
  readonly match?: true;
  readonly highlightClass?: HighlightClass;
};

// starry-night is ultimately trying to recreate GitHub's syntax highlighting
// class layout, which is pretty needlessly complicated for what it does, as
// GitHub's own syntax highlighting theme boils down many CSS selectors to just
// a few rules. See what I mean here:
// https://github.com/wooorm/starry-night/blob/main/style/light.css
//
// More context here:
// https://github.com/wooorm/starry-night/blob/1b85c76b54314efb1e8316eedd789078122e8929/lib/theme.js
//
// Since we're using tailwind on the frontend, we're going to have to rewrite
// those classes anyway, so might as well make it simple data instead of obscure
// class names. Here it is:
export type HighlightClass =
  | "bracket-angle"
  | "bracket-unmatched"
  | "carriage-return"
  | "comment"
  | "constant"
  | "constant-other-reference-link" // no idea what this is
  | "entity"
  | "entity-tag"
  | "gutter-mark"
  // We've got `invalid` disabled for now as it makes dangling C-style block
  // comments look bad when a ChunkMatch only contains part of one.
  // | "invalid"
  | "keyword"
  | "markup-bold"
  | "markup-changed-text"
  | "markup-deleted-text"
  | "markup-heading"
  | "markup-ignored-text"
  | "markup-inserted-text"
  | "markup-italic"
  | "markup-list"
  | "meta-diff-range"
  | "regexp"
  | "storage-modifier-import" // no idea what this is
  | "string"
  | "variable";

/**
 * Converts starry-night output classes to HighlightClass, if any exists; there
 * are a lot of extraneous classes that are not used in highlighting.
 */
const toHightlightClass = (
  classNames: ReadonlyArray<string>
): HighlightClass | undefined => {
  if (classNames.length === 0) {
    return undefined;
  } else if (classNames.length === 1) {
    switch (classNames[0]) {
      case "pl-c":
        return "comment";
      case "pl-c1":
        return "constant";
      case "pl-e":
      case "pl-en":
        return "entity";
      case "pl-smi":
        return "storage-modifier-import";
      case "pl-ent":
        return "entity-tag";
      case "pl-k":
        return "keyword";
      case "pl-s":
      case "pl-pds":
      case "pl-sr":
        return "string";
      case "pl-v":
      case "pl-smw":
        return "variable";
      case "pl-bu":
        return "bracket-unmatched";
      // case "pl-ii":
      //   return "invalid";
      case "pl-c2":
        return "carriage-return";
      case "pl-ml":
        return "markup-list";
      case "pl-mh":
      case "pl-ms":
        return "markup-heading";
      case "pl-mi":
        return "markup-italic";
      case "pl-mb":
        return "markup-bold";
      case "pl-md":
        return "markup-deleted-text";
      case "pl-mi1":
        return "markup-inserted-text";
      case "pl-mc":
        return "markup-changed-text";
      case "pl-mi2":
        return "markup-ignored-text";
      case "pl-mdr":
        return "meta-diff-range";
      case "pl-ba":
        return "bracket-angle";
      case "pl-sg":
        return "gutter-mark";
      case "pl-corl":
        return "constant-other-reference-link";
    }
  } else if (classNames.length === 2) {
    const [a, b] = classNames;
    if (a === "pl-s") {
      if (b === "pl-v") {
        return "constant";
      } else if (b === "pl-s1") {
        return "storage-modifier-import";
      }
    } else if (a === "pl-sr") {
      if (b === "pl-sre" || b === "pl-sra") {
        return "string";
      } else if (b === "pl-cce") {
        return "regexp";
      }
    } else if (a === "pl-mh" && b === "pl-en") {
      return "markup-heading";
    }
  } else if (classNames.length === 3) {
    const [a, b, c] = classNames;
    if (a === "pl-s" && b === "pl-pse" && c === "pl-s1") {
      return "string";
    }
  }

  // More classes than the above are emitted by starryNight, but they generate
  // no HighlightClass.
  return undefined;
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
 * are not subject to syntax highlighting and contain only one line of text, so
 * we have this separate function for them.
 */
export const parseFileNameMatch = (
  utf8Bytes: Buffer,
  byteRanges: ReadonlyArray<Range>
): // Needs to be mutable to satisfy valita.
Array<ContentToken> => {
  const contentTokens: Array<ContentToken> = [];

  let base = 0;
  for (const { start: matchStart, end: matchEnd } of byteRanges) {
    if (matchStart > base) {
      contentTokens.push({
        text: utf8Bytes.toString("utf8", base, matchStart),
      });
    }
    contentTokens.push({
      text: utf8Bytes.toString("utf8", matchStart, matchEnd),
      match: true,
    });
    base = matchEnd;
  }
  if (base < utf8Bytes.length) {
    contentTokens.push({ text: utf8Bytes.toString("utf8", base) });
  }

  return contentTokens;
};

/**
 * Zoekt gives us ChunkMatch Content as UTF-8 bytes, and MatchRanges within that
 * Content with byte indices.
 *
 * But we render text (in the form of JS strings, which are encoded in UTF-16,
 * effectively implemented with Uint16Arrays) to users, not bytes. Moreover, any
 * plausible syntax highlighting library (including the one we use!) operates on
 * text, not bytes.
 *
 * So, to handle these requirements, we need to convert the byte index ranges to
 * string index ranges. We can only do that by iterating the entire byte array
 * and examining its contents.
 *
 * While we're doing this iteration, we capture the string indices of any
 * newlines, as we'll need them later on.
 */
export const convertByteRanges = (
  utf8Bytes: Buffer,
  byteRanges: ReadonlyArray<Range>
): {
  stringRanges: ReadonlyArray<Range>;
  newlineIndices: ReadonlyArray<number>;
} => {
  const byteRangeIterator = byteRanges[Symbol.iterator]();
  // The range that we're currently in, or the next upcoming range, or undefined
  // if we've passed the last range.
  let currentByteRange: Range | undefined = byteRangeIterator.next().value;

  const stringRanges: Array<Range> = [];
  const newlineIndices: Array<number> = [];

  let stringRangeStart: number | undefined = undefined;
  for (let byteIndex = 0, stringIndex = 0; byteIndex < utf8Bytes.length; ) {
    // https://en.wikipedia.org/wiki/UTF-8#Encoding
    // https://en.wikipedia.org/wiki/UTF-16#Description
    //
    // Input is assumed to be valid utf-8. Each step of the iteration begins
    // at the start of a code point; we fast-forward over extra bytes below.
    // Match byte ranges point only at beginnings/ends of code points. So, we
    // only handle match ranges at each step of the iteration, as opposed to
    // at each byte.

    if (currentByteRange?.start === byteIndex) {
      stringRangeStart = stringIndex;
    }

    const byte = utf8Bytes[byteIndex];
    if (byte >>> 7 === 0b0) {
      // 1 UTF-8 byte, fits into one UTF-16 char
      if (byte === 0xa) {
        newlineIndices.push(stringIndex);
      }
      byteIndex += 1;
      stringIndex += 1;
    } else if (byte >>> 5 === 0b110) {
      // 2 UTF-8 bytes, fits into one UTF-16 char
      byteIndex += 2;
      stringIndex += 1;
    } else if (byte >>> 4 === 0b1110) {
      // 3 UTF-8 bytes, fits into one UTF-16 char
      byteIndex += 3;
      stringIndex += 1;
    } else if (byte >>> 3 === 0b11110) {
      // 4 UTF-8 bytes, fits into two UTF-16 chars
      byteIndex += 4;
      stringIndex += 2;
    } else {
      throw new Error(`unreachable: ${byte}`);
    }

    // We do this check after incrementing as the range end indices are
    // exclusive. If we did the check at the start of the loop, we'd have to
    // repeat it after the loop exited, in case the range ended at the last
    // byte/char in the content.
    if (currentByteRange?.end === byteIndex) {
      if (stringRangeStart === undefined) {
        throw new Error(`unreachable: ${byteIndex}`);
      }
      stringRanges.push({ start: stringRangeStart, end: stringIndex });
      stringRangeStart = undefined;
      currentByteRange = byteRangeIterator.next().value;
    }
  }

  return { stringRanges, newlineIndices };
};

/**
 * Child nodes returned by starry-night.
 *
 * We have a valita schema for these because starry-night's data conforms to
 * this thing called `hast`, which is a serialization format for arbitrary HTML
 * nodes. But starry-night practically only returns a small subset of `hast`,
 * and valita is the easiest way to parse it.
 */
type Children = Array<
  // It's either an unhighlighted text node, or a highlighted <element> node
  // with a className and children, recursively.
  | { type: "text"; value: string }
  | { type: "element"; properties: { className: [string] }; children: Children }
>;

// `lazy` allows valita schemas to refer to themselves, i.e. recursion.
const childrenSchema: v.Type<Children> = v.lazy(() =>
  v.array(
    v.union(
      v.object({
        type: v.literal("text"),
        value: v.string(),
      }),
      v.object({
        type: v.literal("element"),
        properties: v.object({ className: v.tuple([v.string()]) }),
        children: childrenSchema,
      })
    )
  )
);

/** Flatten a tree of child nodes into ContentTokens. */
const flatten = (
  children: Children,
  parentClasses: ReadonlyArray<string> = []
): ReadonlyArray<ContentToken> =>
  children.flatMap((c) => {
    if (c.type === "text") {
      return [
        { text: c.value, highlightClass: toHightlightClass(parentClasses) },
      ];
    } else {
      return flatten(c.children, [...parentClasses, c.properties.className[0]]);
    }
  });

/**
 * Converting starry-night classes to HighlightClass discards a lot of unneeded
 * class information, such that there are liable to me adjacent ContentTokens
 * without highlights. Collapse such sets of adjacent tokens into one.
 */
const joinAdjacentTextNodes = (
  tokens: ReadonlyArray<ContentToken>
): ReadonlyArray<ContentToken> => {
  return tokens.reduce<Array<ContentToken>>((acc, val) => {
    if (
      acc.length > 0 &&
      acc[acc.length - 1].highlightClass === undefined &&
      val.highlightClass === undefined
    ) {
      // Collapse adjacent nodes.
      acc[acc.length - 1] = { text: acc[acc.length - 1].text + val.text };
    } else {
      acc.push(val);
    }

    return acc;
  }, []);
};

/**
 * Parses the given content into lines of ContentTokens, which will include
 * `match` tokens for the given ranges, and syntax-highlighted tokens in the
 * given language.
 */
export const parseIntoLines = (
  content: string,
  matchRanges: ReadonlyArray<Range>,
  newlineIndices: ReadonlyArray<number>,
  language: string
): ContentToken[][] => {
  // Highlighting is done with grammar "scope"s, which can be computed from the
  // go-enry language name zoekt provides us.
  const highlightScope = starryNight.flagToScope(language);
  const highlightedTokens: ReadonlyArray<ContentToken> = highlightScope
    ? joinAdjacentTextNodes(
        flatten(
          childrenSchema.parse(
            starryNight.highlight(content, highlightScope).children,
            {
              mode: "passthrough",
            }
          )
        )
      )
    : [{ text: content }];

  const lines: Array<Array<ContentToken>> = [];
  let currentLineTokens: Array<ContentToken> = [];

  const matchRangeIterator = matchRanges[Symbol.iterator]();
  // The range that we're currently in, or the next upcoming range, or undefined
  // if we've passed the last range.
  let currentMatchRange: Range | undefined = matchRangeIterator.next().value;
  // Have we previously handled the start of `currentMatchRange` but not its
  // end?
  let inMatch = false;

  const newlineIterator = newlineIndices[Symbol.iterator]();
  // The next upcoming newline, if any.
  let currentNewline: number | undefined = newlineIterator.next().value;

  // How far into `content` the current `highlightedToken` begins.
  let contentStart = 0;
  for (const { text, highlightClass } of highlightedTokens) {
    // How far into `text` we currently are.
    let tokenStart = 0;

    let tokenBoundary: TokenBoundary | undefined;
    while (
      (tokenBoundary = findNextBoundary(
        contentStart + text.length,
        inMatch,
        currentMatchRange,
        currentNewline
      ))
    ) {
      const { index: contentIndex, match, newline } = tokenBoundary;
      // Reorient back into `text` terms.
      const tokenEnd = contentIndex - contentStart;

      if (match === "start") {
        inMatch = true;
        if (tokenEnd > tokenStart) {
          currentLineTokens.push({
            text: text.slice(tokenStart, tokenEnd),
            highlightClass,
          });
        }
        tokenStart = tokenEnd;
      } else if (match === "end") {
        inMatch = false;
        if (tokenEnd > tokenStart) {
          currentLineTokens.push({
            text: text.slice(tokenStart, tokenEnd),
            highlightClass,
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
            text: text.slice(tokenStart, tokenEnd),
            highlightClass,
            match: inMatch || undefined,
          });
        }
        lines.push(currentLineTokens);
        currentLineTokens = [];
        currentNewline = newlineIterator.next().value;
        tokenStart = tokenEnd + 1;
      }
    }

    if (tokenStart < text.length) {
      currentLineTokens.push({
        text: text.slice(tokenStart),
        highlightClass,
        match: inMatch || undefined,
      });
    }

    contentStart += text.length;
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

// Describes an index in content at which the current token must end, and a new
// one with different properties begin.
type TokenBoundary = {
  index: number;
  newline?: boolean;
  match?: "start" | "end";
};

// Finds the next boundary that occurs before the given index, if any.
const findNextBoundary = (
  beforeIndex: number,
  inMatch: boolean,
  currentMatchRange: Range | undefined,
  currentNewline: number | undefined
): TokenBoundary | undefined => {
  const candidates: Array<TokenBoundary> = [];
  if (currentNewline !== undefined && currentNewline < beforeIndex) {
    candidates.push({ index: currentNewline, newline: true });
  }

  if (!inMatch && currentMatchRange && currentMatchRange.start < beforeIndex) {
    candidates.push({ index: currentMatchRange.start, match: "start" });
  } else if (
    inMatch &&
    currentMatchRange &&
    // `<=` because `end` is exclusive
    currentMatchRange.end <= beforeIndex
  ) {
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
