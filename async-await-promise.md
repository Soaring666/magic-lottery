# async / await 和 Promise 详解 (Java 后端视角)

> 对应项目：`magit-lottery` — `src/main.ts` 中的 `nextWinner` 方法

---

## 一、先看项目里的实际代码

```ts
async nextWinner(options = {}): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    if (this.shuffledEntries.length > 0) {
      const winner = this.shuffledEntries[0];
      resolve(winner);
    } else {
      reject("No more entries left.");
    }
  });
}
```

调用方：
```ts
const winner = await lottery.nextWinner();
```

这到底在干什么？要理解它，先搞清楚 Java 那边的 `Future` 和 `CompletableFuture`。

---

## 二、Java 的 Future — 基础概念

### 2.1 同步调用 vs 异步调用

**同步调用：** 你烧水，站在水壶前等到水开，才去做别的事。

```java
// 同步：当前线程阻塞，直到方法返回
String result = someApi.call();  // 线程停在这等
System.out.println(result);      // 等拿到了才执行下一行
```

**异步调用：** 你烧水，按下开关就走开做别的事，水开了水壶会"叫你"。

```java
// 异步：方法立刻返回一个"凭证"，不阻塞当前线程
Future<String> future = executor.submit(() -> {
    return someApi.call();  // 这行在新线程里跑
});
System.out.println("这行立即执行，不用等"); // 主线程不阻塞
```

### 2.2 `Future` — 最早的异步"凭证"

`java.util.concurrent.Future` 是 Java 5 引入的，代表**一个异步计算的结果**。

```java
// 创建一个线程池
ExecutorService executor = Executors.newFixedThreadPool(4);

// 提交一个耗时任务，立即返回 Future（不阻塞）
Future<String> future = executor.submit(() -> {
    Thread.sleep(3000);        // 模拟耗时 3 秒
    return "Hello from future";
});

// 主线程可以继续做别的事
System.out.println("任务已提交，继续做其他事...");

// 需要结果时，调用 get() —— 这行会阻塞，直到结果就绪
String result = future.get();  // 可能等 3 秒
System.out.println(result);
```

输出：
```
任务已提交，继续做其他事...
（3 秒后）
Hello from future
```

**`Future` 的缺点：**
1. `get()` 是**阻塞**的——你调它时线程就卡住等
2. 没有回调机制——不能"好了自动通知我"
3. 不能组合多个 Future——先查用户信息，再用用户信息查订单，写起来很麻烦
4. 没有异常处理链

```java
// Future 的痛点：想串行组合两个异步任务，代码很丑
Future<User> userFuture = executor.submit(() -> userService.findById(1));
User user = userFuture.get();  // 阻塞等
Future<List<Order>> orderFuture = executor.submit(() -> orderService.findByUser(user.getId()));
List<Order> orders = orderFuture.get();  // 再阻塞等
```

### 2.3 `Future` 的常用方法

| 方法 | 作用 | 类比 |
|---|---|---|
| `get()` | 阻塞等待结果 | 像排队等叫号，站着不动等到你 |
| `get(timeout, unit)` | 最多等 timeout 时间，超时抛异常 | 最多等 5 分钟，不等了 |
| `isDone()` | 检查是否已完成（不阻塞） | 看一眼队列屏幕，看看轮到你没 |
| `cancel(true/false)` | 取消任务 | 不等了，走吧 |
| `isCancelled()` | 检查是否已被取消 | 确认一下是不是真取消了 |

---

## 三、Java 的 CompletableFuture — 增强版 Future

Java 8 引入的 `CompletableFuture` 解决了 `Future` 的所有痛点。它就是 Java 版的 `Promise`。

### 3.1 手动创建和完成

```java
// 创建一个还没完成的 CompletableFuture
CompletableFuture<String> future = new CompletableFuture<>();

// 在另一个线程里让它完成
executor.submit(() -> {
    Thread.sleep(2000);
    future.complete("终于完成了");   // 相当于 Promise.resolve()
});

// 或者让它失败
// future.completeExceptionally(new RuntimeException("出错了"));  // 相当于 Promise.reject()

// 阻塞等待结果
String result = future.get();  // 等 2 秒
System.out.println(result);    // "终于完成了"
```

**对照 Promise：**
```ts
const promise = new Promise((resolve) => {
    setTimeout(() => resolve("终于完成了"), 2000);
});
const result = await promise;  // 等 2 秒，不阻塞线程
console.log(result);           // "终于完成了"
```

### 3.2 回调 — "好了叫我，不阻塞"

这是 `CompletableFuture` 相对于 `Future` 最大的改进。

```java
CompletableFuture.supplyAsync(() -> {
    // 异步执行（在线程池里）
    Thread.sleep(2000);
    return "Hello";
}).thenAccept(result -> {
    // 完成后自动回调（不阻塞主线程）
    System.out.println(result);
});

System.out.println("这行立即执行，不会等 2 秒");
```

**对照 Promise：**
```ts
new Promise((resolve) => {
    setTimeout(() => resolve("Hello"), 2000);
}).then(result => {
    console.log(result);
});

console.log("这行立即执行，不会等 2 秒");
```

### 3.3 链式调用 — 组合多个异步操作

```java
CompletableFuture.supplyAsync(() -> {
    return userService.findById(1);         // 异步：查用户
}).thenCompose(user -> {
    return CompletableFuture.supplyAsync(() -> 
        orderService.findByUser(user.getId()) // 异步：查订单（依赖上一步结果）
    );
}).thenAccept(orders -> {
    orders.forEach(System.out::println);     // 回调：打印订单
}).exceptionally(ex -> {
    System.err.println("出错了: " + ex);      // 异常处理
    return null;
});
```

**这相当于 Promise 链：**
```ts
fetch("/api/user/1")
  .then(res => res.json())
  .then(user => fetch(`/api/orders?userId=${user.id}`))
  .then(res => res.json())
  .then(orders => console.log(orders))
  .catch(err => console.error("出错了:", err));
```

### 3.4 合并多个独立异步任务

```java
CompletableFuture<String> future1 = CompletableFuture.supplyAsync(() -> {
    Thread.sleep(2000);
    return "任务1结果";
});

CompletableFuture<String> future2 = CompletableFuture.supplyAsync(() -> {
    Thread.sleep(3000);
    return "任务2结果";
});

// 等两个都完成（并行执行，总共等 3 秒不是 5 秒）
CompletableFuture<Void> all = CompletableFuture.allOf(future1, future2);
all.get();  // 阻塞等两个都完成
System.out.println(future1.get());  // 已经就绪，立即返回
System.out.println(future2.get());  // 已经就绪，立即返回
```

**对照 Promise.all：**
```ts
const promise1 = new Promise(resolve => setTimeout(() => resolve("任务1结果"), 2000));
const promise2 = new Promise(resolve => setTimeout(() => resolve("任务2结果"), 3000));

const [r1, r2] = await Promise.all([promise1, promise2]);
console.log(r1);  // "任务1结果"
console.log(r2);  // "任务2结果"
```

### 3.5 常用方法对照表

| 场景 | `CompletableFuture` | 说明 |
|---|---|---|
| 创建已完成的 | `CompletableFuture.completedFuture(value)` | 立即完成的 Future |
| 异步执行 | `CompletableFuture.supplyAsync(() -> value)` | 在线程池里跑 |
| 异步执行（无返回值） | `CompletableFuture.runAsync(() -> {...})` | 不需要返回结果 |
| 手动完成 | `future.complete(value)` | 类似 `resolve(value)` |
| 手动失败 | `future.completeExceptionally(ex)` | 类似 `reject(ex)` |
| 成功回调 | `future.thenAccept(fn)` | 类似 `.then(fn)`，消费结果 |
| 成功回调（返回新 Future） | `future.thenCompose(fn)` | 类似 `.then(fn)`，链式异步 |
| 转换结果 | `future.thenApply(fn)` | 类似 `.then(fn)`，同步转换 |
| 异常回调 | `future.exceptionally(fn)` | 类似 `.catch(fn)` |
| 最终回调 | `future.whenComplete(fn)` | 类似 `.finally(fn)` |
| 阻塞等待 | `future.get()` | 类似 `await`，但**阻塞线程** |
| 超时等待 | `future.get(5, TimeUnit.SECONDS)` | 最多等 5 秒 |
| 组合多个 | `CompletableFuture.allOf(f1, f2)` | 类似 `Promise.all()` |
| 竞速 | `CompletableFuture.anyOf(f1, f2)` | 类似 `Promise.race()` |

---

## 四、核心概念：JS 是单线程的（回顾）

现在理解了 Java 的异步，再看 JS。

Java 模型：**一个请求 → 开一个线程 → 同步执行 → 返回响应**。每个请求有独立的线程，`future.get()` 阻塞的是当前线程，但其他线程不受影响。

JS 模型：**只有一个线程**。如果你写一个等 5 秒的操作（没有用 async/await），整个页面就卡死了——点不了按钮、滚动不了、所有用户请求都排在这一条线程上。

所以 JS 需要一种**不阻塞线程的等待方式**——这就是 `Promise` 和 `async/await` 存在的意义。

| | Java | JavaScript |
|---|---|---|
| 线程模型 | 多线程（一个请求一个线程） | 单线程（事件循环） |
| 阻塞 | `Thread.sleep()` / `future.get()` 阻塞当前线程 | 没有真正的 sleep，setTimeout 不阻塞 |
| 异步容器 | `CompletableFuture<T>` | `Promise<T>` |
| 等待结果 | `future.get()` **阻塞** | `await promise` **不阻塞** |

---

## 五、`Promise` — JS 里的 CompletableFuture

### 5.1 概念类比

`Promise` 就是 JS 里的 **`CompletableFuture`**。

```ts
// JS: Promise
const promise = new Promise((resolve, reject) => { ... });

// Java: CompletableFuture
CompletableFuture<T> future = new CompletableFuture<>();
```

| TS/JS | Java |
|---|---|
| `new Promise((resolve, reject) => ...)` | `new CompletableFuture<>()` |
| `resolve(value)` — 成功完成 | `future.complete(value)` |
| `reject(error)` — 失败 | `future.completeExceptionally(ex)` |
| `promise.then(fn)` — 成功后执行 | `future.thenAccept(fn)` |
| `promise.catch(fn)` — 失败后执行 | `future.exceptionally(fn)` |
| `await promise` — 等待结果 | `future.get()` — 阻塞等待 |

### 5.2 Promise 的三种状态

```
Pending   →  Fulfilled (resolve 被调用)
Pending   →  Rejected  (reject 被调用)
Fulfilled →  不可变，不能再改
Rejected  →  不可变，不能再改
```

就像 `CompletableFuture` 一旦 `complete()` 或 `completeExceptionally()` 之后就不能再改了一样。

### 5.3 Promise 的"非阻塞"本质

```ts
console.log("1: 开始");

const promise = new Promise((resolve) => {
  setTimeout(() => {
    resolve("3: 2秒后完成");
  }, 2000);
});

promise.then((msg) => console.log(msg));

console.log("2: 这行会立即执行，不会等上面的 Promise");
```

输出：
```
1: 开始
2: 这行会立即执行，不会等上面的 Promise
3: 2秒后完成
```

**关键：** `new Promise(...)` 里的代码和 `.then(...)` 的回调不会阻塞主线程。`console.log("2")` 在 Promise 还没完成时就执行了。

Java 里做同样的事要靠多线程：
```java
System.out.println("1: 开始");

CompletableFuture<Void> future = CompletableFuture.runAsync(() -> {
    try {
        Thread.sleep(2000);
        System.out.println("3: 2秒后完成");
    } catch (InterruptedException e) { }
});

System.out.println("2: 这行会立即执行");
```

输出也一样：
```
1: 开始
2: 这行会立即执行
3: 2秒后完成
```

**区别：** Java 靠新线程实现不阻塞；JS 靠单线程事件循环实现不阻塞——没有创建新线程，只是把回调函数注册到"待办队列"，等主线程空闲了再执行。

---

## 六、`async` — 把函数变成"异步函数"

### 6.1 `async` 的作用

**任何函数前面加了 `async`，它就自动返回一个 `Promise`。**

```ts
// 普通函数
function greet(): string {
  return "hello";
}
// greet() 返回 "hello"

// async 函数
async function greetAsync(): Promise<string> {
  return "hello";
}
// greetAsync() 返回 Promise<"hello"> —— 不是直接返回字符串！
```

**Java 对照：**
```java
// 普通方法
public String greet() {
    return "hello";
}

// 异步方法：返回 CompletableFuture，而不是直接返回 String
public CompletableFuture<String> greetAsync() {
    return CompletableFuture.completedFuture("hello");
}
```

### 6.2 项目中 `async` 的使用

```ts
async nextWinner(options = {}): Promise<T | undefined> {
  // 因为这个方法返回 Promise，标记 async 让调用方可以用 await
  return new Promise((resolve, reject) => {
    // ...
  });
}
```

---

## 七、`await` — 等待 Promise 完成

### 7.1 `await` 的作用

**`await` 暂停当前 `async` 函数的执行，等待 Promise 完成，然后取出里面的值。**

```ts
// 不用 await 的写法
const promise = lottery.nextWinner();
promise.then(winner => {
  console.log(winner);
});

// 用 await 的写法（必须在 async 函数里）
const winner = await lottery.nextWinner();
console.log(winner);
```

**Java 对照：**

```java
// 不用 .get() 的写法（回调风格）
CompletableFuture<T> future = lottery.nextWinner();
future.thenAccept(winner -> System.out.println(winner));

// 用 .get() 的写法（阻塞风格）
T winner = lottery.nextWinner().get();
System.out.println(winner);
```

**关键区别：** Java 的 `.get()` **真的阻塞当前线程**（当前线程停下来等结果）；JS 的 `await` **不阻塞线程**，它只是把这个函数的后续代码注册成回调，然后把执行权交还给事件循环，等 Promise 完成后再回来继续执行。

### 7.2 完整流程对比

```ts
async function playLottery() {
  console.log("1: 买彩票");

  const winner = await lottery.nextWinner();

  console.log("2: 中奖号码是", winner);
}

console.log("0: 开始游戏");
playLottery();
console.log("3: 游戏已启动（不阻塞）");
```

输出顺序：
```
0: 开始游戏
1: 买彩票
3: 游戏已启动（不阻塞）  ← 注意这一行在 2 之前
2: 中奖号码是 ...
```

`await` 让 `playLottery` **暂停了**（不是阻塞线程），主线程继续执行——`console.log("3")` 照常执行。等 `nextWinner()` 的 Promise 完成后，`playLottery` 被唤醒，继续执行后面的代码输出 `2`。

### 7.3 await 只能在 async 函数内部使用

```ts
// ❌ 语法错误
const winner = await lottery.nextWinner();

// ✅ 正确
async function foo() {
  const winner = await lottery.nextWinner();
}
```

这就像 Java 里你不能在普通方法里直接调 `future.get()` 然后期望不阻塞——你得用回调或自己管理线程。

---

## 八、回到项目代码，逐行解读

```ts
async nextWinner(options = {}): Promise<T | undefined> {
  // async → 这个函数返回 Promise<T | undefined>
  return new Promise((resolve, reject) => {
    // new Promise 构造器接收一个函数（executor）
    // 这个函数有两个参数：
    //   resolve: 成功时调用，传入结果值 → 相当于 future.complete(value)
    //   reject:  失败时调用，传入错误原因 → 相当于 future.completeExceptionally(ex)

    if (this.shuffledEntries.length > 0) {
      // 有抽奖条目 → 成功
      const winner = this.shuffledEntries[0];
      resolve(winner);
    } else {
      // 没有条目了 → 失败
      reject("No more entries left.");
    }
  });
}
```

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
// 方式一：用 await（推荐，代码像同步一样直白）
try {
  const winner = await lottery.nextWinner();
  console.log("中奖者:", winner);
} catch (error) {
  console.log("抽奖失败:", error);
}

// 方式二：用 .then/.catch（链式回调风格）
lottery.nextWinner()
  .then(winner => console.log("中奖者:", winner))
  .catch(error => console.log("抽奖失败:", error));
```

```java
// 方式一：阻塞等
try {
    T winner = lottery.nextWinner().get();
    System.out.println("中奖者: " + winner);
} catch (Exception e) {
    System.out.println("抽奖失败: " + e);
}

// 方式二：回调风格（不阻塞当前线程）
lottery.nextWinner()
    .thenAccept(winner -> System.out.println("中奖者: " + winner))
    .exceptionally(ex -> {
        System.out.println("抽奖失败: " + ex);
        return null;
    });
```

---

## 九、为什么这个抽奖方法要设计成 async？

### 9.1 预留扩展点

未来抽奖可能改为**后端 API 调用**（请求远程服务器抽奖）。改成 async 后，调用方代码不用改：

```ts
// 现在：本地抽奖（同步完成，但用 async 包装）
async nextWinner(): Promise<T> {
  return this.shuffledEntries[0];
}

// 将来：远程抽奖（真正异步）
async nextWinner(): Promise<T> {
  const response = await fetch("/api/draw");
  return response.json();
}
```

调用方始终 `await lottery.nextWinner()`，不用改。

### 9.2 给调用者传递"可能耗时"的信号

方法返回 `Promise`（或 Java 的 `CompletableFuture`）告诉调用者：**这个方法可能需要等待，别在同步热循环里调用它**。

就像 Java 里看到方法返回 `CompletableFuture` 你就知道它可能是异步的。

### 9.3 项目里这个方法的实际行为

当前实现里 `nextWinner` 其实是**同步完成的**（没有网络请求、没有定时器），但用了 `Promise` 包装：

```ts
return new Promise((resolve) => {
  resolve(winner);  // 立即 resolve，没有等待
});
```

所以 `await lottery.nextWinner()` 会立即返回结果，不会真的"等"什么。这相当于 Java 的：
```java
return CompletableFuture.completedFuture(winner);
```

---

## 十、完整场景：模拟真实的异步抽奖

假设抽奖需要动画效果（转盘转 3 秒）：

```ts
// 模拟延迟工具函数
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
  // Java 的等法: Thread.sleep(ms) → 但会阻塞线程
  // JS 的等法: 不阻塞，只是 3 秒后回调 resolve
}

// 带动画的抽奖
async function spinAndDraw(lottery: MagicLottery<string>): Promise<string> {
  console.log("🎰 转盘转动中...");
  await delay(3000);    // 等 3 秒（不卡主线程！）
  console.log("🎉 开奖！");
  return lottery.nextWinner();
}

async function main() {
  console.log("1: 开始游戏");
  const winner = await spinAndDraw(lottery);
  console.log("2: 中奖者是", winner);
  console.log("3: 游戏结束");
}
```

输出：
```
1: 开始游戏
🎰 转盘转动中...
（3 秒后——期间页面有响应，用户能点按钮）
🎉 开奖！
2: 中奖者是 Alice
3: 游戏结束
```

这 3 秒里用户点按钮、滚动页面，页面依然有响应——**因为 `await delay(3000)` 没有阻塞线程。**

如果用 Java 的 `Thread.sleep(3000)` 做同样的事，那个线程就被占住了。但在 Java Web 里每个请求有自己的线程，所以影响不大；在 JS 里单线程，阻塞就是整个页面卡死。

---

## 十一、对照表总结

| 概念 | TypeScript/JS | Java |
|---|---|---|
| 异步容器（旧版） | 无（Callback 时代） | `Future`（Java 5，只能 get() 阻塞） |
| 异步容器（新版） | `Promise<T>` | `CompletableFuture<T>`（Java 8） |
| 创建异步容器 | `new Promise((resolve, reject) => ...)` | `new CompletableFuture<>()` |
| 成功完成 | `resolve(value)` | `future.complete(value)` |
| 失败完成 | `reject(error)` | `future.completeExceptionally(ex)` |
| 标记异步方法 | `async function foo(): Promise<T>` | `CompletableFuture<T> foo()` |
| 阻塞等待结果 | 无（JS 不鼓励阻塞） | `future.get()`（阻塞当前线程） |
| 非阻塞等待 | `await promise`（让出事件循环） | `future.thenAccept(fn)`（回调） |
| 成功回调 | `.then(fn)` 或 `await` + 后续代码 | `future.thenAccept(fn)` |
| 失败回调 | `.catch(fn)` 或 `try/catch` + `await` | `future.exceptionally(fn)` |
| 最终回调 | `.finally(fn)` | `future.whenComplete(fn)` |
| 立即成功 | `Promise.resolve(value)` | `CompletableFuture.completedFuture(value)` |
| 组合多个（全等） | `Promise.all([p1, p2])` | `CompletableFuture.allOf(f1, f2)` |
| 组合多个（竞速） | `Promise.race([p1, p2])` | `CompletableFuture.anyOf(f1, f2)` |
| 链式异步 | `.then(v => anotherPromise)` | `future.thenCompose(v -> anotherFuture)` |
| 同步转换 | `.then(v => newValue)` | `future.thenApply(v -> newValue)` |
| 线程/执行模型 | 单线程 + 事件循环 | 多线程（线程池） |

---

## 十二、一句话总结

- **`Future`** = Java 5 的原始异步凭证，只能 `get()` 阻塞等，功能有限
- **`CompletableFuture`** = Java 8 的增强版 Future，支持回调、链式组合、异常处理，是 Java 版的 `Promise`
- **`Promise`** = JS 版的 `CompletableFuture`，表示"将来会有的值"，不阻塞线程
- **`async`** = 标记这个方法返回一个 `Promise`（自动包装返回值）
- **`await`** = 等 Promise 完成并取出结果（不阻塞线程，相当于"让出执行权，好了叫我"）
- **`resolve` / `reject`** = 手动触发 Promise 成功或失败，就像 `future.complete()` / `future.completeExceptionally()`
