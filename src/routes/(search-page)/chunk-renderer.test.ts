import { describe, it, expect } from "vitest";
import { renderChunksToLineGroups } from "./chunk-renderer";

// This is real data from a search result against the zoekt repo.
const chunks = [
  {
    matchCount: 1,
    lines: [
      {
        lineNumber: 20,
        lineTokens: [
          { kind: "context", text: '\t"strings"\n', startByteOffset: 0 },
        ],
        matchCount: 0,
      },
      {
        lineNumber: 21,
        lineTokens: [
          { kind: "context", text: '\t"', startByteOffset: 11 },
          { kind: "match", text: "test", startByteOffset: 13 },
          { kind: "context", text: 'ing"\n', startByteOffset: 17 },
        ],
        matchCount: 1,
      },
      {
        lineNumber: 22,
        lineTokens: [{ kind: "context", text: ")", startByteOffset: 22 }],
        matchCount: 0,
      },
    ],
  },
  {
    matchCount: 1,
    lines: [
      {
        lineNumber: 27,
        lineTokens: [{ kind: "context", text: "*/\n", startByteOffset: 0 }],
        matchCount: 0,
      },
      {
        lineNumber: 28,
        lineTokens: [
          {
            kind: "context",
            text: "func BenchmarkMinimalRepoListEncodings(b *",
            startByteOffset: 3,
          },
          { kind: "match", text: "test", startByteOffset: 45 },
          { kind: "context", text: "ing.B) {\n", startByteOffset: 49 },
        ],
        matchCount: 1,
      },
      {
        lineNumber: 29,
        lineTokens: [
          {
            kind: "context",
            text: "\tsize := uint32(13000) // 2021-06-24 rough estimate of number of repos on a replica.",
            startByteOffset: 58,
          },
        ],
        matchCount: 0,
      },
    ],
  },
  {
    matchCount: 2,
    lines: [
      {
        lineNumber: 57,
        lineTokens: [{ kind: "context", text: "\n", startByteOffset: 0 }],
        matchCount: 0,
      },
      {
        lineNumber: 58,
        lineTokens: [
          {
            kind: "context",
            text: "func benchmarkEncoding(data interface{}) func(*",
            startByteOffset: 1,
          },
          { kind: "match", text: "test", startByteOffset: 48 },
          { kind: "context", text: "ing.B) {\n", startByteOffset: 52 },
        ],
        matchCount: 1,
      },
      {
        lineNumber: 59,
        lineTokens: [
          { kind: "context", text: "\treturn func(b *", startByteOffset: 61 },
          { kind: "match", text: "test", startByteOffset: 77 },
          { kind: "context", text: "ing.B) {\n", startByteOffset: 81 },
        ],
        matchCount: 1,
      },
      {
        lineNumber: 60,
        lineTokens: [
          { kind: "context", text: "\t\tb.Helper()", startByteOffset: 90 },
        ],
        matchCount: 0,
      },
    ],
  },
  {
    matchCount: 2,
    lines: [
      {
        lineNumber: 78,
        lineTokens: [{ kind: "context", text: "\n", startByteOffset: 0 }],
        matchCount: 0,
      },
      {
        lineNumber: 79,
        lineTokens: [
          { kind: "context", text: "func ", startByteOffset: 1 },
          { kind: "match", text: "Test", startByteOffset: 6 },
          {
            kind: "context",
            text: "SizeBytesSearchResult(t *",
            startByteOffset: 10,
          },
          { kind: "match", text: "test", startByteOffset: 35 },
          { kind: "context", text: "ing.T) {\n", startByteOffset: 39 },
        ],
        matchCount: 2,
      },
      {
        lineNumber: 80,
        lineTokens: [
          {
            kind: "context",
            text: "\tvar sr = SearchResult{",
            startByteOffset: 48,
          },
        ],
        matchCount: 0,
      },
    ],
  },
  {
    matchCount: 1,
    lines: [
      {
        lineNumber: 89,
        lineTokens: [
          {
            kind: "context",
            text: "\t\t\tLineMatches: nil, // 24 bytes\n",
            startByteOffset: 0,
          },
        ],
        matchCount: 0,
      },
      {
        lineNumber: 90,
        lineTokens: [
          {
            kind: "context",
            text: "\t\t\tChunkMatches: []ChunkMatch{{ // 24 bytes + 208 bytes (see ",
            startByteOffset: 33,
          },
          { kind: "match", text: "Test", startByteOffset: 94 },
          {
            kind: "context",
            text: "SizeByteChunkMatches)\n",
            startByteOffset: 98,
          },
        ],
        matchCount: 1,
      },
      {
        lineNumber: 91,
        lineTokens: [
          {
            kind: "context",
            text: '\t\t\t\tContent:      []byte("foo"),',
            startByteOffset: 120,
          },
        ],
        matchCount: 0,
      },
    ],
  },
  {
    matchCount: 2,
    lines: [
      {
        lineNumber: 117,
        lineTokens: [{ kind: "context", text: "\n", startByteOffset: 0 }],
        matchCount: 0,
      },
      {
        lineNumber: 118,
        lineTokens: [
          { kind: "context", text: "func ", startByteOffset: 1 },
          { kind: "match", text: "Test", startByteOffset: 6 },
          {
            kind: "context",
            text: "SizeBytesChunkMatches(t *",
            startByteOffset: 10,
          },
          { kind: "match", text: "test", startByteOffset: 35 },
          { kind: "context", text: "ing.T) {\n", startByteOffset: 39 },
        ],
        matchCount: 2,
      },
      {
        lineNumber: 119,
        lineTokens: [
          { kind: "context", text: "\tcm := ChunkMatch{", startByteOffset: 48 },
        ],
        matchCount: 0,
      },
    ],
  },
] as const;

const softCutoff = 5;

describe("renderChunksToLineGroups", () => {
  describe("collapsed", () => {
    it("matches the snapshot", () => {
      expect(renderChunksToLineGroups(chunks, softCutoff, false))
        .toMatchInlineSnapshot(`
        {
          "lineGroups": [
            [
              {
                "lineNumber": 20,
                "lineTokens": [
                  {
                    "kind": "context",
                    "startByteOffset": 0,
                    "text": "	\\"strings\\"
        ",
                  },
                ],
                "matchCount": 0,
              },
              {
                "lineNumber": 21,
                "lineTokens": [
                  {
                    "kind": "context",
                    "startByteOffset": 11,
                    "text": "	\\"",
                  },
                  {
                    "kind": "match",
                    "startByteOffset": 13,
                    "text": "test",
                  },
                  {
                    "kind": "context",
                    "startByteOffset": 17,
                    "text": "ing\\"
        ",
                  },
                ],
                "matchCount": 1,
              },
              {
                "lineNumber": 22,
                "lineTokens": [
                  {
                    "kind": "context",
                    "startByteOffset": 22,
                    "text": ")",
                  },
                ],
                "matchCount": 0,
              },
            ],
            [
              {
                "lineNumber": 27,
                "lineTokens": [
                  {
                    "kind": "context",
                    "startByteOffset": 0,
                    "text": "*/
        ",
                  },
                ],
                "matchCount": 0,
              },
              {
                "lineNumber": 28,
                "lineTokens": [
                  {
                    "kind": "context",
                    "startByteOffset": 3,
                    "text": "func BenchmarkMinimalRepoListEncodings(b *",
                  },
                  {
                    "kind": "match",
                    "startByteOffset": 45,
                    "text": "test",
                  },
                  {
                    "kind": "context",
                    "startByteOffset": 49,
                    "text": "ing.B) {
        ",
                  },
                ],
                "matchCount": 1,
              },
              {
                "lineNumber": 29,
                "lineTokens": [
                  {
                    "kind": "context",
                    "startByteOffset": 58,
                    "text": "	size := uint32(13000) // 2021-06-24 rough estimate of number of repos on a replica.",
                  },
                ],
                "matchCount": 0,
              },
            ],
            [
              {
                "lineNumber": 57,
                "lineTokens": [
                  {
                    "kind": "context",
                    "startByteOffset": 0,
                    "text": "
        ",
                  },
                ],
                "matchCount": 0,
              },
              {
                "lineNumber": 58,
                "lineTokens": [
                  {
                    "kind": "context",
                    "startByteOffset": 1,
                    "text": "func benchmarkEncoding(data interface{}) func(*",
                  },
                  {
                    "kind": "match",
                    "startByteOffset": 48,
                    "text": "test",
                  },
                  {
                    "kind": "context",
                    "startByteOffset": 52,
                    "text": "ing.B) {
        ",
                  },
                ],
                "matchCount": 1,
              },
              {
                "lineNumber": 59,
                "lineTokens": [
                  {
                    "kind": "context",
                    "startByteOffset": 61,
                    "text": "	return func(b *",
                  },
                  {
                    "kind": "match",
                    "startByteOffset": 77,
                    "text": "test",
                  },
                  {
                    "kind": "context",
                    "startByteOffset": 81,
                    "text": "ing.B) {
        ",
                  },
                ],
                "matchCount": 1,
              },
              {
                "lineNumber": 60,
                "lineTokens": [
                  {
                    "kind": "context",
                    "startByteOffset": 90,
                    "text": "		b.Helper()",
                  },
                ],
                "matchCount": 0,
              },
            ],
            [
              {
                "lineNumber": 78,
                "lineTokens": [
                  {
                    "kind": "context",
                    "startByteOffset": 0,
                    "text": "
        ",
                  },
                ],
                "matchCount": 0,
              },
              {
                "lineNumber": 79,
                "lineTokens": [
                  {
                    "kind": "context",
                    "startByteOffset": 1,
                    "text": "func ",
                  },
                  {
                    "kind": "match",
                    "startByteOffset": 6,
                    "text": "Test",
                  },
                  {
                    "kind": "context",
                    "startByteOffset": 10,
                    "text": "SizeBytesSearchResult(t *",
                  },
                  {
                    "kind": "match",
                    "startByteOffset": 35,
                    "text": "test",
                  },
                  {
                    "kind": "context",
                    "startByteOffset": 39,
                    "text": "ing.T) {
        ",
                  },
                ],
                "matchCount": 2,
              },
              {
                "lineNumber": 80,
                "lineTokens": [
                  {
                    "kind": "context",
                    "startByteOffset": 48,
                    "text": "	var sr = SearchResult{",
                  },
                ],
                "matchCount": 0,
              },
            ],
          ],
          "preCutoffMatchCount": 6,
        }
      `);
    });
  });

  describe("expanded", () => {
    it("matches the snapshot", () => {
      expect(renderChunksToLineGroups(chunks, softCutoff, true))
        .toMatchInlineSnapshot(`
          {
            "lineGroups": [
              [
                {
                  "lineNumber": 20,
                  "lineTokens": [
                    {
                      "kind": "context",
                      "startByteOffset": 0,
                      "text": "	\\"strings\\"
          ",
                    },
                  ],
                  "matchCount": 0,
                },
                {
                  "lineNumber": 21,
                  "lineTokens": [
                    {
                      "kind": "context",
                      "startByteOffset": 11,
                      "text": "	\\"",
                    },
                    {
                      "kind": "match",
                      "startByteOffset": 13,
                      "text": "test",
                    },
                    {
                      "kind": "context",
                      "startByteOffset": 17,
                      "text": "ing\\"
          ",
                    },
                  ],
                  "matchCount": 1,
                },
                {
                  "lineNumber": 22,
                  "lineTokens": [
                    {
                      "kind": "context",
                      "startByteOffset": 22,
                      "text": ")",
                    },
                  ],
                  "matchCount": 0,
                },
              ],
              [
                {
                  "lineNumber": 27,
                  "lineTokens": [
                    {
                      "kind": "context",
                      "startByteOffset": 0,
                      "text": "*/
          ",
                    },
                  ],
                  "matchCount": 0,
                },
                {
                  "lineNumber": 28,
                  "lineTokens": [
                    {
                      "kind": "context",
                      "startByteOffset": 3,
                      "text": "func BenchmarkMinimalRepoListEncodings(b *",
                    },
                    {
                      "kind": "match",
                      "startByteOffset": 45,
                      "text": "test",
                    },
                    {
                      "kind": "context",
                      "startByteOffset": 49,
                      "text": "ing.B) {
          ",
                    },
                  ],
                  "matchCount": 1,
                },
                {
                  "lineNumber": 29,
                  "lineTokens": [
                    {
                      "kind": "context",
                      "startByteOffset": 58,
                      "text": "	size := uint32(13000) // 2021-06-24 rough estimate of number of repos on a replica.",
                    },
                  ],
                  "matchCount": 0,
                },
              ],
              [
                {
                  "lineNumber": 57,
                  "lineTokens": [
                    {
                      "kind": "context",
                      "startByteOffset": 0,
                      "text": "
          ",
                    },
                  ],
                  "matchCount": 0,
                },
                {
                  "lineNumber": 58,
                  "lineTokens": [
                    {
                      "kind": "context",
                      "startByteOffset": 1,
                      "text": "func benchmarkEncoding(data interface{}) func(*",
                    },
                    {
                      "kind": "match",
                      "startByteOffset": 48,
                      "text": "test",
                    },
                    {
                      "kind": "context",
                      "startByteOffset": 52,
                      "text": "ing.B) {
          ",
                    },
                  ],
                  "matchCount": 1,
                },
                {
                  "lineNumber": 59,
                  "lineTokens": [
                    {
                      "kind": "context",
                      "startByteOffset": 61,
                      "text": "	return func(b *",
                    },
                    {
                      "kind": "match",
                      "startByteOffset": 77,
                      "text": "test",
                    },
                    {
                      "kind": "context",
                      "startByteOffset": 81,
                      "text": "ing.B) {
          ",
                    },
                  ],
                  "matchCount": 1,
                },
                {
                  "lineNumber": 60,
                  "lineTokens": [
                    {
                      "kind": "context",
                      "startByteOffset": 90,
                      "text": "		b.Helper()",
                    },
                  ],
                  "matchCount": 0,
                },
              ],
              [
                {
                  "lineNumber": 78,
                  "lineTokens": [
                    {
                      "kind": "context",
                      "startByteOffset": 0,
                      "text": "
          ",
                    },
                  ],
                  "matchCount": 0,
                },
                {
                  "lineNumber": 79,
                  "lineTokens": [
                    {
                      "kind": "context",
                      "startByteOffset": 1,
                      "text": "func ",
                    },
                    {
                      "kind": "match",
                      "startByteOffset": 6,
                      "text": "Test",
                    },
                    {
                      "kind": "context",
                      "startByteOffset": 10,
                      "text": "SizeBytesSearchResult(t *",
                    },
                    {
                      "kind": "match",
                      "startByteOffset": 35,
                      "text": "test",
                    },
                    {
                      "kind": "context",
                      "startByteOffset": 39,
                      "text": "ing.T) {
          ",
                    },
                  ],
                  "matchCount": 2,
                },
                {
                  "lineNumber": 80,
                  "lineTokens": [
                    {
                      "kind": "context",
                      "startByteOffset": 48,
                      "text": "	var sr = SearchResult{",
                    },
                  ],
                  "matchCount": 0,
                },
              ],
              [
                {
                  "lineNumber": 89,
                  "lineTokens": [
                    {
                      "kind": "context",
                      "startByteOffset": 0,
                      "text": "			LineMatches: nil, // 24 bytes
          ",
                    },
                  ],
                  "matchCount": 0,
                },
                {
                  "lineNumber": 90,
                  "lineTokens": [
                    {
                      "kind": "context",
                      "startByteOffset": 33,
                      "text": "			ChunkMatches: []ChunkMatch{{ // 24 bytes + 208 bytes (see ",
                    },
                    {
                      "kind": "match",
                      "startByteOffset": 94,
                      "text": "Test",
                    },
                    {
                      "kind": "context",
                      "startByteOffset": 98,
                      "text": "SizeByteChunkMatches)
          ",
                    },
                  ],
                  "matchCount": 1,
                },
                {
                  "lineNumber": 91,
                  "lineTokens": [
                    {
                      "kind": "context",
                      "startByteOffset": 120,
                      "text": "				Content:      []byte(\\"foo\\"),",
                    },
                  ],
                  "matchCount": 0,
                },
              ],
              [
                {
                  "lineNumber": 117,
                  "lineTokens": [
                    {
                      "kind": "context",
                      "startByteOffset": 0,
                      "text": "
          ",
                    },
                  ],
                  "matchCount": 0,
                },
                {
                  "lineNumber": 118,
                  "lineTokens": [
                    {
                      "kind": "context",
                      "startByteOffset": 1,
                      "text": "func ",
                    },
                    {
                      "kind": "match",
                      "startByteOffset": 6,
                      "text": "Test",
                    },
                    {
                      "kind": "context",
                      "startByteOffset": 10,
                      "text": "SizeBytesChunkMatches(t *",
                    },
                    {
                      "kind": "match",
                      "startByteOffset": 35,
                      "text": "test",
                    },
                    {
                      "kind": "context",
                      "startByteOffset": 39,
                      "text": "ing.T) {
          ",
                    },
                  ],
                  "matchCount": 2,
                },
                {
                  "lineNumber": 119,
                  "lineTokens": [
                    {
                      "kind": "context",
                      "startByteOffset": 48,
                      "text": "	cm := ChunkMatch{",
                    },
                  ],
                  "matchCount": 0,
                },
              ],
            ],
            "preCutoffMatchCount": 6,
          }
        `);
    });
  });
});
