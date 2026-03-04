// CalculatorEngine — pure functions, no DOM dependency
const CalculatorEngine = (() => {
  function createInitialState() {
    return {
      currentInput: '0',
      expression: [],
      evaluated: false,
    };
  }

  function inputDigit(state, digit) {
    if (state.evaluated) {
      return { currentInput: digit, expression: [], evaluated: false };
    }
    if (state.currentInput === '0') {
      return { ...state, currentInput: digit };
    }
    return { ...state, currentInput: state.currentInput + digit };
  }

  function inputDecimal(state) {
    if (state.evaluated) {
      return { currentInput: '0.', expression: [], evaluated: false };
    }
    // BUG: no check for existing decimal — allows "3.1.4"
    return { ...state, currentInput: state.currentInput + '.' };
  }

  function inputOperator(state, operator) {
    if (state.evaluated) {
      return {
        currentInput: '0',
        expression: [state.currentInput, operator],
        evaluated: false,
      };
    }
    // BUG: no check if previous token is an operator — appends "0" between them
    return {
      ...state,
      expression: [...state.expression, state.currentInput, operator],
      currentInput: '0',
    };
  }

  function toggleSign(state) {
    // BUG: does not special-case "0", produces "-0"
    if (state.currentInput.startsWith('-')) {
      return { ...state, currentInput: state.currentInput.slice(1) };
    }
    return { ...state, currentInput: '-' + state.currentInput };
  }

  function deleteLast(state) {
    // BUG: works after evaluation — mutates the computed result
    const sliced = state.currentInput.slice(0, -1);
    return { ...state, currentInput: sliced || '0' };
  }

  function clear() {
    return createInitialState();
  }

  function evaluate(state) {
    if (state.expression.length === 0) return state;

    const tokens = [...state.expression, state.currentInput];
    let result = parseFloat(tokens[0]);

    // Left-to-right evaluation, no operator precedence
    for (let i = 1; i < tokens.length; i += 2) {
      const op = tokens[i];
      const num = parseFloat(tokens[i + 1]);
      switch (op) {
        case '+': result += num; break;
        case '-': result -= num; break;
        case '\u00d7': result *= num; break;
        case '\u00f7': result /= num; break; // BUG: no divide-by-zero guard
      }
    }

    // BUG: no rounding — floating-point noise displayed directly
    return {
      currentInput: String(result),
      expression: tokens,
      evaluated: true,
    };
  }

  function getHistoryText(state) {
    if (state.expression.length === 0) return '';
    const parts = state.expression.join(' ');
    return state.evaluated ? parts + ' =' : parts;
  }

  return {
    createInitialState,
    inputDigit,
    inputDecimal,
    inputOperator,
    toggleSign,
    deleteLast,
    clear,
    evaluate,
    getHistoryText,
  };
})();

// Hardcoded users with per-user history
const USERS = {
  alice:   { password: 'password123', history: [] },
  bob:     { password: 'testpass',    history: [] },
  charlie: { password: 'calc2024',    history: [] },
  diana:   { password: 'qwerty',      history: [] },
};

let currentUser = null;

// UI — only initializes when the calculator element exists
document.addEventListener('DOMContentLoaded', () => {
  const calculatorEl = document.getElementById('calculator');
  if (!calculatorEl) return;

  const displayEl = document.getElementById('display');
  const historyEl = document.getElementById('history');
  const historyListEl = document.getElementById('history-list');

  // Login bar elements
  const loginForm = document.getElementById('login-form');
  const loggedInInfo = document.getElementById('logged-in-info');
  const usernameInput = document.getElementById('username-input');
  const passwordInput = document.getElementById('password-input');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const loginError = document.getElementById('login-error');
  const currentUserLabel = document.getElementById('current-user-label');

  let state = CalculatorEngine.createInitialState();

  function render() {
    displayEl.textContent = state.currentInput;

    const historyText = CalculatorEngine.getHistoryText(state);
    // BUG: only updates when non-empty — Clear leaves stale history text
    if (historyText) {
      historyEl.textContent = historyText;
    }
  }

  function renderHistoryPanel(entries) {
    if (!historyListEl) return;
    historyListEl.innerHTML = '';
    entries.forEach(({ expression, result }) => {
      const entry = document.createElement('div');
      entry.className = 'history-entry';
      entry.innerHTML =
        '<div class="history-expression">' + expression + '</div>' +
        '<div class="history-result">= ' + result + '</div>';
      historyListEl.prepend(entry);
    });
  }

  function addHistoryEntry(expression, result) {
    if (!historyListEl) return;

    // Save to user's history if logged in
    if (currentUser && USERS[currentUser]) {
      USERS[currentUser].history.push({ expression, result });
    }

    const entry = document.createElement('div');
    entry.className = 'history-entry';
    entry.innerHTML =
      '<div class="history-expression">' + expression + '</div>' +
      '<div class="history-result">= ' + result + '</div>';
    historyListEl.prepend(entry);
  }

  function updateLoginUI() {
    if (currentUser) {
      loginForm.style.display = 'none';
      loggedInInfo.style.display = 'flex';
      currentUserLabel.textContent = currentUser;
    } else {
      loginForm.style.display = 'flex';
      loggedInInfo.style.display = 'none';
      usernameInput.value = '';
      passwordInput.value = '';
      loginError.textContent = '';
    }
  }

  function login(username, password) {
    const user = USERS[username];
    if (!user || user.password !== password) {
      loginError.textContent = 'Invalid username or password';
      return false;
    }
    loginError.textContent = '';
    currentUser = username;
    renderHistoryPanel(user.history);
    updateLoginUI();
    return true;
  }

  function logout() {
    currentUser = null;
    renderHistoryPanel([]);
    updateLoginUI();
  }

  // Login bar event handlers
  if (loginBtn) {
    loginBtn.addEventListener('click', () => {
      login(usernameInput.value.trim(), passwordInput.value);
    });
  }

  if (passwordInput) {
    passwordInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        login(usernameInput.value.trim(), passwordInput.value);
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
  }

  function handleDigit(d) {
    state = CalculatorEngine.inputDigit(state, d);
    render();
  }

  function handleDecimal() {
    state = CalculatorEngine.inputDecimal(state);
    render();
  }

  function handleOperator(op) {
    state = CalculatorEngine.inputOperator(state, op);
    render();
  }

  function handleToggleSign() {
    state = CalculatorEngine.toggleSign(state);
    render();
  }

  function handleDelete() {
    state = CalculatorEngine.deleteLast(state);
    render();
  }

  function handleClear() {
    state = CalculatorEngine.clear();
    render();
  }

  function handleEquals() {
    const hadExpression = state.expression.length > 0;
    state = CalculatorEngine.evaluate(state);
    render();
    if (hadExpression) {
      const expr = state.expression.join(' ');
      addHistoryEntry(expr, state.currentInput);
    }
  }

  // Button clicks via event delegation
  calculatorEl.addEventListener('click', (e) => {
    const btn = e.target.closest('button');
    if (!btn) return;

    const action = btn.dataset.action;
    const value = btn.dataset.value;

    switch (action) {
      case 'digit': handleDigit(value); break;
      case 'decimal': handleDecimal(); break;
      case 'operator': handleOperator(value); break;
      case 'toggle-sign': handleToggleSign(); break;
      case 'delete': handleDelete(); break;
      case 'clear': handleClear(); break;
      case 'equals': handleEquals(); break;
    }
  });

  // Keyboard support
  document.addEventListener('keydown', (e) => {
    if (e.key >= '0' && e.key <= '9') handleDigit(e.key);
    else if (e.key === '.') handleDecimal();
    else if (e.key === '+') handleOperator('+');
    else if (e.key === '-') handleOperator('-');
    else if (e.key === '*') handleOperator('\u00d7');
    else if (e.key === '/') { e.preventDefault(); handleOperator('\u00f7'); }
    else if (e.key === 'Enter') handleEquals();
    // BUG: '=' key not mapped — only Enter triggers equals
    else if (e.key === 'Backspace') handleDelete();
    else if (e.key === 'Escape') handleClear();
  });

  render();
  updateLoginUI();
});
