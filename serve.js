import http from 'node:http';
import { readFile } from 'node:fs/promises';

const port = Number(process.env.PORT ?? 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT 必须是 1—65535 的整数');

const assets = new Map([
  ['/', ['index.html', 'text/html']],
  ['/index.html', ['index.html', 'text/html']],
  ['/styles.css', ['styles.css', 'text/css']],
  ['/app.js', ['app.js', 'text/javascript']],
  ['/date-table.js', ['date-table.js', 'text/javascript']],
]);

const server = http.createServer(async (request, response) => {
  const path = request.url.split('?')[0];
  const asset = assets.get(path);
  if (!asset) {
    response.writeHead(404).end('Not found');
    return;
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' }).end('Method not allowed');
    return;
  }
  try {
    const content = await readFile(new URL(asset[0], import.meta.url));
    response.writeHead(200, { 'Content-Type': `${asset[1]}; charset=utf-8`, 'Cache-Control': 'no-store' });
    response.end(request.method === 'HEAD' ? undefined : content);
  } catch {
    response.writeHead(500).end('Unable to read file');
  }
});
server.on('error', error => {
  console.error(error.code === 'EADDRINUSE' ? `端口 ${port} 已占用, 请使用 PORT 指定其他端口` : error.message);
  process.exitCode = 1;
});
server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${port}/`));
