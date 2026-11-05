# Tampermonkey Scripts

Userscripts for different websites. Tampermonkey installs them from the raw files on `main` and updates them from there.

## Changing a script

- Raise `@version` in every script you change. Tampermonkey ignores a change without a higher version.
- Keep `@updateURL` and `@downloadURL` pointing to the script's own raw file on `main`.
- Commit and push to `main` directly. There are no pull requests here, and only `main` reaches Tampermonkey.
- Update `README.md` when you add a script or change what one does.

## Adding a script

- Name the file `<site>-<feature>.user.js`, for example `chesscom-analysis-button.user.js`. One feature per script.
- Use the same `@namespace` as the file name without `.user.js`.
- Add `@updateURL` and `@downloadURL`, and give the script a row with an install link in `README.md`.
- Keep `@match` as narrow as the feature allows.

## Conventions

- Write everything in English: script names, file names, code and comments. Talk to the user in German.
- Use the `kf-` prefix for CSS classes the scripts add.
- Prefer `@grant none`. Add `@sandbox JavaScript` if a script reads objects from the page itself.
- Check selectors on the live page rather than assuming they still match, because sites change.

## Repo facts

- This repo is public. Never commit personal data. Commits use the GitHub noreply address.
- `gh` is installed at `C:\Program Files\GitHub CLI\gh.exe` and may not be on `PATH`.

## Testing

- The built-in browser is usually not signed in. Ask the user before testing in their real Chrome.

## chess.com

- Scripts only change what the user sees. Never add anything that helps during a live game: engine features stay on `/analysis`.
- Second Best Arrow reads `board.game`, so it needs `@sandbox JavaScript`. It expects the interface in English.
