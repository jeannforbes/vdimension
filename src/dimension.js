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
        p1.pbody.isColliding(p2.pbody);
        p1.pbody.collide(p2.pbody);
      }
    });
  });
};

class Dimension {
  constructor(id, next, offset) {
    this.id = id || Date.now();
    this.next = next;

    this.particles = {};
    this.players = {};

    this.loc = new Victor(offset*Math.random(),offset*Math.random());

    this.w = 600 + (Math.random()*200);
    this.h = 400 + (Math.random()*100);
    this.friction = 0.90 + (Math.random()*0.11);

    this.color = randomColor();
    this.colliderType = (Math.random() > 0.5) ? "RECT" : "SPHERE";

    this.populate(parseInt((Math.random() * 10)+10, 10));
  }

  update() {
    checkCollisions(this.players, this.particles);
    checkCollisions(this.particles, this.players);
    checkCollisions(this.particles, this.particles);
    this.handlePlayerCollisions();
    loop(this.players, (p) => {
      p.update();
      this.keepInBounds(p.pbody);
    });
    loop(this.particles, (p) => {
      p.update();
      p.pbody.applyFriction(this.friction);
      this.keepInBounds(p.pbody);
    });
  }

  handlePlayerCollisions(){
    if(global.hunter.id){
      let pKeys = Object.keys(this.players);
      for(let i=0; i<pKeys.length; i++){
        let p1 = this.players[pKeys[i]];
        // We only care about the hunter
        if(p1.id !== global.hunter.id) continue;
        // Loop through all possible players we can collide with
        for(let k=0; k<pKeys.length; k++){
          let p2 = this.players[pKeys[k]];
          // Make sure they're not the same player
          if(p1.id === p2.id) continue;
          if(Date.now() < global.hunter.timestamp + 5000) continue;
          p1.pbody.isColliding(p2.pbody, () => {
            console.log("NEW HUNTER!!!");
            global.hunter = {
              id: p2.id,
              name: p2.name,
              color: p2.color,
              timestamp: Date.now(),
            };
          });
        }
      }
    }
  }

  keepInBounds(pbody){
    if (pbody.loc.x > this.w - pbody.mass+this.loc.x){
      pbody.vel.multiply(new Victor(-1, 1));
      pbody.loc.x = this.w - pbody.mass - 1 + this.loc.x;
    } else if(pbody.loc.x < pbody.mass+this.loc.x) {
      pbody.vel.multiply(new Victor(-1, 1));
      pbody.loc.x = pbody.mass + 1 + this.loc.x;
    }
    if (pbody.loc.y > this.h - pbody.mass+this.loc.y) {
      pbody.vel.multiply(new Victor(1, -1));
      pbody.loc.y = this.h - pbody.mass - 1 + this.loc.y;
    } else if(pbody.loc.y < pbody.mass+this.loc.y) {
      pbody.vel.multiply(new Victor(1, -1));
      pbody.loc.y = pbody.mass + 1 + this.loc.y;
    }
  }

  deletePlayer(id) {
    delete this.players[id];
  }

  populate(num) {
    for (let i = 0; i < num; i++) {
      const p = new Particle(Date.now() * Math.random());
      p.pbody.loc.x = 200;// this.w*Math.random();
      p.pbody.loc.y = 300;// this.h*Math.random();
      p.pbody.mass = (Math.random() * 20) + 10;
      p.pbody.collider = this.colliderType;
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
