/// <reference types="vite/client" />

type Priority = "P1" | "P2" | "P3" | "P4";

type StoredTask = {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  priority: Priority;
  reminderAt: string | null;
  labels: string[];
  attachments: StoredAttachment[];
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type StoredAttachment = {
  id: string;
  originalName: string;
  storedName: string;
  storedPath: string;
  size: number;
  createdAt: string;
};

type StoredAvatar = {
  id: string;
  originalName: string;
  storedName: string;
  storedPath: string;
  size: number;
  dataUrl: string;
  createdAt: string;
};

type StoredProfile = {
  username: string;
  signature: string;
  avatar: StoredAvatar | null;
  updatedAt: string | null;
};

interface Window {
  desktopApp?: {
    platform: string;
    tasks: {
      list: () => Promise<StoredTask[]>;
      create: (input: Partial<Omit<StoredTask, "id" | "createdAt" | "updatedAt">>) => Promise<StoredTask>;
      update: (id: string, updates: Partial<StoredTask>) => Promise<StoredTask>;
      setCompleted: (id: string, completed: boolean) => Promise<StoredTask>;
      delete: (id: string) => Promise<{ id: string }>;
    };
    attachments: {
      selectAndSave: () => Promise<StoredAttachment[]>;
      open: (storedPath: string) => Promise<boolean>;
    };
    profile: {
      get: () => Promise<StoredProfile>;
      update: (input: Partial<StoredProfile>) => Promise<StoredProfile>;
      selectAvatar: () => Promise<StoredAvatar | null>;
    };
  };
}
