// imports
import Phaser from "phaser";

// utility
import Utility from "./scripts/utility/Utility";
import ColorScheme from "./scripts/utility/ColorScheme";

// General game settings and information exist here.

// constants
const gameScale = {
	width: 1280,
	height: 720,
};

export default {
	title: "Example Project",
	version: "v0.0.0",
	type: Phaser.AUTO,
	scale: {
		parent: "game",
		mode: Phaser.Scale.FIT,
		autoCenter: Phaser.Scale.CENTER_BOTH,
		width: gameScale.width,
		height: gameScale.height,
	},
	backgroundColor: Utility.hex.toString(ColorScheme.Black),
	fps: {
		target: 60,
		forceSetTimeOut: true,
	},
	physics: {
		default: 'arcade',
		arcade: {
			debug: true,
			gravity: { x: 0, y: 0 }
		}
	},
	render: {
		powerPreference: 'low-power',  // 省電力GPU優先
	},
	dom: {
		createContainer: true,
	},
	banner: false,
};

