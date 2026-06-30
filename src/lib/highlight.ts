import type { ThemedToken, BundledLanguage } from "shiki";

export type BrowserTheme = "light" | "dark";

const toTextmateLanguage = (linguistLanguage: string): string => {
  // This is the same normalization that zoekt applies when querying
  // go-enry, and it seems to be good enough for us querying shiki as well.
  const language = linguistLanguage.toLowerCase();
  // ... except when it isn't. go-enry (backed by linguist) and shiki
  // (backed by vscode's textmate grammars) just seem to have fundamentally
  // different lineages, we have no hope but to do some remappings. TODO
  // perhaps these should be upstreamed as aliases in shikiji.
  switch (language) {
    case "1c enterprise":
      return "1c";
    case "actionscript":
      return "actionscript-3";
    case "apacheconf":
      return "apache";
    case "assembly":
      return "asm";
    case "batchfile":
      return "bat";
    case "closure templates":
      return "closure-templates";
    case "common lisp":
      return "common-lisp";
    case "dm":
      return "dream-maker";
    case "emacs lisp":
      return "emacs-lisp";
    case "fortran":
    case "fortran free form":
      return "fortran-free-form";
    case "gettext catalog":
      return "po";
    case "git commit":
      return "git-commit";
    case "glimmer js":
      return "glimmer-js";
    case "glimmer ts":
      return "glimmer-ts";
    case "godot resource":
      return "gdresource";
    case "html+erb":
      return "erb";
    case "json with comments":
      return "jsonc";
    case "lean 4":
      return "lean4";
    case "objective-c++":
      return "objective-cpp";
    case "protocol buffer":
      return "protobuf";
    case "regular expression":
      return "regexp";
    case "restructuredtext":
      return "rst";
    case "ros interface":
      return "rosmsg";
    case "ssh config":
      return "ssh-config";
    case "systemverilog":
      return "system-verilog";
    case "vim script":
      return "viml";
    case "visual basic .net":
      return "vb";
    case "webassembly":
      return "wasm";
    case "wolfram language":
      return "wolfram";
    default:
      return language;
  }
};

// Syntax highlighting can be pretty CPU intensive and so is only done on the
// client: CPU intensive tasks can smoke the server's performance. Node is great
// at lots of concurrent I/O, but anything CPU intensive that blocks its event
// loop from progressing quickly grinds things to a halt.
//
// The price to pay over doing highlighting on the server is that the client has
// to download and execute some assets that are pretty enormous, compared to
// everything else in the app. The baseline shiki bundle (their JS, the
// oniguruma wasm blob, plus the theme we use) is something like 300kb _gzipped_,
// and each language is 3-50 more.
export const computeHighlights = async (
  lines: ReadonlyArray<string>,
  linguistLanguage: string,
  theme: BrowserTheme,
  signal: AbortSignal,
): Promise<ReadonlyArray<ReadonlyArray<ThemedToken>> | undefined> => {
  const language = toTextmateLanguage(linguistLanguage);

  // We dynamically import shiki itself because it's huge and won't be needed by
  // those landing on the home page with no search query, or on the server at
  // all.
  const { codeToTokens, bundledLanguages } = await import("shiki");
  if (signal.aborted) {
    return;
  }

  if (language in bundledLanguages) {
    // I guess TS isn't interested in doing this refinement based on the check
    // above.
    const lang = language as BundledLanguage;
    // Shiki only accepts a single string even though it goes right ahead and
    // splits it :(.
    const code = lines.join("\n");
    return (
      await codeToTokens(code, {
        theme: `github-${theme}`,
        lang,
      })
    ).tokens;
  } else if (language !== "text") {
    console.warn(
      "Could not find shiki language for '%s', skipping highlighting",
      language,
      bundledLanguages,
    );
  }
};
