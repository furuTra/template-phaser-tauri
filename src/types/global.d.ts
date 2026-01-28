// scenes
import { Head } from "@/scenes/internal/Head";

/** プレイヤーの開始位置 */
declare type StartPosition = 'left' | 'center' | 'right';

declare interface sceneData {
	sceneHead: Head;
	/** プレイヤーの開始位置（オプション） */
	startPosition?: StartPosition;
}

