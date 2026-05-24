import AudioManager from './AudioManager';
import GameManager from './GameManager';
import {
    PLAYER_SPEED, PLAYER_JUMP_FORCE, SCALE, CANVAS_W, LEVEL_WIDTH,
    MarioSize, PlayerState,
    ANIM_SMALL_IDLE, ANIM_SMALL_WALK, ANIM_SMALL_JUMP, ANIM_SMALL_DEAD,
    ANIM_BIG_IDLE, ANIM_BIG_WALK, ANIM_BIG_JUMP, ANIM_BIG_DEAD,
    GROUND_Y
} from './Constants';

const { ccclass, property } = cc._decorator;

@ccclass
export default class PlayerController extends cc.Component {

    @property(cc.SpriteAtlas) smallAtlas: cc.SpriteAtlas = null;
    @property(cc.SpriteAtlas) bigAtlas: cc.SpriteAtlas = null;
    @property(cc.Node) gameWorld: cc.Node = null;

    private _rb: cc.RigidBody = null;
    private _sprite: cc.Sprite = null;
    private _col: cc.PhysicsBoxCollider = null;
    private _state: PlayerState = PlayerState.IDLE;
    private _size: MarioSize = MarioSize.SMALL;
    private _groundContacts: number = 0;
    private _isDead: boolean = false;
    private _isInvincible: boolean = false;
    private _facingRight: boolean = true;
    private _animFrame: number = 0;
    private _animTimer: number = 0;
    private _currentFrames: string[] = ANIM_SMALL_IDLE;
    private _jumpPressed: boolean = false;

    // Key state tracking
    private _keys: { [code: number]: boolean } = {};

    onLoad() {
        this._rb = this.getComponent(cc.RigidBody);
        this._sprite = this.getComponent(cc.Sprite);
        this._col = this.getComponent(cc.PhysicsBoxCollider);

        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this._onKeyUp, this);
    }

    onDestroy() {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this._onKeyUp, this);
    }

    private _onKeyDown(event: cc.Event.EventKeyboard) {
        this._keys[event.keyCode] = true;
        const k = event.keyCode;
        const isJump = k === cc.macro.KEY.space || k === cc.macro.KEY.up || k === cc.macro.KEY.w;
        if (isJump && this._groundContacts > 0 && !this._isDead && !this._jumpPressed) {
            this._doJump();
        }
    }

    private _onKeyUp(event: cc.Event.EventKeyboard) {
        this._keys[event.keyCode] = false;
        const k = event.keyCode;
        if (k === cc.macro.KEY.space || k === cc.macro.KEY.up || k === cc.macro.KEY.w) {
            this._jumpPressed = false;
        }
    }

    private _isDown(code: number): boolean {
        return !!this._keys[code];
    }

    private _doJump() {
        if (!this._rb) return;
        this._jumpPressed = true;
        const vx = this._rb.linearVelocity.x;
        this._rb.linearVelocity = cc.v2(vx, PLAYER_JUMP_FORCE);
        this._groundContacts = 0;
        this._setState(PlayerState.JUMP);
        AudioManager.instance && AudioManager.instance.playSFX('Audio/jump');
    }

    update(dt: number) {
        if (this._isDead) {
            this._updateCamera();
            return;
        }
        this._handleMovement();
        this._updateAnimation(dt);
        this._updateCamera();

        // Fall-death: below world
        if (this.node.y < GROUND_Y - 300) {
            this._die();
        }

        // Off left edge
        if (this.node.x < -CANVAS_W) {
            this._die();
        }
    }

    private _handleMovement() {
        if (!this._rb) return;
        const leftDown = this._isDown(cc.macro.KEY.left) || this._isDown(cc.macro.KEY.a);
        const rightDown = this._isDown(cc.macro.KEY.right) || this._isDown(cc.macro.KEY.d);

        let vx = this._rb.linearVelocity.x;

        if (leftDown) {
            vx = -PLAYER_SPEED;
            if (this._facingRight) {
                this._facingRight = false;
                this.node.scaleX = -SCALE;
            }
        } else if (rightDown) {
            vx = PLAYER_SPEED;
            if (!this._facingRight) {
                this._facingRight = true;
                this.node.scaleX = SCALE;
            }
        } else {
            vx *= 0.8;
            if (Math.abs(vx) < 3) vx = 0;
        }

        this._rb.linearVelocity = cc.v2(vx, this._rb.linearVelocity.y);

        // Update walk/idle state (don't override JUMP while in air)
        if (this._groundContacts > 0 && this._state !== PlayerState.DEAD) {
            if (Math.abs(vx) > 5) this._setState(PlayerState.WALK);
            else this._setState(PlayerState.IDLE);
        }
    }

    onBeginContact(contact: cc.PhysicsContact, selfCol: cc.PhysicsCollider, otherCol: cc.PhysicsCollider) {
        if (this._isDead) return;
        const otherNode = otherCol.node;
        const manifold = contact.getWorldManifold();
        if (!manifold) return;

        // Determine normal direction relative to player (pointing away from other body)
        const isSelf = contact.colliderA === selfCol;
        const ny = isSelf ? manifold.normal.y : -manifold.normal.y;

        // Ground detection: other object's surface is below player (normal points down from self's perspective = up from world)
        if (ny > 0.5) {
            const name = otherNode.name;
            if (name === 'Ground' || name.startsWith('Platform') || name === 'QuestionBlock') {
                this._groundContacts++;
                if (this._state === PlayerState.JUMP) this._setState(PlayerState.IDLE);
            }
        }

        if (otherNode.name === 'Goomba') {
            this._handleEnemyContact(otherNode, ny);
        }

        if (otherNode.name === 'Mushroom') {
            this._collectMushroom();
            otherNode.destroy();
        }

        if (otherNode.name === 'FlagPole') {
            GameManager.instance && GameManager.instance.onLevelClear();
        }

        if (otherNode.name === 'DeathZone') {
            this._die();
        }
    }

    onEndContact(_contact: cc.PhysicsContact, _selfCol: cc.PhysicsCollider, otherCol: cc.PhysicsCollider) {
        const name = otherCol.node.name;
        if (name === 'Ground' || name.startsWith('Platform') || name === 'QuestionBlock') {
            this._groundContacts = Math.max(0, this._groundContacts - 1);
            if (this._groundContacts === 0 && this._state !== PlayerState.JUMP && this._state !== PlayerState.DEAD) {
                this._setState(PlayerState.JUMP);
            }
        }
    }

    private _handleEnemyContact(enemyNode: cc.Node, _ny: number) {
        if (this._isInvincible) return;
        const playerBottom = this.node.y - this.node.height / 2;
        const enemyCenterY = enemyNode.y;

        if (playerBottom >= enemyCenterY - 8 && this._rb.linearVelocity.y <= 10) {
            // Stomp!
            const enemy = enemyNode.getComponent('EnemyGoomba') as any;
            if (enemy && typeof enemy.die === 'function') enemy.die();
            this._rb.linearVelocity = cc.v2(this._rb.linearVelocity.x, PLAYER_JUMP_FORCE * 0.65);
            this._setState(PlayerState.JUMP);
            GameManager.instance && GameManager.instance.addScore(100);
            AudioManager.instance && AudioManager.instance.playSFX('Audio/stomp');
        } else {
            this._getHurt();
        }
    }

    private _getHurt() {
        if (this._isInvincible || this._isDead) return;
        if (this._size === MarioSize.BIG) {
            this._shrink();
        } else {
            this._die();
        }
    }

    private _shrink() {
        this._size = MarioSize.SMALL;
        this._isInvincible = true;
        this.node.height = 16 * SCALE;
        if (this._col) {
            this._col.size = cc.size(16 * SCALE - 4, 16 * SCALE);
            this._col.apply();
        }
        AudioManager.instance && AudioManager.instance.playSFX('Audio/powerDown');
        let blinks = 0;
        const blinkCb = () => {
            this.node.opacity = this.node.opacity === 255 ? 80 : 255;
            if (++blinks >= 20) {
                this.unschedule(blinkCb);
                this.node.opacity = 255;
                this._isInvincible = false;
            }
        };
        this.schedule(blinkCb, 0.1);
    }

    _die() {
        if (this._isDead) return;
        this._isDead = true;
        this._groundContacts = 0;
        this._setState(PlayerState.DEAD);
        if (this._col) this._col.enabled = false;
        if (this._rb) {
            this._rb.linearVelocity = cc.v2(0, PLAYER_JUMP_FORCE * 0.7);
            this._rb.fixedRotation = true;
        }
        this.scheduleOnce(() => {
            GameManager.instance && GameManager.instance.onPlayerDied();
        }, 2.5);
    }

    private _collectMushroom() {
        if (this._size === MarioSize.BIG) return;
        this._size = MarioSize.BIG;
        const bigH = 26 * SCALE;
        this.node.height = bigH;
        if (this._col) {
            this._col.size = cc.size(16 * SCALE - 4, bigH);
            this._col.apply();
        }
        AudioManager.instance && AudioManager.instance.playSFX('Audio/PowerUp');
    }

    respawn(x: number, y: number) {
        this._isDead = false;
        this._isInvincible = false;
        this._jumpPressed = false;
        this._groundContacts = 0;
        this._size = MarioSize.SMALL;
        this.node.height = 16 * SCALE;
        this.node.opacity = 255;
        this._keys = {};
        if (this._col) {
            this._col.enabled = true;
            this._col.size = cc.size(16 * SCALE - 4, 16 * SCALE);
            this._col.apply();
        }
        if (this._rb) {
            this._rb.linearVelocity = cc.v2(0, 0);
        }
        this.node.setPosition(x, y + this.node.height / 2);
        this._setState(PlayerState.IDLE);
    }

    private _setState(s: PlayerState) {
        if (this._state === s) return;
        this._state = s;
        this._animFrame = 0;
        this._animTimer = 0;
        const big = this._size === MarioSize.BIG;
        switch (s) {
            case PlayerState.IDLE:  this._currentFrames = big ? ANIM_BIG_IDLE : ANIM_SMALL_IDLE; break;
            case PlayerState.WALK:  this._currentFrames = big ? ANIM_BIG_WALK : ANIM_SMALL_WALK; break;
            case PlayerState.JUMP:  this._currentFrames = big ? ANIM_BIG_JUMP : ANIM_SMALL_JUMP; break;
            case PlayerState.DEAD:  this._currentFrames = big ? ANIM_BIG_DEAD : ANIM_SMALL_DEAD; break;
        }
        this._applyFrame();
    }

    private _updateAnimation(dt: number) {
        if (this._currentFrames.length <= 1) return;
        this._animTimer += dt;
        if (this._animTimer >= 0.12) {
            this._animTimer = 0;
            this._animFrame = (this._animFrame + 1) % this._currentFrames.length;
            this._applyFrame();
        }
    }

    private _applyFrame() {
        if (!this._sprite) return;
        const atlas = this._size === MarioSize.BIG ? this.bigAtlas : this.smallAtlas;
        if (!atlas) return;
        const frame = atlas.getSpriteFrame(this._currentFrames[this._animFrame]);
        if (frame) this._sprite.spriteFrame = frame;
    }

    private _updateCamera() {
        if (!this.gameWorld) return;
        const px = this.node.x;
        const halfW = CANVAS_W / 2;
        let worldX = -(px - halfW * 0.4);
        worldX = Math.min(0, Math.max(worldX, -(LEVEL_WIDTH - CANVAS_W)));
        this.gameWorld.x = worldX;
    }
}
