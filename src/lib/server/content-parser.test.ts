import { describe, it, expect } from "vitest";
import { parseChunkMatch, parseFileNameMatch } from "./content-parser";

describe("parseFileNameMatch", () => {
  it("parses file name matches", () => {
    expect(parseFileNameMatch(Buffer.from("foo"), [])).toEqual([
      { text: "foo" },
    ]);
    expect(
      parseFileNameMatch(Buffer.from("foo"), [{ start: 0, end: 3 }])
    ).toEqual([{ text: "foo", match: true }]);
    expect(
      parseFileNameMatch(Buffer.from("foo"), [{ start: 0, end: 2 }])
    ).toEqual([{ text: "fo", match: true }, { text: "o" }]);
    expect(
      parseFileNameMatch(Buffer.from("foo"), [{ start: 1, end: 3 }])
    ).toEqual([{ text: "f" }, { text: "oo", match: true }]);
    expect(
      parseFileNameMatch(Buffer.from("foo"), [{ start: 1, end: 2 }])
    ).toEqual([{ text: "f" }, { text: "o", match: true }, { text: "o" }]);
    expect(
      parseFileNameMatch(Buffer.from("foo"), [
        { start: 1, end: 2 },
        { start: 2, end: 3 },
      ])
    ).toEqual([
      { text: "f" },
      { text: "o", match: true },
      { text: "o", match: true },
    ]);
  });
});

describe("parseChunkMatch", () => {
  it("parses chunk matches", () => {
    // Single line.
    expect(parseChunkMatch(Buffer.from("foo"), [])).toEqual([
      [{ text: "foo" }],
    ]);
    expect(parseChunkMatch(Buffer.from("foo"), [{ start: 0, end: 3 }])).toEqual(
      [[{ text: "foo", match: true }]]
    );
    expect(parseChunkMatch(Buffer.from("foo"), [{ start: 0, end: 2 }])).toEqual(
      [[{ text: "fo", match: true }, { text: "o" }]]
    );
    expect(parseChunkMatch(Buffer.from("foo"), [{ start: 1, end: 3 }])).toEqual(
      [[{ text: "f" }, { text: "oo", match: true }]]
    );
    expect(parseChunkMatch(Buffer.from("foo"), [{ start: 1, end: 2 }])).toEqual(
      [[{ text: "f" }, { text: "o", match: true }, { text: "o" }]]
    );
    expect(
      parseChunkMatch(Buffer.from("foo"), [
        { start: 1, end: 2 },
        { start: 2, end: 3 },
      ])
    ).toEqual([
      [{ text: "f" }, { text: "o", match: true }, { text: "o", match: true }],
    ]);

    // Multi-line.
    expect(parseChunkMatch(Buffer.from("foo\n"), [])).toEqual([
      [{ text: "foo" }],
      [],
    ]);
    expect(
      parseChunkMatch(Buffer.from("foo\n"), [{ start: 0, end: 3 }])
    ).toEqual([[{ text: "foo", match: true }], []]);
    expect(
      parseChunkMatch(Buffer.from("foo\n"), [{ start: 0, end: 4 }])
    ).toEqual([[{ text: "foo", match: true }], []]);

    expect(parseChunkMatch(Buffer.from("foo\nbar"), [])).toEqual([
      [{ text: "foo" }],
      [{ text: "bar" }],
    ]);
    expect(
      parseChunkMatch(Buffer.from("foo\nbar"), [{ start: 0, end: 3 }])
    ).toEqual([[{ text: "foo", match: true }], [{ text: "bar" }]]);
    expect(
      parseChunkMatch(Buffer.from("foo\nbar"), [{ start: 0, end: 4 }])
    ).toEqual([[{ text: "foo", match: true }], [{ text: "bar" }]]);

    expect(
      parseChunkMatch(Buffer.from("foo\nbar"), [
        { start: 0, end: 1 },
        { start: 2, end: 5 },
      ])
    ).toEqual([
      [{ text: "f", match: true }, { text: "o" }, { text: "o", match: true }],
      [{ text: "b", match: true }, { text: "ar" }],
    ]);
  });
});
