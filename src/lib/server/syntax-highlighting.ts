import {
  codeToTokens,
  isSupportedLanguage,
  type Lang,
  tokenNames,
} from "@pierre/highlights";
import {
  cssVariables,
  githubDark,
  githubLight,
  toCSS,
} from "@pierre/highlights/themes";
import type { ContentLine } from "./content-parser";

// A run of `length` UTF-16 code units of a line's text, of the token type
// `tokenNames[type]`, styled by the `hl-${type}` class in `stylesheet`. Token
// types rather than colors keep the result independent of the browser's color
// scheme, which the server can't know, and keep it compact.
export type HighlightToken = readonly [length: number, type: number];

export type HighlightedLine = ContentLine & {
  // When present, its tokens cover the entire line.
  readonly highlights?: ReadonlyArray<HighlightToken>;
};

const toHighlightsLanguage = (linguistLanguage: string): string => {
  // This is the same normalization that zoekt applies when querying go-enry,
  // and it seems to be good enough for us querying highlights as well.
  const language = linguistLanguage.toLowerCase();
  // ... except when it isn't. go-enry (backed by linguist) and highlights just
  // seem to have fundamentally different lineages, we have no hope but to do
  // some remappings. TODO perhaps these should be upstreamed as aliases in
  // highlights.
  switch (language) {
    case "common lisp":
      return "lisp";
    case "emacs lisp":
      return "emacs-lisp";
    case "fortran free form":
      return "fortran-free-form";
    case "gettext catalog":
      return "po";
    case "git commit":
      return "git-commit";
    case "godot resource":
      return "gdresource";
    case "html+erb":
      return "erb";
    case "json with comments":
      return "jsonc";
    case "lean 4":
      return "lean4";
    case "m":
      // Linguist's M is MUMPS, but highlights treats `m` as Objective-C.
      return "text";
    case "objective-c++":
      return "objective-cpp";
    case "protocol buffer":
      return "protobuf";
    case "ros interface":
      return "rosmsg";
    case "vim script":
      return "viml";
    case "webassembly":
      return "wasm";
    case "wolfram language":
      return "wolfram";
    default:
      return language;
  }
};

// Tokenizing with the `cssVariables` theme names each token's type in its
// color, as a custom property that `toCSS` defines.
const toCustomProperty = (tokenName: string) =>
  `--hls-${tokenName.replace(/[._]/g, "-")}`;
const tokenTypesByColor = new Map(
  tokenNames.map((name, type) => [`var(${toCustomProperty(name)})`, type]),
);
const foregroundType = tokenNames.indexOf("foreground");

// The GitHub themes color brackets like constants and delimiters like
// keywords, which is far noisier than GitHub itself; render them as plain code.
const neutralTokenName = /^punctuation\.(bracket|delimiter)(\.|$)/;

export const stylesheet = [
  `:root{${toCSS(githubLight, { fontStyle: true })}}`,
  `@media (prefers-color-scheme: dark){:root{${toCSS(githubDark, { fontStyle: true })}}}`,
  ...tokenNames.map((name, type) => {
    const property = toCustomProperty(name);
    const color = neutralTokenName.test(name)
      ? toCustomProperty("foreground")
      : property;
    return `.hl-${type}{color:var(${color});font-style:var(${property}-font-style);font-weight:var(${property}-font-weight);text-decoration:var(${property}-text-decoration)}`;
  }),
].join("");

const highlightLines = (
  lines: Array<ContentLine>,
  lang: Lang,
): Array<HighlightedLine> => {
  try {
    const { tokens } = codeToTokens(lines.map(({ text }) => text).join("\n"), {
      lang,
      theme: cssVariables,
      // Lines this long are probably minified web assets or otherwise
      // low-signal, and would render an excessive number of elements.
      tokenizeMaxLineLength: 1000,
    });
    return lines.map((line, i) => {
      const highlights: Array<HighlightToken> = tokens[i].map(
        ({ content, color = "" }) => [
          content.length,
          tokenTypesByColor.get(color) ?? foregroundType,
        ],
      );
      // highlights leaves the trailing \r of CRLF line endings out of its
      // tokens.
      const covered = highlights.reduce((sum, [length]) => sum + length, 0);
      if (covered < line.text.length) {
        highlights.push([line.text.length - covered, foregroundType]);
      }
      return { ...line, highlights };
    });
  } catch (error) {
    // Highlighting is a nice-to-have; failures should degrade to plain text
    // rather than fail the search.
    console.error("Syntax highlighting failed for %s", lang, error);
    return lines;
  }
};

type ChunkLines = {
  readonly startLineNumber: number;
  readonly lines: Array<ContentLine>;
};

/**
 * Highlights the lines of each of a file's chunks, returning them in the same
 * order as the chunks.
 */
export const highlightChunks = (
  chunks: ReadonlyArray<ChunkLines>,
  linguistLanguage: string,
): Array<Array<HighlightedLine>> => {
  const highlighted: Array<Array<HighlightedLine>> = chunks.map(
    ({ lines }) => lines,
  );
  const lang = toHighlightsLanguage(linguistLanguage);
  if (lang === "text" || !isSupportedLanguage(lang)) {
    return highlighted;
  }

  // zoekt doesn't merge chunks whose lines merely touch, but they're displayed
  // as one block. Highlight runs of such chunks together, so that constructs
  // crossing chunk boundaries, like block comments, are highlighted correctly.
  const highlightRun = (run: ReadonlyArray<number>) => {
    const lines = highlightLines(
      run.flatMap((i) => chunks[i].lines),
      lang,
    );
    let offset = 0;
    for (const i of run) {
      highlighted[i] = lines.slice(offset, (offset += chunks[i].lines.length));
    }
  };
  const byLineNumber = chunks
    .map((_, i) => i)
    .sort((a, b) => chunks[a].startLineNumber - chunks[b].startLineNumber);
  let run: Array<number> = [];
  for (const i of byLineNumber) {
    const previous = chunks[run.at(-1) ?? -1];
    if (
      previous &&
      previous.startLineNumber + previous.lines.length !==
        chunks[i].startLineNumber
    ) {
      highlightRun(run);
      run = [];
    }
    run.push(i);
  }
  highlightRun(run);

  return highlighted;
};
