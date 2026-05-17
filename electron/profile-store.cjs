const fs = require("node:fs/promises");
const path = require("node:path");

const defaultProfile = {
  username: "日程清单",
  signature: "本地桌面版",
  avatar: null,
  updatedAt: null,
};

function avatarMimeType(extension) {
  const normalized = extension.toLowerCase();
  if (normalized === ".jpg" || normalized === ".jpeg") return "image/jpeg";
  if (normalized === ".webp") return "image/webp";
  if (normalized === ".gif") return "image/gif";
  return "image/png";
}

function sanitizeText(value, fallback) {
  if (typeof value !== "string") return fallback;
  const trimmed = value.trim();
  return trimmed || fallback;
}

function createProfileStore(userDataPath) {
  const dataDir = path.join(userDataPath, "data");
  const profilePath = path.join(dataDir, "profile.json");
  const avatarDir = path.join(userDataPath, "profile");

  async function ensureDirs() {
    await fs.mkdir(dataDir, { recursive: true });
    await fs.mkdir(avatarDir, { recursive: true });
  }

  async function readProfile() {
    await ensureDirs();
    try {
      const raw = await fs.readFile(profilePath, "utf8");
      return { ...defaultProfile, ...JSON.parse(raw) };
    } catch (error) {
      if (error && error.code === "ENOENT") {
        await writeProfile(defaultProfile);
        return defaultProfile;
      }
      throw error;
    }
  }

  async function writeProfile(profile) {
    await ensureDirs();
    await fs.writeFile(profilePath, `${JSON.stringify(profile, null, 2)}\n`, "utf8");
    return profile;
  }

  async function updateProfile(input = {}) {
    const currentProfile = await readProfile();
    const nextProfile = {
      ...currentProfile,
      username: sanitizeText(input.username, currentProfile.username || defaultProfile.username),
      signature: sanitizeText(input.signature, currentProfile.signature || defaultProfile.signature),
      avatar: input.avatar === undefined ? currentProfile.avatar : input.avatar,
      updatedAt: new Date().toISOString(),
    };
    return writeProfile(nextProfile);
  }

  async function saveAvatar(sourcePath) {
    await ensureDirs();
    const extension = path.extname(sourcePath) || ".png";
    const originalName = path.basename(sourcePath);
    const storedName = `avatar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${extension}`;
    const storedPath = path.join(avatarDir, storedName);
    await fs.copyFile(sourcePath, storedPath);
    const file = await fs.readFile(storedPath);
    const stats = await fs.stat(storedPath);
    return {
      id: `avatar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      originalName,
      storedName,
      storedPath,
      size: stats.size,
      dataUrl: `data:${avatarMimeType(extension)};base64,${file.toString("base64")}`,
      createdAt: new Date().toISOString(),
    };
  }

  return {
    readProfile,
    updateProfile,
    saveAvatar,
  };
}

module.exports = { createProfileStore };
