---
layout: home

hero:
  name: Magic Lottery
  text: 让抽奖变得简单、愉快、公平
  tagline: 基于 Fisher-Yates 洗牌算法的 TypeScript 抽奖库
  actions:
    - theme: brand
      text: 快速开始
      link: /guide
    - theme: alt
      text: API 文档
      link: /api

features:
  - title: 🎯 简单易用
    details: 三行代码完成抽奖，零配置开箱即用
  - title: 🔄 灵活可控
    details: 支持放回/不放回、自定义洗牌算法、异步抽奖
  - title: 📦 类型安全
    details: 纯 TypeScript 编写，完善的泛型支持
  - title: ✅ 测试覆盖
    details: 22 个单元测试，95%+ 行覆盖率
---

## 快速体验

```ts
import MagicLottery from "magic-lottery";

const lottery = new MagicLottery(["Alice", "Bob", "Charlie"]);
const winner = lottery.drawWinner();
console.log(`🎉 中奖者: ${winner}`);
```
