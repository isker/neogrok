---
"neogrok": minor
---

Link search results to a built-in file preview for repositories that zoekt has no URL templates for (e.g. local directories indexed without a VCS). Previously these files were not hyperlinked at all; now they link to a new `/preview` page that renders the whole file straight from zoekt — with line numbers and `#l<N>` anchors — analogous to zoekt's own `/print` endpoint. As on the search page, syntax highlighting is applied lazily to each chunk of the file as it scrolls into view, so opening large files stays responsive.
