import Phaser from 'phaser';

/**
 * TopDownControllerの設定
 */
export interface TopDownControllerConfig {
  /** 移動速度（デフォルト: 200） */
  speed?: number;
  /** 斜め移動時に速度を正規化するか（デフォルト: true） */
  normalizeSpeed?: boolean;
}

/**
 * 移動方向ベクトル
 */
export interface MovementVector {
  x: number;
  y: number;
}

/**
 * トップダウンビュー用の移動コントローラー
 * WASD/カーソルキーで上下左右に移動
 * 
 * 使用例:
 * ```typescript
 * // create()で初期化
 * this.controller = new TopDownController(this, player, { speed: 200 });
 * 
 * // update()で更新
 * this.controller.update();
 * ```
 */
export class TopDownController {
  private scene: Phaser.Scene;
  private target: Phaser.GameObjects.GameObject;
  private body: Phaser.Physics.Arcade.Body;

  // 設定
  private speed: number;
  private normalizeSpeed: boolean;

  // 入力キー
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasdKeys!: {
    W: Phaser.Input.Keyboard.Key;
    A: Phaser.Input.Keyboard.Key;
    S: Phaser.Input.Keyboard.Key;
    D: Phaser.Input.Keyboard.Key;
  };

  // 有効フラグ
  private enabled: boolean = true;

  /**
   * @param scene 所属するシーン
   * @param target 操作対象のGameObject（物理ボディを持つこと）
   * @param config 設定オプション
   */
  constructor(
    scene: Phaser.Scene,
    target: Phaser.GameObjects.GameObject,
    config: TopDownControllerConfig = {}
  ) {
    this.scene = scene;
    this.target = target;

    // 物理ボディを取得
    if (!target.body) {
      throw new Error('TopDownController: target must have a physics body');
    }
    this.body = target.body as Phaser.Physics.Arcade.Body;

    // 設定を適用
    this.speed = config.speed ?? 200;
    this.normalizeSpeed = config.normalizeSpeed ?? true;

    // 入力を初期化
    this.setupInput();
  }

  /**
   * 入力キーを設定
   */
  private setupInput(): void {
    const keyboard = this.scene.input.keyboard;
    if (!keyboard) {
      throw new Error('TopDownController: keyboard input is not available');
    }

    // カーソルキー
    this.cursors = keyboard.createCursorKeys();

    // WASDキー
    this.wasdKeys = {
      W: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    };
  }

  /**
   * 毎フレーム呼び出して移動を処理
   */
  update(): void {
    if (!this.enabled) {
      this.body.setVelocity(0, 0);
      return;
    }

    const movement = this.getMovementInput();
    this.applyMovement(movement);
  }

  /**
   * 入力から移動方向を取得
   * @returns 正規化された移動ベクトル（-1, 0, 1）
   */
  getMovementInput(): MovementVector {
    let x = 0;
    let y = 0;

    // 水平方向
    if (this.cursors.left.isDown || this.wasdKeys.A.isDown) {
      x = -1;
    } else if (this.cursors.right.isDown || this.wasdKeys.D.isDown) {
      x = 1;
    }

    // 垂直方向
    if (this.cursors.up.isDown || this.wasdKeys.W.isDown) {
      y = -1;
    } else if (this.cursors.down.isDown || this.wasdKeys.S.isDown) {
      y = 1;
    }

    return { x, y };
  }

  /**
   * 移動を適用
   * @param movement 移動方向ベクトル
   */
  private applyMovement(movement: MovementVector): void {
    // 速度を計算
    let velocityX = movement.x * this.speed;
    let velocityY = movement.y * this.speed;

    // 斜め移動時の速度正規化
    if (this.normalizeSpeed && movement.x !== 0 && movement.y !== 0) {
      const factor = 1 / Math.sqrt(2);
      velocityX *= factor;
      velocityY *= factor;
    }

    this.body.setVelocity(velocityX, velocityY);
  }

  /**
   * 移動中かどうかを取得
   */
  isMoving(): boolean {
    const movement = this.getMovementInput();
    return movement.x !== 0 || movement.y !== 0;
  }

  /**
   * コントローラーを有効化
   */
  enable(): void {
    this.enabled = true;
  }

  /**
   * コントローラーを無効化（移動停止）
   */
  disable(): void {
    this.enabled = false;
  }

  /**
   * 有効状態を取得
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * 移動速度を設定
   */
  setSpeed(speed: number): void {
    this.speed = speed;
  }

  /**
   * 移動速度を取得
   */
  getSpeed(): number {
    return this.speed;
  }

  /**
   * 操作対象を取得
   */
  getTarget(): Phaser.GameObjects.GameObject {
    return this.target;
  }

  /**
   * リソースを解放
   */
  destroy(): void {
    // キーを削除
    this.scene.input.keyboard?.removeKey(this.wasdKeys.W);
    this.scene.input.keyboard?.removeKey(this.wasdKeys.A);
    this.scene.input.keyboard?.removeKey(this.wasdKeys.S);
    this.scene.input.keyboard?.removeKey(this.wasdKeys.D);
  }
}
