const PBody = require('./pbody.js').PBody;

class Particle {
  constructor(id) {
    this.id = id;
    this.color = 'red';

    this.phaseChance = 0.005;

    this.pbody = new PBody();
    this.pbody.maxVel = 5;
  }

  update() {
    this.pbody.move();
  }
}

module.exports.Particle = Particle;
