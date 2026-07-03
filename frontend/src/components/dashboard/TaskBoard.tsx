import React, { useState } from 'react';
import { Plus, ArrowLeft, ArrowRight, Eye, Trash2, Calendar, ClipboardCheck, ListTodo, RefreshCw, FileCheck2, CheckCircle2, ChevronRight } from 'lucide-react';
import { Task, TaskStatus } from '../../types';

interface TaskBoardProps {
  tasks: Task[];
  onMoveTask: (id: string, newStatus: TaskStatus) => void;
  onSelectTask: (task: Task) => void;
  onAddTaskClick: (status: TaskStatus) => void;
  onDeleteTask: (id: string) => void;
  selectedStatus: TaskStatus | null;
  onSelectedStatusChange: (status: TaskStatus | null) => void;
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

const getPriorityStyles = (priority: string | undefined) => {
  const p = priority || 'medium';
  switch (p) {
    case 'low':
      return {
        border: 'border-emerald-200 dark:border-emerald-950 bg-white dark:bg-slate-900 border-l-[5px] border-l-emerald-500 shadow-sm shadow-emerald-500/5',
        badge: 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/30',
        label: '낮음'
      };
    case 'medium':
      return {
        border: 'border-amber-200 dark:border-amber-950 bg-white dark:bg-slate-900 border-l-[5px] border-l-amber-500 shadow-sm shadow-amber-500/5',
        badge: 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/30',
        label: '보통'
      };
    case 'high':
      return {
        border: 'border-rose-200 dark:border-rose-950 bg-white dark:bg-slate-900 border-l-[5px] border-l-rose-500 shadow-sm shadow-rose-500/5',
        badge: 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/30',
        label: '높음'
      };
    case 'urgent':
      return {
        border: 'border-red-400 dark:border-red-950 bg-white dark:bg-slate-900 border-l-[6px] border-l-red-600 ring-1 ring-red-500/20 dark:ring-red-500/10 shadow-md shadow-red-500/5',
        badge: 'bg-red-600 dark:bg-red-700 text-white border-red-700 font-extrabold',
        label: '긴급 🔥'
      };
    default:
      return {
        border: 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 border-l-[5px] border-l-slate-400',
        badge: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
        label: '보통'
      };
  }
};

export default function TaskBoard({
  tasks,
  onMoveTask,
  onSelectTask,
  onAddTaskClick,
  onDeleteTask,
  selectedStatus,
  onSelectedStatusChange: setSelectedStatus
}: TaskBoardProps) {

  const columns: { 
    id: TaskStatus; 
    label: string; 
    color: string; 
    border: string; 
    bg: string; 
    desc: string;
    icon: React.ComponentType<any>;
  }[] = [
    {
      id: 'todo',
      label: '할 일',
      color: 'text-slate-600 dark:text-slate-400',
      border: 'border-slate-200 dark:border-slate-800',
      bg: 'bg-slate-50/50 dark:bg-slate-900/30',
      desc: '작업 준비 완료 상태. 자원 계획 및 요구사항 검토를 진행합니다.',
      icon: ListTodo
    },
    {
      id: 'inprogress',
      label: '진행 중',
      color: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-100 dark:border-blue-950/40',
      bg: 'bg-blue-50/10 dark:bg-blue-950/10',
      desc: '현재 개발, 디자인 또는 능동적으로 수행 중인 작업입니다.',
      icon: RefreshCw
    },
    {
      id: 'review',
      label: '검토 중',
      color: 'text-amber-600 dark:text-amber-400',
      border: 'border-amber-100 dark:border-amber-950/30',
      bg: 'bg-amber-50/10 dark:bg-amber-950/10',
      desc: '작업이 완료되었으나 테스트, 코드 리뷰 또는 최종 검증 단계입니다.',
      icon: FileCheck2
    },
    {
      id: 'done',
      label: '완료됨',
      color: 'text-emerald-600 dark:text-emerald-400',
      border: 'border-emerald-100 dark:border-emerald-950/30',
      bg: 'bg-emerald-50/10 dark:bg-emerald-950/10',
      desc: '성공적으로 검증 및 완료되어 배포가 끝난 작업입니다.',
      icon: CheckCircle2
    }
  ];

  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border-rose-100 dark:border-rose-900/30';
      case 'medium':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 border-amber-100 dark:border-amber-900/30';
      case 'low':
      default:
        return 'bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-100 dark:border-slate-700/50';
    }
  };

  const getCategoryStyle = (category: string) => {
    const hash = category.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const colors = [
      'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30',
      'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30',
      'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-100 dark:bg-fuchsia-950/20 dark:text-fuchsia-400 dark:border-fuchsia-900/30',
      'bg-teal-50 text-teal-700 border-teal-100 dark:bg-teal-950/20 dark:text-teal-400 dark:border-teal-900/30',
      'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30'
    ];
    return colors[hash % colors.length];
  };

  const moveLeft = (status: TaskStatus): TaskStatus | null => {
    if (status === 'inprogress') return 'todo';
    if (status === 'review') return 'inprogress';
    if (status === 'done') return 'review';
    return null;
  };

  const moveRight = (status: TaskStatus): TaskStatus | null => {
    if (status === 'todo') return 'inprogress';
    if (status === 'inprogress') return 'review';
    if (status === 'review') return 'done';
    return null;
  };

  // 1. Selection Portal Screen
  if (selectedStatus === null) {
    return (
      <div className="flex flex-col h-full overflow-y-auto pr-2 pb-12" id="kanban-portal">
        <div className="mb-8 text-center max-w-xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 dark:text-slate-100 font-sans tracking-tight">
            단계를 선택하여 작업을 확인하세요
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {columns.map((col) => {
            const colTasks = tasks.filter((t) => t.status === col.id);
            const ColIcon = col.icon;
            return (
              <div
                key={col.id}
                onClick={() => setSelectedStatus(col.id)}
                className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-400 rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between h-72"
                id={`status-portal-card-${col.id}`}
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${col.border} ${col.bg}`}>
                      <ColIcon size={22} className={`${col.color}`} />
                    </div>
                    <span className="text-xs font-mono font-bold px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md">
                      {colTasks.length}개의 작업
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {col.label}
                  </h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-2.5 leading-relaxed">
                    {col.desc}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-4 text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-450 transition-colors">
                  <span>단계 진입</span>
                  <ChevronRight size={16} className="transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // 2. Specific Column View
  const colDetails = columns.find(c => c.id === selectedStatus)!;
  const ColIcon = colDetails.icon;
  const colTasks = tasks.filter((t) => t.status === selectedStatus);

  return (
    <div className="flex flex-col h-full overflow-y-auto pr-2 pb-12" id={`kanban-stage-view-${selectedStatus}`}>
      {/* Navigation Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-5 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSelectedStatus(null)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            id="back-to-portal-btn"
          >
            <ArrowLeft size={14} />
            <span>단계 목록으로 가기</span>
          </button>
          <div className="h-4 w-[1px] bg-slate-300 dark:bg-slate-700 hidden sm:block" />
          <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
            <span>칸반 보드</span>
            <span>/</span>
            <span className="text-slate-600 dark:text-slate-300 font-bold">{colDetails.label}</span>
          </div>
        </div>

        {/* Dynamic Column Switcher Bar */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700">
          {columns.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedStatus(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedStatus === c.id
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stage Detail Summary */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center border ${colDetails.border} ${colDetails.bg}`}>
            <ColIcon size={20} className={`${colDetails.color}`} />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 leading-none">
              {colDetails.label}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 leading-relaxed max-w-xl">
              {colDetails.desc}
            </p>
          </div>
        </div>

        <button
          onClick={() => onAddTaskClick(colDetails.id)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-600/20 transition-all cursor-pointer"
          id="stage-add-task-btn"
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>{colDetails.label}에 작업 추가</span>
        </button>
      </div>

      {/* Grid of Column Specific Tasks */}
      {colTasks.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-500 p-8 text-center bg-white dark:bg-slate-900/20">
          <ColIcon size={32} className={`opacity-40 ${colDetails.color}`} />
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mt-4">{colDetails.label}에 작업이 없습니다</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-sm">
            현재 이 워크플로우 단계에 할당된 작업 항목이 없습니다.
          </p>
          <button
            onClick={() => onAddTaskClick(colDetails.id)}
            className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg cursor-pointer"
          >
            + 작업 추가
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {colTasks.map((task) => {
            const completedSubtasks = task.subtasks.filter((s) => s.completed).length;
            const totalSubtasks = task.subtasks.length;
            const progressPercentage = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;
            const nextCol = moveRight(task.status);
            const prevCol = moveLeft(task.status);
            const priorityStyle = getPriorityStyles(task.priority);

            return (
              <div
                key={task.id}
                id={`task-card-${task.id}`}
                className={`${priorityStyle.border} rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-blue-500/40 dark:hover:border-blue-400/40 transition-all duration-250 group relative flex flex-col justify-between gap-3 h-[19.5rem]`}
              >
                <div>
                  {/* Category and Priority Badge Top Row */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider font-mono truncate max-w-[120px]">
                      {task.category || 'Development'}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 text-[9px] font-black rounded-full border ${priorityStyle.badge}`}>
                      {priorityStyle.label}
                    </span>
                  </div>

                  <div className="cursor-pointer" onClick={() => onSelectTask(task)}>
                    <h4 className="font-sans font-bold text-slate-800 dark:text-slate-100 text-[13.5px] leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-450 transition-colors line-clamp-2">
                      {task.title}
                    </h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  {totalSubtasks > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-medium text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1">
                          <ClipboardCheck size={11} className="text-blue-500" />
                          <span>체크리스트</span>
                        </span>
                        <span className="font-mono text-[9px]">{completedSubtasks}/{totalSubtasks}</span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
                        <div
                          className="bg-blue-600 dark:bg-blue-500 h-1 rounded-full transition-all duration-300"
                          style={{ width: `${progressPercentage}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="border-t border-slate-100 dark:border-slate-800/80" />

                  {/* Redesigned Footer Stack: 2 nicely spaced rows to completely prevent any overflow */}
                  <div className="flex flex-col gap-2">
                    {/* Row 1: Assignee info and Date */}
                    <div className="flex items-center justify-between gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                      {task.assigneeId ? (
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div
                            className={`w-[22px] h-[22px] rounded-full shrink-0 ${getAvatarColor(task.assigneeId)} text-white flex items-center justify-center text-[9px] font-black shadow-sm`}
                            title={task.assigneeId}
                          >
                            {getInitials(task.assigneeId)}
                          </div>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[100px]" title={task.assigneeId}>
                            {task.assigneeId}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-slate-400 dark:text-slate-500">
                          <div className="w-[22px] h-[22px] rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center text-[10px]" title="담당자 미지정">
                            ?
                          </div>
                          <span className="text-[10px]">미지정</span>
                        </div>
                      )}

                      <span className="flex items-center gap-1 text-[10.5px] text-slate-400 dark:text-slate-500 font-mono bg-slate-50 dark:bg-slate-900/40 px-2 py-0.5 rounded-md border border-slate-100/80 dark:border-slate-800/80 shrink-0">
                        <Calendar size={11} className="text-slate-400 dark:text-slate-500" />
                        <span>
                          {task.createdAt
                            ? new Date(task.createdAt).toLocaleDateString('ko-KR', {
                                month: '2-digit',
                                day: '2-digit',
                              })
                            : '-'}
                        </span>
                      </span>
                    </div>

                    {/* Row 2: Action Buttons */}
                    <div className="flex items-center justify-end gap-1 pt-1.5 border-t border-dashed border-slate-100 dark:border-slate-800/50">
                      <button
                        onClick={() => onSelectTask(task)}
                        className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                        title="상세 보기"
                      >
                        <Eye size={12} />
                      </button>
                      
                      <button
                        onClick={() => onDeleteTask(task.id)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                        title="작업 삭제"
                      >
                        <Trash2 size={12} />
                      </button>

                      {prevCol && (
                        <button
                          onClick={() => onMoveTask(task.id, prevCol)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                          title={`이전 단계로 이동 (${prevCol === 'todo' ? '할 일' : prevCol === 'inprogress' ? '진행 중' : '검토 중'})`}
                        >
                          <ArrowLeft size={12} />
                        </button>
                      )}

                      {nextCol && (
                        <button
                          onClick={() => onMoveTask(task.id, nextCol)}
                          className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                          title={`다음 단계로 이동 (${nextCol === 'inprogress' ? '진행 중' : nextCol === 'review' ? '검토 중' : '완료됨'})`}
                        >
                          <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
