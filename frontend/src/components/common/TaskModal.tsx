import React, { useState, useEffect } from 'react';
import { X, Save, Edit2, Plus, Trash2, CheckSquare, Square, Calendar, User, AlignLeft, Tag, BarChart, ClipboardCheck, Check, Sparkles } from 'lucide-react';
import { Task, TaskStatus, TaskPriority, SubTask, RoleReview } from '../../types';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  initialStatus?: TaskStatus;
  onSave: (task: Omit<Task, 'id' | 'createdAt'> & { id?: string; createdAt?: string }) => void;
  onDeleteTask: (id: string) => void;
  onAddSubtask: (taskId: string, title: string) => Promise<SubTask>;
  onToggleSubtask: (taskId: string, subtaskId: string, completed: boolean) => Promise<void>;
  onRemoveSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  onReplaceSubtasks: (taskId: string, subtasks: SubTask[]) => Promise<SubTask[]>;
  onAddReview: (taskId: string, review: Omit<RoleReview, 'id' | 'createdAt'>) => Promise<RoleReview>;
  onUpdateReview: (taskId: string, reviewId: string, patch: Partial<RoleReview>) => Promise<void>;
  onDeleteReview: (taskId: string, reviewId: string) => Promise<void>;
  onNavigateToStatus?: (status: TaskStatus) => void;
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

const formatCreatedAt = (dateString?: string) => {
  if (!dateString) return '알 수 없음';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '알 수 없음';
    
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    
    return `${year}년 ${month}월 ${day}일 ${hours}시 ${minutes}분`;
  } catch (e) {
    return '알 수 없음';
  }
};

export default function TaskModal({
  isOpen,
  onClose,
  task,
  initialStatus = 'todo',
  onSave,
  onDeleteTask,
  onAddSubtask,
  onToggleSubtask,
  onRemoveSubtask,
  onReplaceSubtasks,
  onAddReview,
  onUpdateReview,
  onDeleteReview,
  onNavigateToStatus
}: TaskModalProps) {
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('todo');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [category, setCategory] = useState('Development');
  const [assigneeId, setAssigneeId] = useState('');
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [roles, setRoles] = useState<string[]>([]);
  const [roleReviews, setRoleReviews] = useState<RoleReview[]>([]);
  const [newReviewRole, setNewReviewRole] = useState('Developer');
  const [customRoleText, setCustomRoleText] = useState('');
  const [newReviewComment, setNewReviewComment] = useState('');
  const [newReviewReviewerId, setNewReviewReviewerId] = useState('');
  const [newReviewUrgency, setNewReviewUrgency] = useState<'normal' | 'urgent'>('normal');
  const [showCompletionPrompt, setShowCompletionPrompt] = useState<boolean>(false);
  const [isGeneratingChecklist, setIsGeneratingChecklist] = useState<boolean>(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState<boolean>(false);
  const [checklistError, setChecklistError] = useState<string | null>(null);

  // Synchronize modal state with task changes or mode changes
  useEffect(() => {
    setShowCompletionPrompt(false);
    setIsConfirmingDelete(false);
    setChecklistError(null);
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setStatus(task.status);
      setPriority(task.priority || 'medium');
      setCategory(task.category || 'General');
      setAssigneeId(task.assigneeId);
      setSubtasks(task.subtasks || []);
      setRoles(task.roles || []);
      setRoleReviews(task.roleReviews || []);
      setNewReviewRole('Developer');
      setCustomRoleText('');
      setNewReviewComment('');
      setNewReviewReviewerId('');
      setNewReviewUrgency('normal');
      setIsEditing(false); // Default to view mode for existing tasks
    } else {
      setTitle('');
      setDescription('');
      setStatus(initialStatus);
      setPriority('medium');
      setCategory('General');
      setAssigneeId('');
      setSubtasks([]);
      setRoles([]);
      setRoleReviews([]);
      setNewReviewRole('Developer');
      setCustomRoleText('');
      setNewReviewComment('');
      setNewReviewReviewerId('');
      setNewReviewUrgency('normal');
      setIsEditing(true); // Default to edit mode for new tasks
    }
  }, [task, isOpen, initialStatus]);

  if (!isOpen) return null;

  const handleGenerateChecklist = async () => {
    if (!title.trim()) return;
    setChecklistError(null);

    if (!roleReviews || roleReviews.length === 0) {
      setChecklistError("검토 기록이 없습니다.");
      return;
    }

    setIsGeneratingChecklist(true);
    try {
      const response = await fetch('/api/v1/generate-checklist/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          roleReviews: roleReviews
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Backend responded with an error');
      }

      if (data.checklist && Array.isArray(data.checklist)) {
        const formattedSubtasks = data.checklist.map((item: any, index: number) => ({
          id: `sub-ai-${Date.now()}-${index}`,
          title: item.title,
          completed: item.completed || false
        }));
        // 만약 기존 작업의 체크리스트 업데이트라면 하위 작업 컬렉션을 통째로 교체한다.
        // hasUnreflectedReview 플래그 초기화는 서버가 이 PUT 처리 중에 함께 수행하므로
        // 별도의 Task PATCH가 필요 없다.
        if (task) {
          const replaced = await onReplaceSubtasks(task.id, formattedSubtasks);
          setSubtasks(replaced);
        } else {
          setSubtasks(formattedSubtasks);
        }
      } else {
        throw new Error('Invalid checklist response format');
      }
    } catch (error) {
      console.error('Error generating AI checklist from backend:', error);
      const message = error instanceof Error ? error.message : '알 수 없는 오류';
      setChecklistError(`체크리스트 생성에 실패했습니다: ${message}`);
    } finally {
      setIsGeneratingChecklist(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    // Task 자신의 필드만 다룬다. 하위 작업/검토 기록은 각자의 리소스 엔드포인트에서 관리된다.
    onSave({
      id: task?.id, // Includes id if editing
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      category,
      assigneeId,
      subtasks: task?.subtasks || [],
      createdAt: task?.createdAt,
      roles,
      roleReviews: task?.roleReviews || [],
      hasUnreflectedReview: task?.hasUnreflectedReview,
      lastReviewAddedAt: task?.lastReviewAddedAt
    });

    onClose();
  };

  const handleStatusChangeAndRedirect = (newStatus: TaskStatus) => {
    setShowCompletionPrompt(false);
    setStatus(newStatus);

    if (task) {
      onSave({
        ...task,
        status: newStatus
      });
    }

    if (onNavigateToStatus) {
      onNavigateToStatus(newStatus);
    } else {
      onClose();
    }
  };

  const toggleSubtask = (subtaskId: string) => {
    const updated = subtasks.map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    setSubtasks(updated);

    if (!isEditing && task) {
      const target = updated.find((st) => st.id === subtaskId);
      onToggleSubtask(task.id, subtaskId, target?.completed ?? false).catch((err) =>
        console.error('Failed to toggle subtask in backend:', err)
      );
    }

    // Trigger completion prompt if all items are completed
    const allCompletedNow = updated.length > 0 && updated.every(st => st.completed);
    const isTodoOrInprogress = status === 'todo' || status === 'inprogress';
    if (allCompletedNow && isTodoOrInprogress) {
      setShowCompletionPrompt(true);
    }
  };

  const addSubtask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubtaskTitle.trim() || !task) return;

    const titleToAdd = newSubtaskTitle.trim();
    setNewSubtaskTitle('');

    onAddSubtask(task.id, titleToAdd)
      .then((created) => setSubtasks((prev) => [...prev, created]))
      .catch((err) => console.error('Failed to add subtask in backend:', err));
  };

  const removeSubtask = (subtaskId: string) => {
    if (!task) return;

    const updated = subtasks.filter((st) => st.id !== subtaskId);
    setSubtasks(updated);

    onRemoveSubtask(task.id, subtaskId).catch((err) =>
      console.error('Failed to remove subtask in backend:', err)
    );
  };

  const addRoleReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReviewComment.trim() || !task) return;

    const finalRole = newReviewRole === 'Custom' ? customRoleText.trim() : newReviewRole;
    if (!finalRole) return;

    const reviewInput = {
      role: finalRole,
      comment: newReviewComment.trim(),
      reviewerId: newReviewReviewerId || undefined,
      isAccepted: false,
      urgency: newReviewUrgency
    };

    setNewReviewComment('');
    setCustomRoleText('');
    setNewReviewReviewerId('');
    setNewReviewUrgency('normal');

    const shouldMoveToInProgress = status === 'todo' && roleReviews.length === 0;
    if (shouldMoveToInProgress) {
      setStatus('inprogress');
    }

    // 리뷰 자체는 reviews 리소스에 저장한다. hasUnreflectedReview/lastReviewAddedAt은
    // 서버가 조회 시점에 계산하는 값이라 여기서 따로 보낼 게 없다. status 전환은
    // "첫 리뷰"일 때만 실제로 값이 바뀌므로 그 경우에만 Task를 PATCH한다.
    onAddReview(task.id, reviewInput)
      .then((created) => {
        setRoleReviews((prev) => [...prev, created]);
        if (shouldMoveToInProgress) {
          onSave({ ...task, status: 'inprogress' });
        }
      })
      .catch((err) => console.error('Failed to add review in backend:', err));
  };

  const acceptRoleReview = (reviewId: string) => {
    if (!task) return;

    const acceptedAt = new Date().toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    setRoleReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, isAccepted: true, acceptedAt } : r))
    );

    onUpdateReview(task.id, reviewId, { isAccepted: true, acceptedAt }).catch((err) =>
      console.error('Failed to accept review in backend:', err)
    );
  };

  const deleteRoleReview = (reviewId: string) => {
    if (!task) return;

    setRoleReviews((prev) => prev.filter((r) => r.id !== reviewId));

    onDeleteReview(task.id, reviewId).catch((err) =>
      console.error('Failed to delete review in backend:', err)
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" id="modal-overlay">
      <div
        className="relative bg-white dark:bg-slate-900 rounded-xl max-w-2xl w-full border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden animate-in fade-in duration-200 flex flex-col max-h-[90vh]"
        id="task-modal"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 font-sans">
              {task ? (isEditing ? '작업 수정' : '작업 상세 정보') : '새 작업 생성'}
            </h3>
            {task && !isEditing && (
              <div className="flex items-center gap-2">
                <button
                  id="modal-edit-toggle-btn"
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-450 hover:underline px-2 py-1 rounded bg-blue-50 dark:bg-blue-950/20"
                >
                  <Edit2 size={12} />
                  <span>정보 수정</span>
                </button>
                {!isConfirmingDelete ? (
                  <button
                    id="modal-delete-btn"
                    onClick={() => setIsConfirmingDelete(true)}
                    className="flex items-center gap-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:underline px-2 py-1 rounded bg-rose-50 dark:bg-rose-950/20"
                  >
                    <Trash2 size={12} />
                    <span>작업 삭제</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/20 px-2 py-1 rounded border border-rose-200 dark:border-rose-900/30">
                    <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">정말 삭제하시겠습니까?</span>
                    <button
                      type="button"
                      onClick={() => {
                        onDeleteTask(task.id);
                        if (onNavigateToStatus) {
                          onNavigateToStatus('todo');
                        } else {
                          onClose();
                        }
                        setIsConfirmingDelete(false);
                      }}
                      className="text-[10px] bg-rose-600 hover:bg-rose-700 text-white font-bold px-2 py-0.5 rounded transition-colors cursor-pointer"
                    >
                      삭제
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(false)}
                      className="text-[10px] bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold px-1.5 py-0.5 rounded transition-colors cursor-pointer"
                    >
                      취소
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Content - Scrollable */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {isEditing ? (
            /* ================= EDIT MODE / CREATE MODE ================= */
            <form onSubmit={handleSave} className="space-y-4" id="task-edit-form">
              {/* Task Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-sans">작업 제목</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="예: 랜딩 페이지 레이아웃 디자인"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {/* Task Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-sans">설명</label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="이 작업의 범위, 목표 및 결과물에 대해 설명하세요..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all leading-relaxed"
                />
              </div>

              {/* Multi-column Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Status Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-sans">진행 상태</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as TaskStatus)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="todo">할 일</option>
                    <option value="inprogress">진행 중</option>
                    <option value="review">검토 중</option>
                    <option value="done">완료됨</option>
                  </select>
                </div>

                {/* Priority Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-sans">중요도 (우선순위)</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  >
                    <option value="low">낮음</option>
                    <option value="medium">보통</option>
                    <option value="high">높음</option>
                    <option value="urgent">긴급 🔥</option>
                  </select>
                </div>

                {/* Category Input */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-sans">카테고리</label>
                  <input
                    type="text"
                    required
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="예: Development, Design, Marketing"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Assignee Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-sans">작업 생성자</label>
                <input
                  type="text"
                  value={assigneeId}
                  onChange={(e) => setAssigneeId(e.target.value)}
                  placeholder="작업 생성자 이름 입력..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all"
                />
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-4">
                {task && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors"
                  >
                    취소
                  </button>
                )}
                <button
                  type="submit"
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-600/20 transition-all cursor-pointer"
                >
                  <Save size={15} />
                  <span>변경 사항 저장</span>
                </button>
              </div>
            </form>
          ) : (
             /* ================= VIEW ONLY MODE ================= */
            <div className="space-y-6" id="task-view-details">
              {/* Task Header info */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-150 text-slate-600 dark:text-slate-300">
                  <Calendar size={13} className="text-slate-400" />
                  <span>생성일: <strong>{formatCreatedAt(task?.createdAt || (task as any)?.created_at)}</strong></span>
                </span>
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h2 className="text-xl font-bold font-sans text-slate-800 dark:text-slate-100 leading-tight">
                  {title}
                </h2>
                {description ? (
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    {description}
                  </p>
                ) : (
                  <p className="text-sm italic text-slate-400">이 작업에 대한 설명이 없습니다.</p>
                )}
              </div>

              {/* Assignee Details Card */}
              <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 text-sm">
                    <User size={18} />
                  </div>
                  <div>
                    <p className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">작업 생성자</p>
                    {assigneeId ? (
                      <div>
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 leading-none mt-1.5">{assigneeId}</p>
                      </div>
                    ) : (
                      <p className="text-sm font-semibold text-slate-400 mt-1.5">미지정</p>
                    )}
                  </div>
                </div>

                {assigneeId && (
                  <div className="flex items-center gap-1">
                    <div className={`w-8 h-8 rounded-full ${getAvatarColor(assigneeId)} text-white flex items-center justify-center text-xs font-bold shadow-sm`}>
                      {getInitials(assigneeId)}
                    </div>
                  </div>
                )}
              </div>

              {/* Involved Roles Record Display */}
              <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900/50 space-y-4">
                <p className="text-[10px] font-mono uppercase text-slate-400 tracking-wider">관련 역할 및 검토 기록</p>
                
                {roleReviews && roleReviews.length > 0 ? (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                    {roleReviews.map((review) => {
                      const roleLabels: Record<string, string> = {
                        'Designer': '디자이너',
                        'PM': '기획자 (PM)',
                        'Developer': '개발자',
                        'QA': 'QA 엔지니어',
                        'Operations': '운영'
                      };
                      return (
                        <div 
                          key={review.id} 
                          className={`p-3 border rounded-xl space-y-1.5 relative group/rev transition-all duration-300 ${
                            review.urgency === 'urgent'
                              ? 'border-rose-200 dark:border-rose-950/40 bg-rose-50/40 dark:bg-rose-950/15 ring-2 ring-rose-100/60 dark:ring-rose-950/20'
                              : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30'
                          }`}
                        >
                          <div className="flex items-center justify-between pr-0 group-hover/rev:pr-6 transition-all duration-300">
                            <div className="flex items-center gap-1.5">
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-bold rounded-full border ${
                                review.urgency === 'urgent'
                                  ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-900/30'
                                  : 'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30'
                              }`}>
                                <span className={`w-1 h-1 rounded-full ${review.urgency === 'urgent' ? 'bg-rose-500' : 'bg-blue-500'}`} />
                                {roleLabels[review.role] || review.role}
                              </span>
                              {review.urgency === 'urgent' && (
                                <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-rose-600 text-white border border-rose-700 animate-pulse">
                                  <span>긴급 🔥</span>
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                              {review.createdAt}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700 dark:text-slate-355 leading-relaxed whitespace-pre-wrap">
                            {review.comment}
                          </p>

                          {/* Tagged Reviewer & Accept Section */}
                          {review.reviewerId && (
                            <div className="mt-2.5 pt-2 border-t border-slate-150/70 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 bg-slate-100/30 dark:bg-slate-950/10 p-1.5 rounded-lg">
                              <div className="flex items-center gap-1.5 text-[11px]">
                                <span className="text-slate-400 dark:text-slate-500">검토자:</span>
                                <span className="font-bold text-slate-700 dark:text-slate-300">{review.reviewerId}</span>
                                {review.isAccepted ? (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-emerald-100 dark:bg-emerald-950/65 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/35">
                                    <Check size={9} strokeWidth={3} />
                                    <span>Accept 완료</span>
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-amber-100 dark:bg-amber-950/65 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/35 animate-pulse">
                                    <span>대기 중</span>
                                  </span>
                                )}
                              </div>

                              {/* Accept Button */}
                              {!review.isAccepted ? (
                                <button
                                  type="button"
                                  onClick={() => acceptRoleReview(review.id)}
                                  className="px-2 py-1 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <CheckSquare size={10} strokeWidth={2.5} />
                                  <span>업무 Accept</span>
                                </button>
                              ) : (
                                review.acceptedAt && (
                                  <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                                    수락: {review.acceptedAt}
                                  </span>
                                )
                              )}
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => deleteRoleReview(review.id)}
                            className="absolute top-2.5 right-2.5 p-1 rounded opacity-0 group-hover/rev:opacity-100 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all cursor-pointer"
                            title="기록 삭제"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs italic text-slate-400">이 작업에 기록된 검토 내용이 없습니다.</p>
                )}

                {/* Add Review Record Form */}
                <form onSubmit={addRoleReview} className="space-y-3 pt-3 border-t border-slate-150 dark:border-slate-800/80">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">새 검토 기록 추가</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500">직무 선택</label>
                      <select
                        value={newReviewRole}
                        onChange={(e) => setNewReviewRole(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-850 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                      >
                        <option value="Developer">개발자 (Developer)</option>
                        <option value="Designer">디자이너 (Designer)</option>
                        <option value="PM">기획자 (PM)</option>
                        <option value="QA">QA 엔지니어</option>
                        <option value="Operations">운영 (Operations)</option>
                        <option value="Custom">기타 (직접 입력)</option>
                      </select>
                    </div>

                    {newReviewRole === 'Custom' && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500">직무 직접 입력</label>
                        <input
                          type="text"
                          required
                          value={customRoleText}
                          onChange={(e) => setCustomRoleText(e.target.value)}
                          placeholder="예: 마케터, 법무팀 등"
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500">다음 검토할 사람 지정 (태그)</label>
                      <input
                        type="text"
                        value={newReviewReviewerId}
                        onChange={(e) => setNewReviewReviewerId(e.target.value)}
                        placeholder="예: 홍길동 과장"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500">긴급도 선택</label>
                      <select
                        value={newReviewUrgency}
                        onChange={(e) => setNewReviewUrgency(e.target.value as 'normal' | 'urgent')}
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-850 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none font-bold"
                      >
                        <option value="normal" className="text-slate-700 font-normal">보통 (Normal)</option>
                        <option value="urgent" className="text-rose-600 font-bold">긴급 (Urgent) 🔥</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500">검토한 내용</label>
                    <textarea
                      rows={2}
                      required
                      value={newReviewComment}
                      onChange={(e) => setNewReviewComment(e.target.value)}
                      placeholder="해당 직무 관점에서 검토한 내용 및 피드백을 기록해 주세요. (추후 AI 분석에 반영됩니다)"
                      className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 outline-none leading-relaxed"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus size={13} strokeWidth={2.5} />
                      <span>기록 추가</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* "작업 체크리스트" Button placed exactly between "관련 역할 및 검토 기록" and "작업 체크리스트" */}
              <div className="py-2 space-y-3">
                <button
                  type="button"
                  onClick={handleGenerateChecklist}
                  disabled={isGeneratingChecklist || !title.trim()}
                  className="w-full py-2.5 px-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm hover:shadow-md transition-all cursor-pointer text-xs uppercase tracking-wider font-sans"
                  title={!title.trim() ? "먼저 작업 제목을 입력해주세요." : "추가된 검토 기록을 바탕으로 작업 체크리스트를 생성합니다."}
                >
                  {isGeneratingChecklist ? (
                    <>
                      <Sparkles size={13} className="animate-spin text-white" />
                      <span>작업 체크리스트 생성 중...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} className="text-white" />
                      <span>작업 체크리스트 생성</span>
                    </>
                  )}
                </button>

                {checklistError && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/35 flex items-center justify-between text-xs text-rose-700 dark:text-rose-400 font-sans">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                      <span className="font-semibold">{checklistError}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setChecklistError(null)}
                      className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg text-rose-500 hover:text-rose-700 dark:hover:text-rose-300 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Interactive Checklist Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
                  <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-sans flex items-center gap-2">
                    <ClipboardCheck size={14} className="text-blue-600" />
                    <span>작업 체크리스트 ({subtasks.filter(s => s.completed).length}/{subtasks.length})</span>
                  </h4>
                  {!task && (
                    <button
                      type="button"
                      onClick={handleGenerateChecklist}
                      disabled={isGeneratingChecklist || !title.trim()}
                      className="px-2.5 py-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded border border-indigo-200 dark:border-indigo-900/50 flex items-center gap-1 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                      title={!title.trim() ? "먼저 작업 제목을 입력해주세요." : "체크리스트를 생성합니다."}
                    >
                      {isGeneratingChecklist ? (
                        <>
                          <Sparkles size={11} className="animate-spin text-indigo-500" />
                          <span>생성 중...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={11} className="text-indigo-500" />
                          <span>자동 생성</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* "새로운 변경 사항 발생" Alert 및 재생성 버튼 */}
                {task?.hasUnreflectedReview && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-xl border border-rose-100 dark:border-rose-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 relative shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                      </span>
                      <div className="text-xs font-semibold text-rose-800 dark:text-rose-300">
                        새로운 변경 사항 발생 <span className="text-[10px] text-rose-500/80 font-mono font-medium">({task.lastReviewAddedAt})</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleGenerateChecklist}
                      disabled={isGeneratingChecklist}
                      className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-[11px] font-bold shadow-sm cursor-pointer disabled:opacity-50 flex items-center gap-1 transition-all"
                    >
                      {isGeneratingChecklist ? (
                        <>
                          <Sparkles size={11} className="animate-spin" />
                          <span>체크리스트 생성 중...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={11} />
                          <span>변경 사항 반영하여 작업 체크리스트 생성</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Subtasks List */}
                {subtasks.length === 0 ? (
                  <p className="text-xs italic text-slate-400 dark:text-slate-500 py-2">아직 등록된 체크리스트 항목이 없습니다.</p>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {subtasks.map((st) => (
                      <div
                        key={st.id}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-200 dark:hover:border-slate-700 transition-colors group/sub"
                      >
                        <button
                          onClick={() => toggleSubtask(st.id)}
                          className="flex items-center gap-3 text-left flex-1"
                        >
                          {st.completed ? (
                            <CheckSquare size={17} className="text-emerald-500 shrink-0" />
                          ) : (
                            <Square size={17} className="text-slate-300 dark:text-slate-600 shrink-0 hover:text-blue-500" />
                          )}
                          <span className={`text-xs ${st.completed ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                            {st.title}
                          </span>
                        </button>
                        
                        <button
                          onClick={() => removeSubtask(st.id)}
                          className="p-1 rounded opacity-0 group-hover/sub:opacity-100 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition-all"
                          title="하위 작업 삭제"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Subtask Form */}
                <form onSubmit={addSubtask} className="flex gap-2" id="subtask-add-form">
                  <input
                    type="text"
                    required
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="체크리스트 항목 추가..."
                    className="flex-1 px-3 py-2 rounded-lg border border-slate-250 dark:border-slate-750 bg-white dark:bg-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus size={13} strokeWidth={2.5} />
                    <span>추가</span>
                  </button>
                </form>
              </div>

              {/* Graphical Workflow Visualization */}
              <div className="pt-6 border-t border-slate-100 dark:border-slate-850 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider font-sans flex items-center gap-2">
                    <BarChart size={14} className="text-blue-600" />
                    <span>작업 프로세스 흐름도 (Workflow Diagram)</span>
                  </h4>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400 font-bold">
                    실시간 동기화
                  </span>
                </div>

                {/* Manual Status Transition Buttons */}
                {task && (
                  <div className="p-3 border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={12} className="text-blue-500 animate-pulse" />
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">수동 작업 단계 변경</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleStatusChangeAndRedirect('review')}
                        disabled={status === 'review'}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 hover:bg-amber-100 dark:hover:bg-amber-950/40 border border-amber-200/50 dark:border-amber-900/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center gap-1"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>검토 중으로 변경</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusChangeAndRedirect('done')}
                        disabled={status === 'done'}
                        className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 hover:bg-emerald-100 dark:hover:bg-emerald-950/40 border border-emerald-200/50 dark:border-emerald-900/30 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all flex items-center gap-1"
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        <span>완료됨으로 변경</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 1. Kanban Stage Flowbar */}
                <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                  <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">현재 작업 단계</p>
                  <div className="grid grid-cols-4 gap-2 relative">
                    {/* Connecting lines background */}
                    <div className="absolute top-4 left-[12%] right-[12%] h-[2px] bg-slate-200 dark:bg-slate-800 -z-0" />
                    
                    {/* Active/Completed lines overlays */}
                    <div 
                      className="absolute top-4 left-[12%] h-[2px] bg-blue-500 transition-all duration-500 -z-0" 
                      style={{
                        width: status === 'todo' ? '0%' : 
                               status === 'inprogress' ? '33%' : 
                               status === 'review' ? '66%' : '76%'
                      }}
                    />

                    {/* Step 1: 할 일 */}
                    <div className="flex flex-col items-center text-center z-10">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-[11px] font-bold transition-all duration-300 ${
                        status === 'todo' 
                          ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/25 ring-4 ring-blue-100 dark:ring-blue-950/45 scale-110'
                          : ['inprogress', 'review', 'done'].includes(status)
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600'
                      }`}>
                        {['inprogress', 'review', 'done'].includes(status) ? '✓' : '1'}
                      </div>
                      <span className={`text-[10px] font-bold mt-2 transition-colors ${
                        status === 'todo' ? 'text-blue-600 dark:text-blue-450' : 'text-slate-500 dark:text-slate-400'
                      }`}>할 일</span>
                    </div>

                    {/* Step 2: 진행 중 */}
                    <div className="flex flex-col items-center text-center z-10">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-[11px] font-bold transition-all duration-300 ${
                        status === 'inprogress'
                          ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/25 ring-4 ring-blue-100 dark:ring-blue-950/45 scale-110'
                          : ['review', 'done'].includes(status)
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600'
                      }`}>
                        {['review', 'done'].includes(status) ? '✓' : '2'}
                      </div>
                      <span className={`text-[10px] font-bold mt-2 transition-colors ${
                        status === 'inprogress' ? 'text-blue-600 dark:text-blue-450' : 'text-slate-500 dark:text-slate-400'
                      }`}>진행 중</span>
                    </div>

                    {/* Step 3: 검토 중 */}
                    <div className="flex flex-col items-center text-center z-10">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-[11px] font-bold transition-all duration-300 ${
                        status === 'review'
                          ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/25 ring-4 ring-blue-100 dark:ring-blue-950/45 scale-110'
                          : status === 'done'
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600'
                      }`}>
                        {status === 'done' ? '✓' : '3'}
                      </div>
                      <span className={`text-[10px] font-bold mt-2 transition-colors ${
                        status === 'review' ? 'text-blue-600 dark:text-blue-450' : 'text-slate-500 dark:text-slate-400'
                      }`}>검토 중</span>
                    </div>

                    {/* Step 4: 완료됨 */}
                    <div className="flex flex-col items-center text-center z-10">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 text-[11px] font-bold transition-all duration-300 ${
                        status === 'done'
                          ? 'bg-emerald-600 border-emerald-600 text-white shadow-lg shadow-emerald-500/25 ring-4 ring-emerald-100 dark:ring-emerald-950/45 scale-110'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600'
                      }`}>
                        4
                      </div>
                      <span className={`text-[10px] font-bold mt-2 transition-colors ${
                        status === 'done' ? 'text-emerald-600 dark:text-emerald-455' : 'text-slate-500 dark:text-slate-400'
                      }`}>완료됨</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Completion Prompt Overlay */}
        {showCompletionPrompt && (
          <div className="absolute inset-0 bg-slate-900/85 backdrop-blur-md flex flex-col items-center justify-center p-8 z-50 text-center animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mb-5 animate-bounce shadow-lg shadow-emerald-500/10">
              <ClipboardCheck size={32} strokeWidth={2.5} />
            </div>
            
            <h3 className="text-lg font-black text-white font-sans tracking-tight">
              축하합니다! 모든 하위 작업이 완료되었습니다 🎉
            </h3>
            
            <p className="text-sm text-slate-200 max-w-md mt-4 leading-relaxed">
              체크리스트의 모든 항목이 성공적으로 마쳐졌습니다. 이 작업을 <strong className="text-white font-bold">다음 단계(검토 중 또는 완료됨)</strong>로 이동하시겠습니까?
            </p>

            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm mt-8">
              {/* Option 1: 검토 중 단계로 이동 */}
              <button
                type="button"
                onClick={() => handleStatusChangeAndRedirect('review')}
                className="flex-1 px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-md shadow-amber-600/20 transition-all cursor-pointer flex flex-col items-center gap-1.5"
              >
                <span>검토 중 (Review)</span>
                <span className="text-[10px] text-white/70 font-medium">검토 단계 페이지로 이동</span>
              </button>

              {/* Option 2: 완료됨 단계로 이동 */}
              <button
                type="button"
                onClick={() => handleStatusChangeAndRedirect('done')}
                className="flex-1 px-4 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all cursor-pointer flex flex-col items-center gap-1.5"
              >
                <span>완료됨 (Done)</span>
                <span className="text-[10px] text-white/70 font-medium">완료 단계 페이지로 이동</span>
              </button>
            </div>

            {/* Option 3: 취소 / 현재 단계 유지 */}
            <button
              type="button"
              onClick={() => setShowCompletionPrompt(false)}
              className="mt-8 text-sm text-slate-300 hover:text-rose-400 underline underline-offset-4 decoration-slate-500/60 hover:decoration-rose-400/60 transition-all font-semibold cursor-pointer px-4 py-2 hover:bg-white/5 rounded-lg"
            >
              현재 단계 유지하기 (취소)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
