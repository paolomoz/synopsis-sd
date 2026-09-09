---
_provenance:
  writtenBy: stardust:replica
  writtenAt: 2026-09-09T15:18:06Z
  againstInput: https://www.synopsys.com/
  readArtifacts:
    - stardust/current/PRODUCT.md
    - stardust/current/DESIGN.md
    - stardust/current/DESIGN.json
---

# Direction — preserve mode (same-design migration)

Mode: PRESERVE. The target spec is the captured current state of
https://www.synopsys.com/, promoted verbatim (no direct invocation, no creative
decisions).

Promoted: current/PRODUCT.md → PRODUCT.md · current/DESIGN.md → DESIGN.md ·
current/DESIGN.json → DESIGN.json (at 2026-09-09T15:18:06Z).

Permitted deltas: ONLY the entries of stardust/replica/inconsistency-register.md
(empty — pure replica).

Fidelity: ia verbatim · design verbatim · content verbatim.

## Hands-off activation

Activated 2026-09-09T15:18:06Z by the user's "proceed" instruction on an unattended run.
Named assumptions:

- Flow: replica (keep current design, re-platform to AEM Edge Delivery) — "migrate
  to EDS" read as re-platform, not redesign.
- Volume: 64-page representative roster (hands-off default caps: header/footer-
  linked pages, section landings, template spread). Full en-US inventory is
  4,598 pages; locale subtrees (ja-jp, zh-cn, zh-tw, ko-kr) excluded.
- Register: empty (pure replica); no audit run.
- Breakpoints: 1440 and 360 (replica default).
- Target: paolomoz/synopsis-sd → https://main--synopsis-sd--paolomoz.aem.page/
  content at https://da.live/#/paolomoz/synopsis-sd
