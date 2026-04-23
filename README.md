# JS / TS / Angular Interview Flashcards (PWA)

Ứng dụng flashcard active recall + spaced repetition với giao diện theo phong cách **Apple Crystal / Functional Glass**.

## UI cập nhật

- Bottom nav gồm 3 tab: `Dashboard`, `Learning`, `Settings`.
- Chỉ dùng glass cho: header + tab bar.
- Nội dung chính dùng solid surfaces: `#FFFFFF` / `#1C1C1E`.
- Accent color: `#0A84FF`.
- Tab Learning hiển thị card gần như full-screen.
- Tap để flip, swipe để chấm: `← Again`, `↓ Hard`, `→ Good`, `↑ Easy`.
- Chọn bộ câu hỏi được đặt trong tab `Settings`.

## Dữ liệu câu hỏi

- Mỗi file JSON có ~100 câu song ngữ `vi/en`:
  - `src/data/js.json`
  - `src/data/typescript.json`
  - `src/data/angular.json`
  - `src/data/problem-solving.json`

Schema:

```json
{
  "id": "...",
  "question": { "vi": "...", "en": "..." },
  "answer": { "vi": "...", "en": "..." },
  "level": "beginner|intermediate|advanced",
  "tags": ["..."]
}
```

## Chạy local

```bash
npm install
npm run dev
npm run build
```

## Deploy Vercel

Dự án đã có `vercel.json`, import repo là deploy được ngay.
