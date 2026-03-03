# TestCalc

A simple calculator web application built with vanilla HTML, CSS, and JavaScript.

## Features

- Basic arithmetic: addition, subtraction, multiplication, division
- Decimal number support
- Chained operations (e.g., `2 + 3 + 4 =`)
- History display showing the current expression
- Keyboard support
- Sign toggle (+/-)
- Backspace / clear

## Running Locally

No build step required. Open `index.html` in any modern browser:

```bash
# macOS
open index.html

# Linux
xdg-open index.html

# Or simply double-click the file in your file manager
```

A manual test harness is available at `test.html` — open it the same way.

## Deploying on GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings > Pages**.
3. Under **Source**, select **Deploy from a branch**.
4. Choose the **main** branch and **/ (root)** directory.
5. Click **Save**. The site will be live at `https://<username>.github.io/<repo-name>/`.

## Keyboard Shortcuts

| Key          | Action       |
|--------------|--------------|
| `0`–`9`      | Digit input  |
| `.`          | Decimal      |
| `+` `-` `*` `/` | Operators |
| `Enter`      | Equals       |
| `Backspace`  | Delete last  |
| `Escape`     | Clear        |

## Interview Instructions

Welcome! Your task is to **exploratory-test this calculator application** and document any bugs or issues you find.

### What we're looking for

- Thoroughness: Do you test edge cases, not just the happy path?
- Observation: Do you notice subtle UI inconsistencies?
- Communication: Can you clearly describe what you expected vs. what happened?
- Prioritization: Can you assess severity and impact of each issue?
- Technical depth: Can you reason about *why* a bug might occur?

### Guidelines

1. Spend **30–45 minutes** exploring the calculator.
2. Test using **both mouse/touch and keyboard**.
3. For each issue found, document:
   - **Steps to reproduce**
   - **Expected behavior**
   - **Actual behavior**
   - **Severity** (critical / major / minor / cosmetic)
4. The `test.html` harness is available if you want to exercise the engine functions directly.
5. There is no trick — the app is intentionally a realistic, imperfect implementation. Find as many issues as you can.

Good luck!
