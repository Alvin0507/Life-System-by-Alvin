export type DayMode = string // key of one of the user's modes; default seeded: 'normal' | 'combat' | 'field'
export type TaskCategory = 'win_condition' | 'client' | 'social' | 'growth' | 'non_neg'
export type ClientName = string // user-scoped logical key; default seeded: 'bitget' | 'hunter' | 'zaizai' | 'furniture'
export type RevenueStatus = 'pending' | 'in_progress' | 'received'
export type TaskStatus = 'not_started' | 'in_progress' | 'done'
export type TripDuration = 'full' | 'half'

export interface Client {
  id: string
  user_id: string
  key: string
  label: string
  color: string
  revenue: number
  script_target: number
  edit_target: number
  sort_order: number
  archived: boolean
  created_at: string
}

export interface Task {
  id: string
  date: string
  category: TaskCategory
  client?: ClientName
  content: string
  completed: boolean
  target_count?: number
  created_at: string
}

export interface DailyNote {
  id: string
  date: string
  completed_summary: string
  blocked_by: string
  tomorrow_focus: string
  day_mode: DayMode
}

export interface MonthlyOutput {
  id: string
  year_month: string
  client: ClientName
  script_done: number
  script_target: number
  edit_done: number
  edit_target: number
  threads_done: number
  revenue_status: RevenueStatus
}

export interface FieldTrip {
  id: string
  trip_date: string
  client: ClientName
  duration: TripDuration
  notes: string
}

export interface Deadline {
  id: string
  due_date: string
  client: ClientName
  deliverable: string
  status: TaskStatus
}

export interface LearningLog {
  id: string
  log_date: string
  topic: string
  notes: string
}

export interface Inspiration {
  id: string
  content: string
  tags: string[]
  created_at: string
}

export interface WeeklyReview {
  id: string
  week_start: string
  went_well: string
  improve: string
  next_week_focus: string
}

export interface ToastItem {
  id: string
  message: string
  type: 'success' | 'info' | 'warning' | 'achievement'
  duration?: number
}

export interface ClientConfig {
  label: string
  revenue: number
  color: string
  scriptTarget: number
  editTarget: number
}
