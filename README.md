# 🗓️ 日程清单

> 一个可爱、轻量、中文优先的桌面任务管理应用。  
> 把今天要做的事、未来的安排、已经完成的小成就，都好好收起来。

![Version](https://img.shields.io/badge/version-0.1.0-ff7a59)
![Platform](https://img.shields.io/badge/platform-Windows-blue)
![Made with](https://img.shields.io/badge/made%20with-Electron%20%2B%20React-61dafb)

## ✨ 这是一个什么应用？

**日程清单** 是一个灵感来自 Todoist 的中文桌面端任务管理工具。

它适合用来记录：

- 今天必须完成的小任务
- 未来几天的日程安排
- 学习、生活、工作里的待办事项
- 已经完成、值得回头看的任务记录

它目前是 **本地桌面版**：不需要注册账号，不依赖云服务，所有任务和设置都保存在你自己的电脑里。

## 🌷 核心功能

### 📥 收件箱

所有未完成任务的总入口。

- 新增任务
- 编辑标题和详细描述
- 设置日期、优先级、提醒、标签
- 上传附件
- 按今天、未来、无日期、逾期自动分组

### ☀️ 今天

只看今天要完成的事。

- 自动展示今日任务
- 在今天页面添加任务时，默认日期就是今天
- 可以直接编辑、完成或删除任务

### 📆 预览

向后查看未来 30 天的安排。

- 每一天都会显示
- 没有任务的日期也可以直接添加安排
- 适合做一周或一个月内的轻量规划

### 🏷️ 过滤

快速找到某一类任务。

- 按优先级筛选
- 按标签筛选
- 默认标签：学习、生活、工作
- 自定义标签会自动出现在筛选项里

### ✅ 日志

完成过的任务不会消失，它们会被好好放进日志。

- 按完成日期归档
- 查看任务原来的日期、标签和优先级
- 支持把已完成任务恢复回来

### 🎨 设置

把左上角变成你自己的小工作台。

- 自定义用户名
- 自定义个性签名
- 自定义头像
- 重启后仍然保留

## 🚀 普通用户怎么用？

如果你只是想安装软件，不需要下载源码，也不需要安装 Node.js。

请到 GitHub Releases 下载 Windows 安装包：

```text
日程清单 Setup 0.1.0.exe
```

然后双击安装即可。安装完成后，可以从桌面快捷方式或开始菜单打开。

如果你拿到的是免安装版本，也可以打开：

```text
release/win-unpacked/日程清单.exe
```

⚠️ 小提醒：不要只把这个 `.exe` 单独拷走。`win-unpacked` 文件夹里还有运行所需文件，建议给它创建桌面快捷方式。

## 💾 数据保存在哪里？

这个应用目前是本地版。

你的任务、附件、头像和个人设置都会保存在当前电脑的本地应用数据目录中。不同电脑、不同用户之间不会自动同步。

主要数据包括：

- `data/tasks.json`：任务数据
- `data/profile.json`：用户名、签名、头像信息
- 附件目录：你上传到任务里的文件副本
- 头像目录：你选择的个人头像

这意味着：你不用担心数据被上传到服务器，但如果换电脑使用，也需要自己迁移本地数据。

## 📦 为什么安装包不直接放进仓库？

简单说：**源码放仓库，安装包放 Releases。**

安装包当然应该提供给用户下载，只是不推荐直接提交到 Git 代码仓库里。

原因是：

- 安装包接近 100 MB，放进 Git 仓库会让项目变得很重
- 每次更新安装包都会让仓库体积继续变大
- Git 更适合管理代码和文档，不适合长期堆二进制安装包
- GitHub Releases 本来就是专门用来放安装包、压缩包、发布说明的地方

所以更好的分工是：

```text
GitHub 仓库：代码、文档、配置
GitHub Releases：给用户下载的安装包
```

## 🧑‍💻 开发者运行方式

需要先安装：

- Node.js
- npm
- Git

克隆项目：

```bash
git clone git@github.com:xuange1016/schedule-list-desktop.git
cd schedule-list-desktop
```

安装依赖：

```bash
npm install
```

启动开发环境：

```bash
npm run dev
```

开发模式会同时启动 Vite 和 Electron。

## 🛠️ 常用命令

类型检查：

```bash
npm run typecheck
```

构建前端：

```bash
npm run build
```

生成免安装应用目录：

```bash
npm run pack
```

生成 Windows 安装包：

```bash
npm run dist
```

打包结果默认输出到：

```text
release/
```

## 🚢 发布安装包

这个项目是桌面应用，所以这里的“部署”主要指发布安装包。

推荐发布流程：

1. 修改 `package.json` 里的版本号
2. 执行打包命令

   ```bash
   npm run dist
   ```

3. 找到生成的安装包

   ```text
   release/日程清单 Setup x.x.x.exe
   ```

4. 打开 GitHub 仓库的 Releases 页面
5. 创建新的 Release，例如 `v0.1.0`
6. 上传安装包
7. 发布后，用户就可以直接下载使用

## 🗂️ 项目文档

这个项目不是“想到哪写到哪”做出来的，而是先按产品流程整理了需求和计划。

文档都在 `docs/` 目录里：

- `docs/README.md`：项目文档索引
- `docs/todoist-like-desktop-app-prd-v1.md`：产品需求说明书
- `docs/todoist-like-desktop-app-wireframes-v1.md`：页面原型与低保真布局
- `docs/todoist-like-desktop-app-user-flows-v1.md`：用户流程
- `docs/todoist-like-desktop-app-implementation-plan-v1.md`：开发实施计划

## 🧩 技术栈

- Electron
- React
- TypeScript
- Vite
- electron-builder
- lucide-react

## 🪴 当前版本

当前版本：`0.1.0`

已经支持：

- 桌面端基础框架
- 任务增删改查
- 本地保存
- 附件上传和打开
- 完成任务日志
- 日志恢复
- 过滤视图
- 设置页和用户资料保存
- Windows 安装包打包

暂未包含：

- 多设备同步
- 账号系统
- 云端数据库
- 全文搜索
- 日历月视图
- 正式代码签名证书

## 🤝 关于这个项目

这个项目也是一次 AI 协同开发练习：先做产品需求，再做页面说明，再做实施计划，最后进入开发、验证和打包。

如果你也想用 AI 做项目，强烈建议先让 AI 写清楚“要做什么、给谁用、第一版做到哪里”，再开始写代码。

## 📄 License

当前暂未选择开源许可证。

如果后续希望正式开源，建议补充 MIT License；如果只是个人学习或私有使用，可以暂时保持无许可证状态。
