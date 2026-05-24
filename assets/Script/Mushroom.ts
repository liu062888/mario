const { ccclass } = cc._decorator;

@ccclass
export default class Mushroom extends cc.Component {

    private _rb: cc.RigidBody = null;
    private _speed: number = 120;
    private _dir: number = 1;

    onLoad() {
        this._rb = this.getComponent(cc.RigidBody);
        this.scheduleOnce(() => {
            if (this._rb) this._rb.linearVelocity = cc.v2(this._speed * this._dir, 0);
        }, 0.1);
    }

    update(_dt: number) {
        if (!this._rb) return;
        this._rb.linearVelocity = cc.v2(this._speed * this._dir, this._rb.linearVelocity.y);
    }

    onBeginContact(contact: cc.PhysicsContact, selfCollider: cc.PhysicsCollider, _other: cc.PhysicsCollider) {
        const manifold = contact.getWorldManifold();
        if (!manifold) return;
        const isSelf = contact.colliderA === selfCollider;
        const nx = isSelf ? manifold.normal.x : -manifold.normal.x;
        if (Math.abs(nx) > 0.6) {
            this._dir *= -1;
        }
    }
}
