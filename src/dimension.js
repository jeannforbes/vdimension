const Victor = require('victor');
const Particle = require('./particle.js').Particle;

const randomColor = () => {
  const r = parseInt(Math.random() * 256, 10);
  const g = parseInt(Math.random() * 256, 10);
  const b = parseInt(Math.random() * 256, 10);
  return `rgb(${r},${g},${b})`;
};

const loop = (map, func) => {
  if (!map) return;

  const keys = Object.keys(map);
  for (let i = 0; i < keys.length; i++) { func(map[keys[i]]); }
};

const checkCollisions = (map1, map2) => {
  loop(map1, (p1) => {
    loop(map2, (p2) => {
      p1.pbody.isColliding(p2.pbody);
      if (p1.id !== p2.id && p1.pbody.colliding) {
        p1.pbody.collide(p2.pbody);
      }
    });
  });
};

class Dimension {
  constructor(id, next) {
    this.id = id || Date.now();
    this.next = next;

    this.particles = {};
    this.players = {};

    this.w = 900;
    this.h = 600;
    this.friction = 0.97;

    this.color = randomColor();

    this.populate(parseInt(Math.random() * 20, 10));
  }

  update() {
    checkCollisions(this.players, this.particles);
    checkCollisions(this.particles, this.players);
    checkCollisions(this.particles, this.particles);
    loop(this.players, (p) => {
      p.update();
    });
    loop(this.particles, (p) => {
      p.update();
      p.pbody.applyFriction(this.friction);
      if (p.pbody.loc.x > this.w - p.pbody.mass ||
                p.pbody.loc.x < p.pbody.mass) p.pbody.vel.multiply(new Victor(-1, 1));
      if (p.pbody.loc.y > this.h - p.pbody.mass ||
                p.pbody.loc.y < p.pbody.mass) p.pbody.vel.multiply(new Victor(1, -1));
    });
  }

  deletePlayer(id) {
    delete this.players[id];
  }

  populate(num) {
    for (let i = 0; i < num; i++) {
      const p = new Particle(Date.now() * Math.random());
      p.pbody.loc.x = 200;// this.w*Math.random();
      p.pbody.loc.y = 300;// this.h*Math.random();
      p.pbody.mass = (Math.random() * 10) + 10;
      p.color = this.color;
      if (Math.random() < 0.5) {
        p.pbody.applyForce(new Victor((Math.random() * 20) - 10, (Math.random() * 20) - 10));
      }
      p.pbody.loc = new Victor(Math.random() * this.w, Math.random() * this.h);
      this.particles[p.id] = p;
    }
  }
}

module.exports.Dimension = Dimension;
