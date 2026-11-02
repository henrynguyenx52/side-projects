# Response File Links

- Whenever you create, modify, or mention a local file in the final response, include a clickable Markdown link to it.
- Use an absolute path as the link target, with an optional 1-based line number: `[filename](/absolute/path/to/file:line)`.
- Do not provide only a plain-text path when a clickable file link can be provided.
- Do not use `file://`, `vscode://`, or other editor-specific URI schemes.

Example:

```markdown
Created [report.md](/absolute/path/to/report.md).
Updated [app.ts](/absolute/path/to/src/app.ts:42).
```
