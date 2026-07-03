import React, { useState, useMemo } from 'react';
import { Eye, Trash2, Calendar, ClipboardCheck, ArrowUpDown, Filter, Search } from 'lucide-react';
import { Task, TaskStatus } from '../../types';

interface TaskListProps {
  tasks: Task[];
  onSelectTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
  onMoveTask: (id: string, newStatus: TaskStatus) => void;
}

const getInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getAvatarColor = (name: string) => {
  const colors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-rose-500',
    'bg-amber-500',
    'bg-purple-500',
    'bg-sky-500',
    'bg-indigo-500',
    'bg-pink-500',
  ];
  if (!name) return 'bg-slate-500';
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % colors.length;
  return colors[index];
};

const getPriorityBadgeStyle = (priority: string | undefined) => {
  const p = priority || 'medium';
  switch (p) {
    case 'low':
      return 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30';
    case 'medium':
      return 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30';
    case 'high':
      return 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900/30';
    case 'urgent':
      return 'bg-red-600 text-white border border-red-700 font-extrabold shadow-sm shadow-red-500/20';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700';
  }
};

const getPriorityLabel = (priority: string | undefined) => {
  const p = priority || 'medium';
  switch (p) {
    case 'low': return '낮음';
    case 'medium': return '보통';
    case 'high': return '높음';
    case 'urgent': return '긴급 🔥';
    default: return '보통';
  }
};

export default function TaskList({
  tasks,
  onSelectTask,
  onDeleteTask,
  onMoveTask
}: TaskListProps) {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assigneeSearch, setAssigneeSearch] = useState<string>('');
  const [sortBy, setSortBy] = useState<'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: 'createdAt') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  // Filter tasks based on selected dropdown options
  const filteredTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (statusFilter === 'exclude_done') {
          if (task.status === 'done') return false;
        } else if (statusFilter !== 'all' && task.status !== statusFilter) {
          return false;
        }
        if (assigneeSearch.trim() !== '') {
          const search = assigneeSearch.toLowerCase().trim();
          if (!task.assigneeId || !task.assigneeId.toLowerCase().includes(search)) {
            return false;
          }
        }
        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortBy];
        let valB: any = b[sortBy];

        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });
  }, [tasks, statusFilter, assigneeSearch, sortBy, sortOrder]);

  const getStatusStyle = (status: TaskStatus) => {
    switch (status) {
      case 'todo':
        return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
      case 'inprogress':
        return 'bg-blue-50/70 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400';
      case 'review':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400';
      case 'done':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400';
    }
  };

  return (
    <div className="space-y-6 pb-8" id="task-list-view">
      {/* Filtering and Sorting Controls Header */}
      <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold mr-2">
          <Filter size={15} />
          <span>필터:</span>
        </div>

        {/* Status Filter */}
        <div className="flex flex-col gap-1.5 min-w-[150px]">
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">진행 상태</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none"
          >
            <option value="all">모든 상태</option>
            <option value="exclude_done">완료됨 제외</option>
            <option value="todo">할 일</option>
            <option value="inprogress">진행 중</option>
            <option value="review">검토 중</option>
            <option value="done">완료됨</option>
          </select>
        </div>

        {/* Assignee Search Input Filter */}
        <div className="flex flex-col gap-1.5 min-w-[200px] flex-1 max-w-sm relative">
          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none">담당자 검색</span>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={assigneeSearch}
              onChange={(e) => setAssigneeSearch(e.target.value)}
              placeholder="담당자 이름 검색..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        {/* Reset Filter Button */}
        {(statusFilter !== 'all' || assigneeSearch.trim() !== '') && (
          <button
            onClick={() => {
              setStatusFilter('all');
              setAssigneeSearch('');
            }}
            className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 dark:text-rose-400 mt-4 underline self-center cursor-pointer"
          >
            필터 초기화
          </button>
        )}
      </div>

      {/* Table Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
        {filteredTasks.length === 0 ? (
          <div className="p-16 flex flex-col items-center justify-center text-center text-slate-400 dark:text-slate-500">
            <ClipboardCheck size={40} className="stroke-1 mb-3 text-slate-300 dark:text-slate-700" />
            <p className="text-sm font-semibold">필터 조건에 맞는 작업이 없습니다</p>
            <p className="text-xs mt-1.5 max-w-sm">상단의 필터 조건을 변경하거나 새 작업을 추가해 보세요.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse" id="tasks-table">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    작업 제목
                  </th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    진행 상태
                  </th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <button
                      onClick={() => handleSort('createdAt')}
                      className="flex items-center gap-1.5 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
                    >
                      <span>생성일</span>
                      <ArrowUpDown size={12} />
                    </button>
                  </th>
                  <th className="py-4 px-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    담당자
                  </th>
                  <th className="py-4 px-6 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/65">
                {filteredTasks.map((task) => {
                  const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
                  const totalSubtasks = task.subtasks.length;

                  return (
                    <tr
                      key={task.id}
                      className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors cursor-pointer group ${
                        task.priority === 'urgent'
                          ? 'bg-rose-50/20 dark:bg-rose-950/10 border-l-[4px] border-l-rose-500'
                          : ''
                      }`}
                      onClick={() => onSelectTask(task)}
                    >
                      {/* Title and Checklist Indicator */}
                      <td className="py-4 px-6 min-w-[280px]">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors leading-tight">
                              {task.title}
                            </span>
                            {task.priority && (
                              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-black border shrink-0 ${getPriorityBadgeStyle(task.priority)}`}>
                                {getPriorityLabel(task.priority)}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1 max-w-sm leading-normal">
                            {task.description}
                          </span>
                          {totalSubtasks > 0 && (
                            <span className="flex items-center gap-1 text-[10px] text-blue-500 font-medium mt-1">
                              <ClipboardCheck size={11} />
                              <span>{completedSubtasks}/{totalSubtasks}개의 하위 작업 완료됨</span>
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status Dropdown/Selector directly inside table! */}
                      <td className="py-4 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <select
                          value={task.status}
                          onChange={(e) => onMoveTask(task.id, e.target.value as TaskStatus)}
                          className={`text-xs font-semibold px-2 py-1 rounded border border-transparent focus:ring-1 focus:ring-blue-500 outline-none cursor-pointer ${getStatusStyle(task.status)}`}
                        >
                          <option value="todo">할 일</option>
                          <option value="inprogress">진행 중</option>
                          <option value="review">검토 중</option>
                          <option value="done">완료됨</option>
                        </select>
                      </td>

                      {/* Created At */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-mono">
                          <Calendar size={13} className="text-slate-400" />
                          <span>
                            {task.createdAt
                              ? new Date(task.createdAt).toLocaleDateString('ko-KR')
                              : '-'}
                          </span>
                        </div>
                      </td>

                      {/* Assignee pill */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        {task.assigneeId ? (
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full ${getAvatarColor(task.assigneeId)} text-white flex items-center justify-center text-[10px] font-bold shadow-sm`}>
                              {getInitials(task.assigneeId)}
                            </div>
                            <span className="text-xs text-slate-700 dark:text-slate-300 font-semibold">{task.assigneeId}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">미지정</span>
                        )}
                      </td>

                      {/* Actions column */}
                      <td className="py-4 px-6 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onSelectTask(task)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="상세 보기"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            onClick={() => onDeleteTask(task.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-colors"
                            title="작업 삭제"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
