# onetake 内容动效模块（个人非商业使用）

主 Skill 拥有完整口播流程。onetake 仅作可选内容片段引擎，不接管访谈、风格选择、原声剪辑、人物裁切或最终交付。该模块不默认启用；核对当前使用者已说明的用途和许可范围，已有同范围授权不重复询问。不能把包作者的个人非商业选择继承给接收方。Talkcraft仅作为设计研究且未捆绑代码，与调用onetake实现分别记录。

## 何时调用

逐 Beat 先判断真实载体与人物价值，再选择引擎。内容需展示输入到结果、对象关系变化、界面操作或连续运镜，且人物为 CONTENT_ONLY、CIRCLE_PIP、RECT_PIP 或 SPLIT 时可用。简单证据停留、原录屏已有充分动作、人物判断段优先原素材/HF。不能为了调用模块把所有段落做成卡片。保留已选风格，onetake 的 looks 只作实现参考，不自动换皮。

任务审查表增加：Beat、引擎、真实载体、连续变化、人物模式、词锚、入场/退场、实现限制。用 ONETAKE 标注，不冒充 SHOTCRAFT_PRIMARY/SUPPORT；原 Shotcraft 资格和分母不因引擎改变。低于覆盖率底线时按原合同展示并审查例外，不叠加无意义动效凑数。既有任务改用此引擎影响已审查画面时，先展示修改部分。

## 首次使用与路径

上游独立保存在接收方自选目录；不把上游源码或演示视频塞入通用发行包，不自动注册第二个流程所有者。来源 https://github.com/feitangyuan/onetake ，审核版本 `36072d36e777a7de4604eacaa110342f80ae76eb`，PolyForm Noncommercial 1.0.0；保留 LICENSE 与 Required Notice。更新版本须重新检查接口。

在项目 `.hf-setup/onetake.json` 保存实际 `provider_root` 与 Python 路径；禁止写死作者机器路径。运行 `node scripts/onetake-contract.mjs preflight <项目目录>`，检查 git HEAD、工作树修改、Python、numpy、Pillow、Playwright 及其 Chromium、FFmpeg/ffprobe。缺项说明阻塞的阶段，沿用 setup-gate 的配置授权规则；不暗自安装或降级成静态卡片。规划可以继续，未验证环境不能标为可渲染。

## 输入合同

任务获批后建立 `ONETAKE_PLAN.json`。结构见随包 `scripts/onetake-contract.mjs` 的校验；顶层 `schema_version:1`、`clips` 数组。每片段字段：

- `id`、`beat_id`、`start_frame`、`end_frame`（右开区间），整数帧；一个片段属于一个 Beat。
- `fps` 与父项目一致；`width/height` 为偶数画布像素，与 WORKFLOW_STATE 一致；当前上游仅支持整数 FPS，29.97 等不得偷改成30，改用原生HF或明确阻塞。
- `presenter_mode`，与导演决定一致；`audio:"NONE"`、`presenter_embedded:false`、`subtitles_embedded:false`、`alpha:false`。
- `carrier`、`assets:[{path,source}]`，本地真实素材来源；原生重建也交付本地规格文件并注明重建，不伪造实际操作/数据。
- `anchors:[{anchor_id,local_frame}]`：覆盖该片段范围内所有父词锚，`local_frame = onset_frame - start_frame`，禁止倒推口播去适应动画。
- `safe_zones:[{role,x,y,w,h}]`，字幕和人物实际占区；CONTENT_ONLY 无人物占区，小窗/分屏必须有人物占区。坐标相对本片段画布。
- `entry_state`、`exit_state`、`evolution`（至少两次具体语义变化，不能只有入场）、`comp`（片段HTML）、`output`（新MP4路径）。

## 制作与交回

导演 Beat 标注 `content_engine:"ONETAKE"`，WORKFLOW_STATE 明确 `width`、`height`。先通过父项目 `validate-project.mjs`，再生成片段 HTML。读取上游 SKILL、所选参考与库时，以本合同和当前项目规则约束调用范围。实现纯确定性 `window.__seek(t)`、`__ready`、`__meta`；等待本地字体与媒体解码。重要内容在词锚前不可见，运动模糊采样也不得提前泄露，因此默认 shutter=0；若开启须检查锚前帧。

运行 `node scripts/onetake-contract.mjs job <项目目录> <上游目录>` 校验合同并输出可执行的 Python 参数数组（复查项目闸门与配置环境后只生成命令，不渲染）。该命令要求已有片段HTML和有效项目配置。用进程参数数组运行，禁止拼接 shell 字符串。显式指定帧率、尺寸、时长、scale=1、workers=1，不用上游 `--final`（会强制60fps）或 `--sfx`。不调用 TTS，不改原声。输出为不透明静音底片，不能作为透明覆盖层。HF 在其上合成人物与字幕，人物窗口使用已有圆角、描边、阴影及完整头部裁切规范。

渲染后运行 `node scripts/onetake-contract.mjs verify <项目目录>`：ffprobe核对每片段帧数、帧率、尺寸、无音轨。上游 seek、pageerror、资源失败任何一个发生都需修复；退出码或广告型 probe PASS 不能掩盖错误。保留HTML、素材、上游版本、日志与 render 元数据，HF内的MP4本身不具有对象级编辑能力。

## 视觉验收

检查实际片段和最终HF合成：锚前/命中/落位帧、真实载体可读性、至少两次语义变化、接缝首尾、字幕/人物遮挡、小窗动态裁切。上游 bounds 检查不识别人脸，也不能证明圆形蒙版安全。上游广告静止比例、音频静默比例不套在持续口播上。逐锚证据记入 DIRECTORIAL_QUALITY_REVIEW.md；格式通过仅叫 STRUCTURAL_PASS，媒体通过仅叫 MEDIA_PASS，真实审片通过才能交付。
