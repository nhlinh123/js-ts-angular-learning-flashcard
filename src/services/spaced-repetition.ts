import { CardProgress, Difficulty } from '../models/flashcard';

const DAY = 24 * 60 * 60 * 1000;

const SCORE_MAP: Record<Difficulty, number> = {
  again: 0,
  hard: 3,
  good: 4,
  easy: 5
};

export function createInitialProgress(key: string): CardProgress {
  return {
    key,
    repetition: 0,
    easeFactor: 2.5,
    intervalDays: 0,
    dueAt: new Date().toISOString(),
    totalReviews: 0,
    againCount: 0,
    hardCount: 0,
    goodCount: 0,
    easyCount: 0
  };
}

export function updateProgress(current: CardProgress, difficulty: Difficulty): CardProgress {
  const score = SCORE_MAP[difficulty];
  let { repetition, easeFactor, intervalDays } = current;

  if (score < 3) {
    repetition = 0;
    intervalDays = 1;
  } else {
    repetition += 1;
    if (repetition === 1) intervalDays = 1;
    else if (repetition === 2) intervalDays = 3;
    else intervalDays = Math.max(1, Math.round(intervalDays * easeFactor));
  }

  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02)));

  return {
    ...current,
    repetition,
    easeFactor,
    intervalDays,
    lastReviewedAt: new Date().toISOString(),
    dueAt: new Date(Date.now() + intervalDays * DAY).toISOString(),
    totalReviews: current.totalReviews + 1,
    againCount: current.againCount + (difficulty === 'again' ? 1 : 0),
    hardCount: current.hardCount + (difficulty === 'hard' ? 1 : 0),
    goodCount: current.goodCount + (difficulty === 'good' ? 1 : 0),
    easyCount: current.easyCount + (difficulty === 'easy' ? 1 : 0)
  };
}

export function isDue(progress: CardProgress): boolean {
  return new Date(progress.dueAt).getTime() <= Date.now();
}
