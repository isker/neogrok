---
"neogrok": patch
---

Fix search results crashing on syntax-highlighted code with strikethrough or combined font styles, such as Markdown `~~strikethrough~~`. Errors in syntax highlighting now fall back to plain text instead of breaking the page.
