export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'todo' | 'inprogress' | 'review' | 'done';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface RoleReview {
  id: string;
  role: string;
  comment: string;
  createdAt: string;
  reviewerId?: string;
  isAccepted?: boolean;
  acceptedAt?: string;
  urgency?: 'normal' | 'urgent';
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: string;
  assigneeId: string;
  subtasks: SubTask[];
  createdAt: string;
  roles?: string[];
  roleReviews?: RoleReview[];
  hasUnreflectedReview?: boolean;
  lastReviewAddedAt?: string;
}

export interface Activity {
  id: string;
  userName: string;
  userAvatarColor: string;
  userAvatarText: string;
  action: string;
  targetName: string;
  timestamp: string;
}
