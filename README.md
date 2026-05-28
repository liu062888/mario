# Web Mario – Assignment 02

**Live Demo:** https://webmario-19d36.web.app

## 操作方式

| 動作 | 按鍵 |
|------|------|
| 向左移動 | ← / A |
| 向右移動 | → / D |
| 跳躍 | Space / ↑ / W |

## 實作功能

### 場景流程
- **StartMenu**：標題畫面，提供「START」按鈕，自動播放 BGM
- **LevelSelect**：World 1-1 可進入；其餘關卡鎖定
- **GameScene**：完整可遊玩的關卡
- **Game Over 畫面**：命數歸零時顯示，4 秒後自動返回主選單
- **過關畫面**：碰到旗竿後觸發，計算時間獎勵分數，3 秒後返回主選單

### 玩家（Mario）
- 鍵盤控制左右移動與跳躍
- **大小切換機制**：遊戲開始為大 Mario（1.5 倍高度）
  - 被敵人碰到一次 → 縮小成小 Mario（觸發無敵幀）
  - 小 Mario 再被碰到 → 死亡、扣除一條命
- **踩踏敵人**：從上方跳落踩踏 Goomba 可將其擊殺，並往上彈跳，獲得 +100 分
- **死亡與重生**：扣一條命後在起點重新出現，計時器重置；初始共 3 條命
- **落地死亡**：掉入地面缺口或飛出畫面下方即死亡；命數歸零觸發 Game Over

### 敵人 — Goomba
- 在固定範圍（預設 200 px）內自動左右巡邏
- 兩幀走路循環動畫
- 從側面碰到玩家 → 玩家受傷
- 被玩家從上方踩踏 → 播放壓扁動畫後消失，玩家獲得 +100 分

### 問號磚塊（Question Block）
- 啟用狀態有 3 幀循環閃爍動畫
- 從下方撞擊 → 磚塊彈跳、播放音效、獲得 +50 分
- **金幣模式**（預設）：彈出金幣特效向上飛弧，玩家獲得 +200 分
- **蘑菇模式**：彈出超級蘑菇，滑出動畫結束後啟動物理系統
- 撞過一次後變成灰色「使用過」磚塊，後續撞擊無效

### 蘑菇（Mushroom）
- 從問號磚塊滑出，帶有平滑彈出 Tween 動畫
- 動畫結束後才掛載 RigidBody 與 Collider 開始受物理控制
- 玩家碰到 → 若為小 Mario 則恢復為大 Mario；獲得 +200 分

### 金幣（Coin）
- 在 Cocos Creator 編輯器中的 GameWorld 裡自由擺放
- 自動從 items 圖集載入，呈現 4 幀旋轉動畫
- 玩家走過觸碰 → 收集成功：+200 分 + 金幣音效，金幣淡出上升後銷毀

### 水管（Pipe）
- 以程式碼在三個位置（x = 550、1450、1950）生成，高度各異
- 有物理碰撞，玩家可站在上方
- 外觀使用 tiles 圖集中的管頭與管身圖格貼圖

### 關卡與攝影機
- 關卡寬度 2880 px，背景圖完整覆蓋整個寬度
- 地面中央有一個缺口（深淵），掉入即死
- 攝影機水平跟隨 Mario，並夾限在背景左右邊界內，不顯示黑色區域
- HUD 跟隨攝影機移動，始終顯示在畫面上
- **響應式縮放**：遊戲畫面自動縮放以填滿瀏覽器視窗，支援任意視窗大小

### HUD（遊戲內介面）
| 元素 | 說明 |
|------|------|
| 分數 | 6 位數顯示；踩敵、撞磚、收集金幣、過關獎勵時更新 |
| 命數 | 初始 3 條；死亡後遞減 |
| 計時器 | 從 400 開始倒數；歸零則死亡 |

### 分數對照表
| 事件 | 分數 |
|------|------|
| 踩踏 Goomba | +100 |
| 收集金幣 | +200 |
| 收集蘑菇 | +200 |
| 撞問號磚塊 | +50 |
| 過關時間獎勵 | `floor(剩餘秒數) × 50` |

### 音效
| 事件 | 音檔 |
|------|------|
| 遊戲內 BGM | `Audio/bgm_1` |
| 跳躍 | `Audio/jump` |
| 踩踏敵人 | `Audio/stomp` |
| 收集金幣 | `Audio/coin` |
| 撞磚塊 | `Audio/blockHit` |
| 吃蘑菇（強化） | `Audio/PowerUp` |
| 受傷縮小 | `Audio/powerDown` |
| 失去一條命 | `Audio/loseOneLife` |
| 過關 | `Audio/levelClear` |
| Game Over | `Audio/Game Over` |

---

## Bonus 功能

### Firebase 會員系統（+5%）
- **登入畫面**：開啟遊戲時顯示登入/註冊 overlay，遮蓋遊戲畫面
- **Email 註冊 / 登入**：使用 Firebase Authentication（Email/Password）
- **訪客登入**：匿名登入，可正常遊玩並上傳分數
- **Session 保持**：關閉後重新開啟會自動恢復登入狀態
- 技術：Firebase Auth compat SDK、HTML DOM overlay、`auth.onAuthStateChanged`

### 全球排行榜（+5%）
- **自動上傳分數**：遊戲結束（過關或 Game Over）後自動將分數寫入 Firestore
- **只保留最高分**：每位玩家只保留一筆最高分紀錄
- **🏆 排行榜按鈕**：登入後右上角顯示，可隨時查看全球前 10 名
- **即時讀取**：每次開啟排行榜都從 Firestore 重新查詢最新資料
- 技術：Cloud Firestore、`cc.director.loadScene` hook 攔截分數、Firestore Security Rules

---

## 專案結構

```
mario-game/
├── assets/
│   ├── Scene/               – StartMenu.fire, LevelSelect.fire, GameScene.fire
│   ├── Script/
│   │   ├── GameManager.ts          – 物理設定、水管地面生成、遊戲狀態管理
│   │   ├── PlayerController.ts     – 移動、動畫、碰撞、攝影機捲動
│   │   ├── EnemyGoomba.ts          – 巡邏 AI、踩踏/死亡邏輯
│   │   ├── QuestionBlock.ts        – 撞擊偵測、金幣/蘑菇生成、動畫
│   │   ├── Mushroom.ts             – 蘑菇移動與玩家收集
│   │   ├── Coin.ts                 – 金幣動畫與收集輔助
│   │   ├── FlagPole.ts             – 過關觸發
│   │   ├── AudioManager.ts         – BGM/SFX 單例封裝
│   │   ├── UIManager.ts            – HUD 分數/命數/計時標籤
│   │   ├── FirebaseManager.ts      – Firebase bridge（靜態工具類）
│   │   ├── LevelSelectController.ts
│   │   └── Constants.ts            – 共用常數與精靈幀名稱陣列
│   └── resources/
│       ├── Audio/           – BGM 與音效檔（.mp3 / .wav）
│       └── Texture/         – 精靈圖集（.plist + .png）與背景圖
├── build/web-mobile/
│   └── index.html           – 含 Firebase SDK、登入 overlay、排行榜 overlay
├── firestore.rules          – Firestore 安全規則
├── firebase.json            – Hosting + Firestore 部署設定
├── settings/
│   └── project.json         – 物理群組、場景清單、畫布解析度
├── project.json
└── tsconfig.json
```

---

## AI Reference

This project was developed with the assistance of **Claude Code** (Anthropic, model: `claude-sonnet-4-6`) as an AI pair-programming tool throughout the development process.

### How AI was used

| Area | Description |
|------|------|
| **Scene & engine setup** | Debugged Cocos Creator 2.4.8 scene file (`.fire`) format; fixed `cc.SceneAsset` wrapper structure and `GameWorld` child registration |
| **Physics & collision** | Identified that `enabledContactListener: false` on the player's `RigidBody` prevented `onBeginContact` from firing; configured the collision matrix in `settings/project.json` |
| **Mushroom collection** | Diagnosed and rewrote mushroom pickup logic using `getBoundingBoxToWorld()` + `cc.Rect.intersects()` for reliable world-space overlap detection |
| **Animation system** | Designed sprite-frame cycling for Mario (idle / walk / jump, small / big variants), Goomba walk & squash animations, and Question Block shimmer frames |
| **Audio** | Implemented the `AudioManager` singleton for BGM switching across scenes and SFX playback via `cc.resources.load` |
| **Game systems** | Assisted with score display, timer countdown, lives tracking, Game Over / Level Clear flow, and camera clamping logic |
| **Firebase deployment** | Set up `firebase.json` and `.firebaserc`; resolved the asset-bundle nesting error; fixed launch-scene mismatch; diagnosed CDN cache issues |
| **Firebase Auth + Leaderboard** | Implemented login/register HTML overlay with Firebase Auth; Cloud Firestore leaderboard with `cc.director.loadScene` hook to capture scores without rebuilding CC |
| **Responsive scaling** | Applied `cc.ResolutionPolicy.SHOW_ALL` via boot-wrap to make the game scale to any window size |

### Tools & versions

| Tool | Version |
|------|------|
| Claude Code | claude-sonnet-4-6 (Anthropic) |
| Cocos Creator | 2.4.8 |
| Firebase CLI | 15.15.0 |
| Firebase Auth + Firestore | SDK v10.12.0 (compat) |
| TypeScript | 4.x (via Cocos Creator) |

> All code was reviewed and tested by the author. AI suggestions were evaluated, modified where necessary, and integrated with full understanding of the implementation.

---

*CS2410 Software Studio – Spring 2026*
