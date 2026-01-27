// imports
import Phaser from "phaser";
import store from "storejs";

// types
import type { sceneData, StartPosition } from "../../types/global";

// internal
import { Core } from "./Core";

// components
import { TopDownController } from "../../components/gameplay/TopDownController";

// manager
import { SaveDataManager } from "../../lib/cache/SaveDataManager";

/**
 * プレイヤー操作可能なシーンの設定
 */
export interface PlayableSceneConfig {
  /** プレイヤーの色 */
  playerColor: number;
  /** プレイヤーの移動速度 */
  playerSpeed?: number;
}

/**
 * プレイヤー操作可能なシーンの共通基底クラス
 * プレイヤー生成、移動コントローラー、デバッグ機能などを共通化
 */
export abstract class PlayableScene extends Core {
  // Input
  protected keySHIFT!: Phaser.Input.Keyboard.Key;

  // Player
  protected player!: Phaser.GameObjects.Rectangle;
  protected playerController!: TopDownController;

  // Manager
  protected saveManager!: SaveDataManager;

  // UI
  protected statusText!: Phaser.GameObjects.Text;

  // シーン遷移時のプレイヤー開始位置
  protected startPosition: StartPosition = 'center';

  // シーン設定（サブクラスで設定）
  protected abstract readonly config: PlayableSceneConfig;

  init(data: sceneData) {
    super.init(data);
    this.saveManager = SaveDataManager.getInstance();
    // 開始位置を設定（指定がなければ中央）
    this.startPosition = data.startPosition ?? 'center';
  }

  preload() {
    super.preload();
    this.debugSetup();
  }

  update() {
    // プレイヤーの移動を更新
    this.playerController.update();
  }

  /**
   * プレイヤーを作成
   * StartPositionに基づいてスポーン位置を決定
   */
  protected createPlayer(): void {
    const { height } = this.scale;

    // 開始位置に応じてX座標を決定
    const startX = this.getSpawnX();

    // プレイヤー（仮の四角形）
    this.player = this.add.rectangle(startX, height / 2, 32, 32, this.config.playerColor);

    // 物理ボディを有効化
    this.physics.add.existing(this.player);
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);

    // 移動コントローラーを設定
    this.playerController = new TopDownController(this, this.player, {
      speed: this.config.playerSpeed ?? 200,
    });
  }

  /**
   * StartPositionに基づいてスポーンX座標を取得
   */
  protected getSpawnX(): number {
    const { width } = this.scale;
    const margin = 50;

    switch (this.startPosition) {
      case 'left':
        return margin;
      case 'right':
        return width - margin;
      case 'center':
      default:
        return width / 2;
    }
  }

  /**
   * ステータスUIを作成
   */
  protected createStatusUI(): void {
    this.statusText = this.add.text(20, 50, '', {
      fontSize: '18px',
      color: '#ffcc00',
      fontFamily: 'Roboto',
    });
  }

  /**
   * ステータスUIを更新
   */
  protected updateStatusUI(): void {
    const gameData = this.saveManager.getCurrentGameData();
    if (gameData) {
      this.statusText.setText(`Lv: ${gameData.lv}  Exp: ${gameData.exp}`);
    }
  }

  /**
   * 共通入力を設定（ESCキーでタイトルへ戻る）
   */
  protected setupCommonInput(): void {
    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
      .on('down', () => {
        this.playerController.destroy();
        this.scene.start('Game', { sceneHead: this.sceneHead });
      });
  }

  /**
   * 別のプレイシーンへ遷移
   * @param sceneKey 遷移先シーンのキー
   * @param startPosition 遷移先でのプレイヤー開始位置
   */
  protected transitionToScene(sceneKey: string, startPosition: StartPosition): void {
    this.playerController.destroy();
    this.scene.start(sceneKey, { 
      sceneHead: this.sceneHead, 
      startPosition 
    });
  }

  /**
   * デバッグ機能のセットアップ
   */
  protected debugSetup(): void {
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
