import AudioManager from './AudioManager';

const { ccclass, property } = cc._decorator;

@ccclass
export default class StartMenuController extends cc.Component {

    onLoad() {
        const canvas = this.node.parent;

        // Background
        const bg = new cc.Node('Background');
        bg.width = 960; bg.height = 640;
        bg.setPosition(0, 0);
        bg.color = cc.color(20, 40, 120);
        const bgSp = bg.addComponent(cc.Sprite);
        bgSp.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        canvas.addChild(bg, -10);

        cc.resources.load('Texture/menu_bg', cc.Texture2D, (err, tex: cc.Texture2D) => {
            if (err || !tex) return;
            bgSp.spriteFrame = new cc.SpriteFrame(tex);
        });

        // Title label (fallback if image not found)
        const title = new cc.Node('Title');
        title.setPosition(0, 180);
        title.width = 700; title.height = 120;
        const titleLbl = title.addComponent(cc.Label);
        titleLbl.string = 'WEB MARIO';
        titleLbl.fontSize = 80;
        titleLbl.fontFamily = 'Arial';
        titleLbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        title.color = cc.color(255, 220, 0);
        canvas.addChild(title, 5);

        cc.resources.load('Texture/title_0', cc.Texture2D, (err, tex: cc.Texture2D) => {
            if (err || !tex) return;
            title.removeComponent(cc.Label);
            const sp = title.addComponent(cc.Sprite);
            sp.spriteFrame = new cc.SpriteFrame(tex);
            sp.sizeMode = cc.Sprite.SizeMode.RAW;
            title.width = tex.width * 2; title.height = tex.height * 2;
            title.setPosition(0, 155);
        });

        // Subtitle
        const sub = new cc.Node('Subtitle');
        sub.setPosition(0, 80);
        const subLbl = sub.addComponent(cc.Label);
        subLbl.string = 'Press START to play!';
        subLbl.fontSize = 28;
        subLbl.fontFamily = 'Arial';
        subLbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        sub.color = cc.color(255, 255, 255);
        canvas.addChild(sub, 5);

        // Buttons
        this._makeButton(canvas, '▶  START', 0, -20, () => this.onStartButton());
        this._makeButton(canvas, 'LEVEL SELECT', 0, -100, () => this.onLevelSelectButton());

        // Copyright
        const copy = new cc.Node('Copyright');
        copy.setPosition(0, -270);
        const copyLbl = copy.addComponent(cc.Label);
        copyLbl.string = 'CS2410 Software Studio – Web Mario';
        copyLbl.fontSize = 18;
        copyLbl.fontFamily = 'Arial';
        copyLbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        copy.color = cc.color(200, 200, 200);
        canvas.addChild(copy, 5);

        // BGM
        if (AudioManager.instance) {
            AudioManager.instance.playBGM('Audio/bgm_2');
        }
    }

    private _makeButton(parent: cc.Node, text: string, x: number, y: number, cb: () => void) {
        const btn = new cc.Node(text.trim());
        btn.width = 300; btn.height = 60;
        btn.setPosition(x, y);
        btn.color = cc.color(220, 90, 0);

        const bgSp = btn.addComponent(cc.Sprite);
        bgSp.sizeMode = cc.Sprite.SizeMode.CUSTOM;

        const labelNode = new cc.Node('Label');
        labelNode.width = 300; labelNode.height = 60;
        const lbl = labelNode.addComponent(cc.Label);
        lbl.string = text;
        lbl.fontSize = 32;
        lbl.fontFamily = 'Arial';
        lbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        lbl.verticalAlign = cc.Label.VerticalAlign.CENTER;
        labelNode.color = cc.color(255, 255, 255);
        btn.addChild(labelNode);

        const button = btn.addComponent(cc.Button);
        button.transition = cc.Button.Transition.COLOR;
        button.normalColor = cc.color(220, 90, 0);
        button.hoverColor = cc.color(255, 130, 30);
        button.pressedColor = cc.color(160, 60, 0);
        button.disabledColor = cc.color(120, 120, 120, 150);
        button.duration = 0.1;
        button.node.on('click', cb, this);

        parent.addChild(btn, 5);
        return btn;
    }

    onStartButton() {
        cc.director.loadScene('GameScene');
    }

    onLevelSelectButton() {
        cc.director.loadScene('LevelSelect');
    }
}

