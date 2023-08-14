import { describe, it, expect } from "vitest";
import { convertByteRanges, parseFileNameMatch } from "./content-parser";

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

describe("convertByteRanges", () => {
  it("converts 1-byte byte ranges", () => {
    expect(convertByteRanges(Buffer.from("foo"), [])).toEqual({
      stringRanges: [],
      newlineIndices: [],
    });
    expect(
      convertByteRanges(Buffer.from("foo"), [{ start: 0, end: 3 }])
    ).toEqual({
      stringRanges: [{ start: 0, end: 3 }],
      newlineIndices: [],
    });
    expect(
      convertByteRanges(Buffer.from("foo"), [{ start: 0, end: 2 }])
    ).toEqual({
      stringRanges: [{ start: 0, end: 2 }],
      newlineIndices: [],
    });
    expect(
      convertByteRanges(Buffer.from("foo"), [{ start: 1, end: 3 }])
    ).toEqual({
      stringRanges: [{ start: 1, end: 3 }],
      newlineIndices: [],
    });
    expect(
      convertByteRanges(Buffer.from("foo"), [{ start: 2, end: 3 }])
    ).toEqual({
      stringRanges: [{ start: 2, end: 3 }],
      newlineIndices: [],
    });

    expect(
      convertByteRanges(
        Buffer.from(`foo
bar`),
        [{ start: 0, end: 3 }]
      )
    ).toEqual({
      stringRanges: [{ start: 0, end: 3 }],
      newlineIndices: [3],
    });
  });

  it("converts 2-byte byte ranges", () => {
    expect(
      convertByteRanges(Buffer.from("«Цікава»"), [{ start: 0, end: 4 }])
    ).toEqual({
      stringRanges: [{ start: 0, end: 2 }],
      newlineIndices: [],
    });
    expect(
      convertByteRanges(Buffer.from("«Цікава»"), [{ start: 12, end: 16 }])
    ).toEqual({
      stringRanges: [{ start: 6, end: 8 }],
      newlineIndices: [],
    });
    expect(
      convertByteRanges(
        Buffer.from(
          `«Цікава»
знахідка`
        ),
        [{ start: 12, end: 16 }]
      )
    ).toEqual({
      stringRanges: [{ start: 6, end: 8 }],
      newlineIndices: [8],
    });
  });

  it("converts 3-byte byte ranges", () => {
    expect(
      convertByteRanges(Buffer.from("混乱"), [{ start: 0, end: 3 }])
    ).toEqual({
      stringRanges: [{ start: 0, end: 1 }],
      newlineIndices: [],
    });
    expect(
      convertByteRanges(Buffer.from("混乱"), [{ start: 3, end: 6 }])
    ).toEqual({
      stringRanges: [{ start: 1, end: 2 }],
      newlineIndices: [],
    });
    expect(
      convertByteRanges(
        Buffer.from(
          `混
乱`
        ),
        [{ start: 4, end: 7 }]
      )
    ).toEqual({
      stringRanges: [{ start: 2, end: 3 }],
      newlineIndices: [1],
    });
  });

  // My language server gets really sad with 4 byte literals, and even 4 byte
  // escapes. I'm sure it works great :^).
  it.skip("converts 4-byte byte ranges");
});
