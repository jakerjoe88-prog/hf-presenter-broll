# 参考范围与实现状态

参考审查锁定 video-talkcraft 提交 `ccb8a571f4bd620b5588bef4b264b5120f5042fc`。重点研究口播语义与载体的对应、阅读焦点交接、素材规划、成片检查。上游地址：[video-talkcraft](https://github.com/Vincentwei1021/video-talkcraft/tree/ccb8a571f4bd620b5588bef4b264b5120f5042fc)。其 [LICENSE](https://github.com/Vincentwei1021/video-talkcraft/blob/ccb8a571f4bd620b5588bef4b264b5120f5042fc/LICENSE) 为 PolyForm Noncommercial 1.0.0，并要求商业使用事先取得作者授权；本包不分发其实现代码或demo媒体。

本轮新增12种项目编写的画面/动效设计组合、语义候选工具、生成规划与字段校验。它们连接现有Shotcraft核心库，来源和适配状态分别保存。Shotcraft仍锁定原60核心源码和152目录；未冒称把Talkcraft108张卡全部迁移，也未静默更新Shotcraft源码版本。

真实口播验收需要用户指定素材并按任务审查流程完成。脚本回归通过不等于新增效果已有HF成片，更不等于新机器ASR/生成服务已验证。首轮建议用一段包含输入、操作、结果且已剪好的口播，验证三个连续语义动作，保留原声/剪点。未取得素材、比例/时长确认和任务批准前不生成该视频代码。
