# 便携风格注册表

风格决定色彩、材质、排版、构图和动效语气；现实载体、真实来源、逐词同步、人物/字幕安全区和导演验收始终有效。一个项目只设一个主风格，局部可以调用兼容组件，但不得把多套皮肤平均混合。

## 选择规则

1. 用户在本次请求明确说出风格名或编号：采用并记录，不重复询问。参考视频须先提炼规则并确认；历史偏好只用于推荐。
2. 当前项目有已确认的 style id：继续使用，除非用户要求更换。
3. 新用户未指定：展示“智能匹配（推荐）”和下表六个正式选择。
4. 智能匹配：真人口播、教程、工具演示优先 `presenter-evidence-cinematic-broll`；数据论证优先 `editorial-data-report`；金融图表优先 `financial-terminal-tech`。
5. 参考视频自定义：提炼现实对象、空间、光线、色彩、排版、动作因果、节奏与禁用项，写入项目风格锁；不复制人物、商标素材或原片镜头。

## 可选风格

| 编号 | ID | 用户名称 | 适用内容 | 详细规范 |
|---:|---|---|---|---|
| 1 | `presenter-evidence-cinematic-broll` | 真人主讲·证据叠加·场景化 B-roll | 真人口播、工具教程、真实工作流与案例展示 | [规范](presenter-evidence-cinematic-broll.md) |
| 2 | `editorial-data-report` | 编辑型数据简报 / 发布会数据报告 | 模型发布、榜单、成本能力对比、数据观点 | [规范](editorial-data-report.md) |
| 3 | `apple-clean-product` | 清爽产品发布风 | 产品功能、AI工具、清晰工作流、轻科技感 | [规范](apple-clean-product.md) |
| 4 | `financial-terminal-tech` | 金融终端科技演示 | K线、指标、市场结构、风险与交易流程 | [规范](financial-terminal-tech.md) |
| 5 | `magazine-collage-cards` | 轻量杂志拼贴 / 动效卡片 | 知识口播、案例拆解、流程、对比与总结 | [规范](magazine-collage-cards.md) |
| 6 | `monochrome-cyber-editorial-cards` | 黑白赛博编辑 UI 卡片 | 高级黑白界面、工作流板、金属与荧光绿点缀 | [规范](monochrome-cyber-editorial-cards.md) |

显式旧风格 `data-hud-narration` 只在用户要求深色HUD、左右数据面板或 talking-head HUD 时使用：[规范](data-hud-narration.md)。

机器可读映射见 [style-registry.json](style-registry.json)。

## 新用户提示

```text
风格可以智能匹配，也可以自己选：
1. 真人主讲·证据叠加·场景化 B-roll
2. 编辑型数据简报 / 发布会数据报告
3. 清爽产品发布风
4. 金融终端科技演示风
5. 轻量杂志拼贴 / 动效卡片
6. 黑白赛博编辑 UI 卡片
也可以发参考视频，我会先拆成可执行的风格规则。
```
