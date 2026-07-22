# Licensing

Specboards is **open source**, licensed under the
[GNU Affero General Public License v3.0](./LICENSE) (AGPLv3), and is also
available under a separate **commercial license** for users who cannot or prefer
not to comply with the AGPL. This is a dual-licensing (open-core) model. This
document explains both paths and where the line sits.

Copyright (c) 2026 Studio Palouse. Specboards is free software: you can
redistribute it and/or modify it under the terms of the AGPLv3, or under a
commercial license from Studio Palouse.

## Open source: AGPLv3

The application in this repository (`apps/web`, `apps/mcp`, `packages/**`,
`infra/**`, specs, docs, and migrations) is licensed under [AGPLv3](./LICENSE).
It is genuine OSI-approved open source, so you may:

- **Run, study, modify, and extend** the source for any purpose.
- **Self-host it** for your own organization, on-prem or in your own cloud, for
  free, including for commercial purposes.
- **Redistribute** it, and redistribute your modifications, under the same AGPLv3
  terms.

The multi-tenant code path ships in the open tree; single- vs multi-tenant is a
runtime flag (`SPECBOARDS_MULTI_TENANT`, default single-tenant for self-host),
not withheld code.

**Exception, the CLI is Apache-2.0.** The command-line client (`apps/cli`, the
published `@specboards/cli` package) is licensed under the
[Apache License 2.0](./apps/cli/LICENSE), not AGPLv3, so you can freely script
against and embed it, including in closed-source tooling. It is a thin,
self-contained REST client and pulls in none of the AGPL packages.

### The AGPL obligation, in plain terms

AGPLv3 is a strong "network" copyleft. Two things follow from it:

- If you **modify** Specboards and **convey** it (distribute it, or run a
  modified version as a network service that other people interact with), you
  must make your **complete corresponding source** available to those users under
  AGPLv3.
- This obligation runs to *the users of your service*. A company self-hosting an
  unmodified or internally-modified Specboards for its **own team** satisfies this
  trivially: the only "users" are your own people, and the source is your own.

The obligation only becomes a burden when you offer a modified Specboards to
**third parties** as a service and want to keep your changes proprietary. That is
precisely the case the commercial license is for.

## Commercial license

Take a commercial license from Studio Palouse if you want to do something the
AGPL does not permit for free, for example:

- **Offer Specboards to third parties as a hosted/managed service** without
  releasing your modifications under AGPLv3.
- **Embed or link Specboards** into a proprietary/closed-source product.
- Operate under an organization that **prohibits AGPL** software internally.
- You want a warranty, indemnity, or support terms the AGPL does not provide.

The commercial license also bundles the enterprise capabilities and support
below. Contact **contact@specboard.ai**.

### Enterprise add-ons and the hosted service

These are the capabilities we offer on top of the AGPL core. Where their code
lives in this repository it is AGPL-licensed like everything else; the
distinction is commercial support and hosting, not withheld source:

- **Managed hosting** at [specboards.ai](https://specboards.ai) (we run it so you
  don't have to).
- **SSO / SAML / SCIM** enterprise identity and directory sync.
- **Advanced analytics**: cross-product reporting, cycle-time, and roadmap
  insight dashboards.
- **Audit logs**: tamper-evident, exportable activity history.
- **Premium integrations** and **support**.

## Relicensing note

Specboards was previously licensed under Apache-2.0 (through v0.21.0). Those
releases remain available under Apache-2.0; that grant is irrevocable and is not
withdrawn. Everything from the relicense forward is offered under AGPLv3 (plus
the commercial option above). Apache-2.0 is one-way compatible with AGPLv3, so
combining the earlier Apache-licensed code into the AGPL codebase is permitted.

## Contributing

To keep the dual-license model workable, contributions are accepted under an
inbound license grant: by submitting a contribution you agree that (1) it is
licensed to the project and its users under AGPLv3, and (2) you grant Studio
Palouse a perpetual, irrevocable right to also license your contribution under
the commercial license, as part of Specboards. This lets us offer the commercial
option without having to track down every contributor. See
[CONTRIBUTING.md](./CONTRIBUTING.md) for the full statement. If a contribution
touches a commercially relevant area, note that in your pull request.

## Brand and trademarks: all rights reserved

The Specboards **software** is open source. The Specboards **brand** is not
licensed at all.

"Specboards", the Specboards logos, the visual identity (colors, typography, look
and feel), and the marketing content are proprietary to Studio Palouse. AGPLv3 is
a copyright license and does not grant any trademark rights.

The public marketing site (`www.specboards.ai`) and the brand assets live in a
separate repository ([Specboards/Website](https://github.com/Specboards/Website))
under a proprietary license, not in this repository.

What this means in practice:

- You may run, modify, and self-host the AGPL core, including commercially,
  subject to the AGPL's terms.
- You may make nominative, factual references to Specboards (for example,
  "integrates with Specboards") without implying endorsement or affiliation.
- You may **not** use the Specboards name or logos to brand your own
  distribution, fork, or service, or in a way that suggests it is the official
  Specboards product, without written permission.

To use the Specboards name or brand assets, email **contact@specboard.ai**.

## Questions

Anything unclear about how a particular use is licensed? Email
**contact@specboard.ai** before you build on it, and we're happy to clarify.
