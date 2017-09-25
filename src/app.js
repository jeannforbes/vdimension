const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);

const PORT = process.env.PORT || 3000;

server.listen(PORT);

app.get('/', (req, res) => { res.sendFile('index.html', { root: './client' }); });
app.get('/001.png', (req, res) => { res.sendFile('001.png', { root: './client/png' }); });
app.get('/002.png', (req, res) => { res.sendFile('002.png', { root: './client/png' }); });
app.get('/003.png', (req, res) => { res.sendFile('003.png', { root: './client/png' }); });
app.get('/004.png', (req, res) => { res.sendFile('004.png', { root: './client/png' }); });
app.get('/005.png', (req, res) => { res.sendFile('005.png', { root: './client/png' }); });
app.get('/006.png', (req, res) => { res.sendFile('006.png', { root: './client/png' }); });
app.get('/007.png', (req, res) => { res.sendFile('007.png', { root: './client/png' }); });
app.get('/008.png', (req, res) => { res.sendFile('008.png', { root: './client/png' }); });

io.on('connect', (socket) => {
  // Update player location on move
  socket.on('addSquare', (data) => {
    io.emit('addSquare', data);
  });
});
