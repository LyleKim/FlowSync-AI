import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Sun, Moon, Search, Plus, Bell, Sparkles, CheckSquare, History } from 'lucide-react';
import { Task, Activity, TaskStatus, SubTask, RoleReview } from './types';
import { INITIAL_ACTIVITIES } from './constants/initialData';
import {
  fetchTasksFromServer,
  invalidateTasksCacheHeaders,
  TASKS_POLL_INTERVAL_MS,
} from './services/taskSync';

// Component Imports
import Sidebar from './components/layout/Sidebar';
import TaskBoard from './components/dashboard/TaskBoard';
import TaskList from './components/dashboard/TaskList';
import TaskModal from './components/common/TaskModal';
import AnalyticsView from './components/dashboard/AnalyticsView';
import ActivityFeed from './components/dashboard/ActivityFeed';

export default function App() {
  // Navigation & View State
  const [activeTab, setActiveTab] = useState<'board' | 'list' | 'analytics'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [isActivityStreamOpen, setIsActivityStreamOpen] = useState(false);

  // Core Data State (synchronized with localStorage & API)
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [initialStatusForNewTask, setInitialStatusForNewTask] = useState<TaskStatus>('todo');
  const [selectedKanbanStatus, setSelectedKanbanStatus] = useState<TaskStatus | null>(null);

  // Dark Mode Theme State
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });

  const selectedTaskIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedTaskIdRef.current = selectedTask?.id ?? null;
  }, [selectedTask]);

  const applyTasksFromServer = useCallback((tasksFromApi: Task[]) => {
    setTasks(tasksFromApi);

    const activeTaskId = selectedTaskIdRef.current;
    if (activeTaskId) {
      const refreshed = tasksFromApi.find((task) => task.id === activeTaskId);
      if (refreshed) {
        setSelectedTask(refreshed);
      } else {
        setIsModalOpen(false);
        setSelectedTask(null);
      }
    }
  }, []);

  // Initial load + 3-minute polling with ETag / Last-Modified
  useEffect(() => {
    let cancelled = false;

    const syncTasks = async () => {
      const result = await fetchTasksFromServer();
      if (cancelled) return;

      if (result.status === 'updated') {
        applyTasksFromServer(result.tasks);
        return;
      }

      if (result.status === 'error') {
        const localTasks = localStorage.getItem('tasks');
        if (localTasks) setTasks(JSON.parse(localTasks));
      }
    };

    syncTasks();
    const intervalId = window.setInterval(syncTasks, TASKS_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, [applyTasksFromServer]);

  // Activities: localStorage only (no backend API)
  useEffect(() => {
    const localActivities = localStorage.getItem('activities');
    if (localActivities) setActivities(JSON.parse(localActivities));
    else setActivities(INITIAL_ACTIVITIES);
  }, []);

  // Save states to localStorage whenever they change
  const saveTasksToLocal = (newTasks: Task[]) => {
    setTasks(newTasks);
    localStorage.setItem('tasks', JSON.stringify(newTasks));
  };

  const saveActivitiesToLocal = (newActivities: Activity[]) => {
    setActivities(newActivities);
    localStorage.setItem('activities', JSON.stringify(newActivities));
  };

  // Toggle Dark Mode
  useEffect(() => {
    localStorage.setItem('darkMode', String(darkMode));
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Compute live task counts across columns
  const taskCounts = useMemo(() => {
    return {
      all: tasks.length,
      todo: tasks.filter((t) => t.status === 'todo').length,
      inprogress: tasks.filter((t) => t.status === 'inprogress').length,
      review: tasks.filter((t) => t.status === 'review').length,
      done: tasks.filter((t) => t.status === 'done').length
    };
  }, [tasks]);

  // Helper to log a user activity to feed (disabled)
  const logActivity = (action: string, targetName: string) => {
    // Activities disabled as requested
  };

  // Handle task status movement
  const handleMoveTask = async (id: string, newStatus: TaskStatus) => {
    const originalTask = tasks.find((t) => t.id === id);
    if (!originalTask) return;

    const updatedTasks = tasks.map((t) =>
      t.id === id ? { ...t, status: newStatus } : t
    );
    saveTasksToLocal(updatedTasks);
    invalidateTasksCacheHeaders();

    try {
      await fetch(`/api/v1/tasks/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
    } catch (err) {
      console.error('Failed to update task status in backend:', err);
    }

    const statusNames = { todo: 'To Do', inprogress: 'In Progress', review: 'Review', done: 'Completed' };
    logActivity(`moved to ${statusNames[newStatus]}`, originalTask.title);
  };

  // Handle task deletion
  const handleDeleteTask = async (id: string) => {
    const originalTask = tasks.find((t) => t.id === id);
    if (!originalTask) return;

    try {
      const response = await fetch(`/api/v1/tasks/${id}/`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete task');
    } catch (err) {
      console.error('Failed to delete task in backend:', err);
      return;
    }

    const updatedTasks = tasks.filter((t) => t.id !== id);
    saveTasksToLocal(updatedTasks);
    invalidateTasksCacheHeaders();
    logActivity('deleted', originalTask.title);

    // If deleting active task in modal, close it and redirect to main board page
    if (selectedTask?.id === id) {
      setIsModalOpen(false);
      setSelectedTask(null);
      setActiveTab('board');
      setSelectedKanbanStatus(null);
    }
  };

  // Open modal to create a task
  const handleAddTaskClick = (status: TaskStatus) => {
    setInitialStatusForNewTask(status);
    setSelectedTask(null);
    setIsModalOpen(true);
  };

  // Save/Create Task Handler
  const handleSaveTask = async (taskData: Omit<Task, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => {
    if (taskData.id) {
      // Edit mode -> UPDATE in DB
      try {
        const response = await fetch(`/api/v1/tasks/${taskData.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        });
        if (!response.ok) throw new Error('Failed to update task');
        const updatedTask = await response.json();
        const updatedTasks = tasks.map((t) => (t.id === taskData.id ? updatedTask : t));
        saveTasksToLocal(updatedTasks);
        invalidateTasksCacheHeaders();
        if (selectedTask?.id === taskData.id) {
          setSelectedTask(updatedTask);
        }
        logActivity('updated details of', taskData.title);
      } catch (err) {
        console.error('Failed to patch task in backend, updating locally:', err);
        const updatedTasks = tasks.map((t) =>
          t.id === taskData.id
            ? {
                ...t,
                ...taskData,
                subtasks: taskData.subtasks || [],
                roles: taskData.roles || [],
                roleReviews: taskData.roleReviews || []
              }
            : t
        );
        saveTasksToLocal(updatedTasks as Task[]);
        if (selectedTask?.id === taskData.id) {
          setSelectedTask({ ...selectedTask, ...taskData } as Task);
        }
      }
    } else {
      // Create mode -> POST in DB
      try {
        const response = await fetch('/api/v1/tasks/', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(taskData)
        });
        if (!response.ok) throw new Error('Failed to create task');
        const createdTask = await response.json();
        saveTasksToLocal([createdTask, ...tasks]);
        invalidateTasksCacheHeaders();
        logActivity('created', taskData.title);
      } catch (err) {
        console.error('Failed to post task in backend, creating locally:', err);
        const newTask: Task = {
          id: 'task-' + Date.now(),
          title: taskData.title,
          description: taskData.description,
          status: taskData.status,
          priority: taskData.priority,
          category: taskData.category,
          assigneeId: taskData.assigneeId,
          subtasks: taskData.subtasks || [],
          roles: taskData.roles || [],
          roleReviews: taskData.roleReviews || [],
          createdAt: new Date().toISOString()
        };
        saveTasksToLocal([newTask, ...tasks]);
      }
    }
  };

  // Apply a server-confirmed change to one task's sub-resource (subtasks/reviews)
  // into both the global task list and the currently open modal, if any.
  const updateTaskInState = (taskId: string, updater: (t: Task) => Task) => {
    setTasks((prev) => {
      const next = prev.map((t) => (t.id === taskId ? updater(t) : t));
      localStorage.setItem('tasks', JSON.stringify(next));
      return next;
    });
    setSelectedTask((prev) => (prev && prev.id === taskId ? updater(prev) : prev));
    invalidateTasksCacheHeaders();
  };

  // --- SubTask resource handlers (/api/v1/tasks/<id>/subtasks/...) ---
  const handleAddSubtask = async (taskId: string, title: string): Promise<SubTask> => {
    const response = await fetch(`/api/v1/tasks/${taskId}/subtasks/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, completed: false }),
    });
    if (!response.ok) throw new Error('Failed to add subtask');
    const created: SubTask = await response.json();
    updateTaskInState(taskId, (t) => ({ ...t, subtasks: [...t.subtasks, created] }));
    return created;
  };

  const handleToggleSubtask = async (taskId: string, subtaskId: string, completed: boolean) => {
    const response = await fetch(`/api/v1/tasks/${taskId}/subtasks/${subtaskId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed }),
    });
    if (!response.ok) throw new Error('Failed to update subtask');
    const updated: SubTask = await response.json();
    updateTaskInState(taskId, (t) => ({
      ...t,
      subtasks: t.subtasks.map((s) => (s.id === subtaskId ? updated : s)),
    }));
  };

  const handleRemoveSubtask = async (taskId: string, subtaskId: string) => {
    const response = await fetch(`/api/v1/tasks/${taskId}/subtasks/${subtaskId}/`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete subtask');
    updateTaskInState(taskId, (t) => ({
      ...t,
      subtasks: t.subtasks.filter((s) => s.id !== subtaskId),
    }));
  };

  // Full-collection replace, used by AI checklist (re)generation.
  const handleReplaceSubtasks = async (taskId: string, subtasks: SubTask[]): Promise<SubTask[]> => {
    const response = await fetch(`/api/v1/tasks/${taskId}/subtasks/`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subtasks),
    });
    if (!response.ok) throw new Error('Failed to replace subtasks');
    const updated: SubTask[] = await response.json();
    // 서버가 이 PUT 처리 중에 hasUnreflectedReview/lastReviewAddedAt도 함께 초기화하므로
    // 별도 PATCH 없이 로컬 상태만 맞춰준다.
    updateTaskInState(taskId, (t) => ({
      ...t,
      subtasks: updated,
      hasUnreflectedReview: false,
      lastReviewAddedAt: undefined,
    }));
    return updated;
  };

  // --- RoleReview resource handlers (/api/v1/tasks/<id>/reviews/...) ---
  const handleAddReview = async (
    taskId: string,
    review: Omit<RoleReview, 'id' | 'createdAt'>
  ): Promise<RoleReview> => {
    const response = await fetch(`/api/v1/tasks/${taskId}/reviews/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(review),
    });
    if (!response.ok) throw new Error('Failed to add review');
    const created: RoleReview = await response.json();
    // hasUnreflectedReview/lastReviewAddedAt은 서버가 조회 시점에 계산하는 값이라
    // 별도로 PATCH하지 않는다. 다음 폴링 전까지 배너를 바로 보여주기 위해
    // 로컬 상태만 낙관적으로 맞춰준다.
    updateTaskInState(taskId, (t) => ({
      ...t,
      roleReviews: [...(t.roleReviews || []), created],
      hasUnreflectedReview: true,
      lastReviewAddedAt: created.createdAt,
    }));
    return created;
  };

  const handleUpdateReview = async (taskId: string, reviewId: string, patch: Partial<RoleReview>) => {
    const response = await fetch(`/api/v1/tasks/${taskId}/reviews/${reviewId}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!response.ok) throw new Error('Failed to update review');
    const updated: RoleReview = await response.json();
    updateTaskInState(taskId, (t) => ({
      ...t,
      roleReviews: (t.roleReviews || []).map((r) => (r.id === reviewId ? updated : r)),
    }));
  };

  const handleDeleteReview = async (taskId: string, reviewId: string) => {
    const response = await fetch(`/api/v1/tasks/${taskId}/reviews/${reviewId}/`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete review');
    updateTaskInState(taskId, (t) => ({
      ...t,
      roleReviews: (t.roleReviews || []).filter((r) => r.id !== reviewId),
    }));
  };

  const handleTabChange = (tab: 'board' | 'list' | 'analytics') => {
    setActiveTab(tab);
    setSelectedKanbanStatus(null);
    setIsModalOpen(false);
    setSelectedTask(null);
  };

  // Search filter applied to tasks
  const searchedTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const query = searchQuery.toLowerCase().trim();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.description.toLowerCase().includes(query) ||
        t.category.toLowerCase().includes(query)
    );
  }, [tasks, searchQuery]);

  return (
    <div className={`flex h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-200 ${darkMode ? 'dark' : ''}`} id="app-root-container">
      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        taskCounts={taskCounts}
      />

      {/* Main Panel Area */}
      <main className="flex-1 flex flex-col min-w-0 h-full overflow-hidden" id="app-main-panel">
        
        {/* Header Bar */}
        <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-8 shrink-0">
          
          {/* Left search */}
          <div className="flex items-center gap-3 w-80 relative" id="header-search-bar">
            <Search size={16} className="absolute left-3.5 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="작업, 설명, 역할 등으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
            />
          </div>

          {/* Right actions */}
          <div className="flex items-center gap-4" id="header-right-actions">
            
            {/* Dark Mode Toggler */}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              title="다크/라이트 모드 전환"
              id="theme-toggle-btn"
            >
              {darkMode ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Global Create Task Button */}
            <button
              onClick={() => handleAddTaskClick('todo')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-all cursor-pointer"
              id="global-create-task-btn"
            >
              <Plus size={14} strokeWidth={2.5} />
              <span>새 작업</span>
            </button>
          </div>
        </header>

        {/* Dynamic Inner Body Container */}
        <div className="flex-1 p-8 overflow-y-auto" id="app-view-container">
          {/* Header Description of Selected View */}
          <div className="mb-6">
            <h2 className="text-xl font-extrabold font-sans text-slate-800 dark:text-slate-50 tracking-tight leading-none">
              {activeTab === 'board' && '칸반 보드'}
              {activeTab === 'list' && '작업 대장'}
              {activeTab === 'analytics' && '프로젝트 분석'}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 leading-normal max-w-2xl">
              {activeTab === 'board' && '워크플로우 단계를 시각적으로 관리하고 단계를 손쉽게 이동합니다.'}
              {activeTab === 'list' && '작업 세부 목록을 정렬, 필터링하여 순차적으로 상세하게 확인합니다.'}
              {activeTab === 'analytics' && '전체 작업 통계 및 우선순위'}
            </p>
          </div>

          {/* Render Active View Tab */}
          <div className="h-full">
            {activeTab === 'board' && (
              <TaskBoard
                tasks={searchedTasks}
                onMoveTask={handleMoveTask}
                onSelectTask={(task) => {
                  setSelectedTask(task);
                  setIsModalOpen(true);
                }}
                onAddTaskClick={handleAddTaskClick}
                onDeleteTask={handleDeleteTask}
                selectedStatus={selectedKanbanStatus}
                onSelectedStatusChange={setSelectedKanbanStatus}
              />
            )}
            {activeTab === 'list' && (
              <TaskList
                tasks={searchedTasks}
                onSelectTask={(task) => {
                  setSelectedTask(task);
                  setIsModalOpen(true);
                }}
                onDeleteTask={handleDeleteTask}
                onMoveTask={handleMoveTask}
              />
            )}
            {activeTab === 'analytics' && <AnalyticsView tasks={tasks} />}
          </div>
        </div>
      </main>

      {/* Details / Create Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
        initialStatus={initialStatusForNewTask}
        onSave={handleSaveTask}
        onDeleteTask={handleDeleteTask}
        onAddSubtask={handleAddSubtask}
        onToggleSubtask={handleToggleSubtask}
        onRemoveSubtask={handleRemoveSubtask}
        onReplaceSubtasks={handleReplaceSubtasks}
        onAddReview={handleAddReview}
        onUpdateReview={handleUpdateReview}
        onDeleteReview={handleDeleteReview}
        onNavigateToStatus={(status) => {
          setActiveTab('board');
          setSelectedKanbanStatus(null); // Go to main page (all columns portal)
          setIsModalOpen(false);
          setSelectedTask(null);
        }}
      />
    </div>
  );
}
