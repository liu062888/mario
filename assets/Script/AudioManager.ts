const { ccclass, property } = cc._decorator;

@ccclass
export default class AudioManager extends cc.Component {

    private static _instance: AudioManager = null;
    public static get instance(): AudioManager { return AudioManager._instance; }

    private _bgmId: number = -1;
    private _atlasLoaded: boolean = false;

    onLoad() {
        if (AudioManager._instance && AudioManager._instance !== this) {
            this.node.destroy();
            return;
        }
        AudioManager._instance = this;
        cc.game.addPersistRootNode(this.node);
    }

    onDestroy() {
        if (AudioManager._instance === this) AudioManager._instance = null;
    }

    playBGM(path: string, loop: boolean = true) {
        if (this._bgmId >= 0) cc.audioEngine.stopMusic();
        cc.resources.load(path, cc.AudioClip, (err, clip: cc.AudioClip) => {
            if (err || !clip) { cc.warn('BGM load fail:', path, err); return; }
            this._bgmId = cc.audioEngine.playMusic(clip, loop);
        });
    }

    stopBGM() {
        if (this._bgmId >= 0) {
            cc.audioEngine.stopMusic();
            this._bgmId = -1;
        }
    }

    playSFX(path: string) {
        cc.resources.load(path, cc.AudioClip, (err, clip: cc.AudioClip) => {
            if (err || !clip) return;
            cc.audioEngine.playEffect(clip, false);
        });
    }
}
