const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const qrcode = require('qrcode');
const ip = require('ip');
const UAParser = require('ua-parser-js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const localIp = ip.address();
const port = 3000;
const localUrl = `http://${localIp}:${port}`;

let clients = {};

app.use(express.static(path.join(__dirname, 'public')));

app.get('/qrcode', async (req, res) => {
  try {
    const qrCodeImage = await qrcode.toDataURL(localUrl);
    res.send(`
      <html>
        <body style="text-align: center;">
          <h1>Quét mã QR để truy cập</h1>
          <p>Hoặc nhập địa chỉ: <strong>${localUrl}</strong></p>
          <img src="${qrCodeImage}" alt="QR Code">
        </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send("Lỗi khi tạo QR code");
  }
});

io.on('connection', (socket) => {
  const userAgent = socket.handshake.headers['user-agent'];
  const parser = new UAParser(userAgent);
  const deviceInfo = parser.getResult();

  clients[socket.id] = {
    id: socket.id,
    ip: socket.handshake.address,
    browser: deviceInfo.browser.name || 'Unknown Browser',
    os: deviceInfo.os.name || 'Unknown OS',
    device: deviceInfo.device.model || 'PC'
  };

  console.log(`Client connected: ${socket.id}`);
  io.emit('update-clients', Object.values(clients));

  socket.on('file-meta', (data) => {
    console.log(`Received file-meta from ${socket.id}:`, data);
    socket.broadcast.emit('file-meta', data);
  });

  socket.on('file-chunk', (data) => {
    console.log(`Received file-chunk from ${socket.id} at offset ${data.offset}`);
    socket.broadcast.emit('file-chunk', data);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    delete clients[socket.id];
    io.emit('update-clients', Object.values(clients));
  });
});

server.listen(port, () => {
  console.log(`Server đang chạy trên: ${localUrl}`);
  console.log(`Quét mã QR để truy cập: ${localUrl}/qrcode`);
});
