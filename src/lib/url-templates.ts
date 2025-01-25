// CommitURLTemplate and FileURLTemplate used to be simple. No longer:
// https://github.com/sourcegraph/zoekt/commit/5687809315075882a8e7413bdb17b042f3394c02
//
// These functions handle both the old and new versions of the templates.

const urlJoinPathTemplate = /^{{\s*URLJoinPath\s+(?<args>.*?)\s*}}$/;

export const evaluateFileUrlTemplate = (
  template: string,
  version: string,
  path: string,
): string => {
  const match = template.match(urlJoinPathTemplate);
  if (match?.groups) {
    const { args } = match.groups;
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
      .join("/");
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
    const { args } = match.groups;
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
      .join("/");
  } else {
    // We use the function version of replaceAll because it interprets a
    // variety of characters in strings specially. Only functions guarantee
    // literal replacement.
    return template.replaceAll("{{.Version}}", () => version);
  }
};
