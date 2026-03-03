# 🛡️ Digital Invasion: Threats Control

Digital Invasion is a premium, high-stakes Tower Defense game with a cyber-security aesthetic. Defend your system integrity against waves of malicious threats by deploying specialized security modules (towers) and managing your system memory (credits).

---

## 🚀 Tech Stack & Setup

### Requirements
- **Node.js** (v16+)
- **NPM**

### Local Development
1. **Clone the repository** (or navigate to the folder)
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Run in development mode**:
   ```bash
   npm run dev
   ```
4. **Build for production**:
   ```bash
   npm run build
   ```

### Project Structure
- `index.html`: Entry point & UI Overlay.
- `src/main.js`: Core game engine, wave management, and UI logic.
- `src/style.css`: Cyberpunk visual theme, animations, and scanline effects.
- `src/game/Tower.js`: Tower classes, projectile physics, and upgrade logic.
- `src/game/Enemy.js`: AI behavior, path following, and threat types.
- `src/game/Utils.js`: A* Pathfinding and Vector math.

---

## 🛠️ Security Modules (Towers)

| Module | Type | Cost (Base) | Special Ability |
| :--- | :--- | :--- | :--- |
| **⬢ Packet Filter** | Combat | 100MB | Reliable, balanced damage filtering. |
| **✦ Scan Decryptor** | Combat | 250MB | High-frequency analysis (Fast attack speed). |
| **◆ Logic Bomb** | Combat | 500MB | Heavy computational impact (Massive Damage). |
| **■ Firewall** | Utility | 10MB | Permanent physical path blocker. |
| **📡 Jammer** | Utility | 150MB | Emits signal interference (50% Slow radius). |
| **📟 RAM Gen** | Economy | 300MB | Generates passive Memory. (Max 5 units). |

### 🆙 Upgrade System
Combat modules (**Packet Filter, Scan Decryptor, Logic Bomb**) can be upgraded twice:
- **Level 2**: Costs **2x** base price. Increases damage by **+50%**.
- **Level 3**: Costs **3x** Level 2 price (**6x** base). Increases damage by another **+50%**.
- *Note: Upgrading is space-efficient but not cost-efficient. Use it when the grid is full!*

---

## 👾 Threat Profiles (Enemies)

- **Virus Red (Standard)**: Basic entry-level malicious code.
- **Data Cyan (Resistant)**: Encrypted threats with high integrity (HP) and lower speed.
- **Nitro Magenta (Quick)**: Rapid-fire script kits. Hard to track, low HP.
- **Toxic Yellow (Boss)**: Massive system-wide breaches. High HP, deals 5x damage to integrity. Spawns every 5 waves.

---

### 🗺️ Dynamic Path Management (Mazing)
Unlike traditional tower defense games with fixed lanes, Digital Invasion allows you to **sculpt the battlefield** in real-time.

- **Dynamic Routing**: Threats always calculate the shortest possible path from their current position to the system exit. By placing a tower (any type) on their current path, you force the system to recalculate a new, longer route.
- **Mazing Strategy**: Use inexpensive **Firewalls** to build complex "snake" patterns. The longer you make the path, the more time your combat modules have to neutralize the threats.
- **The Protocol Rule**: You are forbidden from completely sealing off the exit. If a tower placement would leave no possible route for existing or future threats, the system will trigger a **"PATH BLOCKED!"** alert and prevent the deployment.
- **Enemy Recalculation**: When a path is modified, every active threat on the grid will instantly scan for the new shortest route and adjust their movement accordingly.

### 🎮 How to Play
1. **Deployment**: Click a module in the toolbar, then click an empty cell on the grid to deploy.
2. **Path Selection**: Use the grid to determine where enemies will walk. The highlighted ghost-path shows the current route threats will take.
3. **Maintenance**: Click a deployed tower to open the **Selection Card**. From here, you can **Upgrade** the module or **Sell** it for 50% of the total investment.
4. **Economy**: Earn Memory (MB) by destroying threats or using RAM Generators.
5. **Speed Control**: Use the speed buttons (⏩/⏸) to manage the pace. Left-click to speed up, Right-click to slow down.
6. **Keyboard Hotkeys**: Use keys `1-6` for tower selection, `P` for Pause, `G` for Ghost Path, and `ESC` for Cancel.

### Pro Tips
- **Mazing**: Force enemies to walk through the longest possible path to maximize your towers' uptime.
- **Placement**: Place Jammers near groups of Logic Bombs to keep enemies in the high-damage zone longer.
- **Memory Management**: Don't hoard Memory. Waves get progressively stronger; an idle balance is wasted defense.
- **Deselection**: Click anywhere outside the selection card or press the "Cancel" button to close the tower popup.

---

## 📜 High Scores
The system tracks Top Operatives locally. Reach the highest wave possible to secure your spot in the **Leaderboard**.

---
*Digital Invasion - Protected by Advanced Threat Control Algorithms.*
