# 视觉生成提示词规范

## 统一人物约束

两份参考内容反复强调：上传的人像必须是唯一人物参考，生成结果要保持同一个人。

必须保持：

- 脸型
- 眼型
- 鼻型
- 唇形
- 下颌线
- 面部比例
- 肤色
- 身份特征
- 发型、拍摄角度、表情、光线和背景（教学图系列）

不得改变五官、脸型、发色、摄影角度或人物身份特征。

## 教学图视觉规范

- 纯白背景
- 9:16 竖版
- 超高清
- 统一模特和光线
- 顶部 STEP 标题
- 面部示意居中
- 箭头、编号、虚线区域
- 半透明色块突出重点部位
- 中文标签优先使用简体中文
- 高级美容学校教材 / 医学美容图解 / 小红书专业教程风格

## 分析报告视觉规范

可采用：

- Apple-like clean layout
- 高端美容咨询报告
- 奢华护肤诊所
- 美容学院教材
- 专业信息图
- 超写实人像
- 白色干净背景
- 9:16 竖版

分析图可使用热力图、色板、半透明面部叠加、测量线、箭头和局部放大。

## 最终妆容效果图提示词骨架

```text
Use the uploaded portrait as the ONLY face reference.

IMPORTANT:
Keep exactly the same person.

Do NOT change:
face shape
eye shape
nose shape
lip shape
jawline
facial proportions
skin tone
identity

Create a professional beauty consultant report.

Style:
Luxury beauty clinic
Professional makeup academy
Personal image consultant report
Cosmetics textbook infographic
White clean background
Ultra realistic
9:16
```

## 风格分析图提示词要点

中心保留原始肖像，周围放置不同妆容风格推荐面板：

- 大地系妆容
- 韩系裸妆
- 奶茶妆
- 纯欲妆
- 日杂妆
- 欧美浓颜妆

每个面板展示适配评分、眼影颜色、腮红颜色和口红颜色，并配合专业化妆色卡。

## 实现注意事项

- 生成模型负责视觉表达和效果预览；面部属性的结构化结果应由视觉分析流程输出。
- 商品、色号和链接必须来自可验证商品库。
- 不应把生成图片当成真实上妆保证。
- “敏感度、水分、油脂”等皮肤指标只能在有可靠检测数据时呈现为测量结果；仅凭照片时应降级为外观观察。
- 照片上传、保存、删除和用于生成的授权状态必须在产品中明确展示。
