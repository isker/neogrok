import { describe, it, expect } from "vitest";
import { renderChunksToLineGroups } from "./chunk-renderer";
import type { ContentToken } from "./content-parser";

const tokens = (matchCount: number): ContentToken[] =>
  Array.from({ length: matchCount * 2 }, (_, i) =>
    i % 2 === 0
      ? { kind: "context", text: i.toString(), startByteOffset: i }
      : { kind: "match", text: i.toString(), startByteOffset: i }
  );

const line = (lineNumber: number, matchCount: number) => {
  return { lineNumber, lineTokens: tokens(matchCount), matchCount };
};

// These chunks with this softCutoff results in a hard cutoff after line 6.
const chunks = [
  {
    matchCount: 2,
    lines: [line(1, 1), line(2, 1)],
  },
  {
    matchCount: 8,
    lines: [line(6, 5), line(7, 2), line(8, 1)],
  },
];
const softCutoff = 3;

describe("renderChunksToLineGroups", () => {
  describe("collapsed", () => {
    it("matches the snapshot", () => {
      const results = renderChunksToLineGroups(chunks, softCutoff, false);
      expect(results).toMatchSnapshot();
    });
  });

  describe("expanded", () => {
    it("matches the snapshot", () => {
      const results = renderChunksToLineGroups(chunks, softCutoff, true);
      expect(results).toMatchSnapshot();
    });
  });
});
