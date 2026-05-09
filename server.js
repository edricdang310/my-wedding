const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const GUESTBOOK_FILE = path.join(__dirname, 'guestbook.json');

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.woff': 'application/font-woff',
    '.woff2': 'application/font-woff2',
    '.ttf': 'application/font-ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.otf': 'application/font-otf',
    '.wasm': 'application/wasm',
    '.mp3': 'audio/mpeg'
};

const server = http.createServer((req, res) => {
    // API Endpoints for Guestbook
    if (req.url === '/api/guestbook') {
        if (req.method === 'GET') {
            fs.readFile(GUESTBOOK_FILE, 'utf8', (err, data) => {
                if (err) {
                    res.writeHead(500);
                    res.end('Error reading data');
                    return;
                }
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(data || '[]');
            });
            return;
        } else if (req.method === 'POST') {
            let body = '';
            req.on('data', chunk => {
                body += chunk.toString();
            });
            req.on('end', () => {
                try {
                    const newMsg = JSON.parse(body);
                    fs.readFile(GUESTBOOK_FILE, 'utf8', (err, data) => {
                        let messages = [];
                        if (!err && data) {
                            try { messages = JSON.parse(data); } catch (e) { }
                        }
                        // Xóa script tag để bảo mật cơ bản
                        const cleanName = newMsg.name.replace(/</g, "&lt;").replace(/>/g, "&gt;");
                        const cleanMessage = newMsg.message.replace(/</g, "&lt;").replace(/>/g, "&gt;");

                        messages.unshift({
                            name: cleanName,
                            message: cleanMessage
                        });

                        fs.writeFile(GUESTBOOK_FILE, JSON.stringify(messages, null, 2), err => {
                            if (err) {
                                res.writeHead(500);
                                res.end('Error saving data');
                                return;
                            }
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ success: true, messages }));
                        });
                    });
                } catch (e) {
                    res.writeHead(400);
                    res.end('Invalid JSON');
                }
            });
            return;
        }
    }

    // Static file serving
    let filePath = req.url.split('?')[0]; // Bỏ query params trước (fix lỗi Zalo thêm ?zarsrc=...)
    if (filePath === '/') filePath = '/index.html';
    filePath = path.join(__dirname, filePath);

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = mimeTypes[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.writeHead(404);
                res.end('File not found');
            } else {
                res.writeHead(500);
                res.end('Server error: ' + error.code);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`Server web đang chạy tại: http://localhost:${PORT}`);
    console.log(`Dữ liệu lưu bút được lưu tại file: ${GUESTBOOK_FILE}`);
    console.log(`Nhấn Ctrl + C để tắt server.`);
});
