import GameManager from './GameManager';

const { ccclass, property } = cc._decorator;

@ccclass
export default class UIManager extends cc.Component {

    private _scoreLabel: cc.Label = null;
    private _livesLabel: cc.Label = null;
    private _timerLabel: cc.Label = null;
    private _gameOverPanel: cc.Node = null;
    private _levelClearPanel: cc.Node = null;

    onLoad() {
        const canvas = cc.find('Canvas');
        this._buildHUD(canvas);
        this._buildGameOverPanel(canvas);
        this._buildLevelClearPanel(canvas);
    }

    private _buildHUD(canvas: cc.Node) {
        const hud = new cc.Node('HUD');
        canvas.addChild(hud, 100);

        // Helper to create a HUD cell
        const cell = (name: string, x: number, label: string, fontSize: number = 22) => {
            const panel = new cc.Node(name + 'Panel');
            panel.setPosition(x, 290);
            hud.addChild(panel);

            const title = new cc.Node(name + 'Title');
            title.setPosition(0, 16);
            const tl = title.addComponent(cc.Label);
            tl.string = label;
            tl.fontSize = fontSize;
            tl.fontFamily = 'Arial';
            tl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
            title.color = cc.color(255, 255, 255);
            panel.addChild(title);

            const value = new cc.Node(name + 'Value');
            value.setPosition(0, -8);
            const vl = value.addComponent(cc.Label);
            vl.string = '000000';
            vl.fontSize = fontSize + 2;
            vl.fontFamily = 'Arial';
            vl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
            value.color = cc.color(255, 255, 255);
            panel.addChild(value);
            return vl;
        };

        this._scoreLabel = cell('Score', -280, 'SCORE', 20);
        this._livesLabel = cell('Lives', 0, 'MARIO', 20);
        this._timerLabel = cell('Timer', 280, 'TIME', 20);

        this._livesLabel.string = `×${GameManager.instance ? GameManager.instance.lives : 3}`;
        this._scoreLabel.string = '000000';
        this._timerLabel.string = '400';
    }

    private _buildGameOverPanel(canvas: cc.Node) {
        this._gameOverPanel = new cc.Node('GameOverPanel');
        this._gameOverPanel.width = 960; this._gameOverPanel.height = 640;
        this._gameOverPanel.setPosition(0, 0);
        const bg = this._gameOverPanel.addComponent(cc.Sprite);
        bg.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        this._gameOverPanel.color = cc.color(0, 0, 0, 180);
        canvas.addChild(this._gameOverPanel, 200);

        const title = new cc.Node('Title');
        title.setPosition(0, 80);
        const tl = title.addComponent(cc.Label);
        tl.string = 'GAME OVER';
        tl.fontSize = 72;
        tl.fontFamily = 'Arial';
        tl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        title.color = cc.color(255, 60, 60);
        this._gameOverPanel.addChild(title);

        this._addPanelButton(this._gameOverPanel, 'RETRY', -100, () => this.onRetryButton());
        this._addPanelButton(this._gameOverPanel, 'MENU', 100, () => this.onMenuButton());

        this._gameOverPanel.active = false;
    }

    private _buildLevelClearPanel(canvas: cc.Node) {
        this._levelClearPanel = new cc.Node('LevelClearPanel');
        this._levelClearPanel.width = 960; this._levelClearPanel.height = 640;
        this._levelClearPanel.setPosition(0, 0);
        const bg = this._levelClearPanel.addComponent(cc.Sprite);
        bg.sizeMode = cc.Sprite.SizeMode.CUSTOM;
        this._levelClearPanel.color = cc.color(0, 0, 0, 160);
        canvas.addChild(this._levelClearPanel, 200);

        const title = new cc.Node('Title');
        title.setPosition(0, 80);
        const tl = title.addComponent(cc.Label);
        tl.string = 'LEVEL CLEAR!';
        tl.fontSize = 64;
        tl.fontFamily = 'Arial';
        tl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        title.color = cc.color(100, 255, 100);
        this._levelClearPanel.addChild(title);

        this._addPanelButton(this._levelClearPanel, 'MENU', 0, () => this.onMenuButton());

        this._levelClearPanel.active = false;
    }

    private _addPanelButton(parent: cc.Node, text: string, x: number, cb: () => void) {
        const btn = new cc.Node(text);
        btn.width = 180; btn.height = 55;
        btn.setPosition(x, -40);
        btn.color = cc.color(50, 120, 220);
        const bgSp = btn.addComponent(cc.Sprite);
        bgSp.sizeMode = cc.Sprite.SizeMode.CUSTOM;

        const lNode = new cc.Node('L');
        lNode.width = 180; lNode.height = 55;
        const lbl = lNode.addComponent(cc.Label);
        lbl.string = text;
        lbl.fontSize = 28;
        lbl.fontFamily = 'Arial';
        lbl.horizontalAlign = cc.Label.HorizontalAlign.CENTER;
        lbl.verticalAlign = cc.Label.VerticalAlign.CENTER;
        lNode.color = cc.color(255, 255, 255);
        btn.addChild(lNode);

        const button = btn.addComponent(cc.Button);
        button.transition = cc.Button.Transition.COLOR;
        button.normalColor = cc.color(50, 120, 220);
        button.hoverColor = cc.color(80, 160, 255);
        button.pressedColor = cc.color(30, 80, 180);
        button.duration = 0.1;
        button.node.on('click', cb, this);
        parent.addChild(btn);
    }

    setScore(score: number) {
        if (this._scoreLabel) this._scoreLabel.string = String(score).padStart(6, '0');
    }

    setLives(lives: number) {
        if (this._livesLabel) this._livesLabel.string = `×${lives}`;
    }

    setTimer(t: number) {
        if (this._timerLabel) this._timerLabel.string = String(t).padStart(3, '0');
    }

    showGameOver() {
        if (this._gameOverPanel) this._gameOverPanel.active = true;
        if (this._levelClearPanel) this._levelClearPanel.active = false;
    }

    showLevelClear() {
        if (this._levelClearPanel) this._levelClearPanel.active = true;
        if (this._gameOverPanel) this._gameOverPanel.active = false;
    }

    onRetryButton() { GameManager.instance && GameManager.instance.retryLevel(); }
    onMenuButton() { GameManager.instance && GameManager.instance.goToMainMenu(); }
    onNextLevelButton() { GameManager.instance && GameManager.instance.goToMainMenu(); }
}
