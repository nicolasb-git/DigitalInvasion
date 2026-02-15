import { Vector } from './Utils';

export class Enemy {
    constructor(path, level = 1, type = 'standard') {
        this.path = path;
        this.gridPosIndex = 0;
        this.type = type;
        this.isBoss = type === 'boss';
        this.isResistant = type === 'resistant';
        this.isQuick = type === 'quick';

        this.pos = new Vector(path[0].x * 40 + 20, path[0].y * 40 + 20);
        this.target = new Vector(path[1].x * 40 + 20, path[1].y * 40 + 20);

        let hpMult = 1;
        let speedMult = 1;
        if (this.isBoss) {
            hpMult = 5;
            speedMult = 0.6;
            this.color = '#faff00'; // Toxic Yellow
            this.radius = 20;
            this.reward = (10 + level) * 15;
        } else if (this.isResistant) {
            hpMult = 1.5;
            speedMult = 0.8;
            this.color = '#00f2ff'; // Data Cyan
            this.radius = 15;
            this.reward = (10 + level) * 6;
        } else if (this.isQuick) {
            hpMult = 0.8;
            speedMult = 2.5;
            this.color = '#ff00ff'; // Nitro Magenta
            this.radius = 10;
            this.reward = (10 + level) * 4;
        } else {
            this.color = '#ff0000'; // Virus Red
            this.radius = 12;
            this.reward = (10 + level) * 3;
        }

        this.speed = (1 + (level * 0.2)) * speedMult;
        this.maxHealth = 40 * Math.pow(1.2, level - 1) * hpMult;
        this.health = this.maxHealth;
        this.dead = false;
        this.reachedEnd = false;
        this.glowColor = this.color + '80'; // 50% opacity
        this.slowed = false;
    }

    update() {
        if (this.dead || this.reachedEnd) return;

        const dir = this.target.sub(this.pos).normalize();
        const currentSpeed = this.slowed ? this.speed * 0.3 : this.speed;
        this.pos = this.pos.add(dir.mult(currentSpeed));

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

        // Reset slowed status at end of update. 
        // Jammer towers will re-apply it in the next tower update cycle if enemy is still in range.
        this.slowed = false;
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

        if (this.slowed) {
            // Visual indicator for being jammed/slowed
            ctx.beginPath();
            ctx.arc(this.pos.x, this.pos.y, this.radius + 2, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffd700';
            ctx.setLineDash([2, 4]);
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.setLineDash([]);
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
