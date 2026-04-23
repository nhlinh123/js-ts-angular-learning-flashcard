import { openDB } from 'idb';
import { CardProgress } from '../models/flashcard';

const DB_NAME = 'flashcard-progress-db';
const STORE_NAME = 'progress';

async function getDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'key' });
      }
    }
  });
}

export async function loadAllProgress(): Promise<Record<string, CardProgress>> {
  const db = await getDb();
  const all = (await db.getAll(STORE_NAME)) as CardProgress[];
  return all.reduce<Record<string, CardProgress>>((acc, item) => {
    acc[item.key] = item;
    return acc;
  }, {});
}

export async function saveProgress(item: CardProgress): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, item);
}
