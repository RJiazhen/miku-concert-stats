# GitHub repositories: default private

When creating a new GitHub repository (via `gh repo create`, GitHub MCP, GitHub website instructions, or any other method), **default visibility must be private**.

## Required behavior

- Prefer `gh repo create ... --private` (or the equivalent private flag/API field).
- Do **not** use `--public` unless the user explicitly asks for a public repository in that request.
- If visibility was already set to public by mistake, change it to private promptly (`gh repo edit <repo> --visibility private --accept-visibility-change-consequences`).

## Examples

```bash
# Avoid
gh repo create my-app --public --source=. --remote=origin --push

# Prefer
gh repo create my-app --private --source=. --remote=origin --push
```
