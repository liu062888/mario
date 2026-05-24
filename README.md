# Web Mario – Assignment 02

A Mario-style platformer built with **Cocos Creator 2.4.8** (TypeScript).

---

## How to Open

1. Launch **Cocos Dashboard** and click **Open Project**.
2. Select the `mario-game/` folder.
3. Cocos Creator will import assets and compile scripts automatically.
4. Press the **Play** button (▶) to run in the browser preview.

---

## Features Implemented

### Complete Game Process ✅
- **Start Menu** – title screen with Start and Level Select buttons, BGM plays
- **Level Select** – two level tiles (World 1-1 playable, World 1-2 locked)
- **Game View** – scrolling platformer with all in-game HUD
- **Game Over** screen (retry / menu)
- **Level Clear** screen (time-bonus score added)

### Basic Rules ✅
- **World Map** – Box2D physics (gravity, collision); camera follows player by scrolling the world node; 1 world map
- **Level Design** – static ground + elevated platforms; question blocks that interact with player
- **Player** – move (A/D / ←/→), jump (Space/W/↑); hurt by side-contact with enemies; shrinks to small when big Mario is hit; dies when small Mario is hit; falls-out-of-bounds detection; respawn at initial position
- **Enemies** – Goomba walks back and forth, turns at walls; dies only when stomped from above
- **Question Blocks** – bounces when hit from below; spawns Super Mushroom; turns grey after use

### Animations ✅
- Player walk & jump animations (sprite atlas, script-driven frame cycling)
- Goomba walk animation; squash on death

### Sound Effects ✅
- BGM on start menu and in-game (does not stop on SFX)
- Player jump (`jump.wav`)
- Player die / lose life (`loseOneLife.wav`)
- Enemy stomp (`stomp.wav`)
- Power-up collect (`PowerUp.mp3`)
- Power-down (`powerDown.wav`)
- Question block hit (`powerUpAppear.wav`)
- Level clear (`levelClear.mp3`)
- Game over (`Game Over.mp3`)

### UI ✅
- **Score** (top-left, 6-digit zero-padded)
- **Lives** (top-centre, × N)
- **Timer** (top-right, counts down from 400 s; death on 0)

### Appearance
- Pixel-art sprites scaled 3× for crisp look
- Sky-blue scrolling background
- Brown ground / platforms
- All TA-provided assets used

---

## Controls

| Action | Keys |
|--------|------|
| Move left | ← / A |
| Move right | → / D |
| Jump | Space / ↑ / W |

---

## Project Structure

```
mario-game/
├── assets/
│   ├── Scene/          – StartMenu.fire, LevelSelect.fire, GameScene.fire
│   ├── Script/         – All TypeScript game logic
│   └── resources/
│       ├── Audio/      – BGM + SFX (.mp3 / .wav)
│       └── Texture/    – Sprite atlases (.plist + .png)
├── settings/
│   └── project-settings.json   – Physics groups, scene list
├── project.json
└── tsconfig.json
```

---

## Bonus
- All audio uses `cc.audioEngine`; SFX never stops BGM (separate music vs. effect channels).
- Level score includes **time-bonus** (remaining seconds × 50) added on level clear.

---

*CS2410 Software Studio – Spring 2026*
