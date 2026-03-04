# Interviewer Notes — TestCalc

**Do not share this file with candidates.**

## Overview

TestCalc contains **10 intentionally planted bugs** across functional, UX, edge-case, keyboard, and history-panel categories. A strong candidate should find 6–7 in 30–45 minutes. An exceptional candidate will find 8–10 and articulate root causes.

---

## Planted Bugs

### Bug 1: Multiple decimal points allowed

- **Category:** Functional / Input validation
- **Location:** `CalculatorEngine.inputDecimal()` in `app.js`
- **Reproduce:** Type `3`, `.`, `1`, `.`, `4` — display shows `3.1.4`
- **Expected:** Second `.` press should be ignored
- **Actual:** Multiple decimals are appended, creating an invalid number. `parseFloat("3.1.4")` silently evaluates as `3.1`, so the display and computed value disagree.
- **Fix:** Check `state.currentInput.includes('.')` before appending.
- **Discussion:** Ask about input validation, silent data corruption, and how `parseFloat` handles malformed strings.

### Bug 2: +/- toggle on zero produces "-0"

- **Category:** UX / Edge case
- **Location:** `CalculatorEngine.toggleSign()` in `app.js`
- **Reproduce:** With display showing `0`, press `+/-`. Display shows `-0`.
- **Expected:** Display should remain `0` (negative zero is meaningless in this context).
- **Actual:** `-0` is displayed. Subsequent digit input produces `-05` instead of `-5`.
- **Fix:** Add `if (state.currentInput === '0') return state;` at the top of `toggleSign`.
- **Discussion:** Cascading bugs — the `-0` causes a secondary display issue (`-05`). Ask about IEEE 754 negative zero.

### Bug 3: Divide by zero shows "Infinity"

- **Category:** Functional / Error handling
- **Location:** `CalculatorEngine.evaluate()` in `app.js`
- **Reproduce:** Type `5`, `÷`, `=` (divisor defaults to `0`). Or `5 ÷ 0 =`.
- **Expected:** User-friendly error message (e.g., "Cannot divide by zero" or "Error").
- **Actual:** Display shows `Infinity` (raw JavaScript result). `0 ÷ 0` shows `NaN`.
- **Fix:** Check if divisor is 0 before dividing; return an error state.
- **Discussion:** Error handling philosophy, user-facing vs. developer-facing messages, `NaN` vs. `Infinity` distinction.

### Bug 4: DEL after equals mutates the result

- **Category:** Functional / State management
- **Location:** `CalculatorEngine.deleteLast()` in `app.js`
- **Reproduce:** Type `1`, `2`, `+`, `3`, `=` (display: `15`). Press `DEL`. Display shows `1`.
- **Expected:** DEL after evaluation should either be ignored or clear the display entirely.
- **Actual:** Backspace removes the last character of the computed result, as if it were editable text. The `evaluated` flag remains `true`, so the next operator uses the mangled value.
- **Fix:** Add `if (state.evaluated) return state;` at the top of `deleteLast`.
- **Discussion:** State machine design — what transitions should be valid after evaluation? Ask about the cascading effect if user continues computing with the mangled value.

### Bug 5: Clear (C) does not reset the history display

- **Category:** UX / Display
- **Location:** `render()` function in `app.js` (UI layer)
- **Reproduce:** Type `2`, `+`, `3`, `=` (history shows `2 + 3 =`). Press `C`. Display resets to `0` but history still shows `2 + 3 =`.
- **Expected:** History line should also be cleared.
- **Actual:** The `render()` function only updates the history element when `getHistoryText()` returns a non-empty string. After clear, it returns `''`, so the update is skipped and stale text remains.
- **Fix:** Change the conditional to always update: remove the `if (historyText)` guard, or add `else { historyEl.textContent = ''; }`.
- **Discussion:** Good example of a UI-layer bug vs. engine-layer bug. The engine state is correct; the rendering logic has the flaw. Ask about separation of concerns.

### Bug 6: Floating-point rounding not handled

- **Category:** Functional / Display
- **Location:** `CalculatorEngine.evaluate()` in `app.js`
- **Reproduce:** Type `0`, `.`, `1`, `+`, `0`, `.`, `2`, `=`. Display shows `0.30000000000000004`.
- **Expected:** Display should show `0.3` (or at most a reasonable number of decimal places).
- **Actual:** Raw IEEE 754 floating-point result is displayed without any rounding.
- **Fix:** Apply rounding, e.g., `parseFloat(result.toPrecision(12))` before converting to string.
- **Discussion:** IEEE 754 floating-point representation, why `0.1 + 0.2 !== 0.3`, and what precision/rounding strategy is appropriate for a calculator. Many candidates will recognize this classic issue.

### Bug 7: Consecutive operators don't replace — phantom zero injected

- **Category:** Functional / State management
- **Location:** `CalculatorEngine.inputOperator()` in `app.js`
- **Reproduce:** Type `5`, `+`, `×`, `3`, `=`. History shows `5 + 0 × 3 =`, result is `15`.
- **Expected:** Pressing `×` after `+` should replace `+` with `×`, giving `5 × 3 = 15`. Or at minimum, no `0` should appear.
- **Actual:** The second operator commits the current input (`0`) and appends both to the expression, producing `5 + 0 × 3`. Left-to-right evaluation: `(5 + 0) × 3 = 15`. Result may coincidentally seem correct for some cases but the history reveals the bug, and other operator combinations (e.g., `5 × + 3`) give clearly wrong results (`0 + 3 = 3` instead of `8`).
- **Fix:** Before appending, check if the last element in `expression` is an operator. If so, replace it instead of pushing `currentInput` and the new operator.
- **Discussion:** Excellent severity-assessment question. Some operator combinations produce coincidentally-correct results, masking the bug. Ask the candidate to find a case where it produces a *wrong* answer (e.g., `5 × + 3`).

### Bug 8: Keyboard `=` key does not trigger equals

- **Category:** Keyboard / Accessibility
- **Location:** Keyboard event handler in `app.js`
- **Reproduce:** Type an expression using the keyboard, then press `=` (not `Enter`). Nothing happens.
- **Expected:** `=` key should trigger evaluation, same as the `=` button.
- **Actual:** Only `Enter` is mapped to equals. The `=` key is not handled in the `keydown` listener.
- **Fix:** Add `else if (e.key === '=') handleEquals();` to the keyboard handler.
- **Discussion:** Keyboard discoverability, user expectations, and the difference between `Enter` and `=`. Ask about how they'd test keyboard support systematically.

### Bug 9: DEL after equals desyncs the display from the history panel

- **Category:** History panel / State desync (multi-step)
- **Location:** Interaction between `deleteLast()` and `addHistoryEntry()` in `app.js`
- **Reproduce:** Type `1`, `2`, `+`, `3`, `=` (display: `15`, history panel entry: `= 15`). Press `DEL`. Display changes to `1`, but the history panel still shows `= 15`.
- **Expected:** The history panel and display should be consistent — either DEL is ignored after evaluation, or the history entry is updated/removed.
- **Actual:** The history entry is created once on `=` and never updated. DEL mutates the display (Bug 4), but the panel retains the original result. Worse: pressing an operator after DEL starts a new expression using the mangled value `1`, while the panel still claims the result was `15`.
- **Fix:** Either prevent DEL after evaluation (fixes Bug 4 too), or remove/update the most recent history entry when the result is modified.
- **Discussion:** This is a **compound bug** — it requires discovering Bug 4 first, then checking whether the history panel reflects the change. Tests the candidate's ability to think about state consistency across multiple UI surfaces. Ask: "If you fixed Bug 4, would this bug also be fixed?" (Yes — it's a cascading fix.)

### Bug 10: History panel silently clips old entries — no scrolling

- **Category:** UX / History panel / Accessibility
- **Location:** `#history-list` in `styles.css`
- **Reproduce:** Perform 10+ calculations so the entries exceed the panel's visible height. Scroll down to see earlier entries — you can't. They are clipped and inaccessible.
- **Expected:** The history list should scroll to reveal older entries.
- **Actual:** The `#history-list` element has `overflow-y: auto` but no constrained height (missing `flex: 1`). It grows to fit content, and the parent `#history-panel` clips it with `overflow: hidden; max-height: 480px`. The scrollbar never appears because the list element itself is never "overflowing" — it's the *parent* that overflows. Earlier entries are silently lost to the user.
- **Fix:** Add `flex: 1` to `#history-list` so it fills the available space within the panel and triggers its own scrollbar.
- **Discussion:** This is a CSS layout bug disguised as a missing feature. The developer clearly *intended* scrolling (`overflow-y: auto` is present) but made a flex sizing mistake. Ask the candidate: "The CSS says `overflow-y: auto` — why doesn't it scroll?" Strong candidates will inspect the element and identify the missing flex sizing. Also discuss: is silent data loss worse than a visible error?

---

## Scoring Guide

| Bugs Found | Assessment |
|------------|------------|
| 1–3 | Below expectations — candidate only tested happy paths |
| 4–5 | Meets minimum — found obvious bugs but missed subtleties |
| 6–7 | Strong — good exploratory testing instincts |
| 8–10 | Exceptional — thorough, systematic, and detail-oriented |

### Bonus discussion points

- **Does the candidate test with keyboard?** Many will only click buttons.
- **Do they check the history line?** Bug 5 and Bug 7 require attention to the secondary display.
- **Do they check the history panel?** Bugs 9 and 10 require attention to the side panel after multi-step interactions.
- **Do they test state transitions?** Bugs 4, 7, and 9 involve post-operation state.
- **Can they articulate root causes?** E.g., Bug 6 is IEEE 754, Bug 5 is a UI rendering flaw, Bug 10 is a CSS flex sizing mistake.
- **Do they assess severity accurately?** Bug 3 (Infinity) is worse than Bug 2 (-0) in terms of user impact. Bug 10 is silent data loss.
- **Do they use the test harness?** Candidates who open `test.html` and use it to verify hypotheses show strong technical testing skills.
- **Do they identify compound bugs?** Bug 9 requires finding Bug 4 first, then checking cross-surface consistency.

### Follow-up questions

1. "If you had to fix just one bug before shipping, which would it be and why?"
2. "How would you write automated tests for this calculator?"
3. "Can you think of any bugs we *haven't* planted that might exist in a real calculator?"
4. "How would you prioritize these bugs in a real sprint?"
