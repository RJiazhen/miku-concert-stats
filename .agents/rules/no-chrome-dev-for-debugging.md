# Browser debugging: stable Chrome only

Applies to every project whenever an agent automates a browser (screenshots, UI checks, CDP, devtools MCP, Playwright, Selenium).

## Required

- Use the stable **Google Chrome** at `/Applications/Google Chrome.app` (profile: `~/Library/Application Support/Google/Chrome`).
- Prefer the built-in browser tab (`cursor-ide-browser`) for simple navigation, snapshots, and screenshots.

## Forbidden

- Do **not** launch, attach to, or automate **Google Chrome Dev**, Canary, Beta, Chromium, or any bundled/test browser.
- Do **not** run `open -na "Google Chrome Dev"`, pass it `--remote-debugging-port`, or point a devtools MCP at the `chrome-dev` profile.
- Do **not** kill or restart the user's running Chrome to free a debugging port.

## If a browser tool fails

A connection error like `Could not find DevToolsActivePort for chrome-dev` is **not** permission to start Chrome Dev.

1. Fall back to `cursor-ide-browser`.
2. If Chrome DevTools MCP is genuinely needed, ask the user to enable remote debugging on stable Chrome, then retry.
3. Report the blocker instead of launching another browser build.

Exception: only use a non-stable Chrome when the user explicitly names that build in the current request.
