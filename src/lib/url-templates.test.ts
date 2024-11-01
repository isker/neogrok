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
  });
});
