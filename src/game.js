let Victor = require('victor');

let Dimension = require('./dimension.js').Dimension;
let Player = require('./player.js').Player;
let Particle = require('./particle.js').Particle;

class Game{
    constructor(io){
        this.io = io;

        this.dimensions = {};

        this.updateInterval = undefined;

        this.dimensions['default'] = new Dimension('default', 'a1');
        this.dimensions['a1'] = new Dimension('a1', 'a2');
        this.dimensions['a2'] = new Dimension('a2', 'a3');
        this.dimensions['a3'] = new Dimension('a3', 'a4');
        this.dimensions['a4'] = new Dimension('a4', 'default');
    }

    start(){

        this.io.on('connection', (socket) => {
            console.log(socket.id + ' joined.');
            socket.join('default');

            let newP = new Player(socket.id, 'default');
            this.dimensions[newP.dimId].players[socket.id] = newP;
            newP.color = this.dimensions[newP.dimId].color;

            socket.on('onmousemove', (data) => {
                let p = this.findPlayerById(socket.id);
                p.mouseLoc.x = data.x;
                p.mouseLoc.y = data.y;
            });

            socket.on('onscroll', (data) => {
                let d = this.findDimensionByPlayerId(socket.id);
                let p = d.players[socket.id];

                if(!d.next) return;
                socket.leave(d.id);
                socket.join(d.next);

                let newP = new Player(socket.id, d.next);
                newP.pbody.loc = p.pbody.loc.clone();
                newP.color = this.dimensions[d.next].color;
                newP.mouseLoc = p.mouseLoc;
                this.dimensions[d.next].players[socket.id] = newP;
                delete d.players[socket.id];
                console.log('swapping to '+d.next);
            });

            socket.on('disconnect', (data) => {
                let keys = Object.keys(this.dimensions);
                for(let i=0; i<keys.length; i++){
                    let d = this.dimensions[keys[i]];
                    if(d.players[socket.id]){
                        delete d.players[socket.id];
                        console.log(socket.id+' left.');
                        return true;
                    }
                }
                return false;
            });
        });

        if(!this.updateInterval)
            this.updateInterval = setInterval(this.update.bind(this), 100);
    }

    update(){
        loop(this.dimensions, (d) => {
            d.update();
            this.io.to(d.id).emit('update',{
                dimensions: this.dimensions
            });

            // Particles don't stay in just one place...
            loop(d.particles, (p) => {
                if(Math.random() < p.phaseChance){
                    let newP = new Particle(p.id);
                    newP.pbody = p.pbody;
                    newP.color = p.color;
                    newP.phaseChance = p.phaseChance;
                    delete d[p.id];
                    this.dimensions[d.next].particles[newP.id] = newP;
                    console.log(newP.id + ' PHASED');
                }
            });
        });
    }

    findPlayerById(id){
        let keys = Object.keys(this.dimensions);
        for(let i=0; i<keys.length; i++){
            let d = this.dimensions[keys[i]];
            if(d.players[id]) return d.players[id];
        }
        return false;
    }

    findDimensionByPlayerId(id){
        let keys = Object.keys(this.dimensions);
        for(let i=0; i<keys.length; i++){
            let d = this.dimensions[keys[i]];
            if(d.players[id]) return d;
        }
        return false;
    }
}

/*
 *    HELPER FUNCTIONS
 */

const loop = (map, func) => {
    if(!map) return;

    let keys = Object.keys(map);
    for(let i=0; i<keys.length; i++)
        func(map[keys[i]]);
}

module.exports.Game = Game;