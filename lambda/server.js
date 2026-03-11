const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const net = require('net');

const PORT = process.env.PORT || 8080;
const APP_DIR = path.resolve(__dirname, '..');
const SERVE_BIN = path.join(APP_DIR, 'node_modules', '.bin', 'serve');
const PLAYWRIGHT_BIN = path.join(APP_DIR, 'node_modules', '.bin', 'playwright');

let serveProcess = null;

function waitForPort(port, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      const socket = new net.Socket();
      socket.setTimeout(1000);
      socket.on('connect', () => { socket.destroy(); resolve(); });
      socket.on('error', () => {
        socket.destroy();
        if (Date.now() - start > timeout) reject(new Error(`Port ${port} not ready after ${timeout}ms`));
        else setTimeout(check, 200);
      });
      socket.on('timeout', () => {
        socket.destroy();
        if (Date.now() - start > timeout) reject(new Error(`Port ${port} not ready after ${timeout}ms`));
        else setTimeout(check, 200);
      });
      socket.connect(port, '127.0.0.1');
    };
    check();
  });
}

async function ensureServeRunning() {
  if (serveProcess && !serveProcess.killed) {
    // Check if still listening
    try {
      await waitForPort(3000, 1000);
      return;
    } catch {
      serveProcess.kill();
      serveProcess = null;
    }
  }

  console.log('Starting serve on port 3000...');
  serveProcess = spawn(SERVE_BIN, ['.', '-l', '3000', '--no-clipboard'], {
    cwd: APP_DIR,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, HOME: '/tmp' },
  });
  serveProcess.stdout.on('data', (d) => console.log('[serve]', d.toString().trim()));
  serveProcess.stderr.on('data', (d) => console.log('[serve:err]', d.toString().trim()));
  serveProcess.on('exit', (code) => { console.log(`serve exited with code ${code}`); serveProcess = null; });

  await waitForPort(3000, 15000);
  console.log('serve is ready on port 3000');
}

function handleRunTests(req, res) {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', async () => {
    let version = 'v1';
    let device = 'desktop';
    let grep = '';
    try {
      const parsed = JSON.parse(body);
      version = parsed.version || 'v1';
      device = parsed.device || 'desktop';
      grep = parsed.grep || '';
    } catch {}

    try {
      await ensureServeRunning();
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
      res.end(JSON.stringify({ error: true, message: `Failed to start serve: ${err.message}` }));
      return;
    }

    const project = device === 'mobile' ? 'mobile' : 'chromium';
    // Don't set CI so reuseExistingServer=true (use our pre-started serve)
    const env = { ...process.env };
    delete env.CI;
    env.HOME = '/tmp';
    env.PLAYWRIGHT_BROWSERS_PATH = '/ms-playwright';

    if (version === 'v2') {
      env.TEST_PATH = '/v2/';
    }

    const lambdaConfig = path.join(__dirname, 'playwright.config.ts');
    const args = ['test', '--config', lambdaConfig, '--reporter=json', `--project=${project}`, '--output=/tmp/test-results'];
    if (grep) {
      args.push('--grep', grep);
    }
    console.log(`Running: playwright ${args.join(' ')}`);

    const child = spawn(PLAYWRIGHT_BIN, args, { env, cwd: APP_DIR, stdio: ['ignore', 'pipe', 'pipe'] });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => { stdout += data; });
    child.stderr.on('data', (data) => { stderr += data; });

    child.on('close', (code) => {
      console.log(`Playwright exited with code ${code}, stdout=${stdout.length}b, stderr=${stderr.length}b`);
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });

      try {
        const result = JSON.parse(stdout);
        inlineAttachments(result);
        res.end(JSON.stringify(result));
      } catch {
        res.end(JSON.stringify({
          error: true,
          exitCode: code,
          stdout: stdout.slice(0, 5000),
          stderr: stderr.slice(0, 5000),
        }));
      }
    });

    child.on('error', (err) => {
      res.writeHead(500, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });
      res.end(JSON.stringify({ error: true, message: err.message }));
    });
  });
}

function inlineAttachments(result) {
  function walkSuites(suite) {
    if (suite.specs) {
      suite.specs.forEach(spec => {
        spec.tests.forEach(t => {
          t.results.forEach(r => {
            if (r.attachments) {
              r.attachments.forEach(att => {
                if (att.path && att.contentType && att.contentType.startsWith('image/')) {
                  try {
                    const data = fs.readFileSync(att.path);
                    att.body = data.toString('base64');
                    delete att.path;
                  } catch {}
                }
              });
            }
          });
        });
      });
    }
    if (suite.suites) suite.suites.forEach(walkSuites);
  }
  if (result.suites) result.suites.forEach(walkSuites);
}

const server = http.createServer((req, res) => {
  console.log(`[${req.method}] ${req.url}`);

  // Health check for Lambda Web Adapter readiness
  if (req.method === 'GET' && req.url.split('?')[0] === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }

  const urlPath = req.url.split('?')[0];
  if (req.method === 'POST' && urlPath === '/api/run-tests') {
    handleRunTests(req, res);
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Lambda server listening on port ${PORT}`);
});
