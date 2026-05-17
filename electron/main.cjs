const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const { createAttachmentStore } = require("./attachments-store.cjs");
const { createProfileStore } = require("./profile-store.cjs");
const { createTaskStore } = require("./tasks-store.cjs");

const isDev = !app.isPackaged;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 920,
    minHeight: 620,
    title: "日程清单",
    backgroundColor: "#f7f7f5",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://127.0.0.1:5173");
  } else {
    mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

function registerTaskHandlers() {
  const taskStore = createTaskStore(app.getPath("userData"));
  const attachmentStore = createAttachmentStore(app.getPath("userData"));
  const profileStore = createProfileStore(app.getPath("userData"));

  ipcMain.handle("tasks:list", async () => taskStore.readTasks());
  ipcMain.handle("tasks:create", async (_event, input = {}) => taskStore.createTask(input));
  ipcMain.handle("tasks:update", async (_event, id, updates = {}) => taskStore.updateTask(id, updates));
  ipcMain.handle("tasks:set-completed", async (_event, id, completed) => taskStore.setCompleted(id, completed));
  ipcMain.handle("tasks:delete", async (_event, id) => taskStore.deleteTask(id));
  ipcMain.handle("attachments:select-and-save", async () => {
    const result = await dialog.showOpenDialog({
      title: "选择附件",
      properties: ["openFile", "multiSelections"],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return [];
    }
    return attachmentStore.saveFiles(result.filePaths);
  });
  ipcMain.handle("attachments:open", async (_event, storedPath) => {
    if (typeof storedPath !== "string" || !storedPath) {
      throw new Error("附件路径无效");
    }
    await fs.access(storedPath);
    const errorMessage = await shell.openPath(storedPath);
    if (errorMessage) {
      throw new Error(errorMessage);
    }
    return true;
  });
  ipcMain.handle("profile:get", async () => profileStore.readProfile());
  ipcMain.handle("profile:update", async (_event, input = {}) => profileStore.updateProfile(input));
  ipcMain.handle("profile:select-avatar", async () => {
    const result = await dialog.showOpenDialog({
      title: "选择头像",
      properties: ["openFile"],
      filters: [{ name: "图片", extensions: ["png", "jpg", "jpeg", "webp", "gif"] }],
    });
    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }
    return profileStore.saveAvatar(result.filePaths[0]);
  });
}

app.whenReady().then(() => {
  registerTaskHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
