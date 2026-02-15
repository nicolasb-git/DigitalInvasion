import './style.css'
import { findPath, Vector } from './game/Utils'
import { Enemy } from './game/Enemy'
import { Tower } from './game/Tower'

const TILE_SIZE = 40;
const ROWS = 15;
const COLS = 20;

class Game {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.canvas.width = COLS * TILE_SIZE;
    this.canvas.height = ROWS * TILE_SIZE;

    this.grid = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    this.start = { x: 0, y: 1 };
    this.end = { x: COLS - 1, y: ROWS - 2 };

    this.initObstacles();

    this.enemies = [];
    this.towers = [];
    this.projectiles = [];

    this.credits = 500;
    this.lives = 20;
    this.wave = 0;
    this.waveRunning = false;

    this.selectedTowerType = 'basic';
    this.selectedTower = null;
    this.currentPath = findPath(this.start, this.end, this.grid, COLS, ROWS);

    this.mouse = { x: -1, y: -1 };
    this.gameSpeed = 1;
    this.gameOver = false;
    this.isPaused = false;
    this.totalThreatsSpawned = 0;

    this.initAudio();
    this.initUI();
    this.animate();
  }

  initObstacles() {
    // Add some permanent obstacles to force a twisty path
    // Wall 1
    for (let y = 0; y < 11; y++) this.grid[y][4] = 1;
    // Wall 2
    for (let y = 4; y < ROWS; y++) this.grid[y][9] = 1;
    // Wall 3
    for (let y = 0; y < 11; y++) this.grid[y][14] = 1;
  }

  initUI() {
    document.querySelectorAll('.tower-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.deselectTower();
        document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedTowerType = btn.dataset.tower;
      });
    });

    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = Math.floor((e.clientX - rect.left) / TILE_SIZE);
      this.mouse.y = Math.floor((e.clientY - rect.top) / TILE_SIZE);
    });
    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.x = -1;
      this.mouse.y = -1;
    });

    // Wave button / Auto wave?
    setInterval(() => {
      if (!this.waveRunning && this.enemies.length === 0 && !this.gameOver) {
        this.startWave();
      }
    }, 5000);

    const speedBtn = document.getElementById('btn-speed');
    if (speedBtn) {
      speedBtn.title = "Left-click: Speed Up | Right-click: Slow Down";
      speedBtn.addEventListener('click', () => {
        this.gameSpeed = Math.min(10, this.gameSpeed + 1);
        document.getElementById('speed-label').textContent = `SPEED: x${this.gameSpeed}`;
      });
      speedBtn.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.gameSpeed = Math.max(1, this.gameSpeed - 1);
        document.getElementById('speed-label').textContent = `SPEED: x${this.gameSpeed}`;
      });
    }

    const confirmSellBtn = document.getElementById('btn-confirm-sell');
    if (confirmSellBtn) {
      confirmSellBtn.addEventListener('click', () => this.sellTower());
    }

    const closeSelBtn = document.getElementById('btn-close-sel');
    if (closeSelBtn) {
      closeSelBtn.addEventListener('click', () => this.deselectTower());
    }

    const pauseBtn = document.getElementById('btn-pause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.isPaused = !this.isPaused;
        pauseBtn.classList.toggle('active', this.isPaused);
        document.getElementById('pause-label').textContent = this.isPaused ? 'RESUME' : 'PAUSE';
        document.getElementById('pause-icon').textContent = this.isPaused ? '▶' : '⏸';
      });
    }

    const volumeSlider = document.getElementById('volume-slider');
    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        this.bgMusic.volume = val;
        this.sfxVolume = Math.min(1.0, val * 4);
      });
    }
  }

  initAudio() {
    this.bgMusic = new Audio('/ici_storm.mp3');
    this.bgMusic.loop = true;
    this.bgMusic.volume = 0.05;

    this.sfxVolume = 0.2;
    this.sfxDestroySrc = '/wave1.wav';

    // Browser policy: start music on first interaction
    const startMusic = () => {
      this.bgMusic.play().catch(e => console.log("Autoplay blocked, waiting for interaction..."));
      window.removeEventListener('click', startMusic);
      window.removeEventListener('keydown', startMusic);
    };
    window.addEventListener('click', startMusic);
    window.addEventListener('keydown', startMusic);
  }

  playSFX(src) {
    const sound = new Audio(src);
    sound.volume = this.sfxVolume;
    sound.play().catch(e => {
      console.warn("SFX playback failed:", e);
    });
  }

  handleCanvasClick(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / TILE_SIZE);
    const y = Math.floor((e.clientY - rect.top) / TILE_SIZE);

    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;

    // Check if we clicked a tower
    const clickedTower = this.towers.find(t => t.gridX === x && t.gridY === y);
    if (clickedTower) {
      this.selectTower(clickedTower);
      return;
    }

    // Deselect if clicking elsewhere
    this.deselectTower();

    if (this.grid[y][x] !== 0) return; // Already occupied (obstacle)
    if ((x === this.start.x && y === this.start.y) || (x === this.end.x && y === this.end.y)) return;

    // Check if monster is in the way
    for (const enemy of this.enemies) {
      const gridPos = Vector.toGrid(enemy.pos.x, enemy.pos.y);
      if (gridPos.x === x && gridPos.y === y) {
        this.showMessage("MONSTER IN THE WAY!");
        return;
      }
    }

    const costs = { basic: 100, fast: 250, heavy: 500, firewall: 10, jammer: 150, ram_generator: 300 };
    const cost = costs[this.selectedTowerType];

    if (this.credits < cost) return;

    if (this.selectedTowerType === 'ram_generator') {
      const ramCount = this.towers.filter(t => t.type === 'ram_generator').length;
      if (ramCount >= 5) {
        this.showMessage("RAM LIMIT REACHED (MAX 5)");
        return;
      }
    }

    // Temporarily place tower
    this.grid[y][x] = 1;

    // Check if global path still exists
    const newPath = findPath(this.start, this.end, this.grid, COLS, ROWS);
    if (!newPath) {
      this.grid[y][x] = 0;
      this.showMessage("PATH BLOCKED!");
      return;
    }

    // Check if EVERY enemy can still find a path to the end
    let allCanEscape = true;
    const enemyPaths = [];
    for (const enemy of this.enemies) {
      const gridPos = Vector.toGrid(enemy.pos.x, enemy.pos.y);
      const p = findPath(gridPos, this.end, this.grid, COLS, ROWS);
      if (!p) {
        allCanEscape = false;
        break;
      }
      enemyPaths.push({ enemy, path: p });
    }

    if (!allCanEscape) {
      this.grid[y][x] = 0;
      this.showMessage("PATH BLOCKED!");
      return;
    }

    // Success!
    this.credits -= cost;
    this.currentPath = newPath;
    this.towers.push(new Tower(x, y, this.selectedTowerType));

    // Update all enemy paths
    enemyPaths.forEach(({ enemy, path }) => enemy.setPath(path));

    this.updateUI();
  }

  selectTower(tower) {
    this.selectedTower = tower;
    document.getElementById('sel-tower-name').textContent = tower.name.toUpperCase();

    let stats = `Range: ${tower.range} | Damage: ${tower.damage}`;
    if (tower.type === 'ram_generator') {
      stats = `Yield: ${tower.damage}MB/s`;
    } else if (tower.type === 'firewall') {
      stats = 'Passive Barrier';
    } else if (tower.type === 'jammer') {
      stats = `Range: ${tower.range} | Slow: 70%`;
    }

    document.getElementById('sel-tower-stats').textContent = stats;
    document.getElementById('sel-refund').textContent = `${Math.floor(tower.cost / 2)}MB`;
    document.getElementById('selection-overlay').classList.remove('hidden');
  }

  deselectTower() {
    this.selectedTower = null;
    document.getElementById('selection-overlay').classList.add('hidden');
  }

  sellTower() {
    if (!this.selectedTower) return;

    const refund = Math.floor(this.selectedTower.cost / 2);
    this.credits += refund;

    // Remove from grid
    this.grid[this.selectedTower.gridY][this.selectedTower.gridX] = 0;

    // Remove from towers array
    this.towers = this.towers.filter(t => t !== this.selectedTower);

    // Update path (in case removing a tower opens a better path)
    this.currentPath = findPath(this.start, this.end, this.grid, COLS, ROWS);

    this.deselectTower();
    this.updateUI();
  }

  startWave() {
    this.wave++;
    this.waveRunning = true;
    this.updateUI();

    const isBossWave = this.wave % 5 === 0;
    this.showMessage(isBossWave ? `BOSS WAVE ${this.wave}` : `WAVE ${this.wave}`);

    let spawned = 0;
    const count = 5 + this.wave * 2;
    const interval = setInterval(() => {
      this.totalThreatsSpawned++;
      let type = 'standard';
      if (this.totalThreatsSpawned % 20 === 0) {
        type = 'quick';
      } else if (this.totalThreatsSpawned % 10 === 0) {
        type = 'resistant';
      }
      this.enemies.push(new Enemy(this.currentPath, this.wave, type));
      spawned++;
      if (spawned >= count) {
        clearInterval(interval);

        if (isBossWave) {
          // Spawn one boss after the regular wave (Bosses don't increment the 'every 10' rule)
          setTimeout(() => {
            this.enemies.push(new Enemy(this.currentPath, this.wave, 'boss'));
            this.playSFX(this.sfxDestroySrc);
            this.waveRunning = false;
          }, 2000);
        } else {
          this.waveRunning = false;
        }
      }
    }, 500);
  }

  updateUI() {
    document.getElementById('credits').textContent = this.credits;
    document.getElementById('wave').textContent = this.wave;
    document.getElementById('lives').textContent = this.lives;

    // Update RAM Generator button state
    const ramBtn = document.getElementById('btn-ram');
    if (ramBtn) {
      const ramCount = this.towers.filter(t => t.type === 'ram_generator').length;
      if (ramCount >= 5) {
        ramBtn.classList.add('disabled');
        // If it was selected, deselect it
        if (this.selectedTowerType === 'ram_generator') {
          this.selectedTowerType = 'basic';
          ramBtn.classList.remove('active');
          document.getElementById('btn-basic').classList.add('active');
        }
      } else {
        ramBtn.classList.remove('disabled');
      }
    }
  }

  showMessage(text, duration = 2000) {
    const el = document.getElementById('message-overlay');
    const txt = document.getElementById('message-text');
    txt.textContent = text;
    el.classList.remove('hidden');
    if (duration > 0) {
      setTimeout(() => el.classList.add('hidden'), duration);
    }
  }

  reset() {
    this.grid = Array(ROWS).fill().map(() => Array(COLS).fill(0));
    this.initObstacles();
    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.credits = 500;
    this.lives = 20;
    this.wave = 0;
    this.gameOver = false;
    this.totalThreatsSpawned = 0;
    this.currentPath = findPath(this.start, this.end, this.grid, COLS, ROWS);
    this.updateUI();
    const overlay = document.getElementById('message-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.onclick = null;
    }
  }

  drawGrid() {
    this.ctx.strokeStyle = 'rgba(0, 242, 255, 0.05)';
    this.ctx.lineWidth = 1;
    for (let i = 0; i <= COLS; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(i * TILE_SIZE, 0);
      this.ctx.lineTo(i * TILE_SIZE, this.canvas.height);
      this.ctx.stroke();
    }
    for (let i = 0; i <= ROWS; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, i * TILE_SIZE);
      this.ctx.lineTo(this.canvas.width, i * TILE_SIZE);
      this.ctx.stroke();
    }

    // Draw obstacles
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        if (this.grid[y][x] === 1) {
          const isTower = this.towers.some(t => t.gridX === x && t.gridY === y);
          if (!isTower) {
            this.ctx.fillStyle = 'rgba(0, 242, 255, 0.05)';
            this.ctx.strokeStyle = 'rgba(0, 242, 255, 0.2)';
            this.ctx.lineWidth = 1;
            const px = x * TILE_SIZE + 4;
            const py = y * TILE_SIZE + 4;
            const sz = TILE_SIZE - 8;
            this.ctx.fillRect(px, py, sz, sz);
            this.ctx.strokeRect(px, py, sz, sz);

            // Inner detail
            this.ctx.beginPath();
            this.ctx.moveTo(px + 4, py + 4);
            this.ctx.lineTo(px + sz - 4, py + sz - 4);
            this.ctx.stroke();
          }
        }
      }
    }

    // Start/End points
    this.ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
    this.ctx.fillRect(this.start.x * TILE_SIZE, this.start.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    this.ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
    this.ctx.fillRect(this.end.x * TILE_SIZE, this.end.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
  }

  drawPath() {
    if (!this.currentPath) return;

    // Draw main path ghosting
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.strokeStyle = 'rgba(0, 242, 255, 0.15)';
    this.ctx.lineWidth = 20;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.moveTo(this.currentPath[0].x * TILE_SIZE + TILE_SIZE / 2, this.currentPath[0].y * TILE_SIZE + TILE_SIZE / 2);
    for (let i = 1; i < this.currentPath.length; i++) {
      this.ctx.lineTo(this.currentPath[i].x * TILE_SIZE + TILE_SIZE / 2, this.currentPath[i].y * TILE_SIZE + TILE_SIZE / 2);
    }
    this.ctx.stroke();

    // Draw main path line
    this.ctx.beginPath();
    this.ctx.strokeStyle = 'rgba(0, 242, 255, 0.4)';
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([10, 5]);
    this.ctx.stroke();
    this.ctx.restore();
  }

  update() {
    // Update Towers
    this.towers.forEach(t => {
      const generated = t.update(this.enemies, this.projectiles);
      if (generated > 0) {
        this.credits += generated;
        this.updateUI();
      }
    });

    // Update Enemies
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.update();

      if (e.reachedEnd) {
        if (!this.gameOver) {
          const damage = e.isBoss ? 5 : 1;
          this.lives = Math.max(0, this.lives - damage);
          this.updateUI();
          if (this.lives <= 0) {
            this.lives = 0;
            this.gameOver = true;
            this.showMessage("GAME OVER - CLICK TO RESTART", 0);
            const overlay = document.getElementById('message-overlay');
            overlay.onclick = () => {
              this.reset();
            };
          }
        }
        this.enemies.splice(i, 1);
      } else if (e.dead) {
        this.credits += e.reward;
        this.enemies.splice(i, 1);
        this.updateUI();
      }
    }

    // Update Projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.update();
      if (p.dead) this.projectiles.splice(i, 1);
    }
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawGrid();
    this.drawPath();

    // Draw Towers
    this.towers.forEach(t => t.draw(this.ctx));

    // Highlight selected tower
    if (this.selectedTower) {
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.arc(this.selectedTower.pos.x, this.selectedTower.pos.y, 25, 0, Math.PI * 2);
      this.ctx.strokeStyle = '#fff';
      this.ctx.lineWidth = 2;
      this.ctx.setLineDash([5, 5]);
      this.ctx.stroke();

      // Range highlight
      this.ctx.beginPath();
      this.ctx.arc(this.selectedTower.pos.x, this.selectedTower.pos.y, this.selectedTower.range, 0, Math.PI * 2);
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      this.ctx.setLineDash([]);
      this.ctx.stroke();
      this.ctx.restore();
    }

    // Draw Enemies
    this.enemies.forEach(e => e.draw(this.ctx));

    // Draw Projectiles
    this.projectiles.forEach(p => p.draw(this.ctx));

    // Draw placement preview
    if (this.mouse.x !== -1 && this.mouse.y !== -1) {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      this.ctx.fillRect(this.mouse.x * TILE_SIZE, this.mouse.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);

      // Draw range of selected tower
      const configs = { basic: 120, fast: 150, heavy: 200, firewall: 0, jammer: 120, ram_generator: 0 };
      const range = configs[this.selectedTowerType];
      this.ctx.beginPath();
      this.ctx.arc(this.mouse.x * TILE_SIZE + TILE_SIZE / 2, this.mouse.y * TILE_SIZE + TILE_SIZE / 2, range, 0, Math.PI * 2);
      this.ctx.strokeStyle = 'rgba(0, 242, 255, 0.2)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
      this.ctx.restore();
    }
  }

  animate() {
    if (!this.isPaused) {
      for (let i = 0; i < this.gameSpeed; i++) {
        this.update();
      }
    }
    this.draw();
    requestAnimationFrame(() => this.animate());
  }
}

new Game();
