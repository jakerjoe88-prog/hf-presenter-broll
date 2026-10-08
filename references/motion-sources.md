# 动效库及源码边界

随包：60张核心卡（A/B各30）、152条目录元数据、核心卡对应文档与TSX/TS实现、中文语义索引。先查询核心，核心无合格候选才扩展到全目录。

原始仓库：https://github.com/Vincentwei1021/video-shotcraft
锁定提交：`0d6f0b57f0d4d6700761644c07f7ef03c3e50234`。
源代码许可：随 `vendor/video-shotcraft/LICENSE` 保留Apache-2.0。

源码路径 = `references/vendor/video-shotcraft/` + 目录里的 `card_document` / `implementation_sources`。
其余92卡只有目录，查询标为CATALOG_ONLY时，不得声称源码已经内置。批准任务后才能获取确切锁定源码或回退核心/原生方案；不能静默改用main。

本包排除了上游demo音频、截图、纹理和其他媒体，避免把第三方演示资产当成可发布素材。TSX用于阅读动效机制，不是可以直接运行的HF组件；引用到的媒体应由当前项目的合法真实素材替换。不要试图在HF里直接运行Remotion TSX。

审批前只读目录/推荐元数据。审批后读选中卡的完整文档、实现和引用组件，提取状态顺序、时序比例、缓动、路径、遮罩与陷阱，用HF/GSAP重写并绑定真实词锚。演示UI、数值、字体、颜色、人物、图片全部按新项目重建。

状态：CATALOG_MATCHED → SOURCE_READ → HF_ADAPTED → TECHNICALLY_VALIDATED → DIRECTORIALLY_PASSED。
源码移植难度 `catalog_adaptation_status` 与实际进度 `implementation_status` 分开；目录PORTABLE不代表已经HF适配。

召回器/重排器都是本地启发式；分数不能代替独立场景判断。覆盖校验器的PASS_WITH_EXCEPTIONS只检查是否有理由，Agent还必须核对这些例外在批准任务中确实被审查。
