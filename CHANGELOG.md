# neogrok

## 0.2.1

### Patch Changes

- 05cdf97: Fix ability to `npm install -g neogrok`

## 0.2.0

### Minor Changes

- 62a7326: Flip the default for OpenGrok automatic redirects to `true`
- 9a0407e: Add syntax highlighting with shikiji

## 0.1.1

### Patch Changes

- 14bd2b4: Fix query disappearing when changing repos limit on /repositories

## 0.1.0

### Minor Changes

- 33a5fe6: Enhance the repositories list page, making it more performant on instances with large numbers of repositories, and make columns sortable by clicking on their headers

### Patch Changes

- ace6aa0: Expand and enhance documentation on /about and /syntax
- 37dacde: Replicate live search optimization heuristic to the repositories page

## 0.0.4

### Patch Changes

- d0378bc: Display empty repositories table instead of nothing when there's a query error
- b4807fb: Make repositories table a bit skinnier by abbreviating git commit shas
- 9f80401: Expand `devalue` bypass to /api/list in addition to /api/search

## 0.0.3

### Patch Changes

- 6317c46: Fix page content jumping down on query error
- 43f7f96: Add a simple loading indicator to the search form
- 86751a7: Add a heuristic to reduce collateral zoekt load resulting from live search

## 0.0.2

### Patch Changes

- 5f28b9a: Initial automated release with changesets
