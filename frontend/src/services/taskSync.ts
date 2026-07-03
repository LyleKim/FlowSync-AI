import { Task } from '../types';

const TASKS_ETAG_KEY = 'tasks-etag';
const TASKS_LAST_MODIFIED_KEY = 'tasks-last-modified';
export const TASKS_POLL_INTERVAL_MS = 3 * 60 * 1000;

function getConditionalHeaders(): HeadersInit {
  const headers: Record<string, string> = {};
  const etag = localStorage.getItem(TASKS_ETAG_KEY);
  const lastModified = localStorage.getItem(TASKS_LAST_MODIFIED_KEY);

  if (etag) headers['If-None-Match'] = etag;
  if (lastModified) headers['If-Modified-Since'] = lastModified;

  return headers;
}

function storeConditionalHeaders(response: Response) {
  const etag = response.headers.get('ETag');
  const lastModified = response.headers.get('Last-Modified');

  if (etag) localStorage.setItem(TASKS_ETAG_KEY, etag);
  if (lastModified) localStorage.setItem(TASKS_LAST_MODIFIED_KEY, lastModified);
}

export function invalidateTasksCacheHeaders() {
  localStorage.removeItem(TASKS_ETAG_KEY);
  localStorage.removeItem(TASKS_LAST_MODIFIED_KEY);
}

export type TaskSyncResult =
  | { status: 'updated'; tasks: Task[] }
  | { status: 'not-modified' }
  | { status: 'error' };

export async function fetchTasksFromServer(): Promise<TaskSyncResult> {
  try {
    const response = await fetch('/api/v1/tasks/', {
      headers: getConditionalHeaders(),
    });

    if (response.status === 304) {
      return { status: 'not-modified' };
    }

    if (!response.ok) {
      return { status: 'error' };
    }

    storeConditionalHeaders(response);

    const data = await response.json();
    const tasks = Array.isArray(data) ? (data as Task[]) : [];
    localStorage.setItem('tasks', JSON.stringify(tasks));

    return { status: 'updated', tasks };
  } catch {
    return { status: 'error' };
  }
}
