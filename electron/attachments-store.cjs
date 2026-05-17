const fs = require("node:fs/promises");
const path = require("node:path");

function safeExtension(filePath) {
  const ext = path.extname(filePath);
  return ext.length <= 16 ? ext : "";
}

function createAttachmentStore(userDataPath) {
  const attachmentsDir = path.join(userDataPath, "attachments");

  async function ensureAttachmentsDir() {
    await fs.mkdir(attachmentsDir, { recursive: true });
  }

  async function saveFiles(filePaths) {
    await ensureAttachmentsDir();
    const attachments = [];

    for (const sourcePath of filePaths) {
      const stats = await fs.stat(sourcePath);
      if (!stats.isFile()) continue;

      const now = new Date().toISOString();
      const originalName = path.basename(sourcePath);
      const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const storedName = `${id}${safeExtension(sourcePath)}`;
      const storedPath = path.join(attachmentsDir, storedName);

      await fs.copyFile(sourcePath, storedPath);
      attachments.push({
        id,
        originalName,
        storedName,
        storedPath,
        size: stats.size,
        createdAt: now,
      });
    }

    return attachments;
  }

  return {
    attachmentsDir,
    saveFiles,
  };
}

module.exports = {
  createAttachmentStore,
};
