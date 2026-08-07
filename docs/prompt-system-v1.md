# Veylumi Prompt System V1

当前页面消费 Server API 的结构化结果，规则推荐只负责商品候选排序。Prompt 作为版本化、可测试的产品资产，不直接散落在页面事件里。

## 分层

1. `photo_gate`：门禁。浏览器/视觉服务先判断人类照片、单人、正脸和质量；多人直接失败。
2. `face_observation`：只输出可见观察、证据、置信度和限制，不做身份、种族、年龄或医疗推断。
3. `makeup_plan`：将观察、用户目标和设置转为按部位拆分的妆容步骤。
4. `product_match_explanation`：只解释服务端商品库提供的候选，禁止模型生成商品名、色号和链接。
5. `tutorial_match`：只从审核后的教程候选中匹配中国/海外平台内容。
6. `preview_generation`：生成自然预览提示；保留身份、脸型、肤理和自然不对称，并显示“AI preview, not a guarantee”。

## 每次调用必须记录

`promptId`、`promptVersion`、provider、model、requestId、输入数据版本、候选商品快照、输出校验结果、失败原因和用户反馈。分析结果要能追溯，不把未经校验的模型文本直接渲染成商品卡。

## V1.5 扩展位

皮肤可见表现的多光照校准、同色号证据等级、教程质量评分、用户反馈重排和多语言文案。V2 预留人体建模、穿搭和更复杂的视觉编辑，但不与 V1 的面部分析 Prompt 混用。
