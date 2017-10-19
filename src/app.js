const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
var crypto = require('crypto');
var Victor = require('victor');

const PORT = process.env.PORT || 3000;

server.listen(PORT);

app.get('/', (req, res) => { res.sendFile('index.html', { root: './client' }); });
app.get('/miserables.json', (req, res) => { res.sendFile('miserables.json', { root: './src' }); });

const COLORS = ['#AAFF00','#FFAA00','#FF00AA','#AA00FF','#00AAFF'];
const NAMES = ['aphid', 'badger', 'chameleon', 'dingo', 'ermine'];

const FRICTION = new Victor(2,2);
const WORLD_SIZE = 400;
const MAX_PLAYERS = 10;

const rooms = {};

const randomColor = () => {
  const r = parseInt(Math.random() * 156 + 100, 10);
  const g = parseInt(Math.random() * 156 + 100, 10);
  const b = parseInt(Math.random() * 156 + 100, 10);

  return `rgb(${r},${g},${b})`;
};

const randomUsername = () => NAMES[parseInt(Math.random() * NAMES.length, 10)];

const populate = (room) => {
    for(var i=0; i<10; i++){
        let newNodeId = crypto.randomBytes(12).toString('hex');
        rooms[room].nodes[newNodeId] = {
            id: newNodeId,
            owner: undefined,
            power: 10,
            loc: new Victor(WORLD_SIZE/2 + 200*Math.random(),WORLD_SIZE/2 + 200*Math.random()),
            vel: new Victor(0,0),
            accel: new Victor(0,0),
            isLinked: false,
        };
    }
}

const updateNodePower = (room) => {
    let links = rooms[room].links;
    let nodes = rooms[room].nodes;
    for(var i=0; i<links.length; i++){
        let l = links[i];

        // If it's being targeted...
        if(nodes[l.target]){
            // And the source is the same owner...
            if(nodes[l.src].owner === nodes[l.target].owner){
                // Boost its power
                if(nodes[l.target].power < 30) nodes[l.target].power += 1;
            }
            // And the source is an enemy...
            else{
                // Attack its power
                if(nodes[l.target].power > 9) nodes[l.target].power -= 1;
                // Take it over
                else nodes[l.target].owner = nodes[l.src].owner;
            }
        }

    }

    let keys = Object.keys(nodes);
    for (let i = 0; i < keys.length; i++) {
        let n = nodes[keys[i]];
        if (n.power < 30 && n.owner && !n.isLinked) { n.power += 0.5; }
    }
}

const forceDigraph = (room) => {
    let nodes = rooms[room].nodes;
    let links = rooms[room].links;
    let keys = Object.keys(rooms[room].nodes);
    let center = new Victor(WORLD_SIZE/2, WORLD_SIZE/2);

    for(var i=0; i<keys.length; i++){
        let n = nodes[keys[i]];

        // Nodes are attracted to center
        let vecToCenter = center.clone().subtract(n.loc).divide(new Victor(20,20));
        n.accel.add(vecToCenter);

        // Nodes are repulsed by other nodes
        for(var k=0; k<keys.length; k++){
            let n2 = nodes[keys[k]];
            if(n.id === n2.id) continue;
            let vecToNode = n2.loc.clone().subtract(n.loc).normalize();
            dist = new Victor(n.loc.distance(n2.loc));
            vecToNode.multiply(dist.normalize().subtract(new Victor(2,1)));
            n.accel.add(vecToNode);
        }

        // Apply forces
        n.vel.divide(FRICTION);
        n.vel.add(n.accel);
        n.loc.add(n.vel);

        n.accel = new Victor(0,0);
    }
};

const updateGameState = (room) => {

    forceDigraph(room);
    let users = rooms[room].users;
    let nodes = rooms[room].nodes;
    let links = rooms[room].links;

    io.to(room).emit('currentGameState', {
        users: users,
        nodes: nodes,
        links: links,
    });
};

const userJoined = (socket) => {
    let roomKeys = Object.keys(rooms);
    let currentRoom = undefined;

    // Find a room that isn't full
    for(var i=0; i<roomKeys.length; i++){
        let room = rooms[roomKeys[i]];
        if(Object.keys(room.users).length < MAX_PLAYERS){
            currentRoom = roomKeys[i];
        }
    }

    // Make a new room if all rooms are full
    if(currentRoom === undefined){
        currentRoom = crypto.randomBytes(10).toString('hex');
        rooms[currentRoom] = {
            users: {},
            nodes: {},
            links: [],
        }
        populate(currentRoom);

        // Send periodic game state updates to clients
        setInterval(function(){updateGameState(currentRoom);}, 100);

        // Increase nodes' power so often
        setInterval(function(){updateNodePower(currentRoom);}, 500);
        console.log("Current room " +currentRoom);
    }

    rooms[currentRoom].users[socket.id] = {
        room: currentRoom,
        id: socket.id,
        isPlaying: true,
        color: COLORS[COLORS.length-1],
        username: randomUsername(),
    };

    let newNodeId = crypto.randomBytes(12).toString('hex');
    rooms[currentRoom].nodes[newNodeId] = {
        id: newNodeId,
        owner: socket.id,
        power: 10,
        loc: new Victor(WORLD_SIZE/2 + 200*Math.random(),WORLD_SIZE/2 + 200*Math.random()),
        vel: new Victor(0,0),
        accel: new Victor(0,0),
        isLinked: false,
    };

    //socket.room = currentRoom;
    socket.leave(socket.id);
    socket.join(currentRoom);
    socket.to(currentRoom).emit('userInfo', rooms[currentRoom].users[socket.id]);
    socket.to(currentRoom).broadcast.emit('userJoined', rooms[currentRoom].users[socket.id]);
};

io.on('connect', (socket) => {
    userJoined(socket);

    socket.on('disconnect', () => {

        // Since it gets rid of the socket's rooms immediately, gotta find it manually
        let roomKeys = Object.keys(rooms);
        let room = undefined;
        for(var i=0; i<roomKeys.length; i++){
            let users = rooms[roomKeys[i]].users;
            if(users[socket.id]){
                delete users[socket.id]
                room = rooms[roomKeys[i]];
                break;
            }
        }

        // Un-own any leftover nodes
        let keys = Object.keys(room.nodes);
        for (let i = 0; i < keys.length; i++) {
            const n = room.nodes[keys[i]];
            if (n.owner === socket.id) n.owner = null;
        }

        io.to(room.id).emit('userLeft', {
            id: socket.id,
        });

        console.log(socket.id + ' left.');
    });

    socket.on('linkCreated', (data) => {
        let room = rooms[Object.keys(socket.rooms)[0]];
        room.links.push(data);
        room.nodes[data.src].isLinked = true;
        room.nodes[data.target].isLinked = true;
    });

    socket.on('linkBroken', (data) => {

    });

});
