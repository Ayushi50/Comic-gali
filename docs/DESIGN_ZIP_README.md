# Comic Gali — static HTML mockup

A clickable, static version of the final "E" design. It is a design reference and a
starting point for building the real site; there is no backend, no real comic content
and no real audio.

## Open it

Open `index.html` in a browser. Everything is plain HTML, CSS and one small script,
so no build step or server is needed. Fonts load from Google Fonts, so the headings
look right only when you are online.

## Files

| File | Page |
| --- | --- |
| `index.html` | Home: hero with cover fan, shelf, Padho / Suno panels, Kahaniyan list, closing band |
| `library.html` | Library: search, filter chips, "Jahan chhoda tha" card, Comics and Kahaniyan shelves |
| `comic.html` | Comic detail: cover, actions, list of issues (Ank), "Aise aur" |
| `reader.html` | Reader: comic page, page thumbnails, previous / next, narration bar |
| `kahani.html` | Story player: highlighted line, audio player, "Aage suno" |
| `signin.html` | Sign in form |
| `assets/styles.css` | Design tokens (CSS variables) and shared component styles |
| `assets/app.js` | Theme toggle, library filter + search, reader paging, play / pause state |

## Design tokens

All colours are CSS variables at the top of `assets/styles.css`.
Dark mode is `data-theme="dark"` on `<html>`; it only swaps the page tokens.

| Token | Light | Dark | Used for |
| --- | --- | --- | --- |
| `--bg` | `#FBF4E6` | `#142127` | page background |
| `--fg` | `#1E2A32` | `#FBF4E6` | text, primary buttons |
| `--muted` | `#5C6670` | `#A9B6BC` | secondary text |
| `--card` | `#FFFDF7` | `#1D2E36` | cards, inputs |
| `--hair` | `#E2D8C4` | `#2C4049` | hairlines, borders |
| `--accent` | `#0E7C7B` | `#5FD0C5` | links, highlights, progress |
| `--soft` | `#F5E6D0` | `#1D2E36` | hover fills, active story line |

Brand colours, the same in both modes, each with the text colour that sits on it:
`--c1` teal `#0E7C7B` (text `--on1`), `--c2` coral `#F26A4B` (`--on2`),
`--c3` ink `#1E2A32` (`--on3`), `--c4` peach `#F3C9B0` (`--on4`),
plus `--ink` `#1E2A32` and `--paper` `#FBF4E6` for artwork.

Type: **Fraunces** (headings, italic accents) and **Inter** (UI and body).

## Behaviour (assets/app.js)

Everything is wired through data-attributes, so it is easy to swap for a framework:

- `data-theme-toggle`: switches light / dark and remembers it in `localStorage` (`cg-theme`).
- `data-filter="all|comics|kahani|audio"` and the `#q` search box: filter the library shelves (`data-section`).
- `data-page-prev`, `data-page-next`, `data-thumbs`, `data-page-label`: reader paging (page count is `data-total` on the thumbs container).
- `data-play-toggle`: toggles the `is-playing` class on `<body>` (swaps the play / pause icon, spins the cassette). No audio is attached.

## Placeholders to replace

- **Cover art** is abstract shapes drawn in CSS. Real covers go inside the `.cv` / `.fc` blocks.
  Real comics (Chacha Chaudhary, Tinkle, Nagraj and so on) need permission from their publishers.
- **Issue names** on `comic.html` are written as `[Ank 01 ka naam]`.
- **Reader page** on `reader.html` is a sample layout with original placeholder lines, not a real comic page.
- **Story text** on `kahani.html` is a short original retelling; times such as `01:52 / 06:42` are sample values.
- **Sign in** has no authentication; the button just links to the library.
- The site name is still "Comic Gali" everywhere.

## Notes for whoever builds this

- Layout styles are mostly inline on the elements, with colours and fonts coming from the tokens.
  When moving to components, lift the repeated blocks first: nav, cover card, list row, player, footer.
- Copy is in Hinglish (Roman script), `lang="hi-Latn"`.
- Pages are fluid and were checked at 1440px and 390px wide.
