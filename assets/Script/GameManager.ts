import AudioManager from './AudioManager';
import UIManager from './UIManager';
import PlayerController from './PlayerController';
import Coin from './Coin';
import {
    CANVAS_W, GROUND_Y, GROUND_HALF_H, LEVEL_WIDTH, SCALE,
    INITIAL_LIVES, INITIAL_TIMER, getWhiteFrame
} from './Constants';

const { ccclass, property } = cc._decorator;

/**
 * GameManager – hybrid mode.
 * Code handles: Ground physics, DeathZone.
 * You handle in CC editor: Player, Goomba, Platforms, QuestionBlocks, FlagPole.
 *
 * Node naming rules (PlayerController uses these names for collision):
 *   Player / Goomba / Ground / Platform* / QuestionBlock / Mushroom / FlagPole / DeathZone
 *
 * Physics groups required (Project Settings → Group Manager):
 *   default / player / ground / enemy / item
 */
@ccclass
export default class GameManager extends cc.Component {

    public static instance: GameManager = null;

    /** Optional: drag Mario node here. If left empty, auto-searches GameWorld/Player */
    @property(cc.Node) playerNode: cc.Node = null;

    public score: number = 0;
    public lives: number = INITIAL_LIVES;
    public timeLeft: number = INITIAL_TIMER;
    public isGameOver: boolean = false;
    public isLevelClear: boolean = false;

    private _uiMgr: UIManager = null;
    private _timerActive: boolean = false;
    private _isRespawning: boolean = false;
    private _spawnX: number = 0;
    private _spawnY: number = 0;
    private _gameWorld: cc.Node = null;

    onLoad() {
        GameManager.instance = this;
        const pm = cc.director.getPhysicsManager();
        pm.enabled = true;
        pm.gravity = cc.v2(0, -980);
        (pm as any).enabledContactListener = true;
    }

    start() {
        this._gameWorld = this._findGameWorld();

        // Find player first — we need his foot Y to know where to put the ground
        if (!this.playerNode && this._gameWorld) {
            this.playerNode = this._gameWorld.getChildByName('Player');
        }

        // Wire gameWorld reference into PlayerController so camera works
        if (this.playerNode && this._gameWorld) {
            const pc = this._findComponent(this.playerNode, PlayerController);
            if (pc) pc.gameWorld = this._gameWorld;
        }

        // Use big-Mario half-height (26*SCALE/2=39) — Mario now starts as BIG; playerNode.height may be 0 if sprite not yet loaded
        const HALF_H = 26 * SCALE / 2;
        if (this.playerNode) {
            this._spawnX = this.playerNode.x;
            this._spawnY = this.playerNode.y - HALF_H;  // foot level
        }

        // Ground surface fixed at foot level; independent of sprite-load timing
        const groundSurfaceY = this.playerNode ? this.playerNode.y - HALF_H : GROUND_Y;
        if (this._gameWorld) {
            this._createGround(groundSurfaceY);
            this._createDeathZone(groundSurfaceY);
            this._createPipes(groundSurfaceY);
            this._createCoins(groundSurfaceY);
        }

        // Find UIManager
        const uiNode = cc.find('Canvas/UIManager');
        this._uiMgr = uiNode ? uiNode.getComponent(UIManager) : null;
        if (this._uiMgr) {
            this._uiMgr.setScore(0);
            this._uiMgr.setLives(this.lives);
            this._uiMgr.setTimer(Math.floor(this.timeLeft));
        }

        AudioManager.instance && AudioManager.instance.playBGM('Audio/bgm_1');
        this._timerActive = true;
    }

    // ── Scene essentials ────────────────────────────────────────────────────

    private _findComponent<T extends cc.Component>(node: cc.Node, type: { new(): T }): T {
        const c = node.getComponent(type);
        if (c) return c;
        for (const child of node.children) {
            const found = this._findComponent(child, type);
            if (found) return found;
        }
        return null;
    }

    private _findGameWorld(): cc.Node {
        // Walk up to Canvas from this node
        let node: cc.Node = this.node;
        while (node && node.name !== 'Canvas') {
            node = node.parent;
        }
        const canvas = node;
        if (!canvas) {
            console.error('[GM] Cannot find Canvas node!');
            return null;
        }
        // Search Canvas children (scene may have trailing space in name)
        for (const child of canvas.children) {
            if (child.name.trim() === 'GameWorld') return child;
        }
        console.error('[GM] Cannot find GameWorld under Canvas! Children:', canvas.children.map(c => JSON.stringify(c.name)));
        return null;
    }

    private _createGround(groundSurfaceY: number = GROUND_Y) {
        // Gap void: background pixel 1586~1726, background left = -480 in world
        // world x = -480 + pixel → GAP_LEFT=1106, GAP_RIGHT=1246
        const GAP_LEFT  = 1106;
        const GAP_RIGHT = 1246;
        const edgeL = -CANVAS_W;
        const edgeR = LEVEL_WIDTH + CANVAS_W;

        this._createGroundSegment('GroundPhysics_L', edgeL,    GAP_LEFT,  groundSurfaceY);
        this._createGroundSegment('GroundPhysics_R', GAP_RIGHT, edgeR,    groundSurfaceY);
    }

    private _createGroundSegment(name: string, x1: number, x2: number, groundSurfaceY: number) {
        const w = x2 - x1;
        const cx = (x1 + x2) / 2;
        const node = new cc.Node(name);
        node.setPosition(cx, groundSurfaceY - GROUND_HALF_H);

        const sp = node.addComponent(cc.Sprite);
        sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        sp.spriteFrame = getWhiteFrame();
        node.width = w;
        node.height = GROUND_HALF_H * 2;
        node.opacity = 0;

        const rb = node.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Static;

        const col = node.addComponent(cc.PhysicsBoxCollider);
        col.size = cc.size(w, GROUND_HALF_H * 2);
        col.friction = 0.5;
        col.restitution = 0;

        node.group = 'ground';
        this._gameWorld.addChild(node, -10);
    }

    private _createDeathZone(groundSurfaceY: number = GROUND_Y) {
        const totalW = LEVEL_WIDTH + CANVAS_W * 2;
        const node = new cc.Node('DeathZone');
        // 60px below ground surface — catches gap falls quickly
        node.setPosition(LEVEL_WIDTH / 2, groundSurfaceY - 60);

        const rb = node.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Static;

        const col = node.addComponent(cc.PhysicsBoxCollider);
        col.size = cc.size(totalW, 50);
        col.sensor = true;

        node.group = 'ground';
        this._gameWorld.addChild(node);
    }

    private _createPipes(groundSurfaceY: number) {
        const TILE = 16 * SCALE;
        const BODY_W = TILE;
        const HEAD_W = BODY_W + 12;
        const HEAD_H = TILE / 2;

        // [worldX, tileHeight]
        const pipes: [number, number][] = [
            [ 550, 2],
            [1450, 1],
            [1950, 2],
        ];

        for (const [px, tileH] of pipes) {
            const bodyH = tileH * TILE;

            const bodyNode = new cc.Node('Pipe');
            bodyNode.setPosition(px, groundSurfaceY + bodyH / 2);
            bodyNode.width = BODY_W;
            bodyNode.height = bodyH;
            const bodySp = bodyNode.addComponent(cc.Sprite);
            bodySp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
            bodySp.spriteFrame = getWhiteFrame();
            bodyNode.color = cc.color(0, 148, 0);
            const bodyRb = bodyNode.addComponent(cc.RigidBody);
            bodyRb.type = cc.RigidBodyType.Static;
            const bodyCol = bodyNode.addComponent(cc.PhysicsBoxCollider);
            bodyCol.size = cc.size(BODY_W, bodyH);
            bodyNode.group = 'ground';
            this._gameWorld.addChild(bodyNode);

            const headNode = new cc.Node('PipeHead');
            headNode.setPosition(px, groundSurfaceY + bodyH + HEAD_H / 2);
            headNode.width = HEAD_W;
            headNode.height = HEAD_H;
            const headSp = headNode.addComponent(cc.Sprite);
            headSp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
            headSp.spriteFrame = getWhiteFrame();
            headNode.color = cc.color(0, 168, 0);
            const headRb = headNode.addComponent(cc.RigidBody);
            headRb.type = cc.RigidBodyType.Static;
            const headCol = headNode.addComponent(cc.PhysicsBoxCollider);
            headCol.size = cc.size(HEAD_W, HEAD_H);
            headNode.group = 'ground';
            this._gameWorld.addChild(headNode);
        }
    }

    private _createCoins(groundSurfaceY: number) {
        const TILE = 16 * SCALE;
        // [startX, yAboveGround, count, spacing]
        const groups: [number, number, number, number][] = [
            [ 250, TILE * 2, 5, TILE],   // 5 coins near start
            [ 750, TILE * 3, 3, TILE],   // 3 high coins mid-left
            [1000, TILE * 2, 3, TILE],   // 3 coins before the gap
            [1350, TILE * 2, 4, TILE],   // 4 coins after the gap
            [1750, TILE * 2, 5, TILE],   // 5 coins mid-right
            [2300, TILE * 4, 3, TILE],   // 3 high coins near end
        ];

        const coinSize = TILE * 0.6; // 28px — smaller than a tile
        const coinNodes: cc.Node[] = [];

        for (const [startX, yOff, count, spacing] of groups) {
            for (let i = 0; i < count; i++) {
                const node = new cc.Node('Coin');
                node.width = coinSize;
                node.height = coinSize;
                node.setPosition(startX + i * spacing, groundSurfaceY + yOff);

                const sp = node.addComponent(cc.Sprite);
                sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
                sp.spriteFrame = getWhiteFrame();
                node.color = cc.color(255, 215, 0);

                node.addComponent(Coin);
                this._gameWorld.addChild(node);
                coinNodes.push(node);
            }
        }

        // Load items atlas and apply coin sprite + spin animation frames
        cc.resources.load('Texture/items', cc.SpriteAtlas, (err, atlas: cc.SpriteAtlas) => {
            if (err || !atlas) return;
            const frameNames = ['items_0', 'items_1', 'items_2', 'items_3'];
            const frames = frameNames
                .map(n => atlas.getSpriteFrame(n) ?? atlas.getSpriteFrame(n + '.png'))
                .filter(f => !!f) as cc.SpriteFrame[];
            for (const node of coinNodes) {
                if (!node.isValid) continue;
                const coin = node.getComponent(Coin);
                if (coin) coin.setFrames(frames.length > 0 ? frames : []);
                if (frames.length === 0) {
                    const frame = atlas.getSpriteFrame('items_13') ?? atlas.getSpriteFrame('items_13.png');
                    const sp = node.getComponent(cc.Sprite);
                    if (frame && sp) { sp.spriteFrame = frame; node.color = cc.color(255, 255, 255); }
                }
            }
        });
    }

    private _buildGameOverScreen() {
        const canvas = cc.find('Canvas');
        if (!canvas) { cc.director.loadScene('StartMenu'); return; }

        const screen = new cc.Node('_GOScreen');
        screen.zIndex = 1000;
        canvas.addChild(screen);

        // 黑色半透明背景
        const bg = new cc.Node('bg');
        bg.setPosition(0, 0);
        bg.width = 960; bg.height = 640;
        const sp = bg.addComponent(cc.Sprite);
        sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        sp.spriteFrame = getWhiteFrame();
        bg.color = cc.color(0, 0, 0);
        bg.opacity = 200;
        screen.addChild(bg);

        // GAME OVER 文字
        const title = new cc.Node('title');
        title.setPosition(0, 60);
        const tl = title.addComponent(cc.Label);
        tl.string = 'GAME OVER';
        tl.fontSize = 72;
        tl.lineHeight = 80;
        title.color = cc.color(255, 60, 60);
        screen.addChild(title);

        // 分數
        const scoreLine = new cc.Node('score');
        scoreLine.setPosition(0, -20);
        const sl = scoreLine.addComponent(cc.Label);
        sl.string = `SCORE  ${String(this.score).padStart(6, '0')}`;
        sl.fontSize = 40;
        sl.lineHeight = 48;
        scoreLine.color = cc.color(255, 255, 255);
        screen.addChild(scoreLine);

        // 4 秒後回主選單
        this.scheduleOnce(() => cc.director.loadScene('StartMenu'), 4);
    }

    // ── Game state ──────────────────────────────────────────────────────────

    update(dt: number) {
        if (!this._timerActive || this.isGameOver || this.isLevelClear) return;
        this.timeLeft -= dt;
        if (this.timeLeft < 0) this.timeLeft = 0;
        if (this._uiMgr) this._uiMgr.setTimer(Math.floor(this.timeLeft));
        if (this.timeLeft <= 0) this.onPlayerDied();
    }

    addScore(pts: number) {
        this.score += pts;
        if (this._uiMgr) this._uiMgr.setScore(this.score);
    }

    onPlayerDied() {
        if (this.isGameOver || this.isLevelClear || this._isRespawning) return;
        this._isRespawning = true;
        this._timerActive = false;
        AudioManager.instance && AudioManager.instance.stopBGM();
        AudioManager.instance && AudioManager.instance.playSFX('Audio/loseOneLife');
        this.lives--;
        if (this._uiMgr) this._uiMgr.setLives(this.lives);
        if (this.lives <= 0) {
            this.isGameOver = true;
            this._isRespawning = false;
            this.scheduleOnce(() => {
                AudioManager.instance && AudioManager.instance.playSFX('Audio/Game Over');
                this._buildGameOverScreen();
            }, 2);
        } else {
            this.scheduleOnce(() => this._respawnPlayer(), 2);
        }
    }

    private _respawnPlayer() {
        if (!this.playerNode || !this.playerNode.isValid) return;
        this._isRespawning = false;
        const pc = this._findComponent(this.playerNode, PlayerController);
        if (pc) pc.respawn(this._spawnX, this._spawnY);
        AudioManager.instance && AudioManager.instance.playBGM('Audio/bgm_1');
        this.timeLeft = INITIAL_TIMER;
        this._timerActive = true;
    }

    onLevelClear() {
        if (this.isGameOver || this.isLevelClear) return;
        this.isLevelClear = true;
        this._timerActive = false;
        AudioManager.instance && AudioManager.instance.stopBGM();
        AudioManager.instance && AudioManager.instance.playSFX('Audio/levelClear');
        const bonus = Math.floor(this.timeLeft) * 50;
        this.addScore(bonus);
        // UI 由 FlagPole.scheduleOnce 負責顯示
    }

    retryLevel() {
        this.score = 0;
        this.timeLeft = INITIAL_TIMER;
        this.isGameOver = false;
        this.isLevelClear = false;
        cc.director.loadScene('GameScene');
    }

    goToMainMenu() {
        this.lives = INITIAL_LIVES;
        this.score = 0;
        this.isGameOver = false;
        this.isLevelClear = false;
        cc.director.loadScene('StartMenu');
    }
}
