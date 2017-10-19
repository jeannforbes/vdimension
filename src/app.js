const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
const crypto = require('crypto');
const Victor = require('victor');

const PORT = process.env.PORT || 3000;

server.listen(PORT);

app.get('/', (req, res) => { res.sendFile('index.html', { root: './client' }); });
app.get('/circle_point.png', (req, res) => { res.sendFile('circle_point.png', { root: './client/images' }); });
app.get('/mouse.png', (req, res) => { res.sendFile('mouse.png', { root: './client/images' }); });

const COLORS = ['#0074D9', '#FFAA00', '#FF00AA', '#AA00FF', '#00AAFF',
  '#FF851B', '#F012BE', '#FFDC00', '#DD403A', '#B8B42D'];
const NAMES = ['aphid', 'badger', 'chameleon', 'dingo', 'ermine'];

const FRICTION = new Victor(2, 2);
const WORLD = {
  WIDTH: 1200,
  HEIGHT: 600,
};
const MAX_PLAYERS = 10;

const rooms = {};

const randomUsername = () => NAMES[parseInt(Math.random() * NAMES.length, 10)];

const populate = (room) => {
  for (let i = 0; i < 30; i++) {
    const newNodeId = crypto.randomBytes(12).toString('hex');
    rooms[room].nodes[newNodeId] = {
      id: newNodeId,
      owner: undefined,
      power: 10,
      loc: new Victor((WORLD.WIDTH / 2) + (200 * Math.random()),
        (WORLD.HEIGHT / 2) + (200 * Math.random())),
      vel: new Victor(0, 0),
      accel: new Victor(0, 0),
      isLinked: false,
    };
  }
};

const updateNodePower = (room) => {
  const links = rooms[room].links;
  const nodes = rooms[room].nodes;
  for (let i = 0; i < links.length; i++) {
    const l = links[i];

    // If it's being targeted...
    if (nodes[l.target]) {
      if (nodes[l.src].owner === nodes[l.target].owner && nodes[l.src].owner != null) {
        if (nodes[l.target].power < 30) {
          nodes[l.target].power += 1;
        }
      } else if (nodes[l.target].power > 9) { // And the source is an enemy...
        nodes[l.target].power -= 1;
      } else { // Take it over
        nodes[l.target].owner = nodes[l.src].owner;
      }
    }
  }

  const keys = Object.keys(nodes);
  for (let i = 0; i < keys.length; i++) {
    const n = nodes[keys[i]];
    if (n.power < 30 && n.owner && !n.isLinked) { n.power += 0.5; }
  }
};

const forceDigraph = (room) => {
  const nodes = rooms[room].nodes;
  // const links = rooms[room].links;
  const keys = Object.keys(rooms[room].nodes);
  const center = new Victor(WORLD.WIDTH / 2, WORLD.HEIGHT / 2);

  for (let i = 0; i < keys.length; i++) {
    const n = nodes[keys[i]];

    // Nodes are attracted to center
    const vecToCenter = center.clone().subtract(n.loc).divide(new Victor(10, 10));
    n.accel.add(vecToCenter);

    // Nodes are repulsed by other nodes
    for (let k = 0; k < keys.length; k++) {
      const n2 = nodes[keys[k]];
      if (n.id !== n2.id) {
        const vecToNode = n2.loc.clone().subtract(n.loc).normalize();
        const dist = new Victor(n.loc.distance(n2.loc));
        vecToNode.multiply(dist.normalize().subtract(new Victor(2, 1)));
        n.accel.add(vecToNode);
      }
    }

    // Apply forces
    n.vel.divide(FRICTION);
    n.vel.add(n.accel);
    n.loc.add(n.vel);

    n.accel = new Victor(0, 0);
  }
};

const updateGameState = (room) => {
  forceDigraph(room);
  const users = rooms[room].users;
  const nodes = rooms[room].nodes;
  const links = rooms[room].links;

  io.to(room).emit('currentGameState', {
    users,
    nodes,
    links,
  });
};

const userJoined = (socket) => {
  const roomKeys = Object.keys(rooms);
  let currentRoom;

  // Find a room that isn't full
  for (let i = 0; i < roomKeys.length; i++) {
    const room = rooms[roomKeys[i]];
    if (Object.keys(room.users).length < MAX_PLAYERS) {
      currentRoom = roomKeys[i];
    }
  }

  // Make a new room if all rooms are full
  if (currentRoom === undefined) {
    currentRoom = crypto.randomBytes(10).toString('hex');
    rooms[currentRoom] = {
      users: {},
      nodes: {},
      links: [],
    };
    populate(currentRoom);

    // Send periodic game state updates to clients
    setInterval(() => { updateGameState(currentRoom); }, 100);

    // Increase nodes' power so often
    setInterval(() => { updateNodePower(currentRoom); }, 500);
    console.log(`Current room ${currentRoom}`);
  }

  rooms[currentRoom].users[socket.id] = {
    room: currentRoom,
    id: socket.id,
    isPlaying: true,
    color: COLORS[Object.keys(rooms[currentRoom].users).length],
    username: randomUsername(),
  };

  const newNodeId = crypto.randomBytes(12).toString('hex');
  rooms[currentRoom].nodes[newNodeId] = {
    id: newNodeId,
    owner: socket.id,
    power: 10,
    loc: new Victor((WORLD.WIDTH / 2) + (200 * Math.random()),
      (WORLD.HEIGHT / 2) + (200 * Math.random())),
    vel: new Victor(0, 0),
    accel: new Victor(0, 0),
    isLinked: false,
  };

  // socket.room = currentRoom;
  socket.leave(socket.id);
  socket.join(currentRoom);
  socket.emit('userInfo', rooms[currentRoom].users[socket.id]);
  socket.to(currentRoom).broadcast.emit('userJoined', rooms[currentRoom].users[socket.id]);
};

io.on('connect', (socket) => {
  userJoined(socket);

  socket.on('disconnect', () => {
    // Since it gets rid of the socket's rooms immediately, gotta find it manually
    const roomKeys = Object.keys(rooms);
    let room;
    for (let i = 0; i < roomKeys.length; i++) {
      const users = rooms[roomKeys[i]].users;
      if (users[socket.id]) {
        delete users[socket.id];
        room = rooms[roomKeys[i]];
        break;
      }
    }

    // Un-own any leftover nodes
    const keys = Object.keys(room.nodes);
    for (let i = 0; i < keys.length; i++) {
      const n = room.nodes[keys[i]];
      if (n.owner === socket.id) n.owner = null;
    }

    io.to(room.id).emit('userLeft', {
      id: socket.id,
    });

    console.log(`${socket.id} left.`);
  });

  socket.on('linkCreated', (data) => {
    const room = rooms[Object.keys(socket.rooms)[0]];
    room.links.push(data);
    room.nodes[data.src].isLinked = true;
    room.nodes[data.target].isLinked = true;
  });

  socket.on('linkBroken', (data) => {
    console.log(data);
  });
});
