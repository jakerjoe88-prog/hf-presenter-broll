# 项目产物格式

推荐项目目录：`input/`原始素材只读副本、`assets/`可发布素材和本地字体、`analysis/`转写和证据、`renders/`MP4、`evidence/`逐锚点帧。以下JSON置项目根。时间单位秒，帧号按输出FPS、0起点；帧区间结束为exclusive。

`WORKFLOW_STATE.json`：version、stage（INTAKE/PARAMETERS/TASK_REVIEW/PRODUCTION/RENDER_REVIEW/DELIVERED/BLOCKED）、source_media、ratio、duration_sec、fps、style、ratio_confirmed、duration_confirmed、style_confirmed、task_reviewed、production_approved、approval_basis、reviewed_exceptions。只有真实会话里的授权能写true；模板绝不预填授权。

`SOURCE_TIMELINE_MAP.json`：segments，每段id、source_start/end、output_start/end、existing_cut、source_kind、protected_rois、existing_subtitles、treatment。默认相同时间映射。

`TRANSCRIPT_WORD_ANCHORS.json`：fps、duration_sec、anchors。每个anchor包含anchor_id、text、type、source_range {start,end}、output_range {start,end}、onset_frame、end_frame、confidence、timing_source、review_status、script_audio_match。source时间与output映射一致；不得只保存字幕行时间。

`TARGET_DIRECTOR_DECISIONS.json`：micro_beats。每项id、start_frame、end_frame、script_excerpt、impact_score、anchor_id、route、route_reason、main_carrier、visual_dominance、presenter_role、presenter_layout_current/target、presenter_camera_action、shotcraft_primary/support、reading_hold_frames、balance_reason、hold_reason、visual_evolution。visual_evolution记录建立、至少两次演进、HIT、收束和有理由的hold；无人物时明确presenter absent。

根层还必须有 `presenter_present` 布尔值与 `tracks` 对象：narration_editing/subtitles/presenter_direction/explanatory_picture/continuity，各值为PRESERVED或ACTIVE。每段 `presenter_direction` 对象包含layout_current、layout_target、camera_action、trigger_anchor_id、prepare_start_frame、hit_frame、settle_frame；与扁平摘要保持一致，人物校验器读取嵌套对象。`presenter_movement_counts_as_shotcraft_coverage` 与 `presenter_removed_for_motion_coverage` 必须为false。

`MOTION_ACTION_MANIFEST.json`：actions。每项id、beat_id、anchor_id、prepare_frame、hit_frame、settle_frame、target、semantic_payload_visible_before_hit=false、semantic_description、implementation_status。高冲击和关键anchor都须对应动作或有理由的HOLD。

`SHOTCRAFT_COVERAGE_PLAN.json`：beats。每项id、eligibility、decision（NO_SHOTCRAFT/SHOTCRAFT_PRIMARY/SHOTCRAFT_SUPPORT）、primary、backup、core_tier、carrier、anchor_id、retrieval_confidence、selection_score、source_availability、catalog_adaptation_status、implementation_status、coverage_exception_reason。无合适候选可不调用，但不得把缺源码假报为已经实现。

`HF_STORYBOARD_V1.md`：批准任务的内部执行版；每个Scene/Micro Beat的时间、原话、源范围、人物、载体、素材ID、动作阶段、转场、锚点、安全区和验收。

`ASSET_MANIFEST.json`：assets；按intake.md记录来源、单位、条件、许可与示意。`ENVIRONMENT.json`记录工具版本、锁文件、转写方法、生成工具、模型及时间。

`DIRECTORIAL_QUALITY_REVIEW.md`：按quality.md逐anchor列实际MP4帧证据，必须明确Video相对路径、FPS、分辨率、时长、硬失败项、PASS/FIX_REQUIRED/BLOCKED。

脚本 `validate-project.mjs`只校验授权、词锚/动作关联、时序与基础完整性。不能自动证明ASR正确、来源真实、剪辑自然、图像安全或导演质量。其他两个校验器负责覆盖与人物字段；三者都通过也必须实际看渲染结果。


## 画面方案补充

按 [画面设计与生成规划](visual-planning.md)填写 VISUAL_PLAN.json，并将每段的解释目标、载体、构图、素材来源/缺口、生成层、参考动作与优化理由、词锚及人物交接纳入任务分镜。planning草稿可有待办，生产前必须通过production检查。

## 可追溯的审查证据

新增 REVIEW_EVIDENCE.json 和实际展示的 REVIEWED_TASK.md；字段及显式跳过审查的诚实记录方式见 [审查合同](review-and-visual-contract.md)。仅将布尔值设为true不能通过生产入口。旧工程继续生产前须补真实记录，不能回填虚构审查。

## 人物显隐字段

VISUAL_PLAN使用schema_version `2.0`，全文及逐段字段统一见 [画面规划](visual-planning.md)，不另外写一份论点图。旧schema 1.0继续保留作历史记录，生产时需明确迁移。引用全文的SHA256和原文跨度只能检查一致性，不能证明音频听审正确。

`BROLL_DELIVERY_EVIDENCE.json`是渲染后的登记：`render:{path,sha256}`；`usages`每项为 `beat_id`、`asset_id`、`start_frame/end_frame`、真实文件资产的 `asset_sha256` 或原生资产 `native_spec_sha256`（对native_spec字符串取SHA256）、`implementation:{path,sha256,object_id}`、`frames:[{frame,path,sha256}]`（至少两个不同实际输出帧）、`observation:{viewer_effect,status,evaluator,review_basis}`。status为FIX_REQUIRED/UNVERIFIED/REVIEWED；REVIEWED必须说明谁以什么方式观看，并不自动代表最终导演PASS。object_id必须对应实现文件中具体 `id="..."`。片段拼接后的帧号按最终输出重新映射。

计划素材保留PLANNED_NATIVE；已实现通过命名对象/实现摘要登记；入片通过实际输出帧登记；效果是否成立通过连续播放审查。不同阶段不能互相替代。渲染文件变动后旧摘要应失效，重新取帧和审查。

TARGET_DIRECTOR_DECISIONS.json的每个micro_beat填写presenter_visibility，字段见 [人物显隐路由](presenter-visibility-routing.md)。presenter_present指源素材有人，不代表成片全程有人。CONTENT_ONLY须以HIDDEN作为layout_target，并在VISUAL_PLAN.json登记真实素材或原生实现规格。生产入口会一并运行人物校验，不能只单独检查覆盖率。
