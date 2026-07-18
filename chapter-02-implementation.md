# 第 02 章 编码及单元测试 — 测试配置 + 实现代码

> 对应文章标题：`步骤2：设置测试脚本` (heading-16) + `3. 实现代码`
> 链接：https://juejin.cn/post/7262998665845293112#heading-16

---

## 一、步骤2：设置测试脚本 — package.json 配置

### 新增 scripts

```json
{
  "scripts": {
    "test": "vitest",                  // 运行测试（监听模式）
    "coverage": "vitest run --coverage" // 运行测试 + 生成覆盖率报告
  }
}
```

### 安装依赖

```
devDependencies:
  vitest ^2.1.9              # 测试框架（Jest 兼容 API）
  @vitest/coverage-v8 ^2.1.9 # V8 引擎覆盖率收集器
```

### 命令使用

```bash
pnpm test        # 监听模式，修改代码自动重跑
pnpm test run    # 跑一次就退出（CI 中用）
pnpm coverage    # 跑测试 + 生成覆盖率报告
```

---

## 二、3. 实现代码 — MagicLottery 类

### 步骤1：构造函数和属性

```ts
interface Options<T> {
  shuffle?: (input: T[]) => T[];
  channelName?: string;
  replacement?: boolean;
}

class MagicLottery<T> {
  private entries: T[] = [];              // 原始抽奖池
  private shuffledEntries: T[] = [];      // 打乱后的抽奖池
  private shuffle: (input: T[]) => T[];  // 洗牌算法函数
  private channelName?: string;           // 频道名称（可选）
  private replacement: boolean;           // 是否放回（默认 true）

  constructor(entries: T[] = [], options: Options<T> = {}) {
    this.entries = entries;
    this.shuffle = options.shuffle || this.defaultShuffle;  // 可自定义洗牌算法
    this.shuffledEntries = this.shuffle([...this.entries]); // 初始化时立即打乱
    this.channelName = options.channelName;
    this.replacement = options.replacement || true;
  }
}
```

#### Fisher-Yates 默认洗牌算法（私有方法）

```ts
private defaultShuffle(input: T[]): T[] {
  const array = [...input];
  let currentIndex = array.length;
  let temporaryValue: T;
  let randomIndex: number;

  while (0 !== currentIndex) {
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;
    // 交换
    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }
  return array;
}
```

每次从剩余元素中随机选一个，与当前位置交换。时间复杂度 O(n)，是**无偏洗牌**（每个排列等概率）。

---

### 步骤2：抽奖池管理方法

| 方法 | 作用 | 时间复杂度 |
|---|---|---|
| `setChannelName(name)` | 设置频道名称 | O(1) |
| `getChannelName()` | 获取频道名称 | O(1) |
| `add(entries)` | 批量添加条目到抽奖池 | O(n) |
| `remove(entry)` | 移除指定的条目 | O(n) |
| `hasEntry(entry)` | 检查条目是否存在 | O(n) |
| `size()` | 获取抽奖池大小 | O(1) |
| `isEmpty()` | 检查抽奖池是否为空 | O(1) |
| `reset()` | 清空抽奖池 | O(1) |

**关键行为：** `add` 和 `remove` 每次操作后都会**重新打乱**抽奖池，保证下一次抽奖时顺序随机。

---

### 步骤3：洗牌和抽奖方法

| 方法 | 作用 |
|---|---|
| `draw()` | 返回打乱后的所有条目（副本） |
| `drawOriginal()` | 返回原始顺序的所有条目（副本） |
| `drawWinner(options?)` | 抽一个中奖者 |
| `drawWinners(num, options?)` | 抽指定数量的中奖者 |
| `setShuffle(fn)` | 更换洗牌算法 |
| `getShuffle()` | 获取当前洗牌算法 |

#### drawWinner 详解

```ts
drawWinner(options = { replacement: this.replacement }): T {
  const { replacement } = options;
  if (this.shuffledEntries.length > 0) {
    const winner = this.shuffledEntries[0];
    if (!replacement) {
      this.remove(winner);  // 不放回：从中奖池移除
    }
    return winner;
  } else {
    throw new Error("At least one entry is required.");
  }
}
```

- 默认取 `shuffledEntries[0]`（已经打乱好了，直接取第一个）
- `replacement = true`：抽完放回，可以再次抽到
- `replacement = false`：抽完移除，每人只能中一次

#### drawWinners 详解

```ts
drawWinners(num, options = { replacement: this.replacement }): T[] {
  if (num <= this.shuffledEntries.length) {
    const winners = this.shuffledEntries.slice(0, num);
    if (!replacement) {
      winners.forEach(winner => this.remove(winner));
    }
    return winners;
  } else {
    throw new Error("Requested number of winners exceeds the total entries.");
  }
}
```

一次性抽出多个中奖者，同样支持放回/不放回。

---

### 步骤4：队列和异步方法

```ts
async nextWinner(options = { replacement: this.replacement }): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    if (this.shuffledEntries.length > 0) {
      const winner = this.shuffledEntries[0];
      if (!replacement) this.remove(winner);
      resolve(winner);
    } else {
      reject("No more entries left.");
    }
  });
}
```

**为什么设计成 async？**
- 预留扩展点：未来可改为远程 API 抽奖
- 与 Promise 链式调用兼容
- 给调用者"可能耗时"的信号

当前实现是**立即 resolve** 的同步操作，相当于：
```ts
return Promise.resolve(winner);
```

---

## 三、测试代码结构

文件：`src/main.test.ts` — 4 个 describe 组，共 22 个测试用例

### 测试组1：管理方法 (7 个用例)

```ts
describe("Magic Lottery Manage Methods", () => { ... })
```

| 测试用例 | 验证内容 |
|---|---|
| setChannelName / getChannelName | 频道名称设置和获取 |
| add | 添加后 size 增加、内容正确 |
| add 空数组 | 空数组不改变状态 |
| remove | 移除后 size 减少、条目不存在 |
| remove 不存在的条目 | 移除不存在条目不报错 |
| hasEntry | 包含检查 |
| size / isEmpty / reset | 基础状态管理 |

### 测试组2：抽奖和洗牌 (6 个用例)

```ts
describe("Magic Lottery Draw and Shuffle", () => { ... })
```

| 测试用例 | 验证内容 |
|---|---|
| draw 返回打乱结果 | 长度相同、顺序不同、排序后相等 |
| drawOriginal 返回原始顺序 | 返回原始数组 |
| drawWinner | 返回中奖者、不放回时被移除 |
| drawWinner 空池 | 抛出 Error |
| drawWinners 指定数量 | 返回正确数量的中奖者 |
| drawWinners 不足 | 抛出 Error |

### 测试组3：异步方法 (2 个用例)

```ts
describe("Magic Lottery Draw Async", () => { ... })
```

| 测试用例 | 验证内容 |
|---|---|
| nextWinner 不放回 | 中奖后被移除、放回时保留 |
| nextWinner 空池 | reject "No more entries left." |

### 测试组4：Options 配置 (7 个用例)

```ts
describe("Magic Lottery Options", () => { ... })
```

| 测试用例 | 验证内容 |
|---|---|
| 自定义 channelName | 构造时传入 channelName |
| 自定义 shuffle 函数 | reverse 作为洗牌算法 |
| drawWinner replacement | 构造参数和选项参数分别生效 |
| drawWinners replacement | 不放回时 size 正确减少 |
| nextWinner replacement | async 版本的放回行为 |

---

## 四、覆盖率报告

```
 % Coverage report from v8
----------|---------|----------|---------|---------|-------------------
File      | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
----------|---------|----------|---------|---------|-------------------
All files |   95.65 |      100 |   88.88 |   95.65 |
 main.ts  |   95.65 |      100 |   88.88 |   95.65 | 176-178, 185-186
----------|---------|----------|---------|---------|-------------------
```

**未覆盖的代码行（176-178, 185-186）：**

这些行是 `nextWinner` 的 `reject("No more entries left.")` 和 `setShuffle`/`getShuffle` 方法（测试中没有显式调用的边界情况）。

---

## 五、文件清单

| 文件 | 说明 |
|---|---|
| `src/main.ts` | MagicLottery 类（接口定义 + 全部实现） |
| `src/main.test.ts` | 22 个单元测试 |
| `package.json` | scripts 含 `test` / `coverage` |

### 依赖

```
devDependencies:
  vitest            ^2.1.9    测试框架
  @vitest/coverage-v8 ^2.1.9  覆盖率工具
```
