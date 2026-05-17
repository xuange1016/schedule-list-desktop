const fs = require("node:fs/promises");
const path = require("node:path");

const priorities = new Set(["P1", "P2", "P3", "P4"]);

function normalizeAttachment(attachment) {
  if (typeof attachment === "string" && attachment.trim()) {
    return {
      id: `legacy-${Math.random().toString(36).slice(2, 8)}`,
      originalName: path.basename(attachment),
      storedName: path.basename(attachment),
      storedPath: attachment,
      size: 0,
      createdAt: new Date().toISOString(),
    };
  }
  if (!attachment || typeof attachment !== "object") return null;
  if (typeof attachment.storedPath !== "string" || !attachment.storedPath.trim()) return null;
  const now = new Date().toISOString();
  return {
    id: typeof attachment.id === "string" && attachment.id ? attachment.id : `att-${Math.random().toString(36).slice(2, 8)}`,
    originalName:
      typeof attachment.originalName === "string" && attachment.originalName
        ? attachment.originalName
        : path.basename(attachment.storedPath),
    storedName:
      typeof attachment.storedName === "string" && attachment.storedName
        ? attachment.storedName
        : path.basename(attachment.storedPath),
    storedPath: attachment.storedPath,
    size: Number.isFinite(attachment.size) ? attachment.size : 0,
    createdAt: typeof attachment.createdAt === "string" && attachment.createdAt ? attachment.createdAt : now,
  };
}

function localIsoDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function createTaskDraft(overrides = {}) {
  const now = new Date().toISOString();
  return {
    id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "未命名任务",
    description: "",
    dueDate: null,
    priority: "P4",
    reminderAt: null,
    labels: [],
    attachments: [],
    completed: false,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function seedTasks() {
  return [
    createTaskDraft({
      id: "seed-confirm-shell",
      title: "确认桌面端应用骨架",
      description: "检查五个页面、导航和整体方向是否符合文档",
      dueDate: localIsoDate(),
      priority: "P1",
      labels: ["工作"],
    }),
    createTaskDraft({
      id: "seed-follow-feedback",
      title: "整理后续反馈",
      description: "记录哪里像 Todoist，哪里需要继续调整",
      dueDate: localIsoDate(),
      priority: "P3",
      labels: ["学习"],
    }),
    createTaskDraft({
      id: "seed-attachment-rules",
      title: "准备附件上传规则",
      description: "M7 会接入真正上传文件",
      dueDate: localIsoDate(1),
      priority: "P2",
      labels: ["工作"],
    }),
    createTaskDraft({
      id: "seed-prd-done",
      title: "完成产品需求说明书",
      description: "M0 文档准备已完成",
      dueDate: localIsoDate(),
      priority: "P2",
      labels: ["工作"],
      completed: true,
      completedAt: new Date().toISOString(),
    }),
  ];
}

function normalizeTask(task) {
  const now = new Date().toISOString();
  const fallback = createTaskDraft();
  return createTaskDraft({
    ...task,
    id: typeof task.id === "string" && task.id ? task.id : fallback.id,
    title: typeof task.title === "string" && task.title.trim() ? task.title.trim() : "未命名任务",
    description: typeof task.description === "string" ? task.description : "",
    dueDate: typeof task.dueDate === "string" && task.dueDate ? task.dueDate : null,
    priority: priorities.has(task.priority) ? task.priority : "P4",
    reminderAt: typeof task.reminderAt === "string" && task.reminderAt ? task.reminderAt : null,
    labels: Array.isArray(task.labels) ? task.labels.filter((label) => typeof label === "string" && label.trim()) : [],
    attachments: Array.isArray(task.attachments)
      ? task.attachments.map(normalizeAttachment).filter(Boolean)
      : Array.isArray(task.attachmentPaths)
        ? task.attachmentPaths.map(normalizeAttachment).filter(Boolean)
        : [],
    completed: Boolean(task.completed),
    completedAt: typeof task.completedAt === "string" && task.completedAt ? task.completedAt : null,
    createdAt: typeof task.createdAt === "string" && task.createdAt ? task.createdAt : now,
    updatedAt: typeof task.updatedAt === "string" && task.updatedAt ? task.updatedAt : now,
  });
}

function createTaskStore(userDataPath) {
  const filePath = path.join(userDataPath, "data", "tasks.json");

  async function ensureTaskFile() {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    try {
      await fs.access(filePath);
    } catch {
      await fs.writeFile(filePath, JSON.stringify(seedTasks(), null, 2), "utf8");
    }
    return filePath;
  }

  async function readTasks() {
    await ensureTaskFile();
    const content = await fs.readFile(filePath, "utf8");
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeTask);
  }

  async function writeTasks(tasks) {
    await ensureTaskFile();
    await fs.writeFile(filePath, JSON.stringify(tasks.map(normalizeTask), null, 2), "utf8");
  }

  async function createTask(input = {}) {
    const tasks = await readTasks();
    const now = new Date().toISOString();
    const task = normalizeTask({
      ...input,
      id: `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      completed: false,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    });
    tasks.unshift(task);
    await writeTasks(tasks);
    return task;
  }

  async function updateTask(id, updates = {}) {
    const tasks = await readTasks();
    const index = tasks.findIndex((task) => task.id === id);
    if (index === -1) throw new Error("任务不存在");
    const updated = normalizeTask({
      ...tasks[index],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    });
    tasks[index] = updated;
    await writeTasks(tasks);
    return updated;
  }

  async function setCompleted(id, completed) {
    const tasks = await readTasks();
    const index = tasks.findIndex((task) => task.id === id);
    if (index === -1) throw new Error("任务不存在");
    const now = new Date().toISOString();
    const updated = normalizeTask({
      ...tasks[index],
      completed: Boolean(completed),
      completedAt: completed ? now : null,
      updatedAt: now,
    });
    tasks[index] = updated;
    await writeTasks(tasks);
    return updated;
  }

  async function deleteTask(id) {
    const tasks = await readTasks();
    const nextTasks = tasks.filter((task) => task.id !== id);
    if (nextTasks.length === tasks.length) throw new Error("任务不存在");
    await writeTasks(nextTasks);
    return { id };
  }

  return {
    filePath,
    readTasks,
    createTask,
    updateTask,
    setCompleted,
    deleteTask,
  };
}

module.exports = {
  createTaskStore,
  localIsoDate,
};
