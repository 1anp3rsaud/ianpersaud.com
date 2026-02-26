# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A vanilla static portfolio website — no build tools, no framework, no package manager. Two files:

- `index.html` — single-page layout with sections: hero, about, work (projects grid), contact
- `assets/css/styles.css` — all styles, minified with CSS custom properties defined in `:root`

## Local Development

Serve with any static file server:

```bash
python3 -m http.server 8080
# or
npx serve .
```

Then open `http://localhost:8080`.

## Architecture Notes

**CSS custom properties** (in `:root`): `--bg`, `--card`, `--muted`, `--accent`, `--maxw`. Use these for any color or layout additions to stay consistent.

**Layout pattern**: every section wraps content in `<div class="container">` which centers at `max-width: 1100px`. Follow this pattern for any new sections.

**Projects grid**: `.grid.projects` uses `auto-fit` with `minmax(220px, 1fr)` — add new `<article class="project">` cards directly inside without changing CSS.

**Inline JS**: a single `<script>` tag at the bottom of `<body>` sets the footer copyright year — keep any additions inline here rather than adding separate script files.

## Known Issue

`index.html` currently contains the full HTML document duplicated twice (two `<!doctype html>` declarations). The second copy should be removed.
