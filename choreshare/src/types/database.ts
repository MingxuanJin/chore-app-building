// ============================================================
// ChoreShare Database Types
// Maps directly to Supabase tables defined in the PRD
// ============================================================

export type TaskStatus = "pending" | "claimed" | "in_progress" | "review" | "completed" | "rejected";
export type RecurrenceType = "none" | "daily" | "every_n_days" | "weekly" | "monthly" | "custom";
export type RewardType = "redeem" | "milestone";
export type ReviewStatus = "approved" | "rejected";

// interval: every_n_days, days: weekly (0 = Sunday), day: monthly,
// open: recurring task goes back to "待认领" instead of the same person
export interface RecurrenceValue {
  interval?: number;
  days?: number[];
  day?: number;
  open?: boolean;
}

export interface Family {
  id: string;
  name: string;
  pair_code: string;
  created_by: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  name: string;
  avatar_url: string | null;
  family_id: string | null;
  created_at: string;
}

export interface Task {
  id: string;
  family_id: string;
  title: string;
  description: string | null;
  difficulty: number; // 1-5
  estimated_minutes: number | null;
  recurrence_type: RecurrenceType;
  recurrence_value: RecurrenceValue | null;
  assigned_to: string | null;
  created_by: string;
  status: TaskStatus;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskSession {
  id: string;
  task_id: string;
  user_id: string;
  started_at: string;
  paused_at: string | null;
  ended_at: string | null;
  paused_duration_seconds: number;
  actual_minutes: number | null;
}

export interface TaskReview {
  id: string;
  task_id: string;
  reviewer_id: string;
  status: ReviewStatus;
  comment: string | null;
  points_awarded: number | null;
  earned_by: string | null;
  created_at: string;
}

export type MilestoneType = "streak_days" | "monthly_completion" | "total_tasks" | "total_points";

export interface MilestoneCondition {
  type: MilestoneType;
  target: number;
}

export interface Reward {
  id: string;
  family_id: string;
  name: string;
  description: string | null;
  cost_points: number | null; // null for milestone type
  reward_type: RewardType;
  milestone_condition: MilestoneCondition | null; // null for redeem type
  created_by: string;
  is_active: boolean;
  created_at: string;
}

export interface Redemption {
  id: string;
  reward_id: string;
  user_id: string;
  points_spent: number;
  is_fulfilled: boolean;
  period_key: string | null; // set for milestone unlocks
  seen_at: string | null; // when the unlocker saw the celebration
  created_at: string;
}

export interface ShoppingItem {
  id: string;
  family_id: string;
  name: string;
  added_by: string;
  assigned_to: string | null;
  is_purchased: boolean;
  purchased_by: string | null;
  purchased_at: string | null;
  created_at: string;
}

// ============================================================
// Joined / computed types for UI
// ============================================================

export interface TaskWithAssignee extends Task {
  assignee?: Pick<Profile, "id" | "name" | "avatar_url">;
  creator?: Pick<Profile, "id" | "name" | "avatar_url">;
}

export interface MilestoneProgress {
  reward_id: string;
  user_id: string;
  progress: number;
  target: number;
}

export interface UserPoints {
  user_id: string;
  total_earned: number;
  total_spent: number;
  balance: number;
}
