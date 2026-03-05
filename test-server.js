const http = require('http');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const PORT = 3000;

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };
  return types[ext] || 'application/octet-stream';
}

function serveStatic(req, res) {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath.endsWith('/')) urlPath += 'index.html';

  const filePath = path.join(__dirname, urlPath);

  // Prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404);
      res.end('Not Found');
      return;
    }
    res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
    fs.createReadStream(filePath).pipe(res);
  });
}

function handleRunTests(req, res) {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    let version = 'v1';
    let device = 'desktop';
    try {
      const parsed = JSON.parse(body);
      version = parsed.version || 'v1';
      device = parsed.device || 'desktop';
    } catch {}

    const project = device === 'mobile' ? 'mobile' : 'chromium';
    const env = { ...process.env };
    if (version === 'v2') {
      env.TEST_PATH = '/v2/';
    }

    const args = ['playwright', 'test', '--reporter=json', `--project=${project}`];
    const child = spawn('npx', args, { env, cwd: __dirname });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (data) => { stdout += data; });
    child.stderr.on('data', (data) => { stderr += data; });

    child.on('close', (code) => {
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      });

      try {
        const result = JSON.parse(stdout);
        res.end(JSON.stringify(result));
      } catch {
        // If JSON parsing fails, return a structured error
        res.end(JSON.stringify({
          error: true,
          exitCode: code,
          stdout: stdout.slice(0, 5000),
          stderr: stderr.slice(0, 5000),
        }));
      }
    });
  });
}

const server = http.createServer((req, res) => {
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

  if (req.method === 'POST' && req.url === '/api/run-tests') {
    handleRunTests(req, res);
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}`);
  console.log(`Open http://localhost:${PORT}/test-report.html for v1 report`);
  console.log(`Open http://localhost:${PORT}/v2/test-report.html for v2 report`);
});
