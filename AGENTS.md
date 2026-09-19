# Kitsap Aviation

Static HTML/CSS/JavaScript site with no build step or package-managed test suite.

## Local preview

From the repository root, run `python3 -m http.server 8080 --bind 127.0.0.1` and open `http://127.0.0.1:8080`.

## Verification

- Run `git diff --check`.
- Check home, contact, and admin pages at desktop and mobile widths for horizontal overflow (`body` has `overflow-x: hidden`, so inspect element bounding rects too) and readable layouts.
- Check the mobile nav toggle (shown under 900px once `js/nav.js` adds `nav-ready`), instructor dialogs, and contact form interest preselection. Do not submit the live contact form or perform admin writes during testing.
- Scroll to lazy-loaded images and wait for them to load before taking screenshots.
- A plain static server returns 404 for `/api/events`; `js/events.js` falls back to `events.json`. Admin publishing requires a Worker environment.
