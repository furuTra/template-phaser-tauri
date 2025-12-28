// logs
import { info, error, warn } from '@tauri-apps/plugin-log';

// imports
import store from "storejs";

// types
import { sceneData } from "../types/global";

// internal
import { Core } from "./internal/Core";

// database
import {
	getAllSaves,
	SaveData,
	GameData,
	parseGameData,
} from "../lib/database";

export class Game extends Core {
	// input
	keySHIFT!: Phaser.Input.Keyboard.Key;

	constructor() {
		super({ key: "Game" });
	}

	currentSaveId: number | null = null;
	saves: SaveData[] = [];
	gameData: GameData | null = null;

	init(data: sceneData) {
		// save scene references
		super.init(data);
	}

	preload() {
		// preload core mechanics
		super.preload();

		// set up debug functionality
		this.debugSetup();
	}

	// セーブデータを読み込み
	async loadSaveData(): Promise<void> {
		try {
			this.saves = await getAllSaves();
			console.log('Loaded saves:', this.saves);
			info('Loaded saves:' + JSON.stringify(this.saves));

			// 最新のセーブデータがあれば読み込む
			if (this.saves.length > 0) {
				const latestSave = this.saves[0];
				this.currentSaveId = latestSave.id;
			}
		} catch (err) {
			console.error('Failed to load save data:', err);
			error('Failed to load save data:' + String(err));
		}
	}

	async create() {
		this.setupInput();

		await this.loadSaveData();
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
		this.add.text(20, 20, 'ESC: Settings / SHIFT: Debug', {
			fontSize: '16px',
			color: '#ffffff',
		});

		// 現在のゲームデータを表示
		if (this.gameData) {
			this.add.text(20, 50, `Level: ${this.gameData.level}`, {
				fontSize: '20px',
				color: '#ffffff',
			});
			this.add.text(20, 80, `Score: ${this.gameData.score}`, {
				fontSize: '20px',
				color: '#ffffff',
			});
		}

		// セーブデータ一覧を表示
		this.displaySaveList();
	}

	private displaySaveList() {
		const startX = 20;
		const startY = 130;

		this.add.text(startX, startY, 'Save Data:', {
			fontSize: '18px',
			color: '#ffff00',
		});

		if (this.saves.length === 0) {
			warn('No save data found');
			this.add.text(startX, startY + 30, 'No save data found', {
				fontSize: '14px',
				color: '#888888',
			});
			return;
		}

		this.saves.forEach((save, index) => {
			const y = startY + 30 + index * 50;
			const data = parseGameData(save);

			// タイトル
			this.add.text(startX, y, save.title, {
				fontSize: '16px',
				color: '#ffffff',
			});

			// ゲームデータ
			this.add.text(startX + 20, y + 20, `Lv.${data.level} | Score: ${data.score}`, {
				fontSize: '14px',
				color: '#aaaaaa',
			});
		});
	}

	private setupInput() {
		// Screen setup
		this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
			.on('down', () => {
				this.scene.start('Settings');
			});
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
