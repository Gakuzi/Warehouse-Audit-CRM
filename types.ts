
export interface Project {
  id: string;
  created_at: string;
  user_id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string | null;
  approval_period: ApprovalPeriod;
}

export type ApprovalPeriod = 'weekly' | 'monthly';

export interface Week {
  id: string;
  project_id: string;
  user_id: string;
  title: string;
  plan: Plan;
  status: WeekStatus;
  start_date?: string | null;
  end_date?: string | null;
}

export type WeekStatus = 'draft' | 'pending_approval' | 'approved' | 'changes_requested' | 'pending_changes_approval';

export interface Plan {
  [date: string]: DayPlan;
}

export interface DayPlan {
  tasks: PlanItem[];
}

export type PlanItemType = 'task' | 'meeting' | 'interview' | 'doc_review' | 'observation';

export interface PlanItem {
  id: string;
  type: PlanItemType;
  content: string;
  completed: boolean;
  data?: {
    // Task specific
    checklist?: { id: string; text: string; completed: boolean }[];
    // Meeting specific
    time?: string;
    location?: string;
    participants?: string[];
    agenda?: string;
    summary?: string;
    decisions?: string;
    // Interview specific
    interviewee?: string;
    // Doc Review specific
    documents?: { id: string; name: string }[];
    findings?: string;
    // Observation specific
    process_observed?: string;
    strengths?: string;
    weaknesses?: string;
    recommendations?: string;
  };
  event_count?: number;
}


export interface Profile {
  id: string;
  updated_at?: string;
  full_name?: string;
  phone?: string;
  whatsapp?: string;
  telegram?: string;
  // Fix: Add missing properties for Telegram bot integration to align with their usage in ProfileModal.tsx.
  telegram_bot_token?: string;
  telegram_chat_id?: string;
}

export interface Event {
    id: string;
    created_at: string;
    week_id: string;
    task_id: string;
    user_id: string;
    project_id: string;
    author_email?: string;
    type: 'comment' | 'meeting' | 'documentation_review' | 'interview' | 'file_upload' | 'inspection';
    content: string; 
    
    // Linked reply
    parent_event_id?: string | null;

    // Type-specific data stored in a JSONB field
    data?: {
      meeting_time?: string; 
      participants?: string[];
      file_urls?: { name: string, url: string, type?: string }[];
    };
    
    // For displaying quotes, populated by the SELECT query
    parent?: {
      content: string;
      author_email: string;
    } | null;
}