# Web Mario – Assignment 02

A Mario-style platformer built with **Cocos Creator 2.4.8** (TypeScript).

---

## How to Open

1. Launch **Cocos Dashboard** and click **Open Project**.
2. Select the `mario-game/` folder.
3. Cocos Creator will import assets and compile scripts automatically.
4. Press the **Play** button (▶) to run in the browser preview.

---

## Implemented Features

### Complete Game Flow
- **Start Menu** – title screen with "Start Game" and "Level Select" buttons; BGM plays automatically
- **Level Select** – World 1-1 (playable) and World 1-2 (locked / coming soon)
- **In-Game HUD** – Score, Lives, Timer displayed at all times
- **Game Over screen** – shown when lives reach 0; Retry and Main Menu buttons
- **Level Clear screen** – shown when player touches the flag; time bonus applied

### World / Physics
- Box2D physics engine enabled (gravity, rigidbody, colliders)
- Physics groups: `player`, `ground`, `enemy`, `item` (configured in Project Settings)
- Collision matrix: player↔ground, player↔enemy, player↔item, enemy↔ground
- Smooth camera follow: world node scrolls so Mario stays left-of-centre; clamped to level bounds (0 → level end)

### Level Design
- Continuous ground across the full level width (5000 px)
- 8 elevated platforms at varied heights
- 7 question blocks scattered through the level
- 8 Goomba enemies placed progressively across the level
- Goal flagpole at x = 4400

### Player
- Move left/right: `←` / `A`, `→` / `D`
- Jump: `Space` / `↑` / `W`
- Two sizes: **Small Mario** and **Big Mario** (grows on Super Mushroom)
- Hurt mechanic: Big Mario → Small (invincibility blink); Small Mario → die
- Death: physics arc, collider disabled, 2.5 s delay then life lost
- Fall-death: detected when y drops below world floor or left edge
- Respawn at start position with timer reset

### Enemies – Goomba
- Animated walk cycle (2 frames, 0.12 s each)
- Patrols: reverses direction when hitting a wall (physics-based)
- Stomp kill: player lands on top → Goomba plays squash frame, then disappears; player bounces up
- Side contact → player gets hurt

### Question Blocks
- Animated ? sprite (3 frames cycling)
- Bounce animation when hit from below by player
- Spawns a **Super Mushroom** that slides along the ground
- Turns to used (grey/static) after first hit; subsequent hits have no effect

### Animations (script-driven, no cc.Animation component)
- Player: Idle, Walk (3 frames), Jump, Dead — for both Small and Big Mario
- Goomba: Walk (2 frames), Dead (squash, 1 frame)
- All sprites loaded from Texture Packer `.plist` + `.png` atlases via `cc.resources.loadDir`

### Sound Effects
| Event | File |
|---|---|
| In-game BGM | `Audio/bgm_1` |
| Player jump | `Audio/jump` |
| Player stomp enemy | `Audio/stomp` |
| Power-up collect | `Audio/PowerUp` |
| Power-down (shrink) | `Audio/powerDown` |
| Lose a life | `Audio/loseOneLife` |
| Level clear | `Audio/levelClear` |
| Game over | `Audio/Game Over` |

### UI
- **Score** – top-left, 6-digit zero-padded (enemies: +100, mushroom: +200, time bonus: ×50)
- **Lives** – top-centre (`×N`)
- **Timer** – top-right, counts down from 400; player dies at 0

---

## Controls

| Action | Keys |
|---|---|
| Move left | ← / A |
| Move right | → / D |
| Jump | Space / ↑ / W |

---

## Project Structure

```
mario-game/
├── assets/
│   ├── Scene/          – StartMenu.fire, LevelSelect.fire, GameScene.fire
│   ├── Script/         – TypeScript game logic
│   │   ├── GameManager.ts      – scene builder, physics setup, game state
│   │   ├── PlayerController.ts – movement, animation, contact callbacks
│   │   ├── EnemyGoomba.ts      – patrol AI, stomp/death logic
│   │   ├── QuestionBlock.ts    – hit detection, mushroom spawn, animation
│   │   ├── AudioManager.ts     – BGM / SFX wrapper (singleton)
│   │   ├── UIManager.ts        – HUD labels, panel show/hide
│   │   ├── LevelSelectController.ts
│   │   └── Constants.ts        – shared constants & sprite frame names
│   └── resources/
│       ├── Audio/      – BGM + SFX (.mp3 / .wav)
│       └── Texture/    – Sprite atlases (.plist + .png) and background images
├── settings/
│   └── project-settings.json   – physics groups, scene list
├── project.json
└── tsconfig.json
```

---

## Bonus
- Time bonus on level clear: `floor(timeLeft) × 50` points added to score
- BGM and SFX run on separate audio channels; SFX never interrupts background music
- Camera uses smooth lerp (`+= (target − current) × 0.15`) to avoid jarring snaps

---

*CS2410 Software Studio – Spring 2026*
