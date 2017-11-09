const PBody = require('./pbody.js').PBody;
const Victor = require('victor');

class Player {
  constructor(id, dimId) {
    this.id = id;
    this.dimId = dimId || 'default';

    this.pbody = new PBody();
    this.pbody.loc = new Victor(100, 100);
    this.pbody.mass = parseInt(Math.random() * 10) + 10;

    this.color = 'blue';
    this.name = global.NAMES[parseInt(Math.random()*global.NAMES.length, 10)];

    this.mouseLoc = new Victor(this.pbody.loc.x, this.pbody.loc.y);
  }

  update() {
    const dist = this.mouseLoc.distanceSq(this.pbody.loc);
    const force = this.mouseLoc.clone().subtract(this.pbody.loc).normalize();
    force.x *= 50;
    force.y *= 50;
    this.pbody.applyForce(force);
    this.pbody.move(dist / 100);
  }
}

module.exports.Player = Player;
