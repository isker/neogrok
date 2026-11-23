import { describe, it, expect } from "vitest";
import { tokenNames } from "@pierre/highlights";
import { highlightChunks, stylesheet } from "./syntax-highlighting";

const toChunk = (startLineNumber: number, ...texts: Array<string>) => ({
  startLineNumber,
  lines: texts.map((text) => ({ text, matchRanges: [] })),
});

const tokenTypeNames = (
  highlights: ReadonlyArray<readonly [number, number]> | undefined,
) => highlights?.map(([length, type]) => [length, tokenNames[type]]);

describe("highlightChunks", () => {
  it("covers each line with typed tokens", () => {
    const chunk = toChunk(
      1,
      'const s = "🦀 crab";',
      "",
      "let crlf = 1;\r",
      "\r",
      `const long = "${"x".repeat(1200)}";`,
      "",
    );
    const [highlighted] = highlightChunks([chunk], "TypeScript");

    expect(highlighted).toHaveLength(chunk.lines.length);
    highlighted.forEach(({ text, highlights }) => {
      expect(highlights?.reduce((sum, [length]) => sum + length, 0)).toBe(
        text.length,
      );
    });
    expect(tokenTypeNames(highlighted[0].highlights)).toEqual([
      [6, "keyword.declaration"],
      [2, "variable"],
      [2, "operator"],
      [9, "string"],
      [1, "punctuation.delimiter"],
    ]);
    // Overlong lines are left as a single unhighlighted token.
    expect(tokenTypeNames(highlighted[4].highlights)).toEqual([
      [chunk.lines[4].text.length, "foreground"],
    ]);
  });

  it("maps token types whose names contain underscores", () => {
    const [[line]] = highlightChunks([toChunk(1, '{"key": 1}')], "JSON");
    expect(tokenTypeNames(line.highlights)).toContainEqual([
      5,
      "property.json_key",
    ]);
  });

  it("highlights touching chunks together, regardless of their order", () => {
    const [afterComment, comment, distant] = highlightChunks(
      [
        toChunk(3, "end */", "x = 1;"),
        toChunk(1, "/* start", "middle"),
        toChunk(10, "end */"),
      ],
      "TypeScript",
    );
    expect(tokenTypeNames(comment[1].highlights)).toEqual([[6, "comment"]]);
    expect(tokenTypeNames(afterComment[0].highlights)).toEqual([
      [6, "comment"],
    ]);
    expect(tokenTypeNames(afterComment[1].highlights)?.[0]).toEqual([
      2,
      "variable",
    ]);
    // A chunk that doesn't touch the comment isn't highlighted as one.
    expect(tokenTypeNames(distant[0].highlights)).not.toEqual([[6, "comment"]]);
  });

  it("maps linguist language names", () => {
    const [[line]] = highlightChunks(
      [toChunk(1, "(defun f (x) x)")],
      "Common Lisp",
    );
    expect(line.highlights).toBeDefined();
  });

  it("leaves plain text and unsupported languages unhighlighted", () => {
    for (const language of ["Text", "Smalltalk", "M"]) {
      expect(highlightChunks([toChunk(1, "Hello world")], language)).toEqual([
        toChunk(1, "Hello world").lines,
      ]);
    }
  });
});

describe("stylesheet", () => {
  it("renders brackets and delimiters as plain code", () => {
    for (const name of ["punctuation.bracket", "punctuation.delimiter.jsx"]) {
      expect(stylesheet).toContain(
        `.hl-${tokenNames.indexOf(name)}{color:var(--hls-foreground);`,
      );
    }
    expect(stylesheet).toContain(
      `.hl-${tokenNames.indexOf("keyword")}{color:var(--hls-keyword);`,
    );
  });

  it("applies the theme's font styles", () => {
    for (const declaration of [
      "--hls-emphasis-font-style: italic;",
      "--hls-emphasis-strong-font-weight: 700;",
      "--hls-markup-strikethrough-text-decoration: line-through;",
    ]) {
      expect(stylesheet).toContain(declaration);
    }
    expect(stylesheet).toContain(
      `.hl-${tokenNames.indexOf("markup.strikethrough")}{color:var(--hls-markup-strikethrough);font-style:var(--hls-markup-strikethrough-font-style);font-weight:var(--hls-markup-strikethrough-font-weight);text-decoration:var(--hls-markup-strikethrough-text-decoration)}`,
    );
  });
});
