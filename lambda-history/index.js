const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand, PutCommand, UpdateCommand, GetCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME || 'testcalc-history';

// Hardcoded test users (always available; signup adds transient accounts)
const USERS = new Map([
  ['alice',   { password: 'password123', memory: 0 }],
  ['bob',     { password: 'testpass',    memory: 0 }],
  ['charlie', { password: 'calc2024',    memory: 0 }],
  ['diana',   { password: 'qwerty',      memory: 0 }],
]);

// SQL injection helpers (ported from app.js)
function hasSqlTautology(input) {
  const strMatch = input.match(/'\s*OR\s+'([^']*)'\s*=\s*'([^']*)/i);
  if (strMatch && strMatch[1] === strMatch[2]) return true;
  const numMatch = input.match(/'\s*OR\s+(\d+)\s*=\s*(\d+)/i);
  if (numMatch && numMatch[1] === numMatch[2]) return true;
  return false;
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
    body: JSON.stringify(body),
  };
}

function parseBody(event) {
  if (!event.body) return {};
  return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
}

function matchRoute(method, path) {
  // Auth
  if (method === 'POST' && path === '/api/auth/login') return ['auth-login', {}];
  if (method === 'POST' && path === '/api/auth/logout') return ['auth-logout', {}];
  if (method === 'POST' && path === '/api/auth/signup') return ['auth-signup', {}];

  // Calculator
  if (method === 'POST' && path === '/api/calculate') return ['calculate', {}];
  if (method === 'GET' && path === '/api/calculate/validate') return ['validate', {}];

  // Memory: /api/users/{userId}/memory
  const memoryMatch = path.match(/^\/api\/users\/([^/]+)\/memory$/);
  if (memoryMatch) {
    if (method === 'GET') return ['get-memory', { userId: memoryMatch[1] }];
    if (method === 'PUT') return ['update-memory', { userId: memoryMatch[1] }];
  }

  // User history entry: /api/users/{userId}/history/{entryId}
  const historyEntryMatch = path.match(/^\/api\/users\/([^/]+)\/history\/([^/]+)$/);
  if (historyEntryMatch) {
    if (method === 'PUT') return ['edit-history', { userId: historyEntryMatch[1], entryId: historyEntryMatch[2] }];
    if (method === 'DELETE') return ['delete-history-item', { userId: historyEntryMatch[1], entryId: historyEntryMatch[2] }];
  }

  // User history collection: /api/users/{userId}/history
  const historyMatch = path.match(/^\/api\/users\/([^/]+)\/history$/);
  if (historyMatch) {
    if (method === 'GET') return ['get-history', { userId: historyMatch[1] }];
    if (method === 'POST') return ['add-history', { userId: historyMatch[1] }];
    if (method === 'DELETE') return ['delete-all-history', { userId: historyMatch[1] }];
  }

  // Backward-compat flat routes (used by history.js datagrid and calculator fire-and-forget)
  if (method === 'GET' && path === '/api/history') return ['flat-get-history', {}];
  if (method === 'POST' && path === '/api/history') return ['flat-post-history', {}];
  const flatDeleteMatch = path.match(/^\/api\/history\/([^/]+)$/);
  if (method === 'DELETE' && flatDeleteMatch) return ['flat-delete-history', { id: flatDeleteMatch[1] }];

  return null;
}

exports.handler = async (event) => {
  const method = event.requestContext?.http?.method || event.httpMethod || 'GET';
  const path = event.rawPath || event.path || '';

  if (method === 'OPTIONS') return response(200, {});

  try {
    const route = matchRoute(method, path);
    if (!route) return response(404, { error: 'Not found' });

    const [routeName, params] = route;
    const queryParams = event.queryStringParameters || {};

    switch (routeName) {

      // ──── AUTH ────

      case 'auth-login': {
        const body = parseBody(event);
        const { username, password } = body;

        if (!username && !password) {
          return response(401, { error: 'INVALID_CREDENTIALS', message: 'Invalid username or password' });
        }

        // SQL injection: comment injection (alice' --)
        let injectedUser = null;
        const commentMatch = (username || '').match(/^(.*?)'\s*--.*/);
        if (commentMatch && USERS.has(commentMatch[1])) {
          injectedUser = commentMatch[1];
        }

        // SQL injection: OR tautology in password with valid username
        if (!injectedUser && hasSqlTautology(password || '') && USERS.has(username)) {
          injectedUser = username;
        }

        // SQL injection: OR tautology in username → first user
        if (!injectedUser && hasSqlTautology(username || '')) {
          injectedUser = USERS.keys().next().value;
        }

        if (injectedUser) {
          return response(200, {
            token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + Buffer.from(injectedUser).toString('base64'),
            user: { id: 'usr_' + injectedUser, username: injectedUser, createdAt: '2024-01-15T08:30:00Z' },
          });
        }

        // Normal credential check
        const user = USERS.get(username);
        if (!user || user.password !== password) {
          return response(401, { error: 'INVALID_CREDENTIALS', message: 'Invalid username or password' });
        }

        return response(200, {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' + Buffer.from(username).toString('base64'),
          user: { id: 'usr_' + username, username, createdAt: '2024-01-15T08:30:00Z' },
        });
      }

      case 'auth-logout': {
        return response(200, { message: 'Session ended' });
      }

      case 'auth-signup': {
        const body = parseBody(event);
        const { username, password, email, phone, firstname, lastname, zipcode, occupation } = body;

        if (!username || !password || !email || !phone) {
          return response(400, { error: 'MISSING_FIELDS', message: 'Fields username, password, email, and phone are required' });
        }

        if (USERS.has(username)) {
          return response(409, { error: 'USERNAME_TAKEN', message: 'Username already exists' });
        }

        const phoneRegex = /^\(\d{3}\) \d{3}-\d{4}$/;
        if (!phoneRegex.test(phone)) {
          return response(400, { error: 'INVALID_PHONE', message: 'Phone must be in format (XXX) XXX-XXXX' });
        }

        // BUG: no email validation — accepts any string
        USERS.set(username, {
          password, email, phone,
          firstname: firstname || '', lastname: lastname || '',
          zipcode: zipcode || '', occupation: occupation || '',
          memory: 0,
        });

        return response(201, {
          message: 'Account created',
          user: { id: 'usr_' + username, username, email, phone, createdAt: new Date().toISOString() },
        });
      }

      // ──── USER HISTORY (RESTful) ────

      case 'get-history': {
        const { userId } = params;
        const limit = parseInt(queryParams.limit) || 50;
        const offset = parseInt(queryParams.offset) || 0;

        const result = await docClient.send(new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'userId = :uid AND isDeleted = :zero',
          ExpressionAttributeValues: { ':uid': userId, ':zero': 0 },
        }));

        let items = result.Items || [];
        items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        const total = items.length;
        const sliced = items.slice(offset, offset + limit);
        const entries = sliced.map(item => ({
          id: item.id,
          expression: item.expression,
          result: item.result,
          timestamp: item.createdAt,
        }));

        return response(200, { userId, entries, total, limit, offset });
      }

      case 'add-history': {
        const { userId } = params;
        const body = parseBody(event);

        if (!body.expression || body.result === undefined) {
          return response(400, { error: 'INVALID_BODY', message: "Fields 'expression' and 'result' are required" });
        }

        const now = new Date().toISOString();
        const item = {
          id: crypto.randomUUID(),
          userId,
          expression: String(body.expression),
          result: String(body.result),
          createdAt: now,
          modifiedAt: now,
          isDeleted: 0,
        };

        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

        return response(201, {
          id: item.id, expression: item.expression, result: item.result,
          userId, timestamp: now,
        });
      }

      case 'edit-history': {
        const { userId, entryId } = params;
        const body = parseBody(event);

        if (!body.expression && !body.result) {
          return response(400, { error: 'INVALID_BODY', message: "At least one of 'expression' or 'result' is required" });
        }

        const existing = await docClient.send(new GetCommand({
          TableName: TABLE_NAME, Key: { id: entryId },
        }));

        if (!existing.Item || existing.Item.userId !== userId || existing.Item.isDeleted === 1) {
          return response(404, { error: 'ENTRY_NOT_FOUND', message: 'No history entry with the specified ID' });
        }

        const now = new Date().toISOString();
        const updates = ['modifiedAt = :now'];
        const values = { ':now': now };

        if (body.expression !== undefined) {
          updates.push('expression = :expr');
          values[':expr'] = String(body.expression);
        }
        if (body.result !== undefined) {
          updates.push('result = :res');
          values[':res'] = String(body.result);
        }

        await docClient.send(new UpdateCommand({
          TableName: TABLE_NAME, Key: { id: entryId },
          UpdateExpression: 'SET ' + updates.join(', '),
          ExpressionAttributeValues: values,
        }));

        return response(200, {
          id: entryId,
          expression: body.expression !== undefined ? String(body.expression) : existing.Item.expression,
          result: body.result !== undefined ? String(body.result) : existing.Item.result,
          userId, timestamp: now,
        });
      }

      case 'delete-history-item': {
        const { userId, entryId } = params;

        const existing = await docClient.send(new GetCommand({
          TableName: TABLE_NAME, Key: { id: entryId },
        }));

        if (!existing.Item || existing.Item.userId !== userId || existing.Item.isDeleted === 1) {
          return response(404, { error: 'ENTRY_NOT_FOUND', message: 'No history entry with the specified ID' });
        }

        const now = new Date().toISOString();
        await docClient.send(new UpdateCommand({
          TableName: TABLE_NAME, Key: { id: entryId },
          UpdateExpression: 'SET isDeleted = :one, modifiedAt = :now',
          ExpressionAttributeValues: { ':one': 1, ':now': now },
        }));

        return response(200, { message: 'Entry deleted', id: entryId });
      }

      case 'delete-all-history': {
        const { userId } = params;

        const result = await docClient.send(new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'userId = :uid AND isDeleted = :zero',
          ExpressionAttributeValues: { ':uid': userId, ':zero': 0 },
        }));

        const items = result.Items || [];
        const now = new Date().toISOString();

        for (const item of items) {
          await docClient.send(new UpdateCommand({
            TableName: TABLE_NAME, Key: { id: item.id },
            UpdateExpression: 'SET isDeleted = :one, modifiedAt = :now',
            ExpressionAttributeValues: { ':one': 1, ':now': now },
          }));
        }

        return response(200, { message: 'History cleared', deletedCount: items.length });
      }

      // ──── CALCULATOR ────

      case 'calculate': {
        const body = parseBody(event);
        const expr = body.expression;

        if (!expr) {
          return response(400, { error: 'INVALID_EXPRESSION', message: 'Expression is required' });
        }

        const normalized = expr.replace(/\u00d7/g, '*').replace(/\u00f7/g, '/');
        const tokens = normalized.match(/-?\d+\.?\d*|[+\-*/]/g);

        if (!tokens || tokens.length === 0) {
          return response(400, { error: 'INVALID_EXPRESSION', message: 'Could not parse expression' });
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
          return response(400, { error: 'INVALID_EXPRESSION', message: 'Malformed expression' });
        }

        return response(200, {
          expression: expr, result: String(calcResult),
          precision: 'float64', savedToHistory: false,
        });
      }

      case 'validate': {
        const expr = queryParams.expression;

        if (!expr) {
          return response(400, { error: 'MISSING_PARAMETER', message: "Query parameter 'expression' is required" });
        }

        const normalized = expr.replace(/\u00d7/g, '*').replace(/\u00f7/g, '/');
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
        return response(200, { expression: expr, valid, tokens: valid ? tokens : null, warnings });
      }

      // ──── MEMORY ────

      case 'get-memory': {
        const { userId } = params;
        if (!USERS.has(userId)) {
          return response(404, { error: 'USER_NOT_FOUND', message: 'No user with the specified ID' });
        }
        return response(200, { userId, value: USERS.get(userId).memory });
      }

      case 'update-memory': {
        const { userId } = params;
        if (!USERS.has(userId)) {
          return response(404, { error: 'USER_NOT_FOUND', message: 'No user with the specified ID' });
        }

        const body = parseBody(event);
        const op = body.operation;
        const val = body.value !== undefined ? parseFloat(body.value) : 0;

        if (!['add', 'subtract', 'set', 'clear'].includes(op)) {
          return response(400, { error: 'INVALID_OPERATION', message: 'Operation must be add, subtract, set, or clear' });
        }

        const user = USERS.get(userId);
        switch (op) {
          case 'add':      user.memory += val; break;
          case 'subtract': user.memory -= val; break;
          case 'set':      user.memory = val; break;
          case 'clear':    user.memory = 0; break;
        }

        return response(200, { userId, value: user.memory, operation: op });
      }

      // ──── BACKWARD-COMPAT FLAT ROUTES ────

      case 'flat-get-history': {
        const result = await docClient.send(new ScanCommand({
          TableName: TABLE_NAME,
          FilterExpression: 'isDeleted = :zero',
          ExpressionAttributeValues: { ':zero': 0 },
        }));

        let items = result.Items || [];

        if (queryParams.userId) {
          items = items.filter(item => item.userId === queryParams.userId);
        }

        items.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));

        return response(200, { items, total: items.length });
      }

      case 'flat-post-history': {
        const body = parseBody(event);
        const { userId, expression, result } = body;

        if (!userId || !expression || result === undefined) {
          return response(400, { error: 'userId, expression, and result are required' });
        }

        const now = new Date().toISOString();
        const item = {
          id: crypto.randomUUID(),
          userId, expression, result: String(result),
          createdAt: now, modifiedAt: now, isDeleted: 0,
        };

        await docClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }));

        return response(201, item);
      }

      case 'flat-delete-history': {
        const { id } = params;
        if (!id) return response(400, { error: 'id is required' });

        const now = new Date().toISOString();
        await docClient.send(new UpdateCommand({
          TableName: TABLE_NAME, Key: { id },
          UpdateExpression: 'SET isDeleted = :one, modifiedAt = :now',
          ExpressionAttributeValues: { ':one': 1, ':now': now },
        }));

        return response(200, { message: 'Deleted', id });
      }
    }

    return response(404, { error: 'Not found' });
  } catch (err) {
    console.error('Error:', err);
    return response(500, { error: 'Internal server error' });
  }
};
