const { ccclass } = cc._decorator;

@ccclass
export default class LevelSelectController extends cc.Component {

    onLevel1Button() {
        cc.director.loadScene('GameScene');
    }

    onBackButton() {
        cc.director.loadScene('StartMenu');
    }
}
