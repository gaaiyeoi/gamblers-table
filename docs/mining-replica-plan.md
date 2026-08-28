# 矿场玩法 1:1 复刻 Gooboo — 实施计划

参考源：`/Users/raojiarui/Documents/CodeX 2/gooboo/src`
目标项目：`gamblers-table/src`

## 目标

把 gamblers-table 当前"简化版矿场"替换为 Gooboo 矿场的完整实现，保持
数值公式、掉落条件、升级树、转生模型与 Gooboo 一致。

## 现状差距速览

| 维度 | Gooboo | gamblers-table 现状 |
| --- | --- | --- |
| 墙 | `durability`（独立状态） | `wallHp`（深度函数） |
| 硬度 | `toughness`（有效伤害 = damage − toughness） | 无 |
| 伤害来源 | `pickaxePower`（初始 8，靠锻造 RNG） | 升级树 5 乘子连乘 |
| 层间导航 | 可回退 1..maxDepth | 只能下潜 |
| Loot | 浅层每秒白拿 | 无 |
| 稀有掉落 | 11 种，条件各异 | 2 种 |
| 熔炼 | 7 条异步产线（温度/时间） | 填 10 次进度条 |
| 增强 | 7 种 × 10 级，可开关 | 1 次性布尔 |
| 转生 | Depth Dweller（时间累积资源）+ ember | `floor(sqrt(maxDepth)−3)` |
| 子模式 | 0 / 1 双模式（气态） | 无 |
| 升级树 | 81 + 25 + 54 (+21 premium) | 6 + 8 + 4 |

## 实施阶段

### P1 数学/工具地基
`src/core/math.ts` 补齐 Gooboo `js/utils/math.js` 的全部函数：
`logBase`、`getSequence`、`splicedLinear`、`splicedPow`、`splicedPowLinear`、
`deltaLinear`、`digitSum`、`getDiminishing`、`getApproaching`、`isPrime`。
另补 `buildNum`（后缀记数）供数据直译使用。

### P2 数据层 `core/data/mining.ts` 重写
- `MINING_CONSTANTS`：durability/toughness/scrap 基数、dweller、tick 相关
- `ORES`（9）：补 `power`、`impurity`；修正 `minDepth/maxDepth/modulo/baseAmount/amountMult`
- `RARE_EARTHS`（11）：granite / salt / coal / sulfur / niter / obsidian /
  deeprock / glowshard / limestone / moonshard / phosphorus
- `SMELTERY`（7）：aluminium / bronze / steel / titanium / shiny / iridium / darkIron
- `ENHANCEMENTS`（7）：与 7 种 bar 对应，需求 `10 + 5·level`
- `BEACONS`（4）：piercing / rich / wonder / hope
- `GASES`（6）：helium / neon / argon / krypton / xenon / radon

### P3 升级树移植
`core/data/miningUpgrades.ts`（81 常规）+ `miningUpgrades2.ts`（25 子模式1）+
`miningPrestigeUpgrades.ts`（54 声望）。保留"前置升级"门闩，解锁条件改为
`maxDepth >= unlockDepth`（Gooboo 用 `stat.maxDepth.total`）。

### P4 状态层 + 迁移
`MiningState` 扩展字段，`schema.ts` 新增 migration v9。

### P5 机制层 `core/mechanics/mining/`
- `depth.ts`：`depthDurability` / `depthToughness` / `currentDamage` / `hitsNeeded`
- `pickaxe.ts`：`pickaxeStats` / `pickaxeCost` / `pickaxeUpgradeChance` / `craftPickaxe`
- `loot.ts`：`awardLoot`（ore / rareEarth / gas / scrap），含 `breaks` 与 `loots`
- `smeltery.ts` / `enhancement.ts` / `beacon.ts` / `dweller.ts`
- `tick.ts`：主循环（替代现有 `tickMining`）

### P6 UI
`MiningScene.vue` 增加深度导航条与耐久/硬度显示；
`MiningAssets.vue` 拆分 Status / Inventory(锻造) / Smeltery / Enhancement / Beacon / Prestige 分区。

### P7 验证
`tests/mining*.test.ts` 覆盖关键公式；`npx tsc --noEmit` + `vitest run` + `npm run build`。

## 落地结构

```
src/core/data/mining.ts                  常量 / 9 矿 / 11 稀有掉落 / 6 气体 / 7 产线 / 7 增强 / 4 信标 / 货币与乘区定义
src/core/data/miningUpgrades.ts          81 常规 + 25 气态 + 54 声望升级（effect 走乘区）
src/core/data/miningNames.ts             中文名表（货币 / 产线 / 信标 / 升级）
src/core/mechanics/mining/mults.ts       乘区系统（base/mult/bonus + group 广播）
src/core/mechanics/mining/core.ts        派生数值层（耐久/硬度/伤害/掉落/货币/居民/熔炼/镐子/信标）
src/core/mechanics/mining/effects.ts     把升级/增强/信标/货币联动/圣遗物写进乘区
src/core/mechanics/mining/actions.ts     购买升级 / 锻造 / 熔炼 / 增强 / 信标 / 转生
src/core/mechanics/mining/tick.ts        主循环 + awardLoot + 熔炼推进 + 深度居民
src/core/mechanics/mining.ts             GameState 级门面（对外 API）
```

## ✅ 已完成：成就 / 卡牌 / 全局等级

### 成就系统（17 项）
- `core/data/miningAchievements.ts`：maxDepth0/1、speedrun、maxDamage、scrap、oreTotal、oreVariety、
  dwellerCap0/1、coal、enhancementHighest、resin、gasTotal、smoke、及 3 个秘密成就。
- 里程碑/奖励 1:1 移植 `js/modules/mining/achievement.js`（cap 默认 20，`reward[level]` 在升入该级前判定）。
- **keepUpgrade 的正确唯一来源**：由成就奖励驱动（`applyAchievements` 在 `rebuildMults` 幂等重放），
  取代了早先写死在升级定义里的错误来源。`resin` 成就 Lv3 发现遗物 `honeyPot`。
- 统计埋点：`core/mechanics/mining/stats.ts`（value/total 双轨），在 `gainCurrency` / tick / 锻造 / 增强 / 转生处挂载。

### 全局等级（GL）
- `globalLevel = (maxDepth0 - 1) + (maxDepth1 - 1)`，气态子模式解锁改为 **GL ≥ 625**（Gooboo 判据），
  替代原先按 `maxDepth0 ≥ 625` 的近似。卡包解锁随深度：260 → 高级卡包、350 → 豪华卡包。

### 卡牌系统（59 卡 / 7 包 / 8 收藏）
- `core/data/miningCards.ts`：59 张卡（id/collection/power/color/reward，省略装饰性 icons）。
- 7 个卡包（`intoDarkness`…`blackDust`），价格用 `gem_emerald`（本项目无村庄系统，转生时按居民峰值产出）。
- `core/mechanics/mining/cards.ts`：开包加权随机、装备上限（`miningCardCap`，默认 1）、卡力量、
  装备卡效果展开（mult ≥1 线性 / <1 幂）、卡组奖励（随收集数 / 卡力量）、收藏集全收集奖励。
- **未实现 shiny 卡**（需 `cardShiny` 解锁 + shinyDust 兑换链路，本项目留状态位不开采）。

## ✅ 已完成（第二批）：Premium / 遗物 / 笔记

### Premium 升级（21 条）
- `core/data/miningPremiumUpgrades.ts`：21 条（通用强化 7 + 矿石翻倍 10 + 气态 4）。
- 货币 `gem_ruby`：Gooboo 真钱购买，本项目改为**转生时按绿水晶产量 10% 产出**（最少 1，跨转生保留）。
- `kind` 存 `MiningState.premiumUpgrades`，购买走 `buyPremiumUpgrade`，效果在 `rebuildMults` 以 `premium_<id>` 来源应用。

### 遗物（精简版）
- `core/data/relics.ts` 改为 Gooboo 语义：被动效果 + active 技能 + 解锁条件。
  - friendlyBat：被动 `废料 ×1.25`；active 消耗 8 遗物之力换废料；**全局等级 ≥ 40 解锁**。
  - honeyPot：被动 `树脂上限 +1`；active 消耗 10 换树脂；**树脂成就 Lv3 发现**（`unlock.relic_honeyPot`）。
- `relic_power` 随时间自然累积（0.1/s，上限 100）——简化版替代 Gooboo 的 glyph 挖掘。
- 精简说明：跳过了 glyph 台座/挖掘进度/level 升级（与村庄、gallery 深度耦合）。

### 探险笔记（31 条深度节点）
- `core/data/miningNotes.ts`：按 Gooboo `notes[maxDepth0-1]` 深度映射，中文文案。
- 发现逻辑：子模式 0 首次击穿新层时记录，存入 `MiningState.discoveredNotes`，UI 展示「探险笔记」分区。

## 🧩 本项目扩展（Gooboo 没有，默认关闭或可忽略）

| 扩展 | 默认 | 说明 |
|---|---|---|
| `autoBuyUpgrades` 自动升级 | **关闭** | Gooboo 的 `system.settings.automation` 只有 `progressMining` 与 `fightHordeBoss`（horde 功能），**矿场没有自动购买升级**。开关关闭时行为与 Gooboo 完全一致。开启后每 10 秒扫一遍可见升级，按「本次付款中金额最高的那项资源」从便宜到昂贵依次购买，避免单一升级吃光资源导致扩容类永远买不起。 |
| 圣遗物（friendlyBat / honeyPot） | 存在 | 原项目自有系统，作为额外 `miningDamage` / `currencyMiningScrapGain` 乘区叠加。 |

## ⚠ 与直觉不同、但必须保持的 Gooboo 行为

1. **`progressMining` 默认为 `null`（→ 0），即默认不自动下潜。**
   击碎新层后若下层击碎耗时 > 阈值，玩家会**停在原层继续刷**（`loots` 机制），
   必须手动点导航条的 `▶ / ⏭` 才能继续推进。UI 已提供「自动下潜」输入框（0 = 手动）。
2. **在已挖到过的层（`depth < maxDepth`）不击碎也有收益。**
   这是 Gooboo 的核心：回浅层刷资源，而不是一路往下冲。
3. **伤害被硬度吃光时矿壁不再推进**，但硫仍按秒产出（`depth >= 110` 且本层未击碎）。
4. **辉光碎片不通过挖矿获得**（Gooboo 中为成就奖励），故 `awardLoot` 不发放。
5. 同一升级内多条 `type` 相同的效果写同一乘区桶时**后者覆盖前者**（Gooboo 原样行为）。

## 关键不变量（回归基线）

- `depthDurability(1) = ceil(1.75^1 * 1.1^2 * 10) = 22`
- `depth < 10` 时 toughness 恒为 0
- `currentDamage <= 0` 时耐久不推进（卡死）
- 子模式 0 时 `durabilityBase = 10`，子模式 1 时 `500e6`
- 转生清空 `depth/pickaxePower/ingredientList/breaks/enhancement/smeltery/upgrade/currency/stat`，
  保留绿水晶 / 黄水晶 / ember

## ✅ 已对齐（Phase 1–3 复核结论）

### 通用货币 overcap（Phase 1）
- 对齐 `store/currency.js → gain`：**所有有 cap 的货币都支持 overcap**（默认 `overcapMult=0.25`、
  `overcapScaling=0.5`，与 Gooboo 缺省一致）。
- 实现位置：`core/mechanics/mining/core.ts → gainCurrency`；数据字段
  `MiningCurrencyDef.overcapMult / overcapScaling`。
- 特例（按 Gooboo 原始定义）：
  - `smoke`：cap 10，`overcapScaling=0.25`
  - `ember`：cap 100，`overcapMult=1, overcapScaling=0`（可线性超出一段即 2×cap，之后封顶）
- 无 cap 货币（稀有掉落/锭/气体/水晶）`cap=null` → 直接累加，不受 overcap 影响。

### 升级树 requirement 核对（Phase 3）
- 对 Gooboo `upgrade.js`(81) / `upgrade2.js`(25) / `upgradePrestige.js`(54) 与
  `miningUpgrades.ts`(160) 做静态比对：**升级数 160/160 一致，所有 `requirementValue`
  （深度门槛 / 居民上限门槛）逐条一致**。
- 语义映射：Gooboo `requirementStat=mining_maxDepth0` → 深度门槛 `type:'depth'`；
  `requirementStat0/1=mining_depthDwellerCap0/1` → 居民上限 `type:'dwellerCap'`。
- `oreSlots` / `compressor` 的逐级深度数组（`[25,25,30,50,80,120,175,260,350,450]` 等）已 1:1 落入 `levelRequirement`。

## 🗂 与 Gooboo 的简化对照表（架构决策，勿当 bug 返工）

| Gooboo 原机制 | gamblers 替代 / 现状 | 说明 |
|---|---|---|
| 矿洞产出 emerald → 村/研究消费 | 转生时按居民峰值产出 `gem_emerald` | 无村庄系统，故卡包通货改为转生产出 |
| village 研究对矿洞加成 | `miningResearch` 等占位乘区 | 未接入村庄，乘区保留供未来接 |
| glyph 挖掘遗物 | `relic_power` 自然累积（0.1/s，上限 100） | 跳过 glyph 台座/挖掘进度/level 升级 |
| shiny 卡（`cardShiny`+shinyDust 链路） | 未实现，留状态位不开采 | 需解锁链路，暂缓 |
| 信标 level（beacon.level） | 恒为 0 | 当前 Gooboo 亦无 level 提升源，效果按 `lvl=0` 等效 |
| 真钱购买 ruby | 转生时按绿水晶 10% 产出 `gem_ruby` | 跨转生保留 |
| 超深深度（≈1.4e4+）指数稀有掉落 | 忠实地溢出为 `Infinity` | 与 Gooboo 公式一致（`Math.pow(1.05, depth-110)`），现实深度内有限 |

## 🧪 测试覆盖（Phase 2 新增）

- `tests/miningOvercap.test.ts`：overcap 分段衰减、ember 线性超段、无 cap 直加。
- `tests/miningBeacon.test.ts`：crystalBeacon 逐级授予、放置/占用/移除/冷却、range 覆盖。
- `tests/miningModules.test.ts`：熔炼生产、增强流程、超深深度数值稳定性（含忠实溢出断言）。
- 全量回归：18 文件 / 147 用例通过（含既有 mining/prestige/cards/relics 等）。
