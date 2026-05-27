const { ccclass, property } = cc._decorator;

@ccclass
export default class Coin extends cc.Component {

    @property(cc.SpriteAtlas) atlas: cc.SpriteAtlas = null;
    /** Frame names inside the atlas for spin animation (e.g. items_0, items_1, items_2, items_3) */
    @property([cc.String]) frameNames: string[] = [];

    private _sprite: cc.Sprite = null;
    private _frames: cc.SpriteFrame[] = [];
    private _animTimer: number = 0;
    private _animFrame: number = 0;

    onLoad() {
        this._sprite = this.getComponent(cc.Sprite);
        if (!this._sprite) {
            this._sprite = this.node.addComponent(cc.Sprite);
            this._sprite.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        }
        this._loadFrames();
    }

    private _loadFrames() {
        if (!this.atlas || this.frameNames.length === 0) return;
        this._frames = this.frameNames
            .map(n => this.atlas.getSpriteFrame(n) ?? this.atlas.getSpriteFrame(n + '.png'))
            .filter(f => !!f) as cc.SpriteFrame[];
        if (this._frames.length > 0) this._sprite.spriteFrame = this._frames[0];
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
