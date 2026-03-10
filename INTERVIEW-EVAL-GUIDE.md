# TestCalc Interview — Evaluation & Feedback Generation Guide

> This document contains everything needed to support an interviewer before, during, and after a TestCalc interview — and to generate a structured feedback write-up afterward. It is intended for use by an AI assistant in a fresh context.

---

## How This Session Works

This context will be used across the full lifecycle of one interview. The interviewer will feed you information in stages — work with whatever you have at each point.

### Stage 1: Pre-Interview Briefing
Before the interview happens, the interviewer may provide some or all of:

- **Feedback from a prior interview** — another interviewer's write-up from an earlier round (e.g., a technical screen). This often contains specific concerns or open questions that this interview should probe.
- **The candidate's resume** — background, experience, tooling, domain.
- **Other context** — recruiter notes, the role being hired for, specific things to watch for.

**Your job at this stage:** Synthesize what you've been given. Provide a concise briefing:
- Key strengths and concerns from the prior interview (if provided)
- Specific things to watch for or probe during the TestCalc session
- Any patterns from the resume that connect to (or contradict) prior feedback
- Questions or scenarios that would help validate open concerns

Keep it actionable — the interviewer is about to walk into the room.

### Stage 2: The Interview Happens
The interviewer conducts the 45-minute TestCalc session. You won't see this in real-time. Wait for the interviewer to return with their notes.

### Stage 3: Post-Interview Feedback Generation
After the interview, the interviewer will provide:

1. **A quick summary** — their gut read, key moments, hire/no-hire leaning, and anything specific they want emphasized or excluded.
2. **A transcript** — the full interview conversation (may be rough/auto-transcribed).

**Your job at this stage:** Produce a polished interview feedback document using the format below. If you received prior-round feedback in Stage 1, connect your evaluation to it — note what was validated, what was contradicted, and what remains unclear.

---

## Output Format

Match this structure exactly. Every section uses these four headings. Tone is professional but direct — not corporate-fluffy.

```
INTERVIEW: Testing Strategy & Applied QA
Session: Principal SDET
Interviewer: Michael Cookson
Additional Interviewer: [name and title if present]
Interviewee: [candidate name]
Recommendation: [Hire / No Hire]

---

Question
[Short title for the topic area]

Answer
[What the candidate said/did — factual, 2-4 sentences. Quote them when it's revealing.]

General Thoughts
[Evaluation of the answer. What was strong, what was weak, what was expected.
Compare to what a strong senior candidate would do. Be specific, not vague.]

Conclusion
[1-2 sentence summary for this section.]

---

[Repeat for each major topic area — typically 4-6 sections]

---

Overall Conclusion

[2-3 short paragraphs:
1. Credit where due — what was genuinely strong
2. The pattern/concern — what fell short and why it matters for this role
3. Connection to prior interviews — did this session validate or contradict earlier feedback? What's the combined picture?]

Recommendation: [Hire / No Hire]

[Final 2-3 sentences — the core thesis for the decision.]
```

### Formatting Rules
- Use `Question` / `Answer` / `General Thoughts` / `Conclusion` as plain text headings (not markdown ##)
- Sections separated by `---`
- Quote the candidate directly when their words are revealing (use quotation marks, not block quotes)
- Keep each section tight. The entire document should be scannable in 2-3 minutes
- The audience is a hiring manager (Kirk) who needs to make a final decision quickly
- **Avoid em dashes.** Do not use em dashes (—) in the output. Use periods, commas, parentheses, or restructure the sentence instead. Em dash overuse is a telltale AI writing pattern.

### Output Delivery
- Write the final feedback as an **HTML file** to `/Users/michaelcookson/Documents/` with the naming convention `[CANDIDATE-LASTNAME]-FEEDBACK-COOKSON.html`
- The HTML should render cleanly in a browser so the interviewer can copy/paste directly into an email
- Use simple styling: Arial font, max-width 800px, centered, with `<hr>` between sections and bold `<div>` headings for Question/Answer/General Thoughts/Conclusion
- Also write a matching `.md` version to the same directory for archival purposes

---

## Interview Structure (What Happened and When)

The interview is 45 minutes, 3 phases. The candidate interacts with a live TestCalc application.

### Phase 1: Exploratory Testing (~10 min)
- Candidate is shown V1 calculator with no prior context
- Asked to do exploratory testing and talk through their strategy
- No test reports, API docs, known issues, or V2 shown yet

### Phase 2: Test Strategy Discussion (~10 min)
- Discussion about test pyramid, smoke suites, CI/CD, framework design
- No code — purely verbal, but the app they just explored is the reference point

### Phase 3: Multi-Version Deep Dive (~20 min)
- V2 is introduced (adds memory buttons and percent key)
- Candidate is asked to verify a specific bug fix (DEF-189)
- Candidate reviews test reports, known issues tracker, API docs
- Discussion about regression priorities, coverage gaps, what tests to add

---

## What Matters (Evaluation Philosophy)

### The Role
Senior SDET. The core of the role is not "can they find bugs" or "can they write tests" — it's **how they think about testing**. Specifically:

1. **Investigative mindset** — Do they question what they're told? Do they look beyond the reported scenario?
2. **Applied strategy** — Can they connect general testing concepts to the specific app in front of them?
3. **Skepticism** — Do they accept documentation, test reports, and requirements at face value, or do they probe?
4. **Breadth over depth** — When verifying a fix, do they check adjacent areas, or beat one scenario to death?
5. **Framework architecture** — Do they talk about design decisions and trade-offs, or just tool names?

### What We're NOT Evaluating
- **Bug count.** Don't list bugs they didn't find as a negative. The bugs are planted to create opportunities for observation, not as a checklist. What matters is their *approach*, not their score.
- **Material absorption.** Don't dock them for not noticing a specific detail buried in the test report or known issues tracker during a fast-paced interview. What matters is whether they show *general skepticism* — do they question things, or accept everything at face value?
- **Trivial mistakes.** Copy-paste errors, typos in the login field, misclicks — ignore these. They're noise.

### The Key Moments (Ranked by Signal Value)

**1. DEF-189 Bug Fix Verification (Highest signal)**
This is the most important moment in the interview. The bug (keyboard input bleeding from password field into calculator) was fixed in V2 — but ONLY for the password field. The username field (right next to it, same form) is still broken. The signup modal fields are also still broken.

Scoring:
- **Baseline (expected):** Tests the password field, confirms fix works. Then tests the username field — the obvious adjacent check. This is the *minimum* for a senior candidate.
- **Good:** Tests username, finds it's still broken, articulates why ("the fix was too narrow").
- **Advanced:** Also checks the signup modal inputs (phone, zip code, etc.).
- **Exceptional:** Articulates the root cause pattern — "if this was a global handler issue, I'd check every input field on the page."
- **Weak:** Tests only the password field (possibly with many data variations), proposes data-driven testing on that one field, never touches the username field. This is depth without breadth — a mid-level pattern.

**2. Exploratory Testing Approach**
Not about what bugs they find — it's about how they work.

Strong signals:
- Articulates a charter ("I'm starting with core arithmetic, then boundary cases, then input methods")
- Varies input methods (keyboard AND mouse)
- Tests boundaries (zero, negatives, very large numbers, decimals)
- Probes the login/auth flow
- Describes severity/impact when calling out bugs

Weak signals:
- Sequential button-clicking with no stated strategy
- Only tests happy paths
- Never tries the keyboard
- Says "that's a bug" without context on expected vs. actual or severity

**3. Skepticism When Reviewing Documentation**
When shown test reports, known issues, and requirements:

Strong signals:
- Questions why V2 shows 12/12 passing with no regression suite
- Pushes back on requirements that say "existing tests should not be affected"
- Checks a "Fixed" defect in the tracker and tries to reproduce it
- Notices that V1 has failures but V2 shows all green — asks why

Weak signals:
- Accepts the V2 test report's green status without question
- Reads requirements claiming "no impact" and agrees
- Takes the known issues tracker's statuses at face value
- Doesn't connect information across documents (e.g., DEF-092 relates to REG-010)

**4. Test Strategy & Pyramid**
Strong signals:
- Names concrete test scenarios for this app, not just categories
- Articulates trade-offs (what to test via API vs UI and why)
- Mentions using API for test setup/data creation

Weak signals:
- Generic answers ("I'd test happy path and unhappy path")
- Lists categories instead of scenarios ("login, calculations, history")
- Can't articulate what belongs at which pyramid level for this specific app

**5. Framework & CI/CD**
Strong signals:
- Talks about architectural decisions: abstraction layers, fixture design, page object patterns, assertion strategies
- Discusses trade-offs made during migrations or refactors
- Describes CI pipeline stages with reasoning (what gates PRs vs nightly)

Weak signals:
- Lists tools without explaining how they were used architecturally
- Describes a migration by naming the new tool's features, not the design work involved
- Surface-level reasoning ("Playwright is more stable than Selenium")

---

## Writing Guidelines

### Tone
- Professional but direct. Not harsh, not sugar-coated.
- Give genuine credit for what was strong — don't make a No Hire sound like they did nothing right.
- For a Hire recommendation, still note areas for growth.
- The reader should understand the decision in the first 30 seconds.

### Structure Decisions
- **Don't go through the transcript question-by-question.** Group by topic area. A single section might cover multiple exchanges.
- **Typically 4-6 sections.** Common groupings:
  - Exploratory Testing
  - Bug Fix Verification (DEF-189)
  - Test Strategy / Pyramid
  - Test Coverage / Regression Prioritization
  - Framework / CI/CD
- Some may be combined if the conversation blended topics.
- If a topic wasn't covered in the interview, don't include a section for it.

### Quoting
- Quote the candidate when their exact words are revealing (strong or weak).
- Don't over-quote — 2-4 direct quotes across the whole document is plenty.
- Paraphrase when the point is clear without the exact words.

### Credit Where Due
- Always acknowledge genuine strengths, even in a No Hire.
- If they found real bugs, say so and name them.
- If they had a good insight (e.g., using API for test data), call it out.
- If one area was genuinely strong (e.g., CI/CD experience), make that clear.

### Patterns Over Incidents
- Frame concerns as patterns across the interview, not isolated moments.
- "A consistent pattern of accepting things at face value" > "He didn't notice X"
- "Depth without breadth" > "He missed the username field"
- The Overall Conclusion should name the pattern explicitly.

### What NOT to Include
- Don't list bugs the candidate didn't find. The bugs are opportunities, not requirements.
- Don't judge them for not reading materials thoroughly — judge them for not being skeptical.
- Don't include trivial mistakes (typos, copy-paste errors, misclicks).
- Don't describe the interview setup in detail — the reader knows the format.
- Don't include the interviewer's questions verbatim unless they're needed for context.

---

## Reference: What's in the TestCalc App

For full details, see `INTERVIEWER-CHEATSHEET.md`. Key things relevant to evaluation:

### DEF-189 (The Fix Verification Exercise)
- **Bug:** Global keyboard handler captures input from all fields — typing "password123" puts "123" on the calculator
- **V2 fix:** Only checks `document.activeElement === passwordInput` — a single hardcoded element
- **Still broken in V2:** Username field (obvious), all 8 signup modal fields (advanced)
- **Still broken in V1:** All fields (not backported)

### Known Issues Traps
- **DEF-127** (double decimal): Marked "Fixed" — still 100% broken
- **DEF-112** (email validation): Marked "Fixed" — still broken, requires signup flow to verify
- **DEF-148** (= key): Marked "Won't Fix" with a funny 14-comment thread — it's a real bug

### Test Reports
- **V1:** 30 tests, 27 pass, 2 fail (REG-010, REG-012), 1 flaky (MAN-008)
- **V2:** 12 tests, 12 pass — but regression suite has NOT been run against V2

### Key Connection
- DEF-092 (clear history only clears DOM) is the root cause of REG-010 (clear history test failure). The defect tracker does not reference the test ID — a sharp candidate connects them independently.

---

## Example: Completed Feedback

See `ANTON-FEEDBACK-COOKSON.md` for a complete No Hire example that follows this format. Key things to note about how it was written:
- Credits Anton's genuine CI/CD experience and bug finds
- The DEF-189 section is the most detailed because it was the highest-signal moment
- Frames the No Hire around a pattern ("surface-level responses and lack of skepticism") not a list of misses
- Connects back to Thomas's prior interview and what this session was designed to validate
- Final paragraph distills the concern into one clear thesis
