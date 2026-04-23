import { PointerEvent, useEffect, useMemo, useState } from 'react';
import {
  CardProgress,
  Difficulty,
  FlashcardWithBank,
  Language,
  QuestionBankMeta
} from './models/flashcard';
import { loadAllProgress, saveProgress } from './services/progress-db';
import { JsonQuestionSource } from './services/question-source';
import { createInitialProgress, isDue, updateProgress } from './services/spaced-repetition';

type Tab = 'dashboard' | 'learning' | 'settings';

const source = new JsonQuestionSource();
const SETTINGS_KEY = 'flashcard-app-settings';

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function getDifficultyBySwipe(deltaX: number, deltaY: number): Difficulty | null {
  const threshold = 72;
  if (Math.abs(deltaX) < threshold && Math.abs(deltaY) < threshold) return null;
  if (Math.abs(deltaX) >= Math.abs(deltaY)) return deltaX > 0 ? 'good' : 'again';
  return deltaY < 0 ? 'easy' : 'hard';
}

export default function App() {
  const [tab, setTab] = useState<Tab>('learning');
  const [banks, setBanks] = useState<QuestionBankMeta[]>([]);
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
  const [cards, setCards] = useState<FlashcardWithBank[]>([]);
  const [progress, setProgress] = useState<Record<string, CardProgress>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [mixedMode, setMixedMode] = useState(true);
  const [language, setLanguage] = useState<Language>('vi');
  const [dailyTarget, setDailyTarget] = useState(20);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const allBanks = source.listBanks();
    setBanks(allBanks);
    setSelectedBanks(allBanks.map((b) => b.id));

    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as {
        mixedMode?: boolean;
        language?: Language;
        dailyTarget?: number;
        selectedBanks?: string[];
      };
      if (typeof parsed.mixedMode === 'boolean') setMixedMode(parsed.mixedMode);
      if (parsed.language === 'vi' || parsed.language === 'en') setLanguage(parsed.language);
      if (typeof parsed.dailyTarget === 'number') setDailyTarget(parsed.dailyTarget);
      if (Array.isArray(parsed.selectedBanks) && parsed.selectedBanks.length) {
        setSelectedBanks(parsed.selectedBanks);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ mixedMode, language, dailyTarget, selectedBanks })
    );
  }, [mixedMode, language, dailyTarget, selectedBanks]);

  useEffect(() => {
    void loadAllProgress().then(setProgress);
  }, []);

  useEffect(() => {
    if (selectedBanks.length === 0) {
      setCards([]);
      return;
    }

    void source.loadMultipleBanks(selectedBanks).then((loaded) => {
      setCards(mixedMode ? shuffle(loaded) : loaded);
      setCurrentIndex(0);
      setFlipped(false);
    });
  }, [selectedBanks, mixedMode]);

  const dueCards = useMemo(
    () =>
      cards.filter((entry) => {
        const key = `${entry.bankId}:${entry.card.id}`;
        const p = progress[key] ?? createInitialProgress(key);
        return isDue(p);
      }),
    [cards, progress]
  );

  const dueLimited = dueCards.slice(0, dailyTarget);
  const current = dueLimited[currentIndex];

  const dashboardStats = useMemo(() => {
    const all = Object.values(progress);
    return {
      total: all.reduce((acc, item) => acc + item.totalReviews, 0),
      again: all.reduce((acc, item) => acc + item.againCount, 0),
      hard: all.reduce((acc, item) => acc + item.hardCount, 0),
      good: all.reduce((acc, item) => acc + item.goodCount, 0),
      easy: all.reduce((acc, item) => acc + item.easyCount, 0)
    };
  }, [progress]);

  const handleReview = async (difficulty: Difficulty) => {
    if (!current) return;
    const key = `${current.bankId}:${current.card.id}`;
    const currentProgress = progress[key] ?? createInitialProgress(key);
    const updated = updateProgress(currentProgress, difficulty);

    await saveProgress(updated);
    setProgress((prev) => ({ ...prev, [key]: updated }));
    setFlipped(false);
    setDragOffset({ x: 0, y: 0 });
    setCurrentIndex((prev) => (dueLimited.length <= 1 ? 0 : (prev + 1) % dueLimited.length));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    setStartPoint({ x: event.clientX, y: event.clientY });
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!startPoint || !flipped) return;
    setDragOffset({ x: event.clientX - startPoint.x, y: event.clientY - startPoint.y });
  };

  const onPointerUp = async () => {
    if (!startPoint || !flipped) {
      setStartPoint(null);
      return;
    }

    const difficulty = getDifficultyBySwipe(dragOffset.x, dragOffset.y);
    setStartPoint(null);

    if (!difficulty) {
      setDragOffset({ x: 0, y: 0 });
      return;
    }

    await handleReview(difficulty);
  };

  return (
    <main className="app">
      <header className="glass-shell header-shell">
        <h1>Interview Flashcards</h1>
        <p>
          {tab === 'learning' ? 'Tap để flip, swipe để chấm trí nhớ' : 'Active Recall + Spaced Repetition'}
        </p>
      </header>

      {tab === 'dashboard' && (
        <section className="content-shell">
          <h2>Dashboard</h2>
          <div className="stats-grid">
            <article>
              <h3>Total Reviews</h3>
              <p>{dashboardStats.total}</p>
            </article>
            <article>
              <h3>Due Today</h3>
              <p>{dueCards.length}</p>
            </article>
            <article>
              <h3>Again / Hard</h3>
              <p>
                {dashboardStats.again} / {dashboardStats.hard}
              </p>
            </article>
            <article>
              <h3>Good / Easy</h3>
              <p>
                {dashboardStats.good} / {dashboardStats.easy}
              </p>
            </article>
          </div>
        </section>
      )}

      {tab === 'learning' && (
        <section className="learning-screen">
          {!current ? (
            <div className="content-shell empty-state">
              <p>Không có thẻ đến hạn. Hãy chỉnh bộ câu hỏi trong Settings.</p>
            </div>
          ) : (
            <article
              className={`full-card ${flipped ? 'flipped' : ''}`}
              onClick={() => setFlipped((v) => !v)}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={() => void onPointerUp()}
              style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
            >
              <p className="meta">
                {current.bankTitle} · {current.card.level} · {currentIndex + 1}/{dueLimited.length}
              </p>
              {!flipped ? (
                <h2>{current.card.question[language]}</h2>
              ) : (
                <h2>{current.card.answer[language]}</h2>
              )}
              <p className="hint">← Again · ↓ Hard · → Good · ↑ Easy</p>
            </article>
          )}
        </section>
      )}

      {tab === 'settings' && (
        <section className="content-shell">
          <h2>Settings</h2>

          <div className="settings-row">
            <label htmlFor="language">Language</label>
            <select
              id="language"
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
            >
              <option value="vi">Tiếng Việt</option>
              <option value="en">English</option>
            </select>
          </div>

          <div className="settings-row">
            <label htmlFor="dailyTarget">Daily target</label>
            <input
              id="dailyTarget"
              type="number"
              min={5}
              max={300}
              value={dailyTarget}
              onChange={(e) => setDailyTarget(Number(e.target.value || 20))}
            />
          </div>

          <label className="toggle-row">
            <input
              type="checkbox"
              checked={mixedMode}
              onChange={(e) => setMixedMode(e.target.checked)}
            />
            Mix questions
          </label>

          <h3>Question banks</h3>
          <div className="bank-list">
            {banks.map((bank) => (
              <label key={bank.id} className="bank-item">
                <input
                  type="checkbox"
                  checked={selectedBanks.includes(bank.id)}
                  onChange={() =>
                    setSelectedBanks((prev) =>
                      prev.includes(bank.id)
                        ? prev.filter((bankId) => bankId !== bank.id)
                        : [...prev, bank.id]
                    )
                  }
                />
                <div>
                  <strong>{bank.title}</strong>
                  <small>{bank.fileName}</small>
                </div>
              </label>
            ))}
          </div>
        </section>
      )}

      <nav className="glass-shell bottom-nav">
        <button className={tab === 'dashboard' ? 'active' : ''} onClick={() => setTab('dashboard')}>
          Dashboard
        </button>
        <button className={tab === 'learning' ? 'active' : ''} onClick={() => setTab('learning')}>
          Learning
        </button>
        <button className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
          Settings
        </button>
      </nav>
    </main>
  );
}
