/**
 * FirebaseManager – static bridge to the Firebase JS SDK loaded in index.html.
 * Call FirebaseManager.saveScore() from GameManager after game over / level clear.
 */
export default class FirebaseManager {

    static getCurrentUser(): { uid: string; name: string; isAnonymous: boolean } | null {
        return (window as any).__fbUser || null;
    }

    static saveScore(score: number, isVictory: boolean): void {
        const fn: ((s: number, v: boolean) => void) | undefined = (window as any).__fbSaveScore;
        if (typeof fn === 'function') fn(score, isVictory);
    }

    static showLeaderboard(): void {
        const fn: (() => void) | undefined = (window as any).__showLeaderboard;
        if (typeof fn === 'function') fn();
    }
}
