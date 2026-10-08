---
name: hf-presenter-broll
description: Enhance edited Chinese talking-head or tutorial videos with selectable visual styles, narration-driven visual selection, authentic evidence, generated content layers, semantic B-roll and HyperFrames motion. Use when preserving the original narration while adding explanatory visuals. Rough cutting is optional and only runs when explicitly requested.
metadata:
  short-description: 剪好口播到真实素材、语义 B-roll 与 HyperFrames 成片
---

# 口播驱动 HyperFrames B-roll

接收剪好的口播，理解每一句需要解释什么、证明什么，筛选值得加画面的段落，再完成真实素材提取、画面生成、人物调度、逐词动画和成片验收。默认保留口播原声、剪点、语序、字幕和总时长。“筛选”指筛选视觉增强位置，不等于删除口播。

这是现有 HF 总工作流的口播专用发行版。它直接拥有流程，无需收件人安装 `hf-video-production-workflow` 或原工作区。安装的 HyperFrames 技术技能只负责框架实现，不重新启动另一套创作访谈。当前用户指令和适用工作区规则优先；冲突时明确说明采用的规则。

开始时必须先读 [视频、风格与审查合同](references/review-and-visual-contract.md)。历史偏好用于推荐，新项目仍由用户选择或明确沿用；“不要旧项目”不等于跳过任务审查。默认不以通用文字卡片承载主要解释。

## 先判断输入

- **已剪口播（默认）**：探测视频、分析音画，直接进入增强规划。
- **原始长素材**：可以标出重录、口误、长停顿的候选位置；只有用户明确要求初剪才读 [初剪分支](references/rough-cut.md)。不自动删句、变速、配音或改写。
- **只有文案或音频**：可做规划；不冒称已完成真人视频。无真实音频只能使用估时，阻塞最终音画锁定。
- **参考视频**：只分析风格，不能误作待编辑口播，也不自动取得素材复用权。

## 执行顺序

0. **先过环境入口**：每次首次使用、换机器/目录或配置变化，先读 [安装与配置入口](references/setup-gate.md)。自动定位本Skill实际根目录、接收方技能目录、工作目录和素材路径，检查基础工具、HF、技术技能、浏览器及本次必需的转写/素材能力。已验证齐全直接继续；缺失或未验证则说明具体影响和配置方案，询问是否协助配置，未同意前不安装、不下载模型、不改PATH、不上传素材。不要先让用户开始制作再暴露依赖缺失。既有同范围配置授权有效，不重复询问。
1. 读取 [输入与证据](references/intake.md)。先运行媒体探测，观看开头、中间、后段、已有切换和关键 ROI，建立原片事实。ASR用于理解与对齐，不等于获准初剪。
2. 输出“初步真实素材需求清单”。优先从原片与用户材料筛选、阅读、提取；确实缺失的操作证据才向用户索取。同步报告检测到的分辨率、显示比例、FPS、时长和音轨。
3. 确认比例和时长两个独立参数：给检测值作为建议；用户已说“保持原片比例和时长”则直接记为确认。不得从视觉样稿继承16:9或时长。
4. 读取 [便携风格注册表](references/styles/STYLE_REGISTRY.md)并解析风格。当前请求或同一项目已有明确选择时沿用，不重复提问。跨项目历史偏好只用于推荐，不能自动确认；参考视频先提炼规则再确认。普通新用户未指定时，先给“智能匹配（推荐）＋六个可选风格”；智能匹配对真人口播/教程使用 `presenter-evidence-cinematic-broll` v0.3。风格只改变视觉语言，不改变现实载体、词锚、人物安全和验收要求。选定后只读对应风格文件，不能把多个风格平均混合。参考视频先提炼可执行规则，再登记为本项目自定义风格。
5. 文案、比例、时长齐全后，先读 [画面设计与生成规划](references/visual-planning.md)，建立schema 2.0的VISUAL_PLAN：全文主题、原话跨度、指代对象、逐段B-roll与人物独立决策、素材及具体前后状态。再运行 `plan-visuals.mjs --input`；单句查询不能代替上下文理解。参考 [本轮采用范围](references/reference-adoption.md)，按 [动效选择](references/motion-selection-contract.md)运行60卡召回和独立重排，读取 [动效源码政策](references/motion-sources.md)。生成“Shotcraft 动效建议”，标注资格、语义、主/辅/不调用、首选/备选、Tier、现实载体、召回置信度、选择评分、源码可用性、理由和适配状态。尚未批准任务只能查询元数据，不能读取TSX或写视频代码。
6. 依 [任务模板](references/task-template.md)输出完整 `# HyperFrames 视频生成任务`，包含原口播、素材需求、B-roll制作表、动效建议、人物平衡表、分镜和验收。比例、时长和风格缺失时不能生成此任务。停在任务审查；用户看过后说“按这个生成”即授权，不要求口令。已经获得的授权不重复询问。
7. 任务获批后，读 [导演与时序](references/director-contract.md)、[运行环境与生产](references/runtime.md)，保存实际展示的任务和REVIEW_EVIDENCE.json审查记录，再建立词锚、导演决策、动作合同、覆盖计划、VISUAL_PLAN.json和内部故事板；运行画面方案production校验，再写 HF 代码。用 [项目产物格式](references/artifacts.md)记录可恢复状态，完整保留源音轨与时间映射。
8. 先技术检查与关键帧预审，再渲染审片版本；按 [验收与交付](references/quality.md)检查真正渲染出的MP4，登记B-roll实现、入片帧和文件摘要并运行交付证据检查。实际播放检查相关性、阅读时间、状态变化和交接；修复失败项后交付。结构通过、证据引用通过、导演审片分别记录。

动效展示优先按 [展示改进标准](references/motion-display-review.md)验证真实对象、连续变化与阅读焦点；新增设计数量不等于视觉提升。

## 平台能力分级

首次在新平台运行时读取 [平台兼容与接入](references/platform-compatibility.md)。先基于实际工具能力选择模式，不凭平台名称猜测：

- `FULL_PRODUCTION`：可读写持久文件、运行 Node.js/FFmpeg/浏览器与 HyperFrames，能接收本地媒体并导出MP4；执行完整流程。
- `PROJECT_HANDOFF`：可读 Skill、分析媒体或生成代码，但缺少可靠渲染环境；完成任务、素材清单、全部导演产物和可移交工程，明确由兼容执行端渲染。
- `PLANNING_ONLY`：只能对话、读文档或使用平台内置媒体能力；完成内容分析、风格选择、B-roll/动效方案和任务单，不能声称已经运行随包脚本或生成HF成片。

平台内置视频模型可以作为素材生成服务，但不能自动替代 HyperFrames 合成、真实口播音轨、逐词同步和最终MP4验收。若平台支持外部API，可接远端渲染服务；先检查凭证和用户授权，不把密钥写入Skill。

## 先决定真人是否出镜

人物布局与辅助画面必须分别决策。保留原有“真人主讲＋相关B-roll”的制作方式；新增CONTENT_ONLY/PIP是内容接管分支，不得削弱其他真人段的B-roll。FULL_FRAME不等于无辅助画面，NO_SHOTCRAFT不等于不需要B-roll。每段写出辅助内容方案，或具体说明为何纯真人更清楚；不能只凭“建立可信度”把整段素材设为NOT_REQUIRED。

规划每段前读取 [人物显隐与五种布局路由](references/presenter-visibility-routing.md)。保留口播原声不等于真人全程可见；逐段选择FULL_FRAME、CONTENT_ONLY、CIRCLE_PIP、RECT_PIP或SPLIT，写明人物价值、内容阅读需求、素材可用性与交接。可用素材能独立解释且真人没有额外信息时，优先全屏内容。圆窗/小窗仅在确有价值且有安全位置时保留。不得默认全片真人或固定左人右板。

## 风格落实到动作

人物缩小或离场、主画面需要连续解释性动效时，可调用个人非商业 [onetake 内容模块](references/onetake-content-module.md)。先读合同再选择；主 Skill 保留唯一流程所有权。片段使用 ONETAKE 路由，保留原声词锚和已选风格，交回静音底片由 HF 合成。未安装或环境未验证时报告阻塞，不宣称可用，不以通用卡片替代。

- 先找现实对象和载体，再考虑生成：用户素材 → 原片/真实捕获 → 原生重建 → 照片级内容层。截图空白、登录阻断、报错均拒收。
- B-roll由一个主要具体物件/真实素材与少量相关logo、图标、短标题组成；资料先读再摘，不把整页官网机械贴进视频。
- 流程要让对象输入、移动、变换、形成结果；不能只让大字、细线、卡片轮流滑入。每个核心场景至少两次有语义的内容/关系变化。
- 一次一个阅读焦点，人物、字幕、操作按钮、证据ROI都有安全区。圆窗是阶段性调度，不能全片把人缩小；完整保留头发与下巴。
- 历史截图中的人物、积分、界面、品牌是参考实例，绝不能变成收件人的事实。真实成绩、现金、积分、额度、适用条件分开呈现。
- 生图只负责解释性内容层；关键中文、数值、浏览器/应用控件由真实捕获或HF原生层实现。

## 使用随包工具

路径均相对本 Skill 根目录；从其他目录运行时使用工具绝对路径。Node.js 22或更新版本。

```sh
node scripts/preflight.mjs --workspace <工作目录> --input <口播.mp4>
node scripts/probe-media.mjs --input <口播.mp4> --output <分析目录>/SOURCE_MEDIA_METADATA.json
node scripts/plan-visuals.mjs --input <项目>/VISUAL_PLAN.json
node scripts/validate-visual-plan.mjs --input <项目>/VISUAL_PLAN.json --stage production
node scripts/query-shotcraft.mjs --query "脚本输入工作区后形成结果" --core --limit 8
node scripts/select-shotcraft-motion.mjs --query "脚本输入工作区后形成结果" --carrier "真实应用界面" --duration-sec 6 --limit 8
node scripts/validate-core-motion-library.mjs
node scripts/validate-shotcraft-coverage.mjs --input <项目>/SHOTCRAFT_COVERAGE_PLAN.json --target 0.8
node scripts/validate-presenter-motion-balance.mjs --input <项目>/TARGET_DIRECTOR_DECISIONS.json
node scripts/validate-project.mjs --dir <项目>
node scripts/validate-delivery-evidence.mjs --dir <项目>
```

自动评分只是候选，Agent仍须按语义、载体、词锚、阅读时间、风格和邻段连续性独立判断。覆盖率目标90%，底线80%；只有ELIGIBLE进入分母。纯人物判断、证据阅读、原片已有充分动作可不调用，不能靠改变资格冲比例。每个未覆盖段写具体理由；低于底线的例外须在任务中呈现并获批。人物缩放不单独计覆盖。

依赖缺失时可继续不依赖它的规划，明确阻塞阶段；不得声称已生成、已渲染或已通过。安装和首次调用见 [使用说明](USER_GUIDE_ZH.md)。

人物小窗和分屏实施前必须读 [人物裁切计算与核查](references/presenter-crop-validation.md)，实际裁切使用完整头部测量与几何校验；布局字段通过不代表人像已居中。

人物窗外观采用 [已确认的圆角、描边与阴影](references/presenter-window-style.md)。外观批准不替代裁切和动态验收。
