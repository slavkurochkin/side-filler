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

