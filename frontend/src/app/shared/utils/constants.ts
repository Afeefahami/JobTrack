import {
  ApplicationStatus,
  EmploymentType,
  EventType,
  ReminderType,
  WorkType,
} from '../../core/models/models';

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  'Applied',
  'Under Review',
  'Shortlisted',
  'Interview',
  'Technical Round',
  'HR Round',
  'Offer',
  'Selected',
  'Rejected',
  'Withdrawn',
];

export const WORK_TYPES: WorkType[] = ['Remote', 'Hybrid', 'On-site'];

export const EMPLOYMENT_TYPES: EmploymentType[] = [
  'Full-time',
  'Part-time',
  'Contract',
  'Internship',
  'Freelance',
  'Temporary',
];

export const EVENT_TYPES: EventType[] = [
  'Application Submitted',
  'Under Review',
  'Follow-up',
  'Recruiter Contacted',
  'Shortlisted',
  'Interview Scheduled',
  'Technical Interview',
  'HR Interview',
  'Offer Received',
  'Selected',
  'Rejected',
  'Withdrawn',
  'Custom Event',
];

export const REMINDER_TYPES: ReminderType[] = [
  'Follow-up',
  'Interview',
  'Application Deadline',
  'Recruiter Response',
  'Custom Reminder',
];

/** Colour family used for each status (see the --tone-* variables in styles.css). */
export const STATUS_TONE: Record<ApplicationStatus, string> = {
  Applied: 'slate',
  'Under Review': 'amber',
  Shortlisted: 'violet',
  Interview: 'blue',
  'Technical Round': 'indigo',
  'HR Round': 'indigo',
  Offer: 'green',
  Selected: 'green',
  Rejected: 'red',
  Withdrawn: 'gray',
};

export const EVENT_TONE: Record<EventType, string> = {
  'Application Submitted': 'slate',
  'Under Review': 'amber',
  'Follow-up': 'teal',
  'Recruiter Contacted': 'teal',
  Shortlisted: 'violet',
  'Interview Scheduled': 'blue',
  'Technical Interview': 'indigo',
  'HR Interview': 'indigo',
  'Offer Received': 'green',
  Selected: 'green',
  Rejected: 'red',
  Withdrawn: 'gray',
  'Custom Event': 'slate',
};

export const EVENT_ICON: Record<EventType, string> = {
  'Application Submitted': 'send',
  'Under Review': 'eye',
  'Follow-up': 'mail',
  'Recruiter Contacted': 'phone',
  Shortlisted: 'star',
  'Interview Scheduled': 'video',
  'Technical Interview': 'code',
  'HR Interview': 'users',
  'Offer Received': 'award',
  Selected: 'check-circle',
  Rejected: 'x-circle',
  Withdrawn: 'undo',
  'Custom Event': 'flag',
};

export const REMINDER_ICON: Record<ReminderType, string> = {
  'Follow-up': 'mail',
  Interview: 'video',
  'Application Deadline': 'calendar',
  'Recruiter Response': 'phone',
  'Custom Reminder': 'bell',
};
