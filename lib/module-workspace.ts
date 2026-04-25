import { CulturalTopic, isTopic } from '@/lib/cultural-orientation';

export const MODULE_WORKSPACES_KEY = 'kys-module-workspaces';
export const PENDING_BRANCHES_KEY = 'kys-pending-module-branches';
export const EXPERIMENTAL_UNLOCK_KEY = 'kys-experimental-unlocked';

export type LocalModuleStageStatus = 'blank' | 'queued' | 'generating' | 'completed' | 'failed';

export type LocalModuleStage = {
  id: string;
  topic: CulturalTopic;
  title: string;
  seedText: string;
  status: LocalModuleStageStatus;
  text: string;
  parentStageId?: string;
  jobId?: string;
  error?: string;
  favorited?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LocalModuleWorkspace = {
  topic: CulturalTopic;
  sourceDraft: string;
  stages: LocalModuleStage[];
  activeStageId: string;
  createdAt: string;
  updatedAt: string;
};

export type PendingBranchRequest = {
  topic: CulturalTopic;
  stageId: string;
  source: 'draft' | 'stage';
  title: string;
  selectedText: string;
  contextText: string;
  createdAt: string;
};

export type ModuleWorkspaceSummary = {
  topic: CulturalTopic;
  latestStageId: string;
  latestStageTitle: string;
  latestStageStatus: LocalModuleStageStatus;
  latestJobId?: string;
  stageCount: number;
  updatedAt: string;
};

function isMeaningfulStage(stage: LocalModuleStage) {
  return stage.status !== 'blank' || stage.text.trim() || stage.jobId;
}

function isRootStage(stage: LocalModuleStage) {
  return stage.status === 'blank' && !stage.seedText.trim() && !stage.text.trim() && !stage.jobId;
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function createBlankStage(topic: CulturalTopic): LocalModuleStage {
  const timestamp = nowIso();
  return {
    id: createId('stage'),
    topic,
    title: 'Start here',
    seedText: '',
    status: 'blank',
    text: '',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function createQueuedStage(
  topic: CulturalTopic,
  title: string,
  seedText: string,
  stageId?: string,
  parentStageId?: string,
) {
  const timestamp = nowIso();
  return {
    id: stageId ?? createId('stage'),
    topic,
    title,
    seedText,
    status: 'queued',
    text: '',
    parentStageId,
    createdAt: timestamp,
    updatedAt: timestamp,
  } satisfies LocalModuleStage;
}

export function createBlankWorkspace(topic: CulturalTopic): LocalModuleWorkspace {
  const stage = createBlankStage(topic);
  return {
    topic,
    sourceDraft: '',
    stages: [stage],
    activeStageId: stage.id,
    createdAt: stage.createdAt,
    updatedAt: stage.updatedAt,
  };
}

export function upsertWorkspaceStage(workspace: LocalModuleWorkspace, stage: LocalModuleStage) {
  const index = workspace.stages.findIndex((entry) => entry.id === stage.id);
  const stages = [...workspace.stages];
  if (index === -1) {
    stages.push(stage);
  } else {
    stages[index] = stage;
  }

  return {
    ...workspace,
    stages: stages.sort((left, right) => left.createdAt.localeCompare(right.createdAt)),
    activeStageId: stage.id,
    updatedAt: stage.updatedAt,
  } satisfies LocalModuleWorkspace;
}

export function updateWorkspaceStage(
  workspace: LocalModuleWorkspace,
  stageId: string,
  patch: Partial<LocalModuleStage>,
) {
  const current = workspace.stages.find((stage) => stage.id === stageId);
  if (!current) return workspace;
  return upsertWorkspaceStage(workspace, {
    ...current,
    ...patch,
    updatedAt: patch.updatedAt ?? nowIso(),
  });
}

export function setActiveWorkspaceStage(workspace: LocalModuleWorkspace, stageId: string) {
  const exists = workspace.stages.some((stage) => stage.id === stageId);
  if (!exists) return workspace;
  return { ...workspace, activeStageId: stageId };
}

export function buildWorkspaceSummary(workspace: LocalModuleWorkspace): ModuleWorkspaceSummary | null {
  const nonBlank = workspace.stages.filter(isMeaningfulStage);
  const latest = nonBlank.at(-1);
  if (!latest) return null;
  return {
    topic: workspace.topic,
    latestStageId: latest.id,
    latestStageTitle: latest.title,
    latestStageStatus: latest.status,
    latestJobId: latest.jobId,
    stageCount: nonBlank.length,
    updatedAt: workspace.updatedAt,
  };
}

export function readStoredWorkspaces() {
  if (typeof window === 'undefined') return [] as LocalModuleWorkspace[];

  try {
    const raw = window.localStorage.getItem(MODULE_WORKSPACES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeWorkspace)
      .filter((workspace): workspace is LocalModuleWorkspace => Boolean(workspace));
  } catch {
    return [];
  }
}

export function readWorkspaceByTopic(topic: CulturalTopic) {
  return readStoredWorkspaces().find((workspace) => workspace.topic === topic) ?? createBlankWorkspace(topic);
}

export function writeStoredWorkspaces(workspaces: LocalModuleWorkspace[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(MODULE_WORKSPACES_KEY, JSON.stringify(workspaces));
}

export function saveWorkspace(nextWorkspace: LocalModuleWorkspace) {
  const workspaces = readStoredWorkspaces();
  const next = workspaces.filter((workspace) => workspace.topic !== nextWorkspace.topic);
  next.push(nextWorkspace);
  next.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  writeStoredWorkspaces(next);
}

export function removeJobFromWorkspaces(jobId: string) {
  const workspaces = readStoredWorkspaces();
  const next = workspaces.map((workspace) => ({
    ...workspace,
    stages: workspace.stages.map((stage) =>
      stage.jobId === jobId ? { ...stage, favorited: false, updatedAt: nowIso() } : stage,
    ),
  }));
  writeStoredWorkspaces(next);
}

export function trimWorkspaceToStage(workspace: LocalModuleWorkspace, stageId: string) {
  const index = workspace.stages.findIndex((stage) => stage.id === stageId);
  if (index === -1) return workspace;

  const nextStages = workspace.stages.filter((stage, stageIndex) => stageIndex <= index || stage.favorited);
  const activeStageId = nextStages.some((stage) => stage.id === stageId)
    ? stageId
    : nextStages.at(-1)?.id ?? workspace.activeStageId;

  return {
    ...workspace,
    stages: nextStages,
    activeStageId,
    updatedAt: nowIso(),
  } satisfies LocalModuleWorkspace;
}

export function compactWorkspaceForHome(workspace: LocalModuleWorkspace) {
  const rootStage = workspace.stages.find(isRootStage) ?? createBlankStage(workspace.topic);
  const favoriteStages = workspace.stages.filter((stage) => stage.favorited);
  const nextStages = [rootStage, ...favoriteStages.filter((stage) => stage.id !== rootStage.id)]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  return {
    ...workspace,
    stages: nextStages,
    activeStageId: rootStage.id,
    updatedAt: nowIso(),
  } satisfies LocalModuleWorkspace;
}

export function compactStoredWorkspacesForHome() {
  const workspaces = readStoredWorkspaces().map(compactWorkspaceForHome);
  writeStoredWorkspaces(workspaces);
  return workspaces;
}

export function getModuleStagePath(topic: CulturalTopic, stageId?: string) {
  return stageId ? `/modules/${topic}/${encodeURIComponent(stageId)}` : `/modules/${topic}`;
}

export function queuePendingBranchRequest(request: PendingBranchRequest) {
  if (typeof window === 'undefined') return;
  const requests = readPendingBranchRequests();
  requests[request.stageId] = request;
  window.localStorage.setItem(PENDING_BRANCHES_KEY, JSON.stringify(requests));
}

export function readPendingBranchRequest(stageId: string) {
  return readPendingBranchRequests()[stageId] ?? null;
}

export function consumePendingBranchRequest(stageId: string) {
  if (typeof window === 'undefined') return null;
  const requests = readPendingBranchRequests();
  const request = requests[stageId] ?? null;
  if (!request) return null;
  delete requests[stageId];
  window.localStorage.setItem(PENDING_BRANCHES_KEY, JSON.stringify(requests));
  return request;
}

function readPendingBranchRequests() {
  if (typeof window === 'undefined') return {} as Record<string, PendingBranchRequest>;

  try {
    const raw = window.localStorage.getItem(PENDING_BRANCHES_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, PendingBranchRequest> : {};
  } catch {
    return {};
  }
}

function normalizeWorkspace(value: unknown) {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const topic = typeof data.topic === 'string' && isTopic(data.topic) ? data.topic : null;
  if (!topic) return null;

  const stages = Array.isArray(data.stages)
    ? data.stages.map((stage) => normalizeStage(stage, topic)).filter(Boolean) as LocalModuleStage[]
    : [];

  const fallback = createBlankStage(topic);
  const safeStages = stages.length > 0 ? stages : [fallback];
  const activeStageId =
    typeof data.activeStageId === 'string' && safeStages.some((stage) => stage.id === data.activeStageId)
      ? data.activeStageId
      : safeStages.at(-1)?.id ?? fallback.id;

  return {
    topic,
    sourceDraft: typeof data.sourceDraft === 'string' ? data.sourceDraft : '',
    stages: safeStages,
    activeStageId,
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : safeStages[0]?.createdAt ?? fallback.createdAt,
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : safeStages.at(-1)?.updatedAt ?? fallback.updatedAt,
  } satisfies LocalModuleWorkspace;
}

function normalizeStage(value: unknown, topic: CulturalTopic): LocalModuleStage | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;
  const status =
    data.status === 'blank' ||
    data.status === 'queued' ||
    data.status === 'generating' ||
    data.status === 'completed' ||
    data.status === 'failed'
      ? data.status
      : 'blank';

  return {
    id: typeof data.id === 'string' ? data.id : createId('stage'),
    topic,
    title: typeof data.title === 'string' && data.title.trim() ? data.title : 'Untitled stage',
    seedText: typeof data.seedText === 'string' ? data.seedText : '',
    status,
    text: typeof data.text === 'string' ? data.text : '',
    parentStageId: typeof data.parentStageId === 'string' ? data.parentStageId : undefined,
    jobId: typeof data.jobId === 'string' ? data.jobId : undefined,
    error: typeof data.error === 'string' ? data.error : undefined,
    favorited: Boolean(data.favorited),
    createdAt: typeof data.createdAt === 'string' ? data.createdAt : nowIso(),
    updatedAt: typeof data.updatedAt === 'string' ? data.updatedAt : nowIso(),
  } satisfies LocalModuleStage;
}
