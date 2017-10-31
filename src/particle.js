let PBody = require('./pbody.js').PBody;
let Victor = require('victor');

class Particle{
    constructor(id){
        this.id = id;
        this.color = 'red';

        this.phaseChance = 0.001;

        this.pbody = new PBody();
        this.pbody.maxVel = 5;
    }

    update(){
        this.pbody.move();
    }
}

module.exports.Particle = Particle;