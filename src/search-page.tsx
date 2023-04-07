import { Fragment, memo, useContext, useRef, useState } from "react";
import { json, LoaderFunction, useLoaderData } from "react-router-dom";
import { ChevronRight } from "react-feather";
import type { LineToken } from "./content-parser";
import { Link } from "./nav";
import { useSearchFormReactKey } from "./use-search-form-react-key";
import { Preferences } from "./preferences";
import {
  ResultFile,
  search as executeSearch,
  SearchResults as ApiSearchResults,
} from "./search-api";
import { parseSearchParams } from "./use-route-search-query";
import { Lander } from "./lander";
import { SearchForm } from "./search-form";

const SearchPage = () => {
  const { key: searchFormKey, keyChanged } = useSearchFormReactKey();
  // @ts-expect-error remix has a better typing system for loaders so that we
  // won't need to cast.
  const searchOutcome: SearchOutcome = useLoaderData();
  const [previousResults, setPreviousResults] = useState<TimedSearchResults>();

  if (keyChanged) {
    return null;
  }

  if (
    searchOutcome.kind === "success" &&
    searchOutcome.results !== previousResults
  ) {
    setPreviousResults(searchOutcome.results);
    return null;
  } else if (searchOutcome.kind === "none" && previousResults !== undefined) {
    setPreviousResults(undefined);
    return null;
  }

  if (searchOutcome.kind === "none") {
    return (
      <>
        <SearchForm key={searchFormKey} />
        <Lander />
      </>
    );
  } else if (searchOutcome.kind === "error") {
    return (
      <>
        <SearchForm key={searchFormKey} queryError={searchOutcome.error} />
        {previousResults ? (
          <SearchResults results={previousResults} />
        ) : (
          <Lander />
        )}
      </>
    );
  } else {
    return (
      <>
        <SearchForm key={searchFormKey} />
        <SearchResults results={searchOutcome.results} />
      </>
    );
  }
};

export { SearchPage as Component };

type SearchOutcome =
  | { kind: "none" }
  // TODO for long searches, we should consider a `pending` outcome with
  // `defer`/`Suspense`/`Await`.  Needs benchmarking to determine just how
  // slow a zoekt backend can get with large repositories.
  | { kind: "success"; results: TimedSearchResults }
  | { kind: "error"; error: string };
type TimedSearchResults = ApiSearchResults & { requestDuration: number };
export const loader: LoaderFunction = async ({ request }) => {
  const start = Date.now();
  const { query, ...rest } = parseSearchParams(
    new URL(request.url).searchParams
  );
  if (query === undefined) {
    return json<SearchOutcome>({ kind: "none" });
  }

  try {
    const response = await executeSearch({ query, ...rest }, request.signal);
    if (response.kind === "success") {
      return json<SearchOutcome>({
        kind: "success",
        results: { ...response.results, requestDuration: Date.now() - start },
      });
    } else {
      return json<SearchOutcome>(response);
    }
  } catch (error) {
    if (
      !(
        error &&
        typeof error === "object" &&
        "name" in error &&
        error.name === "AbortError"
      )
    ) {
      // eslint-disable-next-line no-console
      console.error("Search failed", error);
    }
    return json<SearchOutcome>({ kind: "error", error: String(error) });
  }
};

// We need to memo over `searchState` so that we don't rerender every time a
// character is typed into the search form; we need our rendering to happen
// post-debouncing not pre-debouncing.
// eslint-disable-next-line prefer-arrow-callback
const SearchResults = memo(function SearchResults({
  results: {
    backendStats: { fileCount, matchCount, filesSkipped, duration },
    files,
    requestDuration,
  },
}: {
  results: TimedSearchResults;
}) {
  const frontendMatchCount = files.reduce((n, { matchCount: m }) => n + m, 0);
  return (
    <>
      <h1 className="text-xs flex flex-wrap pt-2">
        <span>
          Backend: {fileCount} {fileCount === 1 ? "file" : "files"} /{" "}
          {matchCount} {matchCount === 1 ? "match" : "matches"}
          {filesSkipped > 0 ? (
            <>
              {" "}
              (
              <span
                title="The number of matches found on the backend exceeded the maximums, which are set to optimize performance in situations with large numbers of matches; they can be increased in the advanced options"
                className="text-yellow-700 cursor-help"
              >
                truncated
              </span>
              )
            </>
          ) : null}{" "}
          /{" "}
          {
            // ns -> ms with 2 decimal places
            Math.floor(duration / 1e4) / 1e2
          }
          ms
        </span>
        <span className="ml-auto">
          Frontend: {files.length} {files.length === 1 ? "file" : "files"} /{" "}
          {frontendMatchCount} {frontendMatchCount === 1 ? "match" : "matches"}{" "}
          / {requestDuration}ms
        </span>
      </h1>
      {files.map((file, i) => {
        const { repository, fileName } = file;
        return (
          <SearchResultsFile
            key={`${repository}/${fileName.tokens
              .map(({ text }) => text)
              .join()}@${file.branches.join(";")}`}
            file={file}
            rank={i + 1}
          />
        );
      })}
    </>
  );
});

const SearchResultsFile = ({
  file: {
    repository,
    fileName,
    matchCount: fileMatchCount,
    branches,
    language,
    chunks,
    fileUrl,
    lineNumberTemplate,
  },
  rank,
}: {
  file: ResultFile;
  rank: number;
}) => {
  const renderedFileName = <SearchResultLine lineTokens={fileName.tokens} />;
  const linkedFilename = fileUrl ? (
    <Link to={fileUrl}>{renderedFileName}</Link>
  ) : (
    renderedFileName
  );

  const { matchSortOrder, fileMatchesCutoff } = useContext(Preferences);
  const sortedChunks =
    matchSortOrder === "line-number"
      ? [...chunks].sort(
          ({ lines: [{ lineNumber: a }] }, { lines: [{ lineNumber: b }] }) =>
            a - b
        )
      : // Nothing to do otherwise; matches are already sorted by score.
        chunks;

  // Groups of contiguous lines in the file; contiguous matches are merged into
  // a single group.
  const lineGroups: Array<
    Array<{ lineNumber: number; lineTokens: LineToken[] }>
  > = [];
  let numMatchesInFileSections = 0;
  // The goal is to produce the minimal number of lineGroups that exceed the
  // cutoff. We don't want to cut a file section in half to make the exact
  // cutoff (nor can we, if the cutoff is exceeded in the middle of a single
  // line).
  // This state var is only used if we have actually exceeded the cutoff.
  //
  // FIXME the value of `expandedBy` is wrong if the sort order changes while
  // it's non-undefined. That will not be a trivial fix.
  const [expandedBy, setExpandedBy] = useState<number>();
  // That being said, we do special case a 0-cutoff by simply rendering no
  // lineGroups.
  if (fileMatchesCutoff !== 0 || expandedBy) {
    for (const { matchCount, lines } of sortedChunks) {
      const [{ lineNumber: startLineNumber }] = lines;
      const contiguous =
        lineGroups.at(-1)?.at(-1)?.lineNumber === startLineNumber - 1;

      if (
        !contiguous &&
        numMatchesInFileSections >= fileMatchesCutoff &&
        !expandedBy
      ) {
        break;
      }

      numMatchesInFileSections += matchCount;

      if (contiguous) {
        // By the definition of `contiguous` we know this exists.
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        lineGroups.at(-1)!.push(...lines);
      } else {
        // Make a copy. We will be mutating it.
        lineGroups.push([...lines]);
      }
    }
  }

  const numHiddenMatches =
    fileMatchCount - numMatchesInFileSections - fileName.matchCount;

  const metadata = [
    `${fileMatchCount} ${fileMatchCount === 1 ? "match" : "matches"}`,
    // I don't like every result just yelling HEAD, it's not particularly useful
    // information.
    ...(branches.length > 1 || branches[0] !== "HEAD"
      ? [branches.join(", ")]
      : []),
    language,
    `№${rank}`,
  ];

  const topOfList = useRef<HTMLDivElement>(null);
  return (
    <>
      <span ref={topOfList} />
      <section className="my-2 p-1 border-2 flex flex-col gap-1">
        <h2 className="px-2 py-1 text-sm sticky top-0 flex flex-wrap bg-slate-100 whitespace-pre-wrap [overflow-wrap:anywhere]">
          {/* ideally we could hyperlink the repository but there is no such
          URL in search results - either we do dumb stuff to the file template URL
          or we make a separate /list API request for each repo */}
          <span>
            {repository}
            <ChevronRight className="inline" size={16} />
            {linkedFilename}
          </span>
          <span className="ml-auto">{metadata.join(" | ")}</span>
        </h2>
        {lineGroups.length > 0 ? (
          <div className="font-mono text-sm divide-y">
            {lineGroups.map((lines) => (
              // minmax because we don't want the line number column to slide left and
              // right as you scroll down through sections with different `min-content`s'
              // worth of line numbers. 2rem is enough for 4 digits.
              <div
                key={lines[0].lineNumber}
                className="py-1 grid grid-cols-[minmax(2rem,_min-content)_1fr] gap-x-2 whitespace-pre overflow-x-auto"
              >
                {lines.map(({ lineNumber, lineTokens }) => {
                  const linkedLineNumber =
                    fileUrl && lineNumberTemplate ? (
                      <a
                        className="hover:underline decoration-1"
                        href={`${fileUrl}${lineNumberTemplate.join(
                          lineNumber.toString()
                        )}`}
                      >
                        {lineNumber}
                      </a>
                    ) : (
                      lineNumber
                    );
                  return (
                    <Fragment key={lineNumber}>
                      <span className="select-none text-gray-600 text-right pr-1">
                        {linkedLineNumber}
                      </span>
                      <code>
                        <SearchResultLine lineTokens={lineTokens} />
                      </code>
                    </Fragment>
                  );
                })}
              </div>
            ))}
          </div>
        ) : null}
        {numHiddenMatches > 0 && !expandedBy ? (
          <button
            type="button"
            onClick={() => setExpandedBy(numHiddenMatches)}
            className="bg-slate-100 text-sm py-1"
          >
            Show {numHiddenMatches} more{" "}
            {numHiddenMatches === 1 ? "match" : "matches"}
          </button>
        ) : null}
        {expandedBy ? (
          <button
            type="button"
            onClick={async () => {
              // If we've scrolled down so that the top of the list is not
              // visible, scroll it back into view. Only after scrolling is
              // complete do we close the list, to minimize confusion caused by
              // the motion.
              if (topOfList.current) {
                const top = topOfList.current;
                await new Promise<void>((resolve) => {
                  const observer = new IntersectionObserver((entries) => {
                    if (entries.some(({ isIntersecting }) => isIntersecting)) {
                      observer.disconnect();
                      resolve();
                    }
                  });
                  observer.observe(top);
                  top.scrollIntoView({
                    block: "nearest",
                    behavior: "smooth",
                  });
                });
              }
              setExpandedBy(undefined);
            }}
            className="bg-slate-100 text-sm py-1 sticky bottom-0"
          >
            Hide {expandedBy} {expandedBy === 1 ? "match" : "matches"}
          </button>
        ) : null}
      </section>
    </>
  );
};

const SearchResultLine = ({
  lineTokens,
}: {
  lineTokens: ReadonlyArray<LineToken>;
}) => (
  <>
    {lineTokens.map(({ kind, text, startByteOffset }) =>
      kind === "context" ? (
        text
      ) : (
        <span className="bg-yellow-200" key={startByteOffset}>
          {text}
        </span>
      )
    )}
  </>
);
