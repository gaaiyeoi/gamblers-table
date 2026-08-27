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

## 🎮 Core Gameplay（核心玩法详解）

Gambler's Table 是一款**增量放置游戏（Incremental）**：以"掷硬币"为原点，构建起
"手动操作 → 自动挂机 → 多维生产 → 重生进阶"的完整成长闭环。下面按机制逐层拆解。

### 1️⃣ 核心循环：掷硬币

这是所有玩法的起点。点击桌布上的硬币即可翻转一次：

| 结果 | 概率 | 收益 |
|------|------|------|
| **Dollar 面朝上** | 50% | 获得 **现金（Cash）** |
| **Skull 面朝上** | 50% | 获得 **1 枚骷髅代币（Skull Token）**，不赚现金 |

**收益公式**（手动点击）：`收益 = 基础值 1 × (1 + 累计购买硬币数 × 0.1) × 点击倍率`

也就是说，你拥有的硬币越多，每次手动点击赚得越多——这是驱动玩家持续购买维度的正反馈。
骷髅代币本身不产出现金，但它是**扭蛋机（Gacha）** 的硬通货，也是部分硬币/助手/关卡的解锁条件。

### 2️⃣ 导数级联生产链（硬币维度 D1–D8）

这是仿照 antimatter-dimensions 的**核心挂机机制**。共 8 层硬币维度（铜币 → 黑曜石币），
每层产出会**注入下一层**，形成级联：

```
D8 → D7 → D6 → … → D2 → D1 → 现金
```

**递推公式**：`dD_k/dt = D_{k+1} × R_{k+1}`，其中 `R` 为该维度生产倍率。
- 每 tick 从最高阶向下级联：`D_k` 的产出注入 `D_{k-1}.amount`
- 最终由 `D_1` 产出现金
- 单维度产出倍率：`baseRate × 2^(bought/K)`，即**每买 K 个该维度，产量翻倍**（K=25）

**解锁条件**：除铜币（开局自带 1 枚）外，每个硬币都有基于**累计统计**的解锁门槛
（如"累计赚取 50 万""累计抛币 1 千""累计获得骷髅 100 枚"），达成后自动解锁，顺序自然推进。

| 维度 | 名称 | 初始成本 | 基础产出/秒 | 解锁条件 |
|------|------|---------|-----------|---------|
| D1 | 铜币 | 15 | 0.5 | 开局可用 |
| D2 | 银币 | 150 | 3 | 累计赚取 50 万 |
| D3 | 金币 | 1.1 万 | 25 | 累计赚取 1,000 万 |
| D4 | 铂金币 | 120 万 | 250 | 累计抛币 1 千 |
| D5 | 钻石币 | 15 亿 | 3,000 | 累计赚取 10 亿 |
| D6 | 红宝石币 | 2 万亿 | 5 万 | 累计获得骷髅 100 枚 |
| D7 | 祖母绿币 | 3,000 万亿 | 100 万 | 累计抛币 5 万 |
| D8 | 黑曜石币 | 5,000 亿亿 | 2,500 万 | 累计赚取 1 万亿 |

### 3️⃣ 助手系统（被动自动抛币）

雇佣助手后，它们会**每秒自动抛硬币**，为你持续产出现金与骷髅代币（等价于自动点击）。

- 助手每次抛币与手动点击等价（50% 骷髅 / 50% 现金）
- 助手同样有解锁门槛（累计统计驱动），共 8 种：新手助手 → 神话存在
- 雇用成本按几何级数递增，买得越多越贵
- **帽子（Hat）外观系统**：可给助手戴上从扭蛋机抽到的帽子（仅外观，MVP 无产能加成）

| 助手 | 初始成本 | 抛币/秒 | 解锁条件 |
|------|---------|--------|---------|
| 新手助手 | 5 | 0.5 | 开局可用 |
| 狐狸老手 | 500 | 2 | 累计 30 枚骷髅代币 |
| 熊力壮汉 | 5,000 | 8 | 累计赚取 5 万 |
| 魔法师傅 | 5 万 | 30 | 累计抛币 5 千 |
| 冰霜大师 | 100 万 | 100 | 累计赚取 100 万 |
| 炎炎宗师 | 1 亿 | 400 | 累计抛币 5 万 |
| 传奇英雄 | 100 亿 | 1,500 | 累计赚取 1 亿 |
| 神话存在 | 1 万亿 | 5,000 | 累计抛币 50 万 |

### 4️⃣ 任务关卡（主线，一局一关）

一条**线性主线**，共 12 关，从极小目标起步逐关抬升，提供前期正反馈。

- **一局一关 + 过关确认**：达成当前关目标后**不会自动推进**，而是弹出"待确认"提示，
  由你点击"过关"后才应用奖励并开启下一关；也可选择"暂缓"，稍后再过。
- **目标类型多样**：累计赚取、累计抛币、累计购买维度、累计雇佣助手、骷髅代币、当前现金。
- **奖励分两种**：永久数值加成（点击倍率 ×、全局收益倍率 ×，跨转生保留）与机制级解锁
  （如批量购买 bulkBuy、自动购买器 autobuyer 等）。

**关卡奖励一览**：

| 关卡 | 目标 | 奖励 |
|------|------|------|
| 1 | 累计赚取 100 万 | 点击倍率 ×1.5 |
| 2 | 累计赚取 1,000 万 | 收益倍率 ×1.5 |
| 3 | 累计赚取 1 亿 | 解锁批量购买 |
| 4 | 雇佣助手 5 名 | 点击倍率 ×2 |
| 5 | 累计购买维度 30 | 解锁自动购买器 |
| 6 | 累计赚取 10 亿 | 收益倍率 ×2 |
| 7 | 骷髅代币 40 | 点击倍率 ×2.5 |
| 8 | 累计赚取 100 亿 | 点击倍率 ×3 |
| 9 | 累计购买维度 120 | 收益倍率 ×2.5 |
| 10 | 累计抛币 5 万 | 解锁自动购买条件 |
| 11 | 累计赚取 1,000 亿 | 点击倍率 ×4 |
| 12 | 累计赚取 1 万亿 | 收益倍率 ×5 |

### 5️⃣ 转生系统（4 层嵌套 Prestige）

达到阈值后转生，用当前现金结算**硬通货**，重置本轮进度以换取更高倍率的永久加成。

- **4 层嵌套转生**：声誉（Reputation）→ 无限点 → 永恒点 → 现实机器，每层阈值与公式独立。
- **MVP 已启用 Tier1（声誉）**：`现金 ≥ 100 万` 时，`收益 = ⌊(log₁₀(现金) - 6)²⌋`，
  现金越高收益越陡，鼓励冲数值。
- **转生会清空**：现金、维度 amount、升级、助手数量；**保留**：已购买维度数量（阶梯翻倍）、
  高阶通货、天赋、解锁位、扭蛋收藏、骷髅代币、累计统计、关卡"永生加成"（点击/收益倍率）。
- **重生关卡**：转生会把关卡进度刷回 0（重新从第 1 关打起），但永生加成与机制解锁保留，重打更快。

### 6️⃣ 天赋树（三系分支）

消耗转生通货解锁被动加成，共 9 个节点，三条流派：

- **离线挂机流（Offline）**：增强离线收益
- **在线操作流（Online）**：增强在线操作收益
- **维度偏向流（Dimension）**：增强维度产出倍率

> MVP 节点为占位实现（multiplier 字段预留，后续接入乘算），数值随成本递增。

### 7️⃣ 规则颠覆挑战（Challenge Runs）

在挑战模式下，游戏规则会被改写，通关后解锁**永久机制级奖励**。共 3 个 MVP 挑战：

| 挑战 | 规则 | 目标 | 奖励 |
|------|------|------|------|
| Even Only | **封禁维度**：禁止购买奇数阶维度（1/3/5/7） | 现金 10 万 | 批量购买 |
| Reverse Flow | **反向扣减**：购买维度时从高阶维度扣除额外资源 | 现金 50 万 | 自动购买条件 |
| Dark Matter | **动态对抗**：opposition 每秒增长，超过现金比例即失败 | 现金 100 万 | 挑战切换 |

- 挑战失败会重置本轮可再生进度（现金、维度 amount、助手），但高阶货币/收藏/购买阶梯保留。
- 完成挑战即可获得对应 `rewardFlag`（永久解锁），并开启更高阶玩法。

### 8️⃣ 扭蛋机（Gacha，骷髅代币消耗点）

骷髅代币的另一大用途：花费 1 枚骷髅代币抽一次，抽取**帽子外观**加入收藏，可给助手佩戴。

**稀有度权重**：普通 70 / 稀有 20 / 史诗 8 / 传说 2。

| 稀有度 | 示例帽子 |
|--------|---------|
| 普通 | 棕帽、灰帽、绿帽、紫帽 |
| 稀有 | 红苹果帽、棕尖帽、黑帽 |
| 史诗 | 潜水帽、兔耳帽 |
| 传说 | 金帽、彩虹帽 |

### 9️⃣ 自动化脚本（Automator DSL）

高级阶段，用受限的**策略 DSL** 编写脚本实现挂机自动化，仅解析固定语法、不执行任意 JS，安全无害：

```text
if cash >= 1000000 then prestige 1
if reputation >= 5 then start challenge darkMatter
```

支持指标：`cash` / `reputation` / `opposition`；支持动作：`prestige` / `start challenge`。

### 🔟 自动购买器（Autobuyer，QoL）

每个硬币维度对应一个独立自动购买器开关，开启后自动在该维度"钱够就买"。
部分由关卡/挑战解锁（`autobuyer`、`autobuyer.conditions` 等机制位）。

---

### 🔄 玩法循环总览

```
手动点击掷硬币（赚现金 / 骷髅代币）
      │
      ├─► 购买硬币维度 D1–D8（级联挂机产出现金）
      │        └─► 每买 25 个产量翻倍，指数增长
      ├─► 雇佣助手（每秒自动抛币，双线并进）
      ├─► 骷髅代币 ──► 扭蛋抽帽子外观
      │
      ▼
  关卡主线（达成目标 → 过关拿永久加成）
      │
      ▼
  转生 Prestige（现金 → 声誉通货 → 更强倍率，重启循环）
      │
      ├─► 天赋树（三系被动）
      ├─► 规则颠覆挑战（通关解锁永久机制）
      └─► 自动化脚本（挂机解放双手）
```

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
