---
"neogrok": minor
---

Replace shiki with [`@pierre/highlights`](https://diffs.com/highlights), and move syntax highlighting from the browser to the server. Search results arrive already highlighted, so the browser no longer downloads a syntax highlighter or highlights code itself, and highlighting no longer waits for code to scroll into view. Bracket and delimiter punctuation is no longer colored.

The set of highlighted languages changes. These languages are no longer highlighted: 1C Enterprise, ActionScript, APL, Ballerina, Berry, Cadence, Cairo, Clarity, Closure Templates, Crystal, CUE, DM, Edge, Fennel, Fluent, Genie, Glimmer JS, Glimmer TS, GN, Hurl, HXML, Hy, Imba, Jison, Kusto, Marko, Mojo, Move, Nu, Nushell, Pkl, Polar, PureScript, Raku, Regular Expression, RON, Smalltalk, SSH Config, SurrealQL, Talon, templ, TypeSpec, V, Vala, Visual Basic .NET, Vyper, Wikitext, and ZenScript. These languages are now highlighted: CUDA, edn, Gradle, Mustache, SVG, and XSLT.
