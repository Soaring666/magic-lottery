# TypeScript 语法对照 (Java 后端视角)

> 对应项目：`magit-lottery` — `src/main.ts` 中的 `MagicLottery<T>` 类详解

---

## 一、泛型 `<T>`

```ts
interface Options<T> { ... }
class MagicLottery<T> { ... }
```

**Java 对照：**
```java
public class MagicLottery<T> { ... }
public interface Options<T> { ... }
```

一模一样，`T` 是类型参数，使用时指定具体类型：
```ts
const lottery = new MagicLottery<number>([1, 2, 3]);
// 相当于 Java: MagicLottery<Integer> lottery = new MagicLottery<>(...)
```

---

## 二、`interface` vs Java 的 `interface`

```ts
interface Options<T> {
  shuffle?: (input: T[]) => T[];
  channelName?: string;
  replacement?: boolean;
}
```

**区别很大。** TS 的 `interface` 更像 Java 的 **POJO 类**，只描述数据形状，不是行为契约。

| TS `interface` | Java 对应 |
|---|---|
| 字段声明 | 类的成员变量 |
| `field?: type`（问号） | `@Nullable` 可选字段 |
| 没有 `implements` 也能传 | 不需要显式实现 |
| 编译后消失（0 开销） | 编译后保留 |

**对照成 Java 大概是这样：**
```java
public class Options<T> {
    @Nullable Function<List<T>, List<T>> shuffle;
    @Nullable String channelName;
    @Nullable Boolean replacement;
}
```

**关键：** 在 TS 中你不需要 `implements Options`，只要一个对象长这样就能传进去——这叫**结构性类型系统**（duck typing），跟 Java 的**名义类型系统**不同。

---

## 三、类型里的问号 `?`

```ts
shuffle?: (input: T[]) => T[];
channelName?: string;
replacement?: boolean;
```

**`?` = 可选，传参时可以缺省。** 相当于 Java 的 `@Nullable` + 不传时是 `undefined`。

调用时：
```ts
new MagicLottery()                     // 全部缺省
new MagicLottery([1,2,3])              // 只传 entries
new MagicLottery([1,2,3], { channelName: "test" }) // 只传部分 options
```

---

## 四、函数类型签名

```ts
shuffle?: (input: T[]) => T[];
```

表示 `shuffle` 字段的类型是「一个函数，接收 `T[]` 参数，返回 `T[]`」。

**Java 对照（Java 8+）：**
```java
// TS: (input: T[]) => T[]
// Java: Function<List<T>, List<T>>
@Nullable Function<List<T>, List<T>> shuffle;
```

TS 的箭头函数类型 `(参数) => 返回值` 就是 Java 的 `Function<T, R>`。

---

## 五、构造函数默认参数

```ts
constructor(entries: T[] = [], options: Options<T> = {}) {
```

**Java 没有这个语法。** 这是 TS 的**默认参数值**：

- 如果调用时没传 `entries`，默认为空数组 `[]`
- 如果没传 `options`，默认空对象 `{}`

Java 需要写多个重载构造器才能实现同样的效果。

---

## 六、`||` 的"默认值"用法

```ts
this.shuffle = options.shuffle || this.defaultShuffle;
this.replacement = options.replacement || true;
```

这是 TS/JS 的常见惯用法：**`a || b` 意思是"如果 a 是 falsy 就用 b"**。

- 如果 `options.shuffle` 没传（是 `undefined`），就用 `this.defaultShuffle`
- 如果 `options.replacement` 没传（是 `undefined`），就用 `true`

Java 里等价于：
```java
this.shuffle = options.shuffle != null ? options.shuffle : this::defaultShuffle;
this.replacement = options.replacement != null ? options.replacement : true;
```

**注意：** JS 的 `||` 比 `??`（空值合并）更宽松——`0`、`false`、`""` 也会触发默认值。

---

## 七、展开运算符 `...`

```ts
this.shuffledEntries = this.shuffle([...this.entries]);
```

`[...arr]` 意思是**把数组展开到新数组里**，等价于**浅拷贝**一个新数组。

**Java 对照：**
```java
this.shuffledEntries = this.shuffle.apply(new ArrayList<>(this.entries));
```

为什么要拷贝？Fisher-Yates 会修改原数组，但 `entries` 要保留原始顺序，所以每次 shuffle 都基于拷贝来打乱。

---

## 八、`private` 字段

```ts
private entries: T[] = [];
private shuffle: (input: T[]) => T[];
private defaultShuffle(input: T[]): T[] { ... }
```

跟 Java 的 `private` 完全一样。唯一区别：TS 的 `private` 是编译时检查，运行时通过 JS 还是能访问到（真·私有需要用 `#` 前缀）。

---

## 九、方法定义

```ts
setChannelName(channelName: string): void { this.channelName = channelName; }
size(): number { return this.entries.length; }
drawWinner(options: DrawOptions<T> = { replacement: this.replacement }): T { ... }
```

跟 Java 几乎一样：
- `方法名(参数: 类型): 返回类型 { ... }`
- `void` 表示无返回值
- 参数也可以有默认值（Java 不支持，TS 支持）

**注意 `drawWinner` 的默认参数：**
```ts
options: DrawOptions<T> = { replacement: this.replacement }
```
如果没传 `options`，默认从实例变量 `this.replacement` 取值。这在 Java 里写不出来，要手动重载。

---

## 十、数组方法对照

| TS/JS | Java |
|---|---|
| `arr.includes(x)` | `list.contains(x)` |
| `arr.indexOf(x)` | `list.indexOf(x)` |
| `arr.push(x)` | `list.add(x)` |
| `arr.push(...items)` | `list.addAll(items)` |
| `arr.splice(i, 1)` | `list.remove(i)` |
| `arr.length` | `list.size()` |
| `arr.slice(start, end)` | `list.subList(start, end)` |

---

## 十一、`async / await` 和 `Promise`

```ts
async nextWinner(options = {}): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    if (this.shuffledEntries.length > 0) {
      resolve(this.shuffledEntries[0]);
    } else {
      reject("No more entries left.");
    }
  });
}
```

**Java 没有直接对应**，最接近的是 `CompletableFuture`：

| TS | Java |
|---|---|
| `async function` | `CompletableFuture.supplyAsync(...)` |
| `await promise` | `future.get()` |
| `new Promise((resolve, reject) => ...)` | `new CompletableFuture<>()` |
| `resolve(value)` | `future.complete(value)` |
| `reject(error)` | `future.completeExceptionally(ex)` |

Java 等价写法：
```java
public CompletableFuture<T> nextWinner() {
    CompletableFuture<T> future = new CompletableFuture<>();
    if (this.shuffledEntries.size() > 0) {
        future.complete(this.shuffledEntries.get(0));
    } else {
        future.completeExceptionally(
            new RuntimeException("No more entries left.")
        );
    }
    return future;
}
```

调用方：
```ts
const winner = await lottery.nextWinner();
// Java: T winner = lottery.nextWinner().get();
```

---

## 十二、箭头函数作为变量（策略模式）

```ts
private shuffle: (input: T[]) => T[];
```

这里 `shuffle` 不是方法，而是**一个存储函数引用的字段**。可以在构造函数时被替换成用户自定义的洗牌算法——这就是**策略模式**。

Java 等价于字段类型是 `Function<List<T>, List<T>>`：
```java
private Function<List<T>, List<T>> shuffle;
```

构造函数里：
```ts
this.shuffle = options.shuffle || this.defaultShuffle;
// Java: this.shuffle = options.shuffle != null ? options.shuffle : this::defaultShuffle;
```

---

## 快速对照表

| TypeScript | Java 等价 |
|---|---|
| `<T>` | `<T>` 泛型 |
| `interface Options<T> { field: type }` | 类似 POJO / 数据类 |
| `field?: type` | `@Nullable Type field` |
| `(x: T) => U` | `Function<T, U>` 函数式接口 |
| `a \|\| b` 默认值 | `a != null ? a : b` |
| `[...arr]` 展开拷贝 | `new ArrayList<>(arr)` |
| `arr.includes(x)` | `arr.contains(x)` |
| `arr.push(...items)` | `arr.addAll(items)` |
| `arr.splice(i, 1)` | `arr.remove(i)` |
| `async/await` / `Promise` | `CompletableFuture` |
| `arr.length`（属性） | `arr.size()`（方法） |
| `export default Class` | `public class`（默认导出） |
