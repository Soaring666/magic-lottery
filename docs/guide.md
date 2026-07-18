# 快速开始

## 安装

```bash
pnpm add magic-lottery
```

## 基础用法

```ts
import MagicLottery from "magic-lottery";

// 创建抽奖池
const lottery = new MagicLottery(["张三", "李四", "王五", "赵六"]);

// 抽一个中奖者（放回，可重复中奖）
const winner = lottery.drawWinner();
console.log("中奖者:", winner);

// 抽三个中奖者
const winners = lottery.drawWinners(3);
console.log("中奖者名单:", winners);
```

## 不放回抽奖

每人只能中一次，抽完从池中移除：

```ts
const lottery = new MagicLottery(["A", "B", "C", "D"], {
  replacement: false,
});

lottery.drawWinner();       // 抽一个，从池中移除
lottery.size();             // 还剩 3 个
lottery.isEmpty();          // false
```

## 自定义洗牌算法

传入自定义 `shuffle` 函数替换默认的 Fisher-Yates：

```ts
const lottery = new MagicLottery([1, 2, 3, 4, 5], {
  shuffle: (arr) => arr.reverse(),
});
```

## 管理抽奖池

```ts
lottery.add(["E", "F"]);        // 追加条目
lottery.remove("A");            // 移除条目
lottery.hasEntry("B");          // 检查是否存在
lottery.size();                 // 当前总数
lottery.reset();                // 清空抽奖池
```

## 异步抽奖

```ts
const winner = await lottery.nextWinner();
console.log("中奖者:", winner);
```
