const Dimension = require('./dimension.js').Dimension;
const Player = require('./player.js').Player;
const Particle = require('./particle.js').Particle;
const LoadGlobal = require('./global.js');

/*
 *    HELPER FUNCTIONS
 */

const loop = (map, func) => {
  if (!map) return;

  const keys = Object.keys(map);
  for (let i = 0; i < keys.length; i++) { func(map[keys[i]]); }
};

const randomColor = (max, min) => {
  const mmax = max || 256;
  const mmin = min || 0;
  const r = parseInt((Math.random() * (mmax - mmin)) + mmin, 10);
  const g = parseInt((Math.random() * (mmax - mmin)) + mmin, 10);
  const b = parseInt((Math.random() * (mmax - mmin)) + mmin, 10);
  return `rgb(${r},${g},${b})`;
};

class Game {
  constructor(io) {
    this.io = io;

    this.dimensions = {};

    this.updateInterval = undefined;
    this.updateScoresInterval = undefined;

    this.dimensions.default = new Dimension('default', 'a1');
    this.dimensions.a1 = new Dimension('a1', 'a2', 200);
    this.dimensions.a2 = new Dimension('a2', 'a3', 400);
    this.dimensions.a3 = new Dimension('a3', 'a4', 600);
    this.dimensions.a4 = new Dimension('a4', 'default', 300);

    this.scores = {};
    global.hunter = {
      name: undefined,
      id: undefined,
      color: undefined,
      timestamp: Date.now(),
    };
  }

  start() {
    LoadGlobal();

    this.io.on('connection', (socket) => {
      console.log(`${socket.id} joined.`);
      socket.join('default');

      const newP = new Player(socket.id, 'default');
      this.dimensions[newP.dimId].players[socket.id] = newP;
      newP.color = this.dimensions[newP.dimId].color;
      newP.pbody.collider = this.dimensions[newP.dimId].colliderType;
      newP.pbody.loc.x = (Math.random() * 300) + 100;
      newP.pbody.loc.y = (Math.random() * 300) + 100;

      // Do we need to start the game?
      if (!global.hunter || !global.hunter.id) this.assignHunter();
      // Let's give them a starting score of 0
      const newPColor = randomColor(256, 100);
      if (!this.scores[socket.id]) {
        this.scores[socket.id] = {
          name: newP.name,
          score: 0,
          color: newPColor,
        };
      }

      socket.emit('playerInfo', { name: newP.name, color: newPColor });

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

        // Swap player into a new dimension if it's within bounds
        const swapD = this.dimensions[d.next];
        if (p.pbody.loc.x > swapD.loc.x && p.pbody.loc.x < swapD.loc.x + swapD.w &&
           p.pbody.loc.y > swapD.loc.y && p.pbody.loc.y < swapD.loc.y + swapD.h) {
          const swapP = new Player(socket.id, d.next);
          swapP.pbody.loc = p.pbody.loc.clone();
          swapP.pbody.collider = swapD.colliderType;
          swapP.color = swapD.color;
          swapP.mouseLoc = p.mouseLoc;
          this.dimensions[d.next].players[socket.id] = swapP;
          delete d.players[socket.id];
          console.log(`${socket.id} swapping to ${d.next}`);
        } else {
          socket.emit('flash', { color: 'red', duration: 200 });
          socket.emit('message', { msg: 'get inside the next dimension first!' });
        }
      });

      socket.on('disconnect', () => {
        if (socket.id === global.hunter.id) {
          this.assignHunter();
        }

        delete this.scores[socket.id];

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

    if (!this.updateInterval) {
      this.updateInterval = setInterval(this.update.bind(this), 100);
    }
    if (!this.updateScoresInterval) {
      this.updateScoresInterval = setInterval(this.updateScores.bind(this), 1000);
    }
  }

  update() {
    loop(this.dimensions, (d) => {
      d.update();
      this.io.to(d.id).emit('update', {
        dimensions: this.dimensions,
        hunter: global.hunter,
        scores: this.scores,
      });

      // Particles don't stay in just one place, or one room!
      loop(d.particles, (p) => {
        const swapD = this.dimensions[d.next];
        if (Math.random() < p.phaseChance &&
            p.pbody.loc.x > swapD.loc.x && p.pbody.loc.x < swapD.loc.x + swapD.w &&
            p.pbody.loc.y > swapD.loc.y && p.pbody.loc.y < swapD.loc.y + swapD.h) {
          const newP = new Particle(p.id);
          newP.pbody = p.pbody;
          newP.pbody.collider = swapD.colliderType;
          newP.color = swapD.color;
          newP.phaseChance = p.phaseChance;
          d.deletePlayer(p.id);
          this.dimensions[d.next].particles[newP.id] = newP;
        }
      });
    });
  }

  assignHunter(p) {
    const pKeys = Object.keys(this.io.sockets.sockets);
    if (!p && Object.keys(this.io.sockets.sockets).length > 1 && global.hunter) {
      global.hunter.id = pKeys[parseInt(Math.random() * pKeys.length, 10)];
      global.hunter.name = this.findPlayerById(global.hunter.id).name;
      global.hunter.color = this.findPlayerById(global.hunter.id).color;
    } else if (p) {
      global.hunter.id = p.id;
      global.hunter.name = p.name;
      global.hunter.color = p.color;
    } else {
      global.hunter = {
        name: undefined,
        id: undefined,
        color: undefined,
      };
    }
  }

  updateScores() {
    if (global.hunter && global.hunter.id) {
      const pKeys = Object.keys(this.io.sockets.sockets);
      for (let i = 0; i < pKeys.length; i++) {
        if (this.scores[pKeys[i]] && pKeys[i] !== global.hunter.id) {
          this.scores[pKeys[i]].score++;
        }
      }
    }
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
