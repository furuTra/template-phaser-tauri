import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';

export interface WindowSettings {
  width: number;
  height: number;
  fullscreen: boolean;
}

const DEFAULT_SETTINGS: WindowSettings = {
  width: 1280,
  height: 720,
  fullscreen: false,
};

// ウィンドウサイズを変更
export async function setWindowSize(width: number, height: number): Promise<void> {
  const window = getCurrentWindow();
  await window.setSize(new LogicalSize(width, height));
  await window.center();
}

export async function loadWindowSettings(): Promise<WindowSettings> {
  // 将来的に設定を永続化する場合はここで読み込む
  return Promise.resolve(DEFAULT_SETTINGS);
}

// フルスクリーン切り替え
export async function setFullscreen(fullscreen: boolean): Promise<void> {
  const window = getCurrentWindow();
  await window.setFullscreen(fullscreen);
}

// 起動時に設定を適用
export async function applyWindowSettings(): Promise<void> {
  const settings = DEFAULT_SETTINGS;

  if (settings.fullscreen) {
    await setFullscreen(true);
  } else {
    await setWindowSize(settings.width, settings.height);
  }
}