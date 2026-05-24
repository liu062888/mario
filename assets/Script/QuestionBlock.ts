import AudioManager from './AudioManager';
import GameManager from './GameManager';
import Mushroom from './Mushroom';
import { ANIM_QBLOCK_ACTIVE, ANIM_QBLOCK_USED, ANIM_MUSHROOM, SCALE } from './Constants';

const { ccclass, property } = cc._decorator;

@ccclass
export default class QuestionBlock extends cc.Component {

    @property(cc.SpriteAtlas) itemsAtlas: cc.SpriteAtlas = null;

    private _used: boolean = false;
    private _animFrame: number = 0;
    private _animTimer: number = 0;

    onLoad() {
        const sprite = this.getComponent(cc.Sprite);
        if (sprite) sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
    }

    update(dt: number) {
        if (this._used || !this.itemsAtlas) return;
        this._animTimer += dt;
        if (this._animTimer >= 0.2) {
            this._animTimer = 0;
            this._animFrame = (this._animFrame + 1) % ANIM_QBLOCK_ACTIVE.length;
            const sprite = this.getComponent(cc.Sprite);
            if (sprite) {
                const frame = this.itemsAtlas.getSpriteFrame(ANIM_QBLOCK_ACTIVE[this._animFrame]);
                if (frame) sprite.spriteFrame = frame;
            }
        }
    }

    onBeginContact(contact: cc.PhysicsContact, _selfCol: cc.PhysicsCollider, otherCol: cc.PhysicsCollider) {
        if (this._used) return;
        const manifold = contact.getWorldManifold();
        if (!manifold) return;
        // Normal pointing down into block from below → ny < -0.5 relative to block
        const isSelf = contact.colliderA === _selfCol;
        const ny = isSelf ? manifold.normal.y : -manifold.normal.y;

        if (ny < -0.5 && otherCol.node.name === 'Player') {
            this._activate();
        }
    }

    private _activate() {
        this._used = true;
        this.node.color = cc.color(120, 100, 60);
        const sprite = this.getComponent(cc.Sprite);
        if (sprite && this.itemsAtlas) {
            const frame = this.itemsAtlas.getSpriteFrame(ANIM_QBLOCK_USED[0]);
            if (frame) sprite.spriteFrame = frame;
        }

        AudioManager.instance && AudioManager.instance.playSFX('Audio/powerUpAppear');
        GameManager.instance && GameManager.instance.addScore(50);

        const startY = this.node.y;
        cc.tween(this.node)
            .by(0.08, { y: 14 })
            .by(0.08, { y: -14 })
            .call(() => { this.node.y = startY; this._spawnMushroom(); })
            .start();
    }

    private _spawnMushroom() {
        const sz = 16 * SCALE;
        const mushNode = new cc.Node('Mushroom');
        mushNode.width = sz;
        mushNode.height = sz;
        mushNode.setPosition(this.node.x, this.node.y + sz);
        mushNode.color = cc.color(255, 60, 60);

        const sp = mushNode.addComponent(cc.Sprite);
        sp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        if (this.itemsAtlas) {
            const frame = this.itemsAtlas.getSpriteFrame(ANIM_MUSHROOM[0]);
            if (frame) sp.spriteFrame = frame;
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
}

