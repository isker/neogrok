import * as v from "@badrap/valita";
import lucene from "lucene";
import type {
  QueryLocation,
  ZoektConversionWarning,
} from "./conversion-warnings";

const locationSchema = v.object({
  column: v.number(),
  line: v.number(),
  offset: v.number(),
});
const syntaxErrorSchema = v.object({
  name: v.literal("SyntaxError"),
  message: v.string(),
  location: v.object({ start: locationSchema, end: locationSchema }),
});

/**
 * Converts an OpenGrok search query (as described by its /search URL
 * parameters) into a textual Zoekt search query, suitable for input into a
 * Neogrok search.
 *
 * While most users input simple strings into OpenGrok search fields, they are
 * in fact a fully functional lucene search query. So, we need to parse and
 * transform them as such. Thankfully, there is a fairly functional lucene
 * parser written in JS that we use to this effect.
 */
export const toZoekt = async (
  {
    full,
    defs,
    refs,
    path,
    hist,
    type,
    sort,
    project,
    searchall,
    start,
  }: OpenGrokSearchParams,
  { projectToRepo, queryUnknownRepos }: ConversionDependencies
): Promise<ZoektConversionResult> => {
  // OpenGrok has the lovely property of allowing you to input a "full" lucene
  // query into the primary search form field, or queries for specific lucene
  // fields in different form fields. It then aggregates these into a single
  // lucene query on the server. We simulate doing the same here.
  const queries: Array<string> = [];
  const warnings: Array<ZoektConversionWarning> = [];
  if (full) {
    queries.push(full);
  }
  if (defs) {
    queries.push(`defs:${maybeParenthesize(defs)}`);
  }
  if (refs) {
    queries.push(`refs:${maybeParenthesize(refs)}`);
  }
  if (path) {
    if (path.includes("/")) {
      warnings.push({ code: "PathCannotContainSlashes" });
    } else {
      queries.push(`path:${maybeParenthesize(path)}`);
    }
  }
  if (hist) {
    queries.push(`hist:${maybeParenthesize(hist)}`);
  }

  if (queries.length === 0) {
    return { luceneQuery: null, zoektQuery: null, warnings: [] };
  }

  // Combine those queries, parse them into a lucene AST, and then render that
  // AST into a zoekt string query.
  const luceneQuery = queries.join(" ");

  let zoektQuery: string | null;
  try {
    const luceneAst = lucene.parse(luceneQuery);
    const renderResult = renderAst(luceneAst);
    ({ zoektQuery } = renderResult);
    warnings.push(...renderResult.warnings);
  } catch (e) {
    try {
      const syntaxError = syntaxErrorSchema.parse(e, { mode: "passthrough" });
      return {
        luceneQuery,
        zoektQuery: null,
        warnings: [
          {
            code: "LuceneParseError",
            message: syntaxError.message,
            location: extractQueryLocation(syntaxError.location),
          },
        ],
      };
    } catch {
      throw e;
    }
  }

  // A few other non-lucene OpenGrok fields can affect the resulting Zoekt
  // query.
  const zoektParts: Array<string> = [];

  if (
    sort &&
    // This being analogous to what zoekt does.
    sort !== "relevancy"
  ) {
    warnings.push({ code: "SortOrderNotSupported", sortOrder: sort });
  }

  if (start) {
    warnings.push({ code: "PaginationNotSupported" });
  }

  if (!searchall && project) {
    const candidateRepos = new Set<string>();
    const converted = new Map<string, string>();
    project.split(",").forEach((p) => {
      const zoektRepo = projectToRepo.get(p);
      if (zoektRepo) {
        converted.set(p, zoektRepo);
      }
      candidateRepos.add(zoektRepo ?? p);
    });

    if (converted.size > 0) {
      warnings.push({
        code: "ConvertedProjects",
        conversions: Object.fromEntries(converted.entries()),
      });
    }

    const unknownRepos = await queryUnknownRepos(candidateRepos);

    if (unknownRepos.size > 0) {
      warnings.push({
        code: "UnknownRepos",
        repos: Array.from(unknownRepos),
      });
    }
    const knownRepos = Array.from(candidateRepos).filter(
      (r) => !unknownRepos.has(r)
    );
    if (knownRepos.length > 0) {
      zoektParts.push(renderRepoQuery(knownRepos));
    }
  }

  if (type) {
    const mapped = languageNames.get(type);
    if (!mapped) {
      warnings.push({
        code: "UnsupportedLanguage",
        language: type,
      });
    } else {
      zoektParts.push(`lang:${mapped}`);
    }
  }

  if (zoektQuery === null) {
    return {
      luceneQuery,
      zoektQuery: null,
      warnings,
    };
  } else {
    zoektParts.push(zoektQuery);
    return {
      luceneQuery,
      zoektQuery: zoektParts.join(" "),
      warnings,
    };
  }
};

/** OpenGrok /search URL parameters. */
export type OpenGrokSearchParams = {
  readonly full?: string;
  readonly defs?: string;
  readonly refs?: string;
  readonly path?: string;
  readonly hist?: string;
  readonly type?: string;
  readonly sort?: string;
  readonly project?: string;
  readonly searchall?: true;
  readonly start?: number;
};

export type ConversionDependencies = {
  // Maps OpenGrok project names to zoekt repos.
  readonly projectToRepo: ReadonlyMap<string, string>;
  // Returns which of the given repos are not present in the zoekt instance.
  readonly queryUnknownRepos: (candidates: Set<string>) => Promise<Set<string>>;
};

export type ZoektConversionResult = {
  // What's consumed. May be null if all parameters are missing.
  readonly luceneQuery: string | null;
  // What's produced. May be null if conversion fails.
  readonly zoektQuery: string | null;
  // Problems with consumption and production.
  readonly warnings: ReadonlyArray<ZoektConversionWarning>;
};

/** Recursively render an OpenGrok lucene query AST into a Zoekt query. */
const renderAst = (
  astNode: lucene.AST | lucene.Node,
  pushDownField?: PushDownField
): RenderResult => {
  if ("left" in astNode) {
    const { left, parenthesized } = astNode;
    const field = resolveField(astNode, pushDownField);

    const rendered =
      "right" in astNode
        ? renderInfixExpression(
            renderAst(left, field),
            astNode.operator,
            renderAst(astNode.right, field)
          )
        : renderAst(left, field);
    return parenthesized &&
      rendered.zoektQuery &&
      // Only retain parentheses if we think they're needed; while this simple
      // heuristic produces false positives, it's good enough.
      /\s+/.test(rendered.zoektQuery)
      ? { zoektQuery: `(${rendered.zoektQuery})`, warnings: rendered.warnings }
      : rendered;
  } else if ("term" in astNode) {
    return renderTermNode(astNode, pushDownField);
  } else if ("term_min" in astNode) {
    // It's a range node. These are not supported.
    return {
      zoektQuery: null,
      warnings: [
        {
          code: "RangeTermNotSupported",
          // For whatever reason, `termLocation` is not provided on range nodes;
          // fieldLocation is better than nothing; range nodes inherently have a
          // field, so it will always be defined.
          location: extractQueryLocation(astNode.fieldLocation),
        },
      ],
    };
  } else {
    const unreachable: never = astNode;
    throw new Error(`unreachable ${JSON.stringify(unreachable)}`);
  }
};

/**
 * When rendering a complex parenthesized lucene field to zoekt, it must be
 * "pushed down" to the term nodes to be rendered correctly, e.g.:
 *
 * defs(foo || bar) => sym:foo or sym:bar
 *
 * This optional parameter carries that data down through the recursion.
 */
type PushDownField = {
  readonly name: string;
  // The location is included so that warnings may be correctly attributed.
  readonly location: QueryLocation;
};

type RenderResult = Pick<ZoektConversionResult, "zoektQuery" | "warnings">;

/** Chooses what the relevant field is for this AST node, if any. */
const resolveField = (
  astField: lucene.ASTField,
  pushDownField: PushDownField | undefined
): PushDownField | undefined => {
  if (astField.field && astField.field !== "<implicit>") {
    return {
      name: astField.field,
      location: extractQueryLocation(astField.fieldLocation),
    };
  } else {
    return pushDownField;
  }
};

const renderInfixExpression = (
  left: RenderResult,
  operator: lucene.Operator,
  right: RenderResult
): RenderResult => {
  const warnings = [...left.warnings, ...right.warnings];
  if (left.zoektQuery && right.zoektQuery) {
    // Both halves rendered successfully. Combine them.
    let rendered: string;
    if (
      operator === "AND" ||
      // In OpenGrok, the default operator is AND
      operator === "<implicit>" ||
      // @ts-expect-error the types incorrectly fail to include this operator
      operator === "&&"
    ) {
      // AND is implicit in zoekt
      rendered = `${left.zoektQuery} ${right.zoektQuery}`;
    } else if (
      operator === "OR" ||
      // @ts-expect-error the types incorrectly fail to include this operator
      operator === "||"
    ) {
      rendered = `${left.zoektQuery} or ${right.zoektQuery}`;
    } else if (operator === "AND NOT" || operator === "NOT") {
      rendered = `${left.zoektQuery} -${
        // Add parentheses if necessary.
        right.zoektQuery.startsWith("(")
          ? right.zoektQuery
          : `${maybeParenthesize(right.zoektQuery)}`
      }`;
    } else if (operator === "OR NOT") {
      rendered = `${left.zoektQuery} or -${
        // Add parentheses if necessary.
        right.zoektQuery.startsWith("(")
          ? right.zoektQuery
          : `${maybeParenthesize(right.zoektQuery)}`
      }`;
    } else {
      const unreachable: never = operator;
      throw new Error(`unreachable ${unreachable}`);
    }
    return { zoektQuery: rendered, warnings };
  } else if (left.zoektQuery) {
    // Only the left half rendered successfully.
    return { zoektQuery: left.zoektQuery, warnings };
  } else if (right.zoektQuery) {
    // Only the right half rendered successfully.
    return { zoektQuery: right.zoektQuery, warnings };
  } else {
    // Neither half rendered successfully.
    return { zoektQuery: null, warnings };
  }
};

const renderTermNode = (
  node: lucene.NodeTerm,
  pushDownField?: PushDownField
): RenderResult => {
  const {
    term,
    prefix,
    quoted,
    regex,
    termLocation,
    boost,
    // @ts-expect-error proximity is missing from the types, but can be
    // produced with something like `"foo bar"~10`
    proximity,
    similarity,
  } = node;
  const field = resolveField(node, pushDownField);
  if (field?.name === "hist") {
    return {
      zoektQuery: null,
      warnings: [
        {
          code: "HistoryNotSupported",
          location: field.location,
        },
      ],
    };
  }

  if (proximity != null) {
    // Abort, there is nothing remotely close to this in zoekt.
    return {
      zoektQuery: null,
      warnings: [
        {
          code: "ProximityNotSupported",
          location: extractQueryLocation(termLocation),
        },
      ],
    };
  }

  if (similarity != null) {
    // Abort, there is nothing remotely close to this in zoekt.
    return {
      zoektQuery: null,
      warnings: [
        {
          code: "SimilarityNotSupported",
          location: extractQueryLocation(termLocation),
        },
      ],
    };
  }

  const warnings: Array<ZoektConversionWarning> = [];
  if (field?.name === "refs") {
    warnings.push({
      code: "ReferencesNotSupported",
      location: field.location,
    });
  } else if (field && field.name !== "defs" && field.name !== "path") {
    return {
      zoektQuery: null,
      warnings: [
        {
          code: "UnsupportedField",
          field: field.name,
          location: field.location,
        },
      ],
    };
  }

  if (boost != null) {
    warnings.push({
      code: "BoostNotSupported",
      location: extractQueryLocation(termLocation),
    });
    // Continue on with the unboosted term, semantics are similar enough.
  }

  let renderedPrefix: string;
  if (prefix === "!" || prefix === "-") {
    renderedPrefix = "-";
  } else {
    // '+', the final possible lucene prefix, is the default in zoekt.
    renderedPrefix = "";
  }

  let renderedField: string;
  if (field?.name === "defs") {
    renderedField = "sym:";
  } else if (field?.name === "path") {
    renderedField = "file:";
  } else {
    renderedField = "";
  }

  let renderedTerm: string;
  if (regex) {
    renderedTerm = term;
  } else {
    const escapedTerm = escapeLuceneTerm(term);
    // `quoted` is mutually exclusive with `regex`
    renderedTerm = quoted ? `"${escapedTerm}"` : escapedTerm;
  }

  return {
    zoektQuery: `${renderedPrefix}${renderedField}${renderedTerm}`,
    warnings,
  };
};

const extractQueryLocation = (
  luceneLocation:
    | {
        start: lucene.TermLocation;
        end: lucene.TermLocation;
      }
    | null
    | undefined
): QueryLocation => {
  if (luceneLocation == null) {
    // This is just the types being bad, I'm pretty sure.
    throw new Error("Unexpected null luceneLocation");
  }
  const {
    start: { offset: start },
    end: { offset: end },
  } = luceneLocation;
  return { start, end };
};

/**
 * Maps OpenGrok "types" to Zoekt/enry languages.
 *
 * Not all types are mappable, especially those for compressed archives, the
 * searching of which is a feature OpenGrok has that Zoekt does not.
 */
const languageNames: ReadonlyMap<string, string | null> = new Map([
  ["ada", "ada"],
  ["asm", "asm"],
  ["bzip2", null],
  ["c", "c"],
  ["clojure", "clojure"],
  ["csharp", "csharp"],
  ["cxx", "c++"],
  ["eiffel", "eiffel"],
  ["elf", null],
  ["erlang", "erlang"],
  ["file", null],
  ["fortran", "fortran"],
  ["golang", "golang"],
  ["gzip", null],
  ["haskell", "haskell"],
  ["hcl", "hcl"],
  ["jar", null],
  ["java", "java"],
  ["javaclass", null],
  ["javascript", "javascript"],
  ["json", "json"],
  ["kotlin", "kotlin"],
  ["lisp", "lisp"],
  ["lua", "lua"],
  ["mandoc", "roff"],
  ["pascal", "pascal"],
  ["perl", "perl"],
  ["php", "php"],
  ["plain", "text"],
  ["plsql", "plsql"],
  ["powershell", "powershell"],
  ["python", "python"],
  ["r", "r"],
  ["ruby", "ruby"],
  ["rust", "rust"],
  ["scala", "scala"],
  ["sh", "shell"],
  ["sql", "sql"],
  ["swift", "swift"],
  ["tar", null],
  ["tcl", "tcl"],
  ["terraform", "terraform"],
  ["troff", "troff"],
  ["typescript", "typescript"],
  ["uuencode", null],
  ["vb", "vb6"],
  ["verilog", "verilog"],
  ["xml", "xml"],
  ["zip", null],
]);

// This is a quick heuristic to only parenthesize expressions if it may be
// necessary, to increase readability. It'll have false positives, but that's
// okay.
const maybeParenthesize = (s: string) => (/\s+/.test(s) ? `(${s})` : s);

export const renderRepoQuery = (repos: ReadonlyArray<string>) =>
  `repo:${repos
    // Zoekt interprets `repo` values as regular expressions; escape so
    // that nothing is unintentionally matched.
    .map(escapeRegExp)
    // We want exact matches.
    .map((escaped) => `^${escaped}$`)
    .join("|")}`;

// https://stackoverflow.com/a/6969486
const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Like the above, but converts Lucene wildcards into their RegExp equivalents.
const escapeLuceneTerm = (s: string) =>
  s.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(
    /[?*]/g,
    // i.e. `.*` or `.?`
    ".$&"
  );
