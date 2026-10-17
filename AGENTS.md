# Repository Instructions

## Git Workflow

- Use a dedicated branch and one pull request for each complete feature or
  substantial behavior change.
- Small bug fixes, documentation edits, and minor refactoring that preserves
  behavior may be committed directly to `main` when branch protection permits.
- Keep fixes, tests, and documentation for an in-progress feature in that
  feature's branch and pull request.
- Keep each commit focused. Do not include unrelated working-tree changes.
- Run appropriate checks before committing or pushing. For pull requests,
  document the change, verification results, and known risks.
- Never merge a pull request without the repository owner's explicit approval
  and instruction. Passing CI or having no required reviews is not approval.
- Never enable auto-merge, force-push a protected branch, bypass branch
  protection, or commit through a ruleset bypass.
- Do not modify, disable, delete, or recreate the existing GitHub ruleset unless
  the repository owner explicitly requests that exact ruleset change.

## Local Review Before Commits

- For app changes, implement locally, run appropriate checks, and provide a local
  preview. Wait for the owner's local-testing sign-off before committing,
  pushing, or preparing a feature pull request.
- For documentation-only changes, review the diff and relevant links before
  committing or pushing; no app preview is needed.
- Repeat local review after changes that alter previously approved behavior.

## Commit Attribution

- Use the repository owner's configured Git identity for project commits.
- For changes produced with Codex, add
  `Co-authored-by: Codex <codex@openai.com>` to the commit message.

## Documentation

- Documents about the current app must describe only implemented behavior.
- Keep unfinished work in `docs/roadmap.md` or another explicit planning
  document.
- Prefer short paragraphs, simple wording, grouped lists, and links to the
  owning document instead of repeated detail.
- Update relevant documentation with behavior changes in the same commit or
  feature pull request.

## Pre-Release Data

- Do not add compatibility code or data migrations only to preserve obsolete
  local data from unreleased builds unless the repository owner requests it.
- Never clear or rewrite the owner's browser data without explicit approval.
