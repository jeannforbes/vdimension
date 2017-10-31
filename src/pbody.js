const Victor = require('victor');

const COLLIDER = {
  SPHERE: 'SPHERE',
  RECT: 'RECT',
};

class PBody {
  constructor() {
    this.loc = new Victor(0, 0);
    this.vel = new Victor(0, 0);
    this.accel = new Victor(0, 0);

    this.maxVel = 20;

    this.mass = 10;

    this.collider = COLLIDER.SPHERE;
    this.colliding = false;
  }

  applyForce(force) {
    const f = force.clone();
    f.x /= this.mass;
    f.y /= this.mass;
    this.accel.add(f);
  }

  applyFriction(friction) {
    this.vel.x *= friction;
    this.vel.y *= friction;
  }

  move(limit) {
    this.vel.add(this.accel);

    // Limit velocity
    if (this.vel.magnitude() > limit) {
      this.vel.normalize();
      this.vel.x *= limit;
      this.vel.y *= limit;
    }

    this.loc.add(this.vel);

    this.accel.x = 0;
    this.accel.y = 0;
  }

  collide(c) {
    this.isColliding(c);
    if (this.colliding) {
      const dist = this.loc.distance(c.loc);
      const force = this.loc.clone().subtract(c.loc).normalize();
      force.x *= 1000 / dist;
      force.y *= 1000 / dist;
      this.applyForce(force);
      this.colliding = false;
    }
  }

  isColliding(c) {
    if (!c) return;
    const dist = (this.loc.distance(c.loc) - this.mass - c.mass) + 10;
    if (dist < 0) this.colliding = true;
    else this.colliding = false;
  }
}

module.exports.PBody = PBody;
