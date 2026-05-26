import AudioManager from './AudioManager';
import GameManager from './GameManager';
import Mushroom from './Mushroom';
import { ANIM_QBLOCK_ACTIVE, ANIM_QBLOCK_USED, ANIM_MUSHROOM, SCALE, SCORE_BLOCK_HIT, SCORE_COIN, getWhiteFrame } from './Constants';

const { ccclass, property } = cc._decorator;

@ccclass
export default class QuestionBlock extends cc.Component {

    @property(cc.SpriteAtlas) itemsAtlas: cc.SpriteAtlas = null;
    @property spawnMushroom: boolean = false;

    private _sprite: cc.Sprite = null;
    private _used: boolean = false;
    private _animFrame: number = 0;
    private _animTimer: number = 0;

    onLoad() {
        this._sprite = this.getComponent(cc.Sprite);
        if (this._sprite) this._sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;

        // Force Static after physics initialises (scheduleOnce runs after first frame)
        this.scheduleOnce(() => {
            let rb = this.getComponent(cc.RigidBody);
            if (!rb) rb = this.node.addComponent(cc.RigidBody);
            rb.type = cc.RigidBodyType.Static;
            if ((rb as any)._body) (rb as any)._body.SetType(0); // 0 = b2_staticBody
        }, 0);
        cc.log('[QB] onLoad, node=', this.node.name);

        if (!this.getComponent(cc.PhysicsBoxCollider)) {
            const col = this.node.addComponent(cc.PhysicsBoxCollider);
            col.size = cc.size(this.node.width || 16 * SCALE, this.node.height || 16 * SCALE);
            col.friction = 0;
            col.restitution = 0;
        }

        if (this.itemsAtlas) {
            this._applyFrame(ANIM_QBLOCK_ACTIVE[0]);
        } else {
            cc.resources.load('Texture/items', cc.SpriteAtlas, (err, atlas: cc.SpriteAtlas) => {
                if (err || !atlas) { cc.error('[QB] atlas load failed', err); return; }
                this.itemsAtlas = atlas;
                this._applyFrame(ANIM_QBLOCK_ACTIVE[0]);
            });
        }
    }

    update(dt: number) {
        if (this._used || ANIM_QBLOCK_ACTIVE.length <= 1) return;
        this._animTimer += dt;
        if (this._animTimer >= 0.2) {
            this._animTimer = 0;
            this._animFrame = (this._animFrame + 1) % ANIM_QBLOCK_ACTIVE.length;
            this._applyFrame(ANIM_QBLOCK_ACTIVE[this._animFrame]);
        }
    }

    activate() {
        if (this._used) return;
        this._used = true;
        this.node.name = 'UsedBlock'; // stops proximity check from finding this node again
        this._applyFrame(ANIM_QBLOCK_USED[0]);
        this.node.color = cc.color(120, 100, 60);

        AudioManager.instance && AudioManager.instance.playSFX('Audio/blockHit');
        GameManager.instance && GameManager.instance.addScore(SCORE_BLOCK_HIT);

        const startY = this.node.y;
        cc.tween(this.node)
            .by(0.08, { y: 14 })
            .by(0.08, { y: -14 })
            .call(() => {
                this.node.y = startY;
                if (this.spawnMushroom) this._spawnMushroom();
                else this._spawnCoin();
            })
            .start();
    }

    private _spawnCoin() {
        GameManager.instance && GameManager.instance.addScore(SCORE_COIN);
        AudioManager.instance && AudioManager.instance.playSFX('Audio/coin');

        const coin = new cc.Node('CoinVFX');
        const sz = 16 * SCALE;
        coin.width = sz;
        coin.height = sz;
        coin.setPosition(this.node.x, this.node.y + sz);

        const sp = coin.addComponent(cc.Sprite);
        sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        if (this.itemsAtlas) {
            const frame = this.itemsAtlas.getSpriteFrame('items_13')
                       ?? this.itemsAtlas.getSpriteFrame('items_13.png');
            if (frame) sp.spriteFrame = frame;
        } else {
            sp.spriteFrame = getWhiteFrame();
            coin.color = cc.color(255, 220, 0);
        }

        this.node.parent.addChild(coin);
        cc.tween(coin)
            .by(0.25, { y: 60 })
            .by(0.15, { y: -60 })
            .call(() => { if (coin.isValid) coin.destroy(); })
            .start();
    }

    private _spawnMushroom() {
        const sz = 16 * SCALE;
        const mushNode = new cc.Node('Mushroom');
        mushNode.width = sz;
        mushNode.height = sz;
        mushNode.setPosition(this.node.x, this.node.y + sz);

        const sp = mushNode.addComponent(cc.Sprite);
        sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        if (this.itemsAtlas) {
            const frame = this.itemsAtlas.getSpriteFrame(ANIM_MUSHROOM[0])
                       ?? this.itemsAtlas.getSpriteFrame(ANIM_MUSHROOM[0] + '.png');
            if (frame) sp.spriteFrame = frame;
        } else {
            sp.spriteFrame = getWhiteFrame();
            mushNode.color = cc.color(255, 60, 60);
        }

        const rb = mushNode.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Dynamic;
        rb.fixedRotation = true;

        const col = mushNode.addComponent(cc.PhysicsBoxCollider);
        col.size = cc.size(sz - 4, sz);
        col.density = 0.5;
        col.friction = 0.3;
        col.restitution = 0;

        mushNode.group = 'item';
        mushNode.addComponent(Mushroom);

        this.node.parent.addChild(mushNode);
    }

    private _applyFrame(name: string) {
        if (!this._sprite || !this.itemsAtlas) return;
        const frame = this.itemsAtlas.getSpriteFrame(name)
                   ?? this.itemsAtlas.getSpriteFrame(name + '.png');
        if (frame) this._sprite.spriteFrame = frame;
    }
}
