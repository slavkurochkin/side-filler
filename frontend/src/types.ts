export interface Bullet {
  id: string
  content: string
  sort_order: number
}

export interface Entry {
  id: string
  title: string
  subtitle?: string
  location?: string
  start_date?: string
  end_date?: string
  is_current: boolean
  description?: string
  sort_order: number
  bullets: Bullet[]
}

export interface Section {
  id: string
  section_type: 'experience' | 'education' | 'projects' | 'skills' | 'certificates' | 'custom'
  title: string
  sort_order: number
  entries: Entry[]
}

export interface Resume {
  id: string
  name: string
  title?: string
  email?: string
  phone?: string
  website?: string
  linkedin?: string
  github?: string
  summary?: string
  created_at: string
  updated_at: string
  sections?: Section[]
}

export interface SavedUrl {
  id: string
  resume_id?: string
  url: string
  title?: string
  notes?: string
  status: 'saved' | 'applied' | 'interviewing' | 'rejected' | 'offer'
  created_at: string
  updated_at: string
}

export interface JobSearchCycle {
  id: string
  name: string
  start_date: string
  end_date?: string
  is_active: boolean
  notes?: string
  created_at: string
  updated_at: string
  application_count?: number
}

export interface Application {
  id: string
  cycle_id: string
  job_description_id?: string
  company_name: string
  job_title: string
  status: 'interested' | 'applied' | 'interviewing' | 'offer' | 'rejected' | 'withdrawn' | 'accepted'
  applied_date?: string
  interview_date?: string
  interview_type?: string
  reply_received: boolean | null // null = waiting, false = no reply, true = reply received
  reply_date?: string
  notes?: string
  job_posting_url?: string
  salary_range?: string
  location?: string
  created_at: string
  updated_at: string
  job_description_title?: string
  job_description_url?: string
  cycle_name?: string
}

export interface ApplicationStats {
  total_applications: number
  applied_count: number
  interviewing_count: number
  offer_count: number
  rejected_count: number
  accepted_count: number
  replied_count: number
  no_reply_count: number
  waiting_reply_count: number
  interviews_scheduled: number
}

