import Phaser from 'phaser';

export interface ButtonConfig {
  x: number;
  y: number;
  text: string;
  fontSize?: string;
  color?: string;
  backgroundColor?: string;
  hoverColor?: string;
  padding?: { x: number; y: number };
  onClick?: () => void;
}

export class Button extends Phaser.GameObjects.Container {
  private background: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private config: ButtonConfig;

  constructor(scene: Phaser.Scene, config: ButtonConfig) {
    super(scene, config.x, config.y);

    this.config = {
      fontSize: '20px',
      color: '#ffffff',
      backgroundColor: '#333333',
      hoverColor: '#555555',
      padding: { x: 10, y: 5 },
      ...config,
    };

    // テキストを先に作成してサイズを取得
    this.label = scene.add.text(0, 0, this.config.text, {
      fontSize: this.config.fontSize,
      color: this.config.color,
    }).setOrigin(0.5);

    // 背景を作成
    const width = this.label.width + (this.config.padding!.x * 2);
    const height = this.label.height + (this.config.padding!.y * 2);

    this.background = scene.add.rectangle(0, 0, width, height,
      Phaser.Display.Color.HexStringToColor(this.config.backgroundColor!).color
    );

    // コンテナに追加
    this.add([this.background, this.label]);

    // インタラクティブに設定
    this.setSize(width, height);
    this.setInteractive({ useHandCursor: true })
      .on('pointerover', this.onHover, this)
      .on('pointerout', this.onOut, this)
      .on('pointerdown', this.onDown, this);

    // シーンに追加
    scene.add.existing(this);
  }

  private onHover(): void {
    this.background.setFillStyle(
      Phaser.Display.Color.HexStringToColor(this.config.hoverColor!).color
    );
  }

  private onOut(): void {
    this.background.setFillStyle(
      Phaser.Display.Color.HexStringToColor(this.config.backgroundColor!).color
    );
  }

  private onDown(): void {
    this.config.onClick?.();
  }

  // テキスト更新
  setText(text: string): this {
    this.label.setText(text);
    const width = this.label.width + (this.config.padding!.x * 2);
    const height = this.label.height + (this.config.padding!.y * 2);
    this.background.setSize(width, height);
    this.setSize(width, height);
    return this;
  }

  // 選択状態の表示
  setSelected(selected: boolean): this {
    this.label.setColor(selected ? '#00ff00' : this.config.color!);
    return this;
  }
}
