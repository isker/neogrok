export type ZoektConversionWarning =
  | {
      readonly code: "LuceneParseError";
      readonly message: string;
      readonly location: QueryLocation;
    }
  | { readonly code: "HistoryNotSupported"; readonly location: QueryLocation }
  | { readonly code: "PaginationNotSupported" }
  | {
      readonly code: "ReferencesNotSupported";
      readonly location: QueryLocation;
    }
  | { readonly code: "PathCannotContainSlashes" }
  | {
      readonly code: "UnsupportedField";
      readonly field: string;
      readonly location: QueryLocation;
    }
  | {
      readonly code: "BoostNotSupported";
      readonly location: QueryLocation;
    }
  | {
      readonly code: "SimilarityNotSupported";
      readonly location: QueryLocation;
    }
  | {
      readonly code: "ProximityNotSupported";
      readonly location: QueryLocation;
    }
  | {
      readonly code: "RangeTermNotSupported";
      readonly location: QueryLocation;
    }
  | { readonly code: "SortOrderNotSupported"; sortOrder: string }
  | {
      readonly code: "ConvertedProjects";
      readonly conversions: { readonly [project: string]: string };
    }
  | {
      readonly code: "UnknownRepos";
      readonly repos: ReadonlyArray<string>;
    }
  | { readonly code: "UnsupportedLanguage"; readonly language: string };

export type QueryLocation = {
  // these are string indices
  start: number;
  end: number;
};

export const renderWarning = (
  warning: ZoektConversionWarning,
): { message: string; location?: QueryLocation } => {
  const location = "location" in warning ? warning.location : undefined;
  return { message: renderWarningMessage(warning), location };
};

const renderWarningMessage = (warning: ZoektConversionWarning): string => {
  switch (warning.code) {
    case "LuceneParseError":
      return `Error parsing the OpenGrok Lucene query: ${warning.message}`;
    case "HistoryNotSupported":
      return "OpenGrok VCS history search (`hist`) is not supported in neogrok";
    case "PaginationNotSupported":
      return "Pagination (`start`) is not supported in neogrok; this parameter has been ignored";
    case "ReferencesNotSupported":
      return "OpenGrok references search (`refs`) is not supported in neogrok; doing a normal search instead";
    case "PathCannotContainSlashes":
      return "OpenGrok path searches (`path`) including slashes can't be automatically converted by neogrok; you can manually convert the query using zoekt `file:` search instead";
    case "UnsupportedField":
      return `Given OpenGrok Lucene field is not recognized: ${warning.field}`;
    case "BoostNotSupported":
      return "Lucene term 'boost' modifiers are not supported in neogrok; the term has been converted without boosting";
    case "SimilarityNotSupported":
      return "Lucene term 'similarity' searches are not supported in neogrok";
    case "ProximityNotSupported":
      return "Lucene phrase 'proximity' searches are not supported in neogrok";
    case "RangeTermNotSupported":
      return "Lucene 'range' terms are not supported in neogrok";
    case "SortOrderNotSupported":
      return `The given OpenGrok sort order ${warning.sortOrder} is not supported in neogrok; neogrok `;
    case "ConvertedProjects":
      return `The following OpenGrok projects have been renamed to neogrok repositories: ${Object.entries(
        warning.conversions,
      )
        .map(([project, repo]) => `${project} -> ${repo}`)
        .join(", ")}`;
    case "UnknownRepos":
      return `The following neogrok repositories do not exist in the backing zoekt instance and have been discarded from the query: ${warning.repos.join(
        ", ",
      )}`;
    case "UnsupportedLanguage":
      return `The given OpenGrok file type could not be converted to a neogrok language (\`lang:\`): ${warning.language}`;
    default: {
      const unreachable: never = warning;
      throw new Error(`Unreachable ${unreachable}`);
    }
  }
};
