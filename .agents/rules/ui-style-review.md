# Style changes: hand off to the user for acceptance

Style outcomes (size, spacing, color, type size, breakpoints, alignment, wrapping, overflow, hover/selected states) have no objective assert. Agent screenshot self-checks are slow and unreliable. After a style change, deliver to the user and let them judge.

## Do not

- Use screenshots to decide whether style is “done”: do not start a browser or `cursor-ide-browser` only to eyeball layout; do not run `take_screenshot` / `screencapture` as visual acceptance.
- Restart the dev server, resize viewports, or pixel-compare renders just to “confirm it looks fine.”
- Replace the user’s eye with browser automation for final visual sign-off.
- After the user manually tunes style values, do not revert them or “unify” back to your previous numbers.

## Do

After style edits, stop and report:

1. Which component/file, element, class, or CSS variable changed.
2. The concrete values used (e.g. `max-w-[220px]`, `w-[236px]`, `gap-x-2`, `text-sm`, `px-3 py-2.5`, breakpoints `sm:`/`md:`).
3. What those values control and how to tweak them (larger/smaller, which Tailwind step or CSS variable).
4. Where to look (route or component name).

When the user then edits those parameters, their values win: later work only builds on them — do not overwrite or roll back.

## Exceptions

- Screenshot or browser check only when the user explicitly asks; treat that as reference, still user’s call.
- For logic or data correctness, use tests or CLI output — not screenshots.
- **UI bug fixes** (broken layout, wrong visibility, regression): follow `AGENTS.md` visual inspection before calling the fix done. That is separate from style-polish handoff above.
