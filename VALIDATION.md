# Skill包验证报告

日期：2026-10-07。验证对象：hf-presenter-broll v1.5.0。

- PASS: skill validation, JSON parsing, JS syntax, authored relative links, local font URLs, no source-machine paths
- PASS: ZIP integrity and 224 file hashes after extraction outside original workspace
- PASS: seven-style portable registry, six user-selectable styles and three platform capability modes verified
- PASS: all 60 core sources resolve as BUNDLED_PINNED in isolated directory; query/reranking and existing validators execute
- PASS: ffprobe helper detects audio and non-square-pixel display ratio; refuses overwrite
- PASS: production gate rejects missing presenter decision
- PASS: production gate rejects full-canvas content with presenter
- PASS: production gate rejects presenter without semantic value
- PASS: production gate rejects muted source on visibility change
- PASS: production gate rejects missing review evidence
- PASS: production gate rejects changed reviewed task
- PASS: production gate rejects style mismatch
- PASS: production gate rejects untraceable approval
- PASS: production gate rejects waiver claiming reviewed
- PASS: production gate rejects unapproved task
- PASS: production gate rejects estimated timing
- PASS: production gate rejects late hit
- PASS: production gate rejects unknown anchor
- PASS: production gate rejects early reveal
- PASS: production gate rejects settle outside parent beat
- PASS: production gate rejects empty source timeline
- PASS: production gate rejects source anchor starts on wrong timeline
- PASS: production gate rejects source anchor ends on wrong timeline
- PASS: production gate rejects unreviewed coverage exception
- PASS: visual production gate rejects missing visual plan beat
- PASS: visual production gate rejects unknown visual anchor
- PASS: visual production gate rejects missing asset file
- PASS: visual production gate rejects generation used as evidence
- PASS: visual production gate rejects invalid safety zone
- PASS: 12 recipes reference existing core cards; six visual routes, semantic fallback and former zero-result query verified
- PASS: production gate rejects incomplete setup
- PASS: real preflight reports unverified capabilities instead of false readiness
- PASS: WorkBuddy and CodeBuddy user skill roots are searched and HyperFrames technical skills resolve
- PASS: explicit review skip remains distinct from a reviewed task
- PASS: production gate rejects hidden with missing material
- PASS: production gate rejects hidden without registered carrier
- PASS: production gate rejects hidden loses indispensable gesture
- PASS: production gate rejects hidden contradicts visible layout
- PASS: content-only, circle, rectangle, split and full presenter routes; gesture circle rejected
- PASS: v1.5 narration spans, unresolved referents, presenter B-roll, reading budgets and delivery-evidence negative fixtures
- PASS: controlled complete-configuration fixture continues; Unicode and spaced paths supported
- PASS: missing asset service blocks only tasks requiring it
- PASS: stale capability record requires re-verification

已执行的媒体测试仅是一秒钟的合成测试信号，用于验证媒体探测，不是口播成片或视觉质量证明。配置状态分支使用明确的模拟CLI、技能和能力记录测试，未冒充真实HF/浏览器/ASR服务验证。

WorkBuddy官方包结构与本机技能路径发现已验证，但尚未在WorkBuddy UI里实际点击上传并完成一条真实口播渲染。扣子ZIP结构与平台模式文档已静态验证，但没有替用户登录平台上传或执行云端渲染。豆包普通对话没有验证完整本地执行链，默认仅支持规划层。

尚未验证：收件人机器或云平台的HyperFrames安装、ASR/生图服务、真实口播端到端成片、视觉导演验收。实际制作按Skill逐项目执行。未将包测试通过写成视频流程已在新环境完整跑通。

包内未包含私人口播、账号、密钥、第三方demo媒体或Striverx字体。公开发行版另移除了内部肖像参考图，不将个人素材作为公共安装依赖。

## v1.5.0 补充验证（2026-10-07）

新增合同测试：20项上下文/素材交付失败用例，加2项生产前指代词锚失败用例。生产回归另检查动作稳定阶段越过父段、空音源映射、词锚起点/终点错位。测试使用明确标记的合成数据，不是对语义正确的自动证明。

本机原项目另制作了两段真实源音轨样例：1920×1080、30fps、138帧/142帧，完整MP4解码通过；输出音轨与对应源片段的相关性为0.99908/0.99939。两段当前HF检查通过，VISUAL_PLAN生产前结构检查和输出证据引用检查通过。这是本机短样例验证，不是收件人环境或整条口播流程已跑通。

实际输出帧暴露了首版用内容标签代替具体画面的缺点，已改为原片真实波形与本机真实Skill文件目录/文档内容展示。采用原生流程示意，不能冒称Codex实际操作录屏或历史作品复刻。只检查了部分输出帧，没有完成正常速度带声审片、手机阅读对照、盲测有/无B-roll效果，也没有验证圆窗/矩形人物重新裁切。因此不将样例列为正式审美基准、不把技术检查写成导演PASS。未验证项目继续保持UNVERIFIED。

本轮没有新增或重跑ASR模型；样例沿用既有WORD_LEVEL_ASR词锚，仅按源片段偏移转换输出时间。onetake未参与本轮样例渲染，其环境与画面效果不能由这些结果证明。
