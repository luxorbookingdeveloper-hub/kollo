# Kollo Architecture & Development Rules

## 1. File Size Limit & Modularity
- **Strict Limit:** No file in the project may exceed **200 lines**.
- When a file approaches 200 lines, it must be modularized into a dedicated subfolder or smaller single-responsibility files (<150 lines each).
- Apply Single Responsibility Principle (SRP): One clear purpose per file.

## 2. Zero-Build & Core Integrity
- 100% Vanilla ES6+ JavaScript, CSS3, and standard HTML5. No bundlers, compilers, or heavy external frameworks.
- Preserve all 8 global core contracts: `Bus`, `R`, `UI`, `AI`, `VIEWS`, `Hist`, `DB`, `S`.
- Any enhancement must preserve 100% backward compatibility and passing internal tests (`#/tests`).

## 3. Tiered Execution Flow
Select the execution path matching task scope before taking action:
- **Tier 1 (Review & Audit - Read-Only):** Code review, log inspection, bug investigation. No code edits, no disruptive modals.
- **Tier 2 (Minor / Cosmetic / Localized Fixes):** Typos, small CSS padding/token adjustments, isolated single-element bugfixes. Edit surgically and verify directly.
- **Tier 3 (Structural, Data, or New Features):** Multi-file changes, new views, DB schema migrations, or AI tool updates:
  1. *Proactive inquiry:* Clarify trade-offs with user beforehand when multiple valid directions exist.
  2. *Anti-Duplication Audit:* Check existing utilities, modules, and repos before writing new code.
  3. *3-Layer Impact Audit:* Execute Rule 4 audit before finalizing.
  4. *Self-Testing Verification:* Verify internal tests (`#/tests`) and test on mobile/desktop.
  5. *Persistence:* Record architectural and design decisions in `MEMORY.md`.

## 4. Kollo 3-Layer Impact Audit & Zero Regression
Before committing any structural or multi-file change, verify:
1. **UI/CSS Layer:** Mobile-first responsive (320px+ viewport), Touch targets (44px+), Safe Area Insets, Full RTL alignment, and proper rendering across all 4 themes (default, dark, light, retro).
2. **Core & Bus Layer:** Event bus listeners (`Bus.on/emit`), Router routes (`R`), History tracking (`Hist`), and keyboard shortcuts (`Ctrl+K`, Esc, Double Space).
3. **Data Layer (IndexedDB):** Store schemas, object stores, atomic transactions, zero data loss, and AES-GCM encrypted backup/restore compatibility.

## 5. Semantic Color Hierarchy (Anti-AI-Slop)
Never introduce arbitrary inline hex colors in component styles or scripts:
- **Level 1 (Surfaces & Text):** Semantic tokens first (`--bg`, `--bg-2`, `--bg-3`, `--tx`, `--tx-2`, `--tx-3`, `--line`, `--line-2`).
- **Level 2 (Actions & Status):** Brand and semantic states (`--accent`, `--accent-2`, `--good`, `--warn`, `--bad`).
- **Level 3 (Permitted Exceptions):** Restricted to data visualization charts and explicit print styles.
- Follow `DESIGN.md`: Human-crafted, content-first, authentic typography, comfortable contrast (WCAG AAA/AA 4.5:1+).

## 6. Decision Memory & User Mandate
- Significant structural, architectural, or design decisions must be documented in `MEMORY.md`.
- Never overwrite or regress user-mandated behaviors from prior sessions.
