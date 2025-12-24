// logs
import { info, error, warn, debug } from '@tauri-apps/plugin-log';

// imports
import store from "storejs";

// types
import { sceneData } from "../types/global";

// internal
import { Core } from "./internal/Core";

// database
import { getAllSaves, SaveData } from "../lib/database";

export class Game extends Core {
	// input
	keySHIFT!: Phaser.Input.Keyboard.Key;

	constructor() {
		super({ key: "Game" });
	}

	currentSaveId: number | null = null;
	saves: SaveData[] = [];

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
		await this.loadSaveData();
		// add background at the center of the canvas
		const background = this.add.image(this.game.scale.width / 2, this.game.scale.height / 2, 'background_space');

		// scale background to game size
		background.displayWidth = this.game.scale.width;
		background.scaleY = background.scaleX;

		// create particle emitter
		const particles = this.add.particles(0, 0, 'particle_red', {
			speed: 100,
			scale: { start: background.scaleX, end: 0 },
			blendMode: 'ADD'
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
