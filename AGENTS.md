# Kitsap Aviation

Static HTML/CSS/JavaScript site with no build step or package-managed test suite.

## Local preview

From the repository root, run `python3 -m http.server 8080 --bind 127.0.0.1` and open `http://127.0.0.1:8080`.

## Verification

- Run `git diff --check`.
- Check the homepage at desktop, tablet, and mobile widths for horizontal overflow and readable layouts.
- Check mobile navigation, both instructor dialogs, discovery-flight links, and training links that preselect the contact form's interest field. Do not submit the live contact form during testing.
- Scroll to lazy-loaded instructor images and wait for them to load before taking full-page screenshots.
- A plain static server returns 404 for `/api/events`; the existing events script falls back to `events.json`. Worker authentication and admin publishing require a Worker environment.
- Homepage refresh styles are scoped to `body.home-refresh`; check contact and admin pages when modifying shared styles.
