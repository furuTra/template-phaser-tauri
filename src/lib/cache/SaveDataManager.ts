import type { SaveData, GameData } from '../database';
import {
  getAllSaves,
  parseGameData,
  getDefaultGameData,
  createSave,
} from '../database';

/**
 * セーブデータのフロントエンド状態管理（Store）
 * 
 * 責務:
 * - DBから取得したセーブデータをメモリに保持
 * - View層（Phaserシーン）へのデータ提供
 * - データの更新管理（キャッシュの同期）
 */
export class SaveDataManager {
  private static instance: SaveDataManager;

  // Store（データ保持領域）- 全セーブスロット
  private slots: (SaveData | null)[] = [];

  // 現在選択中のスロットインデックス
  private currentSlotIndex: number | null = null;

  // 現在のゲームデータ（パース済み）
  private currentGameData: GameData | null = null;

  // 変更追跡フラグ
  private isDirty: boolean = false;

  // ロード済みフラグ
  private isLoaded: boolean = false;

  // スロット数の上限
  private readonly MAX_SLOTS = 3;

  private constructor() {
    // スロットを初期化
    this.slots = new Array(this.MAX_SLOTS).fill(null);
  }

  /**
   * シングルトンインスタンスを取得
   */
  static getInstance(): SaveDataManager {
    if (!SaveDataManager.instance) {
      SaveDataManager.instance = new SaveDataManager();
    }
    return SaveDataManager.instance;
  }

  /**
   * 初期化: DBからセーブデータをロードしてStoreに格納
   * 既にロード済みの場合はキャッシュを返す（DBアクセスなし）
   * @param force 強制的にDBから再読み込みする場合はtrue
   * @returns ロードしたスロットデータ
   */
  async load(force: boolean = false): Promise<(SaveData | null)[]> {
    // 既にロード済みで、強制リロードでなければキャッシュを返す
    if (this.isLoaded && !force) {
      if (import.meta.env.DEV) {
        console.log('[SaveDataManager] Using cached slots (skipping DB access)');
      }
      return this.slots;
    }

    try {
      const saves = await getAllSaves();

      // スロットを初期化
      this.slots = new Array(this.MAX_SLOTS).fill(null);

      // DBのセーブデータをスロットに格納（最大MAX_SLOTS件）
      saves.slice(0, this.MAX_SLOTS).forEach((save, index) => {
        this.slots[index] = save;
      });

      this.isDirty = false;
      this.isLoaded = true;

      if (import.meta.env.DEV) {
        console.log('[SaveDataManager] Loaded slots from DB:', this.slots);
      }

      return this.slots;
    } catch (error) {
      console.error('[SaveDataManager] Load failed:', error);
      throw error;
    }
  }

  /**
   * 強制的にDBから再読み込み
   * @returns ロードしたスロットデータ
   */
  async reload(): Promise<(SaveData | null)[]> {
    return this.load(true);
  }

  /**
   * ロード済みかどうかを取得
   */
  hasLoaded(): boolean {
    return this.isLoaded;
  }

  /**
   * 全スロットを取得
   * @returns スロット配列（読み取り専用）
   */
  getSlots(): readonly (SaveData | null)[] {
    return this.slots;
  }

  /**
   * 指定インデックスのスロットを取得
   * @param index スロットインデックス
   * @returns セーブデータまたはnull
   */
  getSlot(index: number): SaveData | null {
    if (index < 0 || index >= this.MAX_SLOTS) {
      return null;
    }
    return this.slots[index];
  }

  /**
   * 現在選択中のスロットインデックスを取得
   */
  getCurrentSlotIndex(): number | null {
    return this.currentSlotIndex;
  }

  /**
   * 現在のゲームデータを取得
   */
  getCurrentGameData(): GameData | null {
    return this.currentGameData;
  }

  /**
   * スロットを選択し、ゲームデータをロード
   * @param index スロットインデックス
   * @returns ゲームデータ
   */
  selectSlot(index: number): GameData {
    if (index < 0 || index >= this.MAX_SLOTS) {
      throw new Error(`Invalid slot index: ${index}`);
    }

    this.currentSlotIndex = index;
    const slot = this.slots[index];

    if (slot) {
      // 既存データをパース
      this.currentGameData = parseGameData(slot);
    } else {
      // 新規データを作成
      this.currentGameData = getDefaultGameData();
    }

    this.isDirty = false;

    if (import.meta.env.DEV) {
      console.log('[SaveDataManager] Selected slot:', index, this.currentGameData);
    }

    return this.currentGameData;
  }

  /**
   * 現在のゲームデータを更新（メモリのみ、DB未保存）
   * @param data 更新データ（部分更新可）
   */
  updateGameData(data: Partial<GameData>): void {
    if (!this.currentGameData) {
      throw new Error('No game data loaded. Call selectSlot() first.');
    }

    // イミュータブル更新
    this.currentGameData = { ...this.currentGameData, ...data };
    this.isDirty = true;

    if (import.meta.env.DEV) {
      console.log('[SaveDataManager] Updated game data:', data);
    }
  }

  /**
   * 特定フィールドのみ更新（型安全）
   * @param key フィールド名
   * @param value 新しい値
   */
  updateGameDataField<K extends keyof GameData>(
    key: K,
    value: GameData[K]
  ): void {
    if (!this.currentGameData) {
      throw new Error('No game data loaded. Call selectSlot() first.');
    }

    this.currentGameData = {
      ...this.currentGameData,
      [key]: value,
    };
    this.isDirty = true;

    if (import.meta.env.DEV) {
      console.log(`[SaveDataManager] Updated field ${key}:`, value);
    }
  }

  /**
   * 永続化: 現在のゲームデータをDBに保存
   * TODO: DatabaseHelper経由でDB保存を実装
   */
  async save(): Promise<void> {
    if (this.currentSlotIndex === null || !this.currentGameData) {
      throw new Error('No slot selected or no data to save');
    }

    try {
      // TODO: 実際のDB保存処理を実装
      // const dbHelper = DatabaseHelper.getInstance();
      // await dbHelper.saveToSlot(this.currentSlotIndex, this.currentGameData);

      console.log('[SaveDataManager] Save called (TODO: implement DB save)');
      console.log('  Slot:', this.currentSlotIndex);
      console.log('  Data:', this.currentGameData);

      this.isDirty = false;
    } catch (error) {
      console.error('[SaveDataManager] Save failed:', error);
      throw error;
    }
  }

  /**
   * 自動保存: 変更がある場合のみ保存
   */
  async autoSave(): Promise<void> {
    if (this.isDirty) {
      await this.save();
    }
  }

  /**
   * 状態確認: 未保存の変更があるか
   * @returns true: 未保存あり, false: すべて保存済み
   */
  hasUnsavedChanges(): boolean {
    return this.isDirty;
  }

  /**
   * スロットを削除
   * @param index スロットインデックス
   * TODO: DatabaseHelper経由でDB削除を実装
   */
  async deleteSlot(index: number): Promise<void> {
    if (index < 0 || index >= this.MAX_SLOTS) {
      throw new Error(`Invalid slot index: ${index}`);
    }

    try {
      // TODO: 実際のDB削除処理を実装
      // const dbHelper = DatabaseHelper.getInstance();
      // await dbHelper.deleteSlot(index);

      console.log('[SaveDataManager] Delete called (TODO: implement DB delete)');
      console.log('  Slot:', index);

      // メモリ上のスロットをクリア
      this.slots[index] = null;

      // 現在選択中のスロットが削除された場合はクリア
      if (this.currentSlotIndex === index) {
        this.currentSlotIndex = null;
        this.currentGameData = null;
        this.isDirty = false;
      }
    } catch (error) {
      console.error('[SaveDataManager] Delete failed:', error);
      throw error;
    }
  }

  /**
   * Storeをクリア
   */
  clear(): void {
    this.slots = new Array(this.MAX_SLOTS).fill(null);
    this.currentSlotIndex = null;
    this.currentGameData = null;
    this.isDirty = false;
    this.isLoaded = false;

    if (import.meta.env.DEV) {
      console.log('[SaveDataManager] Store cleared');
    }
  }

  /**
   * スロット数の上限を取得
   */
  getMaxSlots(): number {
    return this.MAX_SLOTS;
  }

  /**
   * 空きスロットがあるかチェック
   * @returns 空きスロットがあればtrue
   */
  hasEmptySlot(): boolean {
    return this.slots.some(slot => slot === null);
  }

  /**
   * 最初の空きスロットのインデックスを取得
   * @returns 空きスロットのインデックス、なければ-1
   */
  getFirstEmptySlotIndex(): number {
    return this.slots.findIndex(slot => slot === null);
  }

  /**
   * 新規セーブを作成してスロットに格納
   * @param title セーブデータのタイトル
   * @param data 初期ゲームデータ（省略時はデフォルト）
   * @returns 作成されたスロットインデックス
   */
  async createSlot(title: string, data?: GameData): Promise<number> {
    const emptyIndex = this.getFirstEmptySlotIndex();
    if (emptyIndex === -1) {
      throw new Error('No empty slot available');
    }

    try {
      const gameData = data || getDefaultGameData();
      const newSave = await createSave(title, gameData);

      // メモリ上のスロットに格納
      this.slots[emptyIndex] = newSave;

      if (import.meta.env.DEV) {
        console.log('[SaveDataManager] Created new slot:', emptyIndex, newSave);
      }

      return emptyIndex;
    } catch (error) {
      console.error('[SaveDataManager] Create failed:', error);
      throw error;
    }
  }

  /**
   * 指定スロットに新規セーブを作成
   * @param index 作成先のスロットインデックス
   * @param title セーブデータのタイトル
   * @param data 初期ゲームデータ（省略時はデフォルト）
   * @returns 作成されたスロットインデックス
   */
  async createSlotAt(index: number, title: string, data?: GameData): Promise<number> {
    if (index < 0 || index >= this.MAX_SLOTS) {
      throw new Error(`Invalid slot index: ${index}`);
    }

    if (this.slots[index] !== null) {
      throw new Error(`Slot ${index} is not empty`);
    }

    try {
      const gameData = data || getDefaultGameData();
      const newSave = await createSave(title, gameData);

      // メモリ上の指定スロットに格納
      this.slots[index] = newSave;

      if (import.meta.env.DEV) {
        console.log('[SaveDataManager] Created new slot at:', index, newSave);
      }

      return index;
    } catch (error) {
      console.error('[SaveDataManager] Create at slot failed:', error);
      throw error;
    }
  }

  /**
   * 開発用: デバッグ情報を取得
   */
  getDebugInfo(): {
    slots: (SaveData | null)[];
    currentSlotIndex: number | null;
    currentGameData: GameData | null;
    isDirty: boolean;
    isLoaded: boolean;
  } {
    return {
      slots: this.slots,
      currentSlotIndex: this.currentSlotIndex,
      currentGameData: this.currentGameData,
      isDirty: this.isDirty,
      isLoaded: this.isLoaded,
    };
  }
}

