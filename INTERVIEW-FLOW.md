# TestCalc QA Interview — Flow Guide

> 45-minute session, 3 phases. Keep it conversational. The app does the heavy lifting.
>
> **Context:** Thomas's follow-up rec asks us to validate: (1) framework design & trade-offs, (2) CI/CD & pipeline optimization, (3) flakiness at scale, (4) cross-team influence & shift-left. Items 1-3 are woven into Phases 2-3 below. Item 4 is covered by the management interview.

## At a Glance

| Time | Phase | You do | They do | Validation areas |
|------|-------|--------|---------|-----------------|
| 0-10 | **Exploratory** | Open V1, sit back | Test the calculator, call out bugs | — |
| 10-20 | **Strategy** | Ask about pyramid, smoke suite, CI | Talk test approach for API-backed UI app | Framework, CI/CD, Flakiness |
| 20-40 | **Deep Dive** | Open V2, show docs/tracker/reports | Verify DEF-189 fix, review coverage gaps, spot traps | Framework, Flakiness, Shift-left |
| 40-45 | **Wrap-up** | "What tests would you add first?" | Prioritize, summarize findings | — |

---

## Phase 1: Exploratory Testing (~10 min)

**Setup:** Open V1 calculator in the browser. No other tabs. Don't mention the test reports, API docs, known issues, or V2 yet.

**Prompt:**
> "This is TestCalc — a calculator app our team ships. I'd like you to spend about 10 minutes doing exploratory testing. Talk me through what you're doing and what you notice as you go."

**What you're watching for:**
- Do they have a charter or just click randomly?
- Do they test boundaries (zero, negatives, decimals, large numbers)?
- Do they try the keyboard, not just buttons?
- Do they notice the login form and test it?
- Do they articulate severity/impact when calling out bugs, or just say "that's broken"?

**Easy bugs they should find:** keyboard bleed ("123" after alice login), double decimal, float noise (0.1+0.2), stale expression after clear, divide by zero showing "Infinity"

**Follow-up prompts to drop in the moment:**
- "What's your charter right now — what are you trying to learn?"
- "Of what you've found so far, what's highest risk to a user?"
- "If you had 30 minutes before release, what do you test and what do you skip?"

---

## Phase 2: Test Strategy Discussion (~10 min)

**Transition:**
> "Good findings. Before we look at any of the existing test infrastructure, let's talk strategy. If you were owning quality for this app — it has a UI, an API backend, user auth, persistent history — how would you approach testing it end to end?"

**Core questions (pick 2-3):**
- "What does the test pyramid look like for this app? What belongs in unit vs API vs E2E?"
- "What's your smoke suite — which tests specifically, and why those?"
- "If you parallelize UI tests, what's your plan for data isolation and shared state?"
- "What would you make non-negotiable in the framework (fixtures, data builders, logging), and what stays close to the test?"

**Framework design & trade-offs:**
- "How do you prevent a framework from becoming its own product — what are your rules for saying no to features?"
- "Where do you draw the line between page objects vs component fixtures for something this size?"
- "What's a framework decision you made that you later reversed? What signal told you it was wrong?"

**CI/CD & pipeline optimization:**
- "Walk me through your ideal pipeline stages — what gates PRs vs what runs nightly?"
- "If pipeline time doubled overnight, what are the first 3 places you look?"
- "How do you implement selective execution (tags, impacted areas, changed files) without it becoming brittle?"

**Flakiness at scale:**
- "How do you balance retry policies vs hiding real defects? What's your rule of thumb?"
- "What are your top root causes of flakiness, and how do you diagnose which bucket a failure is in?"
- "What's your stance on 'no UI tests in PR' — when is that correct vs dangerous?"

---

## Phase 3: Multi-Version Testing & Documentation Deep Dive (~20 min)

**Transition:**
> "Let me show you something. We recently shipped V2 — it adds memory buttons and a percent key. V1 is still supported. There's also a known issues tracker, test reports, and API docs. Take some time to look through these."

Open V2, point them to the links bar (Known Issues, Test Report, API Docs).

### 3a: The DEF-189 Fix (5 min)

**Prompt:**
> "One bug that was recently fixed in V2 is this keyboard input bleed — DEF-189. Can you verify the fix?"

**What you're watching for:**
- Do they just test the password field (what the bug report describes) and call it good?
- Do they test the username field too? (still broken)
- Do they open the signup form and test those fields? (still broken)
- Do they articulate *why* the fix is incomplete?

**Follow-up:**
> "If you were supporting both V1 and V2, how do you structure your test suites? Shared tests vs version-specific?"

### 3b: Test Coverage & Known Issues (10 min)

**Prompt:**
> "Look at the test reports and the known issues tracker. What's your read on the current state of quality?"

**What you're watching for:**
- Do they notice V2 has zero regression coverage? ("v1 regression suite has not been run against v2")
- Do they connect DEF-092 to REG-010? (defect doesn't reference the test)
- Do they check any "Fixed" defects and discover DEF-127 or DEF-112 are still broken?
- Do they catch API doc discrepancies (wrong calc result, fake auth requirements)?
- Do they notice V1 has 2 failures and 1 flaky but V2 shows all green — and question that?

**Follow-up questions:**
- "What tests would you add first for V2?"
- "How do you handle a defect marked Fixed that you can still reproduce?"
- "The V2 test report shows 12/12 passing. How confident does that make you?"

**Shift-left & process (if it comes up naturally):**
- "DEF-127 was marked Fixed but is still broken — what would you change in the process so that doesn't ship?"
- "MAN-008 is flaky. How do you handle time in tests — timeouts, polling, fake timers, network mocking?"
- "What telemetry do you require to debug flakes fast (trace viewer, console logs, network HARs, screenshots)?"
- "If the app has these subtle history bugs, how would your framework help detect them earlier — deterministic assertions, stable selectors, time control?"

---

## Candidate Signal Quick Reference

| Signal | Strong | Weak |
|--------|--------|------|
| Exploratory approach | Has a charter, tests boundaries, varies input types, checks keyboard + mouse | Random clicking, only happy path, doesn't try edge cases |
| Bug communication | States expected vs actual, severity, repro steps | "That looks wrong" with no context |
| Pyramid / strategy | Concrete examples tied to this app, mentions trade-offs | Recites textbook pyramid without connecting to the app |
| Framework design | Knows when to abstract vs keep simple, has opinions on what to say no to | Wants to build everything, or has no framework opinions |
| CI/CD & pipelines | Knows PR vs nightly trade-offs, selective execution, actionable artifacts | Vague about where/how tests run |
| Flakiness handling | Categorizes root causes, has retry policy, knows diagnostic tooling | "Just rerun it" or no strategy beyond retries |
| Verification mindset | Checks "Fixed" items, questions green suites, reads beyond the summary | Takes tracker and reports at face value |
| Shift-left thinking | Talks about PR checks, definition of done, catching DEF-127 before deploy | Only thinks about testing after code is written |
| Multi-version thinking | Shared regression suites, version matrices, flag-based execution | Treats V1 and V2 as completely separate |
