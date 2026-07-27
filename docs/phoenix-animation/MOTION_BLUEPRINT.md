# 火凤凰 2.5D 动作蓝图

本文件定义第一阶段和八个官方动作的运动语言。所有动作只能驱动官方 PNG 图层，不允许重新绘制角色形状。

## 1. 动作原则

- 角色必须像“有意识的日记伙伴”，不是 loading 图标。
- 动作强度克制，优先表达注意力、理解、陪伴和递交结果。
- 同一动作内避免所有部件同步起落。
- 所有状态切换使用过渡，不允许瞬间换姿势。
- 常态优先保留官方立体光影，程序光影只做增强。
- 头部、躯干、翅膀、羽冠、尾羽、眼睛分别有独立时间差。

## 2. 推荐运行时

第一版推荐：

- three.js OrthographicCamera
- 每个 PNG 使用透明 Texture Plane
- 图层 z 值由 README 中图层编号转换
- 统一角色根节点 `phoenixRoot`
- 关键子节点：`bodyRig`、`headRig`、`leftWingRig`、`rightWingRig`、`tailRig`、`faceRig`、`propRig`、`fxRig`
- 动画插值：requestAnimationFrame + spring/tween
- 鼠标视线：pointer normalized coordinates → pupil local offset

不建议第一版直接使用 DOM `<img>` 堆叠，因为遮罩、深度、轻微透视和后续 mesh deformation 会更难维护。

## 3. Idle — 待机呼吸

### 目标
角色即使没有任务，也保持柔和生命感。

### 循环参数
- 周期：3.6–4.6 秒，进入页面时随机
- bodyRig scaleY：1.000 → 1.020 → 1.000
- bodyRig scaleX：1.000 → 1.008 → 1.000
- bodyRig y：0 → -6 px → 0（以 2000px 画布计算）
- headRig y：延迟 100 ms，0 → -9 px → 0
- headRig rotationZ：-0.35° → 0.45° → -0.35°
- wing left rotationZ：约 ±0.8°
- wing right rotationZ：约 ±0.65°，相位延迟 180 ms

### 羽冠
- center：±1.2°，周期 2.9 秒
- screen_left：±1.8°，周期 3.25 秒
- screen_right：±1.5°，周期 3.05 秒

### 尾羽
- center：±1.5°，周期 4.0 秒
- left inner：±2.4°，周期 3.55 秒
- left outer：±4.0°，周期 3.1 秒
- right inner：±2.2°，周期 3.7 秒
- right outer：±4.5°，周期 3.25 秒

### 禁止
- 整只角色统一上下浮动
- 左右翅膀镜像同步
- 尾羽整组同角度摆动

## 4. Blink — 自然眨眼

### 调度
- 下一次眨眼间隔：2.8–6.5 秒随机
- 双眨概率：12%
- 双眨间隔：130–210 ms
- 用户点击后 1.2 秒内避免随机眨眼，防止表情冲突

### 单次眨眼
1. 开眼透明度 1 → 0：55–75 ms
2. 闭眼图层 0 → 1：同时完成
3. 停留：70–110 ms
4. 闭眼回开眼：65–90 ms

### 开心状态
直接切换官方 happy eyes，不使用 open eye 的 scaleY 压扁模拟。

## 5. Eye Tracking — 视线跟随

### 输入
- 鼠标或触控点相对角色头部中心的标准化位置 `[-1,1]`
- 超出角色区域后逐步衰减，不突然停止

### 最大位移
- 水平：眼睛底层宽度的 7%–11%
- 垂直：眼睛底层高度的 5%–8%
- 左右眼可以有 2% 的差异，避免机械同步

### 平滑
- 跟随响应：90–140 ms
- 回中：220–380 ms
- 使用阻尼，不直接赋值

### 遮罩
瞳孔必须被 `eye_*_clip.png` 限制，任何角度都不能超出眼眶。

## 6. Click Happy — 点击开心反应

### 总时长
900–1300 ms

### 时间轴
- 0–100 ms：身体轻微下压 1.5%，头部略缩
- 100–360 ms：身体弹起 20–32 px
- 140–420 ms：双翅展开，使用 happy wing 资产或官方允许的翅膀旋转
- 130 ms：切换 happy eyes
- 160 ms：切换 happy mouth
- 220–720 ms：sparkle 依次出现
- 620–1100 ms：回落并恢复 idle

### 触发限制
- 连续点击最多每 900 ms 触发一次
- 快速重复点击只增加少量星光，不重复叠加完整弹跳

## 7. Listening — 倾听

### 目标
表达“它正在认真听”，不是忙碌或 loading。

### 动作
- 头部向用户方向偏转 2°–4°
- 身体向前靠近 8–14 px
- 眼睛锁定输入区域或语音波形中心
- 一侧翅膀轻微收拢
- 呼吸幅度降低约 25%
- 可以加入非常弱的暖光脉冲，周期 2.2 秒

### 状态进入
320–480 ms

### 状态退出
260–420 ms

## 8. Writing — 写字

### 目标
角色真的在替用户整理日记。

### 动作结构
1. 日记本从下方进入并打开
2. 持笔翅膀移动到握笔姿势
3. 羽毛笔沿短路径往复
4. writing overlay 分阶段出现
5. 非持笔翅膀稳定日记本

### 参数
- 书本进入：380–520 ms
- 展开页：260–380 ms
- 羽毛笔单次笔画：420–650 ms
- 每 2–4 次笔画停顿 180–320 ms
- 头部视线在页面与用户之间偶尔切换

### 禁止
- 羽毛笔没有被翅膀握住却独立漂浮
- 写字线条通过 SVG 重新画角色或书本
- 书本遮挡角色脸部

## 9. Thinking — 思考

### 动作
- 头部偏转 3°–5°
- 眉毛进入官方思考表情
- 视线向上侧移动
- `thinking_bubble.png` 从 92% scale 淡入
- 记忆光点慢速绕行
- 呼吸速度下降约 15%

### 记忆光点
- 3–5 个实例
- 每个使用不同半径和周期
- 不穿过脸部和眼睛

## 10. Clarify — 确认

### 动作
- 头部轻微前倾
- 眉毛进入询问状态
- `clarify_question.png` 在一侧弹出
- 单侧翅膀做小幅邀请动作
- 眼睛对准用户输入区域

### 语气
动作必须表达温和确认，不能像警告或报错。

## 11. Done — 完成

### 动作
- 羽毛笔停止
- 日记本合上或切换为 `heart_journal.png`
- 身体放松并轻微上抬
- happy eyes 短暂出现
- 星光较少，持续 600–900 ms

此状态表示“今天已经保存”，强度低于 celebrating。

## 12. Present — 递交日记

### 动作
- 使用 `presented_journal.png`
- 双翅托住日记本
- 日记本沿 z 轴向用户靠近，scale 0.94 → 1.04 → 1.00
- 头部视线从日记本移向用户
- 动作完成后保持稳定，不立即收回

### 总时长
700–1000 ms

### 关键要求
这是结果交付动作，不是弹窗动画。角色和日记必须在同一个空间逻辑中。

## 13. 状态机建议

```text
idle
├── click -> happy -> idle
├── user_input_focus -> listening
├── submit -> thinking
├── thinking -> writing
├── writing -> done
├── done -> present
├── assistant_needs_detail -> clarify
└── pointer_leave / timeout -> idle
```

### 优先级
1. error recovery（仅内部，不改变角色视觉为愤怒）
2. present
3. clarify
4. writing
5. thinking
6. listening
7. click happy
8. idle

## 14. 过渡与 easing

推荐：

- 柔和进入：cubic-bezier(0.22, 0.8, 0.24, 1)
- 回弹：spring stiffness 210–260, damping 18–24
- 视线：damping 20–26
- 尾羽：正弦或低频噪声，不使用线性往返

## 15. 性能目标

- 桌面：稳定 60 fps
- 中端手机：稳定 45–60 fps
- 首屏纹理总量建议压缩后不超过 8–12 MB
- 非当前状态资产可延迟加载
- PNG 保留无损源文件，网页另生成 WebP/AVIF 派生版本；源 PNG 不覆盖
- 支持 `prefers-reduced-motion`

## 16. 第一阶段验收场景

打开独立 Mascot Lab 页面后：

1. 角色能按官方待机姿势正确装配
2. 身体有分层呼吸，头部和翅膀存在时间差
3. 2.8–6.5 秒内发生自然眨眼
4. 鼠标移动时只有瞳孔在遮罩内跟随
5. 五组尾羽不同步飘动
6. 点击角色触发官方开心表情和动作
7. 点击结束后自然回到 idle
8. 全程未使用 SVG/CSS 重画角色
9. 关闭任一 PNG 图层时，能够明确识别其对应部件
10. 与官方 assembly reference 并排对比时，角色比例与材质一致
