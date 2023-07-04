import { describe, it, assert } from "vitest";
import { toZoekt } from "./opengrok-lucene.server";

describe("toZoekt", () => {
  it("handles no data", () => {
    assert.deepEqual(toZoekt({}), {
      luceneQuery: null,
      zoektQuery: null,
      warnings: [],
    });
  });

  it("converts simple `full` query", () => {
    assert.deepEqual(toZoekt({ full: "foobar" }), {
      luceneQuery: "foobar",
      zoektQuery: "foobar",
      warnings: [],
    });
  });

  it("converts refs to `full` and warns", () => {
    assert.deepEqual(toZoekt({ full: "full", refs: "refs" }), {
      luceneQuery: "full refs:refs",
      zoektQuery: "full refs",
      warnings: [
        { code: "ReferencesNotSupported", location: { start: 5, end: 9 } },
      ],
    });
  });

  it("warns on hist and discards", () => {
    assert.deepEqual(toZoekt({ full: "full", hist: "hist" }), {
      luceneQuery: "full hist:hist",
      zoektQuery: "full",
      warnings: [
        { code: "HistoryNotSupported", location: { start: 5, end: 9 } },
      ],
    });
  });

  it("converts defs to sym:", () => {
    assert.deepEqual(toZoekt({ full: "full", defs: "defs" }), {
      luceneQuery: "full defs:defs",
      zoektQuery: "full sym:defs",
      warnings: [],
    });
  });

  it("converts path to file:", () => {
    assert.deepEqual(toZoekt({ full: "full", path: "passwd" }), {
      luceneQuery: "full path:passwd",
      zoektQuery: "full file:passwd",
      warnings: [],
    });
  });

  // OpenGrok does magic stuff to make its lucene leave slashes untouched, and
  // we can't cusomize our parser to the same extent. Converting paths with
  // slashes can't be implemented.
  //
  // This warning only works when the slashes are in `path` and not in `full`,
  // as we'd need to warn on `full` after parsing, and parsing destroys the
  // information necessary to identify the situation.
  it("warns when path contains slashes", () => {
    assert.deepEqual(toZoekt({ full: "full", path: "/etc/passwd" }), {
      luceneQuery: "full",
      zoektQuery: "full",
      warnings: [{ code: "PathCannotContainSlashes" }],
    });
  });

  it("accepts relevancy sort", () => {
    assert.deepEqual(toZoekt({ full: "foobar", sort: "relevancy" }), {
      luceneQuery: "foobar",
      zoektQuery: "foobar",
      warnings: [],
    });
  });

  it("warns on non-relevancy sort and discards", () => {
    assert.deepEqual(toZoekt({ full: "foobar", sort: "lastmodtime" }), {
      luceneQuery: "foobar",
      zoektQuery: "foobar",
      warnings: [{ code: "SortOrderNotSupported" }],
    });
  });

  it("converts known type to lang:", () => {
    assert.deepEqual(toZoekt({ full: "foobar", type: "java" }), {
      luceneQuery: "foobar",
      zoektQuery: "lang:java foobar",
      warnings: [],
    });
  });

  it("warns on unknown type and discards", () => {
    assert.deepEqual(
      toZoekt({ full: "foobar", type: "BORLAND TURBO PASCAL" }),
      {
        luceneQuery: "foobar",
        zoektQuery: "foobar",
        warnings: [
          { code: "UnsupportedLanguage", language: "BORLAND TURBO PASCAL" },
        ],
      }
    );
  });

  it("converts projects, warning on unknown ones", () => {
    assert.deepEqual(
      toZoekt(
        { full: "foobar", project: "project1,project2" },
        { projectToRepo: new Map([["project1", "github.com/user/repo1"]]) }
      ),
      {
        luceneQuery: "foobar",
        zoektQuery: "repo:^github\\.com/user/repo1$|^project2$ foobar",
        warnings: [{ code: "UnknownProjects", projects: ["project2"] }],
      }
    );
  });

  it("warns on unknown fields and discards", () => {
    assert.deepEqual(toZoekt({ full: "foobar foobar:foobar" }), {
      luceneQuery: "foobar foobar:foobar",
      zoektQuery: "foobar",
      warnings: [
        {
          code: "UnsupportedField",
          field: "foobar",
          location: { start: 7, end: 13 },
        },
      ],
    });
  });

  it("handles unsupported lucene term features", () => {
    assert.deepEqual(
      toZoekt({
        full: 'foo boost^4 "proxi mity"~10 similarity~ path:{abc TO def]',
      }),
      {
        luceneQuery:
          'foo boost^4 "proxi mity"~10 similarity~ path:{abc TO def]',
        zoektQuery: "foo boost",
        warnings: [
          { code: "BoostNotSupported", location: { start: 4, end: 12 } },
          { code: "ProximityNotSupported", location: { start: 12, end: 28 } },
          { code: "SimilarityNotSupported", location: { start: 28, end: 40 } },
          { code: "RangeTermNotSupported", location: { start: 40, end: 44 } },
        ],
      }
    );
  });

  it("regex escapes lucene values", () => {
    assert.deepEqual(toZoekt({ full: "w*ldc?rd esca.pe" }), {
      luceneQuery: "w*ldc?rd esca.pe",
      zoektQuery: "w.*ldc.?rd esca\\.pe",
      warnings: [],
    });
  });

  it("translates boolean logic", () => {
    assert.deepEqual(
      toZoekt({
        full: "a && (defs:b || +c) OR NOT (d OR (path:-e AND (!f NOT g) h))",
        path: "-i && +j",
      }),
      {
        luceneQuery:
          "a && (defs:b || +c) OR NOT (d OR (path:-e AND (!f NOT g) h)) path:(-i && +j)",
        zoektQuery:
          "a (sym:b or c) or -(d or (-file:e (-f -g) h)) (-file:i file:j)",
        warnings: [],
      }
    );
  });

  it("pushes down parenthesized fields", () => {
    assert.deepEqual(
      toZoekt({
        full: "foobar defs:(a (b OR !c))",
        refs: "-d && +e",
      }),
      {
        luceneQuery: "foobar defs:(a (b OR !c)) refs:(-d && +e)",
        zoektQuery: "foobar (sym:a (sym:b or -sym:c)) (-d e)",
        warnings: [
          { code: "ReferencesNotSupported", location: { start: 26, end: 30 } },
          // FIXME warnings from pushdown are duplicated, not a huge deal but
          { code: "ReferencesNotSupported", location: { start: 26, end: 30 } },
        ],
      }
    );
  });
});
