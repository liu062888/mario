import GameManager from './GameManager';
import AudioManager from './AudioManager';

const { ccclass, property } = cc._decorator;

@ccclass
export default class FlagPole extends cc.Component {

    @property(cc.Node) flagNode: cc.Node = null;

    private _triggered: boolean = false;
    private _playerNode: cc.Node = null;

    onLoad() {
        this.scheduleOnce(() => {
            let rb = this.getComponent(cc.RigidBody);
            if (!rb) rb = this.node.addComponent(cc.RigidBody);
            rb.type = cc.RigidBodyType.Static;
            if ((rb as any)._body) (rb as any)._body.SetType(0);
        }, 0);
    }

    start() {
        let gw: cc.Node = this.node.parent;
        while (gw && gw.name.trim() !== 'GameWorld') gw = gw.parent;
        if (gw) this._playerNode = gw.getChildByName('Player');
    }

    update(_dt: number) {
        if (this._triggered || !this._playerNode) return;

        let px = 0, py = 0;
        let n: cc.Node = this._playerNode;
        while (n && n.name !== 'Canvas') { px += n.x; py += n.y; n = n.parent; }

        const dx = Math.abs(px - this.node.x);
        const poleHalfH = this.node.height / 2;
        const inVertRange = py >= this.node.y - poleHalfH && py <= this.node.y + poleHalfH;

        if (dx < 3 && inVertRange) {
            this._triggered = true;
            this._onPlayerReach(this._playerNode);
        }
    }

    private _onPlayerReach(playerNode: cc.Node) {
        // 停 BGM
        AudioManager.instance && AudioManager.instance.stopBGM();
        AudioManager.instance && AudioManager.instance.playSFX('Audio/levelClear');

        // 凍結玩家
        const rb = playerNode.getComponent(cc.RigidBody)
               || (playerNode.parent && playerNode.parent.getComponent(cc.RigidBody));
        if (rb) {
            rb.linearVelocity = cc.v2(0, 0);
            rb.type = cc.RigidBodyType.Static;
        }

        // 通知 GameManager 停止計時、加分
        const gm = GameManager.instance;
        if (gm) {
            gm.isLevelClear = true;
            gm.addScore(Math.floor(gm.timeLeft) * 50);
        }

        // 3 秒後跳回主選單
        this.scheduleOnce(() => {
            cc.director.loadScene('StartMenu');
        }, 3);
    }
}
