# Coin Flip Incremental Game — 项目 PLAN

一款"抛硬币"主题的前端增量游戏：点击抛硬币，dollar 面朝上赢得现金；骷髅面朝上获得骷髅代币（可扭蛋抽取助手帽子外观）；用现金购买硬币与升级形成指数增长；雇佣助手自动化；天赋解锁新硬币；牺牲一切转生实现跨维度成长。

## 技术选型

| 层面 | 选型 |
|---|---|
| 语言/框架 | TypeScript + Vue 3（Composition API）+ Vite 5 |
| 状态 | Pinia（替代全局 player，响应式 + 可持久化 + 可测试） |
| 大数 | break_infinity.js |
| 存储 | localStorage + StorageAdapter 接口（后端/云端可替换） |
| 画风 | nes.css 8-bit 复古像素风 + 像素风黑体（Fusion Pixel Font，woff2 自托管） |
| 测试 | Vitest（core 纯逻辑单测）+ playwright-cli 端到端验收 |
| 国际化 | vue-i18n（中英双语） |

## 架构（借鉴 antimatter-dimensions 的解决方案）

分层铁律：`core` 层纯 TS，禁止 import 任何 UI/框架代码；UI 仅经 Pinia store 读状态、调用 core 纯函数。

```
UI 层 (Vue3 views/components) → 绑定层 (Pinia stores) → core 纯 TS 逻辑层
                                                        ├─ engine: gameLoop(固定步长) / timeManager(离线) / eventBus
                                                        ├─ mechanics: derivativeChain / prestige / challenges / automator / talents / helpers / gacha / coins
                                                        ├─ data: 数据驱动配置（coinTypes / helperTypes / gachaPool / prestigeTiers / talents / challenges）
                                                        ├─ state: 可序列化 GameState + schema 版本迁移
                                                        └─ storage: StorageAdapter 接口
```

## 六大机制实现

1. **导数级联生产链**：8 层硬币维度 D1..D8，`dD_k/dt = D_{k+1}×R_{k+1}` 微分累加，D1 产出现金；每买 K 个翻倍（×2^(bought/K)）；产出倍率走 Lazy 缓存 + 事件失效。
2. **嵌套转生状态机**：Tier1-4 统一 Reset 流程（BEFORE → 结算通货 → 清空作用域 → AFTER）；bought（阶梯升级）、外观、高阶通货跨转生保留；Tier1 已接入 UI。
3. **规则颠覆挑战系统**：维度封禁 / 反向扣减 / 动态对抗（opposition 超限失败）三种规则；通关奖励为机制级 unlockFlag（bulkBuy / autobuyer.conditions / challenge.switching）。
4. **渐进式自动化**：手动点击 → 助手自动抛硬币 → 自动购买器（D1，可开关）→ DSL 脚本（`if cash >= 1e6 then prestige 1`，受限语法安全解析）。
5. **可重置加点树**：离线挂机 / 在线操作 / 维度偏向三系 9 节点；点数来自 Tier1 通货 reputation；`freeReset` 无损重置自由组合 Build。
6. **极简 UI 与大数性能**：break_infinity.js、科学/工程计数切换、nes.css 极简 DOM 渲染、离线公式结算 + 固定步长补算（tick 上限 1000 防卡死）。

## AI 协作开发规范（项目铁律）

1. **PLAN 先行**：每个功能先产出 PLAN，确认后实施；完成后同步 docs/PLAN.md。
2. **测试先行**：core 层机制必须有 Vitest 单测；UI 用 playwright-cli 端到端验收并截图；无测试不提交。
3. **代码规范**：ESLint + Prettier + vue-tsc + EditorConfig；core 层框架无关；模块间仅 EventBus 通信；单文件 ≤300 行；语义化提交（feat/fix/docs/test/refactor）。
4. **视觉规范**：像素风黑体（Fusion Pixel Font）全局；禁止原生 emoji，符号用像素贴图或像素 CSS 重绘。
5. **Definition of Done**：todo 完成 + lint/类型/单测通过 + playwright 验收截图 + 文档同步。

## 页面规划

1. **Table 主游戏页**：红色地毯硬币点击区 + 右侧 ITEMS 面板（8 硬币购买卡）。
2. **Helpers 助手页**：8 种助手雇佣卡 + 扭蛋机模态（11 帽子 × 4 稀有度收藏图鉴）。
3. **Ascension 转生页**：Tier1-4 转生卡片 + 紫色星空背景天赋树（三系节点 + 无损重置）。
4. **Challenges 挑战页**：3 个规则颠覆挑战卡 + 对抗资源进度条 + DSL 自动化脚本。
5. **Gacha 扭蛋机（模态）**：消耗骷髅代币抽卡 + 收藏图鉴。

## 已实现状态

- [x] 脚手架与引擎基础设施（gameLoop/EventBus/Lazy/StorageAdapter/大数格式化）
- [x] 导数级联生产链 + MVP 循环（抛硬币/购买/存档/离线结算）
- [x] 助手自动化 + 骷髅代币 + 扭蛋机 + 自动购买器
- [x] Tier1-4 转生状态机 + 三系天赋树（无损重置）
- [x] 规则颠覆挑战（封禁/反向扣减/动态对抗）+ DSL 自动化引擎
- [x] 4 Tab 完整 UI + Gacha 模态 + i18n + 像素风主题
- [x] 91 个 Vitest 单测全部通过，lint/typecheck/build 全绿，playwright 端到端验收截图

## 未来扩展方向

- 后端接入：StorageAdapter 已有接口，实现 BackendAdapter + 事件埋点上报即可
- 升级系统（Upgrades 页）、成就系统
- 稀有外观带产能加成（rarity × multiplier）
- 更多挑战规则与 Tier2-4 深层机制
