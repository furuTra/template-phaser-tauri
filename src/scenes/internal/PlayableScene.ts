// imports
import Phaser from "phaser";
import store from "storejs";

// types
import type { sceneData, StartPosition } from "@/types/global";

// events
import {
  PLAYER_EVENTS,
  type PlayerHpChangedData,
  type PlayerMpChangedData,
} from "@/events";
import type { PlayerStatsConfig } from "@/types/Character/Player";

// internal
import { Core } from "@/scenes/internal/Core";

// components
import { TopDownController } from "@/components/gameplay/TopDownController";
import { ShootingController, ShootingControllerConfig } from "@/components/gameplay/ShootingController";
import { PlayerStatsGameplayComponent } from "@/components/gameplay/PlayerStatsGameplayComponent";
import { TargetEffectGameplayComponent, TargetEffectConfig } from "@/components/gameplay/TargetEffectGameplayComponent";
import { EnemyGameplayComponent } from "@/components/gameplay/EnemyGameplayComponent";
import { Bullet } from "@/components/gameplay/Bullet";
import { StatusBarUIComponent } from "@/components/ui/StatusBarUIComponent";
import { WeaponSelectModalUIComponent, ShootingMode } from "@/components/ui/WeaponSelectModalUIComponent";

// manager
import { SaveDataManager } from "@/lib/cache/SaveDataManager";

/**
 * プレイヤーサイズ
 */
export interface PlayerSize {
  width: number;
  height: number;
}

/**
 * プレイヤー操作可能なシーンの設定
 */
export interface PlayableSceneConfig {
  /** プレイヤーの色 */
  playerColor: number;
  /** プレイヤーの移動速度（デフォルト: 200） */
  playerSpeed?: number;
  /** プレイヤーのサイズ（デフォルト: 32x32） */
  playerSize?: PlayerSize;
  /** 射撃機能を有効にするか（デフォルト: true） */
  shootingEnabled?: boolean;
  /** 射撃コントローラーの設定 */
  shootingConfig?: ShootingControllerConfig;
  /** プレイヤーステータスの設定 */
  playerStatsConfig?: PlayerStatsConfig;
  /** ターゲットエフェクトを有効にするか（デフォルト: true） */
  targetEffectEnabled?: boolean;
  /** ターゲットエフェクトの設定 */
  targetEffectConfig?: TargetEffectConfig;
}

/**
 * 物理ボディと位置を持つプレイヤーの型
 */
type PhysicsPlayer = Phaser.GameObjects.GameObject & 
  Phaser.GameObjects.Components.Transform & 
  { body: Phaser.Physics.Arcade.Body };

/**
 * プレイヤー操作可能なシーンの共通基底クラス
 * プレイヤー生成、移動コントローラー、デバッグ機能などを共通化
 */
export abstract class PlayableScene extends Core {
  // PlayableSceneスコープのイベントエミッター
  protected sceneEvents: Phaser.Events.EventEmitter = new Phaser.Events.EventEmitter();

  // Input
  protected keySHIFT!: Phaser.Input.Keyboard.Key;
  protected keyZ?: Phaser.Input.Keyboard.Key;

  // Player（物理ボディと位置を持つGameObject）
  protected player!: PhysicsPlayer;
  protected playerController!: TopDownController;
  protected playerStats!: PlayerStatsGameplayComponent;

  // Shooting
  protected shootingController?: ShootingController;

  // Target Effect
  protected targetEffect?: TargetEffectGameplayComponent;

  // Enemies
  protected enemies!: Phaser.Physics.Arcade.Group;

  // UI
  protected weaponSelectModal?: WeaponSelectModalUIComponent;
  protected shootingModeText?: Phaser.GameObjects.Text;

  // Manager
  protected saveManager!: SaveDataManager;

  // UI
  protected statusText!: Phaser.GameObjects.Text;
  protected hpBar!: StatusBarUIComponent;
  protected mpBar!: StatusBarUIComponent;

  // シーン遷移時のプレイヤー開始位置
  protected startPosition: StartPosition = 'center';

  // シーン遷移中フラグ（連続発火防止）
  protected isTransitioning: boolean = false;

  // シーン設定（サブクラスで設定）
  protected abstract readonly config: PlayableSceneConfig;

  // デフォルトのプレイヤーサイズ
  protected static readonly DEFAULT_PLAYER_SIZE: PlayerSize = { width: 32, height: 32 };

  init(data: sceneData) {
    super.init(data);
    this.saveManager = SaveDataManager.getInstance();
    // 開始位置を設定（指定がなければ中央）
    this.startPosition = data.startPosition ?? 'center';
    // 遷移フラグをリセット
    this.isTransitioning = false;
  }

  preload() {
    super.preload();
    this.debugSetup();
  }

  update(time: number, delta: number) {
    // プレイヤーの移動を更新
    this.playerController.update();

    // プレイヤーステータスを更新（MP自動回復）
    this.playerStats.update(delta);

    // 射撃コントローラーを更新
    this.shootingController?.update(time, delta);

    // ターゲットエフェクトを更新
    this.targetEffect?.update(time, delta, this.player.x, this.player.y);

    // 敵を更新（HPバーの位置追従）
    this.enemies.getChildren().forEach((enemy) => {
      (enemy as EnemyGameplayComponent).preUpdate();
    });
  }

  /**
   * プレイヤーのサイズを取得
   */
  protected getPlayerSize(): PlayerSize {
    return this.config.playerSize ?? PlayableScene.DEFAULT_PLAYER_SIZE;
  }

  /**
   * プレイヤーを作成
   * StartPositionに基づいてスポーン位置を決定
   */
  protected createPlayer(): void {
    const { height } = this.scale;
    const playerSize = this.getPlayerSize();

    // 開始位置に応じてX座標を決定
    const startX = this.getSpawnX();

    // プレイヤー（仮の四角形）
    const playerRect = this.add.rectangle(
      startX,
      height / 2,
      playerSize.width,
      playerSize.height,
      this.config.playerColor
    );

    // 物理ボディを有効化
    this.physics.add.existing(playerRect);
    const body = playerRect.body as Phaser.Physics.Arcade.Body;
    body.setCollideWorldBounds(true);

    // プレイヤーとして設定
    this.player = playerRect as PhysicsPlayer;

    // プレイヤーステータスを初期化
    this.playerStats = new PlayerStatsGameplayComponent(this, this.config.playerStatsConfig);

    // HP/MP変化時のイベントリスナーを設定（sceneEvents経由）
    this.sceneEvents.on(
      PLAYER_EVENTS.HP_CHANGED,
      (data: PlayerHpChangedData) => {
        this.hpBar?.setValueFromNumbers(data.hp, data.maxHp);
      }
    );
    this.sceneEvents.on(
      PLAYER_EVENTS.MP_CHANGED,
      (data: PlayerMpChangedData) => {
        this.mpBar?.setValueFromNumbers(data.mp, data.maxMp);
      }
    );
    this.sceneEvents.on(PLAYER_EVENTS.DEATH, () => {
      this.handlePlayerDeath();
    });

    // 移動コントローラーを設定
    this.playerController = new TopDownController(this, this.player, {
      speed: this.config.playerSpeed ?? 200,
    });

    // 射撃コントローラーを設定（有効な場合）
    if (this.config.shootingEnabled !== false) {
      this.shootingController = new ShootingController(this, this.player, {
        ...this.config.shootingConfig,
        playerStats: this.playerStats,
      });
    }

    // ターゲットエフェクトを作成（有効な場合）
    if (this.config.targetEffectEnabled !== false && this.config.shootingEnabled !== false) {
      this.targetEffect = new TargetEffectGameplayComponent(this, {
        offset: 40,
        size: 14,
        color: 0xff6666,
        alpha: 0.7,
        ...this.config.targetEffectConfig,
      });
    }

    // 敵グループを作成（物理グループ）
    this.enemies = this.physics.add.group();

    // 弾と敵の衝突判定を設定
    this.setupBulletEnemyCollision();

    // プレイヤーと敵の衝突判定を設定
    this.setupPlayerEnemyCollision();
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

    // HPバーを作成（左上）
    this.hpBar = new StatusBarUIComponent(this, {
      x: 50,
      y: 80,
      width: 180,
      height: 22,
      fillColor: 0xff4444,
      backgroundColor: 0x441111,
      borderColor: 0xff6666,
      label: 'HP',
      initialValue: 1,
    });

    // MPバーを作成（HPバーの下）
    this.mpBar = new StatusBarUIComponent(this, {
      x: 50,
      y: 110,
      width: 180,
      height: 22,
      fillColor: 0x4444ff,
      backgroundColor: 0x111144,
      borderColor: 0x6666ff,
      label: 'MP',
      initialValue: 1,
    });

    // 初期値を設定
    this.hpBar.setValueFromNumbers(
      this.playerStats.getHp(),
      this.playerStats.getMaxHp()
    );
    this.mpBar.setValueFromNumbers(
      this.playerStats.getMp(),
      this.playerStats.getMaxMp()
    );
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
   * プレイヤー死亡時の処理
   * サブクラスでオーバーライド可能
   */
  protected handlePlayerDeath(): void {
    // デフォルトではタイトルに戻る
    console.log('Player died!');
    this.destroyControllers();
    this.scene.start('Title', { sceneHead: this.sceneHead });
  }

  /**
   * 共通入力を設定（ESCキーでタイトルへ戻る、Zキーで発射モード選択）
   */
  protected setupCommonInput(): void {
    this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
      .on('down', () => {
        // モーダル表示中は閉じるだけ
        if (this.weaponSelectModal?.getIsVisible()) {
          return;
        }
        this.destroyControllers();
        this.scene.start('Title', { sceneHead: this.sceneHead });
      });

    // Zキーで発射モード選択モーダルを表示
    this.keyZ = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    this.keyZ?.on('down', () => {
      this.toggleWeaponSelectModal();
    });
  }

  /**
   * 発射モード選択モーダルを作成
   */
  protected createWeaponSelectModal(): void {
    if (!this.shootingController) return;

    this.weaponSelectModal = new WeaponSelectModalUIComponent(this, {
      modes: this.shootingController.getShootingModes(),
      onSelect: (mode: ShootingMode) => {
        this.onShootingModeSelected(mode);
      },
      onCancel: () => {
        this.onWeaponSelectModalClosed();
      },
    });

    // 現在のモードを選択状態にする
    this.weaponSelectModal.setSelectedIndex(this.shootingController.getCurrentModeIndex());
  }

  /**
   * 発射モード選択モーダルの表示切替
   */
  protected toggleWeaponSelectModal(): void {
    if (!this.weaponSelectModal) {
      this.createWeaponSelectModal();
    }

    if (this.weaponSelectModal?.getIsVisible()) {
      this.weaponSelectModal.hide();
      this.onWeaponSelectModalClosed();
    } else {
      this.weaponSelectModal?.show();
      // モーダル表示中は射撃を無効化
      this.shootingController?.setEnabled(false);
      this.playerController?.disable();
      // ターゲットエフェクトも非表示
      this.targetEffect?.hide();
    }
  }

  /**
   * 発射モードが選択されたときの処理
   */
  protected onShootingModeSelected(mode: ShootingMode): void {
    this.shootingController?.setShootingMode(mode);
    this.updateShootingModeText();
    this.onWeaponSelectModalClosed();
  }

  /**
   * 発射モード選択モーダルが閉じられたときの処理
   */
  protected onWeaponSelectModalClosed(): void {
    // 射撃と移動を再有効化
    this.shootingController?.setEnabled(true);
    this.playerController?.enable();
    // ターゲットエフェクトを再表示
    this.targetEffect?.show();
  }

  /**
   * 発射モード表示テキストを作成
   */
  protected createShootingModeText(): void {
    const currentMode = this.shootingController?.getCurrentMode();
    this.shootingModeText = this.add.text(
      this.scale.width - 200,
      20,
      `発射: ${currentMode?.name ?? '単発'} [Z]`,
      {
        fontSize: '14px',
        color: '#88ff88',
        fontFamily: 'Roboto',
      }
    );
  }

  /**
   * 発射モード表示テキストを更新
   */
  protected updateShootingModeText(): void {
    const currentMode = this.shootingController?.getCurrentMode();
    this.shootingModeText?.setText(`発射: ${currentMode?.name ?? '単発'} [Z]`);
  }

  /**
   * 別のプレイシーンへ遷移
   * @param sceneKey 遷移先シーンのキー
   * @param startPosition 遷移先でのプレイヤー開始位置
   */
  protected transitionToScene(sceneKey: string, startPosition: StartPosition): void {
    // 遷移中なら何もしない（連続発火防止）
    if (this.isTransitioning) return;

    this.isTransitioning = true;
    this.destroyControllers();
    this.scene.start(sceneKey, { 
      sceneHead: this.sceneHead, 
      startPosition 
    });
  }

  /**
   * コントローラーを破棄
   */
  protected destroyControllers(): void {
    this.playerController.destroy();
    this.shootingController?.destroy();
    this.playerStats?.destroy();
    this.weaponSelectModal?.destroy();
    this.weaponSelectModal = undefined;
    this.targetEffect?.destroy();
    this.targetEffect = undefined;
    // sceneEventsのリスナーをすべて解除
    this.sceneEvents.removeAllListeners();
  }

  /**
   * 弾と敵の衝突判定をセットアップ
   */
  protected setupBulletEnemyCollision(): void {
    if (!this.shootingController) return;

    const bulletPool = this.shootingController.getBulletPool();
    
    this.physics.add.overlap(
      bulletPool,
      this.enemies,
      (bulletObj, enemyObj) => {
        const bullet = bulletObj as Bullet;
        const enemy = enemyObj as EnemyGameplayComponent;

        // 弾を非アクティブ化
        bullet.deactivate();

        // 敵にダメージを与える（弾のダメージ量を取得）
        const damage = bullet.getDamage?.() ?? 10;
        enemy.takeDamage(damage);
      },
      // アクティブな弾と敵のみを処理
      (bulletObj, enemyObj) => {
        const bullet = bulletObj as Bullet;
        const enemy = enemyObj as EnemyGameplayComponent;
        return bullet.active && enemy.active;
      },
      this
    );
  }

  /**
   * プレイヤーと敵の衝突判定をセットアップ
   */
  protected setupPlayerEnemyCollision(): void {
    this.physics.add.collider(this.player, this.enemies);
  }

  /**
   * 敵を追加
   * @param x X座標
   * @param y Y座標
   * @param config 敵の設定
   * @returns 作成した敵
   */
  protected addEnemy(x: number, y: number, config?: import("@/components/gameplay/EnemyGameplayComponent").EnemyConfig): EnemyGameplayComponent {
    const enemy = new EnemyGameplayComponent(this, x, y, config);
    this.enemies.add(enemy);
    return enemy;
  }

  /**
   * 複数の敵を追加
   * @param positions 敵の位置配列
   * @param config 共通の敵設定
   * @returns 作成した敵の配列
   */
  protected addEnemies(positions: { x: number; y: number }[], config?: import("@/components/gameplay/EnemyGameplayComponent").EnemyConfig): EnemyGameplayComponent[] {
    return positions.map(pos => this.addEnemy(pos.x, pos.y, config));
  }

  /**
   * PlayableSceneスコープのイベントエミッターを取得
   * コンポーネントからイベントを発火する際に使用
   */
  getPlayableSceneEvents(): Phaser.Events.EventEmitter {
    return this.sceneEvents;
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
