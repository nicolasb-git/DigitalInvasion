import { Vector } from './Utils';

export class Enemy {
    constructor(path, level = 1, isBoss = false) {
        this.path = path; // Array of {x, y} in grid coords
        this.gridPosIndex = 0;
        this.isBoss = isBoss;

        // Convert first path point to world coords (assuming 40px tiles)
        this.pos = new Vector(path[0].x * 40 + 20, path[0].y * 40 + 20);
        this.target = new Vector(path[1].x * 40 + 20, path[1].y * 40 + 20);

        this.speed = (1 + (level * 0.2)) * (isBoss ? 0.6 : 1);
        this.maxHealth = 20 * Math.pow(1.2, level - 1) * (isBoss ? 6 : 1);
        this.health = this.maxHealth;
        this.radius = isBoss ? 20 : 12;
        this.reward = (10 + level) * (isBoss ? 5 : 1);
        this.dead = false;
        this.reachedEnd = false;

        this.color = isBoss ? '#faff00' : '#ff0000'; // Toxic Yellow boss, Virus Red common
        this.glowColor = isBoss ? 'rgba(250, 255, 0, 0.5)' : 'rgba(255, 0, 0, 0.5)';
    }

    update() {
        if (this.dead || this.reachedEnd) return;

        const dir = this.target.sub(this.pos).normalize();
        this.pos = this.pos.add(dir.mult(this.speed));

        if (this.pos.dist(this.target) < this.speed) {
            this.gridPosIndex++;
            if (this.gridPosIndex < this.path.length - 1) {
                this.target = new Vector(
                    this.path[this.gridPosIndex + 1].x * 40 + 20,
                    this.path[this.gridPosIndex + 1].y * 40 + 20
                );
            } else {
                this.reachedEnd = true;
            }
        }
    }

    setPath(newPath) {
        this.path = newPath;
        this.gridPosIndex = 0;
        // Find the index in our new path that is closest to our current position
        let closestIndex = 0;
        let minDist = Infinity;
        for (let i = 0; i < newPath.length; i++) {
            const nodePos = Vector.fromGrid(newPath[i].x, newPath[i].y);
            const d = this.pos.dist(nodePos);
            if (d < minDist) {
                minDist = d;
                closestIndex = i;
            }
        }
        this.gridPosIndex = closestIndex;
        if (this.gridPosIndex < newPath.length - 1) {
            this.target = Vector.fromGrid(newPath[this.gridPosIndex + 1].x, newPath[this.gridPosIndex + 1].y);
        } else {
            this.reachedEnd = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = this.isBoss ? 20 : 10;
        ctx.shadowColor = this.glowColor;
        ctx.fill();

        if (this.isBoss) {
            // Boss extra detail
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.radius * 0.6, 0, Math.PI * 2);
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
        }

        // Health bar
        const barWidth = this.isBoss ? 40 : 20;
        const barHeight = this.isBoss ? 6 : 4;
        ctx.fillStyle = '#333';
        ctx.fillRect(this.pos.x - barWidth / 2, this.pos.y - (this.isBoss ? 30 : 20), barWidth, barHeight);
        ctx.fillStyle = this.isBoss ? '#ffa500' : '#00ff00';
        ctx.fillRect(this.pos.x - barWidth / 2, this.pos.y - (this.isBoss ? 30 : 20), barWidth * (this.health / this.maxHealth), barHeight);

        ctx.restore();
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.dead = true;
        }
    }
}
