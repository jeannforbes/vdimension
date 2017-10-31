let PBody = require('./pbody.js').PBody;
let Victor = require('victor');

class Player{
    constructor(id, dimId){
        this.id = id;
        this.dimId = dimId || 'default';

        this.pbody = new PBody();
        this.pbody.loc = new Victor(100,100);

        this.color = 'blue';

        this.mouseLoc = new Victor(this.pbody.loc.x, this.pbody.loc.y);
    }

    update(){
        let dist = this.mouseLoc.distanceSq(this.pbody.loc);
        let force = this.mouseLoc.clone().subtract(this.pbody.loc).normalize();
        force.x *= 50;
        force.y *= 50;
        this.pbody.applyForce(force);
        this.pbody.move(dist/100);
    }
}

module.exports.Player = Player;