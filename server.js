'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { URL } = require('node:url');

const ROOT = __dirname;
const HTML_PATH = path.join(ROOT, 'index.html');
const ENV_PATH = path.join(ROOT, '.env');

// A tiny .env reader keeps this beginner project dependency-free.
if (fs.existsSync(ENV_PATH)) {
  for (const line of fs.readFileSync(ENV_PATH, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match && !Object.prototype.hasOwnProperty.call(process.env, match[1])) {
      process.env[match[1]] = match[2].replace(/^(['"])(.*)\1$/, '$2');
    }
  }
}

const PORT = Number(process.env.PORT || 3000);
const COZE_API_TOKEN = process.env.COZE_API_TOKEN || '';
const COZE_BOT_ID = process.env.COZE_BOT_ID || '7695248475264434229';
const COZE_API_BASE = (process.env.COZE_API_BASE || 'https://api.coze.com').replace(/\/$/, '');

function sendJson(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let body = ''; let bytes = 0;
    req.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > 30_000) { reject(new Error('Nội dung gửi quá dài.')); req.destroy(); return; }
      body += chunk.toString('utf8');
    });
    req.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch { reject(new Error('Dữ liệu gửi lên không hợp lệ.')); }
    });
    req.on('error', reject);
  });
}

async function sendToCoze({ question, userId, conversationId }) {
  const endpoint = new URL('/v3/chat', COZE_API_BASE);
  if (conversationId) endpoint.searchParams.set('conversation_id', conversationId);
  const apiResponse = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${COZE_API_TOKEN}`,
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream'
    },
    body: JSON.stringify({
      bot_id: COZE_BOT_ID,
      user_id: String(userId || 'student-demo').slice(0, 128),
      stream: true,
      auto_save_history: true,
      additional_messages: [{ role: 'user', content: question, content_type: 'text' }]
    })
  });

  if (!apiResponse.ok) {
    const detail = await apiResponse.text().catch(() => '');
    console.error('Coze API HTTP error:', apiResponse.status, detail.slice(0, 1600));
    if (apiResponse.status === 401 || apiResponse.status === 403) {
      throw new Error('Coze từ chối xác thực. Hãy kiểm tra COZE_API_TOKEN và quyền Chat API của token.');
    }
    if (apiResponse.status === 404) {
      throw new Error('Không tìm thấy bot hoặc API endpoint. Hãy kiểm tra COZE_BOT_ID và khu vực API.');
    }
    throw new Error(`Coze API trả lỗi HTTP ${apiResponse.status}. Kiểm tra bot ID, quyền truy cập và cấu hình xuất bản.`);
  }
  if (!apiResponse.body) throw new Error('Coze không trả về luồng phản hồi.');

  const reader = apiResponse.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let conversation = conversationId || '';
  let chatStatus = '';
  let lastError = '';
  const messages = new Map();
  const answerOrder = [];

  function processEvent(block) {
    if (!block.trim()) return;
    let eventName = '';
    const dataLines = [];
    for (const line of block.split(/\r?\n/)) {
      if (line.startsWith('event:')) eventName = line.slice(6).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice(5).trimStart());
    }
    if (!dataLines.length) return;
    const raw = dataLines.join('\n');
    if (raw === '[DONE]' || raw === '"[DONE]"') return;
    let data;
    try { data = JSON.parse(raw); } catch { return; }
    if (data.conversation_id) conversation = data.conversation_id;
    if (data.status) chatStatus = data.status;
    if (data.last_error && data.last_error.msg) lastError = data.last_error.msg;

    if ((eventName === 'conversation.message.delta' || eventName === 'conversation.message.completed') && data.role === 'assistant' && data.type === 'answer' && typeof data.content === 'string') {
      const id = data.id || `answer-${answerOrder.length}`;
      if (!messages.has(id)) answerOrder.push(id);
      // Delta events append fragments; completed events contain the full final message.
      if (eventName === 'conversation.message.completed') messages.set(id, data.content);
      else messages.set(id, (messages.get(id) || '') + data.content);
    }
  }

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() || '';
    for (const block of blocks) processEvent(block);
  }
  buffer += decoder.decode();
  if (buffer.trim()) processEvent(buffer);

  const answer = answerOrder.map(id => messages.get(id) || '').filter(Boolean).join('\n\n').trim();
  if (!answer) {
    if (lastError) throw new Error('Chatbot báo lỗi: ' + lastError);
    if (chatStatus === 'failed') throw new Error('Cuộc trò chuyện thất bại. Hãy kiểm tra cấu hình agent trên Coze.');
    throw new Error('Đã kết nối Coze nhưng chưa nhận được câu trả lời. Kiểm tra bot ID, kênh xuất bản Chat API và thử lại.');
  }
  return { answer, conversationId: conversation || undefined };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (req.method === 'GET' && url.pathname === '/api/health') {
    return sendJson(res, 200, { ok: true, configured: Boolean(COZE_API_TOKEN && COZE_BOT_ID), missingToken: !COZE_API_TOKEN, botIdConfigured: Boolean(COZE_BOT_ID) });
  }
  if (req.method === 'POST' && url.pathname === '/api/chat') {
    if (!COZE_API_TOKEN || !COZE_BOT_ID) {
      return sendJson(res, 503, { error: 'Chưa cấu hình Coze API. Hãy tạo file .env từ .env.example và điền COZE_API_TOKEN, COZE_BOT_ID.' });
    }
    let payload;
    try { payload = await readJson(req); }
    catch (error) { return sendJson(res, 400, { error: error.message }); }
    const question = typeof payload.question === 'string' ? payload.question.trim() : '';
    if (!question) return sendJson(res, 400, { error: 'Vui lòng nhập câu hỏi.' });
    if (question.length > 4000) return sendJson(res, 400, { error: 'Câu hỏi dài quá. Vui lòng rút gọn dưới 4.000 ký tự.' });
    try {
      const result = await sendToCoze({ question, userId: payload.userId, conversationId: payload.conversationId });
      return sendJson(res, 200, result);
    } catch (error) {
      console.error('Chat request failed:', error.message);
      return sendJson(res, 502, { error: error.message || 'Không kết nối được Coze. Vui lòng thử lại.' });
    }
  }
  if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    return fs.createReadStream(HTML_PATH).pipe(res);
  }
  if (req.method === 'GET' && url.pathname === '/favicon.ico') { res.writeHead(204); return res.end(); }
  return sendJson(res, 404, { error: 'Không tìm thấy đường dẫn.' });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Trợ lý học vụ CNTT đang chạy tại http://localhost:${PORT}`);
  if (!COZE_API_TOKEN) console.log('Chưa có COZE_API_TOKEN. Thêm token vào file .env để bật chat trực tiếp.');
  console.log(`Bot ID hiện cấu hình: ${COZE_BOT_ID || '(chưa có)'}`);
});
