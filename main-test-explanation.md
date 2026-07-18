# main.test.ts 代码详解

> 文件：`src/main.test.ts` | 框架：Vitest | 22 个测试用例

---

## 整体结构

```ts
import { describe, expect, test, beforeEach, afterEach } from "vitest";
import MagicLottery from "./main";
```

| 导入 | 用途 | Java 对照 |
|---|---|---|
| `describe` | 分组测试用例 | `@Nested` 或测试类名 |
| `test` | 定义一个测试用例 | `@Test` 方法 |
| `expect` | 断言预期结果 | `Assertions.assertThat()` |
| `beforeEach` | 每个测试前执行 | `@BeforeEach` |
| `afterEach` | 每个测试后执行 | `@AfterEach` |
| `MagicLottery` | 被测试的类 | import 导入 |

---

## 测试组 1：Magic Lottery Manage Methods（行 4-63）

### beforeEach / afterEach

```ts
let lottery: MagicLottery<number>;

beforeEach(() => {
  lottery = new MagicLottery([1, 2, 3, 4, 5]);  // 每个测试前 new 一个实例
});

afterEach(() => {
  lottery.reset();                                // 每个测试后清空
});
```

等价 Java：
```java
private MagicLottery<Integer> lottery;

@BeforeEach
void setUp() {
    lottery = new MagicLottery<>(List.of(1, 2, 3, 4, 5));
}

@AfterEach
void tearDown() {
    lottery.reset();
}
```

### 测试 1：setChannelName / getChannelName

```ts
test("setChannelName and getChannelName method handle set and get a channel name", () => {
  expect(lottery.getChannelName()).toBeUndefined();  // 初始 undefined
  lottery.setChannelName("Test Channel");
  expect(lottery.getChannelName()).toBe("Test Channel");
});
```

| 断言 | 含义 | Java |
|---|---|---|
| `.toBeUndefined()` | 值是 `undefined`（未定义） | `assertNull()` |
| `.toBe("Test Channel")` | 严格相等 | `assertEquals("Test Channel", ...)` |

### 测试 2：add 方法

```ts
test("add method adds entries to the lottery", () => {
  lottery.add([6, 7, 8]);
  expect(lottery.size()).toBe(8);                                     // 5+3=8
  expect(lottery.drawOriginal()).toStrictEqual([1, 2, 3, 4, 5, 6, 7, 8]); // 内容
});
```

| 断言 | 含义 | Java |
|---|---|---|
| `.toStrictEqual([...])` | 深度相等（比较数组每个元素） | `assertArrayEquals()` |

### 测试 3：add 空数组（边界情况）

```ts
test("add method handles empty array", () => {
  lottery.add([]);
  expect(lottery.size()).toBe(5);  // 加空数组，数量不变
});
```

### 测试 4：remove 方法

```ts
test("remove method removes an entry from the lottery", () => {
  lottery.remove(1);
  expect(lottery.size()).toBe(4);
  expect(lottery.hasEntry(1)).toBe(false);  // 确认被移除
});
```

### 测试 5：remove 不存在的条目（边界情况）

```ts
test("remove method handles non-existent entry", () => {
  lottery.remove(6);               // 移除不存在的
  expect(lottery.size()).toBe(5);  // 不报错，数量不变
});
```

### 测试 6：hasEntry

```ts
test("hasEntry method checks if an entry is in the lottery", () => {
  expect(lottery.hasEntry(1)).toBe(true);   // 在池中
  expect(lottery.hasEntry(6)).toBe(false);  // 不在
});
```

### 测试 7：size

```ts
test("size method returns the size of the lottery", () => {
  expect(lottery.size()).toBe(5);
});
```

### 测试 8：isEmpty

```ts
test("isEmpty method checks if the lottery is empty", () => {
  expect(lottery.isEmpty()).toBe(false);   // 初始有元素
  lottery.reset();
  expect(lottery.isEmpty()).toBe(true);    // 清空后为空
});
```

### 测试 9：reset

```ts
test("reset method resets the lottery", () => {
  lottery.reset();
  expect(lottery.size()).toBe(0);
});
```

---

## 测试组 2：Magic Lottery Draw and Shuffle（行 65-114）

### 测试 10：draw 返回打乱结果

```ts
test("draw method returns shuffled entries", () => {
  const originalEntries = lottery.drawOriginal();
  const drawnEntries = lottery.draw();

  expect(drawnEntries).toHaveLength(originalEntries.length);   // 长度相同
  expect(drawnEntries).not.toStrictEqual(originalEntries);     // 顺序不同（打乱了）
  expect(drawnEntries.sort()).toEqual(originalEntries.sort()); // 排序后相同（元素没变）
});
```

**三个断言逻辑链：**
1. 长度一样 — 元素数量没变
2. **不**深度相等 — 顺序真的变了
3. 排序后相等 — 元素集合没变（证明是洗牌不是丢数据）

`expect(x).not.toStrictEqual(y)` — `.not` 取反，相当于 `assertNotEquals()`

### 测试 11：drawOriginal

```ts
test("drawOriginal method returns original entries", () => {
  expect(lottery.drawOriginal()).toEqual([1, 2, 3, 4, 5]);
});
```

### 测试 12：drawWinner

```ts
test("drawWinner method returns a winner", () => {
  const winner = lottery.drawWinner();
  expect(winner).toBeDefined();                          // 有返回值

  const winner2 = lottery.drawWinner({ replacement: false }); // 不放回
  expect(lottery.hasEntry(winner2)).toBe(false);         // winner2 被移除
});
```

| 断言 | 含义 |
|---|---|
| `.toBeDefined()` | 不是 `undefined`，相当于 `assertNotNull()` |

### 测试 13：drawWinner 空池抛异常

```ts
test("drawWinner method throws error when lottery is empty", () => {
  lottery.reset();
  expect(() => lottery.drawWinner()).toThrow();
});
```

**关键语法：** `expect(() => { 代码 }).toThrow()`
把要执行的代码包在箭头函数里，Vitest 捕获执行时的异常。没抛异常就算测试失败。

Java 对照：
```java
assertThrows(Exception.class, () -> lottery.drawWinner());
```

### 测试 14：drawWinners 指定数量

```ts
test("drawWinners method returns specified number of winners", () => {
  const winners = lottery.drawWinners(3);
  expect(winners?.length).toBe(3);  // ?. 可选链，防止 winners 为 undefined 时报错
});
```

`?.` — **可选链操作符**：如果 `winners` 是 `undefined`，不报错，整个表达式返回 `undefined`。

### 测试 15：drawWinners 不足抛异常

```ts
test("drawWinners method throws error when there are not enough entries", () => {
  lottery.reset();
  lottery.add([1]);                     // 只有 1 个
  expect(() => lottery.drawWinners(3)).toThrow();  // 要 3 个，抛异常
});
```

---

## 测试组 3：Magic Lottery Draw Async（行 116-147）

### 测试 16：nextWinner 不放回

```ts
test("nextWinner method draws the next winner and removes them from the lottery", async () => {
  const winner = await lottery.nextWinner({ replacement: false });
  expect(winner).toBeDefined();
  expect(lottery.size()).toBe(4);        // 不放回 → 5-1=4

  const winner2 = await lottery.nextWinner();  // 第二次，默认放回
  expect(winner2).toBeDefined();
  expect(lottery.size()).toBe(4);        // 放回 → 数量不变
});
```

- `async () => { ... }` — 测试函数本身是异步的
- `await lottery.nextWinner()` — 等待 Promise 完成
- 两个断言验证不同的 replacement 行为

Java 对照：
```java
@Test
void testNextWinner() {
    Integer winner = lottery.nextWinner().join();
    assertThat(winner).isNotNull();
}
```

### 测试 17：nextWinner 空池 reject

```ts
test("nextWinner method should reject when there are no more entries left", async () => {
  lottery.reset();

  try {
    await lottery.nextWinner();   // 空池，应该 reject
    throw new Error("nextWinner should have thrown an error but did not.");
  } catch (error) {
    expect(error).toBe("No more entries left.");
  }
});
```

因为 `nextWinner` 是 async 函数，reject 会表现为 `await` 抛出异常，用 `try/catch` 捕获。

如果没抛异常（即 `nextWinner` 没有 reject），下一行 `throw new Error(...)` 会执行，测试失败。这是一个确保"必须抛异常"的技巧。

---

## 测试组 4：Magic Lottery Options（行 149-193）

### 不同的 beforeEach 设置

```ts
let lottery: MagicLottery<string>;   // 这次用 string 类型

beforeEach(() => {
  lottery = new MagicLottery(["Alice", "Bob", "Charlie"], {
    channelName: "Test Channel",
    shuffle: (input: string[]) => input.reverse(),  // 自定义：反转
    replacement: true,
  });
});
```

与前面测试组的区别：

| 区别 | 之前 | 这里 |
|---|---|---|
| 泛型 | `<number>` | `<string>` |
| 构造函数 | 只传数组 | 传数组 + options |
| shuffle | 默认 Fisher-Yates | `reverse()` 反转 |
| channelName | undefined | `"Test Channel"` |

### 测试 18：验证 channelName

```ts
test("should set the channel name", () => {
  expect(lottery.getChannelName()).toBe("Test Channel");
});
```

### 测试 19：验证自定义 shuffle

```ts
test("should apply the shuffle function", () => {
  const originalEntries = lottery.drawOriginal();
  const shuffledEntries = lottery.draw();

  expect(shuffledEntries).toEqual(originalEntries.reverse());
});
```

`reverse()` 反转数组：`["Alice", "Bob", "Charlie"]` → `["Charlie", "Bob", "Alice"]`

### 测试 20：drawWinner 的 replacement

```ts
test("drawWinner should set the replacement option", () => {
  const winner1 = lottery.drawWinner() || "";       // 默认放回
  expect(lottery.hasEntry(winner1)).toBe(true);      // 还在池子里

  lottery.add(["1", "2"]);
  const winner2 = lottery.drawWinner({ replacement: false }); // 不放回
  expect(lottery.hasEntry(winner2)).toBe(false);     // 已移除
});
```

`winner1 || ""` — JS 惯用法：如果 `winner1` 是 `undefined`，用空字符串代替，避免 `hasEntry` 报错。

### 测试 21：drawWinners 的 replacement

```ts
test("drawWinners should set the replacement options", () => {
  const initialSize = lottery.size();   // 3
  const drawCount = 3;
  lottery.drawWinners(drawCount, { replacement: false }); // 不放回抽 3 个
  const finalSize = lottery.size();

  expect(finalSize).toBe(initialSize - drawCount);  // 3 - 3 = 0
});
```

### 测试 22：nextWinner 的 replacement

```ts
test("nextWinner should set the replacement option", async () => {
  const winner = (await lottery.nextWinner()) || "";  // 默认放回
  expect(lottery.hasEntry(winner)).toBe(true);          // 还在池子里
});
```

---

## expect 断言速查表

| 用法 | 含义 | Java 对照 |
|---|---|---|
| `expect(x).toBe(y)` | 严格相等（`===`） | `assertEquals(y, x)` |
| `expect(x).toEqual(y)` | 深度相等（比较内容） | `assertArrayEquals()` / 引用类型内容比较 |
| `expect(x).toStrictEqual(y)` | 严格深度相等 | 比 `toEqual` 更严格的类型校验 |
| `expect(x).toBeUndefined()` | 值是 `undefined` | `assertNull(x)` |
| `expect(x).toBeDefined()` | 不是 `undefined` | `assertNotNull(x)` |
| `expect(x).toBe(true/false)` | 布尔值 | `assertTrue(x)` / `assertFalse(x)` |
| `expect(x).toHaveLength(n)` | 数组/字符串长度 | `assertEquals(n, x.length)` |
| `expect(fn).toThrow()` | 执行抛异常 | `assertThrows(Exception.class, () -> fn())` |
| `expect(x).not.toXxx()` | 任何断言前加 `.not` 取反 | `assertNotEquals` / `assertFalse` 等 |

## 测试用例汇总

| # | describe 组 | 测试内容 | 行号 |
|---|---|---|---|
| 1 | Manage Methods | setChannelName / getChannelName | 15-20 |
| 2 | Manage Methods | add 添加条目 | 22-26 |
| 3 | Manage Methods | add 空数组 | 28-31 |
| 4 | Manage Methods | remove 移除 | 33-37 |
| 5 | Manage Methods | remove 不存在的条目 | 39-42 |
| 6 | Manage Methods | hasEntry | 44-47 |
| 7 | Manage Methods | size | 49-51 |
| 8 | Manage Methods | isEmpty | 53-57 |
| 9 | Manage Methods | reset | 59-62 |
| 10 | Draw and Shuffle | draw 打乱 | 76-84 |
| 11 | Draw and Shuffle | drawOriginal | 86-89 |
| 12 | Draw and Shuffle | drawWinner | 91-97 |
| 13 | Draw and Shuffle | drawWinner 空池抛异常 | 99-102 |
| 14 | Draw and Shuffle | drawWinners | 104-107 |
| 15 | Draw and Shuffle | drawWinners 不足抛异常 | 109-113 |
| 16 | Draw Async | nextWinner 不放回 | 127-135 |
| 17 | Draw Async | nextWinner 空池 reject | 137-146 |
| 18 | Options | channelName 构造参数 | 160-162 |
| 19 | Options | 自定义 shuffle 算法 | 164-169 |
| 20 | Options | drawWinner replacement | 171-178 |
| 21 | Options | drawWinners replacement | 180-187 |
| 22 | Options | nextWinner replacement | 189-192 |
