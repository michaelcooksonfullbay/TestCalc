INTERVIEW: Testing Strategy & Applied QA
Session: Principal SDET / Associate Manager
Interviewer: Michael Cookson
Additional Interviewer: Jack Linderoth (SDET)
Interviewee: Anton Demchuchen
Recommendation: No Hire

---

Question
Exploratory Testing Exercise (V1 Calculator)

Answer
Anton was given the TestCalc V1 application with no prior context and asked to spend 10 minutes doing exploratory testing, calling out bugs and talking through his strategy. He found several legitimate issues: the double-operator phantom zero (pressing 5 + x inserts a 0), stale expression text remaining after login, and a UX issue where clicking outside the signup modal dismisses it and loses all entered data.

General Thoughts
While he found real bugs, his approach lacked structure. When asked what his charter was, he described testing "basic functionality" without articulating what risks he was probing or what he was trying to learn. Testing was sequential — buttons, then login, then signup — rather than risk-driven. He did not try the keyboard at any point during exploratory testing, interacting only through button clicks. For a senior-level candidate, I would expect a more deliberate strategy: boundary testing, input method variation, and at minimum articulating what areas carry the highest risk.

Conclusion
Found legitimate bugs through general exploration but did not demonstrate the structured, charter-driven approach expected at a senior level.

---

Question
Bug Fix Verification (DEF-189 — Keyboard Input Bleed)

Answer
Anton was shown the DEF-189 bug report (keyboard input from the password field bleeding into the calculator) and asked to verify the fix in V2. He read the ticket, then tested the password field using the exact data from the bug report ("password123"). He confirmed the fix worked, then proposed data-driven testing with "different format passwords — just symbols, negative numbers, alphabetic" to further validate the same field.

General Thoughts
This was the most revealing moment of the interview. The fix only covers the password field — the username field and all signup modal inputs still exhibit the exact same bug. Anton's instinct was to test depth (exhaustive data variations on the field mentioned in the report) rather than breadth (does this same class of bug affect adjacent fields?). He proposed beating the password field to death with data combinations but never typed a single digit into the username field directly next to it. Testing the username field was supposed to be the obvious check — it's the field right next to the one in the bug report, on the same form. Finding it in the signup modal would have been advanced. He didn't get to the obvious one. For a Senior SDET, the immediate instinct should be: "If this bug was caused by a global keyboard handler not filtering input fields, which other input fields are affected?" That question was never asked.

Conclusion
Verified only what the bug report described without questioning the scope of the fix. Did not demonstrate the investigative mindset needed to catch incomplete fixes — a core skill for the role.

---

Question
Test Strategy & Pyramid Discussion

Answer
When asked how he would approach testing this application end-to-end, Anton stated he would need requirements. When asked about the test pyramid, he pivoted to "I don't have access to the source code to be able to do unit testing." For his smoke suite, he listed "login functionality, some sanity checks on inputs, basic operations." For API testing, he described testing status codes, request/response schemas, and correct vs. incorrect payloads.

General Thoughts
Answers remained general and did not connect to the specific application. A strong candidate would point to concrete scenarios — "one calculation end-to-end, history persistence after login/logout, a negative auth test" — with reasoning about why those give confidence. Anton listed categories rather than scenarios. He did make a good observation about using the API to create test data to speed up UI tests, which shows practical thinking about setup.

Conclusion
Understands testing concepts at a general level but struggled to apply them concretely to the application under test. Responses lacked the specificity and trade-off reasoning expected at a senior level.

---

Question
Test Coverage Assessment & Regression Prioritization

Answer
Anton was shown the V1 test report (2 failures, 1 flaky, 27 passing) and the V2 test report (12/12 passing, no regression suite run). When asked about regression priorities for V2, he correctly identified the two previously failing tests (REG-010, REG-012) as priorities, reasoning "they failed before, so this is probably the area that's gonna fail." He also suggested contacting the product owner to understand fix status. When the V2 requirements stated "existing tests should not be affected," he accepted this at face value.

General Thoughts
Prioritizing previously failing tests is reasonable but reactive. He did not question why V2 showed 12/12 passing with zero regression coverage. When the requirements stated the new feature was "independent" and "existing tests should not be affected," he accepted it — a senior candidate should push back, since features always carry regression risk. More broadly, there was a consistent pattern of taking things at face value: the V2 report's green status, the requirements' assurance of no impact, and the known issues tracker's "Fixed" labels were all accepted rather than questioned.

Conclusion
Showed reasonable instincts on regression priority but consistently accepted documentation at face value. The role requires someone who questions assumptions and probes beneath the surface of what's reported — that skepticism was not demonstrated.

---

Question
Framework Design & CI/CD Experience

Answer
Anton described his most recent framework: Python/PyTest with Selenium (migrated to Playwright), GraphQL test utilities he built for a multi-page enrollment flow, and GitHub Actions pipelines with tag-based selective execution, matrix-based parallelization, environment dropdowns, and BrowserStack integration for cross-browser and device testing. He also described working around passkey authentication limitations on BrowserStack using virtual authenticators.

General Thoughts
The CI/CD and infrastructure work was the strongest part of the interview. The GitHub Actions setup he described — tag-based execution, environment selection via dropdowns, matrix parallelization, BrowserStack integration — is practical and well-considered. The passkey/virtual authenticator work shows he's solved real, non-trivial problems. However, when discussing the Selenium-to-Playwright migration, his reasoning focused on surface-level benefits: "more stability," "easier to maintain," and that Playwright's AI features (self-healing, generator, planner) "would be very useful to speed up the process." He did not discuss how the framework was architected — page object structure, abstraction layers, fixture design, assertion patterns, or how he handled the migration itself. For a senior-level role where framework *design* is a core responsibility, I would expect him to talk about the decisions he made and the trade-offs he weighed, not just the tools he selected.

Conclusion
Demonstrated solid CI/CD infrastructure experience and practical problem-solving. Framework discussion remained at the tool-selection level rather than the architectural level expected for a Senior SDET.

---

Overall Conclusion

Anton is personable, engaged, and has genuine hands-on experience — particularly with CI/CD pipelines and infrastructure challenges like passkey authentication. He found real bugs during exploratory testing and showed practical instincts around API-driven test setup.

However, a consistent pattern emerged across the session: surface-level responses and a lack of skepticism. Exploratory testing had no charter. Bug fix verification tested depth on one field without checking the one next to it. Test strategy stayed generic. Documentation was accepted at face value. Framework discussion was about tool selection, not architecture.

Thomas's interview noted strong coding ability and recommended deeper validation on framework design, CI/CD depth, and flakiness strategies. This session was designed to probe those areas. While CI/CD held up, the others fell short.

Recommendation: No Hire

The concern is not a lack of experience — it's the gap between knowing what tools to use and demonstrating how to think about testing at a senior level. Questioning assumptions, investigating beyond what's reported, and designing for breadth rather than just depth are what differentiate a senior SDET from a mid-level one, and they were consistently absent.
