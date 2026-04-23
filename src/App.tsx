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
  const threshold = 80;
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
      };
      if (typeof parsed.mixedMode === 'boolean') setMixedMode(parsed.mixedMode);
      if (parsed.language === 'vi' || parsed.language === 'en') setLanguage(parsed.language);
      if (typeof parsed.dailyTarget === 'number') setDailyTarget(parsed.dailyTarget);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ mixedMode, language, dailyTarget }));
  }, [mixedMode, language, dailyTarget]);

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

  const current = dueCards[currentIndex];
  const dueLimited = dueCards.slice(0, dailyTarget);

  const dashboardStats = useMemo(() => {
    const total = Object.values(progress).reduce((acc, item) => acc + item.totalReviews, 0);
    const again = Object.values(progress).reduce((acc, item) => acc + item.againCount, 0);
    const hard = Object.values(progress).reduce((acc, item) => acc + item.hardCount, 0);
    const good = Object.values(progress).reduce((acc, item) => acc + item.goodCount, 0);
    const easy = Object.values(progress).reduce((acc, item) => acc + item.easyCount, 0);

    return { total, again, hard, good, easy };
  }, [progress]);

  const onToggleBank = (id: string) => {
    setSelectedBanks((prev) =>
      prev.includes(id) ? prev.filter((bankId) => bankId !== id) : [...prev, id]
    );
  };

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
      <header className="app-header glass-surface">
        <div>
          <p className="eyebrow">Flashcards learning</p>
          <h1>Learning Dashboard</h1>
        </div>
        <span className="header-chip">{tab.toUpperCase()}</span>
      </header>

      {tab === 'dashboard' && (
        <section className="panel">
          <h2>Dashboard học tập</h2>
          <div className="stats-grid">
            <article>
              <h3>Tổng lượt review</h3>
              <p>{dashboardStats.total}</p>
            </article>
            <article>
              <h3>Due hôm nay</h3>
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
          <p className="hint">Daily target: {dailyTarget} thẻ · Language: {language.toUpperCase()}</p>
        </section>
      )}

      {tab === 'learning' && (
        <section className="panel learning-screen">
          <div className="learning-head">
            <h2>
              Due: {dueLimited.length} / Tổng selected: {cards.length}
            </h2>
            <p className="hint">Swipe: ← Again · ↓ Hard · → Good · ↑ Easy</p>
          </div>

          {!current ? (
            <p>Không có thẻ đến hạn. Hãy thêm topic hoặc ôn lại sau.</p>
          ) : (
            <article
              className={`flashcard flashcard-full ${flipped ? 'flipped' : ''}`}
              onClick={() => setFlipped((v) => !v)}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={() => void onPointerUp()}
              style={{ transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)` }}
            >
              <p className="meta">
                {current.bankTitle} · {current.card.level}
              </p>
              {!flipped ? (
                <>
                  <h3>{current.card.question[language]}</h3>
                  <p className="hint">Tap để flip card.</p>
                </>
              ) : (
                <>
                  <h3>{current.card.answer[language]}</h3>
                  <p className="hint">Sau khi nhớ xong, swipe để chấm mức ghi nhớ.</p>
                </>
              )}
            </article>
          )}
        </section>
      )}

      {tab === 'settings' && (
        <>
          <section className="panel">
            <h2>Chọn bộ câu hỏi (JSON)</h2>
            <div className="bank-list">
              {banks.map((bank) => (
                <label key={bank.id} className="bank-item">
                  <input
                    type="checkbox"
                    checked={selectedBanks.includes(bank.id)}
                    onChange={() => onToggleBank(bank.id)}
                  />
                  <div>
                    <strong>{bank.title}</strong>
                    <small>
                      {bank.description} · file: <code>{bank.fileName}</code>
                    </small>
                  </div>
                </label>
              ))}
            </div>
          </section>
          <section className="panel">
            <h2>Settings</h2>
            <div className="settings-row">
              <label htmlFor="language">Ngôn ngữ câu hỏi</label>
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
              <label htmlFor="dailyTarget">Số thẻ tối đa / ngày</label>
              <input
                id="dailyTarget"
                type="number"
                min={5}
                max={200}
                value={dailyTarget}
                onChange={(e) => setDailyTarget(Number(e.target.value || 20))}
              />
            </div>

            <label className="mix-toggle">
              <input
                type="checkbox"
                checked={mixedMode}
                onChange={(e) => setMixedMode(e.target.checked)}
              />
              Bật chế độ trộn câu hỏi (mix mode)
            </label>
          </section>
        </>
      )}

      <nav className="bottom-nav">
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
