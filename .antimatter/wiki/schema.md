# Wiki Schema

This directory is an LLM-maintained knowledge base for this repository, following
Karpathy's "LLM wiki" pattern. It exists so the agent (and you) can read compact,
compounding summaries instead of re-reading the whole codebase every session —
saving tokens and making local models sustainable.

## Layers
- **Raw sources**: the codebase itself. Read-only. Never edited by the wiki.
- **map.md**: deterministic structural map (auto-generated). Do not hand-edit.
- **map.json**: machine-readable version of the map.
- **Wiki pages** (`pages/*.md`): agent-written summaries, architecture notes,
  entity/module pages, decisions. Cross-link with `[[page-name]]`.
- **index.md**: catalog of wiki pages (one line each).
- **overview.md**: the evolving high-level synthesis of the project.
- **log.md**: append-only timeline of activity.

## Rules for agents (imperative)
1. **Read the wiki first.** Before exploring, call `map` and `wiki_read`/`wiki_search`.
   Reuse what is already known instead of rediscovering the codebase.
2. **Update the wiki after meaningful work.** When you understand a subsystem, make a
   non-trivial change, or hit a gotcha, call `wiki_write`. Keep `overview.md` current.
   This is required — it is how the project stays cheap to work on for local models.
3. **Prefer summaries over raw files.** One wiki page beats reading several source files.
   Open raw files only when the wiki is missing or stale; if stale, fix the page.

## Conventions
- Keep pages focused and short. Link related pages with `[[wikilinks]]`.
- Anchor claims to real files. Note contradictions when newer code supersedes a page.
- A re-touch should append to a short "Updates" section rather than silently rewriting,
  so nuance and history are preserved.

## Local-model optimization
- This wiki exists to minimize tokens. Read narrowly; never re-read what is already in context.
- Use `recall <id>` to re-expand a compacted tool result instead of re-running the tool.
- Batch independent tool calls; avoid broad directory scans when the map answers the question.
