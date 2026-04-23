export type Difficulty = 'again' | 'hard' | 'good' | 'easy';
export type Language = 'vi' | 'en';

export interface LocalizedText {
  vi: string;
  en: string;
}

export interface Flashcard {
  id: string;
  question: LocalizedText;
  answer: LocalizedText;
  level: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
}

export interface QuestionBankMeta {
  id: string;
  title: string;
  description: string;
  fileName: string;
}

export interface CardProgress {
  key: string;
  repetition: number;
  easeFactor: number;
  intervalDays: number;
  dueAt: string;
  lastReviewedAt?: string;
  totalReviews: number;
  againCount: number;
  hardCount: number;
  goodCount: number;
  easyCount: number;
}

export interface FlashcardWithBank {
  bankId: string;
  bankTitle: string;
  card: Flashcard;
}

export abstract class QuestionSource {
  abstract listBanks(): QuestionBankMeta[];
  abstract loadBank(bankId: string): Promise<Flashcard[]>;

  async loadMultipleBanks(bankIds: string[]): Promise<FlashcardWithBank[]> {
    const metaLookup = new Map(this.listBanks().map((b) => [b.id, b]));
    const allCards = await Promise.all(
      bankIds.map(async (id) => {
        const cards = await this.loadBank(id);
        const title = metaLookup.get(id)?.title ?? id;
        return cards.map((card) => ({ bankId: id, bankTitle: title, card }));
      })
    );

    return allCards.flat();
  }
}
