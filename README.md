# 🎰 Gambler's Table

A browser-based incremental coin-flip game built with **Vue 3 + TypeScript + Vite**.

Flip coins, earn tokens, unlock upgrades, and push your luck ever further — all in a retro pixel-art style powered by [NES.css](https://nostalgic-css.github.io/NES.css/).

---

## ✨ Features

- 🪙 **Coin Flip Core Loop** — flip coins to earn tokens; odds and multipliers improve with upgrades
- 📈 **Incremental Progression** — buy helpers, unlock passive income, and watch numbers go up
- 🏆 **Challenges & Ascension** — prestige system with challenge runs for meta-progression
- 🎰 **Gacha System** — spend tokens on gacha pulls for rare bonuses
- 🌐 **i18n Support** — multi-language via `vue-i18n`
- 💾 **Persistent Save** — game state saved to `localStorage`
- 🧪 **Unit Tested** — core logic covered by Vitest

---

## 🚀 Getting Started

### Prerequisites

- Node.js ≥ 18
- npm ≥ 9

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

Output is placed in `dist/`.

---

## 🧰 Tech Stack

| Layer | Library |
|-------|---------|
| Framework | Vue 3 (Composition API + `<script setup>`) |
| State | Pinia |
| Language | TypeScript |
| Bundler | Vite |
| UI | NES.css + Press Start 2P font |
| Big Numbers | break_infinity.js |
| i18n | vue-i18n |
| Testing | Vitest |
| Linting | ESLint + Prettier |

---

## 📁 Project Structure

```
src/
├── components/     # Reusable UI components
├── composables/    # Vue composables
├── core/           # Game logic (pure TypeScript)
├── i18n/           # Translation files
├── storage/        # Save / load helpers
├── stores/         # Pinia stores
├── styles/         # Global CSS
├── views/          # Page-level components
├── App.vue
└── main.ts
```

---

## 🧪 Testing

```bash
npm run test          # Run once
npm run test:watch    # Watch mode
```

---

## 📜 License

MIT
