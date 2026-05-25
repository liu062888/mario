import GameManager from './GameManager';

const { ccclass, property } = cc._decorator;

@ccclass
export default class UIManager extends cc.Component {

    @property(cc.Label) scoreLabel: cc.Label = null;
    @property(cc.Label) livesLabel: cc.Label = null;
    @property(cc.Label) timerLabel: cc.Label = null;
    @property(cc.Node)  gameOverPanel: cc.Node = null;
    @property(cc.Node)  levelClearPanel: cc.Node = null;

    onLoad() {
        if (this.gameOverPanel)   this.gameOverPanel.active   = false;
        if (this.levelClearPanel) this.levelClearPanel.active = false;
    }

    setScore(score: number) {
        if (this.scoreLabel) this.scoreLabel.string = String(score).padStart(6, '0');
    }

    setLives(lives: number) {
        if (this.livesLabel) this.livesLabel.string = `x${lives}`;
    }

    setTimer(t: number) {
        if (this.timerLabel) this.timerLabel.string = String(t).padStart(3, '0');
    }

    showGameOver() {
        if (this.gameOverPanel)   this.gameOverPanel.active   = true;
        if (this.levelClearPanel) this.levelClearPanel.active = false;
    }

    showLevelClear() {
        if (this.levelClearPanel) this.levelClearPanel.active = true;
        if (this.gameOverPanel)   this.gameOverPanel.active   = false;
    }

    onRetryButton() { GameManager.instance && GameManager.instance.retryLevel(); }
    onMenuButton()  { GameManager.instance && GameManager.instance.goToMainMenu(); }
}
