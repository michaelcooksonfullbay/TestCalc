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

// Hardcoded users with per-user history and memory
const USERS = {
  alice:   { password: 'password123', history: [], memory: 0 },
  bob:     { password: 'testpass',    history: [], memory: 0 },
  charlie: { password: 'calc2024',    history: [], memory: 0 },
  diana:   { password: 'qwerty',      history: [], memory: 0 },
};

let currentUser = null;
let lastAttemptedUser = null;
let lastDeletedItem = {};
let showDeleteButtons = false;
// BUG: memoryValue is global, not reset on logout
let memoryValue = 0;

function generateId() {
  return 'calc_' + Math.random().toString(36).slice(2, 8);
}

// BUG: SQL injection — simulates backend with unsanitized query construction
// Query: SELECT * FROM users WHERE username = '{input}' AND password = '{input}'
function hasSqlTautology(input) {
  const strMatch = input.match(/'\s*OR\s+'([^']*)'\s*=\s*'([^']*)/i);
  if (strMatch && strMatch[1] === strMatch[2]) return true;
  const numMatch = input.match(/'\s*OR\s+(\d+)\s*=\s*(\d+)/i);
  if (numMatch && numMatch[1] === numMatch[2]) return true;
  return false;
}

// UI — only initializes when the calculator element exists
document.addEventListener('DOMContentLoaded', () => {
  const calculatorEl = document.getElementById('calculator');
  if (!calculatorEl) return;

  const displayEl = document.getElementById('display');
  const historyEl = document.getElementById('history');
  const historyListEl = document.getElementById('history-list');
  const clearHistoryBtn = document.getElementById('clear-history-btn');
  const refreshHistoryBtn = document.getElementById('refresh-history-btn');
  const guestIndicator = document.getElementById('guest-indicator');

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

  function updateMemoryIndicator() {
    const el = document.getElementById('memory-indicator');
    if (el) el.style.display = memoryValue !== 0 ? '' : 'none';
  }

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
    entries.forEach(({ id, expression, result }) => {
      const entry = document.createElement('div');
      entry.className = 'history-entry';
      if (id) entry.dataset.entryId = id;
      entry.innerHTML =
        '<div class="history-expression">' + expression + '</div>' +
        '<div class="history-result">= ' + result + '</div>' +
        (currentUser && id ? '<button class="history-delete-btn" title="Delete">&times;</button>' : '');
      historyListEl.prepend(entry);
    });
  }

  function addHistoryEntry(expression, result) {
    if (!historyListEl) return;
    const id = generateId();

    // Save to user's history if logged in
    if (currentUser && USERS[currentUser]) {
      USERS[currentUser].history.push({ id, expression, result });
    }

    // BUG: guest calculations leak to last attempted user's history
    if (!currentUser && lastAttemptedUser && USERS[lastAttemptedUser]) {
      USERS[lastAttemptedUser].history.push({ id, expression, result });
    }

    const entry = document.createElement('div');
    entry.className = 'history-entry';
    if (currentUser || showDeleteButtons) entry.dataset.entryId = id;
    entry.innerHTML =
      '<div class="history-expression">' + expression + '</div>' +
      '<div class="history-result">= ' + result + '</div>' +
      (currentUser || showDeleteButtons ? '<button class="history-delete-btn" title="Delete">&times;</button>' : '');
    historyListEl.prepend(entry);
  }

  function updateLoginUI() {
    if (currentUser) {
      loginForm.style.display = 'none';
      loggedInInfo.style.display = 'flex';
      currentUserLabel.textContent = currentUser;
      if (guestIndicator) guestIndicator.style.display = 'none';
    } else {
      loginForm.style.display = 'flex';
      loggedInInfo.style.display = 'none';
      usernameInput.value = '';
      passwordInput.value = '';
      loginError.textContent = '';
      if (guestIndicator) guestIndicator.style.display = '';
    }
  }

  function login(username, password) {
    // BUG: SQL injection — no parameterized queries on the "backend"
    let injectedUser = null;

    // Comment injection: alice' -- → comments out password clause
    const commentMatch = username.match(/^(.*?)'\s*--.*/);
    if (commentMatch && USERS[commentMatch[1]]) {
      injectedUser = commentMatch[1];
    }

    // OR tautology in password with valid username: ' OR '1'='1
    if (!injectedUser && hasSqlTautology(password) && USERS[username]) {
      injectedUser = username;
    }

    // OR tautology in username: returns first row from users "table"
    if (!injectedUser && hasSqlTautology(username)) {
      injectedUser = Object.keys(USERS)[0];
    }

    if (injectedUser) {
      loginError.textContent = '';
      currentUser = injectedUser;
      showDeleteButtons = true;
      lastAttemptedUser = null;
      if (lastDeletedItem[injectedUser]) {
        USERS[injectedUser].history.push(lastDeletedItem[injectedUser]);
        lastDeletedItem[injectedUser] = null;
      }
      renderHistoryPanel(USERS[injectedUser].history);
      updateLoginUI();
      return true;
    }

    // Normal credential check
    const user = USERS[username];
    if (!user) {
      lastAttemptedUser = null;
      loginError.textContent = 'Invalid username or password';
      return false;
    }
    if (user.password !== password) {
      // BUG: stores attempted username so guest calcs leak to this user's history
      lastAttemptedUser = username;
      loginError.textContent = 'Invalid username or password';
      return false;
    }
    loginError.textContent = '';
    currentUser = username;
    showDeleteButtons = true;
    lastAttemptedUser = null;
    // BUG: resurrect last deleted item on login
    if (lastDeletedItem[username]) {
      user.history.push(lastDeletedItem[username]);
      lastDeletedItem[username] = null;
    }
    renderHistoryPanel(user.history);
    updateLoginUI();
    return true;
  }

  function logout() {
    currentUser = null;
    // BUG: memoryValue is global, not reset on logout
    renderHistoryPanel([]);
    updateLoginUI();
  }

  // Memory button handlers
  function handleMemoryClear() {
    memoryValue = 0;
    updateMemoryIndicator();
  }

  function handleMemoryRecall() {
    if (state.evaluated) {
      state = { currentInput: String(memoryValue), expression: [], evaluated: false };
    } else {
      state = { ...state, currentInput: String(memoryValue) };
    }
    render();
  }

  function handleMemoryAdd() {
    memoryValue += parseFloat(state.currentInput);
    updateMemoryIndicator();

    // BUG: guest memory operations leak to last attempted user
    if (!currentUser && lastAttemptedUser && USERS[lastAttemptedUser]) {
      USERS[lastAttemptedUser].memory = memoryValue;
    }

    if (currentUser && USERS[currentUser]) {
      USERS[currentUser].memory = memoryValue;
    }
  }

  function handleMemorySubtract() {
    memoryValue -= parseFloat(state.currentInput);
    updateMemoryIndicator();

    // BUG: guest memory operations leak to last attempted user
    if (!currentUser && lastAttemptedUser && USERS[lastAttemptedUser]) {
      USERS[lastAttemptedUser].memory = memoryValue;
    }

    if (currentUser && USERS[currentUser]) {
      USERS[currentUser].memory = memoryValue;
    }
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

  // Signup modal
  const signupBtn = document.getElementById('signup-btn');
  const signupModal = document.getElementById('signup-modal');
  const signupClose = document.getElementById('signup-close');
  const signupSubmit = document.getElementById('signup-submit');
  const signupError = document.getElementById('signup-error');

  if (signupBtn && signupModal) {
    signupBtn.addEventListener('click', () => {
      signupModal.style.display = 'flex';
      signupError.textContent = '';
    });

    signupClose.addEventListener('click', () => {
      signupModal.style.display = 'none';
    });

    signupModal.addEventListener('click', (e) => {
      if (e.target === signupModal) signupModal.style.display = 'none';
    });

    signupSubmit.addEventListener('click', () => {
      const username = document.getElementById('signup-username').value.trim();
      const password = document.getElementById('signup-password').value;
      const email = document.getElementById('signup-email').value;
      const phone = document.getElementById('signup-phone').value;
      const firstname = document.getElementById('signup-firstname').value.trim();
      const lastname = document.getElementById('signup-lastname').value.trim();
      const zipcode = document.getElementById('signup-zipcode').value.trim();
      const occupation = document.getElementById('signup-occupation').value.trim();

      if (!username || !password || !email || !phone || !firstname || !lastname) {
        signupError.textContent = 'All required fields must be filled in';
        return;
      }

      const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
      if (!phoneRegex.test(phone)) {
        signupError.textContent = 'Phone must be in format (XXX) XXX-XXXX';
        return;
      }

      // BUG: no email validation at all — accepts any string

      if (!document.getElementById('eula-agree').checked) {
        signupError.textContent = 'You must agree to the EULA to create an account';
        return;
      }

      if (USERS[username]) {
        signupError.textContent = 'Username already taken';
        return;
      }

      USERS[username] = { password, email, phone, firstname, lastname, zipcode, occupation, history: [], memory: 0 };
      signupModal.style.display = 'none';
      login(username, password);
    });
  }

  // BUG: only clears the DOM, not the stored history array
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener('click', () => {
      historyListEl.innerHTML = '';
    });
  }

  // Refresh button re-renders history from stored data
  if (refreshHistoryBtn) {
    refreshHistoryBtn.addEventListener('click', () => {
      if (currentUser && USERS[currentUser]) {
        // BUG: resurrect last deleted item on refresh
        if (lastDeletedItem[currentUser]) {
          USERS[currentUser].history.push(lastDeletedItem[currentUser]);
          lastDeletedItem[currentUser] = null;
        }
        renderHistoryPanel(USERS[currentUser].history);
      }
    });
  }

  // Delete button on history entries (event delegation)
  if (historyListEl) {
    historyListEl.addEventListener('click', (e) => {
      const deleteBtn = e.target.closest('.history-delete-btn');
      if (!deleteBtn) return;
      const entryEl = deleteBtn.closest('.history-entry');
      const entryId = entryEl.dataset.entryId;
      if (currentUser && USERS[currentUser] && entryId) {
        const idx = USERS[currentUser].history.findIndex(h => h.id === entryId);
        if (idx !== -1) {
          const [removed] = USERS[currentUser].history.splice(idx, 1);
          // BUG: save last deleted item — it will resurrect on refresh/re-login
          lastDeletedItem[currentUser] = removed;
        }
      }
      entryEl.remove();
    });
  }

  // API docs BroadcastChannel — acts as a request/response server
  const channel = new BroadcastChannel('testcalc-v2');
  channel.addEventListener('message', (e) => {
    if (!e.data || !e.data.requestId) return;
    const { type, requestId } = e.data;
    let response;

    switch (type) {
      case 'auth-login': {
        const user = USERS[e.data.username];
        if (!user || user.password !== e.data.password) {
          response = { status: 401, body: { error: 'INVALID_CREDENTIALS', message: 'Invalid username or password' } };
        } else {
          // Actually log in on the main page
          login(e.data.username, e.data.password);
          response = { status: 200, body: { token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + btoa(e.data.username), user: { id: 'usr_' + e.data.username, username: e.data.username, createdAt: '2024-01-15T08:30:00Z' } } };
        }
        break;
      }
      case 'auth-logout': {
        // Actually log out on the main page
        logout();
        response = { status: 200, body: { message: 'Session ended' } };
        break;
      }
      case 'auth-signup': {
        const { username, password, email, phone, firstname, lastname, zipcode, occupation } = e.data;
        if (!username || !password || !email || !phone) {
          response = { status: 400, body: { error: 'MISSING_FIELDS', message: 'Fields username, password, email, and phone are required' } };
        } else if (USERS[username]) {
          response = { status: 409, body: { error: 'USERNAME_TAKEN', message: 'Username already exists' } };
        } else {
          const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
          if (!phoneRegex.test(phone)) {
            response = { status: 400, body: { error: 'INVALID_PHONE', message: 'Phone must be in format (XXX) XXX-XXXX' } };
          } else {
            // BUG: no email validation — accepts any string
            USERS[username] = { password, email, phone, firstname: firstname || '', lastname: lastname || '', zipcode: zipcode || '', occupation: occupation || '', history: [], memory: 0 };
            login(username, password);
            response = { status: 201, body: { message: 'Account created', user: { id: 'usr_' + username, username, email, phone, createdAt: new Date().toISOString() } } };
          }
        }
        break;
      }
      case 'get-history': {
        const uid = e.data.userId;
        if (!USERS[uid]) {
          response = { status: 404, body: { error: 'USER_NOT_FOUND', message: 'No user with the specified ID' } };
        } else {
          const all = USERS[uid].history;
          const offset = e.data.offset || 0;
          const limit = e.data.limit || 50;
          const sliced = all.slice(offset, offset + limit);
          response = { status: 200, body: { userId: uid, entries: sliced.map(h => ({ ...h, timestamp: new Date().toISOString() })), total: all.length, limit, offset } };
        }
        break;
      }
      case 'add-history': {
        const uid = e.data.userId;
        if (!USERS[uid]) {
          response = { status: 404, body: { error: 'USER_NOT_FOUND', message: 'No user with the specified ID' } };
        } else {
          const entry = { id: generateId(), expression: e.data.expression, result: e.data.result };
          USERS[uid].history.push(entry);
          response = { status: 201, body: { ...entry, userId: uid, timestamp: new Date().toISOString() } };
        }
        break;
      }
      case 'edit-history': {
        const uid = e.data.userId;
        if (!USERS[uid]) {
          response = { status: 404, body: { error: 'USER_NOT_FOUND', message: 'No user with the specified ID' } };
        } else {
          const entry = USERS[uid].history.find(h => h.id === e.data.entryId);
          if (!entry) {
            response = { status: 404, body: { error: 'ENTRY_NOT_FOUND', message: 'No history entry with the specified ID' } };
          } else {
            if (e.data.expression !== undefined) entry.expression = e.data.expression;
            if (e.data.result !== undefined) entry.result = e.data.result;
            response = { status: 200, body: { ...entry, userId: uid, timestamp: new Date().toISOString() } };
          }
        }
        break;
      }
      case 'delete-history-item': {
        const uid = e.data.userId;
        if (!USERS[uid]) {
          response = { status: 404, body: { error: 'USER_NOT_FOUND', message: 'No user with the specified ID' } };
        } else {
          const idx = USERS[uid].history.findIndex(h => h.id === e.data.entryId);
          if (idx === -1) {
            response = { status: 404, body: { error: 'ENTRY_NOT_FOUND', message: 'No history entry with the specified ID' } };
          } else {
            const [removed] = USERS[uid].history.splice(idx, 1);
            // BUG: save last deleted for resurrection
            lastDeletedItem[uid] = removed;
            response = { status: 200, body: { message: 'Entry deleted', id: removed.id } };
          }
        }
        break;
      }
      case 'delete-all-history': {
        const uid = e.data.userId;
        if (!USERS[uid]) {
          response = { status: 404, body: { error: 'USER_NOT_FOUND', message: 'No user with the specified ID' } };
        } else {
          const count = USERS[uid].history.length;
          USERS[uid].history.length = 0;
          response = { status: 200, body: { message: 'History cleared', deletedCount: count } };
        }
        break;
      }
      case 'calculate': {
        const expr = e.data.expression;
        if (!expr) {
          response = { status: 400, body: { error: 'INVALID_EXPRESSION', message: 'Expression is required' } };
          break;
        }
        const normalized = expr.replace(/×/g, '*').replace(/÷/g, '/');
        const tokens = normalized.match(/-?\d+\.?\d*|[+\-*/]/g);
        if (!tokens || tokens.length === 0) {
          response = { status: 400, body: { error: 'INVALID_EXPRESSION', message: 'Could not parse expression' } };
          break;
        }
        let calcResult = parseFloat(tokens[0]);
        let calcError = false;
        for (let i = 1; i < tokens.length; i += 2) {
          const op = tokens[i];
          const num = parseFloat(tokens[i + 1]);
          if (isNaN(num)) { calcError = true; break; }
          switch (op) {
            case '+': calcResult += num; break;
            case '-': calcResult -= num; break;
            case '*': calcResult *= num; break;
            case '/': calcResult /= num; break;
            default: calcError = true;
          }
        }
        if (calcError) {
          response = { status: 400, body: { error: 'INVALID_EXPRESSION', message: 'Malformed expression' } };
        } else {
          response = { status: 200, body: { expression: expr, result: String(calcResult), precision: 'float64', savedToHistory: false } };
        }
        break;
      }
      case 'validate': {
        const expr = e.data.expression;
        if (!expr) {
          response = { status: 400, body: { error: 'MISSING_PARAMETER', message: "Query parameter 'expression' is required" } };
          break;
        }
        const normalized = expr.replace(/×/g, '*').replace(/÷/g, '/');
        const tokens = normalized.match(/-?\d+\.?\d*|[+\-*/]/g);
        const warnings = [];
        if (tokens) {
          for (let i = 0; i < tokens.length - 1; i++) {
            if (/^[+\-*/]$/.test(tokens[i]) && /^[+\-*/]$/.test(tokens[i + 1])) {
              warnings.push('Consecutive operators at position ' + (i + 1));
            }
          }
        }
        const valid = !!(tokens && tokens.length > 0 && warnings.length === 0);
        response = { status: 200, body: { expression: expr, valid, tokens: valid ? tokens : null, warnings } };
        break;
      }
      case 'get-memory': {
        const uid = e.data.userId;
        if (!USERS[uid]) {
          response = { status: 404, body: { error: 'USER_NOT_FOUND', message: 'No user with the specified ID' } };
        } else {
          response = { status: 200, body: { userId: uid, value: USERS[uid].memory } };
        }
        break;
      }
      case 'update-memory': {
        const uid = e.data.userId;
        if (!USERS[uid]) {
          response = { status: 404, body: { error: 'USER_NOT_FOUND', message: 'No user with the specified ID' } };
        } else {
          const op = e.data.operation;
          const val = e.data.value !== undefined ? parseFloat(e.data.value) : 0;
          if (!['add', 'subtract', 'set', 'clear'].includes(op)) {
            response = { status: 400, body: { error: 'INVALID_OPERATION', message: 'Operation must be add, subtract, set, or clear' } };
          } else {
            switch (op) {
              case 'add':      USERS[uid].memory += val; break;
              case 'subtract': USERS[uid].memory -= val; break;
              case 'set':      USERS[uid].memory = val; break;
              case 'clear':    USERS[uid].memory = 0; break;
            }
            // BUG: API memory update doesn't trigger UI indicator refresh
            // Does NOT update global memoryValue or call updateMemoryIndicator()
            response = { status: 200, body: { userId: uid, value: USERS[uid].memory, operation: op } };
          }
        }
        break;
      }
    }

    if (response) {
      channel.postMessage({ responseId: requestId, ...response });
    }
  });

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
      case 'memory-clear': handleMemoryClear(); break;
      case 'memory-recall': handleMemoryRecall(); break;
      case 'memory-add': handleMemoryAdd(); break;
      case 'memory-subtract': handleMemorySubtract(); break;
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
    // No keyboard shortcuts for memory operations (intentional omission)
  });

  render();
  updateLoginUI();
  updateMemoryIndicator();
});
