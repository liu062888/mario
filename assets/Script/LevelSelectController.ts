const { ccclass } = cc._decorator;

@ccclass
export default class LevelSelectController extends cc.Component {

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

        // Title
        const title = new cc.Node('Title');
        title.setPosition(0, 220);
        const tl = title.addComponent(cc.Label);
        tl.string = 'SELECT LEVEL';
        tl.fontSize = 60;
        tl.fontFamily = 'Arial';
        tl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        title.color = cc.color(255, 220, 0);
        canvas.addChild(title, 5);

        // Level 1 button
        this._makeButton(canvas, 'WORLD  1-1', -100, 60, () => this.onLevel1Button());

        // More levels (locked)
        this._makeLocked(canvas, 'WORLD  1-2', 100, 60);

        // Back button
        this._makeButton(canvas, '← BACK', 0, -80, () => this.onBackButton(), cc.color(80, 80, 80));

        // Show coin count / best score placeholder
        const info = new cc.Node('Info');
        info.setPosition(0, -190);
        const il = info.addComponent(cc.Label);
        il.string = 'Complete World 1-1 to unlock more levels!';
        il.fontSize = 22;
        il.fontFamily = 'Arial';
        il.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        info.color = cc.color(200, 200, 200);
        canvas.addChild(info, 5);
    }

    private _makeButton(parent: cc.Node, text: string, x: number, y: number,
                        cb: () => void, color: cc.Color = cc.color(220, 90, 0)) {
        const btn = new cc.Node(text);
        btn.width = 280; btn.height = 70;
        btn.setPosition(x, y);
        btn.color = color;
        const bgSp = btn.addComponent(cc.Sprite);
        bgSp.sizeMode = cc.Sprite.SizeMode.CUSTOM;

        const lNode = new cc.Node('L');
        lNode.width = 280; lNode.height = 70;
        const lbl = lNode.addComponent(cc.Label);
        lbl.string = text;
        lbl.fontSize = 30;
        lbl.fontFamily = 'Arial';
        lbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        lbl.verticalAlign = cc.Label.VerticalAlign.CENTER;
        lNode.color = cc.color(255, 255, 255);
        btn.addChild(lNode);

        const button = btn.addComponent(cc.Button);
        button.transition = cc.Button.Transition.COLOR;
        button.normalColor = color;
        button.hoverColor = cc.color(
            Math.min(color.r + 40, 255), Math.min(color.g + 40, 255), Math.min(color.b + 40, 255));
        button.pressedColor = cc.color(
            Math.max(color.r - 40, 0), Math.max(color.g - 40, 0), Math.max(color.b - 40, 0));
        button.duration = 0.1;
        button.node.on('click', cb, this);
        parent.addChild(btn, 5);
    }

    private _makeLocked(parent: cc.Node, text: string, x: number, y: number) {
        const btn = new cc.Node(text);
        btn.width = 280; btn.height = 70;
        btn.setPosition(x, y);
        btn.color = cc.color(60, 60, 60);
        const bgSp = btn.addComponent(cc.Sprite);
        bgSp.sizeMode = cc.Sprite.SizeMode.CUSTOM;

        const lNode = new cc.Node('L');
        lNode.width = 280; lNode.height = 70;
        const lbl = lNode.addComponent(cc.Label);
        lbl.string = `🔒 ${text}`;
        lbl.fontSize = 28;
        lbl.fontFamily = 'Arial';
        lbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        lbl.verticalAlign = cc.Label.VerticalAlign.CENTER;
        lNode.color = cc.color(160, 160, 160);
        btn.addChild(lNode);
        parent.addChild(btn, 5);
    }

    onLevel1Button() {
        cc.director.loadScene('GameScene');
    }

    onBackButton() {
        cc.director.loadScene('StartMenu');
    }
}
