class Camera{
    constructor(w, h){
        this.w = w;
        this.h = h;

        this.loc = new Vector(0,0);

        this.player;
        this.dimension;

        this.data = data;
        this.newData = newData;

        this.flashPlayerColor;
        this.centering = false;
        this.scale = 0.5;

        this.moving = {
            up   : false,
            down : false,
            left : false,
            right: false
        };
    }

    render(ctx, data, newData){
        this.data = data;
        this.newData = newData;
        if(!this.data || !this.newData) return;

        ctx.save();

        if(this.centering)
            this.centerOn(new Vector(this.player.pbody.loc.x, this.player.pbody.loc.y));

        this.drawBackground(ctx);
        this.drawDimension(ctx, this.dimension);
        this.drawDimension(ctx, this.data.dimensions[this.dimension.next]);

        ctx.restore();
    }

    drawBackground(ctx, data, newData){
        ctx.globalAlpha = 1;
        ctx.save();

        ctx.fillStyle = '#333';
        ctx.fillRect(0,0,this.w, this.h);

        ctx.restore();
    }

    drawDimension(ctx, d, newD){
        if(this.dimension !== d) ctx.globalAlpha = 0.1;
        else ctx.globalAlpha = 1;
        ctx.save();

        let relLoc = this.worldToCameraNoScale(new Vector(d.loc.x, d.loc.y));
        ctx.scale(this.scale, this.scale);
        ctx.translate(relLoc.x, relLoc.y);

        ctx.save();
        ctx.fillStyle = d.color;
        if(d === this.dimension){
            ctx.lineWidth = 5;
            ctx.strokeStyle = d.color;
            ctx.strokeRect(0,0,d.w,d.h);
            ctx.globalAlpha = 0.2;
        }
        else ctx.globalAlpha = 0.1;
        ctx.fillRect(0, 0, d.w, d.h);
        ctx.restore();

        ctx.translate(-relLoc.x, -relLoc.y);
        loop(d.particles, (p) => {this.drawParticle(ctx, p);});
        loop(d.players, (p) => {this.drawParticle(ctx, p);});

        ctx.restore();
    }

    drawParticle(ctx, p){
        if(!p) return;

        ctx.save();

        let pLoc = this.worldToCameraNoScale(new Vector(p.pbody.loc.x, p.pbody.loc.y));
        ctx.translate(pLoc.x, pLoc.y);

        switch(p.pbody.collider){
            case "SPHERE":
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(0,0,p.pbody.mass,0,Math.PI*2);
            ctx.fill();
            ctx.closePath();
            break;
            case "RECT":
            ctx.fillStyle = p.color;
            ctx.fillRect(0,0,p.pbody.mass*2,p.pbody.mass*2);
            break;
            default:
            break;
        }
        // Outline your player for visibility
        if(this.player.id === p.id && p.pbody.collider === 'SPHERE'){
            ctx.strokeStyle = (this.flashPlayerColor) ? this.flashPlayerColor : 'white';
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0,0,p.pbody.mass+5,0,Math.PI*2);
            ctx.stroke();
            ctx.closePath();
        } else if(this.player.id === p.id){
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 4;
            ctx.strokeRect(-3,-3,p.pbody.mass*2+6,p.pbody.mass*2+6);
            ctx.closePath();
        }
        ctx.restore();
    }

    drawDebug(ctx){
        ctx.save();
        ctx.restore();
    }

    centerOn(pLoc){
        let loc = pLoc.clone();
        this.loc.x = loc.x - this.w/(2 * this.scale);
        this.loc.y = loc.y - this.h/(2 * this.scale);
    }

    worldToCamera(v){
        let camLoc = v.clone().subtract(this.loc);
        camLoc.x *= this.scale;
        camLoc.y *= this.scale;
        return camLoc;
    }

    worldToCameraNoScale(v){
        return v.clone().subtract(this.loc);
    }

    cameraToWorld(v){
        let camLoc = v.clone();
        camLoc.x /= this.scale;
        camLoc.y /= this.scale;
        camLoc.add(this.loc);
        return camLoc;
    }

    cameraToWorldNoScale(v){
        return v.clone().add(this.loc);
    }

}

class Vector{
    constructor(x,y){
        this.x = x;
        this.y = y;
    }

    add(v){
        this.x += v.x;
        this.y += v.y;
        return this;
    }

    subtract(v){
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }

    distance(v){
        return Math.sqrt(Math.pow(this.x-v.x,2) + (this.y-v.y,2));
    }

    magnitude(){
        return Math.sqrt(this.x*this.x + this.y*this.y);
    }

    normalize(){
        let m = this.magnitude();
        if(m != 0){
            this.x /= m;
            this.y /= m;
        }
        return this;
    }

    clone(){
        return new Vector(this.x, this.y);
    }

}

/*
 *    HELPER FUNCTIONS
 */

const loop = (map, func) => {
    if(!map) return;
    let keys = Object.keys(map);
    for(let i=0; i<keys.length; i++){
        func(map[keys[i]]);
    }
};

const lerp = (current, target, frac) => {
    let cToT = target.clone().subtract(current);
    cToT.x *= frac;
    cToT.y *= frac;
    return cToT;
}

const findPlayerById = (id) => {
    if(!data) return;
    let keys = Object.keys(data.dimensions);
    for(let i=0; i<keys.length; i++){
        let d = data.dimensions[keys[i]];
        if(d.players[id]) return d.players[id];
    }
    return false;
}

const findDimensionById = (id) => {
    if(!data) return;
    let keys = Object.keys(data.dimensions);
    for(let i=0; i<keys.length; i++){
        let d = data.dimensions[keys[i]];
        if(d.players[id]) return d;
    }
    return false;
}