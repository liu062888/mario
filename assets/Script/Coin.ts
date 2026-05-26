const { ccclass } = cc._decorator;

// Marker component — coin collection is handled by PlayerController._checkCoinCollisions
@ccclass
export default class Coin extends cc.Component {

    private _animTimer: number = 0;
    private _animFrame: number = 0;
    private _frames: cc.SpriteFrame[] = [];
    private _sprite: cc.Sprite = null;

    onLoad() {
        this._sprite = this.getComponent(cc.Sprite);
    }

    /** Called by GameManager after atlas is loaded. */
    setFrames(frames: cc.SpriteFrame[]) {
        this._frames = frames;
        if (frames.length > 0 && this._sprite) this._sprite.spriteFrame = frames[0];
    }

    update(dt: number) {
        if (this._frames.length <= 1 || !this._sprite) return;
        this._animTimer += dt;
        if (this._animTimer >= 0.1) {
            this._animTimer = 0;
            this._animFrame = (this._animFrame + 1) % this._frames.length;
            this._sprite.spriteFrame = this._frames[this._animFrame];
        }
    }
}
