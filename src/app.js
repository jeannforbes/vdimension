const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);

const Game = require('./game.js').Game;

// CONSTANTS
const PORT = process.env.PORT || 3000;

const startServer = () => {
  server.listen(PORT);

  app.get('/', (req, res) => { res.sendFile('index.html', { root: './client/' }); });
  app.get('/main.js', (req, res) => { res.sendFile('main.js', { root: './client/' }); });
  app.get('/style.css', (req, res) => { res.sendFile('style.css', { root: './client/' }); });

  const game = new Game(io);
  game.start();
};

startServer();
