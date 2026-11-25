// CommitURLTemplate and FileURLTemplate used to be simple. No longer:
// https://github.com/sourcegraph/zoekt/commit/5687809315075882a8e7413bdb17b042f3394c02
//
// These functions handle both the old and new versions of the templates.

// Zoekt may put more template text after the URLJoinPath block. Bitbucket
// Server's file template is one such case:
//   {{URLJoinPath "https://host/projects/P/repos/r/browse" .Path}}?at={{.Version}}
const urlJoinPathTemplate =
  /^{{\s*URLJoinPath\s+(?<args>.*?)\s*}}(?<suffix>.*)$/;

// The suffix sits outside the joined path, typically in the query string, so
// variables in it are encoded as single components rather than path segments.
const evaluateSuffix = (
  suffix: string,
  variables: { version: string; path?: string },
): string =>
  suffix
    .replaceAll("{{.Version}}", () => encodeURIComponent(variables.version))
    .replaceAll("{{.Path}}", () => encodeURIComponent(variables.path ?? ""));

export const evaluateFileUrlTemplate = (
  template: string,
  version: string,
  path: string,
): string => {
  const match = template.match(urlJoinPathTemplate);
  if (match?.groups) {
    const { args, suffix } = match.groups;
    return args
      .split(/\s+/)
      .map((s) => {
        if (s === ".Version") {
          return version.split("/").map(encodeURIComponent).join("/");
        } else if (s === ".Path") {
          return path.split("/").map(encodeURIComponent).join("/");
        } else {
          // It's a quoted string: https://pkg.go.dev/strconv#Quote.
          return JSON.parse(s);
        }
      })
      .join("/")
      .concat(evaluateSuffix(suffix, { version, path }));
  } else {
    return (
      template
        // We use the function version of replaceAll because it interprets a
        // variety of characters in strings specially. Only functions guarantee
        // literal replacement.
        .replaceAll("{{.Version}}", () => version)
        .replaceAll("{{.Path}}", () => path)
    );
  }
};

export const evaluateCommitUrlTemplate = (
  template: string,
  version: string,
): string => {
  const match = template.match(urlJoinPathTemplate);
  if (match?.groups) {
    const { args, suffix } = match.groups;
    return args
      .split(/\s+/)
      .map((s) => {
        if (s === ".Version") {
          return version.split("/").map(encodeURIComponent).join("/");
        } else {
          // It's a quoted string: https://pkg.go.dev/strconv#Quote.
          return JSON.parse(s);
        }
      })
      .join("/")
      .concat(evaluateSuffix(suffix, { version }));
  } else {
    // We use the function version of replaceAll because it interprets a
    // variety of characters in strings specially. Only functions guarantee
    // literal replacement.
    return template.replaceAll("{{.Version}}", () => version);
  }
};
