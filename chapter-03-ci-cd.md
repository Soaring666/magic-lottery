# 第 03 章 持续集成和发布 — 代码文档

> 对应项目：`magit-lottery` | 文章：全流程教程：TypeScript npm 开源项目开发

---

## 目录结构

```
.github/
├── actions/
│   └── setup-and-cache/
│       └── action.yml          # 公共执行环境（pnpm + Node 安装和缓存）
└── workflows/
    ├── ci.yml                  # CI 工作流（lint + build + test）
    └── release.yml             # 发布工作流（GitHub Changelog 自动生成）
```

---

## 一、`.github/actions/setup-and-cache/action.yml` — 公共执行环境

### 作用

封装 CI 中每个 Job 都需要重复的"安装 pnpm + 设置 Node 版本"步骤。其他 workflow 用 `uses: ./.github/actions/setup-and-cache` 一行引用，避免在每个 Job 里重复写。

### 代码

```yaml
name: Setup and cache
description: Setup for node, pnpm and cache for browser testing binaries
inputs:
  node-version:
    required: false
    description: Node version for setup-node
    default: 18.x

runs:
  using: composite

  steps:
    - name: Install pnpm
      uses: pnpm/action-setup@v2
      with:
        version: 8.6.10

    - name: Set node version to ${{ inputs.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ inputs.node-version }}
```

### 逐段解释

| 字段 | 含义 | 类比 |
|---|---|---|
| `name` / `description` | 这个 Action 的名字和说明 | 类似 Java 方法的注释 |
| `inputs` | 可传入的参数。这里 `node-version` 可选，默认 `18.x` | 类似方法的可选参数 + 默认值 |
| `runs.using: composite` | 这个 Action 由多个子步骤组合而成（不是写 JS 代码的 Action） |  |
| `steps` | 要执行的步骤列表 | 按顺序执行 |
| `pnpm/action-setup@v2` | GitHub Marketplace 上现成的 Action：安装指定版本的 pnpm | 类似调用第三方库 |
| `actions/setup-node@v3` | GitHub 官方 Action：设置 Node.js 环境 | 类似调用 JDK 工具链 |

### 调用方式

```yaml
# 用默认 Node 18
- uses: ./.github/actions/setup-and-cache

# 指定 Node 版本
- uses: ./.github/actions/setup-and-cache
  with:
    node-version: 16
```

---

## 二、`.github/workflows/ci.yml` — CI 持续集成

### 作用

每当代码推送到 `main` 分支或向 `main` 提交 PR 时，自动运行：

1. **Lint Job**：检查代码风格
2. **Test Job**：在多系统 × 多 Node 版本的矩阵中执行 build + 测试

### 代码

```yaml
name: CI

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

concurrency:
  group: ci-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: ./.github/actions/setup-and-cache
      - name: Install
        run: pnpm i
      - name: Lint
        run: pnpm run lint

  test:
    runs-on: ${{ matrix.os }}
    timeout-minutes: 3
    strategy:
      matrix:
        os: [ubuntu-latest]
        node_version: [16, 18]
        include:
          - os: macos-latest
            node_version: 18
          - os: windows-latest
            node_version: 18
      fail-fast: false
    steps:
      - uses: actions/checkout@v3
      - uses: ./.github/actions/setup-and-cache
        with:
          node-version: ${{ matrix.node_version }}
      - name: Install
        run: pnpm i
      - name: Build
        run: pnpm run build
      - name: Test
        run: pnpm run test
```

### 逐段解释

#### `on` — 触发条件

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

| 事件 | 触发时机 |
|---|---|
| `push` → `main` | 你直接往 main 提交代码时 |
| `pull_request` → `main` | 别人提交 PR 到 main 时 |

#### `concurrency` — 并发控制

```yaml
concurrency:
  group: ci-${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true
```

- `group`：同一个 PR 或同一个分支的 CI 归为一组
- `cancel-in-progress: true`：如果同一个组已经有 CI 在跑，新提交时自动取消旧的（省资源）

**类比**：就像你在 PR 上又 push 了一次，GitHub 自动把上一次还在跑的 CI 停掉，跑新的。

#### `jobs.lint` — 代码检查 Job

```
runs-on: ubuntu-latest
```

在 Ubuntu 最新版上运行。

步骤：
1. `actions/checkout@v3` — 把代码拉到 CI 机器上（类似 `git clone`）
2. `uses: ./.github/actions/setup-and-cache` — 装 pnpm + Node（调用上面那个公共 Action）
3. `pnpm i` — 安装依赖
4. `pnpm run lint` — 跑 ESLint 检查

#### `jobs.test` — 测试 Job（矩阵构建）

```yaml
strategy:
  matrix:
    os: [ubuntu-latest]
    node_version: [16, 18]
    include:
      - os: macos-latest
        node_version: 18
      - os: windows-latest
        node_version: 18
  fail-fast: false
```

**矩阵展开后实际跑 4 个 Job：**

| # | 操作系统 | Node 版本 |
|---|---|---|
| 1 | ubuntu-latest | 16 |
| 2 | ubuntu-latest | 18 |
| 3 | macos-latest | 18 |
| 4 | windows-latest | 18 |

`fail-fast: false` 表示其中一个 Job 失败不取消其他的（方便看到所有平台的完整结果）。

每个 Job 跑：
1. checkout 代码
2. 装 pnpm + 指定版本的 Node
3. `pnpm i` 安装依赖
4. `pnpm run build` 验证能编译
5. `pnpm run test` 跑 22 个单元测试

`timeout-minutes: 3` — 单个 Job 超过 3 分钟自动终止。

---

## 三、`.github/workflows/release.yml` — 发布工作流

### 作用

当你推送一个 `v*` 标签（如 `v1.0.0`）到 GitHub 时，自动生成 Release Changelog。

### 代码

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

permissions:
  contents: write

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v3
        with:
          node-version: 18.x
      - run: npx changelogithub
        env:
          GITHUB_TOKEN: ${{secrets.GITHUB_TOKEN}}
```

### 逐段解释

| 字段 | 含义 |
|---|---|
| `on.push.tags: 'v*'` | 只有在推送 `v` 开头的标签时才触发，如 `v1.0.0`、`v2.3.1-beta` |
| `permissions.contents: write` | 给这个 workflow 写入仓库内容的权限（创建 Release 需要） |
| `fetch-depth: 0` | 拉取全部 git 历史（changelogithub 需要完整的 commit 记录来生成 changelog） |
| `npx changelogithub` | 一个 npm 包，自动读取 commit 信息生成 GitHub Release 的 changelog |
| `GITHUB_TOKEN` | GitHub 自动提供的 Token，无需手动创建，用于调用 GitHub API 创建 Release |

---

## 四、`package.json` 新增字段

### 元信息

```json
{
  "license": "MIT",
  "author": "",
  "description": "A magic library makes your lucky draws simpler.",
  "homepage": "https://github.com/logeast/magic-lottery",
  "repository": {
    "type": "git",
    "url": "git+https://github.com/logeast/magic-lottery.git"
  },
  "keywords": [
    "lottery", "Fisher-Yates Shuffle", "magic lottery",
    "lucky", "random", "shuffle", "raffle", "prize", "winner"
  ]
}
```

| 字段 | 作用 | 哪里会用到 |
|---|---|---|
| `license` | 开源许可证 | npm 页面显示、法律声明 |
| `author` | 作者名 | npm 页面显示 |
| `description` | 一句话描述 | npm 搜索结果、`npm search` |
| `homepage` | 项目主页 | npm 页面的 Homepage 链接 |
| `repository` | 源码仓库地址 | npm 页面的 Repository 链接 |
| `keywords` | 搜索关键词 | npm 搜索时匹配这些词 |

### Release 脚本

```json
"release": "bumpp package.json --commit --push --tag && git update-ref refs/heads/release refs/heads/main && git push origin release && pnpm publish --access public"
```

这条命令拆解为 4 个阶段：

| 阶段 | 命令 | 作用 |
|---|---|---|
| 1 | `bumpp package.json --commit --push --tag` | 交互式选择版本（patch/minor/major），自动更新 `package.json` 版本号，commit、push、打 tag |
| 2 | `git update-ref refs/heads/release refs/heads/main` | 把本地 `release` 分支指向 `main` 的最新提交 |
| 3 | `git push origin release` | 推送 `release` 分支到 GitHub |
| 4 | `pnpm publish --access public` | 发布到 npm registry（`--access public` 因为包名未在 npm 组织下） |

触发链条：

```
pnpm release
  → bumpp 升级版本号 → git tag v1.0.1 → git push
    → GitHub 检测到 push v* 标签
      → 触发 .github/workflows/release.yml
        → changelogithub 自动创建 GitHub Release
```

---

## 五、依赖

```
devDependencies:
+ bumpp ^11.1.0    # 语义化版本管理工具，自动升级版本号、打 tag、commit
```

### bumpp 使用

```bash
# 运行后交互式选择版本升级类型
pnpm release

# 或者手动指定版本
pnpm bumpp patch   # 0.0.0 → 0.0.1
pnpm bumpp minor   # 0.0.1 → 0.1.0
pnpm bumpp major   # 0.1.0 → 1.0.0
```

---

## 六、验证清单

### 已通过验证 ✅

```
pnpm run build  →  tsc + vite build  成功
pnpm test run   →  22 tests passed
```

### CI/CD 上线前准备

| # | 操作 | 说明 |
|---|---|---|
| 1 | 代码推送到 GitHub | `git push origin main` |
| 2 | CI 自动触发 | GitHub Actions 跑 lint + test 矩阵（4 个环境） |
| 3 | 注册 npm 账号 | [npmjs.com](https://npmjs.com) 注册 |
| 4 | 本地登录 npm | `npm adduser` |
| 5 | 发布 | `pnpm release` → 选择版本 → 自动发布到 npm |
| 6 | Release 自动生成 | GitHub Actions 检测到 `v*` tag → 自动生成 Changelog |

---

## 七、与 Java 项目 CI 对比

| 概念 | GitHub Actions (本文) | Java 项目对比 |
|---|---|---|
| CI 平台 | GitHub Actions | Jenkins / GitLab CI / GitHub Actions |
| 构建工具 | pnpm + Vite | Maven / Gradle |
| 代码检查 | ESLint | Checkstyle / SpotBugs |
| 测试 | Vitest | JUnit + Mockito |
| 矩阵测试 | 3 OS × 2 Node 版本 | 不同 JDK 版本 |
| 发布 | pnpm publish | mvn deploy |
| 版本管理 | bumpp | Maven Release Plugin |
| Changelog | changelogithub | Release Drafter / git-changelog |
