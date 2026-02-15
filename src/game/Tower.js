import { Vector } from './Utils';

export class Projectile {
    constructor(pos, target, damage, speed, color) {
        this.pos = pos;
        this.targetInstance = target;
        this.damage = damage;
        this.speed = speed;
        this.color = color;
        this.dead = false;
        this.radius = 4;
    }

    update() {
        if (this.targetInstance.dead) {
            this.dead = true;
            return;
        }

        const dir = this.targetInstance.pos.sub(this.pos).normalize();
        this.pos = this.pos.add(dir.mult(this.speed));

        if (this.pos.dist(this.targetInstance.pos) < this.speed) {
            this.targetInstance.takeDamage(this.damage);
            this.dead = true;
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.shadowBlur = 8;
        ctx.shadowColor = this.color;
        ctx.fill();
        ctx.restore();
    }
}

export class Tower {
    constructor(gridX, gridY, type = 'basic') {
        this.gridX = gridX;
        this.gridY = gridY;
        this.pos = new Vector(gridX * 40 + 20, gridY * 40 + 20);
        this.type = type;

        const configs = {
            basic: { range: 120, damage: 5, cooldown: 30, cost: 100, color: '#00ff41', bulletSpeed: 10 },
            fast: { range: 150, damage: 4, cooldown: 10, cost: 250, color: '#bf00ff', bulletSpeed: 16 },
            heavy: { range: 200, damage: 70, cooldown: 80, cost: 500, color: '#ff0000', bulletSpeed: 8 }
        };

        const config = configs[type];
        this.range = config.range;
        this.damage = config.damage;
        this.cost = config.cost;
        this.name = type === 'basic' ? 'Packet Filter' : type === 'fast' ? 'Scan Decryptor' : 'Logic Bomb';
        this.cooldownMax = config.cooldown;
        this.cooldown = 0;
        this.color = config.color;
        this.bulletSpeed = config.bulletSpeed;
    }

    update(enemies, projectiles) {
        if (this.cooldown > 0) this.cooldown--;

        if (this.cooldown === 0) {
            let nearest = null;
            let minDist = Infinity;

            for (const enemy of enemies) {
                const d = this.pos.dist(enemy.pos);
                if (d < this.range && d < minDist) {
                    minDist = d;
                    nearest = enemy;
                }
            }

            if (nearest) {
                projectiles.push(new Projectile(
                    new Vector(this.pos.x, this.pos.y),
                    nearest,
                    this.damage,
                    this.bulletSpeed,
                    this.color
                ));
                this.cooldown = this.cooldownMax;
            }
        }
    }

    draw(ctx) {
        ctx.save();

        // Draw range (subtle)
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.range, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.stroke();

        // Draw tower body
        ctx.beginPath();
        if (this.type === 'basic') {
            ctx.rect(this.pos.x - 15, this.pos.y - 15, 30, 30);
        } else if (this.type === 'fast') {
            ctx.moveTo(this.pos.x, this.pos.y - 18);
            ctx.lineTo(this.pos.x + 18, this.pos.y + 12);
            ctx.lineTo(this.pos.x - 18, this.pos.y + 12);
            ctx.closePath();
        } else {
            // Heavy: Diamond
            ctx.moveTo(this.pos.x, this.pos.y - 20);
            ctx.lineTo(this.pos.x + 20, this.pos.y);
            ctx.lineTo(this.pos.x, this.pos.y + 20);
            ctx.lineTo(this.pos.x - 20, this.pos.y);
            ctx.closePath();
        }

        ctx.fillStyle = this.color;
        ctx.shadowBlur = 15;
        ctx.shadowColor = this.color;
        ctx.fill();

        // Inner core
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();

        ctx.restore();
    }
}
