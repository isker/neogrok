import { describe, it, expect } from "vitest";
import {
  evaluateFileUrlTemplate,
  evaluateCommitUrlTemplate,
} from "./url-templates";

describe("evaluateFileUrlTemplate", () => {
  it("evaluates old templates", () => {
    expect(
      evaluateFileUrlTemplate(
        "https://github.com/hanwen/go-fuse/blob/{{.Version}}/{{.Path}}",
        "notify",
        "genversion.sh",
      ),
    ).toEqual("https://github.com/hanwen/go-fuse/blob/notify/genversion.sh");
    expect(
      evaluateFileUrlTemplate(
        "https://svn.future/r/{{.Version}}/nopath",
        "12345",
        "ignored",
      ),
    ).toEqual("https://svn.future/r/12345/nopath");
    expect(
      evaluateFileUrlTemplate(
        "https://github.com/hash/enjoyer/blob/{{.Version}}/{{.Path}}",
        "m^ster",
        "langs/a++/$$$/🚔/c#.md",
      ),
    ).toEqual(
      // We cannot confidently apply any URL encodings to an old-style template
      // because we do not know where in the URL the variables appear.
      "https://github.com/hash/enjoyer/blob/m^ster/langs/a++/$$$/🚔/c#.md",
    );
  });

  it("evaluates new templates", () => {
    expect(
      evaluateFileUrlTemplate(
        '{{URLJoinPath "https://github.com/hanwen/go-fuse/blob" .Version .Path}}',
        "notify",
        "genversion.sh",
      ),
    ).toEqual("https://github.com/hanwen/go-fuse/blob/notify/genversion.sh");
    expect(
      evaluateFileUrlTemplate(
        '{{URLJoinPath "https://github.com/hash/enjoyer/blob" .Version .Path}}',
        "m^ster",
        "langs/a++/$$$/🚔/c#.md",
      ),
    ).toEqual(
      "https://github.com/hash/enjoyer/blob/m%5Ester/langs/a%2B%2B/%24%24%24/%F0%9F%9A%94/c%23.md",
    );
    expect(
      evaluateFileUrlTemplate(
        '{{ URLJoinPath    "https://github.com/hanwen/go-fuse/blob" .Version .Path  }}',
        "notify",
        "genversion.sh",
      ),
    ).toEqual("https://github.com/hanwen/go-fuse/blob/notify/genversion.sh");
    expect(
      evaluateFileUrlTemplate(
        '{{URLJoinPath "https://svn.future/r" .Version "nopath"}}',
        "12345",
        "ignored",
      ),
    ).toEqual("https://svn.future/r/12345/nopath");
  });
});

describe("evaluateCommitUrlTemplate", () => {
  it("evaluates old templates", () => {
    expect(
      evaluateCommitUrlTemplate(
        "https://github.com/hanwen/go-fuse/commit/{{.Version}}",
        "deadbeef",
      ),
    ).toEqual("https://github.com/hanwen/go-fuse/commit/deadbeef");
    expect(
      evaluateCommitUrlTemplate("https://svn.future/r/{{.Version}}", "12345"),
    ).toEqual("https://svn.future/r/12345");
    expect(
      evaluateCommitUrlTemplate(
        "https://github.com/hash/enjoyer/commit/{{.Version}}",
        "m^ster",
      ),
      // We cannot confidently apply any URL encodings to an old-style template
      // because we do not know where in the URL the variables appear.
    ).toEqual("https://github.com/hash/enjoyer/commit/m^ster");
  });

  it("evaluates new templates", () => {
    expect(
      evaluateCommitUrlTemplate(
        '{{URLJoinPath "https://github.com/hanwen/go-fuse/commit" .Version}}',
        "deadbeef",
      ),
    ).toEqual("https://github.com/hanwen/go-fuse/commit/deadbeef");
    expect(
      evaluateCommitUrlTemplate(
        '{{ URLJoinPath    "https://github.com/hanwen/go-fuse/commit" .Version   }}',
        "deadbeef",
      ),
    ).toEqual("https://github.com/hanwen/go-fuse/commit/deadbeef");
    expect(
      evaluateCommitUrlTemplate(
        '{{URLJoinPath "https://svn.future/r" .Version}}',
        "12345",
      ),
    ).toEqual("https://svn.future/r/12345");
    expect(
      evaluateCommitUrlTemplate(
        '{{URLJoinPath "https://github.com/hash/enjoyer/commit" .Version}}',
        "m^ster",
      ),
    ).toEqual("https://github.com/hash/enjoyer/commit/m%5Ester");
  });
});
