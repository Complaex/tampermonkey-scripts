# Tampermonkey Scripts

Userscripts for chess.com. Tampermonkey installs them from the raw files on `main` and updates them from there.

## Changing a script

- Raise `@version` in every script you change. Tampermonkey ignores a change without a higher version.
- Keep `@updateURL` and `@downloadURL` pointing to the script's own raw file on `main`.
- Commit and push to `main` directly. There are no pull requests here, and only `main` reaches Tampermonkey.
- Update `README.md` when you add a script or change what one does.

## Conventions

- Write everything in English: script names, file names, code and comments. Talk to the user in German.
- Name files `chesscom-<feature>.user.js`. One feature per script.
- Use the `kf-` prefix for CSS classes the scripts add.
- Scripts run with `@grant none`. Second Best Arrow also needs `@sandbox JavaScript`, because it reads `board.game`.
- Scripts only change what the user sees. Never add anything that helps during a live game: engine features stay on `/analysis`.

## Repo facts

- This repo is public. Never commit personal data. Commits use the GitHub noreply address.
- `gh` is installed at `C:\Program Files\GitHub CLI\gh.exe` and may not be on `PATH`.

## Testing

- The built-in browser is not signed in to chess.com. Ask the user before testing in their real Chrome.
- chess.com may change its page structure, so check selectors on the live page rather than assuming they still match.
