const http = require('http');
const fs = require('fs');
const path = require('path');
const gemini = require('./gemini');

const PORT = process.env.PORT || 8080;

// Lightweight in-memory rate limit for the AI endpoint (per-IP, per-minute).
const rateBucket = new Map();
function rateLimited(ip) {
    const now = Date.now();
    const windowMs = 60000, max = 20;
    const entry = rateBucket.get(ip) || { count: 0, reset: now + windowMs };
    if (now > entry.reset) { entry.count = 0; entry.reset = now + windowMs; }
    entry.count += 1;
    rateBucket.set(ip, entry);
    return entry.count > max;
}

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
    // Remove query parameters if present (e.g. stylesheet.css?v=1.2)
    const urlPath = req.url.split('?')[0];

    // ---- AI insights API (server-side Gemini proxy; key never exposed) ----
    if (urlPath === '/api/insights' && req.method === 'POST') {
        const ip = req.socket.remoteAddress || 'unknown';
        if (rateLimited(ip)) {
            res.writeHead(429, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Too many requests' }));
            return;
        }
        let body = '';
        req.on('data', chunk => {
            body += chunk;
            if (body.length > 10000) req.destroy(); // cap payload
        });
        req.on('end', async () => {
            let profile = {};
            try { profile = JSON.parse(body || '{}'); } catch (e) { profile = {}; }
            const result = await gemini.generateInsights(profile);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
        });
        return;
    }
    if (urlPath === '/api/insights') {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
        return;
    }

    // Normalize URL and serve index.html by default
    const filePath = urlPath === '/' ? '/index.html' : urlPath;
    const absolutePath = path.join(__dirname, filePath);

    // Prevent directory traversal attacks
    if (!absolutePath.startsWith(__dirname)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
    }

    const ext = path.extname(absolutePath);
    const contentType = MIME_TYPES[ext] || 'text/plain';

    fs.readFile(absolutePath, (err, content) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.statusCode = 404;
                res.end('File Not Found');
            } else {
                res.statusCode = 500;
                res.end(`Server Error: ${err.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${PORT}/`);
});
