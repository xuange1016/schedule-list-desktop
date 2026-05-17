import {
  Archive,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Paperclip,
  Filter,
  Image as ImageIcon,
  Inbox,
  ListPlus,
  Plus,
  Save,
  Settings,
  Tag,
} from "lucide-react";
import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

type PageKey = "inbox" | "today" | "upcoming" | "filters" | "log" | "settings";
type Priority = "P1" | "P2" | "P3" | "P4";

type Task = {
  id: string;
  title: string;
  description: string;
  dueDate: string | null;
  priority: Priority;
  reminderAt: string | null;
  labels: string[];
  attachments: Attachment[];
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type TaskCreateInput = Partial<Omit<Task, "id" | "createdAt" | "updatedAt">>;
type TaskFormInput = Omit<TaskCreateInput, "completed" | "completedAt">;
type Attachment = {
  id: string;
  originalName: string;
  storedName: string;
  storedPath: string;
  size: number;
  createdAt: string;
};
type Avatar = {
  id: string;
  originalName: string;
  storedName: string;
  storedPath: string;
  size: number;
  dataUrl: string;
  createdAt: string;
};
type Profile = {
  username: string;
  signature: string;
  avatar: Avatar | null;
  updatedAt: string | null;
};
type TaskDialogState = {
  mode: "create" | "edit";
  defaults?: TaskFormInput;
  task?: Task;
};

type NavItem = {
  key: PageKey;
  label: string;
  count?: number;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
};

type HeaderAction = {
  label: string;
  onClick: () => void;
};

const priorityOptions: Priority[] = ["P1", "P2", "P3", "P4"];
const defaultLabels = ["学习", "生活", "工作"];
const browserStorageKey = "todoist-like-desktop-app.tasks";
const browserProfileStorageKey = "todoist-like-desktop-app.profile";
const defaultProfile: Profile = {
  username: "日程清单",
  signature: "本地桌面版",
  avatar: null,
  updatedAt: null,
};

function createBrowserTask(input: TaskCreateInput = {}): Task {
  const now = new Date().toISOString();
  return {
    id: `browser-task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: input.title ?? "浏览器预览任务",
    description: input.description ?? "",
    dueDate: input.dueDate ?? null,
    priority: input.priority ?? "P4",
    reminderAt: input.reminderAt ?? null,
    labels: input.labels ?? [],
    attachments: input.attachments ?? [],
    completed: Boolean(input.completed),
    completedAt: input.completedAt ?? null,
    createdAt: now,
    updatedAt: now,
  };
}

function browserTasksApi() {
  const read = () => {
    const raw = window.localStorage.getItem(browserStorageKey);
    return raw ? (JSON.parse(raw) as Task[]) : [];
  };
  const write = (tasks: Task[]) => window.localStorage.setItem(browserStorageKey, JSON.stringify(tasks));
  return {
    list: async () => read(),
    create: async (input: TaskCreateInput) => {
      const task = createBrowserTask(input);
      write([task, ...read()]);
      return task;
    },
    update: async (id: string, updates: Partial<Task>) => {
      const tasks = read();
      const updatedTask = { ...tasks.find((task) => task.id === id), ...updates, id, updatedAt: new Date().toISOString() } as Task;
      write(tasks.map((task) => (task.id === id ? updatedTask : task)));
      return updatedTask;
    },
    delete: async (id: string) => {
      write(read().filter((task) => task.id !== id));
      return { id };
    },
    setCompleted: async (id: string, completed: boolean) => {
      const tasks = read();
      const updatedTask = tasks.find((task) => task.id === id);
      if (!updatedTask) throw new Error("任务不存在");
      const nextTask = {
        ...updatedTask,
        completed,
        completedAt: completed ? new Date().toISOString() : null,
        updatedAt: new Date().toISOString(),
      };
      write(tasks.map((task) => (task.id === id ? nextTask : task)));
      return nextTask;
    },
  };
}

function getTasksApi() {
  return window.desktopApp?.tasks ?? browserTasksApi();
}

function browserAttachmentsApi() {
  return {
    selectAndSave: async (): Promise<Attachment[]> => [],
    open: async (): Promise<boolean> => false,
  };
}

function getAttachmentsApi() {
  return window.desktopApp?.attachments ?? browserAttachmentsApi();
}

function browserProfileApi() {
  const read = () => {
    const raw = window.localStorage.getItem(browserProfileStorageKey);
    return raw ? ({ ...defaultProfile, ...JSON.parse(raw) } as Profile) : defaultProfile;
  };
  const write = (profile: Profile) => window.localStorage.setItem(browserProfileStorageKey, JSON.stringify(profile));
  return {
    get: async () => read(),
    update: async (input: Partial<Profile>) => {
      const nextProfile = {
        ...read(),
        ...input,
        username: input.username?.trim() || read().username || defaultProfile.username,
        signature: input.signature?.trim() || read().signature || defaultProfile.signature,
        updatedAt: new Date().toISOString(),
      };
      write(nextProfile);
      return nextProfile;
    },
    selectAvatar: async (): Promise<Avatar | null> => null,
  };
}

function getProfileApi() {
  return window.desktopApp?.profile ?? browserProfileApi();
}

function localIsoDate(offsetDays = 0) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateLabel(date: string | null) {
  if (!date) return "无日期";
  if (date === localIsoDate(0)) return "今天";
  if (date === localIsoDate(1)) return "明天";
  if (date < localIsoDate(0)) return `逾期 ${formatShortDate(date)}`;
  return formatShortDate(date);
}

function formatShortDate(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  return `${parsed.getMonth() + 1}月${parsed.getDate()}日`;
}

function formatFullDateLabel(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  const weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${parsed.getMonth() + 1}月${parsed.getDate()}日 ${weekDays[parsed.getDay()]}`;
}

function formatTodaySubtitle() {
  const today = new Date();
  const weekDays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日 ${weekDays[today.getDay()]}`;
}

function formatTime(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return `${`${date.getHours()}`.padStart(2, "0")}:${`${date.getMinutes()}`.padStart(2, "0")}`;
}

function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "大小未知";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function newestFirst(a: Task, b: Task) {
  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

function dueDateAscending(a: Task, b: Task) {
  if (!a.dueDate && !b.dueDate) return newestFirst(a, b);
  if (!a.dueDate) return 1;
  if (!b.dueDate) return -1;
  const dateDiff = a.dueDate.localeCompare(b.dueDate);
  return dateDiff === 0 ? newestFirst(a, b) : dateDiff;
}

function dateStatusClass(date: string | null) {
  if (!date) return "date-none";
  if (date < localIsoDate(0)) return "date-overdue";
  if (date === localIsoDate(0)) return "date-today";
  return "date-future";
}

function groupInboxTasks(tasks: Task[]) {
  return [
    {
      key: "today",
      title: "今天",
      helper: "需要今天完成的任务",
      tasks: tasks.filter((task) => task.dueDate === localIsoDate()).sort(newestFirst),
    },
    {
      key: "future",
      title: "未来安排",
      helper: "从明天开始的未完成任务",
      tasks: tasks.filter((task) => task.dueDate && task.dueDate > localIsoDate()).sort(dueDateAscending),
    },
    {
      key: "no-date",
      title: "无日期",
      helper: "暂时还没安排到具体日期",
      tasks: tasks.filter((task) => !task.dueDate).sort(newestFirst),
    },
    {
      key: "overdue",
      title: "逾期",
      helper: "日期已经过去但尚未完成",
      tasks: tasks.filter((task) => task.dueDate && task.dueDate < localIsoDate()).sort(dueDateAscending),
    },
  ];
}

function AppHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: HeaderAction }) {
  return (
    <header className="content-header">
      <div>
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {action ? (
        <button className="primary-action" onClick={action.onClick} type="button">
          <Plus size={16} />
          {action.label}
        </button>
      ) : null}
    </header>
  );
}

function TaskRow({
  task,
  onComplete,
  onOpen,
}: {
  task: Task;
  onComplete: (id: string) => void;
  onOpen: (task: Task) => void;
}) {
  const primaryLabel = task.labels[0] ?? "未分类";

  return (
    <div className="task-row" role="button" tabIndex={0} aria-label={`打开任务：${task.title}`} onClick={() => onOpen(task)}>
      <button
        className="check-button"
        onClick={(event) => {
          event.stopPropagation();
          onComplete(task.id);
        }}
        type="button"
        aria-label={`完成任务：${task.title}`}
      >
        <span className="check-dot" aria-hidden="true" />
      </button>
      <span className="task-copy">
        <span className="task-title">{task.title}</span>
        {task.description ? <span className="task-description">{task.description}</span> : null}
      </span>
      <span className="task-meta">
        <span className={`date-chip ${dateStatusClass(task.dueDate)}`}>{formatDateLabel(task.dueDate)}</span>
        <span className="tag-pill">
          <Tag size={13} />
          {primaryLabel}
        </span>
        <span className={`priority-pill priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
        {task.attachments.length > 0 ? <span className="tiny-meta">附件 {task.attachments.length}</span> : null}
        {task.reminderAt ? <span className="tiny-meta">提醒</span> : null}
      </span>
      <ChevronRight className="row-arrow" size={16} />
    </div>
  );
}

function EmptyState({ title, action }: { title: string; action?: string }) {
  return (
    <div className="empty-state">
      <ClipboardList size={26} />
      <strong>{title}</strong>
      {action ? <span>{action}</span> : null}
    </div>
  );
}

function TaskList({
  tasks,
  label,
  onComplete,
  onOpen,
  emptyTitle = "暂无任务",
  emptyAction = "点击添加任务来创建第一条任务",
}: {
  tasks: Task[];
  label: string;
  onComplete: (id: string) => void;
  onOpen: (task: Task) => void;
  emptyTitle?: string;
  emptyAction?: string;
}) {
  if (tasks.length === 0) {
    return <EmptyState title={emptyTitle} action={emptyAction} />;
  }

  return (
    <section className="task-list" aria-label={label}>
      {tasks.map((task) => (
        <TaskRow key={task.id} task={task} onComplete={onComplete} onOpen={onOpen} />
      ))}
    </section>
  );
}

function tagsToText(labels: string[]) {
  return labels.join("，");
}

function textToTags(value: string) {
  return Array.from(
    new Set(
      value
        .split(/[,，\s]+/)
        .map((label) => label.trim())
        .filter(Boolean),
    ),
  );
}

function TaskDialog({
  state,
  onClose,
  onSave,
  onDelete,
}: {
  state: TaskDialogState;
  onClose: () => void;
  onSave: (input: TaskFormInput, task?: Task) => void;
  onDelete: (task: Task) => void;
}) {
  const task = state.task;
  const defaults = state.defaults ?? {};
  const [title, setTitle] = useState(task?.title ?? defaults.title ?? "");
  const [description, setDescription] = useState(task?.description ?? defaults.description ?? "");
  const [dueDate, setDueDate] = useState(task?.dueDate ?? defaults.dueDate ?? "");
  const [priority, setPriority] = useState<Priority>(task?.priority ?? defaults.priority ?? "P4");
  const [labelsText, setLabelsText] = useState(tagsToText(task?.labels ?? defaults.labels ?? []));
  const [reminderAt, setReminderAt] = useState(task?.reminderAt ?? defaults.reminderAt ?? "");
  const [attachments, setAttachments] = useState<Attachment[]>(task?.attachments ?? defaults.attachments ?? []);
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const handleSave = () => {
    if (!title.trim()) {
      setError("请输入任务标题");
      return;
    }
    onSave(
      {
        title: title.trim(),
        description,
        dueDate: dueDate || null,
        priority,
        labels: textToTags(labelsText),
        reminderAt: reminderAt || null,
        attachments,
      },
      task,
    );
  };

  const handleUpload = async () => {
    setIsUploading(true);
    try {
      const savedAttachments = await getAttachmentsApi().selectAndSave();
      if (savedAttachments.length > 0) {
        setAttachments((currentAttachments) => [...currentAttachments, ...savedAttachments]);
      }
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "附件上传失败");
    } finally {
      setIsUploading(false);
    }
  };

  const handleOpenAttachment = async (attachment: Attachment) => {
    try {
      await getAttachmentsApi().open(attachment.storedPath);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : "附件打开失败");
    }
  };

  return (
    <div className="modal-backdrop" role="presentation">
      <section className="task-dialog" role="dialog" aria-modal="true" aria-label={state.mode === "create" ? "新建任务" : "编辑任务"}>
        <header className="dialog-header">
          <h2>{state.mode === "create" ? "新建任务" : "编辑任务"}</h2>
          <button className="icon-button" onClick={onClose} type="button" aria-label="关闭弹窗">
            ×
          </button>
        </header>

        <div className="dialog-body">
          <label className="field-group">
            <span>标题</span>
            <input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="请输入任务标题" />
          </label>

          <label className="field-group">
            <span>详细描述</span>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="补充任务背景、目标或备注" rows={4} />
          </label>

          <div className="field-grid">
            <label className="field-group">
              <span>日期</span>
              <input value={dueDate} onChange={(event) => setDueDate(event.target.value)} type="date" />
            </label>

            <label className="field-group">
              <span>优先级</span>
              <select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>
                {priorityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="field-group">
            <span>标签</span>
            <input value={labelsText} onChange={(event) => setLabelsText(event.target.value)} placeholder="学习，生活，工作，或自定义标签" />
          </label>

          <div className="label-suggestions">
            {defaultLabels.map((label) => (
              <button
                key={label}
                onClick={() => setLabelsText(tagsToText(Array.from(new Set([...textToTags(labelsText), label]))))}
                type="button"
              >
                <Tag size={13} />
                {label}
              </button>
            ))}
          </div>

          <label className="field-group">
            <span>提醒</span>
            <input value={reminderAt} onChange={(event) => setReminderAt(event.target.value)} type="datetime-local" />
          </label>

          <div className="attachment-box">
            <div className="attachment-box-header">
              <span>
                <Paperclip size={17} />
                附件
              </span>
              <button className="secondary-action" disabled={isUploading} onClick={() => void handleUpload()} type="button">
                {isUploading ? "上传中" : "上传文件"}
              </button>
            </div>
            {attachments.length === 0 ? (
              <p>暂无附件。上传后会复制到应用本地附件目录。</p>
            ) : (
              <div className="attachment-list">
                {attachments.map((attachment) => (
                  <button
                    className="attachment-item"
                    key={attachment.id}
                    onClick={() => void handleOpenAttachment(attachment)}
                    type="button"
                  >
                    <Paperclip size={15} />
                    <span>{attachment.originalName}</span>
                    <em>{formatFileSize(attachment.size)}</em>
                  </button>
                ))}
              </div>
            )}
          </div>

          {error ? <div className="dialog-error">{error}</div> : null}
        </div>

        <footer className="dialog-footer">
          {task ? (
            <button className="danger-action" onClick={() => onDelete(task)} type="button">
              删除任务
            </button>
          ) : (
            <span />
          )}
          <div>
            <button className="secondary-action" onClick={onClose} type="button">
              取消
            </button>
            <button className="primary-action" onClick={handleSave} type="button">
              保存
            </button>
          </div>
        </footer>
      </section>
    </div>
  );
}

function ConfirmDialog({
  title,
  message,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="modal-backdrop confirm-layer" role="presentation">
      <section className="confirm-dialog" role="dialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        <p>{message}</p>
        <footer>
          <button className="secondary-action" onClick={onCancel} type="button">
            取消
          </button>
          <button className="danger-action" onClick={onConfirm} type="button">
            {confirmLabel}
          </button>
        </footer>
      </section>
    </div>
  );
}

function InboxPage({
  tasks,
  onCreateTask,
  onComplete,
  onOpenTask,
}: {
  tasks: Task[];
  onCreateTask: (input?: TaskFormInput) => void;
  onComplete: (id: string) => void;
  onOpenTask: (task: Task) => void;
}) {
  const sections = groupInboxTasks(tasks).filter((section) => section.tasks.length > 0);

  return (
    <>
      <AppHeader
        title="收件箱"
        subtitle="所有未完成任务的总入口"
        action={{ label: "添加任务", onClick: () => onCreateTask() }}
      />
      {sections.length === 0 ? (
        <EmptyState title="收件箱暂无任务" action="点击添加任务来创建第一条任务" />
      ) : (
        <div className="inbox-sections">
          {sections.map((section) => (
            <section className="inbox-section" key={section.key}>
              <div className="section-heading">
                <div>
                  <h2>{section.title}</h2>
                  <span>{section.helper}</span>
                </div>
                <em>{section.tasks.length}</em>
              </div>
              <TaskList
                tasks={section.tasks}
                label={`收件箱${section.title}任务`}
                onComplete={onComplete}
                onOpen={onOpenTask}
              />
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function TodayPage({
  tasks,
  onCreateTask,
  onComplete,
  onOpenTask,
}: {
  tasks: Task[];
  onCreateTask: (input?: TaskFormInput) => void;
  onComplete: (id: string) => void;
  onOpenTask: (task: Task) => void;
}) {
  return (
    <>
      <AppHeader
        title="今天"
        subtitle={formatTodaySubtitle()}
        action={{ label: "添加任务", onClick: () => onCreateTask({ dueDate: localIsoDate() }) }}
      />
      <TaskList
        tasks={[...tasks].sort(newestFirst)}
        label="今天任务列表"
        onComplete={onComplete}
        onOpen={onOpenTask}
        emptyTitle="今天没有安排"
        emptyAction="在今天页面新增的任务会默认设置为今天"
      />
    </>
  );
}

function UpcomingPage({
  tasks,
  onCreateTask,
  onComplete,
  onOpenTask,
}: {
  tasks: Task[];
  onCreateTask: (input?: TaskFormInput) => void;
  onComplete: (id: string) => void;
  onOpenTask: (task: Task) => void;
}) {
  const upcomingDays = useMemo(
    () =>
      Array.from({ length: 30 }, (_, index) => {
        const date = localIsoDate(index);
        return {
          date,
          title: formatFullDateLabel(date),
          badge: index === 0 ? "今天" : index === 1 ? "明天" : "",
          tasks: tasks.filter((task) => task.dueDate === date).sort(newestFirst),
        };
      }),
    [tasks],
  );

  return (
    <>
      <AppHeader title="预览" subtitle="未来 30 天每天都显示，没任务也保留添加入口" />
      <div className="upcoming-list">
        {upcomingDays.map((day) => (
          <section className="day-group" key={day.date}>
            <div className="day-heading">
              <div>
                <h2>{day.title}</h2>
                {day.badge ? <span>{day.badge}</span> : null}
              </div>
              <button className="ghost-action" onClick={() => onCreateTask({ dueDate: day.date })} type="button">
                <Plus size={15} />
                添加任务
              </button>
            </div>
            {day.tasks.length > 0 ? (
              <div className="task-list compact">
                {day.tasks.map((task) => (
                  <TaskRow key={`${day.date}-${task.id}`} task={task} onComplete={onComplete} onOpen={onOpenTask} />
                ))}
              </div>
            ) : (
              <EmptyState title="暂无任务" action="这一日仍可直接添加安排" />
            )}
          </section>
        ))}
      </div>
    </>
  );
}

function FiltersPage({
  tasks,
  onComplete,
  onOpenTask,
}: {
  tasks: Task[];
  onComplete: (id: string) => void;
  onOpenTask: (task: Task) => void;
}) {
  const [priorityFilter, setPriorityFilter] = useState<Priority | "全部">("全部");
  const [labelFilter, setLabelFilter] = useState("全部");

  const labels = useMemo(() => {
    const customLabels = tasks.flatMap((task) => task.labels).filter((label) => !defaultLabels.includes(label));
    return ["全部", ...defaultLabels, ...Array.from(new Set(customLabels))];
  }, [tasks]);

  const filteredTasks = tasks.filter((task) => {
    const priorityMatched = priorityFilter === "全部" || task.priority === priorityFilter;
    const labelMatched = labelFilter === "全部" || task.labels.includes(labelFilter);
    return priorityMatched && labelMatched;
  });
  const hasActiveFilter = priorityFilter !== "全部" || labelFilter !== "全部";
  const filterSummary = hasActiveFilter
    ? `当前筛选：${priorityFilter === "全部" ? "全部优先级" : priorityFilter} · ${labelFilter === "全部" ? "全部标签" : labelFilter}`
    : "当前显示全部未完成任务";
  const customLabelCount = Math.max(labels.length - 1 - defaultLabels.length, 0);

  return (
    <>
      <AppHeader title="过滤" subtitle="按优先级或标签查看未完成任务" />
      <section className="filter-panel" aria-label="筛选条件">
        <header className="filter-summary">
          <div>
            <strong>{filteredTasks.length}</strong>
            <span>个匹配任务</span>
          </div>
          <p>{filterSummary}</p>
          <button
            className="secondary-action"
            disabled={!hasActiveFilter}
            onClick={() => {
              setPriorityFilter("全部");
              setLabelFilter("全部");
            }}
            type="button"
          >
            清除筛选
          </button>
        </header>

        <div className="filter-row">
          <span className="filter-label">优先级</span>
          <div className="filter-options">
            {["全部", ...priorityOptions].map((item) => (
              <button
                className={item === priorityFilter ? "filter-chip active" : "filter-chip"}
                key={item}
                onClick={() => setPriorityFilter(item as Priority | "全部")}
                type="button"
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="filter-row">
          <span className="filter-label">标签</span>
          <div className="filter-options">
            {labels.map((item) => (
              <button
                className={item === labelFilter ? "filter-chip active" : "filter-chip"}
                key={item}
                onClick={() => setLabelFilter(item)}
                type="button"
              >
                {item}
              </button>
            ))}
            <span className="filter-note">
              <ListPlus size={14} />
              {customLabelCount > 0 ? `${customLabelCount} 个自定义标签` : "自定义标签会从任务中自动出现"}
            </span>
          </div>
        </div>
      </section>
      <TaskList
        tasks={filteredTasks}
        label="过滤结果"
        onComplete={onComplete}
        onOpen={onOpenTask}
        emptyTitle="没有匹配的任务"
        emptyAction={hasActiveFilter ? "可以清除筛选，或调整任务的标签和优先级" : "当前没有未完成任务"}
      />
    </>
  );
}

function LogPage({ tasks, onRestore }: { tasks: Task[]; onRestore: (id: string) => void }) {
  const groupedTasks = useMemo(() => {
    const groups = new Map<string, Task[]>();
    tasks.forEach((task) => {
      const key = task.completedAt ? task.completedAt.slice(0, 10) : "未知日期";
      groups.set(key, [...(groups.get(key) ?? []), task]);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => b.localeCompare(a));
  }, [tasks]);

  return (
    <>
      <AppHeader title="日志" subtitle="按完成日期归档，已完成任务可恢复" />
      {groupedTasks.length === 0 ? (
        <EmptyState title="暂无已完成任务" action="勾选完成任务后会显示在这里" />
      ) : (
        <section className="log-group">
          {groupedTasks.map(([date, groupTasks]) => (
            <div className="log-day" key={date}>
              <div className="section-heading log-heading">
                <div>
                  <h2>{date === "未知日期" ? date : formatFullDateLabel(date)}</h2>
                  <span>{groupTasks.length} 个已完成任务</span>
                </div>
                <em>{groupTasks.length}</em>
              </div>
              {groupTasks.map((task) => (
                <div className="log-row" key={task.id}>
                  <CheckCircle2 size={18} />
                  <span className="log-copy">
                    <span className="log-title">{task.title}</span>
                    {task.description ? <span className="log-description">{task.description}</span> : null}
                  </span>
                  <span className="log-meta-group">
                    <span className="tiny-meta">完成 {formatTime(task.completedAt)}</span>
                    <span className={`date-chip ${dateStatusClass(task.dueDate)}`}>原日期 {formatDateLabel(task.dueDate)}</span>
                    <span className={`priority-pill priority-${task.priority.toLowerCase()}`}>{task.priority}</span>
                    {task.labels.length > 0
                      ? task.labels.map((label) => (
                          <span className="tag-pill" key={`${task.id}-${label}`}>
                            {label}
                          </span>
                        ))
                      : <span className="tag-pill">未分类</span>}
                  </span>
                  <button className="restore-button" onClick={() => onRestore(task.id)} type="button">
                    恢复
                  </button>
                </div>
              ))}
            </div>
          ))}
        </section>
      )}
    </>
  );
}

function SettingsPage({
  profile,
  onSaveProfile,
  onSelectAvatar,
}: {
  profile: Profile;
  onSaveProfile: (input: Partial<Profile>) => Promise<void>;
  onSelectAvatar: () => Promise<Avatar | null>;
}) {
  const [username, setUsername] = useState(profile.username);
  const [signature, setSignature] = useState(profile.signature);
  const [avatar, setAvatar] = useState<Avatar | null>(profile.avatar);
  const [status, setStatus] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSelectingAvatar, setIsSelectingAvatar] = useState(false);

  useEffect(() => {
    setUsername(profile.username);
    setSignature(profile.signature);
    setAvatar(profile.avatar);
  }, [profile]);

  const handleSelectAvatar = async () => {
    setIsSelectingAvatar(true);
    setStatus(null);
    try {
      const selectedAvatar = await onSelectAvatar();
      if (selectedAvatar) {
        setAvatar(selectedAvatar);
        setStatus("头像已选择，保存后会显示在左上角");
      } else {
        setStatus("未选择头像");
      }
    } catch (profileError) {
      setStatus(profileError instanceof Error ? profileError.message : "头像选择失败");
    } finally {
      setIsSelectingAvatar(false);
    }
  };

  const handleSave = async () => {
    if (!username.trim()) {
      setStatus("用户名不能为空");
      return;
    }
    setIsSaving(true);
    setStatus(null);
    try {
      await onSaveProfile({
        username: username.trim(),
        signature: signature.trim() || "保持专注，稳步推进",
        avatar,
      });
      setStatus("个人资料已保存");
    } catch (profileError) {
      setStatus(profileError instanceof Error ? profileError.message : "个人资料保存失败");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <AppHeader title="设置" subtitle="自定义左上角显示的用户名、个性签名和头像" />
      <section className="settings-panel" aria-label="个人资料设置">
        <div className="profile-preview">
          <div className="profile-avatar-large">
            {avatar?.dataUrl ? <img src={avatar.dataUrl} alt="用户头像预览" /> : <CheckCircle2 size={34} />}
          </div>
          <div>
            <strong>{username.trim() || "日程清单"}</strong>
            <span>{signature.trim() || "保持专注，稳步推进"}</span>
          </div>
        </div>

        <div className="settings-form">
          <label className="field-group">
            <span>用户名</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} maxLength={18} placeholder="例如：阿树的日程" />
          </label>

          <label className="field-group">
            <span>个性签名</span>
            <input value={signature} onChange={(event) => setSignature(event.target.value)} maxLength={32} placeholder="例如：今天也要稳稳推进" />
          </label>

          <div className="settings-actions">
            <button className="secondary-action" onClick={() => void handleSelectAvatar()} type="button" disabled={isSelectingAvatar}>
              <ImageIcon size={16} />
              {isSelectingAvatar ? "选择中" : "选择头像"}
            </button>
            <button className="primary-action" onClick={() => void handleSave()} type="button" disabled={isSaving}>
              <Save size={16} />
              {isSaving ? "保存中" : "保存资料"}
            </button>
          </div>

          {status ? <p className="settings-status">{status}</p> : null}
        </div>
      </section>
    </>
  );
}

function PageContent({
  page,
  activeTasks,
  completedTasks,
  profile,
  onCreateTask,
  onComplete,
  onRestore,
  onOpenTask,
  onSaveProfile,
  onSelectAvatar,
}: {
  page: PageKey;
  activeTasks: Task[];
  completedTasks: Task[];
  profile: Profile;
  onCreateTask: (input?: TaskFormInput) => void;
  onComplete: (id: string) => void;
  onRestore: (id: string) => void;
  onOpenTask: (task: Task) => void;
  onSaveProfile: (input: Partial<Profile>) => Promise<void>;
  onSelectAvatar: () => Promise<Avatar | null>;
}) {
  const todayTasks = activeTasks.filter((task) => task.dueDate === localIsoDate());

  if (page === "settings") {
    return <SettingsPage profile={profile} onSaveProfile={onSaveProfile} onSelectAvatar={onSelectAvatar} />;
  }
  if (page === "today") {
    return <TodayPage tasks={todayTasks} onCreateTask={onCreateTask} onComplete={onComplete} onOpenTask={onOpenTask} />;
  }
  if (page === "upcoming") {
    return <UpcomingPage tasks={activeTasks} onCreateTask={onCreateTask} onComplete={onComplete} onOpenTask={onOpenTask} />;
  }
  if (page === "filters") {
    return <FiltersPage tasks={activeTasks} onComplete={onComplete} onOpenTask={onOpenTask} />;
  }
  if (page === "log") {
    return <LogPage tasks={completedTasks} onRestore={onRestore} />;
  }
  return <InboxPage tasks={activeTasks} onCreateTask={onCreateTask} onComplete={onComplete} onOpenTask={onOpenTask} />;
}

export function App() {
  const [activePage, setActivePage] = useState<PageKey>("inbox");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [profile, setProfile] = useState<Profile>(defaultProfile);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [dialogState, setDialogState] = useState<TaskDialogState | null>(null);
  const [deleteCandidate, setDeleteCandidate] = useState<Task | null>(null);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);

  const loadTasks = useCallback(async () => {
    try {
      setError(null);
      const storedTasks = await getTasksApi().list();
      setTasks(storedTasks);
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : "任务读取失败");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    async function loadProfile() {
      try {
        const storedProfile = await getProfileApi().get();
        setProfile({ ...defaultProfile, ...storedProfile });
      } catch (profileError) {
        setError(profileError instanceof Error ? profileError.message : "个人资料读取失败");
      }
    }

    void loadProfile();
  }, []);

  const activeTasks = useMemo(() => tasks.filter((task) => !task.completed).sort(newestFirst), [tasks]);
  const completedTasks = useMemo(() => tasks.filter((task) => task.completed).sort(newestFirst), [tasks]);
  const todayCount = useMemo(() => activeTasks.filter((task) => task.dueDate === localIsoDate()).length, [activeTasks]);

  const navItems: NavItem[] = useMemo(
    () => [
      { key: "inbox", label: "收件箱", count: activeTasks.length, icon: Inbox },
      { key: "today", label: "今天", count: todayCount, icon: CalendarCheck },
      { key: "upcoming", label: "预览", icon: CalendarDays },
      { key: "filters", label: "过滤", icon: Filter },
      { key: "log", label: "日志", count: completedTasks.length, icon: Archive },
    ],
    [activeTasks.length, completedTasks.length, todayCount],
  );

  const currentPageLabel = useMemo(
    () => (activePage === "settings" ? "设置" : navItems.find((item) => item.key === activePage)?.label ?? "收件箱"),
    [activePage, navItems],
  );

  const openCreateDialog = useCallback((defaults: TaskFormInput = {}) => {
    setDialogState({ mode: "create", defaults });
  }, []);

  const openEditDialog = useCallback((task: Task) => {
    setDialogState({ mode: "edit", task });
  }, []);

  const saveTask = useCallback(
    async (input: TaskFormInput, task?: Task) => {
      try {
        if (task) {
          const updatedTask = await getTasksApi().update(task.id, input);
          setTasks((currentTasks) => currentTasks.map((currentTask) => (currentTask.id === task.id ? updatedTask : currentTask)));
          setNotice(`已更新任务“${updatedTask.title}”`);
        } else {
          const createdTask = await getTasksApi().create({
            ...input,
            completed: false,
            completedAt: null,
          });
          setTasks((currentTasks) => [createdTask, ...currentTasks]);
          setNotice(`已创建任务“${createdTask.title}”`);
        }
        setDialogState(null);
      } catch (taskError) {
        setError(taskError instanceof Error ? taskError.message : "任务保存失败");
      }
    },
    [],
  );

  const requestDelete = useCallback((task: Task) => {
    setDeleteCandidate(task);
    setDeleteStep(1);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteCandidate) return;
    if (deleteStep === 1) {
      setDeleteStep(2);
      return;
    }
    try {
      await getTasksApi().delete(deleteCandidate.id);
      setTasks((currentTasks) => currentTasks.filter((task) => task.id !== deleteCandidate.id));
      setNotice(`已永久删除任务“${deleteCandidate.title}”`);
      setDeleteCandidate(null);
      setDeleteStep(0);
      setDialogState(null);
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : "任务删除失败");
    }
  }, [deleteCandidate, deleteStep]);

  const cancelDelete = useCallback(() => {
    setDeleteCandidate(null);
    setDeleteStep(0);
  }, []);

  const setCompleted = useCallback(async (id: string, completed: boolean) => {
    try {
      const updatedTask = await getTasksApi().setCompleted(id, completed);
      setTasks((currentTasks) => currentTasks.map((task) => (task.id === id ? updatedTask : task)));
      setNotice(completed ? `已完成“${updatedTask.title}”，可在日志中查看` : `已恢复“${updatedTask.title}”到未完成任务`);
    } catch (taskError) {
      setError(taskError instanceof Error ? taskError.message : "任务状态更新失败");
    }
  }, []);

  const saveProfile = useCallback(async (input: Partial<Profile>) => {
    const updatedProfile = await getProfileApi().update(input);
    setProfile({ ...defaultProfile, ...updatedProfile });
    setNotice("个人资料已保存");
  }, []);

  const selectAvatar = useCallback(async () => getProfileApi().selectAvatar(), []);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 3200);
    return () => window.clearTimeout(timer);
  }, [notice]);

  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="主导航">
        <div className="brand">
          <div className="brand-avatar">
            {profile.avatar?.dataUrl ? <img src={profile.avatar.dataUrl} alt="用户头像" /> : <CheckCircle2 size={19} />}
          </div>
          <div>
            <strong>{profile.username || "日程清单"}</strong>
            <span>{profile.signature || "本地桌面版"}</span>
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === activePage;
            return (
              <button
                className={isActive ? "nav-item active" : "nav-item"}
                key={item.key}
                onClick={() => setActivePage(item.key)}
                type="button"
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={18} strokeWidth={2.1} />
                <span>{item.label}</span>
                {typeof item.count === "number" ? <em>{item.count}</em> : null}
              </button>
            );
          })}
        </nav>

        <button
          className={activePage === "settings" ? "settings-link active" : "settings-link"}
          onClick={() => setActivePage("settings")}
          type="button"
          aria-current={activePage === "settings" ? "page" : undefined}
        >
          <Settings size={17} />
          设置
        </button>
      </aside>

      <main className="main-panel" aria-label={currentPageLabel}>
        {isLoading ? <EmptyState title="正在读取本地任务" /> : null}
        {notice ? <div className="notice-banner">{notice}</div> : null}
        {error ? <div className="error-banner">{error}</div> : null}
        {!isLoading ? (
          <PageContent
            page={activePage}
            activeTasks={activeTasks}
            completedTasks={completedTasks}
            profile={profile}
            onCreateTask={openCreateDialog}
            onOpenTask={openEditDialog}
            onComplete={(id) => void setCompleted(id, true)}
            onRestore={(id) => void setCompleted(id, false)}
            onSaveProfile={saveProfile}
            onSelectAvatar={selectAvatar}
          />
        ) : null}
        {dialogState ? (
          <TaskDialog
            state={dialogState}
            onClose={() => setDialogState(null)}
            onSave={(input, task) => void saveTask(input, task)}
            onDelete={requestDelete}
          />
        ) : null}
        {deleteCandidate && deleteStep > 0 ? (
          <ConfirmDialog
            title={deleteStep === 1 ? "删除任务" : "再次确认删除"}
            message={
              deleteStep === 1
                ? `确定要删除“${deleteCandidate.title}”吗？`
                : "删除后无法撤回，请再次确认。该任务不会进入日志，也不能恢复。"
            }
            confirmLabel={deleteStep === 1 ? "继续删除" : "确认永久删除"}
            onCancel={cancelDelete}
            onConfirm={() => void confirmDelete()}
          />
        ) : null}
      </main>
    </div>
  );
}
