import { ANIM_GOOMBA_WALK, ANIM_GOOMBA_DEAD } from './Constants';

const { ccclass, property } = cc._decorator;

@ccclass
export default class EnemyGoomba extends cc.Component {

    @property(cc.SpriteAtlas) atlas: cc.SpriteAtlas = null;

    private _rb: cc.RigidBody = null;
    private _sprite: cc.Sprite = null;
    private _physNode: cc.Node = null;
    private _playerNode: cc.Node = null;
    private _speed: number = 60;
    private _dir: number = -1;
    isDead: boolean = false;
    private _animFrame: number = 0;
    private _animTimer: number = 0;
    private _animFPS: number = 6;

    onLoad() {
        const p = this.node.parent;
        this._rb = this.getComponent(cc.RigidBody) || (p && p.getComponent(cc.RigidBody));
        this._sprite = this.getComponent(cc.Sprite) || (p && p.getComponent(cc.Sprite));
        this._physNode = this._rb ? this._rb.node : (p || this.node);
        if (this._sprite) this._sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;

        if (this.atlas) {
            this._applyFrame(ANIM_GOOMBA_WALK[0]);
        } else {
            cc.resources.load('Texture/Goomba', cc.SpriteAtlas, (err, atlas: cc.SpriteAtlas) => {
                if (err || !atlas) { cc.error('[Goomba] atlas load failed', err); return; }
                this.atlas = atlas;
                this._applyFrame(ANIM_GOOMBA_WALK[0]);
            });
        }
    }

    start() {
        let gw: cc.Node = this.node.parent;
        while (gw && gw.name.trim() !== 'GameWorld') gw = gw.parent;
        if (gw) this._playerNode = gw.getChildByName('Player');
    }

    private _applyFrame(name: string) {
        if (!this._sprite || !this.atlas) return;
        const frame = this.atlas.getSpriteFrame(name)
                   ?? this.atlas.getSpriteFrame(name + '.png');
        if (frame) this._sprite.spriteFrame = frame;
    }

    update(dt: number) {
        if (this.isDead) return;

        if (this._playerNode && this._physNode) {
            this._dir = this._playerNode.x > this._physNode.x ? 1 : -1;
            this._physNode.scaleX = this._dir > 0
                ? Math.abs(this._physNode.scaleX)
                : -Math.abs(this._physNode.scaleX);
        }

        if (this._rb) {
            this._rb.linearVelocity = cc.v2(this._speed * this._dir, this._rb.linearVelocity.y);
        }
        this._updateAnimation(dt);
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        if (this._rb) {
            this._rb.linearVelocity = cc.v2(0, 0);
            this._rb.type = cc.RigidBodyType.Static;
        }
        this._applyFrame(ANIM_GOOMBA_DEAD[0]);
        cc.tween(this._physNode || this.node)
            .to(0.1, { height: 10 })
            .delay(0.3)
            .call(() => {
                const target = this._physNode || this.node;
                if (target.isValid) target.destroy();
            })
            .start();
    }

    private _updateAnimation(dt: number) {
        if (ANIM_GOOMBA_WALK.length <= 1) return;
        this._animTimer += dt;
        if (this._animTimer >= 1 / this._animFPS) {
            this._animTimer = 0;
            this._animFrame = (this._animFrame + 1) % ANIM_GOOMBA_WALK.length;
            this._applyFrame(ANIM_GOOMBA_WALK[this._animFrame]);
        }
    }
}
