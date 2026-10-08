# 运行依赖与HF生产

本包带方法、视觉参考、动效源码、字体与本地工具；不携带HyperFrames运行时、浏览器、FFmpeg、ASR模型或生图服务。它是Agent Skill，不是无AI代理的独立剪辑软件。

## 环境准备

先执行 [安装与配置入口](setup-gate.md)。以下安装命令只在检查缺失、说明方案且收到用户配置授权之后执行。首次安装需要网络与依赖下载，不用npx是否能自动下载来冒充已经装好。

```sh
npx hyperframes --version
npx hyperframes --help
npx hyperframes skills
```

读取安装后 `hyperframes-core`、`hyperframes-cli` 与按需 `hyperframes-animation`、`hyperframes-keyframes`、`media-use` 的技术合同。缺失时先修复安装，不能虚构工具可用。官方安装包负责其技能与许可；不需要本作者的绝对路径或完整工作区。

下列命令来自打包时本机技术技能快照；运行前用对应 `--help` 核对当前版本。新项目锁定实际可用版本及package-lock，记入ENVIRONMENT.json，不无声升级已验证的项目。

## 任务获批后的生产次序

1. 建立输入/输出映射、真实词锚、导演决策、动作计划、Shotcraft覆盖计划、HF_STORYBOARD_V1.md。运行本包校验器，人工审查语义和例外。
2. 使用CLI创建空项目：`npx hyperframes init <项目名> --non-interactive --example blank`。根据批准参数配置分辨率/FPS/时长；此命令不用于审批前分析。
3. 将本包 `assets/font-system` 整体复制到项目 `assets/font-system`，使用本地font-face.css，截帧和渲染前等待document.fonts.ready。中文标题Source Han Serif SC Heavy，正文IBM Plex Sans SC，数字IBM Plex Mono。可选Striverx未分发，英文批注回退正文体。
4. 将原片和素材置入项目相对路径。源视觉和源音频分别明确挂轨：如果视觉轨静音，必须另有原声音轨，避免静音输出/双倍音轨。硬字幕原样保留或经批准遮除后重建，不能叠两层字幕。
5. 按安装版本的core合同写HTML/CSS/GSAP：根元素有明确尺寸及data-composition-id/data-start=0/data-duration；时间片段按data-start/data-duration/data-track-index声明；视频截取用data-media-start；每个composition同步注册唯一paused timeline到window.__timelines。HF拥有媒体播放和seek，不自己用video.play循环驱动。人物平移裁切动画放内层视觉包装，不争抢框架clip可见性。
6. 无系统时钟、非种子随机、无限循环或渲染时远程资产。所有ID在装配后唯一；子composition的模板、ID和时间轴必须按安装版本合同一致。所有媒体、字体本地化，断网渲染不丢素材。
7. `npx hyperframes lint`，再 `npx hyperframes check`；对开头、核心HIT、转场、后半段和人物极端姿态snapshot。命令参数先读当前help。技术检查不保证构图合理。
8. 任务批准且预审通过后可渲染审片版本：`npx hyperframes render --quality high --output renders/review.mp4`。依quality合同检查MP4，失败则修复/重渲染，通过才交付为final。既有制作授权足够，不额外添加逐步许可流程。

## 外部能力分级

- 转写：优先当前环境可用的本地ASR/强制对齐；没有时可人工核对。所有关键HIT必须真实复核，不能用均分字幕伪装词级时间。
- 生图：可用已授权服务生成照片级内容层，没有服务则优先真实素材/原生重建。确实不可替代的缺口写BLOCKED，不声称生成成功。
- 抠像：不是必需；可用原背景、矩形分屏、合理裁切。圆窗前先检查完整头部安全。
- 预览：复用一个已有服务，记录端口与PID；不要反复弹浏览器或启动多个服务。Windows后台进程用隐藏窗口。
- 不在本Skill中自动发布、上传原片、发送反馈或传播用户素材。
