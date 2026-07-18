# Magic Lottery

一个简单易用的抽奖库，基于 Fisher-Yates 洗牌算法。

## 安装

```bash
pnpm add magic-lottery
```

## 快速开始

```ts
import MagicLottery from "magic-lottery";

const lottery = new MagicLottery(["Alice", "Bob", "Charlie"]);

// 抽一个中奖者
const winner = lottery.drawWinner();
console.log(winner); // Alice / Bob / Charlie

// 抽三个中奖者（一次性）
const winners = lottery.drawWinners(3);
console.log(winners); // ["Charlie", "Alice", "Bob"]
```

## 使用方式

### 基础抽奖

```ts
const lottery = new MagicLottery(["张三", "李四", "王五", "赵六"]);

lottery.drawWinner();        // 抽一个（放回，可重复中奖）
lottery.drawWinners(2);      // 抽两个
lottery.draw();              // 获取打乱后的全部名单
```

### 不放回抽奖（每人只能中一次）

```ts
const lottery = new MagicLottery(["A", "B", "C", "D"], { replacement: false });

lottery.drawWinner();           // 抽一个，从池中移除
lottery.drawWinners(2);         // 抽两个，从池中移除
lottery.size();                 // 剩余人数
lottery.isEmpty();              // 是否已抽完
```

### 自定义洗牌算法

```ts
const lottery = new MagicLottery(["x", "y", "z"], {
  shuffle: (items) => items.reverse(),  // 用反转代替随机洗牌
  channelName: "年会抽奖",               // 给这次抽奖起个名
});
```

### 管理抽奖池

```ts
lottery.add(["E", "F"]);        // 追加条目
lottery.remove("A");            // 移除某个条目
lottery.hasEntry("B");          // 检查是否存在
lottery.size();                 // 当前总数
lottery.isEmpty();              // 是否为空
lottery.reset();                // 清空抽奖池
lottery.drawOriginal();         // 查看原始顺序
```

### 异步抽奖

```ts
const winner = await lottery.nextWinner();
console.log("中奖者:", winner);
```

## API

| 方法 | 说明 |
|---|---|
| `drawWinner(options?)` | 抽一个中奖者，默认放回 |
| `drawWinners(num, options?)` | 抽多个中奖者 |
| `draw()` | 获取打乱后的全部条目 |
| `drawOriginal()` | 获取原始顺序的全部条目 |
| `nextWinner(options?)` | 异步抽一个 |
| `add(entries)` | 追加条目 |
| `remove(entry)` | 移除条目 |
| `hasEntry(entry)` | 检查条目是否存在 |
| `size()` | 当前条目数 |
| `isEmpty()` | 是否为空 |
| `reset()` | 清空 |
| `setChannelName(name)` | 设置频道名称 |
| `getChannelName()` | 获取频道名称 |
| `setShuffle(fn)` | 更换洗牌算法 |
| `getShuffle()` | 获取当前洗牌算法 |

## 开发

```bash
pnpm install       # 安装依赖
pnpm test run      # 跑测试
pnpm coverage      # 覆盖率
pnpm run build     # 构建
```
