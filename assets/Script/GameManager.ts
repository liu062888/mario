import AudioManager from './AudioManager';
import UIManager from './UIManager';
import PlayerController from './PlayerController';
import EnemyGoomba from './EnemyGoomba';
import QuestionBlock from './QuestionBlock';
import {
    CANVAS_W, CANVAS_H, GROUND_Y, GROUND_HALF_H, LEVEL_WIDTH,
    INITIAL_LIVES, INITIAL_TIMER, SCALE
} from './Constants';

const { ccclass } = cc._decorator;

interface LevelData {
    platforms: Array<{ x: number; y: number; w: number; h: number }>;
    qblocks: Array<{ x: number; y: number }>;
    enemies: Array<{ x: number; y: number }>;
    flagX: number;
}

const LEVEL1: LevelData = {
    platforms: [
        { x: 400,  y: GROUND_Y + 160, w: 320, h: 32 },
        { x: 720,  y: GROUND_Y + 200, w: 192, h: 32 },
        { x: 1100, y: GROUND_Y + 150, w: 256, h: 32 },
        { x: 1500, y: GROUND_Y + 220, w: 320, h: 32 },
        { x: 2000, y: GROUND_Y + 170, w: 192, h: 32 },
        { x: 2400, y: GROUND_Y + 140, w: 320, h: 32 },
        { x: 3000, y: GROUND_Y + 200, w: 192, h: 32 },
        { x: 3400, y: GROUND_Y + 160, w: 256, h: 32 },
    ],
    qblocks: [
        { x: 300, y: GROUND_Y + 250 },
        { x: 340, y: GROUND_Y + 250 },
        { x: 700, y: GROUND_Y + 300 },
        { x: 1200, y: GROUND_Y + 280 },
        { x: 1900, y: GROUND_Y + 300 },
        { x: 2600, y: GROUND_Y + 260 },
        { x: 3200, y: GROUND_Y + 290 },
    ],
    enemies: [
        { x: 500,  y: GROUND_Y + 30 },
        { x: 900,  y: GROUND_Y + 30 },
        { x: 1300, y: GROUND_Y + 30 },
        { x: 1700, y: GROUND_Y + 30 },
        { x: 2200, y: GROUND_Y + 30 },
        { x: 2800, y: GROUND_Y + 30 },
        { x: 3500, y: GROUND_Y + 30 },
        { x: 4000, y: GROUND_Y + 30 },
    ],
    flagX: 4400,
};

@ccclass
export default class GameManager extends cc.Component {

    public static instance: GameManager = null;

    public score: number = 0;
    public lives: number = INITIAL_LIVES;
    public timeLeft: number = INITIAL_TIMER;
    public currentLevel: number = 1;
    public isGameOver: boolean = false;
    public isLevelClear: boolean = false;

    private _gameWorld: cc.Node = null;
    private _player: cc.Node = null;
    private _uiMgr: UIManager = null;
    private _timerActive: boolean = false;

    private _marioSmallAtlas: cc.SpriteAtlas = null;
    private _marioBigAtlas: cc.SpriteAtlas = null;
    private _goombaAtlas: cc.SpriteAtlas = null;
    private _itemsAtlas: cc.SpriteAtlas = null;

    onLoad() {
        GameManager.instance = this;
        this._setupPhysics();
        this._preloadAssets();
    }

    private _setupPhysics() {
        const pm = cc.director.getPhysicsManager();
        pm.enabled = true;
        pm.gravity = cc.v2(0, -980);
    }

    private _preloadAssets() {
        let loaded = 0;
        const total = 4;
        const check = () => { if (++loaded >= total) this._buildScene(); };

        cc.resources.load('Texture/mario_small', cc.SpriteAtlas, (err, atlas) => {
            if (!err) this._marioSmallAtlas = atlas as cc.SpriteAtlas;
            check();
        });
        cc.resources.load('Texture/mario_big', cc.SpriteAtlas, (err, atlas) => {
            if (!err) this._marioBigAtlas = atlas as cc.SpriteAtlas;
            check();
        });
        cc.resources.load('Texture/Goomba', cc.SpriteAtlas, (err, atlas) => {
            if (!err) this._goombaAtlas = atlas as cc.SpriteAtlas;
            check();
        });
        cc.resources.load('Texture/items', cc.SpriteAtlas, (err, atlas) => {
            if (!err) this._itemsAtlas = atlas as cc.SpriteAtlas;
            check();
        });
    }

    private _buildScene() {
        this._gameWorld = cc.find('Canvas/GameWorld');
        if (!this._gameWorld) {
            this._gameWorld = new cc.Node('GameWorld');
            cc.find('Canvas').addChild(this._gameWorld);
        }
        this._uiMgr = cc.find('Canvas/UIManager').getComponent(UIManager) ||
            this.node.parent.getComponent(UIManager);

        this._createBackground();
        this._createGround();
        this._createPlatforms(LEVEL1.platforms);
        this._createQuestionBlocks(LEVEL1.qblocks);
        this._createEnemies(LEVEL1.enemies);
        this._createFlag(LEVEL1.flagX);
        this._createPlayer(-350, GROUND_Y + 50);
        this._createDeathZone();

        if (this._uiMgr) {
            this._uiMgr.setScore(0);
            this._uiMgr.setLives(this.lives);
            this._uiMgr.setTimer(Math.floor(this.timeLeft));
        }

        AudioManager.instance && AudioManager.instance.playBGM('Audio/bgm_1');
        this._timerActive = true;
    }

    private _createBackground() {
        const bg = new cc.Node('Background');
        bg.color = cc.color(92, 148, 252);
        bg.width = LEVEL_WIDTH + CANVAS_W;
        bg.height = CANVAS_H + 200;
        bg.x = LEVEL_WIDTH / 2 - CANVAS_W / 2;
        bg.y = 0;
        const sp = bg.addComponent(cc.Sprite);
        sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        this._gameWorld.addChild(bg, -10);
    }

    private _createGround() {
        const totalW = LEVEL_WIDTH + CANVAS_W;
        const startX = -CANVAS_W / 2;

        const groundNode = this._makeStaticBox(
            'Ground',
            startX + totalW / 2, GROUND_Y - GROUND_HALF_H,
            totalW, GROUND_HALF_H * 2
        );
        groundNode.color = cc.color(139, 90, 43);
        this._gameWorld.addChild(groundNode);
    }

    private _createPlatforms(list: LevelData['platforms']) {
        for (const p of list) {
            const node = this._makeStaticBox('Platform', p.x, p.y, p.w, p.h);
            node.color = cc.color(139, 90, 43);
            this._gameWorld.addChild(node);
        }
    }

    private _createQuestionBlocks(list: LevelData['qblocks']) {
        for (const b of list) {
            const size = 16 * SCALE;
            const node = this._makeStaticBox('QuestionBlock', b.x, b.y, size, size);
            node.color = cc.color(255, 200, 0);
            const qb = node.addComponent(QuestionBlock);
            if (this._itemsAtlas) {
                const sp = node.getComponent(cc.Sprite) || node.addComponent(cc.Sprite);
                const frame = this._itemsAtlas.getSpriteFrame('items_10.png');
                if (frame) sp.spriteFrame = frame;
                qb.itemsAtlas = this._itemsAtlas;
            }
            this._gameWorld.addChild(node);
        }
    }

    private _createEnemies(list: LevelData['enemies']) {
        for (const e of list) {
            const w = 20 * SCALE, h = 24 * SCALE;
            const node = new cc.Node('Goomba');
            node.setPosition(e.x, e.y + h / 2);
            node.width = w;
            node.height = h;
            node.color = cc.color(180, 120, 60);

            const sp = node.addComponent(cc.Sprite);
            sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;

            const rb = node.addComponent(cc.RigidBody);
            rb.type = cc.RigidBodyType.Dynamic;
            rb.fixedRotation = true;
            rb.gravityScale = 1;

            const col = node.addComponent(cc.PhysicsBoxCollider);
            col.size = cc.size(w, h);
            col.offset = cc.v2(0, 0);
            col.density = 1;
            col.friction = 0.2;
            col.restitution = 0;

            node.group = 'enemy';

            const enemy = node.addComponent(EnemyGoomba);
            enemy.atlas = this._goombaAtlas;

            this._gameWorld.addChild(node);
        }
    }

    private _createFlag(x: number) {
        const pole = new cc.Node('FlagPole');
        pole.setPosition(x, GROUND_Y - 60);
        pole.width = 8;
        pole.height = 240;
        pole.color = cc.color(200, 200, 200);
        const sp = pole.addComponent(cc.Sprite);
        sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;

        const trigger = pole.addComponent(cc.PhysicsBoxCollider);
        trigger.size = cc.size(40, 240);
        trigger.sensor = true;
        pole.group = 'item';

        this._gameWorld.addChild(pole);

        const flag = new cc.Node('Flag');
        flag.setPosition(x + 15, GROUND_Y + 110);
        flag.width = 32;
        flag.height = 24;
        flag.color = cc.color(0, 200, 0);
        const fsp = flag.addComponent(cc.Sprite);
        fsp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        this._gameWorld.addChild(flag);
    }

    private _createPlayer(x: number, y: number) {
        const w = 16 * SCALE, h = 16 * SCALE;
        this._player = new cc.Node('Player');
        this._player.setPosition(x, y + h / 2);
        this._player.width = w;
        this._player.height = h;

        const sp = this._player.addComponent(cc.Sprite);
        sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;

        const rb = this._player.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Dynamic;
        rb.fixedRotation = true;
        rb.gravityScale = 1;
        rb.linearDamping = 0;

        const col = this._player.addComponent(cc.PhysicsBoxCollider);
        col.size = cc.size(w - 4, h);
        col.offset = cc.v2(0, 0);
        col.density = 1;
        col.friction = 0.3;
        col.restitution = 0;

        this._player.group = 'player';

        const pc = this._player.addComponent(PlayerController);
        pc.smallAtlas = this._marioSmallAtlas;
        pc.bigAtlas = this._marioBigAtlas;
        pc.gameWorld = this._gameWorld;

        this._gameWorld.addChild(this._player);
    }

    private _createDeathZone() {
        const dz = new cc.Node('DeathZone');
        dz.setPosition(LEVEL_WIDTH / 2, GROUND_Y - GROUND_HALF_H * 2 - 200);
        dz.width = LEVEL_WIDTH * 2;
        dz.height = 100;
        const rb = dz.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Static;
        const col = dz.addComponent(cc.PhysicsBoxCollider);
        col.size = cc.size(LEVEL_WIDTH * 2, 100);
        col.sensor = true;
        dz.group = 'ground';
        this._gameWorld.addChild(dz);
    }

    private _makeStaticBox(name: string, x: number, y: number, w: number, h: number): cc.Node {
        const node = new cc.Node(name);
        node.setPosition(x, y);
        node.width = w;
        node.height = h;

        const sp = node.addComponent(cc.Sprite);
        sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;

        const rb = node.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Static;

        const col = node.addComponent(cc.PhysicsBoxCollider);
        col.size = cc.size(w, h);
        col.offset = cc.v2(0, 0);
        col.friction = 0.5;
        col.restitution = 0;

        node.group = 'ground';
        return node;
    }

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
        if (this.isGameOver || this.isLevelClear) return;
        AudioManager.instance && AudioManager.instance.stopBGM();
        AudioManager.instance && AudioManager.instance.playSFX('Audio/loseOneLife');
        this.lives--;
        if (this._uiMgr) this._uiMgr.setLives(this.lives);
        if (this.lives <= 0) {
            this.isGameOver = true;
            this.scheduleOnce(() => {
                AudioManager.instance && AudioManager.instance.playSFX('Audio/Game Over');
                if (this._uiMgr) this._uiMgr.showGameOver();
            }, 2);
        } else {
            this.scheduleOnce(() => this._respawnPlayer(), 2);
        }
    }

    private _respawnPlayer() {
        if (!this._player || !this._player.isValid) return;
        const pc = this._player.getComponent(PlayerController);
        if (pc) pc.respawn(-350, GROUND_Y + 50);
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
        this.scheduleOnce(() => {
            if (this._uiMgr) this._uiMgr.showLevelClear();
        }, 2);
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
