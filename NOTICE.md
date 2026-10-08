# 来源与分发说明

这是现有口播项目流程的便携整理，版本1.5.0，打包日期2026-10-07。本版增加六套正式视觉风格、一套显式旧风格、机器可读风格注册表、三档跨平台能力分级，并补充WorkBuddy与CodeBuddy技能路径发现。原始用户口播、工程视频、账号和密钥不随包。

工作流来源：本项目HF规则、hf-video-production-workflow的本地动效路由、presenter-evidence-cinematic-broll v0.3视觉规范。当前版本重新编写了口播入口、状态/初剪边界、运行说明、项目校验与便携目录。上游动效代码保持其原许可，不把它们重新授权为本包原创。

Shotcraft仓库与锁定提交见references/motion-sources.md，Apache-2.0完整许可证保留在vendor。分发核心卡及实现源码供改编研究；移除了第三方演示媒体和旧机器清单。复制/改编源码时继续保留许可证和必要出处。

Source Han Serif SC与IBM Plex的字体二进制随SIL OFL 1.1分发，许可证在assets/font-system/licenses。字体不得脱离OFL改标为独占字体。Striverx不随包。

公开发行版移除了内部肖像静态参考图，保留文字构图方法。新项目使用自己的素材，并完成当前任务风格与画面审查。项目自编部分采用Apache-2.0，第三方部分保留原许可；见 [公开发行说明](PUBLICATION_NOTICE.md)。

HyperFrames由收件人独立安装；包内不冒充其官方发行版。工具和CLI契约须按运行时版本检查。


本版增加12种口播画面/动效设计组合、语义检索扩展、分层生成规划和方案校验。使用方式见 [画面规划](references/visual-planning.md)，实现与来源边界见 [参考采用说明](references/reference-adoption.md)。组合属于设计方案，尚未逐个完成HF渲染验证。
