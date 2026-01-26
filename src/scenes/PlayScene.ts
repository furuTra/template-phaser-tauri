// imports
import store from "storejs";

// types
import type { sceneData } from "../types/global";

// internal
import { Core } from "./internal/Core";

// components
import { TopDownController } from "../components/gameplay/TopDownController";

// manager
import { SaveDataManager } from "../lib/cache/SaveDataManager";

/**
 * プレイ画面シーン（トップダウンビュー）
 * WASD/カーソルキーでキャラクターを操作
 */
export class PlayScene extends Core {
  // Input
  private keySHIFT!: Phaser.Input.Keyboard.Key;

  // Player
  private player!: Phaser.GameObjects.Rectangle;
  private playerController!: TopDownController;

  // Manager
  private saveManager!: SaveDataManager;

  // UI
  private statusText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: "PlayScene" });
  }

  init(data: sceneData) {
    super.init(data);
    this.saveManager = SaveDataManager.getInstance();
  }

  preload() {
    super.preload();
    this.debugSetup();
  }

  create() {
    // 背景を作成
    this.createBackground();

    // プレイヤーを作成
    this.createPlayer();

    // UIを作成
    this.createUI();

    // 入力を設定
    this.setupInput();

    // ステータスを更新
    this.updateStatusUI();
  }

  update() {
    // プレイヤーの移動を更新
    this.playerController.update();
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
   * プレイヤーを作成
   */
  private createPlayer(): void {
    const { width, height } = this.scale;

    // プレイヤー（仮の四角形）
    this.player = this.add.rectangle(width / 2, height / 2, 32, 32, 0x66ccff);

    // 物理ボディを有効化
    this.physics.add.existing(this.player);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);

    // 移動コントローラーを設定
    this.playerController = new TopDownController(this, this.player, {
      speed: 200,
    });
  }

  /**
   * UIを作成
   */
  private createUI(): void {
    // 操作説明
    this.add.text(20, 20, 'WASD/カーソル: 移動 | ESC: タイトルへ | SHIFT: Debug', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'Roboto',
    });

    // ステータス表示
    this.statusText = this.add.text(20, 50, '', {
      fontSize: '18px',
      color: '#ffcc00',
      fontFamily: 'Roboto',
    });
  }

  /**
   * ステータスUIを更新
   */
  private updateStatusUI(): void {
    const gameData = this.saveManager.getCurrentGameData();
    if (gameData) {
      this.statusText.setText(`Lv: ${gameData.lv}  Exp: ${gameData.exp}`);
    }
  }

  /**
   * 入力を設定
   */
  private setupInput(): void {
    // ESCキーでタイトルに戻る
    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
      .on('down', () => {
        this.playerController.destroy();
        this.scene.start('Game');
      });
  }

  /**
   * デバッグ機能のセットアップ
   */
  private debugSetup(): void {
    this.keySHIFT = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    this.keySHIFT.on("down", () => {
      // デバッグオーバーレイ切り替え
      if (this.game.scene.getScenes(true).some((scene) => scene.scene.key === "Debug")) {
        store.set("debug.enabled", false);
        this.scene.stop("Debug");
        this.physics.world.drawDebug = false;
        this.physics.world.debugGraphic.clear();
      } else {
        store.set("debug.enabled", true);
        this.scene.launch("Debug", this);
      }
    }, this);

    // デバッグ有効時は起動
    if (store.get("debug.enabled")) {
      this.scene.launch("Debug", this);
    }
  }
}
