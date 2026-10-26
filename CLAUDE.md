# BunnyChore

开始工作前，先读 `PRD.md` 最后一节「开发进度与交接」：里面有当前进度、待办、数据库迁移清单、环境变量和代码约定。完成一个阶段后，记得更新那一节。

- 用中文和使用者交流。
- 应用代码在 `choreshare/`；改动后在该目录跑 `npx tsc --noEmit && npx eslint . && npm run build`。
- 新增数据库迁移放在 `choreshare/supabase/migrations/`，由使用者手动在 Supabase SQL Editor 运行。
- GitHub 仓库是公开的：密钥绝不能写进代码或迁移文件。
- 新增界面文案必须在 `zh` / `en` / `it` 三个字典里都加。
