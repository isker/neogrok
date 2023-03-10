import {
  memo,
  startTransition,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import prettyBytes from "pretty-bytes";
import {
  listRepositories,
  ListResults,
  Repository as ApiRepository,
} from "./list-repositories-api";
import { Link } from "./nav";
import { useSearchFormReactKey } from "./use-search-form-react-key";

const Repositories = () => {
  const { key: searchFormKey, keyChanged } = useSearchFormReactKey();
  const listOutcome = useListOutcome();
  if (keyChanged) {
    return null;
  }

  let mainContent;
  if (listOutcome.kind === "none") {
    mainContent = <SearchForm key={searchFormKey} />;
  } else if (listOutcome.kind === "error") {
    mainContent = (
      <>
        <SearchForm key={searchFormKey} error={listOutcome.error} />
        {listOutcome.previousResults ? (
          <RepositoriesList results={listOutcome.previousResults} />
        ) : null}
      </>
    );
  } else {
    mainContent = (
      <>
        <SearchForm key={searchFormKey} />
        <RepositoriesList results={listOutcome.results} />
      </>
    );
  }

  return mainContent;
};

export { Repositories as Component };

const useRouteListQuery = (): [string | undefined, (query: string) => void] => {
  const [searchParams, setSearchParams] = useSearchParams();
  const routeQuery = searchParams.get("q");

  // coerce the empty string to undefined
  const parsedQuery = routeQuery || undefined;

  const lastNavigateTime = useRef(0);
  const setRouteQuery = useCallback(
    (newQuery: string) => {
      const queryChanged = (newQuery || undefined) !== parsedQuery;
      if (queryChanged) {
        const now = Date.now();
        setSearchParams(
          (previous) => {
            const next = new URLSearchParams(previous);
            if (newQuery) {
              next.set("q", newQuery);
            } else {
              next.delete("q");
            }
            return next;
          },
          {
            replace: now - lastNavigateTime.current < 2000,
          }
        );
        lastNavigateTime.current = now;
      }
    },
    [parsedQuery, setSearchParams]
  );

  return [parsedQuery, setRouteQuery];
};

const debounceListRepositories = (rate: number): typeof listRepositories => {
  let timeoutId: number | undefined;
  return (...args) => {
    clearTimeout(timeoutId);
    return new Promise((resolve, reject) => {
      const ourTimeoutId = setTimeout(() => {
        listRepositories(...args).then(resolve, reject);
      }, rate);
      const [, signal] = args;
      signal.addEventListener("abort", () => clearTimeout(ourTimeoutId), {
        once: true,
      });
      timeoutId = ourTimeoutId;
    });
  };
};
const debouncedListRepositories = debounceListRepositories(100);

type ListOutcome =
  | { kind: "none" }
  | {
      kind: "success";
      results: ListResults;
    }
  | {
      kind: "error";
      error: string;
      previousResults: ListResults | undefined;
    };
const useListOutcome = (): ListOutcome => {
  const [listQuery] = useRouteListQuery();
  const [listOutcome, setListOutcome] = useState<ListOutcome>({ kind: "none" });

  useEffect(() => {
    document.title = `${
      listQuery ? `${listQuery} - ` : ""
    }neogrok/repositories`;

    const abortController = new AbortController();
    debouncedListRepositories({ query: listQuery }, abortController.signal)
      .then((result) => {
        startTransition(() => {
          if (result.kind === "error") {
            setListOutcome((previous) => ({
              ...result,
              previousResults: computePreviousResults(previous),
            }));
          } else {
            setListOutcome(result);
          }
        });
      })
      .catch((error) => {
        if (error.name !== "AbortError") {
          // eslint-disable-next-line no-console
          console.error("List repositories failed", error);
          startTransition(() =>
            setListOutcome((previous) => ({
              kind: "error",
              error: error.toString(),
              previousResults: computePreviousResults(previous),
            }))
          );
        }
      });
    return () => abortController.abort();
  }, [listQuery]);

  return listOutcome;
};

const computePreviousResults = (previousOutcome: ListOutcome) => {
  if (previousOutcome.kind === "none") {
    return undefined;
  } else if (previousOutcome.kind === "error") {
    return previousOutcome.previousResults;
  } else {
    return previousOutcome.results;
  }
};

const SearchForm = ({ error }: { error?: string }) => {
  const [listQuery, setListQuery] = useRouteListQuery();

  return (
    <>
      <label
        htmlFor="query"
        title="Same query syntax as the main search - use `r:name` to filter repositories by name, otherwise you are filtering them by their content!"
        className="flex"
      >
        <span className="inline-block p-1 pr-2 bg-gray-300 border border-gray-400 cursor-help">
          Search repositories
        </span>
        <input
          id="query"
          type="search"
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
          className={`p-1 border shadow-sm focus:outline-none flex-auto appearance-none ${
            error === undefined
              ? "border-slate-300 focus:border-sky-500"
              : "border-red-500"
          }`}
          value={listQuery ?? ""}
          onChange={(e) => {
            setListQuery(e.target.value);
          }}
        />
      </label>
      {error !== undefined ? (
        <span className="text-sm text-red-500">{error} </span>
      ) : null}
    </>
  );
};

// eslint-disable-next-line prefer-arrow-callback
const RepositoriesList = memo(function RepositoriesList({
  results,
}: {
  results: ListResults;
}) {
  const {
    stats: { fileCount, indexBytes, contentBytes },
    repositories,
  } = results;
  const sorted = Array.from(repositories)
    .sort(({ name: a }, { name: b }) => a.localeCompare(b))
    .sort(({ id: a }, { id: b }) => a - b)
    .sort(({ rank: a }, { rank: b }) => a - b);
  return (
    <>
      <h1 className="text-xs py-1">
        {repositories.length}{" "}
        {repositories.length === 1 ? "repository" : "repositories"} containing{" "}
        {fileCount} files consuming{" "}
        {prettyBytes(indexBytes + contentBytes, { space: false })} of RAM
      </h1>
      <div className="overflow-x-auto">
        <table className="border-collapse text-sm w-full text-center">
          <thead>
            <tr className="border bg-slate-100">
              <th className="p-1">Repository</th>
              <th className="p-1">File count</th>
              <th className="p-1">Branches</th>
              <th className="p-1">Content size in RAM</th>
              <th className="p-1">Index size in RAM</th>
              <th className="p-1">Last indexed</th>
              <th className="p-1">Last commit</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((repo) => (
              <Repository key={repo.name} repository={repo} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
});

const Repository = ({
  repository: {
    name,
    url,
    lastIndexed,
    lastCommit,
    branches,
    stats: { fileCount, indexBytes, contentBytes },
  },
}: {
  repository: ApiRepository;
}) => (
  <tr className="border">
    <td className="p-1">
      {url.length > 0 ? <Link to={url}>{name}</Link> : name}
    </td>
    <td className="p-1">{fileCount}</td>
    <td className="p-1">
      {branches
        .map(({ name: branchName, version }) => `${branchName}@${version}`)
        .join(" ")}
    </td>
    <td className="p-1">{prettyBytes(contentBytes, { space: false })}</td>
    <td className="p-1">{prettyBytes(indexBytes, { space: false })}</td>
    <td className="p-1">{toISOStringWithoutMs(lastIndexed)}</td>
    <td className="p-1">{toISOStringWithoutMs(lastCommit)}</td>
  </tr>
);

// Trying to make these strings less obnoxiously long.
const toISOStringWithoutMs = (d: Date) =>
  d.toISOString().replace(/\.\d{3}Z$/, "Z");
