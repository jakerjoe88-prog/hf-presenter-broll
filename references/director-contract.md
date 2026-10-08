# 词级时序与导演合同

真实口播音频是时间权威。源时间和输出时间分开记录，默认保持映射。所有字幕、人物、素材和动效共用输出时间基准。关键数字、专名、列表、转折、因果、动词、结论均建词锚。

`timing_source`：WORD_LEVEL_ASR、MANUAL_VERIFIED、PHRASE_LEVEL_FALLBACK、ESTIMATED。后两者不能通过关键HIT锁定。关键锚低置信度须听音复核，review_status记录依据。

每个动作包含PREPARE、HIT、SETTLE，引用有效anchor_id。准备可提前6–10帧，但答案、数字等完整语义不得提前显示。强数字/专名/结论/强转折默认±3帧，普通关键词/列表±5帧；容差不是允许故意延迟。按目标FPS映射帧，关键验收仍复核真实音节和可见时刻。

每段先决定解释什么，再选择PRESENTER_LED / REAL_ASSET / CARD / MG / HYBRID / NO_OP / HOLD。流程、因果、增长、替代、连接、输入输出等动态语义采用MG或HYBRID；静态证据阅读允许HOLD。

核心Scene：PREPARE → BUILD → EVOLVE → HIT → RESOLVE → HOLD。至少建立一次、发生两次独立的语义状态变化、关键词击中、收束或交接。必要阅读/极短留白写hold_reason。非阅读目的、超过1秒没有内容/关系/焦点/镜头变化，检查是否动态死区；循环漂浮不算有效演进。真实素材进入后继续ROI推近、裁切、标注、对比或局部揭示。

每个Micro Beat记录impact_score 0–5。≥4必须有镜头、人物或构图响应，否则写具体hold_reason。布局和镜头动作分别决定：人物在哪里，不等于人物如何变化。

读 [人物平衡合同](presenter-motion-balance-contract.md)。五种状态：PRESENTER_DOMINANT、EFFECT_DOMINANT、HYBRID_BALANCED、REAL_ASSET_DOMINANT、READING_HOLD。比例由内容决定；合同里的占比只是软参考。

密集内容之前人物先让位；先锁头肩ROI，再平移缩放，最后收蒙版。退出时先扩展可见区再解除蒙版。不要把整个杂乱房间缩成头像；不让人消失后在另一角弹出。三项以上列举前准备可读区域，结论/个人判断可回到真人。

圆窗必须完整包含发顶、左右头发、下巴，四周净空至少6%，完整头部占圆直径68%–88%。检查运动中间帧和极端姿态；若不适合圆窗就用矩形小窗/分屏。字幕、脸、手势、证据ROI和操作按钮不能互相遮挡。

## 人物可见性优先

先执行 [人物显隐路由](presenter-visibility-routing.md)，再决定位置和运镜。CONTENT_ONLY是合法常用模式，不是删掉口播。人物已隐藏时，高冲击响应由内容镜头或构图承担；无需额外人物动作。
