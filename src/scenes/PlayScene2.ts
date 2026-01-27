// internal
import { PlayableScene, PlayableSceneConfig } from "./internal/PlayableScene";

/**
 * プレイ画面シーン2（トップダウンビュー）
 * PlaySceneの右端から遷移してくるシーン
 */
export class PlayScene2 extends PlayableScene {
  // シーン設定
  protected readonly config: PlayableSceneConfig = {
    playerColor: 0xff66cc,
    playerSpeed: 200,
  };

  constructor() {
    super({ key: "PlayScene2" });
  }

  create() {
    // 背景を作成
    this.createBackground();

    // プレイヤーを作成（StartPositionに基づく）
    this.createPlayer();

    // UIを作成
    this.createUI();

    // 入力を設定
    this.setupCommonInput();

    // ステータスを更新
    this.updateStatusUI();
  }

  update(time: number, delta: number) {
    super.update(time, delta);

    // 画面左端に到達したら前のシーンへ戻る
    this.checkSceneTransition();
  }

  /**
   * プレイヤーが画面左端に到達したかチェックし、シーン遷移を行う
   */
  private checkSceneTransition(): void {
    // 遷移中なら何もしない
    if (this.isTransitioning) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;

    // プレイヤーが左端に到達したら（ワールド境界に接触）
    if (body.blocked.left || this.player.x <= body.halfWidth) {
      // PlaySceneの右端にスポーン
      this.transitionToScene('PlayScene', 'right');
    }
  }

  /**
   * 背景を作成（グリッドパターン - 異なる色）
   */
  private createBackground(): void {
    const { width, height } = this.scale;

    // 背景色（異なる色で区別）
    this.add.rectangle(width / 2, height / 2, width, height, 0x2e1a2e);

    // グリッド線を描画
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x442d44, 0.5);

    const gridSize = 40;

    // 縦線
    for (let x = 0; x <= width; x += gridSize) {
      graphics.moveTo(x, 0);
      graphics.lineTo(x, height);
    }

    // 横線
    for (let y = 0; y <= height; y += gridSize) {
      graphics.moveTo(0, y);
      graphics.lineTo(width, y);
    }

    graphics.strokePath();
  }

  /**
   * UIを作成
   */
  private createUI(): void {
    // シーン名表示
    this.add.text(20, 20, 'Scene 2 | WASD/カーソル: 移動 | ESC: タイトルへ | SHIFT: Debug', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Roboto',
    });

    // ステータス表示
    this.createStatusUI();

    // 左端への案内
    this.add.text(20, this.scale.height - 40, '← 左端で前のシーンへ戻る', {
      fontSize: '14px',
      color: '#aaaaaa',
      fontFamily: 'Roboto',
    });
  }
}
