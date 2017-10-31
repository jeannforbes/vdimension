const Dimension = require('./dimension.js').Dimension;
const Player = require('./player.js').Player;
const Particle = require('./particle.js').Particle;

/*
 *    HELPER FUNCTIONS
 */

const loop = (map, func) => {
  if (!map) return;

  const keys = Object.keys(map);
  for (let i = 0; i < keys.length; i++) { func(map[keys[i]]); }
};

class Game {
  constructor(io) {
    this.io = io;

    this.dimensions = {};

    this.updateInterval = undefined;

    this.dimensions.default = new Dimension('default', 'a1');
    this.dimensions.a1 = new Dimension('a1', 'a2');
    this.dimensions.a2 = new Dimension('a2', 'a3');
    this.dimensions.a3 = new Dimension('a3', 'a4');
    this.dimensions.a4 = new Dimension('a4', 'default');
  }

  start() {
    this.io.on('connection', (socket) => {
      console.log(`${socket.id} joined.`);
      socket.join('default');

      const newP = new Player(socket.id, 'default');
      this.dimensions[newP.dimId].players[socket.id] = newP;
      newP.color = this.dimensions[newP.dimId].color;

      socket.on('onmousemove', (data) => {
        const p = this.findPlayerById(socket.id);
        p.mouseLoc.x = data.x;
        p.mouseLoc.y = data.y;
      });

      socket.on('onscroll', () => {
        const d = this.findDimensionByPlayerId(socket.id);
        const p = d.players[socket.id];

        if (!d.next) return;
        socket.leave(d.id);
        socket.join(d.next);

        const swapP = new Player(socket.id, d.next);
        swapP.pbody.loc = p.pbody.loc.clone();
        swapP.color = this.dimensions[d.next].color;
        swapP.mouseLoc = p.mouseLoc;
        this.dimensions[d.next].players[socket.id] = swapP;
        delete d.players[socket.id];
        console.log(`swapping to ${d.next}`);
      });

      socket.on('disconnect', () => {
        const keys = Object.keys(this.dimensions);
        for (let i = 0; i < keys.length; i++) {
          const d = this.dimensions[keys[i]];
          if (d.players[socket.id]) {
            delete d.players[socket.id];
            console.log(`${socket.id} left.`);
            return true;
          }
        }
        return false;
      });
    });

    if (!this.updateInterval) { this.updateInterval = setInterval(this.update.bind(this), 100); }
  }

  update() {
    loop(this.dimensions, (d) => {
      d.update();
      this.io.to(d.id).emit('update', {
        dimensions: this.dimensions,
      });

      // Particles don't stay in just one place...
      loop(d.particles, (p) => {
        if (Math.random() < p.phaseChance) {
          const newP = new Particle(p.id);
          newP.pbody = p.pbody;
          newP.color = p.color;
          newP.phaseChance = p.phaseChance;
          d.deletePlayer(p.id);
          this.dimensions[d.next].particles[newP.id] = newP;
        }
      });
    });
  }

  findPlayerById(id) {
    const keys = Object.keys(this.dimensions);
    for (let i = 0; i < keys.length; i++) {
      const d = this.dimensions[keys[i]];
      if (d.players[id]) return d.players[id];
    }
    return false;
  }

  findDimensionByPlayerId(id) {
    const keys = Object.keys(this.dimensions);
    for (let i = 0; i < keys.length; i++) {
      const d = this.dimensions[keys[i]];
      if (d.players[id]) return d;
    }
    return false;
  }
}

module.exports.Game = Game;
