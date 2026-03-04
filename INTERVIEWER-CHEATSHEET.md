# TestCalc — Interviewer Cheat Sheet

> **Do not share this file with candidates.** This is a complete inventory of planted bugs, traps, and documentation discrepancies in the TestCalc QA interview environment.

---

## Quick Architecture Overview

- **V1:** `index.html` + `styles.css` + `app.js` — basic calculator with login, signup, history
- **V2:** `v2/index.html` + `v2/styles.css` + `v2/app.js` — adds memory (MC/MR/M+/M-) and percent (%) buttons
- **Shared engine:** `CalculatorEngine` IIFE is identical in both `app.js` files (all core math bugs exist in both versions)
- **No real backend:** Everything is client-side JS. "API" is a `postMessage`/`BroadcastChannel` system between the calculator and the API docs page
- **Test accounts:** alice/password123, bob/testpass, charlie/calc2024, diana/qwerty (shown in info panel)
- **Supporting pages:** `test-report.html` (v1 & v2), `api-docs.html` (v1 & v2), `known-issues.html`, `test.html` (harness)

---

## All Known Bugs (26 total)

### Calculator Engine (Both V1 & V2)

**1. Double decimal allowed** — `app.js:25`
Press `3 . 1 . 4` — display shows "3.1.4", math produces NaN.
> **Tracker:** DEF-127 is marked **Fixed** (deployed Mar 1) — but the bug is still 100% present. This is the **primary trap** on the known issues page. The resolution even describes the exact fix ("decimal existence check in inputDecimal") that was never actually applied.
> **Test:** SM-009 ("Decimal input produces valid number") passes — but only tests a single decimal. DEF-127 notes "SM-009 updated to include double-decimal scenario" which is misleading.

**2. Double operator inserts phantom 0** — `app.js:37`
Press `5 + × 3 =` — evaluates as `(5+0)×3 = 15` instead of replacing the operator.
> **Tracker:** Not tracked. No known issue filed.
> **Test:** No coverage. The `test.html` harness has a scenario button for this, but it's not in the main test suite.

**3. Toggle sign on zero → "-0"** — `app.js:46`
Press +/- on fresh calculator — shows "-0".
> **Tracker:** Not tracked.
> **Test:** No coverage.

**4. DEL works after evaluation (mutates result)** — `app.js:54`
Compute `2+3=5`, press Backspace — result mutates from "5" to "0".
> **Tracker:** Not tracked.
> **Test:** REG-004 ("Delete removes last character during input") only tests *during* input, not post-evaluation. A candidate might assume this is covered — it isn't.

**5. No divide-by-zero guard** — `app.js:77`
`5 ÷ 0 =` → displays "Infinity". Further math on Infinity produces NaN.
> **Tracker:** Not tracked.
> **Test:** No coverage.

**6. Floating-point noise shown** — `app.js:81`
`0.1 + 0.2 =` → "0.30000000000000004".
> **Tracker:** Not tracked. DEF-103 ("Display truncates results exceeding 15 digits") is vaguely adjacent but marked Fixed and is about CSS overflow, not float rounding.
> **Test:** MAN-008 ("Display handles long numbers") is **flaky** — "truncated on first run, passed on re-test." Possibly related.

**7. No operator precedence** — `app.js:69`
`2 + 3 × 4 =` → 20 (not 14). Strictly left-to-right evaluation.
> **Tracker:** Not tracked.
> **Test:** No coverage. BUT the API docs show `"5 + 3 * 2"` → `"11"` (standard PEMDAS) — the engine actually returns 16. This is a documentation discrepancy a sharp candidate might catch.

### UI / Rendering (Both V1 & V2)

**8. Stale expression after clear** — `app.js:163`
Compute `5+3=8`, press C — display resets to 0 but the expression line above it still shows "5 + 3 =". The `render()` function only updates `historyEl.textContent` when the expression string is non-empty; clear sets it to empty, so the old text stays.
> **Tracker:** DEF-198 (Open, P3). Straightforward and well-documented — the defect description matches exactly.
> **Test:** No coverage.

**9. = key not mapped** — `app.js:661`
Press the `=` keyboard key — nothing happens. Only Enter evaluates. Code has `// BUG: '=' key not mapped`.
> **Tracker:** DEF-148 — marked **Won't Fix** with a hilarious 14-comment thread. dev-sarah couldn't reproduce because she had a browser extension (CalcKeys Pro) adding shortcuts. After admitting the bug exists, she pivots to arguing it's "intentional" and demands a "keyboard shortcut RFC process." Cristian's final reply: "It is one line of code."
> **Test:** No coverage.

**10. Keyboard input bleeds into calculator from input fields** — `app.js:653` / `v2/app.js:747`
The global `document.addEventListener('keydown', ...)` handler has no check for `e.target` — it doesn't filter out events from input fields. When you type a password like "password123", the digits `1`, `2`, `3` are captured by the calculator. After logging in as alice (password123), the display shows "123".
> **Tracker:** DEF-189 — marked **Fixed** (v2 only, Feb 27). The bug report only mentions the password field, and the resolution says "Added focus detection to suppress calculator keyboard shortcuts when the password input field is active."
> **V1:** Still fully broken in all fields. Not backported. Candidates see "123" on the display after logging in as alice.
> **V2: PARTIALLY FIXED — layered residual bugs.** The fix ONLY checks `document.activeElement === passwordInput`. There are three layers of discovery:
> 1. **Password field (fixed):** Typing in the password field no longer bleeds. This is what the defect describes and what the dev fixed.
> 2. **Username field (still broken):** The fix doesn't cover the username input. Type a username with digits (e.g., "user5") — digits appear on the calculator. A good candidate tests both login fields, not just the one in the bug report.
> 3. **Signup modal fields (still broken):** The signup form has 8 input fields (including phone, zip code) that are completely uncovered. Open signup in v2, type a zip code — digits bleed into the calculator behind the modal. An excellent candidate checks this too.
> **Test:** No coverage.

### History System (Both V1 & V2)

**11. Clear history is DOM-only** — `app.js:381`
Clear history, click Refresh (↻) — all entries reappear. The clear handler does `innerHTML = ''` but never touches the backing array.
> **Tracker:** DEF-092 (In Progress, P1). dev-marcus confirmed the root cause. This is the best-documented defect and directly relates to a test failure.
> **Test:** REG-010 ("Clear history removes visible entries") — **FAIL**. Failure message: "Expected entry count 0, found 3. Note: entries re-appeared after panel refresh." A sharp candidate connects DEF-092 to REG-010 even though the defect doesn't reference the test ID.

**12. Deleted history items resurrect on refresh/login** — `app.js:413`
Delete a history entry, log out and back in (or click Refresh) — the entry reappears. The code saves the last deleted item and deliberately re-inserts it on refresh/login.
> **Tracker:** Not tracked. DEF-092 is related (both involve history items reappearing) but describes the *clear* bug, not the *delete* bug.
> **Test:** No coverage.

**13. Guest calculations leak to last-attempted user** — `app.js:193`
Fail login as alice (wrong password), do calcs as guest, then successfully login as alice — guest calcs appear in her history. The trigger is the *failed* login attempt, which sets `lastAttemptedUser`.
> **Tracker:** DEF-167 (Open, P2) — but the filed **repro steps are wrong**. They say "open fresh tab, do calcs, login" without mentioning the failed login. dev-marcus says "Cannot consistently reproduce" because the steps don't include the actual trigger.
> **Test:** No coverage.

### Authentication / Security (Both V1 & V2)

**14a. SQL injection: comment** — `app.js:240`
Username: `alice' --` (any password) → logs in as alice.

**14b. SQL injection: OR in password** — `app.js:246`
Username: `alice`, Password: `' OR '1'='1` → logs in.

**14c. SQL injection: OR in username** — `app.js:251`
Username: `' OR '1'='1` → logs in as alice (first user).
> **Tracker:** Not tracked. No known issue filed for any injection vector.
> **Test:** No coverage.

**15. Ghost login (empty credentials)** — `app.js:225`
Clear both fields, click Login → phantom authenticated session, no error. "Logged in as" label shows blank. Delete buttons appear on history entries.
> **Tracker:** Not tracked.
> **Test:** No coverage.

**16. Hardcoded plaintext passwords** — `app.js:109`
All user passwords in a plain JS object. Also displayed openly in the Quick Start info panel.
> **Tracker:** Not tracked.
> **Test:** No coverage.

**17. No email validation on signup** — `app.js:363`
Sign up with email "notanemail" or "12345" — accepted. Code has `// BUG: no email validation at all`.
> **Tracker:** DEF-112 is marked **Fixed** (deployed Feb 28) — but no validation exists. This is the **secondary trap**. Harder to catch than DEF-127 because you have to go through the full signup flow.
> **Test:** No coverage.

**18. EULA checkbox not enforced** — `app.js:365` / `v2/app.js:417`
The signup form has a "I have read and agree to the Terms of Service and EULA" checkbox, but unchecking it (or never checking it) does not prevent account creation. The form submits successfully without agreeing to the terms.
> **Tracker:** Not tracked.
> **Test:** No coverage. A careful candidate filling out the signup form might skip the checkbox and notice it goes through anyway.

**19. First/Last name marked required but not validated** — `app.js:352` / `v2/app.js:403`
The signup form labels for First Name and Last Name both have a red asterisk (`*`) indicating they're required, but the validation only checks username, password, email, and phone. You can create an account with no name at all.
> **Tracker:** Not tracked. Note: the API docs say firstname/lastname are "optional" for the API endpoint, which is consistent with the API code — but the UI labels contradict this by showing `*`.
> **Test:** No coverage.

### V2-Only Bugs

**20. Memory not reset on logout** — `v2/app.js:120`
M+ a value as alice, logout — "M" indicator persists, bob can MR alice's value. `memoryValue` is global, not user-scoped.
> **Tracker:** DEF-134 (Open, P2). Description is slightly off — says "indicator persists" but the deeper issue is memory *value* leaking across users.
> **Test:** No coverage. V2 test report explicitly lists "Memory persistence across login/logout" as a coverage gap.

**21. Guest memory operations leak to user** — `v2/app.js:329`
Fail login as alice, use M+ as guest, login as alice — her memory modified. Same `lastAttemptedUser` pattern as Bug #13.
> **Tracker:** Not tracked.
> **Test:** No coverage. V2 test report lists "Memory interaction with guest mode" as a coverage gap.

**22. API memory update doesn't refresh UI** — `v2/app.js:662`
Use API docs to PUT /memory for alice — indicator doesn't appear on calculator, MR recalls old value. The API handler modifies the user object but never updates the global `memoryValue` or calls `updateMemoryIndicator()`.
> **Tracker:** Not tracked.
> **Test:** No coverage. V2 test report lists "Memory API endpoints" as a coverage gap.

**23. Percent is naive divide-by-100** — `v2/app.js:701`
`200 + 10 % =` → 200.1 (not 220). Just divides by 100, ignores expression context.
> **Tracker:** DEF-156 (Open, P3). The defect describes the issue well but product-owner asks "is percent-of-base the intended behavior or simple divide-by-100?" — left unresolved. A candidate might debate whether this is a bug or a spec question.
> **Test:** No coverage. V2 test report lists "Percent button in mid-expression contexts" as a coverage gap.

**24. Zero button lost btn-wide class** — `v2/index.html:76`
The 0 button is narrow in v2 (single cell) vs wide in v1 (spans two columns). Subtle visual regression.
> **Tracker:** Not tracked.
> **Test:** No coverage.

**25. No keyboard shortcuts for memory operations** — `v2/app.js:758`
MC, MR, M+, M- have no keyboard shortcuts at all. Comment: `// No keyboard shortcuts for memory operations (intentional omission)`.
> **Tracker:** Not tracked.
> **Test:** No coverage.

**26. showDeleteButtons flag leaks after ghost login** — `app.js:119`
After ghost login (Bug #15) and logout, `showDeleteButtons` remains `true`. Subsequent guest history entries render with delete buttons and `data-entryId` attributes even though no user is logged in.
> **Tracker:** Not tracked.
> **Test:** No coverage.

---

## The Traps & Cross-References (Known Issues Page)

These are the key "gotcha" moments on `known-issues.html` and how they connect to real bugs and test results:

### PRIMARY TRAP: DEF-127 — Double Decimal → Bug #1
- **Tracker says:** Fixed, deployed Mar 1, 2026. Resolution describes the exact fix ("decimal existence check in inputDecimal()").
- **Reality:** Bug is still 100% present. Type `3.1.4` in the calculator. Instant proof.
- **Cross-ref:** Linked test SM-009 passes — but only tests single decimal. The note "SM-009 updated to include double-decimal scenario" is misleading.
- **What a good candidate does:** Reads "Fixed", tries it anyway, discovers it's still broken.

### SECONDARY TRAP: DEF-112 — Email Validation → Bug #17
- **Tracker says:** Fixed, deployed Feb 28, 2026. "Added regex validation for email format on both client and server side."
- **Reality:** Zero email validation exists. Sign up with "notanemail" — works fine.
- **Harder to catch:** Requires going through the full signup flow to discover. Most candidates won't test a "Fixed" item unless they're thorough.

### THE FUNNY ONE: DEF-148 — = Key → Bug #9
- **Tracker says:** Won't Fix. 14-comment thread where dev-sarah can't repro (had CalcKeys Pro extension), eventually admits the bug exists, then pivots to arguing it's intentional and demands a "keyboard shortcut RFC process (targeting Q3)." Cristian's devastating closer: "It is one line of code."
- **Reality:** The code literally has `// BUG: '=' key not mapped`.
- **What a good candidate does:** Tries the = key, finds it broken, reads the thread, and laughs/despairs.

### THE CLUE: DEF-092 — Clear History Reappears → Bug #11
- **Tracker says:** In Progress, P1. dev-marcus confirmed: "clear handler only does innerHTML = ''."
- **Connection to test failure:** This is the root cause of **REG-010** ("Clear history removes visible entries" — FAIL). The known issues page does NOT reference REG-010 by name — a sharp candidate connects the dots themselves.
- **Related but distinct:** Bug #12 (deleted items resurrect) is a separate bug with a similar symptom. DEF-092 only covers *clear*, not individual *delete*.

### WRONG REPRO STEPS: DEF-167 — Guest Calcs Leak → Bug #13
- **Tracker says:** Open, P2. dev-marcus "cannot consistently reproduce."
- **Why it's hard to repro:** The filed steps ("open tab, do calcs, login") are **wrong**. The actual trigger requires a *failed* login attempt first, which sets `lastAttemptedUser`. Without that failed attempt, guest calcs stay in guest scope.
- **A sharp candidate** figures out the actual trigger despite the misleading steps.

### CONFUSING DESCRIPTION: DEF-134 — Memory Indicator → Bug #18
- **Tracker says:** Open, P2, V2. "Memory indicator persists after logout."
- **What's really going on:** The description focuses on the visual indicator, but the deeper issue is that `memoryValue` is global — another user can recall a previous user's memory. The filed repro steps are incomplete.

### NOT REALLY A BUG?: DEF-156 — Percent Button → Bug #21
- **Tracker says:** Open, P3, V2. "Percent button produces unexpected output."
- **Ambiguity:** The percent behavior (simple /100) is arguably correct — the reporter expects Excel-style percent-of-base (200 + 10% = 220). The product-owner comment asks for clarification that was never given. A candidate might debate this either way.

### THE NOISE: DEF-041, DEF-078
- **DEF-041** (login idle timeout): Can't reproduce. Vague steps. Red herring.
- **DEF-078** (history scroll jump): Low-priority UX complaint. No steps, one-liner description. Noise.

### PARTIAL FIX TRAP: DEF-189 — Keyboard Input Bleed → Bug #10
- **Tracker says:** Fixed (v2 only, Feb 27). "Added focus detection to suppress calculator keyboard shortcuts when the password input field is active."
- **V1:** Still fully broken in all fields — login as alice, "123" appears on calculator. Very easy to spot.
- **V2: Fix is incomplete — three layers of discovery:**
  1. **Password field (fixed):** The bug report mentions this field, the dev fixed this field. Typing "password123" no longer bleeds.
  2. **Username field (still broken):** The dev only fixed what was in the report. Type a username with digits → they appear on the calculator. Candidates who test more than just the reported scenario will find this.
  3. **Signup modal (still broken):** All 8 signup inputs (phone, zip, etc.) are uncovered. Open signup, type a zip code → digits bleed behind the modal.
- **What a good candidate does:** Confirms password is fixed, then tests username and finds it still bleeds.
- **What an excellent candidate does:** Also checks the signup form, articulates that the fix should check `e.target.tagName === 'INPUT'` instead of hardcoding one specific element.

### GENUINELY FIXED: DEF-055, DEF-103
- **DEF-055** (signup Enter key submit): Actually fixed. Not reproducible.
- **DEF-103** (display truncates long results): Actually fixed. A candidate might conflate this with MAN-008 (flaky test about long numbers) but they're different issues.

---

## Test Report Key Findings

### V1 Test Report (30 tests: 27 pass, 2 fail, 1 flaky)
| Test | Result | Notes |
|------|--------|-------|
| REG-010 | **FAIL** | "Clear history removes visible entries" — entries re-appeared after refresh. Maps to Bug #10 / DEF-092 |
| REG-012 | **FAIL** | "Consecutive calculations maintain state" — timeout 5000ms exceeded |
| MAN-008 | **FLAKY** | "Display handles long numbers" — truncated on first run. Possibly related to float noise (Bug #6) |

### V2 Test Report (12 tests: 12 pass, 0 fail)
- **BUT:** v1 regression suite has NOT been run against v2
- **All v1 bugs still exist in v2** (shared engine code) except keyboard input bleed (Bug #10), which is partially fixed for login fields only
- Explicitly listed coverage gaps: memory persistence across login/logout, guest memory, percent in expressions, memory API

---

## Documentation Discrepancies (API Docs)

| What | Docs Say | Reality |
|------|----------|---------|
| `POST /calculate` example | `"5 + 3 * 2"` → `"11"` | Engine returns `16` (no operator precedence) |
| `POST /calculate` response | `"savedToHistory": true` | Code returns `false` |
| Signup `firstname`/`lastname` | "Optional" in API docs | **Required** in UI form, optional via API |
| Logout `Authorization` header | "Required" | No auth check at all |
| History endpoints `Authorization` | "Required" on all | Zero auth checks — any userId works |
| BroadcastChannel name | v1: `'testcalc'`, v2: `'testcalc-v2'` | Cross-version API calls won't work |

---

## What Great Candidates Find

**Tier 1 — Basics (most candidates):**
- Run the failing tests, find REG-010 and REG-012
- Try the calculator, notice basic bugs like double decimal or float noise
- Notice credentials in the info panel
- Notice keyboard input from the password field bleeds into the calculator (e.g., "123" appears after logging in as alice)
- Notice C button doesn't clear the expression line above the display

**Tier 2 — Good (strong candidates):**
- Check DEF-127 "Fixed" status → verify it's still broken (primary trap)
- Connect DEF-092 to REG-010 failure (defect doesn't mention test ID — candidate makes the link)
- Try SQL injection on the login form
- Notice the = key doesn't work, find the Won't Fix thread, appreciate the absurdity
- Point out v2 regression suite hasn't been run despite sharing all v1 engine code

**Tier 3 — Excellent (top candidates):**
- Check DEF-112 email validation → verify still broken (secondary trap — requires full signup flow)
- Figure out the guest-calc leak requires a *failed* login (DEF-167 has wrong steps)
- Find the ghost login (empty credentials)
- Notice API docs have wrong calculation results (no operator precedence — docs say 11, engine returns 16)
- Catch that API endpoints have no actual auth despite docs saying "Required"
- Notice deleted history items resurrect on refresh/login (separate from clear bug)
- Find memory leaks across users in v2

**Tier 4 — Exceptional:**
- Read the code, find all `// BUG:` comments
- Map documentation discrepancies systematically (API docs vs. reality)
- Notice the BroadcastChannel name mismatch between v1/v2
- Realize `showDeleteButtons` leaks across sessions after ghost login
- Identify XSS risk in history panel via API
- Notice that DEF-148's dev originally couldn't reproduce due to a browser extension, then argued the bug was intentional — pattern-match this to real-world "works on my machine" dysfunction
