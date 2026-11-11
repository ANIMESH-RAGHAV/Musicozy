# Musicozy — Swiss Brutalist frontend draft

## Files
- `index.html`: main listening dashboard
- `login.html`: sign-in page
- `styles.css`: shared visual system and responsive layouts

## Run
Open `login.html` or `index.html` in a browser. For a local server, run a static server from this folder, or copy the folder into your project and serve it from Express.

## Current scope
This draft uses HTML and CSS only. The search form is configured to submit `GET /api/search?q=...`, but your Express endpoint returns JSON; JavaScript will be needed to fetch that JSON and render results in the page. The login form is a visual placeholder and does not authenticate users. The player controls and track rows are also placeholders: actual audio playback, dynamic track selection, playback progress, and persistent listening history require JavaScript and suitable audio URLs.

The sample track names and geometric cover treatments are demo content. Replace them with API results and artwork you have permission to use.

## Suggested integration sequence
1. Serve this frontend from Express (or configure a separate frontend development server).
2. Add a `script.js` for search requests and DOM rendering.
3. Add audio playback with the HTML audio element.
4. Persist recently played tracks and user accounts through backend routes and a database.

Keep `node_modules` out of version control; retain `package.json` and the lockfile.
