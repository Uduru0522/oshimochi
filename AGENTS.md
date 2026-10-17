# Repository Instructions

## Git Workflow

- Never commit or push directly to `main` or `master`.
- Create a dedicated branch and pull request for every change, including small
  fixes and documentation-only updates.
- Keep each branch and pull request focused on one coherent change. Do not sweep
  unrelated working-tree changes into a commit.
- Run the appropriate tests before opening or updating a pull request.
- Document the change, verification results, and known risks in the pull request.
- Never merge a pull request without the repository owner's explicit approval
  and instruction. Passing CI or having no required reviews is not approval.
- Never enable auto-merge, force-push a protected branch, bypass branch
  protection, or commit through a ruleset bypass.
- Do not modify, disable, delete, or recreate the existing GitHub ruleset unless
  the repository owner explicitly requests that exact ruleset change.

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
- Update relevant documentation in the same pull request as a behavior change.

## Pre-Release Data

- Do not add compatibility code or data migrations only to preserve obsolete
  local data from unreleased builds unless the repository owner requests it.
- Never clear or rewrite the owner's browser data without explicit approval.
