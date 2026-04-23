import angularCards from '../data/angular.json';
import jsCards from '../data/js.json';
import problemSolvingCards from '../data/problem-solving.json';
import tsCards from '../data/typescript.json';
import { Flashcard, QuestionBankMeta, QuestionSource } from '../models/flashcard';

const BANKS: Array<QuestionBankMeta & { cards: Flashcard[] }> = [
  {
    id: 'javascript',
    title: 'JavaScript Interview',
    description: 'Core JavaScript từ beginner đến advanced',
    fileName: 'js.json',
    cards: jsCards as Flashcard[]
  },
  {
    id: 'typescript',
    title: 'TypeScript Interview',
    description: 'Type system, generics, advanced patterns',
    fileName: 'typescript.json',
    cards: tsCards as Flashcard[]
  },
  {
    id: 'angular',
    title: 'Angular Interview',
    description: 'DI, RxJS, change detection, performance',
    fileName: 'angular.json',
    cards: angularCards as Flashcard[]
  },
  {
    id: 'problem-solving',
    title: 'Problem Solving',
    description: 'Kỹ năng phân tích và xử lý vấn đề phỏng vấn',
    fileName: 'problem-solving.json',
    cards: problemSolvingCards as Flashcard[]
  }
];

export class JsonQuestionSource extends QuestionSource {
  listBanks(): QuestionBankMeta[] {
    return BANKS.map(({ cards, ...meta }) => meta);
  }

  async loadBank(bankId: string): Promise<Flashcard[]> {
    const bank = BANKS.find((b) => b.id === bankId);
    return bank ? bank.cards : [];
  }
}
