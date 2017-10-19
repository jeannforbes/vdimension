const app = require('express')();
const server = require('http').Server(app);
const io = require('socket.io')(server);
var crypto = require('crypto');
var Victor = require('victor');

const PORT = process.env.PORT || 3000;

server.listen(PORT);

app.get('/', (req, res) => { res.sendFile('index.html', { root: './client' }); });
app.get('/miserables.json', (req, res) => { res.sendFile('miserables.json', { root: './src' }); });

const NAMES = ['aphid', 'badger', 'chameleon', 'dingo', 'ermine'];
const FRICTION = new Victor(2,2);
const WORLD_SIZE = 400;

const users = {};
const nodes = {};
const links = [];

const randomColor = () => {
  const r = parseInt(Math.random() * 156 + 100, 10);
  const g = parseInt(Math.random() * 156 + 100, 10);
  const b = parseInt(Math.random() * 156 + 100, 10);

  return `rgb(${r},${g},${b})`;
};

const randomUsername = () => NAMES[parseInt(Math.random() * NAMES.length, 10)];

const updateNodePower = () => {
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

const forceDigraph = () => {
    let keys = Object.keys(nodes);
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

const updateGameState = () => {

    forceDigraph();

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

    let newNodeId = crypto.randomBytes(12).toString('hex');
    nodes[newNodeId] = {
        id: newNodeId,
        owner: socket.id,
        power: 10,
        loc: new Victor(WORLD_SIZE/2 + 200*Math.random(),WORLD_SIZE/2 + 200*Math.random()),
        vel: new Victor(0,0),
        accel: new Victor(0,0),
        isLinked: false,
    };

    socket.emit('userInfo', users[socket.id]);
    socket.broadcast.emit('userJoined', users[socket.id]);
    updateGameState();
};

// Send periodic game state updates to clients
setInterval(updateGameState, 100);

// Increase nodes' power so often
setInterval(updateNodePower, 500);

io.on('connect', (socket) => {
    userJoined(socket);

    socket.on('disconnect', () => {
        delete users[socket.id];

        // Un-own any leftover nodes
        let keys = Object.keys(nodes);
        for (let i = 0; i < keys.length; i++) {
            const n = nodes[keys[i]];
            if (n.owner === socket.id) n.owner = null;
        }

        io.emit('userLeft', {
            id: socket.id,
        });
    });

    socket.on('linkCreated', (data) => {
        links.push(data);
        nodes[data.src].isLinked = true;
        nodes[data.target].isLinked = true;
    });

    socket.on('linkBroken', (data) => {

    });

});
