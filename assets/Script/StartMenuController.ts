import AudioManager from './AudioManager';

const { ccclass } = cc._decorator;

@ccclass
export default class StartMenuController extends cc.Component {

    onLoad() {
        AudioManager.instance && AudioManager.instance.playBGM('Audio/bgm_2');
    }

    onStartButton() {
        cc.director.loadScene('LevelSelect');
    }
}
