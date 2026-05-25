import AudioManager from './AudioManager';
import UIManager from './UIManager';
import PlayerController from './PlayerController';
import EnemyGoomba from './EnemyGoomba';
import QuestionBlock from './QuestionBlock';
import {
    CANVAS_W, CANVAS_H, GROUND_Y, GROUND_HALF_H, LEVEL_WIDTH,
    INITIAL_LIVES, INITIAL_TIMER, SCALE, getWhiteFrame,
    ANIM_SMALL_IDLE, ANIM_GOOMBA_WALK
} from './Constants';

const { ccclass, property } = cc._decorator;

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

    @property(cc.SpriteAtlas) marioSmallAtlas: cc.SpriteAtlas = null;
    @property(cc.SpriteAtlas) marioBigAtlas: cc.SpriteAtlas = null;
    @property(cc.SpriteAtlas) goombaAtlas: cc.SpriteAtlas = null;
    @property(cc.SpriteAtlas) itemsAtlas: cc.SpriteAtlas = null;

    private _bgTex: cc.Texture2D = null;
    private _flagTex: cc.Texture2D = null;

    onLoad() {
        GameManager.instance = this;
        this._setupPhysics();
        this._preloadAssets();
    }

    private _setupPhysics() {
        const pm = cc.director.getPhysicsManager();
        pm.enabled = true;
        pm.gravity = cc.v2(0, -980);
        (pm as any).enabledContactListener = true;
    }

    private _preloadAssets() {
        let loaded = 0;
        const total = 3;
        const check = () => { if (++loaded >= total) this._buildScene(); };

        cc.resources.load('Texture/menu_bg', cc.Texture2D, (err, tex: cc.Texture2D) => {
            if (!err && tex) this._bgTex = tex;
            check();
        });
        cc.resources.load('Texture/flag', cc.Texture2D, (err, tex: cc.Texture2D) => {
            if (!err && tex) this._flagTex = tex;
            check();
        });
        cc.resources.loadDir('Texture', cc.SpriteAtlas, (err, atlases: cc.SpriteAtlas[]) => {
            if (err) console.warn('[GM] atlas loadDir err:', err);
            if (atlases) {
                for (const a of atlases) {
                    const n = a.name;
                    if (n === 'mario_small') this.marioSmallAtlas = a;
                    else if (n === 'mario_big') this.marioBigAtlas = a;
                    else if (n === 'Goomba') this.goombaAtlas = a;
                    else if (n === 'items') this.itemsAtlas = a;
                }
            }
            console.log('[GM] atlases — mario_small:', !!this.marioSmallAtlas,
                'mario_big:', !!this.marioBigAtlas,
                'Goomba:', !!this.goombaAtlas,
                'items:', !!this.itemsAtlas);
            if (this.goombaAtlas) {
                const f1 = this.goombaAtlas.getSpriteFrame('Goomba_0.png');
                const f2 = this.goombaAtlas.getSpriteFrame('Goomba_0');
                const all = this.goombaAtlas.getSpriteFrames();
                console.log('[GM] Goomba "Goomba_0.png":', !!f1, '"Goomba_0":', !!f2,
                    'total frames:', all ? all.length : 0,
                    'first name:', all && all[0] ? all[0].name : 'none');
            }
            if (this.itemsAtlas) {
                const f1 = this.itemsAtlas.getSpriteFrame('items_10.png');
                const f2 = this.itemsAtlas.getSpriteFrame('items_10');
                console.log('[GM] items "items_10.png":', !!f1, '"items_10":', !!f2);
            }
            check();
        });
    }

    private _buildScene() {
        this._gameWorld = cc.find('Canvas/GameWorld');
        if (!this._gameWorld) {
            this._gameWorld = new cc.Node('GameWorld');
            cc.find('Canvas').addChild(this._gameWorld);
        }
        const uiNode = cc.find('Canvas/UIManager');
        this._uiMgr = uiNode ? uiNode.getComponent(UIManager) : this.node.parent.getComponent(UIManager);

        this._createBackground();
        this._createGround();
        this._createPlatforms(LEVEL1.platforms);
        this._createQuestionBlocks(LEVEL1.qblocks);
        this._createEnemies(LEVEL1.enemies);
        this._createFlag(LEVEL1.flagX);
        this._createPlayer(-350, GROUND_Y);
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
        const totalW = LEVEL_WIDTH + CANVAS_W;

        // Sky base layer
        const sky = new cc.Node('Sky');
        sky.color = cc.color(92, 148, 252);
        sky.width = totalW;
        sky.height = CANVAS_H + 200;
        sky.x = totalW / 2 - CANVAS_W / 2;
        sky.y = 0;
        const skySp = sky.addComponent(cc.Sprite);
        skySp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        skySp.spriteFrame = getWhiteFrame();
        this._gameWorld.addChild(sky, -20);

        // Tile menu_bg.png across the level
        if (this._bgTex) {
            const tileW = this._bgTex.width * SCALE;
            const tileH = this._bgTex.height * SCALE;
            let posX = -CANVAS_W / 2;
            while (posX < totalW - CANVAS_W / 2) {
                const bg = new cc.Node('BgTile');
                bg.width = tileW;
                bg.height = tileH;
                bg.x = posX + tileW / 2;
                bg.y = GROUND_Y + tileH / 2;
                const sp = bg.addComponent(cc.Sprite);
                sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
                sp.spriteFrame = new cc.SpriteFrame(this._bgTex);
                this._gameWorld.addChild(bg, -10);
                posX += tileW;
            }
        }
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
            if (this.itemsAtlas) {
                const sp = node.getComponent(cc.Sprite) || node.addComponent(cc.Sprite);
                const frame = this.itemsAtlas.getSpriteFrame('items_10');
                if (frame) sp.spriteFrame = frame;
                qb.itemsAtlas = this.itemsAtlas;
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
            const sp = node.addComponent(cc.Sprite);
            sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
            if (this.goombaAtlas) {
                const frame = this.goombaAtlas.getSpriteFrame(ANIM_GOOMBA_WALK[0]);
                sp.spriteFrame = frame || getWhiteFrame();
            } else {
                sp.spriteFrame = getWhiteFrame();
            }

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
            enemy.atlas = this.goombaAtlas;

            this._gameWorld.addChild(node);
        }
    }

    private _createFlag(x: number) {
        const flagH = this._flagTex ? this._flagTex.height * 2 : 240;
        const flagW = this._flagTex ? this._flagTex.width  * 2 : 16;

        const pole = new cc.Node('FlagPole');
        pole.setPosition(x, GROUND_Y + flagH / 2);
        pole.width  = flagW;
        pole.height = flagH;

        const sp = pole.addComponent(cc.Sprite);
        sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        if (this._flagTex) {
            sp.spriteFrame = new cc.SpriteFrame(this._flagTex);
        } else {
            sp.spriteFrame = getWhiteFrame();
            pole.color = cc.color(200, 200, 200);
        }

        const trigger = pole.addComponent(cc.PhysicsBoxCollider);
        trigger.size = cc.size(Math.max(flagW, 40), flagH);
        trigger.sensor = true;
        pole.group = 'item';

        this._gameWorld.addChild(pole);
    }

    private _createPlayer(x: number, y: number) {
        const w = 16 * SCALE, h = 16 * SCALE;
        this._player = new cc.Node('Player');
        this._player.setPosition(x, y + h / 2);
        this._player.width = w;
        this._player.height = h;

        const sp = this._player.addComponent(cc.Sprite);
        sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        if (this.marioSmallAtlas) {
            const frame = this.marioSmallAtlas.getSpriteFrame(ANIM_SMALL_IDLE[0]);
            sp.spriteFrame = frame || getWhiteFrame();
        } else {
            sp.spriteFrame = getWhiteFrame();
        }

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
        pc.smallAtlas = this.marioSmallAtlas;
        pc.bigAtlas = this.marioBigAtlas;
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
        sp.spriteFrame = getWhiteFrame();

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
        if (pc) pc.respawn(-350, GROUND_Y);
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

