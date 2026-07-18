# API 文档

## MagicLottery\<T\>

泛型抽奖类，`T` 表示条目类型。

### 构造器

```ts
new MagicLottery<T>(entries?: T[], options?: Options<T>)
```

**参数：**

| 参数 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `entries` | `T[]` | `[]` | 初始抽奖条目 |
| `options` | `Options<T>` | `{}` | 配置选项 |

**Options：**

```ts
interface Options<T> {
  shuffle?: (input: T[]) => T[];   // 自定义洗牌算法
  channelName?: string;             // 频道名称
  replacement?: boolean;            // true=放回（可重复中奖）
}
```

---

### 抽奖方法

#### drawWinner

```ts
drawWinner(options?: DrawOptions<T>): T
```

抽取一个中奖者。默认放回。

```ts
lottery.drawWinner();                           // 放回
lottery.drawWinner({ replacement: false });      // 不放回
```

#### drawWinners

```ts
drawWinners(num: number, options?: DrawOptions<T>): T[]
```

抽取多个中奖者。

```ts
lottery.drawWinners(3);                          // 抽 3 个，放回
lottery.drawWinners(2, { replacement: false });  // 抽 2 个，不放回
```

#### nextWinner

```ts
nextWinner(options?: DrawOptions<T>): Promise<T | undefined>
```

异步抽取一个中奖者。

```ts
const winner = await lottery.nextWinner();
```

#### draw

```ts
draw(): T[]
```

返回打乱后的全部条目（副本）。

#### drawOriginal

```ts
drawOriginal(): T[]
```

返回原始顺序的全部条目（副本）。

---

### 管理方法

| 方法 | 签名 | 说明 |
|---|---|---|
| `add` | `(entries: T[]): void` | 追加条目到抽奖池 |
| `remove` | `(entry: T): void` | 移除指定条目 |
| `hasEntry` | `(entry: T): boolean` | 检查条目是否存在 |
| `size` | `(): number` | 返回当前条目数 |
| `isEmpty` | `(): boolean` | 检查抽奖池是否为空 |
| `reset` | `(): void` | 清空抽奖池 |

### 频道方法

| 方法 | 签名 | 说明 |
|---|---|---|
| `setChannelName` | `(name: string): void` | 设置频道名称 |
| `getChannelName` | `(): string \| undefined` | 获取频道名称 |

### 洗牌方法

| 方法 | 签名 | 说明 |
|---|---|---|
| `setShuffle` | `(fn: (input: T[]) => T[]): void` | 更换洗牌算法 |
| `getShuffle` | `(): (input: T[]) => T[]` | 获取当前洗牌算法 |

---

## 类型定义

```ts
interface Options<T> {
  shuffle?: (input: T[]) => T[];
  channelName?: string;
  replacement?: boolean;
}

interface DrawOptions<T> {
  replacement?: Options<T>["replacement"];
}
```
