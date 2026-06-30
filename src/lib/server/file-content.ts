import * as v from "@badrap/valita";
import type { ReadonlyDeep } from "type-fest";
import { escapeRegExp } from "$lib/regexp";
import { makeZoektRequest, zoektErrorResponse } from "./zoekt-client";

export type FileContentQuery = {
  readonly repository: string;
  readonly fileName: string;
  // Branch is only meaningful for VCS-backed repos that have more than one of
  // them; it's optional, like it is in zoekt's own `/print`.
  readonly branch?: string;
};

export type FileContentResponse =
  | { kind: "success"; result: FileContent }
  | { kind: "notFound" }
  | { kind: "error"; error: string };

export type FileContent = ReadonlyDeep<{
  repository: string;
  fileName: string;
  language: string;
  branches: ReadonlyArray<string>;
  lines: ReadonlyArray<string>;
}>;

// Builds a zoekt query atom that matches `value` exactly in the given field.
//
// zoekt parses `q` as a query string. Its tokenizer ends an unquoted token at
// whitespace but preserves backslash escapes within it, whereas its
// quoted-string parser *strips* backslashes. So we anchor and regex-escape the
// value and leave it unquoted, so the escapes survive. Two characters then need
// extra handling: a literal `"` would otherwise open a quoted region (escaping
// it as `\"` keeps a literal quote, since the tokenizer preserves `\"`
// unquoted), and a literal space would terminate the token (so we wrap spaces
// in their own quoted segment). The result pins the query to exactly this
// repo/file even when the path contains spaces, quotes, or regex metacharacters.
const exactMatchAtom = (field: string, value: string): string =>
  `${field}:^${escapeRegExp(value)
    .replaceAll('"', '\\"')
    .replaceAll(" ", '" "')}$`;

// Fetches the entire contents of a single file from zoekt. This is the
// mechanism behind neogrok's file preview, and is the direct analog of zoekt's
// own `/print` endpoint: it runs a whole-file search (`Whole: true`) scoped to
// exactly one file, then renders the returned content.
export const getFileContent = async (
  { repository, fileName, branch }: FileContentQuery,
  f: typeof fetch,
): Promise<FileContentResponse> => {
  const queryParts = [
    exactMatchAtom("repo", repository),
    exactMatchAtom("file", fileName),
  ];
  if (branch) {
    // Unlike repo/file, zoekt matches `branch:` as a literal substring, not a
    // regexp - so no anchoring or escaping, just quote any spaces. This mirrors
    // exactly what zoekt's own `/print` does with its branch parameter.
    queryParts.push(`branch:${branch.replaceAll(" ", '" "')}`);
  }

  const body = JSON.stringify({
    q: queryParts.join(" "),
    opts: {
      Whole: true,
      // We only ever want the single matching file; we render the whole thing
      // rather than any particular matches within it.
      MaxDocDisplayCount: 2,
    },
  });

  const response = await makeZoektRequest(f, "/api/search", body);

  if (!response.ok) {
    return zoektErrorResponse(response, "Fetching file content failed");
  }

  const { files } = fileContentResultSchema.parse(await response.json(), {
    mode: "strip",
  }).Result;

  if (files.length === 0) {
    return { kind: "notFound" };
  } else if (files.length > 1) {
    return {
      kind: "error",
      error: `Ambiguous file: ${files.length} files matched repository "${repository}" and file "${fileName}"`,
    };
  }

  return { kind: "success", result: files[0] };
};

const fileContentResultSchema = v.object({
  Result: v
    .object({
      Files: v
        .union(
          v.null(),
          v.array(
            v
              .object({
                Repository: v.string(),
                FileName: v.string(),
                Language: v.string().map((lang) => lang || "Text"),
                Branches: v.array(v.string()).optional(),
                // Base64-encoded file content, returned because of the `Whole`
                // search option.
                Content: v.string().optional(),
              })
              .map(
                ({
                  Repository: repository,
                  FileName: fileName,
                  Language: language,
                  Branches: branches = [],
                  Content: contentBase64,
                }) => {
                  const content = contentBase64
                    ? Buffer.from(contentBase64, "base64").toString("utf8")
                    : "";
                  return {
                    repository,
                    fileName,
                    language,
                    branches,
                    // Split on newlines the same way zoekt's own `/print` does
                    // (`bytes.Split(content, "\n")`). We deliberately do NOT
                    // trim a trailing newline: a file ending in `\n` has a final
                    // empty line that editors and zoekt both count, so trimming
                    // it would report one line too few. An empty file is thus a
                    // single empty line, matching that same convention.
                    lines: content.split("\n"),
                  };
                },
              ),
          ),
        )
        .map((val) => val ?? []),
    })
    .map(({ Files: files }) => ({ files })),
});
