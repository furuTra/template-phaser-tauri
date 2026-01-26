// imports
import store from "storejs";

// types
import type { sceneData } from "../types/global";
import type { SaveData, GameData } from "../lib/database";

// internal
import { Core } from "./internal/Core";

// manager
import { SaveDataManager } from "../lib/cache/SaveDataManager";

export class Game extends Core {
	// input
	keySHIFT!: Phaser.Input.Keyboard.Key;

	// manager
	private saveManager!: SaveDataManager;

	constructor() {
		super({ key: "Game" });
	}

	init(data: sceneData) {
		// save scene references
		super.init(data);

		// SaveDataManager のインスタンスを取得
		this.saveManager = SaveDataManager.getInstance();
	}

	preload() {
		// preload core mechanics
		super.preload();

		// set up debug functionality
		this.debugSetup();
	}

	create() {
		this.setupInput();
		this.createBackground();
		this.createUI();
	}

	private createBackground() {
		// add background at the center of the canvas
		const background = this.add.image(
			this.game.scale.width / 2,
			this.game.scale.height / 2,
			'background_space'
		);
		// scale background to game size
		background.displayWidth = this.game.scale.width;
		background.scaleY = background.scaleX;

		// create particle emitter
		const particles = this.add.particles(0, 0, 'particle_red', {
			speed: 100,
			scale: { start: background.scaleX, end: 0 },
			blendMode: 'ADD',
			maxParticles: 50,
			lifespan: 1000,
			frequency: 50,
		});

		// add phaser 3 logo to the center of the canvas
		const logo = this.physics.add.image(this.game.scale.width / 2, this.game.scale.height / 2, 'logo').setScale(background.scaleX);

		// make logo move
		logo.setVelocity(100, 200);
		logo.setBounce(1, 1);
		logo.setCollideWorldBounds(true);

		// make particles follow logo
		particles.startFollow(logo);
	}

	private createUI() {
		// 操作説明
		this.add.text(20, 20, 'ESC: Settings / SHIFT: Debug / S: セーブ選択', {
			fontSize: '16px',
			color: '#ffffff',
		});

		// タイトル
		this.add.text(
			this.game.scale.width / 2,
			this.game.scale.height / 2 - 100,
			'Example Game',
			{
				fontSize: '48px',
				color: '#ffffff',
				fontFamily: 'Roboto',
			}
		).setOrigin(0.5);

		// ゲーム開始ボタン
		const startBtn = this.add.text(
			this.game.scale.width / 2,
			this.game.scale.height / 2 + 50,
			'ゲームを始める',
			{
				fontSize: '24px',
				color: '#66ccff',
				fontFamily: 'Roboto',
				backgroundColor: '#222222',
				padding: { x: 30, y: 15 },
			}
		)
			.setOrigin(0.5)
			.setInteractive({ useHandCursor: true })
			.on('pointerover', () => startBtn.setColor('#99ddff'))
			.on('pointerout', () => startBtn.setColor('#66ccff'))
			.on('pointerdown', () => this.openSaveSlots());
	}

	private setupInput() {
		// Screen setup
		this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
			.on('down', () => {
				this.scene.start('Settings');
			});

		// Sキーでセーブスロット画面を開く
		this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.S)
			.on('down', () => {
				this.openSaveSlots();
			});
	}

	/**
	 * セーブスロット選択画面を開く
	 */
	private openSaveSlots(): void {
		// セーブスロット選択のイベントリスナーを設定
		this.events.once('saveSlotSelected', (data: { 
			save: SaveData | null; 
			slotIndex: number;
			gameData: GameData;
		}) => {
			console.log('Save slot selected in Game:', data);
			console.log('Current game data:', this.saveManager.getCurrentGameData());

			// 選択されたセーブデータでPlaySceneへ遷移
			this.scene.start('PlayScene', { sceneHead: this.sceneHead });
		});

		// オーバーレイを起動
		this.scene.launch('SaveSlotsOverlay', { parentSceneKey: 'Game' });
	}

	update() { }

	debugSetup() {
		// debug overlay toggle hotkey
		this.keySHIFT = (
			this.input.keyboard as Phaser.Input.Keyboard.KeyboardPlugin
		).addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

		// toggle debug overlay
		this.keySHIFT.on(
			"down",
			() => {
				// close debug overlay
				if (
					this.game.scene
						.getScenes(true)
						.some((scene) => scene.scene.key === "Debug")
				) {
					// disable debug value
					store.set("debug.enabled", false);

					// stop debug scene
					this.scene.stop("Debug");

					// turn off and remove debug lines
					this.physics.world.drawDebug = false;
					this.physics.world.debugGraphic.clear();
				}

				// open debug overlay
				else {
					// enable debug value
					store.set("debug.enabled", true);

					// launch debug info overlay
					this.scene.launch("Debug", this);
				}
			},
			this
		);

		// show debug
		if (store.get("debug.enabled")) this.scene.launch("Debug", this);
	}
}

