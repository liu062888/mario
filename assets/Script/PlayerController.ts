import AudioManager from './AudioManager';
import GameManager from './GameManager';
import EnemyGoomba from './EnemyGoomba';
import QuestionBlock from './QuestionBlock';
import {
    PLAYER_SPEED, PLAYER_JUMP_FORCE, SCALE, CANVAS_W, LEVEL_WIDTH,
    MarioSize, PlayerState,
    ANIM_SMALL_IDLE, ANIM_SMALL_WALK, ANIM_SMALL_JUMP, ANIM_SMALL_DEAD,
    ANIM_BIG_IDLE, ANIM_BIG_WALK, ANIM_BIG_JUMP, ANIM_BIG_DEAD,
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
    private _size: MarioSize = MarioSize.BIG;
    private _groundContacts: number = 0;
    private _isDead: boolean = false;
    private _isInvincible: boolean = false;
    private _facingRight: boolean = true;
    private _animFrame: number = 0;
    private _animTimer: number = 0;
    private _currentFrames: string[] = ANIM_BIG_IDLE;
    private _jumpPressed: boolean = false;
    private _jumpCooldown: number = 0;
    private _blockHitCooldown: number = 0;
    private _hurtCooldown: number = 0;
    private _trackX: number = 0;
    private _trackY: number = 0;
    private _cameraX: number = 0;
    private _uiNode: cc.Node = null;

    // Key state tracking
    private _keys: { [code: number]: boolean } = {};

    onLoad() {
        this._rb = this.getComponent(cc.RigidBody)
            || (this.node.parent && this.node.parent.getComponent(cc.RigidBody));
        this._sprite = this.getComponent(cc.Sprite);
        this._col = this.getComponent(cc.PhysicsBoxCollider)
            || (this.node.parent && this.node.parent.getComponent(cc.PhysicsBoxCollider));
        const physNode = this._col ? this._col.node : this.node;
        physNode.group = 'player';

        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this._onKeyUp, this);
    }

    start() {
        if (!this.gameWorld) {
            let p = this.node.parent;
            while (p) {
                if (p.name.trim() === 'GameWorld') { this.gameWorld = p; break; }
                p = p.parent;
            }
        }
        // Sum parent chain for initial world position (safe: scaleX=1 at start, nothing moved yet)
        let wx = 0, wy = 0;
        let n: cc.Node = this.node;
        while (n && n.name !== 'Canvas') { wx += n.x; wy += n.y; n = n.parent; }
        this._trackX = wx;
        this._trackY = wy;

        this._cameraX = 0;
        this._uiNode = cc.find('Canvas/UIManager');
        const camera = cc.Camera.main;
        if (camera) camera.node.x = this._cameraX;
        if (this._uiNode) this._uiNode.x = this._cameraX;
        this._applyFrame();
        // Set BIG Mario's initial physical size
        const bigH = 26 * SCALE;
        this.node.height = bigH;
        if (this._col) {
            this._col.size = cc.size(16 * SCALE - 4, bigH);
            this._col.apply();
        }
    }

    // Fallback: use velocity when onBeginContact is not firing
    private _isOnGround(): boolean {
        if (this._groundContacts > 0) return true;
        if (this._jumpCooldown > 0) return false;
        if (!this._rb) return false;
        const vy = this._rb.linearVelocity.y;
        return vy >= -30 && vy <= 5;
    }

    onDestroy() {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this._onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this._onKeyUp, this);
    }

    private _onKeyDown(event: cc.Event.EventKeyboard) {
        this._keys[event.keyCode] = true;
        const k = event.keyCode;
        const isJump = k === cc.macro.KEY.space || k === cc.macro.KEY.up || k === cc.macro.KEY.w;
        if (isJump && this._isOnGround() && !this._isDead && !this._jumpPressed) {
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
        this._jumpCooldown = 0.4;
        const vx = this._rb.linearVelocity.x;
        this._rb.linearVelocity = cc.v2(vx, PLAYER_JUMP_FORCE);
        this._groundContacts = 0;
        this._setState(PlayerState.JUMP);
        AudioManager.instance && AudioManager.instance.playSFX('Audio/jump');
    }

    update(dt: number) {
        if (this._jumpCooldown > 0) this._jumpCooldown -= dt;
        if (this._blockHitCooldown > 0) this._blockHitCooldown -= dt;
        if (this._hurtCooldown > 0) this._hurtCooldown -= dt;
        if (this._isDead) return;
        this._handleMovement();
        this._updateAnimation(dt);
        this._checkGoombaCollisions();
        this._checkBlockCollisions();
        this._checkMushroomCollisions();
    }

    private _checkGoombaCollisions() {
        if (this._isInvincible || !this.gameWorld) return;
        for (const child of this.gameWorld.children) {
            if (!child.active) continue;
            const enemy = child.getComponent(EnemyGoomba)
                       || (child.children[0] && child.children[0].getComponent(EnemyGoomba));
            if (!enemy || enemy.isDead) continue;

            const playerH = this._size === MarioSize.BIG ? 26 * SCALE : 16 * SCALE;
            const gp = enemy.getWorldPos();
            const dx = Math.abs(this._trackX - gp.x);
            const dy = Math.abs(this._trackY - gp.y);
            // Use physics collider half-sizes (reliable; node.width may be 0 in editor)
            const halfW = (16 * SCALE - 4) / 2 + 16 * SCALE / 2; // 22 + 24 = 46
            const halfH = playerH / 2 + 16 * SCALE / 2 + 8;      // marioHalfH + goombaHalfH + tolerance
            if (dx >= halfW || dy >= halfH) continue;

            const marioFeetY = this._trackY - playerH / 2;
            const isStomp = marioFeetY > gp.y + 5
                         && this._rb && this._rb.linearVelocity.y < -10;

            if (isStomp) {
                enemy.die();
                this._rb.linearVelocity = cc.v2(this._rb.linearVelocity.x, PLAYER_JUMP_FORCE * 0.65);
                this._setState(PlayerState.JUMP);
                GameManager.instance && GameManager.instance.addScore(100);
                AudioManager.instance && AudioManager.instance.playSFX('Audio/stomp');
            } else {
                this._getHurt();
            }
            break;
        }
    }

    private _checkBlockCollisions() {
        if (!this.gameWorld || !this._rb || this._blockHitCooldown > 0) return;
        if (this._rb.linearVelocity.y <= 0) return;
        const playerH = this._size === MarioSize.BIG ? 26 * SCALE : 16 * SCALE;
        const playerTop = this._trackY + playerH / 2;
        for (const child of this.gameWorld.children) {
            if (child.name !== 'QuestionBlock' || !child.active) continue;
            const qb = child.getComponent(QuestionBlock);
            if (!qb) continue;
            const blockBottomY = child.y - child.height / 2;
            if (Math.abs(playerTop - blockBottomY) > 12) continue;
            const dx = Math.abs(this._trackX - child.x);
            if (dx >= (this.node.width + child.width) / 2 - 4) continue;
            qb.activate();
            this._blockHitCooldown = 0.5;
            break;
        }
    }

    private _checkMushroomCollisions() {
        if (!this.gameWorld) return;
        const playerH = this._size === MarioSize.BIG ? 26 * SCALE : 16 * SCALE;
        for (const child of this.gameWorld.children) {
            if (child.name !== 'Mushroom' || !child.active) continue;
            const dx = Math.abs(this._trackX - child.x);
            const dy = Math.abs(this._trackY - child.y);
            if (dx < (this.node.width + child.width) / 2 - 2
             && dy < (playerH + child.height) / 2 - 2) {
                this._collectMushroom();
                child.destroy();
                break;
            }
        }
    }

    lateUpdate(_dt: number) {
        // lateUpdate runs after Box2D step — node.x is the current-frame physics position
        let wx = 0, wy = 0;
        let n: cc.Node = this.node;
        while (n && n.name !== 'Canvas') { wx += n.x; wy += n.y; n = n.parent; }
        this._trackX = wx;
        this._trackY = wy;

        const camera = cc.Camera.main;
        if (camera) {
            const marioScreenX = wx - (this._cameraX - CANVAS_W / 2);
            if (marioScreenX > CANVAS_W * 2 / 3) {
                this._cameraX = wx - CANVAS_W * 2 / 3 + CANVAS_W / 2;
            } else if (marioScreenX < 0) {
                this._cameraX = wx + CANVAS_W / 2;
            }
            this._cameraX = Math.max(0, Math.min(this._cameraX, LEVEL_WIDTH - CANVAS_W / 2));
            camera.node.x = this._cameraX;
            if (this._uiNode) this._uiNode.x = this._cameraX;
        }

        if (this._isDead) return;

        // Fall-death
        if (this._trackY < -480) { this._die(); return; }

        // Left wall — hard clamp at world x = -CANVAS_W/2 (-480)
        const LEFT_BOUND = -CANVAS_W / 2;
        if (this._trackX < LEFT_BOUND) {
            this.node.x -= (this._trackX - LEFT_BOUND);
            this._trackX = LEFT_BOUND;
            if (this._rb && this._rb.linearVelocity.x < 0) {
                this._rb.linearVelocity = cc.v2(0, this._rb.linearVelocity.y);
            }
        }

        // Right wall — hard clamp at world x = LEVEL_WIDTH
        if (this._trackX > LEVEL_WIDTH) {
            this.node.x -= (this._trackX - LEVEL_WIDTH);
            this._trackX = LEVEL_WIDTH;
            if (this._rb && this._rb.linearVelocity.x > 0) {
                this._rb.linearVelocity = cc.v2(0, this._rb.linearVelocity.y);
            }
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
                this.node.scaleX = -1;
            }
        } else if (rightDown) {
            vx = PLAYER_SPEED;
            if (!this._facingRight) {
                this._facingRight = true;
                this.node.scaleX = 1;
            }
        } else {
            vx *= 0.9;
            if (Math.abs(vx) < 10) vx = 0;
        }

        this._rb.linearVelocity = cc.v2(vx, this._rb.linearVelocity.y);

        // Update walk/idle state (don't override JUMP while in air)
        if (this._isOnGround() && this._state !== PlayerState.DEAD) {
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
            if (name === 'Ground' || name === 'GroundPhysics' || name.startsWith('Platform') || name === 'QuestionBlock') {
                this._groundContacts++;
                if (this._state === PlayerState.JUMP) this._setState(PlayerState.IDLE);
            }
        }

        {
            // Check by component, not by name — works even if RigidBody is on a child node
            const enemy = otherNode.getComponent(EnemyGoomba)
                       || (otherNode.parent && otherNode.parent.getComponent(EnemyGoomba));
            if (enemy && !enemy.isDead && !this._isInvincible && !this._isDead && this._hurtCooldown <= 0) {
                const isStomp = ny > 0.6 && this._rb && this._rb.linearVelocity.y < -10;
                if (isStomp) {
                    enemy.die();
                    this._rb.linearVelocity = cc.v2(this._rb.linearVelocity.x, PLAYER_JUMP_FORCE * 0.65);
                    this._setState(PlayerState.JUMP);
                    GameManager.instance && GameManager.instance.addScore(100);
                    AudioManager.instance && AudioManager.instance.playSFX('Audio/stomp');
                } else {
                    this._getHurt();
                }
            }
        }

        if (otherNode.name === 'Mushroom') {
            this._collectMushroom();
            otherNode.destroy();
        }


        if (otherNode.name === 'DeathZone') {
            this._die();
        }
    }

    onPreSolve(contact: cc.PhysicsContact, _selfCol: cc.PhysicsCollider, otherCol: cc.PhysicsCollider) {
        if (!otherCol.node.name.startsWith('Platform')) return;
        const platTopY = otherCol.node.y + otherCol.node.height / 2;
        const playerFeetY = this._trackY - this.node.height / 2;
        if (playerFeetY < platTopY - 4) {
            contact.disabled = true;
        }
    }

    onEndContact(_contact: cc.PhysicsContact, _selfCol: cc.PhysicsCollider, otherCol: cc.PhysicsCollider) {
        const name = otherCol.node.name;
        if (name === 'Ground' || name === 'GroundPhysics' || name.startsWith('Platform') || name === 'QuestionBlock') {
            this._groundContacts = Math.max(0, this._groundContacts - 1);
            if (this._groundContacts === 0 && this._state !== PlayerState.JUMP && this._state !== PlayerState.DEAD) {
                this._setState(PlayerState.JUMP);
            }
        }
    }


    private _getHurt() {
        if (this._isInvincible || this._isDead || this._hurtCooldown > 0) return;
        this._hurtCooldown = 0.5;
        if (this._size === MarioSize.BIG) {
            this._shrink();
        } else {
            this._die();
        }
    }

    private _shrink() {
        this._size = MarioSize.SMALL;
        this._currentFrames = ANIM_SMALL_IDLE;
        this._animFrame = 0;
        this._applyFrame();
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
        this._currentFrames = ANIM_BIG_IDLE;
        this._animFrame = 0;
        this._applyFrame();
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
        this._hurtCooldown = 0;
        this._jumpPressed = false;
        this._groundContacts = 0;
        this._size = MarioSize.BIG;
        const bigH = 26 * SCALE;
        this.node.height = bigH;
        this.node.opacity = 255;
        this._keys = {};
        if (this._col) {
            this._col.enabled = true;
            this._col.size = cc.size(16 * SCALE - 4, bigH);
            this._col.apply();
        }
        if (this._rb) {
            this._rb.linearVelocity = cc.v2(0, 0);
        }
        const newY = y + this.node.height / 2;
        this.node.setPosition(x, newY);
        this._trackX = x;
        this._trackY = newY;
        this._setState(PlayerState.IDLE);
        this._cameraX = 0;
        const camera = cc.Camera.main;
        if (camera) camera.node.x = this._cameraX;
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
        const name = this._currentFrames[this._animFrame];
        const frame = atlas.getSpriteFrame(name)
                   ?? atlas.getSpriteFrame(name + '.png');
        if (frame) this._sprite.spriteFrame = frame;
    }

}

