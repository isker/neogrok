import { Fragment, memo, startTransition, useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { LineToken, parseIntoLines } from "./content-parser";
import { ResultFile, search, SearchResult } from "./search-api";
import { useRouteSearchQuery } from "./use-route-search-query";

const SearchPage = () => {
  const searchState = useSearchState();

  return (
    <div className="container mx-auto">
      <Nav />
      <main>
        <SearchForm />
        <SearchResults searchState={searchState} />
      </main>
    </div>
  );
};

type SearchState =
  // This state is only used on initial page load so we don't flash the lander
  // UI. Subsequent queries don't get this state so that the results don't
  // flash away. This is kind of dumb.
  | { kind: "querying" }
  | { kind: "result"; result: SearchResult }
  | { kind: "error"; error: Error };

const useSearchState = () => {
  const [searchQuery] = useRouteSearchQuery();
  const [searchState, setSearchState] = useState<SearchState | undefined>(
    searchQuery.q !== undefined ? { kind: "querying" } : undefined
  );

  // eslint-disable-next-line consistent-return
  useEffect(() => {
    const { q, ...rest } = searchQuery;
    if (q === undefined) {
      document.title = "neogrok";
      setSearchState(undefined);
    } else {
      document.title = `${q} - neogrok`;

      const abortController = new AbortController();
      debouncedSearch({ q, ...rest }, abortController.signal)
        .then((result) => {
          startTransition(() => setSearchState({ kind: "result", result }));
        })
        .catch((error) => {
          if (error.name !== "AbortError") {
            // eslint-disable-next-line no-console
            console.error("Search failed", error);
            startTransition(() => setSearchState({ kind: "error", error }));
          }
        });
      return () => abortController.abort();
    }
  }, [searchQuery]);

  return searchState;
};

const navLinks = [
  ["/", "Search"],
  // TODO implement these pages
  ["/repositories", "Repositories"],
  ["/syntax", "Query Syntax"],
  ["/about", "About"],
] as const;
const Nav = () => {
  const { pathname } = useLocation();
  return (
    <nav className="pt-2 pb-12">
      <ul className="flex justify-center text-xs">
        {navLinks.map(([url, text]) => (
          <li
            key={url}
            className="after:content-['•'] after:px-2 last:after:content-none"
          >
            {url === pathname ? (
              text
            ) : (
              <Link className="text-cyan-700" to={url}>
                {text}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
};

const debounceSearch = (rate: number): typeof search => {
  let timeoutId: number | undefined;
  return (...args) => {
    clearTimeout(timeoutId);
    return new Promise((resolve, reject) => {
      const ourTimeoutId = setTimeout(() => {
        search(...args).then(resolve, reject);
      }, rate);
      const [, signal] = args;
      signal.addEventListener("abort", () => clearTimeout(ourTimeoutId), {
        once: true,
      });
      timeoutId = ourTimeoutId;
    });
  };
};
const debouncedSearch = debounceSearch(100);

const SearchForm = () => {
  const [searchQuery, { setQuery, setContextLines, setFiles }] =
    useRouteSearchQuery();

  // For the inputs with validations, we need control states for each that are
  // separate from the route values, which are typed and have other parsing
  // validations, meaning that they can't hold the raw form values, making them
  // unsuitable for controlling inputs.
  const [contextString, setContextString] = useState<string>(
    searchQuery.contextLines.toString()
  );
  useEffect(() => {
    setContextLines(Number.parseInt(contextString, 10));
  }, [contextString, setContextLines]);

  const [filesString, setFilesString] = useState<string>(
    searchQuery.files.toString()
  );
  useEffect(() => {
    setFiles(Number.parseInt(filesString, 10));
  }, [filesString, setFiles]);

  // TODO we need a drawer with advanced query options and UI preferences.
  // - Advanced options: matches per shard and total matches.
  // - UI preferences stored in localStorage: live search (y)/n, sort chunks by
  //   (line number) vs score, limit on number of visible matches per file before
  //   needing to expand.
  return (
    <div className="flex font-mono items-center whitespace-nowrap">
      <label
        htmlFor="query"
        className="p-1 pr-2 bg-gray-300 border border-gray-400 cursor-help"
        title="Search query"
      >
        $ grok
      </label>
      <input
        id="query"
        type="search"
        // I think autofocusing an element like this, at the top of the page,
        // is okay for a11y.  Not that half the other things here are.
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        spellCheck={false}
        className="w-full p-1 border shadow-sm border-slate-300 focus:outline-none focus:border-sky-500"
        value={searchQuery.q ?? ""}
        onChange={(e) => {
          setQuery(e.target.value);
        }}
      />
      <label
        htmlFor="context"
        className="py-1 px-2 bg-gray-300 border border-gray-400 cursor-help"
        title="Number of lines of context around matches (like grep!)"
      >
        -C
      </label>
      <input
        id="context"
        type="text"
        inputMode="numeric"
        pattern="[0-9]+"
        size={3}
        className="p-1 border shadow-sm border-slate-300 focus:outline-none valid:focus:border-sky-500 invalid:border-red-500"
        value={contextString}
        onChange={(e) => {
          setContextString(e.target.value);
        }}
      />
      <label
        htmlFor="files"
        className="py-1 px-2 bg-gray-300 border border-gray-400 cursor-help"
        title="Maximum number of files to display"
      >
        | head -n
      </label>
      <input
        id="files"
        type="text"
        inputMode="numeric"
        pattern="[0-9]+"
        size={3}
        className="p-1 border shadow-sm border-slate-300 focus:outline-none valid:focus:border-sky-500 invalid:border-red-500"
        value={filesString}
        onChange={(e) => {
          setFilesString(e.target.value);
        }}
      />
    </div>
  );
};

// We need to memo over `searchState` so that we don't rerender every time a
// character is typed into the search form; we need our rendering to happen
// post-debouncing not pre-debouncing.
// eslint-disable-next-line prefer-arrow-callback
const SearchResults = memo(function SearchResults({
  searchState,
}: {
  searchState: SearchState | undefined;
}) {
  if (searchState === undefined) {
    // This `padding-top: 30dvh` was the least terrible way I found to vertically
    // center this lander text. Anything involving grid/flexbox requires
    // cooperation with our parent component. Perhaps these non-results states
    // should be refactored out of this component anyway.
    return (
      <div className="text-center pt-[30dvh]">
        <h1 className="text-4xl tracking-wide">ɴᴇᴏɢʀᴏᴋ</h1>
        <Link to="/about" className="text-cyan-700">
          More grok than Grok.
        </Link>
      </div>
    );
  } else if (searchState.kind === "querying") {
    return null;
  } else if (searchState.kind === "error") {
    // TODO need a better UI
    // especially for HTTP 400s, which indicate syntax errors in the query.
    // We might want to render such errors closer to the inputs, and not in place
    // of any previously existing content in this component.
    return <h2>Error! {searchState.error.toString()}</h2>;
  } else {
    const {
      fileCount,
      matchCount,
      duration,
      files,
      repoUrls,
      repoLineNumberFragments,
    } = searchState.result;
    const frontendMatchCount = files
      .map(({ matches }) => matches.length)
      .reduce((a, b) => a + b, 0);
    return (
      <>
        <h1 className="text-xs flex pt-2">
          <span>
            Backend: {fileCount} {fileCount === 1 ? "file" : "files"} /{" "}
            {matchCount} {matchCount === 1 ? "match" : "matches"} /{" "}
            {
              // ns -> ms with 2 decimal places
              Math.floor(duration / 1e4) / 1e2
            }
            ms
          </span>
          <span className="ml-auto">
            Frontend: {files.length} {files.length === 1 ? "file" : "files"} /{" "}
            {frontendMatchCount} {matchCount === 1 ? "match" : "matches"} /{" "}
            {/* TODO need to have search-api return a timing, and also bake in time spent debouncing.
                Doing render time on top of that sounds too hard. */}
            TODOms
          </span>
        </h1>
        {files.map((file, i) => {
          const { repository, fileName } = file;
          return (
            <SearchResultsFile
              key={`${repository}/${fileName}`}
              file={file}
              fileUrlTemplate={repoUrls[repository]}
              lineNumberTemplate={repoLineNumberFragments[repository]}
              rank={i + 1}
            />
          );
        })}
      </>
    );
  }
});

const SearchResultsFile = ({
  file: { repository, fileName, language, matches, version },
  fileUrlTemplate,
  lineNumberTemplate,
  rank,
}: {
  file: ResultFile;
  fileUrlTemplate: string | undefined;
  lineNumberTemplate: string | undefined;
  rank: number;
}) => {
  // Search results may match not only on file contents but also the filename itself.
  // We have to especially handle such matches to render them properly.
  const fileNameMatches = matches.filter(
    ({ isFileNameMatch }) => isFileNameMatch
  );
  if (fileNameMatches.length > 1) {
    // Should only ever be one match, with one or more ranges.  Check just to be sure.
    throw new Error(
      `Unreachable: received ${fileNameMatches.length} file name matches`
    );
  }

  const fileUrl = fileUrlTemplate
    ?.replaceAll("{{.Version}}", version)
    .replaceAll("{{.Path}}", fileName);

  let renderedFileName;
  if (fileNameMatches.length === 1) {
    const [
      {
        contentBase64,
        contentStart: { byteOffset },
        ranges,
      },
    ] = fileNameMatches;
    // If you put newlines in your filenames, you deserve this to be broken.
    const [lineTokens] = parseIntoLines(contentBase64, byteOffset, ranges);
    renderedFileName = (
      <SearchResultLine key={fileName} lineTokens={lineTokens} />
    );
  } else {
    renderedFileName = fileName;
  }

  const linkedFilename = fileUrl ? (
    <a className="text-cyan-700 hover:underline decoration-1" href={fileUrl}>
      {renderedFileName}
    </a>
  ) : (
    renderedFileName
  );

  // TODO could put branch here if we care
  const metadata = [
    `${matches.length} ${matches.length === 1 ? "match" : "matches"}`,
    language,
    `№${rank}`,
  ];

  const nonFileNameMatches = matches.filter(
    ({ isFileNameMatch }) => !isFileNameMatch
  );

  // Groups of contiguous lines in the file; contiguous matches are merged into
  // a single group.
  //
  // TODO we need to cut off these sections after a certain number of matches are
  // rendered, making them invisible by default. Users don't want to see a
  // thousand matches in a single file, generally. We should have an
  // expand/collapse UI for the remainder.
  const fileSections = nonFileNameMatches
    .map(
      ({
        contentBase64,
        contentStart: {
          byteOffset: baseByteOffset,
          lineNumber: startLineNumber,
        },
        ranges,
      }) => {
        const matchLines = parseIntoLines(
          contentBase64,
          baseByteOffset,
          ranges
        );

        return matchLines.map((lineTokens, lineOffset) => ({
          lineNumber: startLineNumber + lineOffset,
          lineTokens,
        }));
      }
    )
    // Instead of simply flattening the matchLines to create the fileLines, we
    // do this reduction so that we can identify discontinuities between lines.
    .reduce<Array<Array<{ lineNumber: number; lineTokens: LineToken[] }>>>(
      (acc, matchLines) => {
        if (
          acc.length === 0 ||
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          acc.at(-1)!.at(-1)!.lineNumber !== matchLines[0].lineNumber - 1
        ) {
          acc.push(Array.from(matchLines));
        } else {
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          acc.at(-1)!.push(...matchLines);
        }
        return acc;
      },
      []
    );

  return (
    <section className="my-2 p-1 border-2 flex flex-col gap-1">
      <h2 className="px-2 py-1 text-sm items-center sticky flex bg-slate-100 top-0 whitespace-pre-wrap">
        {/* ideally we could hyperlink the repository but there is no such
        URL in search results - either we do dumb stuff to the file template URL
        or we make a separate API request for each repo

        TODO font-mono for the entire pathname looks pretty lame, but I couldn't find
        a repo/path separator that looked good with non-mono font.  Might need an SVG?
        */}
        <span className="font-mono">
          {/* eslint-disable react/jsx-no-comment-textnodes */}
          {repository}//
          {/* eslint-enable react/jsx-no-comment-textnodes */}
          {linkedFilename}
        </span>
        <span className="ml-auto">{metadata.join(" | ")}</span>
      </h2>
      {fileSections.length > 0 ? (
        <div className="font-mono text-xs divide-y">
          {fileSections.map((section) => (
            // minmax because we don't want the line number column to slide left and
            // right as you scroll down through sections with different `min-content`s'
            // worth of line numbers. 2rem is enough for 4 digits.
            <div
              key={section[0].lineNumber}
              className="py-1 grid grid-cols-[minmax(2rem,_min-content)_1fr] gap-x-2"
            >
              {section.map(({ lineNumber, lineTokens }) => {
                const linkedLineNumber =
                  fileUrl && lineNumberTemplate ? (
                    <a
                      className="hover:underline decoration-1"
                      href={`${fileUrl}${lineNumberTemplate.replaceAll(
                        "{{.LineNumber}}",
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
                    <code className="whitespace-pre-wrap">
                      <SearchResultLine lineTokens={lineTokens} />
                    </code>
                  </Fragment>
                );
              })}
            </div>
          ))}
        </div>
      ) : null}
    </section>
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

export default SearchPage;

// FIXME scary bits of context missing with blank lines, like the server isn't sending double newlines
// http://localhost:1234/?q=test
// http://localhost:1234/?q=package

// FIXME we need flex wrapping... everywhere.  Form inputs, results header, file headers, etc.
