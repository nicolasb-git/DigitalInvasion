export class Vector {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(v) {
        return new Vector(this.x + v.x, this.y + v.y);
    }

    sub(v) {
        return new Vector(this.x - v.x, this.y - v.y);
    }

    dist(v) {
        return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2);
    }

    normalize() {
        const d = Math.sqrt(this.x ** 2 + this.y ** 2);
        if (d === 0) return new Vector(0, 0);
        return new Vector(this.x / d, this.y / d);
    }

    mult(n) {
        return new Vector(this.x * n, this.y * n);
    }

    static fromGrid(x, y, tileSize = 40) {
        return new Vector(x * tileSize + tileSize / 2, y * tileSize + tileSize / 2);
    }

    static toGrid(x, y, tileSize = 40) {
        return {
            x: Math.floor(x / tileSize),
            y: Math.floor(y / tileSize)
        };
    }
}

export function findPath(start, end, grid, width, height) {
    const openSet = [start];
    const cameFrom = new Map();
    const gScore = new Map();
    const fScore = new Map();

    const key = (p) => `${p.x},${p.y}`;

    gScore.set(key(start), 0);
    fScore.set(key(start), heuristic(start, end));

    while (openSet.length > 0) {
        // Sort by fScore
        openSet.sort((a, b) => (fScore.get(key(a)) ?? Infinity) - (fScore.get(key(b)) ?? Infinity));
        const current = openSet.shift();

        if (current.x === end.x && current.y === end.y) {
            return reconstructPath(cameFrom, current);
        }

        const neighbors = [
            { x: current.x + 1, y: current.y },
            { x: current.x - 1, y: current.y },
            { x: current.x, y: current.y + 1 },
            { x: current.x, y: current.y - 1 }
        ];

        for (const neighbor of neighbors) {
            if (neighbor.x < 0 || neighbor.x >= width || neighbor.y < 0 || neighbor.y >= height) continue;
            if (grid[neighbor.y][neighbor.x] === 1) continue; // Wall/Tower

            const tentativeGScore = (gScore.get(key(current)) ?? Infinity) + 1;

            if (tentativeGScore < (gScore.get(key(neighbor)) ?? Infinity)) {
                cameFrom.set(key(neighbor), current);
                gScore.set(key(neighbor), tentativeGScore);
                fScore.set(key(neighbor), tentativeGScore + heuristic(neighbor, end));
                if (!openSet.some(p => p.x === neighbor.x && p.y === neighbor.y)) {
                    openSet.push(neighbor);
                }
            }
        }
    }

    return null; // No path found
}

function heuristic(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function reconstructPath(cameFrom, current) {
    const path = [current];
    const key = (p) => `${p.x},${p.y}`;
    while (cameFrom.has(key(current))) {
        current = cameFrom.get(key(current));
        path.unshift(current);
    }
    return path;
}
