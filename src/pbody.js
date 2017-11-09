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

    this.maxVel = 50;

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

  // Push objects away from each other on collision
  collide(cbody) {
    if(this.colliding){
      const dist = this.loc.distance(cbody.loc);
      const force = this.loc.clone().subtract(cbody.loc).normalize();
      force.x *= 1000 / dist;
      force.y *= 1000 / dist;
      this.applyForce(force);
    }
    this.colliding = false;
  }

  // Check for collision between rects
  collideRectvRect(cbody, cb){
    let colX = false;
    let colY = false;
    if(this.loc.x < cbody.loc.x && 
      (this.loc.x + this.mass) > (cbody.loc.x - this.mass))
      colX = true;
    else if(this.loc.x > cbody.loc.x && 
           (this.loc.x - this.mass) < (cbody.loc.x + this.mass))
      colX = true;
    if(this.loc.y < cbody.loc.y && 
      (this.loc.y + this.mass) > (cbody.loc.y - this.mass))
      colY = true;
    else if(this.loc.y > cbody.loc.y && 
           (this.loc.y - this.mass) < (cbody.loc.y + this.mass))
      colY = true;
    if(colY && colX) {
      this.colliding = true;
      if(cb) cb();
    }
    else this.colliding = false;
  }

  // Check for collision between spheres
  collideSpherevSphere(cbody, cb){
    const dist = this.loc.distance(cbody.loc);
    if(dist < this.mass + cbody.mass){
      this.colliding = true;
      if(cb) cb();
    }
    else this.colliding = false;
  }

  // Are we colliding?
  isColliding(cbody, cb) {
    if(this.collider === COLLIDER.SPHERE)
      this.collideSpherevSphere(cbody, cb);
    else if(this.collider === COLLIDER.RECT)
      this.collideRectvRect(cbody, cb);
  }
}

module.exports.PBody = PBody;
