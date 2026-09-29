export type ApplicationStatus =
  | 'Applied'
  | 'Under Review'
  | 'Shortlisted'
  | 'Interview'
  | 'Technical Round'
  | 'HR Round'
  | 'Offer'
  | 'Selected'
  | 'Rejected'
  | 'Withdrawn';

export type WorkType = 'Remote' | 'Hybrid' | 'On-site';
export type EmploymentType =
  | 'Full-time'
  | 'Part-time'
  | 'Contract'
  | 'Internship'
  | 'Freelance'
  | 'Temporary';

export type EventType =
  | 'Application Submitted'
  | 'Under Review'
  | 'Follow-up'
  | 'Recruiter Contacted'
  | 'Shortlisted'
  | 'Interview Scheduled'
  | 'Technical Interview'
  | 'HR Interview'
  | 'Offer Received'
  | 'Selected'
  | 'Rejected'
  | 'Withdrawn'
  | 'Custom Event';

export type ReminderType =
  | 'Follow-up'
  | 'Interview'
  | 'Application Deadline'
  | 'Recruiter Response'
  | 'Custom Reminder';

export interface User {
  id: number;
  full_name: string;
  email: string;
  created_at: string;
  is_demo: boolean;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Application {
  id: number;
  job_title: string;
  company_name: string;
  location: string | null;
  work_type: WorkType | null;
  employment_type: EmploymentType | null;
  job_description: string | null;
  required_skills: string[];
  experience_required: string | null;
  salary: string | null;
  job_url: string | null;
  application_date: string;
  deadline: string | null;
  status: ApplicationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationDetail extends Application {
  timeline: TimelineEvent[];
  reminders: Reminder[];
}

export interface ApplicationPayload {
  job_title: string;
  company_name: string;
  location: string | null;
  work_type: WorkType | null;
  employment_type: EmploymentType | null;
  job_description: string | null;
  required_skills: string[];
  experience_required: string | null;
  salary: string | null;
  job_url: string | null;
  application_date: string;
  deadline: string | null;
  notes: string | null;
  status?: ApplicationStatus | null;
}

export interface ApplicationFilters {
  search?: string;
  status?: ApplicationStatus | '';
  work_type?: WorkType | '';
  date_from?: string;
  date_to?: string;
  sort?: 'newest' | 'oldest' | 'deadline' | 'company' | 'title';
}

export interface StatusUpdatePayload {
  status: ApplicationStatus;
  note?: string | null;
  event_date?: string;
  event_time?: string | null;
}

export interface ExtractedDetails {
  job_title: string | null;
  company_name: string | null;
  location: string | null;
  work_type: WorkType | null;
  employment_type: EmploymentType | null;
  required_skills: string[];
  experience_required: string | null;
  salary: string | null;
  found_fields: string[];
  method: 'local' | 'ai';
  message: string | null;
}

export interface TimelineEvent {
  id: number;
  application_id: number;
  event_type: EventType;
  event_date: string;
  event_time: string | null;
  notes: string | null;
  created_at: string;
}

export interface TimelineFeedItem extends TimelineEvent {
  job_title: string;
  company_name: string;
}

export interface TimelineEventPayload {
  event_type: EventType;
  event_date: string;
  event_time: string | null;
  notes: string | null;
}

export interface Reminder {
  id: number;
  user_id: number;
  application_id: number | null;
  title: string;
  reminder_date: string;
  reminder_time: string | null;
  type: ReminderType;
  notes: string | null;
  completed: boolean;
  created_at: string;
  job_title: string | null;
  company_name: string | null;
}

export interface ReminderPayload {
  title: string;
  reminder_date: string;
  reminder_time: string | null;
  type: ReminderType;
  notes: string | null;
  application_id: number | null;
}

export interface DashboardStats {
  summary: {
    total: number;
    applied: number;
    under_review: number;
    shortlisted: number;
    interviews: number;
    offers: number;
    rejected: number;
    withdrawn: number;
  };
  by_status: { status: ApplicationStatus; count: number }[];
  applications_over_time: { month: string; label: string; count: number }[];
  interviews_over_time: { month: string; label: string; count: number }[];
  funnel: { stage: string; count: number }[];
  interview_rate: number;
  offer_rate: number;
  overdue_reminders: number;
  upcoming_interviews: {
    event_id: number;
    application_id: number;
    job_title: string;
    company_name: string;
    event_type: EventType;
    event_date: string;
    event_time: string | null;
  }[];
  upcoming_deadlines: {
    application_id: number;
    job_title: string;
    company_name: string;
    deadline: string;
    days_left: number;
    status: ApplicationStatus;
  }[];
  upcoming_reminders: {
    id: number;
    title: string;
    type: ReminderType;
    reminder_date: string;
    reminder_time: string | null;
    application_id: number | null;
    company_name: string | null;
  }[];
  recent_applications: {
    id: number;
    job_title: string;
    company_name: string;
    location: string | null;
    status: ApplicationStatus;
    application_date: string;
  }[];
  recent_activity: {
    event_id: number;
    application_id: number;
    job_title: string;
    company_name: string;
    event_type: EventType;
    event_date: string;
    event_time: string | null;
    notes: string | null;
    created_at: string;
  }[];
}
