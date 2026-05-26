import AudioManager from './AudioManager';

const { ccclass } = cc._decorator;

@ccclass
export default class LevelSelectController extends cc.Component {

    onLoad() {
        AudioManager.instance && AudioManager.instance.playBGM('Audio/bgm_2');
    }

    onLevel1Button() {
        cc.director.loadScene('GameScene');
    }

    onLevel2Button() {
        // 第二關尚未完成，目前導向同一關卡
        cc.director.loadScene('GameScene');
    }

    onBackButton() {
        cc.director.loadScene('StartMenu');
    }
}
