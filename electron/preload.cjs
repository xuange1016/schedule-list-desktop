const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopApp", {
  platform: process.platform,
  tasks: {
    list: () => ipcRenderer.invoke("tasks:list"),
    create: (input) => ipcRenderer.invoke("tasks:create", input),
    update: (id, updates) => ipcRenderer.invoke("tasks:update", id, updates),
    setCompleted: (id, completed) => ipcRenderer.invoke("tasks:set-completed", id, completed),
    delete: (id) => ipcRenderer.invoke("tasks:delete", id),
  },
  attachments: {
    selectAndSave: () => ipcRenderer.invoke("attachments:select-and-save"),
    open: (storedPath) => ipcRenderer.invoke("attachments:open", storedPath),
  },
  profile: {
    get: () => ipcRenderer.invoke("profile:get"),
    update: (input) => ipcRenderer.invoke("profile:update", input),
    selectAvatar: () => ipcRenderer.invoke("profile:select-avatar"),
  },
});
