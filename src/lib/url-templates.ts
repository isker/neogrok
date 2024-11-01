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
          return version;
        } else if (s === ".Path") {
          return path;
        } else {
          // It's a quoted string: https://pkg.go.dev/strconv#Quote.
          return JSON.parse(s);
        }
      })
      .join("/");
  } else {
    return template
      .replaceAll("{{.Version}}", version)
      .replaceAll("{{.Path}}", path);
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
          return version;
        } else {
          // It's a quoted string: https://pkg.go.dev/strconv#Quote.
          return JSON.parse(s);
        }
      })
      .join("/");
  } else {
    return template.replaceAll("{{.Version}}", version);
  }
};
