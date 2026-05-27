import { getWhiteFrame } from './Constants';

const { ccclass, property } = cc._decorator;

// Spin animation frame names to try in order
const COIN_ANIM_NAMES = ['items_0', 'items_1', 'items_2', 'items_3'];
const COIN_STATIC_NAME = 'items_13';

@ccclass
export default class Coin extends cc.Component {

    @property(cc.SpriteAtlas) atlas: cc.SpriteAtlas = null;

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

        if (this.atlas) {
            this._applyAtlas(this.atlas);
        } else {
            cc.resources.load('Texture/items', cc.SpriteAtlas, (err, atlas: cc.SpriteAtlas) => {
                if (err || !atlas) {
                    // fallback: yellow square
                    this._sprite.spriteFrame = getWhiteFrame();
                    this.node.color = cc.color(255, 215, 0);
                    return;
                }
                this.atlas = atlas;
                this._applyAtlas(atlas);
            });
        }
    }

    private _applyAtlas(atlas: cc.SpriteAtlas) {
        // Try spin frames first
        const frames = COIN_ANIM_NAMES
            .map(n => atlas.getSpriteFrame(n) ?? atlas.getSpriteFrame(n + '.png'))
            .filter(f => !!f) as cc.SpriteFrame[];

        if (frames.length > 0) {
            this._frames = frames;
            this._sprite.spriteFrame = frames[0];
        } else {
            // Fallback to static coin frame
            const f = atlas.getSpriteFrame(COIN_STATIC_NAME)
                   ?? atlas.getSpriteFrame(COIN_STATIC_NAME + '.png');
            if (f) this._sprite.spriteFrame = f;
        }
    }

    update(dt: number) {
        if (this._frames.length <= 1 || !this._sprite) return;
        this._animTimer += dt;
        if (this._animTimer >= 0.12) {
            this._animTimer = 0;
            this._animFrame = (this._animFrame + 1) % this._frames.length;
            this._sprite.spriteFrame = this._frames[this._animFrame];
        }
    }
}
