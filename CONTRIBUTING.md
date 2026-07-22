# Contributing to Specboards

Thanks for your interest in improving Specboards. This document covers the one
thing that is legally load-bearing: how your contributions are licensed.

## License of contributions (please read)

Specboards is dual-licensed: open source under the
[GNU AGPLv3](./LICENSE), and separately under a commercial license for users who
cannot use the AGPL (see [LICENSING.md](./LICENSING.md)). For that model to keep
working, we need the right to offer *all* of the code, including your
contributions, under both licenses.

**By submitting a contribution (a pull request, patch, or any other work) to this
project, you agree that:**

1. Your contribution is licensed to the project and its users under the
   **AGPLv3**, the same license as the rest of the project; and
2. You grant **Studio Palouse** a perpetual, worldwide, non-exclusive,
   royalty-free, irrevocable right to also license your contribution under the
   **Specboards commercial license** (and future versions of it), as part of
   Specboards; and
3. You have the right to make the contribution (it is your original work, or you
   otherwise have the necessary rights), and if you are contributing on behalf of
   an employer, you have their authorization to do so.

This is an inbound license grant, sometimes called a lightweight CLA. It does not
transfer your copyright: you keep ownership of your contribution, and you may use
it elsewhere however you like. It only lets us include your work in both the open
source and commercial editions of Specboards.

If you cannot agree to the commercial-relicensing grant in (2), please open an
issue to discuss before contributing, rather than sending a pull request.

## Practical notes

- If a contribution touches an area we sell commercially or that has enterprise
  implications (SSO, analytics, audit, multi-tenant hosting), call that out in
  the PR so we can route it correctly.
- Follow the existing code style and the conventions in
  [`CLAUDE.md`](./CLAUDE.md) / [`AGENTS.md`](./AGENTS.md) (including: no em
  dashes anywhere).
- Make sure `pnpm typecheck`, `pnpm test`, and `pnpm lint` pass before opening a
  PR.

Questions about licensing or contributing? Email **contact@specboard.ai**.
