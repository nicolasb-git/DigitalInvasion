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
    this.floatingTexts = [];
    this.particles = [];

    this.credits = 500;
    this.lives = 20;
    this.maxLives = 20;
    this.previousLives = 20;
    this.wave = 0;
    this.waveRunning = false;

    this.selectedTowerType = 'basic';
    this.selectedTower = null;
    this.currentPath = findPath(this.start, this.end, this.grid, COLS, ROWS);
    this.addRandomWalls(10);

    this.mouse = { x: -1, y: -1 };
    this.gameSpeed = 1;
    this.gameOver = false;
    this.isPaused = true;
    this.totalThreatsSpawned = 0;
    this.screenShake = 0;
    this.glitchFlash = 0;
    this.showPath = true;
    this.hoveredTower = null;

    this.started = false;
    this.highScores = JSON.parse(localStorage.getItem('digital_invasion_scores') || '[]');
    this.initAudio();
    this.initUI();
    this.updatePauseUI();
    this.renderLeaderboard();

    // Set dynamic versioning from Vite define
    const versionEl = document.getElementById('version-tag-info');
    if (versionEl) {
      // @ts-ignore
      const hash = typeof __COMMIT_HASH__ !== 'undefined' ? __COMMIT_HASH__ : 'LOCAL';
      console.log("System Version Initialized:", hash);
      versionEl.textContent = hash;
    }

    this.floatingTexts = [];
    this.particles = [];

    this.animate();
  }

  initObstacles() {
    // Add some permanent obstacles to force a twisty path
    for (let y = 0; y < 11; y++) this.grid[y][4] = 1; // Wall 1
    for (let y = 4; y < ROWS; y++) this.grid[y][9] = 1; // Wall 2
    for (let y = 0; y < 11; y++) this.grid[y][14] = 1; // Wall 3
  }

  addRandomWalls(count) {
    let added = 0;
    const pathSet = new Set(this.currentPath.map(p => `${p.x},${p.y}`));

    // Maximum attempts to avoid infinite loop
    let attempts = 0;
    while (added < count && attempts < 1000) {
      attempts++;
      const rx = Math.floor(Math.random() * COLS);
      const ry = Math.floor(Math.random() * ROWS);
      const key = `${rx},${ry}`;

      if (this.grid[ry][rx] === 0 &&
        !pathSet.has(key) &&
        !(rx === this.start.x && ry === this.start.y) &&
        !(rx === this.end.x && ry === this.end.y)) {
        this.grid[ry][rx] = 1;
        added++;
      }
    }
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

      // Hover Intelligence
      this.hoveredTower = this.towers.find(t =>
        Math.floor(t.pos.x / TILE_SIZE) === this.mouse.x &&
        Math.floor(t.pos.y / TILE_SIZE) === this.mouse.y
      );
    });
    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.x = -1;
      this.mouse.y = -1;
      this.hoveredTower = null;
    });

    // Wave button / Auto wave?
    setInterval(() => {
      if (this.started && !this.isPaused && !this.waveRunning && this.enemies.length === 0 && !this.gameOver) {
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

    const upgradeBtn = document.getElementById('btn-upgrade');
    if (upgradeBtn) {
      upgradeBtn.addEventListener('click', () => this.upgradeTower());
    }

    const closeSelBtn = document.getElementById('btn-close-sel');
    if (closeSelBtn) {
      closeSelBtn.addEventListener('click', () => this.deselectTower());
    }

    const pauseBtn = document.getElementById('btn-pause');
    if (pauseBtn) {
      pauseBtn.addEventListener('click', () => {
        this.isPaused = !this.isPaused;
        this.updatePauseUI();
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

    const startBtn = document.getElementById('start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.startGame();
      });
    }

    const splashManualBtn = document.getElementById('btn-splash-manual');
    if (splashManualBtn) {
      splashManualBtn.addEventListener('click', () => this.toggleManual(true));
    }

    const gameManualBtn = document.getElementById('btn-manual');
    if (gameManualBtn) {
      gameManualBtn.addEventListener('click', () => this.toggleManual(true));
    }

    const closeManualBtn = document.getElementById('btn-close-manual');
    if (closeManualBtn) {
      closeManualBtn.addEventListener('click', () => this.toggleManual(false));
    }

    const saveScoreBtn = document.getElementById('btn-save-score');
    if (saveScoreBtn) {
      saveScoreBtn.addEventListener('click', () => {
        this.saveHighScore();
      });
    }

    const playerNameInput = document.getElementById('player-name');
    if (playerNameInput) {
      playerNameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.saveHighScore();
        }
      });
    }

    const restartBtn = document.getElementById('btn-restart');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => {
        this.reset();
      });
    }

    const toSplashBtn = document.getElementById('btn-to-splash');
    if (toSplashBtn) {
      toSplashBtn.addEventListener('click', () => {
        this.backToSplash();
      });
    }

    const quitBtn = document.getElementById('btn-quit');
    if (quitBtn) {
      quitBtn.addEventListener('click', () => {
        this.backToSplash();
      });
    }

    // Close selection when clicking outside
    document.addEventListener('click', (e) => {
      if (!this.selectedTower) return;
      const card = document.querySelector('.selection-card');
      if (card && !card.contains(e.target) && !this.canvas.contains(e.target)) {
        this.deselectTower();
      }
    });

    // Strategy Hotkeys
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      const code = e.code;

      // 1-6 for tower selection (DigitX is layout independent)
      const towerCodes = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'];
      const towerTypes = ['basic', 'fast', 'heavy', 'firewall', 'jammer', 'ram_generator'];

      if (towerCodes.includes(code)) {
        const index = towerCodes.indexOf(code);
        const type = towerTypes[index];
        const btn = document.querySelector(`.tower-btn[data-tower="${type}"]`);
        if (btn && !btn.classList.contains('disabled')) {
          this.deselectTower();
          document.querySelectorAll('.tower-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          this.selectedTowerType = type;
        }
      }

      // ESC to cancel/deselect
      if (key === 'escape') {
        this.deselectTower();
      }

      // P to Pause
      if (key === 'p') {
        this.isPaused = !this.isPaused;
        this.updatePauseUI();
      }

      // G to toggle Path
      if (key === 'g') {
        this.showPath = !this.showPath;
      }
    });
  }

  startGame() {
    this.started = true;
    document.getElementById('splash-screen').classList.add('hidden');
    document.getElementById('ui-overlay').classList.add('visible');
    this.bgMusic.play().catch(e => console.log("Audio play failed:", e));
  }

  renderLeaderboard() {
    const content = document.getElementById('leaderboard-content');
    if (!content) return;

    if (this.highScores.length === 0) {
      content.innerHTML = '<div class="leaderboard-entry">NO RECORDS FOUND</div>';
      return;
    }

    content.innerHTML = this.highScores.map(score => `
      <div class="leaderboard-entry">
        <span class="entry-name">${score.name.toUpperCase()}</span>
        <span class="entry-score">WAVE ${score.wave}</span>
      </div>
    `).join('');

    // Duplicate for infinite scroll if there are enough entries
    if (this.highScores.length > 3) {
      content.innerHTML += content.innerHTML;
    }
  }

  toggleManual(show) {
    const overlay = document.getElementById('manual-overlay');
    if (show) {
      overlay.classList.remove('hidden');
      if (this.started && !this.gameOver) {
        this.isPaused = true;
        this.updatePauseUI();
      }
    } else {
      overlay.classList.add('hidden');
    }
  }

  updatePauseUI() {
    const pauseBtn = document.getElementById('btn-pause');
    if (pauseBtn) {
      pauseBtn.classList.toggle('active', this.isPaused);
      document.getElementById('pause-label').textContent = this.isPaused ? 'RESUME' : 'PAUSE';
      document.getElementById('pause-icon').textContent = this.isPaused ? '▶' : '⏸';
    }
  }

  handleGameOver() {
    this.gameOver = true;
    document.getElementById('final-wave').textContent = this.wave;
    document.getElementById('name-input-overlay').classList.remove('hidden');
  }

  saveHighScore() {
    const nameInput = document.getElementById('player-name');
    const name = nameInput.value.trim() || 'UNKNOWN';

    this.highScores.push({ name, wave: this.wave, date: Date.now() });
    this.highScores.sort((a, b) => b.wave - a.wave);
    this.highScores = this.highScores.slice(0, 10);

    localStorage.setItem('digital_invasion_scores', JSON.stringify(this.highScores));

    document.getElementById('name-input-overlay').classList.add('hidden');
    this.renderLeaderboard();

    document.getElementById('game-over-wave').textContent = this.wave;
    document.getElementById('game-over-overlay').classList.remove('hidden');
  }

  backToSplash() {
    this.reset();
    this.started = false;
    document.getElementById('splash-screen').classList.remove('hidden');
    document.getElementById('ui-overlay').classList.remove('visible');
  }

  initAudio() {
    this.bgMusic = new Audio('/ici_storm.mp3');
    this.bgMusic.loop = true;
    this.bgMusic.volume = 0.05;

    this.sfxVolume = 0.2;
    this.sfxDestroySrc = '/wave1.wav';

    // Start background music on first interaction (browser policy)
    const startMusic = () => {
      if (this.bgMusic.paused) {
        this.bgMusic.play().catch(e => console.log("Autoplay blocked:", e));
      }
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
    document.getElementById('sel-tower-name').textContent = `${tower.name.toUpperCase()} (LVL ${tower.level})`;

    let stats = `Range: ${tower.range} | Damage: ${tower.damage}`;
    if (tower.type === 'ram_generator') {
      stats = `Yield: ${tower.damage}MB/s`;
    } else if (tower.type === 'firewall') {
      stats = 'Passive Barrier';
    } else if (tower.type === 'jammer') {
      stats = `Range: ${tower.range} | Slow: 50%`;
    }

    document.getElementById('sel-tower-stats').textContent = stats;
    document.getElementById('sel-refund').textContent = `${Math.floor(tower.cost / 2)}MB`;

    const upgradeBtn = document.getElementById('btn-upgrade');
    if (tower.isUpgradable() && tower.level < 3) {
      upgradeBtn.classList.remove('hidden');
      document.getElementById('upgrade-cost').textContent = tower.getUpgradeCost();
    } else {
      upgradeBtn.classList.add('hidden');
    }

    this.updateUI(); // Ensure button states are correct
    document.getElementById('selection-overlay').classList.remove('hidden');
  }

  upgradeTower() {
    if (!this.selectedTower) return;
    const cost = this.selectedTower.getUpgradeCost();
    if (this.credits >= cost) {
      if (this.selectedTower.upgrade()) {
        this.credits -= cost;
        this.selectTower(this.selectedTower); // Refresh UI
        this.updateUI();
      }
    }
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

    const spawnOne = () => {
      this.totalThreatsSpawned++;
      let type = 'standard';
      if (this.totalThreatsSpawned % 15 === 0) {
        type = 'fragmenter';
      } else if (this.totalThreatsSpawned % 10 === 0) {
        type = 'quick';
      } else if (this.totalThreatsSpawned % 5 === 0) {
        type = 'resistant';
      }
      this.enemies.push(new Enemy(this.currentPath, this.wave, type));
      spawned++;
    };

    spawnOne(); // Spawn first enemy immediately

    if (this.spawnerInterval) clearInterval(this.spawnerInterval);
    this.spawnerInterval = setInterval(() => {
      if (this.isPaused) return;
      if (spawned >= count) {
        clearInterval(this.spawnerInterval);
        this.spawnerInterval = null;
        if (isBossWave) {
          if (this.bossTimeout) clearTimeout(this.bossTimeout);
          this.bossTimeout = setTimeout(() => {
            if (this.started) { // Ensure game hasn't been reset
              this.enemies.push(new Enemy(this.currentPath, this.wave, 'boss'));
              this.playSFX(this.sfxDestroySrc);
            }
            this.waveRunning = false;
            this.bossTimeout = null;
          }, 2000);
        } else {
          this.waveRunning = false;
        }
        return;
      }
      spawnOne();
    }, 500);
  }

  updateUI() {
    document.getElementById('credits').textContent = this.credits;
    document.getElementById('wave').textContent = this.wave;
    document.getElementById('lives').textContent = this.lives;

    // Update Integrity Bar
    const barFill = document.getElementById('integrity-bar-fill');
    if (barFill) {
      const healthPercent = (this.lives / this.maxLives) * 100;
      barFill.style.width = `${healthPercent}%`;

      // Trigger glitch on damage
      if (this.lives < this.previousLives) {
        barFill.classList.add('glitch');
        setTimeout(() => barFill.classList.remove('glitch'), 300);
      }
      this.previousLives = this.lives;

      // Manage color states
      barFill.classList.toggle('warning', healthPercent <= 60 && healthPercent > 25);
      barFill.classList.toggle('danger', healthPercent <= 25);
    }

    // Update Tower Purchase Buttons
    const costs = { basic: 100, fast: 250, heavy: 500, firewall: 10, jammer: 150, ram_generator: 300 };
    const ramCount = this.towers.filter(t => t.type === 'ram_generator').length;

    Object.keys(costs).forEach(type => {
      const btn = document.querySelector(`.tower-btn[data-tower="${type}"]`);
      if (!btn) return;

      const cost = costs[type];
      const isTooExpensive = this.credits < cost;
      const isLimitReached = type === 'ram_generator' && ramCount >= 5;

      if (isTooExpensive || isLimitReached) {
        btn.classList.add('disabled');
        btn.classList.toggle('limited', isLimitReached);
        if (isLimitReached && this.selectedTowerType === type) {
          // Switch priority if current selection becomes limited
          this.selectedTowerType = 'basic';
          btn.classList.remove('active');
          document.getElementById('btn-basic').classList.add('active');
        }
      } else {
        btn.classList.remove('disabled');
        btn.classList.remove('limited');
      }
    });

    // Update Upgrade Button in Selection Popup
    if (this.selectedTower) {
      const tower = this.selectedTower;
      const upgradeBtn = document.getElementById('btn-upgrade');
      if (tower.isUpgradable() && tower.level < 3) {
        const upgradeCost = tower.getUpgradeCost();
        if (this.credits < upgradeCost) {
          upgradeBtn.classList.add('disabled');
        } else {
          upgradeBtn.classList.remove('disabled');
        }
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
    if (this.spawnerInterval) clearInterval(this.spawnerInterval);
    if (this.bossTimeout) clearTimeout(this.bossTimeout);
    this.spawnerInterval = null;
    this.bossTimeout = null;

    this.enemies = [];
    this.towers = [];
    this.projectiles = [];
    this.floatingTexts = [];
    this.particles = [];
    this.credits = 500;
    this.lives = 20;
    this.maxLives = 20;
    this.previousLives = 20;
    this.wave = 0;
    this.gameOver = false;
    this.isPaused = true;
    this.updatePauseUI();
    this.totalThreatsSpawned = 0;
    this.screenShake = 0;
    this.glitchFlash = 0;
    this.currentPath = findPath(this.start, this.end, this.grid, COLS, ROWS);
    this.addRandomWalls(10);
    this.floatingTexts = [];
    this.particles = [];
    this.updateUI();
    const overlay = document.getElementById('message-overlay');
    if (overlay) {
      overlay.classList.add('hidden');
      overlay.onclick = null;
    }
    const gameOverOverlay = document.getElementById('game-over-overlay');
    if (gameOverOverlay) {
      gameOverOverlay.classList.add('hidden');
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
    if (!this.currentPath || !this.showPath) return;

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
        this.floatingTexts.push({
          x: t.pos.x,
          y: t.pos.y - 20,
          text: `+${generated}MB`,
          life: 60,
          color: '#ffffff'
        });
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
          this.screenShake = 15;
          this.glitchFlash = 10;
          this.updateUI();
          if (this.lives <= 0) {
            this.lives = 0;
            this.handleGameOver();
          }
        }
        this.enemies.splice(i, 1);
      } else if (e.dead) {
        this.credits += e.reward;
        this.floatingTexts.push({
          x: e.pos.x,
          y: e.pos.y,
          text: `+${e.reward}MB`,
          life: 60,
          color: '#ffffff'
        });

        // Special logic for Fragmenter split
        if (e.isFragmenter) {
          for (let j = 0; j < 3; j++) {
            const fragment = new Enemy(e.path, this.wave, 'fragment');
            // Start from current position and target
            fragment.pos = new Vector(e.pos.x + (Math.random() - 0.5) * 10, e.pos.y + (Math.random() - 0.5) * 10);
            fragment.gridPosIndex = e.gridPosIndex;
            fragment.target = new Vector(e.target.x, e.target.y);
            this.enemies.push(fragment);
          }
        }

        // Spawn Digital Debris
        const pCount = e.isBoss ? 30 : 12;
        for (let j = 0; j < pCount; j++) {
          this.particles.push({
            x: e.pos.x,
            y: e.pos.y,
            vx: (Math.random() - 0.5) * 4,
            vy: (Math.random() - 0.5) * 4,
            size: Math.random() * 4 + 2,
            life: 40 + Math.random() * 20,
            color: e.color
          });
        }

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
    this.ctx.save();
    if (this.screenShake > 0) {
      const sx = (Math.random() - 0.5) * this.screenShake;
      const sy = (Math.random() - 0.5) * this.screenShake;
      this.ctx.translate(sx, sy);
    }

    this.ctx.clearRect(-20, -20, this.canvas.width + 40, this.canvas.height + 40);

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

    // Draw Floating Texts
    this.floatingTexts.forEach(ft => {
      this.ctx.save();
      const scale = 1 + (Math.sin(ft.life * 0.2) * 0.2);
      this.ctx.translate(ft.x, ft.y);
      this.ctx.scale(scale, scale);
      this.ctx.font = 'bold 20px Orbitron';
      this.ctx.fillStyle = ft.color;
      this.ctx.globalAlpha = Math.min(1, ft.life / 20); // Longer visible alpha
      this.ctx.textAlign = 'center';
      this.ctx.shadowBlur = 10;
      this.ctx.shadowColor = ft.color;
      this.ctx.fillText(ft.text, 0, 0);
      this.ctx.restore();
    });

    // Draw Particles
    this.particles.forEach(p => {
      this.ctx.save();
      this.ctx.fillStyle = p.color;
      this.ctx.globalAlpha = p.life / 60;
      this.ctx.shadowBlur = 5;
      this.ctx.shadowColor = p.color;
      this.ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      this.ctx.restore();
    });

    // Draw placement preview
    if (this.mouse.x !== -1 && this.mouse.y !== -1) {
      this.ctx.save();

      if (this.hoveredTower) {
        // Draw range of hovered tower
        this.ctx.beginPath();
        this.ctx.arc(this.hoveredTower.pos.x, this.hoveredTower.pos.y, this.hoveredTower.range, 0, Math.PI * 2);
        this.ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
        this.ctx.setLineDash([5, 5]);
        this.ctx.stroke();
        this.ctx.restore();

        this.ctx.save();
        // Draw simple hover info
        this.ctx.font = '10px Orbitron';
        this.ctx.fillStyle = '#fff';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`${this.hoveredTower.type.toUpperCase()} LVL:${this.hoveredTower.level}`, this.hoveredTower.pos.x, this.hoveredTower.pos.y - 30);
      } else {
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
      }
      this.ctx.restore();
    }

    if (this.glitchFlash > 0) {
      this.ctx.fillStyle = `rgba(255, 0, 0, ${this.glitchFlash * 0.03})`;
      this.ctx.fillRect(-20, -20, this.canvas.width + 40, this.canvas.height + 40);
    }

    this.ctx.restore();
  }

  animate() {
    if (!this.isPaused && this.started) {
      for (let i = 0; i < this.gameSpeed; i++) {
        this.update();
      }
    }
    if (this.started) {
      this.updateVisuals();
    }
    this.draw();
    requestAnimationFrame(() => this.animate());
  }

  updateVisuals() {
    // Update Floating Texts
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      const ft = this.floatingTexts[i];
      ft.y -= 1.2; // Move faster
      ft.life -= 1;
      if (ft.life <= 0) this.floatingTexts.splice(i, 1);
    }

    if (this.screenShake > 0) this.screenShake--;
    if (this.glitchFlash > 0) this.glitchFlash--;

    // Update Particles
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.95; // Friction
      p.vy *= 0.95;
      p.life -= 1;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }
}

new Game();
