const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);

const PORT = process.env.PORT || 3000;

server.listen(PORT);

app.get('/', (req, res) => { res.sendFile('index.html', { root: './client' }); });
app.get('/miserables.json', (req, res) => { res.sendFile('miserables.json', { root: './src' }); });

const NAMES = ['aphid', 'badger', 'chameleon', 'dingo', 'ermine'];

const users = {};
const nodes = [];
const links = [];

const randomColor = () => {
  const r = parseInt(Math.random() * 256, 10);
  const g = parseInt(Math.random() * 256, 10);
  const b = parseInt(Math.random() * 256, 10);

  return `rgb(${r},${g},${b})`;
};

const randomUsername = () => NAMES[parseInt(Math.random() * NAMES.length, 10)];

const updateGameState = () => {
  io.emit('currentGameState', {
    users,
    nodes,
    links,
  });
};

const userJoined = (socket) => {
  users[socket.id] = {
    id: socket.id,
    isPlaying: true,
    color: randomColor(),
    username: randomUsername(),
  };
  nodes.push({
    owner: socket.id,
    power: 10,
    x: Math.random() * 600,
    y: Math.random() * 600,
  });

  socket.emit('userInfo', users[socket.id]);
  socket.broadcast.emit('userJoined', users[socket.id]);
  updateGameState();
};

// Send periodic game state updates to clients
setInterval(updateGameState, 100);

// Increase nodes' power every second
setInterval(() => {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i].power < 50 && nodes[i].owner) { nodes[i].power++; }
  }
}, 1000);

io.on('connect', (socket) => {
  userJoined(socket);

  socket.on('disconnect', () => {
    delete users[socket.id];

    // Un-own any leftover nodes
    for (let i = 0; i < nodes.length; i++) {
      const n = nodes[i];
      if (n.owner === socket.id) n.owner = null;
    }

    io.emit('userLeft', {
      id: socket.id,
    });
  });
});
