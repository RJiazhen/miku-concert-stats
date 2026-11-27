# Code principles

## Function comments (required)

- Every **function**, **method**, **initializer**, **deinitializer**, and **closure** that is named or assigned to a property (e.g. callbacks) MUST have a comment immediately above it.
- Use the idiomatic doc style for the language: Swift `///` or `/** */`, Rust `///`, etc.
- The comment must state **what** the unit does and, when non-obvious, **inputs/outputs**, **side effects**, or **failure modes**. Restating the name alone is not enough.
- Private helpers are not exempt.

```rust
// ❌ BAD
fn parse_entry(s: &str) -> Option<Entry> { ... }

// ✅ GOOD
/// Parses a single tab-separated dictionary line into an `Entry`.
fn parse_entry(s: &str) -> Option<Entry> { ... }
```

## Early return

When a condition means the rest of the function should not run, return immediately. Leave the remaining work at the top level of the function.

## Other principles

- Match existing project naming, types, imports, and formatting; do not reformat unrelated code.
