import type { HighlightClass } from "$lib/server/content-parser";

export const toTailwindClasses = (
  highlightClass?: HighlightClass
): string | undefined => {
  if (highlightClass === undefined) {
    return undefined;
  }
  // https://github.com/wooorm/starry-night/blob/main/style/light.css
  // TODO these should probably be in the tailwind theme? Maybe that'd help with
  // light/dark theming in the future.
  switch (highlightClass) {
    case "bracket-angle":
      return "text-[#57606a]";
    case "bracket-unmatched":
      return "text-[#82071e]";
    case "carriage-return":
      return "text-[#f6f8fa] bg-[#cf222e]";
    case "comment":
      return "text-[#6e7781]";
    case "constant":
      return "text-[#0550ae]";
    case "constant-other-reference-link":
      return "text-[#0a3069]";
    case "entity":
      return "text-[#8250df]";
    case "entity-tag":
      return "text-[#116329]";
    case "gutter-mark":
      return "text-[#8c959f]";
    // case "invalid":
    //   return "text-[#f6f8fa] bg-[#82071e]";
    case "keyword":
      return "text-[#cf222e]";
    case "markup-bold":
      return "text-[#24292f] font-bold";
    case "markup-changed-text":
      return "text-[#953800] bg-[#ffd8b5]";
    case "markup-deleted-text":
      return "text-[#82071e] bg-[#ffebe9]";
    case "markup-heading":
      return "text-[#0550ae]";
    case "markup-ignored-text":
      return "text-[#eaeef2] bg-[#0550ae]";
    case "markup-inserted-text":
      return "text-[#116329] bg-[#dafbe1]";
    case "markup-italic":
      return "text-[#24292f] italic";
    case "markup-list":
      return "text-[#3b2300]";
    case "meta-diff-range":
      return "text-[#8250df] font-bold";
    case "regexp":
      return "text-[#116329] font-bold";
    case "storage-modifier-import":
      return "text-[#24292f]";
    case "string":
      return "text-[#0a3069]";
    case "variable":
      return "text-[#953800]";
    default: {
      const unreachable: never = highlightClass;
      throw new Error(`unreachable ${unreachable}`);
    }
  }
};
