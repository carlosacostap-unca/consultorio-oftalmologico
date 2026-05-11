<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:openspec-agent-rules -->
# OpenSpec workflow

For non-trivial feature work, behavior changes, data migrations, or permission-sensitive fixes, start with an OpenSpec proposal before implementation. Use `openspec/` as the source of truth:

- Active proposals live in `openspec/changes/<change-name>/`.
- Current accepted behavior lives in `openspec/specs/`.
- Use `/opsx:propose` for new changes, `/opsx:apply` to implement approved tasks, and `/opsx:archive` after completion.
- Keep OpenSpec artifacts in Spanish when they describe user-facing clinical workflows.
<!-- END:openspec-agent-rules -->
