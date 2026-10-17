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
