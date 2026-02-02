// internal
import { PlayableScene, PlayableSceneConfig } from "@/scenes/internal/PlayableScene";

/**
 * プレイ画面シーン1（トップダウンビュー）
 * WASD/カーソルキーでキャラクターを操作
 */
export class PlayScene extends PlayableScene {
  // シーン設定
  protected readonly config: PlayableSceneConfig = {
    playerColor: 0x66ccff,
    playerSpeed: 200,
  };

  constructor() {
    super({ key: "PlayScene" });
  }

  create() {
    // 背景を作成
    this.createBackground();

    // プレイヤーを作成（StartPositionに基づく）
    this.createPlayer();

    // 敵を配置
    this.createEnemies();

    // UIを作成
    this.createUI();

    // 入力を設定
    this.setupCommonInput();

    // ステータスを更新
    this.updateStatusUI();
  }

  update(time: number, delta: number) {
    super.update(time, delta);

    // 画面右端に到達したらシーン遷移
    this.checkSceneTransition();
  }

  /**
   * プレイヤーが画面右端に到達したかチェックし、シーン遷移を行う
   */
  private checkSceneTransition(): void {
    // 遷移中なら何もしない
    if (this.isTransitioning) return;

    const { width } = this.scale;
    const body = this.player.body as Phaser.Physics.Arcade.Body;

    // プレイヤーが右端に到達したら（ワールド境界に接触）
    if (body.blocked.right || this.player.x >= width - body.halfWidth) {
      // PlayScene2の左端にスポーン
      this.transitionToScene('PlayScene2', 'left');
    }
  }

  /**
   * 敵を配置
   */
  private createEnemies(): void {
    const { width, height } = this.scale;

    // 画面中央付近に複数の敵を配置
    this.addEnemies([
      { x: width * 0.6, y: height * 0.3 },
      { x: width * 0.7, y: height * 0.5 },
      { x: width * 0.6, y: height * 0.7 },
    ]);

    // 異なる設定の敵も追加（大きくて硬い敵）
    this.addEnemy(width * 0.8, height * 0.5, {
      width: 60,
      height: 60,
      color: 0xaa2222,
      maxHp: 200,
    });
  }

  /**
   * 背景を作成（グリッドパターン）
   */
  private createBackground(): void {
    const { width, height } = this.scale;

    // 背景色
    this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

    // グリッド線を描画
    const graphics = this.add.graphics();
    graphics.lineStyle(1, 0x2d2d44, 0.5);

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
    // 操作説明
    this.add.text(20, 20, 'Scene 1 | WASD/カーソル: 移動 | ESC: タイトルへ | SHIFT: Debug', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Roboto',
    });

    // ステータス表示
    this.createStatusUI();

    // 発射モード表示
    this.createShootingModeText();

    // 右端への案内
    this.add.text(this.scale.width - 200, this.scale.height - 40, '右端で次のシーンへ →', {
      fontSize: '14px',
      color: '#aaaaaa',
      fontFamily: 'Roboto',
    });
  }
}
