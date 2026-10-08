# 平台兼容与接入

平台兼容分两层：能否读取并遵循Skill；能否运行完整HyperFrames生产链。前者不等于后者。

## 启动自检

在新平台先检查并记录：

1. 能否导入包含 `SKILL.md`、`references/`、`scripts/`、`assets/` 的ZIP或文件夹。
2. 能否接收本地MP4并提供持久、可读写的项目目录。
3. 能否执行Node.js 22+、FFmpeg/ffprobe和无头浏览器。
4. 能否使用或安装HyperFrames CLI，并读取所需技术Skill。
5. 能否导出MP4和验收截图；是否允许用户取回文件。
6. 本次是否具备逐词转写、真实素材获取、生图或视频生成能力。

据实际结果选择：

| 模式 | 能力 | 可交付 | 不得声称 |
|---|---|---|---|
| `FULL_PRODUCTION` | 1-5齐全，6按任务验证 | 完整任务、工程、MP4、逐锚验收 | 未实际检查的外部素材/服务已可用 |
| `PROJECT_HANDOFF` | 可读包、写文件和生成工程，但渲染链不完整 | 任务、素材清单、导演产物、HF工程或实现说明 | 已渲染、已通过MP4导演验收 |
| `PLANNING_ONLY` | 只能对话、读附件或调用平台内置生成能力 | 风格选择、分镜、B-roll与动效计划、提示词 | 已运行随包脚本、已生成HF工程或成片 |

## WorkBuddy

WorkBuddy可通过“技能 → 添加技能 → 上传技能”导入本地技能包，并保留 `SKILL.md`、`references/`、`scripts/` 等标准结构。桌面端Skill可以在用户授权下读写文件并通过Bash运行脚本，因此是本包的优先兼容平台之一。

导入后先运行：

```text
请使用 hf-presenter-broll，先执行平台与环境预检。检查 ~/.workbuddy/skills、~/.codebuddy/skills、本次工作目录、Node、FFmpeg、浏览器和HyperFrames；先报告 FULL_PRODUCTION、PROJECT_HANDOFF 或 PLANNING_ONLY，不要自动安装缺失依赖。
```

本包预检会搜索用户级和项目级 `.workbuddy/skills`、`.codebuddy/skills`，并兼容HyperFrames技术Skill安装在CodeBuddy目录、主Skill安装在WorkBuddy目录的情况。只有实际预检全部通过后才能标记 `FULL_PRODUCTION`；“成功导入”本身只证明Skill可被读取。

## 扣子 / Coze

扣子编程可上传 `.skill` 或 `.zip` 技能包，并建议包含 `SKILL.md`。上传后平台会解析、安全检查和重新打包。安装包可直接用于“读取流程与资源”；每个新任务仍需把自定义技能添加到当前项目。

是否能完整成片取决于该项目实际开放的终端、持久文件、Node、FFmpeg、Chromium和HyperFrames能力。缺少其中任一项时使用 `PROJECT_HANDOFF` 或连接经过授权的远端渲染API。平台内置视频生成服务只作为素材服务，不能自动视为HyperFrames渲染器。

建议上传包后先说：

```text
请读取 hf-presenter-broll，先执行平台能力自检并报告 FULL_PRODUCTION、PROJECT_HANDOFF 或 PLANNING_ONLY。不要安装依赖，也不要生成视频；先告诉我缺什么。
```

## 豆包

普通豆包对话或自定义智能体可以使用精简提示和风格/流程文档进行分析与规划，但目前没有在本Skill中验证“直接导入完整ZIP后运行本地Node、FFmpeg、浏览器和HyperFrames”的链路。因此默认按 `PLANNING_ONLY`，不能承诺上传一次就直接输出同等HF成片。

若通过具备文件与代码执行能力的豆包工作模式、ArkClaw/OpenClaw环境或外部渲染API使用，应重新执行六项自检；全部通过才升级为 `FULL_PRODUCTION`。

## Codex、Claude Code、Cursor/Cline、OpenClaw等本地Agent

这些环境若支持标准技能目录、终端、文件读写和浏览器，通常可以进入完整模式，但仍需运行 `preflight.mjs`。Skill目录规范不同，可直接导入ZIP，或把整个文件夹放入平台指定技能目录；保持 `SKILL.md` 位于包根目录下一层。

## 只有聊天框的平台

使用 [跨平台精简入口](platform-prompt-entry.md)，并同时上传对应风格文件。它能复制决策方法，不能携带本地执行能力。需要成片时，把产出的任务单和素材交给安装了完整版Skill的执行端。

## 未识别的平台名称

不要根据相似发音推断产品。请用户提供平台链接或准确名称；在此之前按最低已证实能力运行，并继续完成不依赖平台特性的规划工作。
