import { ANIM_GOOMBA_WALK, ANIM_GOOMBA_DEAD } from './Constants';

const { ccclass, property } = cc._decorator;

@ccclass
export default class EnemyGoomba extends cc.Component {

    @property(cc.SpriteAtlas) atlas: cc.SpriteAtlas = null;

    private _rb: cc.RigidBody = null;
    private _sprite: cc.Sprite = null;
    private _speed: number = 100;
    private _dir: number = -1; // -1 = left, 1 = right
    private _isDead: boolean = false;
    private _animFrame: number = 0;
    private _animTimer: number = 0;
    private _animFPS: number = 6;

    onLoad() {
        this._rb = this.getComponent(cc.RigidBody);
        this._sprite = this.getComponent(cc.Sprite);
        if (this._sprite && this.atlas) {
            const frame = this.atlas.getSpriteFrame(ANIM_GOOMBA_WALK[0]);
            if (frame) this._sprite.spriteFrame = frame;
            this._sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        }
    }

    update(dt: number) {
        if (this._isDead) return;
        this._rb.linearVelocity = cc.v2(this._speed * this._dir, this._rb.linearVelocity.y);
        this._updateAnimation(dt);
    }

    die() {
        if (this._isDead) return;
        this._isDead = true;
        this._rb.linearVelocity = cc.v2(0, 0);
        this._rb.type = cc.RigidBodyType.Static;
        if (this._sprite && this.atlas) {
            const frame = this.atlas.getSpriteFrame(ANIM_GOOMBA_DEAD[0]);
            if (frame) this._sprite.spriteFrame = frame;
        }
        // Squish: shrink height
        cc.tween(this.node)
            .to(0.1, { height: 10 })
            .delay(0.3)
            .call(() => { if (this.node.isValid) this.node.destroy(); })
            .start();
    }

    private _updateAnimation(dt: number) {
        if (ANIM_GOOMBA_WALK.length <= 1) return;
        this._animTimer += dt;
        if (this._animTimer >= 1 / this._animFPS) {
            this._animTimer = 0;
            this._animFrame = (this._animFrame + 1) % ANIM_GOOMBA_WALK.length;
            if (this._sprite && this.atlas) {
                const frame = this.atlas.getSpriteFrame(ANIM_GOOMBA_WALK[this._animFrame]);
                if (frame) this._sprite.spriteFrame = frame;
            }
        }
    }

    onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, _other: cc.PhysicsCollider) {
        if (this._isDead) return;
        const manifold = contact.getWorldManifold();
        if (!manifold) return;
        const nx = manifold.normal.x;
        const isSelf = contact.colliderA === selfCollider;
        const normalX = isSelf ? nx : -nx;

        // Hit a wall or platform on the side → turn around
        if (Math.abs(normalX) > 0.6) {
            this._dir *= -1;
            this.node.scaleX = this._dir > 0 ? Math.abs(this.node.scaleX) : -Math.abs(this.node.scaleX);
        }
    }
}
