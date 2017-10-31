class Camera{
    constructor(w, h){
        this.w = w;
        this.h = h;

        this.loc = new Vector(0,0);

        this.player;
        this.dimension;
    }

    render(ctx, data){
        if(!data) return;

        this.drawBackground(ctx);
        loop(data.dimensions, (d) => {this.drawDimension(ctx, d);});
    }

    drawBackground(ctx, data){
        ctx.globalAlpha = 1;
        ctx.save();

        ctx.fillStyle = '#333';
        ctx.fillRect(0,0,this.w, this.h);

        let camLoc = this.worldToCamera(new Vector(this.loc.x, this.loc.y));
        ctx.translate(camLoc.x, camLoc.y);

        ctx.strokeStyle = '#0F0';
        ctx.strokeWidth = 5;
        ctx.strokeRect(0, 0, this.dimension.w, this.dimension.h);

        ctx.restore();
    }

    drawDimension(ctx, d){
        if(this.dimension !== d) ctx.globalAlpha = 0.1;
        else ctx.globalAlpha = 1;
        ctx.save();

        loop(d.particles, (p) => {this.drawParticle(ctx, p);});
        loop(d.players, (p) => {this.drawPlayer(ctx, p);});

        ctx.restore();
    }

    drawParticle(ctx, p){
        if(!p) return;
        ctx.save();

        if(p.pbody.collider === 'SPHERE'){
            let pLoc = this.worldToCamera(new Vector(p.pbody.loc.x, p.pbody.loc.y));
            ctx.translate(pLoc.x, pLoc.y);

            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(0,0,p.pbody.mass,0,Math.PI*2);
            ctx.fill();
            ctx.closePath();
        }

        ctx.restore();
    }

    drawPlayer(ctx, p){
        if(!p) return;
        ctx.save();

        let pLoc = this.worldToCamera(new Vector(p.pbody.loc.x, p.pbody.loc.y));
        ctx.translate(pLoc.x, pLoc.y);

        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0,0,p.pbody.mass,0,Math.PI*2);
        ctx.fill();
        ctx.closePath();

        if(this.player.id === p.id){
            ctx.strokeStyle = 'white';
            ctx.strokeWidth = 2;
            ctx.beginPath();
            ctx.arc(0,0,p.pbody.mass,0,Math.PI*2);
            ctx.stroke();
            ctx.closePath();
        }

        ctx.restore();
    }

    centerOn(pLoc){
        let loc = new Vector(pLoc.x, pLoc.y);
        this.loc.x = loc.x - this.w/2;
        this.loc.y = loc.y - this.h/2;
    }

    worldToCamera(v){
        return v.clone().subtract(this.loc);
    }

    cameraToWorld(v){
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