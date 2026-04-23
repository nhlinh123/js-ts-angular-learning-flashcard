# JS / TS / Angular Interview Flashcards (PWA)

Ứng dụng flashcard theo **active recall + spaced repetition** cho lộ trình phỏng vấn JavaScript, TypeScript, Angular và Problem Solving.

## Điểm chính

- PWA (cài như app trên mobile/desktop).
- Bottom nav gồm 3 tab: `Dashboard`, `Learning`, `Settings`.
- Câu hỏi hỗ trợ song ngữ: **Tiếng Việt** và **English**.
- Trong tab Learning:
  - Tap để **flip card** (lật từ câu hỏi sang đáp án).
  - Swipe để chấm trí nhớ: `← Again`, `↓ Hard`, `→ Good`, `↑ Easy`.
- Câu hỏi nằm trong các file JSON để dễ bổ sung.
- Học theo due-card với spaced repetition kiểu SM-2 đơn giản.
- Lưu tiến độ vào IndexedDB.
- Có chế độ mix câu hỏi và chọn chủ đề theo danh sách file JSON.
- Kiến trúc dùng `abstract class QuestionSource` để mở rộng nguồn dữ liệu.

## Cấu trúc dữ liệu JSON

```json
[
  {
    "id": "unique-id",
    "question": { "vi": "...", "en": "..." },
    "answer": { "vi": "...", "en": "..." },
    "level": "beginner | intermediate | advanced",
    "tags": ["tag1", "tag2"]
  }
]
```

## Chạy local

```bash
npm install
npm run dev
```

## Build nhanh để deploy Vercel

```bash
npm run build
```

Project đã có sẵn `vercel.json`, chỉ cần import repo vào Vercel là deploy.
