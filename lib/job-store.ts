import { ModuleJob, ModuleJobInput } from '@/lib/cultural-orientation';
import { isSupabaseJobsEnabled, loadJob, loadJobsByIds, loadRecentJobs, saveJob } from '@/lib/supabase-jobs';

export type JobEvent =
  | { type: 'status'; status: ModuleJob['status']; progress: number }
  | { type: 'partial'; partialText: string; progress: number }
  | { type: 'completed'; module: NonNullable<ModuleJob['module']> }
  | { type: 'failed'; error: string };

type Listener = (event: JobEvent) => void;
type Store = {
  jobs: Map<string, ModuleJob>;
  listeners: Map<string, Set<Listener>>;
};

const globalStore = globalThis as typeof globalThis & { __moduleJobStore__?: Store };
const store = globalStore.__moduleJobStore__ ?? {
  jobs: new Map<string, ModuleJob>(),
  listeners: new Map<string, Set<Listener>>(),
};
globalStore.__moduleJobStore__ = store;

export async function createJob(id: string, input: ModuleJobInput) {
  const timestamp = new Date().toISOString();
  const job: ModuleJob = {
    id,
    status: 'queued',
    progress: 0,
    partialText: '',
    input,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  hydrateJob(job);
  emit(id, { type: 'status', status: 'queued', progress: 0 });
  await persist(job);
  return job;
}

export async function getJob(id: string) {
  const cached = store.jobs.get(id);
  if (cached) return cached;
  const persisted = await loadJob(id);
  if (!persisted) return undefined;
  hydrateJob(persisted);
  return persisted;
}

export async function listJobs(limit = 12) {
  const persistedJobs = await loadRecentJobs(limit);
  if (persistedJobs.length > 0) {
    persistedJobs.forEach(hydrateJob);
    return persistedJobs;
  }

  return Array.from(store.jobs.values())
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, limit);
}

export async function listJobsByIds(ids: string[]) {
  if (ids.length === 0) return [];

  const cached = ids.map((id) => store.jobs.get(id)).filter((job): job is ModuleJob => Boolean(job));
  const missingIds = ids.filter((id) => !cached.some((job) => job.id === id));

  if (missingIds.length > 0) {
    const persistedJobs = await loadJobsByIds(missingIds);
    persistedJobs.forEach(hydrateJob);
    cached.push(...persistedJobs);
  }

  const byId = new Map(cached.map((job) => [job.id, job]));
  return ids.map((id) => byId.get(id)).filter((job): job is ModuleJob => Boolean(job));
}

export async function updateJob(id: string, patch: Partial<ModuleJob>) {
  const current = await getJob(id);
  if (!current) return undefined;

  const next: ModuleJob = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  hydrateJob(next);

  if (patch.status) emit(id, { type: 'status', status: next.status, progress: next.progress });
  if (typeof patch.partialText === 'string') emit(id, { type: 'partial', partialText: next.partialText, progress: next.progress });
  if (patch.module) emit(id, { type: 'completed', module: patch.module });
  if (patch.error) emit(id, { type: 'failed', error: patch.error });

  await persist(next);
  return next;
}

export function subscribe(id: string, listener: Listener) {
  const listeners = store.listeners.get(id) ?? new Set<Listener>();
  listeners.add(listener);
  store.listeners.set(id, listeners);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) store.listeners.delete(id);
  };
}

function hydrateJob(job: ModuleJob) {
  store.jobs.set(job.id, job);
}

async function persist(job: ModuleJob) {
  if (!isSupabaseJobsEnabled()) return;
  try {
    const persisted = await saveJob(job);
    if (persisted) hydrateJob(persisted);
  } catch (error) {
    console.error('Failed to persist generation job.', error);
  }
}

function emit(id: string, event: JobEvent) {
  const listeners = store.listeners.get(id);
  if (!listeners) return;
  for (const listener of listeners) listener(event);
}
