# ChoreShare — 情侣家务分配与记录 App

## 一句话定义

帮助情侣公平透明地分配家务、记录贡献、用积分兑换自定义奖励的 Web App。

---

## 目标用户

两人同居情侣（当前仅两位固定用户，不需要通用邀请机制）。

---

## 核心功能模块

### 1. 账户与配对

- 各自独立注册/登录（邮箱 + 密码）。
- 首次使用时，A 创建一个「家庭空间」，B 通过 A 分享的**固定配对码**加入（不做通用邀请流，硬编码两人关系即可）。
- 登录后所有数据在两人之间实时同步。

### 2. 家务任务管理

#### 2.1 创建任务

| 字段 | 说明 |
|------|------|
| 任务名称 | 如「拖地」「洗碗」 |
| 描述（可选） | 补充说明 |
| 难度/权重 | 1-5 星，影响积分计算 |
| 预估时长 | 参考值，不强制 |
| 重复周期 | 不重复 / 每天 / 每 N 天 / 每周指定几天 / 每月指定日期 / 自定义 |
| 分配方式 | **指定某人** 或 **待认领**（任一方可领取） |

#### 2.2 任务生命周期

```
创建 → 待办(待认领/已指定) → 进行中(计时) → 待确认 → 已完成
                                              ↘ 驳回 → 重新进行
```

- **认领**：待认领任务，任一方点击「我来做」即分配给自己。
- **开始 & 计时**：点击「开始」启动内置计时器，支持暂停/继续/结束。
- **提交 & 确认**：完成后提交，**对方**可「确认完成」或「驳回 + 留言反馈」。
- **积分发放**：确认通过后，根据 `难度权重 × 实际用时` 公式计算积分并发放。

#### 2.3 重复任务

- 按设定周期自动生成新的待办实例。
- 每个实例独立跟踪状态和用时。

### 3. 计时器

- 嵌入任务详情页，与任务状态联动。
- 支持：开始 / 暂停 / 继续 / 结束。
- 实际用时 = 所有计时段之和（排除暂停时间）。
- 计时中如果切换页面或关闭浏览器，后台保持计时（记录开始时间戳，结束时算差值）。

### 4. 数据统计

| 维度 | 展示形式 |
|------|----------|
| 本周/本月各自完成任务数 | 柱状图对比 |
| 各自累计贡献时长 | 数字 + 趋势线 |
| 各自积分余额与历史 | 数字 + 变动明细 |
| 任务完成率 | 百分比环形图 |
| 难度分布 | 按权重分组的饼图 |

- 支持时间范围筛选：本周 / 本月 / 自定义区间。
- 重点强调**公平性对比**，而非竞争排名。

### 5. 奖励系统

#### 5.1 自定义奖励

- 两人均可创建奖励项，如：

| 奖励名称 | 所需积分 | 类型 |
|----------|---------|------|
| 对方做一顿饭 | 50 分 | 积分兑换 |
| 选今晚看的电影 | 30 分 | 积分兑换 |
| 连续完成 7 天家务 | — | 里程碑解锁 |
| 本月完成率 100% | — | 里程碑解锁 |

#### 5.2 两种兑换逻辑

1. **积分兑换**：攒够指定积分，主动兑换，扣除积分。
2. **里程碑解锁**：系统自动检测是否达成条件，达成时弹出通知 + 解锁。

#### 5.3 兑换记录

- 记录谁兑换了什么、何时兑换。
- 对方收到通知，负责「履行」奖励。

### 6. 购物清单

- 共享文字列表，两人实时同步。
- 每条项目字段：名称、添加人、状态（待购 / 已购）。
- 支持标记「谁去买」。
- 已购项目自动沉底或归档。

### 7. 多语言（i18n）

两位用户的母语不同，App 必须支持**中文 / English / Italiano** 三种界面语言，可随时切换。

- **每人独立设置**：语言偏好存在个人资料（profile）中，各看各的语言，互不影响；换设备登录后保持。
- **首次默认**：未设置时按浏览器语言自动选择，无法匹配时回退到英文。
- **切换入口**：设置页 + 登录/注册页（未登录时也能切换）。
- **翻译范围**：所有界面文案、按钮、提示、错误信息、通知、日期/星期格式。数据库函数返回的错误使用错误码，由前端翻译。
- **用户输入的内容不翻译**：任务名、描述、奖励名、购物项、驳回留言保持原文。
- **通知按接收者语言显示**：通知以结构化数据（类型 + 参数）存储，由前端按当前语言渲染。

---

## 积分公式（MVP）

```
积分 = 难度权重(1-5) × ceil(实际用时分钟 / 15)
```

示例：难度 3 的任务做了 40 分钟 → 3 × 3 = **9 分**。

> 后续可迭代为更细化的公式，MVP 先保持简单。

---

## 技术栈

| 层 | 选型 | 理由 |
|----|------|------|
| 框架 | Next.js 16 (App Router) + React 19 + TypeScript | SSR/SSG 灵活，后续可用 PWA 或 Capacitor 包装为 Android App |
| 样式 | Tailwind CSS v4 + shadcn 风格的手写组件 | 快速出高质量 UI，组件可定制 |
| 数据库 & 后端 | Supabase (PostgreSQL + Auth + Realtime) | 内置认证、实时订阅（两人同步）、免运维 |
| 部署 | Vercel | 与 Next.js 深度集成，免费额度足够 |
| 图表 | Recharts | 轻量、React 原生、满足统计需求 |

**未来 Android 路线**：先做 PWA（加 manifest + service worker），体验不够再用 Capacitor 打包原生壳。

---

## MVP 范围（第一版只做这些）

### ✅ 包含

1. 注册/登录 + 简单配对（配对码加入）
2. 任务 CRUD + 重复任务（基础周期）
3. 任务认领 & 指定分配
4. 内置计时器 + 实际用时记录
5. 任务完成 → 对方确认/驳回
6. 积分自动计算与余额
7. 基础统计页（本周对比 + 积分余额）
8. 奖励创建 + 积分兑换（里程碑解锁放 V2）
9. 购物清单（增删改查 + 状态切换）

### ❌ V2 再做

- ✅ 里程碑自动检测与解锁
- ✅ 详细统计图表（趋势线、难度分布、完成率、积分明细）
- ✅ 通知系统（站内 + Push）
- ✅ PWA（Android 原生包装待定）
- ✅ 多语言切换：中文 / English / Italiano（见第 7 节）
- ✅ 数据导出（CSV：任务记录、积分明细）
- ~~主题切换（跟随系统 / 浅色 / 深色）~~ 已移除：视觉改用 Fawnlight design system，暂时只用浅色主题
- ✅ 重复任务按周期自动生成（打开 App + 每小时定时检查）

---

## 页面结构（MVP）

```
/login          — 登录/注册
/setup          — 创建或加入家庭空间
/dashboard      — 首页：今日待办概览 + 快捷操作
/tasks          — 任务列表（筛选：全部/我的/待认领）
/tasks/new      — 新建任务
/tasks/[id]     — 任务详情 + 计时器 + 确认操作
/stats          — 数据统计
/rewards        — 奖励商店 + 兑换记录
/shopping       — 购物清单
/notifications  — 站内通知列表
/settings       — 个人设置（语言、外观、推送、配对、资料、数据导出）
```

---

## 数据模型概览

> 这是最初的设计草图。实际表结构以 `choreshare/supabase/migrations/` 为准（见文末「开发进度与交接」）。

```
User         { id, email, name, avatar_url, family_id }
Family       { id, name, pair_code, created_by }
Task         { id, family_id, title, description, difficulty, 
               estimated_minutes, recurrence_rule, assigned_to, 
               created_by, status, created_at }
TaskSession  { id, task_id, user_id, started_at, ended_at, 
               paused_duration, actual_minutes }
TaskReview   { id, task_id, reviewer_id, status(approved/rejected), 
               comment, points_awarded, created_at }
Reward       { id, family_id, name, cost_points, type(redeem/milestone), 
               milestone_condition, created_by }
Redemption   { id, reward_id, user_id, points_spent, created_at }
ShoppingItem { id, family_id, name, added_by, assigned_to, 
               is_purchased, purchased_by, created_at }
```

---

## 开发进度与交接（截至 2026-10-26）

> 给下一次对话：先读这一节，就能接着做。

### 当前状态

- **MVP 全部完成**，V2 除「Android 原生包装」外全部完成（见上面的 V2 列表）。
- 已上线：https://chore-app-building.vercel.app （Vercel，连接 GitHub `MingxuanJin/chore-app-building` 的 `main` 分支，push 后自动部署，Root Directory = `choreshare`）。
- 两人已完成注册和配对，在实际使用中；意大利语界面已由使用者确认没问题。

### 待确认 / 待办

1. **手机推送尚未在真机上验证收发**：线上 `/api/push` 已验证可用（3 个环境变量都已生效）。若收不到，在 Supabase SQL Editor 查 `select status_code, content from net._http_response order by created desc limit 5;`
2. **pg_cron 是否启用未确认**：007 迁移已运行，但没确认有没有出现 `pg_cron not available` 提示。没有 pg_cron 时，「每小时自动生成重复任务」不生效，打开 App 时生成的逻辑照常工作。可在 SQL Editor 查 `select * from cron.job;` 确认。
3. 换成 Fawnlight 风格后，登录后的各个页面、CSV 导出文件，尚待使用者检查。
4. Android 原生包装（Capacitor）：先用 PWA，体验不够再做。

### 数据库迁移（全部已在 Supabase 运行）

新迁移需要使用者手动在 Supabase Dashboard → SQL Editor 中运行（没有接 Supabase CLI）。

| 文件 | 内容 |
|---|---|
| `001_initial_schema.sql` | 初始表结构 + RLS |
| `002_fix_rls_and_rpcs.sql` | 修复 profiles RLS 无限递归；RPC：`create_family` / `join_family` / `review_task`（算积分）/ `family_points` / `redeem_reward`；`next_due_date()` |
| `003_milestones.sql` | 里程碑：`check_milestones(tz)` / `milestone_progress(tz)`；解锁记录复用 `redemptions`（`points_spent=0` + `period_key`） |
| `004_notifications.sql` | `notifications` 表 + 触发器自动生成通知（结构化 `type` + `data`，前端按语言渲染） |
| `005_i18n.sql` | `profiles.locale`；RPC 改为抛错误码（如 `insufficient_points:当前:需要`），前端翻译 |
| `006_push.sql` | `push_subscriptions`、私有配置表 `app_config`；通知插入触发 `pg_net` 调用 `/api/push` |
| `007_recurring_schedule.sql` | `tasks.series_id`、`families.timezone`；`generate_recurring_tasks()` 按周期生成实例 + `task_due` 通知；`sync_recurring_tasks(tz)` 供 App 打开时调用；pg_cron 每小时运行（当地 7 点后）；`review_task` 不再在确认时生成下一次 |

### 环境变量 / 密钥

| 变量 | 位置 | 说明 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local` + Vercel | Supabase 连接 |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`、`VAPID_PRIVATE_KEY` | `.env.local` + Vercel | Web Push 密钥对 |
| `PUSH_WEBHOOK_SECRET` | `.env.local` + Vercel + 数据库 `app_config.push_secret` | 三处必须一致；`app_config.push_url` = 线上域名 |

- **GitHub 仓库是公开的**：密钥只能放 `.env.local`（已 gitignore）、Vercel 和 `app_config`，绝不能写进迁移文件或代码。
- 改了 Vercel 环境变量后必须 Redeploy 才生效。

### 代码约定（`choreshare/src/`）

- **数据获取**：客户端用 `useLiveQuery(fetcher, tables)`（`lib/supabase/realtime.ts`），初次加载 + 表变化时自动刷新（Supabase Realtime）。fetcher 要用 `useCallback`。
- **改积分 / 状态的关键操作走数据库 RPC**（security definer），不让客户端直接写，例如确认任务、兑换奖励。
- **多语言**：`lib/i18n/dict/zh.ts` 是源字典，`en.ts` / `it.ts` 的键必须与它完全一致（TypeScript 会检查）。组件里用 `const { t, dateLocale } = useI18n()`，日期用 `dateLocale` 格式化。**新增文案必须三种语言都加**。数据库错误用错误码，在 `lib/i18n/errors.ts` 里翻译。
- **通知**：新增类型需要同时改 ① 数据库触发器 ② `types/database.ts` 的 `NotificationType` ③ `lib/notifications.ts` 的图标 ④ 三个字典的 `notifications.*`。推送文案和站内文案共用同一套渲染。
- **颜色**：使用语义色变量（`primary` / `success` / `warning` / `attention` / `info` / `destructive`，定义在 `app/globals.css`，取值来自 Fawnlight 色板），不要写死 `orange-600` 这类颜色。图表的两人配色是 `--series-me`（玫瑰粉 primary-600）/ `--series-partner`（薰衣草紫 lavender-700），已用色弱校验。
- **视觉风格**：遵循使用者在 Claude 里建的 design system **Fawnlight**（https://claude.ai/artifact/LaLDVyPyQcDNXg9tSFPQtN，蕾丝、百合、小动物的「纪念品」风）。改动前先读它的 README，它会更新。
  - 只用浅色「Lace 蕾丝白」主题（Fawnlight 也有深色「Candlelight 烛光」，App 暂不启用）。
  - 使用者**不喜欢大面积的深玫瑰色**：按钮等填充用 `rose-300`（`bg-primary`，配 ink 文字）；深色 `rose-600`（`text-rose`）只用于小字、焦点环。
  - 字体：标题 Cormorant Garamond（`font-serif`，h1–h3 自动），正文 EB Garamond（`font-sans`），标签/日期 Courier Prime（`font-mono`），品牌花体 Pinyon Script（`font-script`，只写英文、≥28px），中文回退 Noto Serif SC。数字用 `lining-nums tabular-nums`。
  - 组件：按钮是胶囊形；卡片可加 `lace`（底部扇贝蕾丝）/`blush`（雾粉底）；状态标签是打字机字体＋浅色底；`components/fawn.tsx` 提供 `Art`（装饰素材）、`PageHeader`、`SectionTitle`、`LaceDivider`、`EmptyNote`；`ui/segmented.tsx` 是分段切换。
  - 装饰素材在 `public/fawnlight/`（从 design system 导出转成 webp）。规则：一屏一个主角（小动物或小物），同屏最多四件素材，不用 emoji。页面上方的英文小标在字典的 `deco.*`（三种语言相同）。
- **语言**：`profiles.locale` > cookie `locale` > 浏览器语言 > 英文。
- **服务端入口**：`proxy.ts`（Next 16 的 middleware）会把未登录用户重定向到 `/login`，公开路径为 `/login`、`/auth/*`、`/api/push`。
- **验证**：每次改动后跑 `npx tsc --noEmit && npx eslint . && npm run build`（在 `choreshare/` 目录下）。

### 主要设计决定（已和使用者确认或已说明）

- 积分 = 难度 × ceil(用时分钟 / 15)，最少按 1 个 15 分钟算；只有对方能确认。
- 重复任务：每个周期独立生成，没做的那次显示为逾期；不会补生成错过的多个周期。要停止，就把最新那次改成「不重复」。
- 里程碑每人分开计算；月度完成率按上个自然月结算；连续天数和月度两类只统计创建里程碑之后的情况。
- 统计页：完成率用进度条、难度分布用分组柱状图（没用 PRD 原写的环形图 / 饼图，以便看清公平性）。
- 语言和推送按人设置。
- 2026-10-26：整体视觉改为 Fawnlight，去掉了深色模式和文案里的 emoji。
