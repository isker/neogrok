---
"neogrok": patch
---

Fix evaluation of Zoekt URL templates that have text after the `{{URLJoinPath ...}}` block, such as the Bitbucket Server file template `{{URLJoinPath "<repo-url>/browse" .Path}}?at={{.Version}}`. Previously, any search whose results included a file from such a repository failed with `zoekt call failed: SyntaxError: Unexpected token '.' ... is not valid JSON`.
