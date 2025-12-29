// ApplicationsTracker Component v2.0 - FULL VERSION - NO TEST CODE
// Last updated: 2025-12-28 18:45:00
import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Briefcase, Plus, Edit3, Trash2, Filter, X, Calendar, MapPin, 
  DollarSign, ExternalLink, CheckCircle2, Clock, FileText, 
  TrendingUp, ChevronDown, Save, AlertCircle, GitBranch, User, MessageSquare
} from 'lucide-react'
import { JobSearchCycle, Application, ApplicationStats, ApplicationEvent } from '../types'

// Module loaded successfully

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const INTERVIEW_TYPES = [
  { value: 'recruiter', label: 'Recruiter' },
  { value: 'hiring_manager', label: 'Hiring Manager' },
  { value: 'technical', label: 'Technical' },
  { value: 'behavioral', label: 'Behavioral' },
  { value: 'system_design', label: 'System Design' },
  { value: 'final', label: 'Final' },
  { value: 'phone_screen', label: 'Phone Screen' },
  { value: 'onsite', label: 'Onsite' },
  { value: 'virtual', label: 'Virtual' },
  { value: 'other', label: 'Other' }
]

// Primary event types that map directly to statuses
const PRIMARY_EVENT_TYPES = [
  { value: 'interested', label: 'Interested', icon: Briefcase },
  { value: 'applied', label: 'Applied', icon: Briefcase },
  { value: 'interview', label: 'Interview', icon: User },
  { value: 'offer', label: 'Offer', icon: CheckCircle2 },
  { value: 'rejected', label: 'Rejected', icon: X },
  { value: 'withdrawn', label: 'Withdrawn', icon: X },
  { value: 'accepted', label: 'Accepted', icon: CheckCircle2 }
]

// Secondary event types (intermediate events that don't map to statuses)
const SECONDARY_EVENT_TYPES = [
  { value: 'recruiter_contacted', label: 'Recruiter Contacted', icon: MessageSquare },
  { value: 'follow_up', label: 'Follow Up', icon: Clock },
  { value: 'other', label: 'Other', icon: FileText }
]

// All event types combined
const EVENT_TYPES = [...PRIMARY_EVENT_TYPES, ...SECONDARY_EVENT_TYPES]

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  interested: { bg: 'rgba(99, 102, 241, 0.1)', text: 'rgb(99, 102, 241)', border: 'rgb(99, 102, 241)' },
  applied: { bg: 'rgba(59, 130, 246, 0.1)', text: 'rgb(59, 130, 246)', border: 'rgb(59, 130, 246)' },
  recruiter_contacted: { bg: 'rgba(139, 92, 246, 0.1)', text: 'rgb(139, 92, 246)', border: 'rgb(139, 92, 246)' },
  interviewing: { bg: 'rgba(245, 158, 11, 0.1)', text: 'rgb(245, 158, 11)', border: 'rgb(245, 158, 11)' },
  follow_up: { bg: 'rgba(251, 191, 36, 0.1)', text: 'rgb(251, 191, 36)', border: 'rgb(251, 191, 36)' },
  offer: { bg: 'rgba(34, 197, 94, 0.1)', text: 'rgb(34, 197, 94)', border: 'rgb(34, 197, 94)' },
  rejected: { bg: 'rgba(239, 68, 68, 0.1)', text: 'rgb(239, 68, 68)', border: 'rgb(239, 68, 68)' },
  withdrawn: { bg: 'rgba(107, 114, 128, 0.1)', text: 'rgb(107, 114, 128)', border: 'rgb(107, 114, 128)' },
  accepted: { bg: 'rgba(16, 185, 129, 0.1)', text: 'rgb(16, 185, 129)', border: 'rgb(16, 185, 129)' },
  other: { bg: 'rgba(156, 163, 175, 0.1)', text: 'rgb(156, 163, 175)', border: 'rgb(156, 163, 175)' }
}

// Map event types to application statuses
// All events now map directly to statuses
const EVENT_TO_STATUS_MAP: Record<string, Application['status']> = {
  interested: 'interested',
  applied: 'applied',
  recruiter_contacted: 'recruiter_contacted',
  interview: 'interviewing',
  follow_up: 'follow_up',
  offer: 'offer',
  rejected: 'rejected',
  withdrawn: 'withdrawn',
  accepted: 'accepted',
  other: 'other'
}

// Map application statuses to event types (for creating missing events)
const STATUS_TO_EVENT_MAP: Record<Application['status'], string> = {
  interested: 'interested',
  applied: 'applied',
  recruiter_contacted: 'recruiter_contacted',
  interviewing: 'interview',
  follow_up: 'follow_up',
  offer: 'offer',
  rejected: 'rejected',
  withdrawn: 'withdrawn',
  accepted: 'accepted',
  other: 'other'
}

// Helper function to get status from last event
const getStatusFromLastEvent = (events?: ApplicationEvent[]): Application['status'] | null => {
  if (!events || events.length === 0) return null
  // Get the last event (events are sorted by date)
  const lastEvent = events[events.length - 1]
  return EVENT_TO_STATUS_MAP[lastEvent.event_type] || null
}

// Helper function to check if status has corresponding event
const hasEventForStatus = (status: Application['status'], events?: ApplicationEvent[]): boolean => {
  if (!events || events.length === 0) return false
  const expectedEventType = STATUS_TO_EVENT_MAP[status]
  if (!expectedEventType) return true // Status doesn't need an event
  return events.some(event => event.event_type === expectedEventType)
}

// Event type priority for ordering (lower number = earlier in timeline)
const EVENT_PRIORITY: Record<string, number> = {
  interested: 1,
  applied: 2,
  recruiter_contacted: 3,
  interview: 4,
  follow_up: 5,
  offer: 6,
  rejected: 7,
  withdrawn: 8,
  accepted: 9,
  other: 10
}

// Helper function to get appropriate date for event based on status
const getEventDateForStatus = (status: Application['status'], app: Application): string => {
  // If status is interested, use a date before applied_date
  if (status === 'interested' && app.applied_date) {
    const appliedDate = new Date(app.applied_date)
    appliedDate.setDate(appliedDate.getDate() - 1) // One day before applied date
    return appliedDate.toISOString().split('T')[0]
  }
  // For other statuses, use applied_date or current date
  return app.applied_date || new Date().toISOString().split('T')[0]
}

// Applications Tracker Component - v2.0
interface ApplicationsTrackerProps {
  onControlsReady?: (controls: React.ReactNode) => void
}

export function ApplicationsTracker({ onControlsReady }: ApplicationsTrackerProps = {}) {
  const [cycles, setCycles] = useState<JobSearchCycle[]>([])
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [stats, setStats] = useState<ApplicationStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [showCycleModal, setShowCycleModal] = useState(false)
  const [showApplicationModal, setShowApplicationModal] = useState(false)
  const [editingApplication, setEditingApplication] = useState<Application | null>(null)
  const [cycleForm, setCycleForm] = useState({ name: '', start_date: '', end_date: '', notes: '', is_active: true })
  const [applicationForm, setApplicationForm] = useState({
    company_name: '',
    job_title: '',
    status: 'applied' as Application['status'],
    applied_date: '',
    interview_date: '',
    interview_type: '',
    notes: '',
    job_posting_url: '',
    salary_range: '',
    location: '',
    job_description_id: ''
  })
  const [jobDescriptions, setJobDescriptions] = useState<Array<{ id: string; title: string | null }>>([])
  const [isCreatingNewJobDescription, setIsCreatingNewJobDescription] = useState(false)
  const [newJobDescriptionContent, setNewJobDescriptionContent] = useState('')
  const [newJobDescriptionTitle, setNewJobDescriptionTitle] = useState('')
  const [isSavingJobDescription, setIsSavingJobDescription] = useState(false)
  const [isCycleDropdownOpen, setIsCycleDropdownOpen] = useState(false)
  const cycleDropdownRef = useRef<HTMLDivElement>(null)
  const [editingField, setEditingField] = useState<{ appId: string; field: string } | null>(null)
  const [editingStatus, setEditingStatus] = useState<string | null>(null)
  const [expandedTimeline, setExpandedTimeline] = useState<Set<string>>(new Set())
  const [isCurrentlyInterviewingExpanded, setIsCurrentlyInterviewingExpanded] = useState(true)
  const [isStatsExpanded, setIsStatsExpanded] = useState(false)
  const [editingEvent, setEditingEvent] = useState<{ appId: string; eventId: string | null } | null>(null)
  const [eventForm, setEventForm] = useState({
    event_type: 'applied' as ApplicationEvent['event_type'],
    interview_type: '',
    event_date: '',
    notes: '',
    result: null as 'pass' | 'fail' | null
  })
  const editInputRef = useRef<HTMLInputElement | null>(null)
  const initialEditValueRef = useRef<string>('')
  const statusSelectRef = useRef<HTMLSelectElement | null>(null)
  
  const setEditInputRef = (element: HTMLInputElement | HTMLSelectElement | null) => {
    editInputRef.current = element as HTMLInputElement | null
    if (element) {
      // Use requestAnimationFrame to ensure the element is fully mounted and DOM is updated
      requestAnimationFrame(() => {
        if (element) {
          element.focus()
          // Only call select() on input elements, not select elements
          if (element instanceof HTMLInputElement) {
            element.select()
          }
        }
      })
    }
  }

  useEffect(() => {
    fetchCycles()
    fetchJobDescriptions()
  }, [])

  useEffect(() => {
    if (selectedCycleId) {
      fetchApplications()
      fetchStats()
    } else {
      // Try to get active cycle
      const activeCycle = cycles.find(c => c.is_active)
      if (activeCycle) {
        setSelectedCycleId(activeCycle.id)
      } else if (cycles.length > 0) {
        setSelectedCycleId(cycles[0].id)
      }
    }
  }, [selectedCycleId, cycles])

  // Close cycle dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cycleDropdownRef.current && !cycleDropdownRef.current.contains(event.target as Node)) {
        setIsCycleDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchCycles = async () => {
    console.log('🔵 fetchCycles called, API_URL:', API_URL)
    try {
      const url = `${API_URL}/applications/cycles`
      console.log('🔵 Fetching cycles from:', url)
      const response = await fetch(url)
      console.log('🔵 Cycles response:', response.status, response.ok)
      if (response.ok) {
        const data = await response.json()
        console.log('🔵 Cycles data received:', data)
        setCycles(data)
        setIsLoading(false)
      } else {
        console.error('🔴 Failed to fetch cycles - response not ok:', response.status)
        setIsLoading(false)
      }
    } catch (error) {
      console.error('🔴 Failed to fetch cycles - error:', error)
      setIsLoading(false)
    }
  }

  const fetchJobDescriptions = async () => {
    try {
      const response = await fetch(`${API_URL}/job-descriptions`)
      if (response.ok) {
        const data = await response.json()
        setJobDescriptions(data.map((jd: any) => ({ id: jd.id, title: jd.title || `Job Description ${new Date(jd.created_at).toLocaleDateString()}` })))
      }
    } catch (error) {
      console.error('Failed to fetch job descriptions:', error)
    }
  }

  const handleSaveNewJobDescription = async () => {
    if (!newJobDescriptionContent.trim()) {
      alert('Job description content is required')
      return
    }

    try {
      setIsSavingJobDescription(true)
      const url = applicationForm.job_posting_url || ''
      const response = await fetch(`${API_URL}/job-descriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newJobDescriptionContent,
          title: newJobDescriptionTitle.trim() || null,
          job_posting_url: url.trim() || null
        })
      })

      if (response.ok) {
        const data = await response.json()
        // Refresh job descriptions list
        await fetchJobDescriptions()
        // Select the newly created job description
        setApplicationForm({ ...applicationForm, job_description_id: data.id })
        // Reset new job description state
        setIsCreatingNewJobDescription(false)
        setNewJobDescriptionContent('')
        setNewJobDescriptionTitle('')
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to save job description' }))
        alert(`Failed to save job description: ${errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Failed to save job description:', error)
      alert('Failed to save job description')
    } finally {
      setIsSavingJobDescription(false)
    }
  }

  const handleCancelNewJobDescription = () => {
    setIsCreatingNewJobDescription(false)
    setNewJobDescriptionContent('')
    setNewJobDescriptionTitle('')
  }

  const fetchApplications = async () => {
    if (!selectedCycleId) return
    try {
      const url = statusFilter 
        ? `${API_URL}/applications/cycle/${selectedCycleId}?status=${statusFilter}`
        : `${API_URL}/applications/cycle/${selectedCycleId}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        
        // Check and create missing events for each application
        const createPromises: Promise<void>[] = []
        for (const app of data) {
          const expectedEventType = STATUS_TO_EVENT_MAP[app.status]
          if (expectedEventType) {
            // Check what events are missing - use Set for O(1) lookup
            const existingEventTypes = new Set((app.events || []).map((e: ApplicationEvent) => e.event_type))
            const eventsToCreate: Array<{ type: string; date: string; sortOrder: number }> = []
            
            // If status is "applied" or later, ensure "interested" exists first (only if it doesn't exist)
            if ((app.status === 'applied' || app.status === 'interviewing' || app.status === 'offer' || app.status === 'rejected' || app.status === 'accepted')) {
              const interestedCount = (app.events || []).filter((e: ApplicationEvent) => e.event_type === 'interested').length
              if (interestedCount === 0) {
                const interestedDate = app.applied_date 
                  ? new Date(new Date(app.applied_date).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                  : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                eventsToCreate.push({ type: 'interested', date: interestedDate, sortOrder: EVENT_PRIORITY.interested })
              }
            }
            
            // Add the main event for the current status if it doesn't exist
            const currentEventCount = (app.events || []).filter((e: ApplicationEvent) => e.event_type === expectedEventType).length
            if (currentEventCount === 0) {
              const eventDate = getEventDateForStatus(app.status, app)
              eventsToCreate.push({ type: expectedEventType, date: eventDate, sortOrder: EVENT_PRIORITY[expectedEventType] || 99 })
            }
            
            // Create all missing events (only if we have events to create)
            if (eventsToCreate.length > 0) {
              for (const eventData of eventsToCreate) {
                createPromises.push(
                  fetch(`${API_URL}/applications/${app.id}/events`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      event_type: eventData.type,
                      event_date: eventData.date,
                      sort_order: eventData.sortOrder,
                      notes: 'Auto-created from application status'
                    })
                  }).then(() => {
                    console.log(`Created event ${eventData.type} for application ${app.id}`)
                  }).catch(error => {
                    console.error(`Failed to create event ${eventData.type} for application ${app.id}:`, error)
                  })
                )
              }
            }
          }
        }
        
        // Wait for all events to be created
        if (createPromises.length > 0) {
          await Promise.all(createPromises)
          // Refetch applications to get updated events
          const refreshResponse = await fetch(url)
          if (refreshResponse.ok) {
            const refreshedData = await refreshResponse.json()
            setApplications(refreshedData)
            return
          }
        }
        
        setApplications(data)
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error)
    }
  }

  const fetchStats = async () => {
    if (!selectedCycleId) return
    try {
      const response = await fetch(`${API_URL}/applications/cycles/${selectedCycleId}/stats`)
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  const handleCreateCycle = async () => {
    try {
      const response = await fetch(`${API_URL}/applications/cycles`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cycleForm)
      })
      if (response.ok) {
        await fetchCycles()
        setShowCycleModal(false)
        setCycleForm({ name: '', start_date: '', end_date: '', notes: '', is_active: true })
      }
    } catch (error) {
      console.error('Failed to create cycle:', error)
      alert('Failed to create cycle')
    }
  }

  const handleSetActiveCycle = async (cycleId: string) => {
    try {
      await fetch(`${API_URL}/applications/cycles/${cycleId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: true })
      })
      await fetchCycles()
      setSelectedCycleId(cycleId)
    } catch (error) {
      console.error('Failed to set active cycle:', error)
    }
  }

  const handleDeleteCycle = async (cycleId: string) => {
    if (!confirm('Delete this cycle? All applications in this cycle will be deleted.')) return
    try {
      await fetch(`${API_URL}/applications/cycles/${cycleId}`, { method: 'DELETE' })
      await fetchCycles()
      if (selectedCycleId === cycleId) {
        setSelectedCycleId(null)
      }
    } catch (error) {
      console.error('Failed to delete cycle:', error)
    }
  }

  const handleSaveApplication = async () => {
    if (!selectedCycleId || !applicationForm.company_name || !applicationForm.job_title) {
      alert('Company name and job title are required')
      return
    }

    try {
      const url = editingApplication
        ? `${API_URL}/applications/${editingApplication.id}`
        : `${API_URL}/applications`
      const method = editingApplication ? 'PUT' : 'POST'

      const body = {
        ...applicationForm,
        cycle_id: selectedCycleId,
        job_description_id: applicationForm.job_description_id || null,
        applied_date: applicationForm.applied_date || null,
        interview_date: applicationForm.interview_date || null,
        interview_type: applicationForm.interview_type || null,
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      if (response.ok) {
        await fetchApplications()
        await fetchStats()
        setShowApplicationModal(false)
        setEditingApplication(null)
        setApplicationForm({
          company_name: '',
          job_title: '',
          status: 'applied',
          applied_date: '',
          interview_date: '',
          interview_type: '',
          notes: '',
          job_posting_url: '',
          salary_range: '',
          location: '',
          job_description_id: ''
        })
        setIsCreatingNewJobDescription(false)
        setNewJobDescriptionContent('')
        setNewJobDescriptionTitle('')
      }
    } catch (error) {
      console.error('Failed to save application:', error)
      alert('Failed to save application')
    }
  }

  const handleEditApplication = (app: Application) => {
    setEditingApplication(app)
    setApplicationForm({
      company_name: app.company_name,
      job_title: app.job_title,
      status: app.status,
      applied_date: app.applied_date || '',
      interview_date: app.interview_date || '',
      interview_type: app.interview_type || '',
      notes: app.notes || '',
      job_posting_url: app.job_posting_url || '',
      salary_range: app.salary_range || '',
      location: app.location || '',
      job_description_id: app.job_description_id || ''
    })
    setIsCreatingNewJobDescription(false)
    setNewJobDescriptionContent('')
    setNewJobDescriptionTitle('')
    setShowApplicationModal(true)
  }


  const handleStartEdit = (app: Application, field: string) => {
    let value = ''
    if (field === 'company_name') value = app.company_name
    else if (field === 'job_title') value = app.job_title
    else if (field === 'location') value = app.location || ''
    else if (field === 'salary_range') value = app.salary_range || ''
    else if (field === 'interview_date') value = app.interview_date ? app.interview_date.split('T')[0] : ''
    else if (field === 'interview_type') value = app.interview_type || ''
    
    initialEditValueRef.current = value
    setEditingField({ appId: app.id, field })
    
    // Set the input value after a brief delay to ensure it's mounted
    requestAnimationFrame(() => {
      if (editInputRef.current) {
        if (editInputRef.current instanceof HTMLInputElement) {
          editInputRef.current.value = value
          editInputRef.current.focus()
          editInputRef.current.select()
        } else if (editInputRef.current instanceof HTMLSelectElement) {
          editInputRef.current.value = value
          editInputRef.current.focus()
        }
      }
    })
  }

  const handleCancelEdit = () => {
    setEditingField(null)
    initialEditValueRef.current = ''
  }

  const handleSaveField = async (app: Application, field: string) => {
    let currentValue = ''
    if (editInputRef.current) {
      if (editInputRef.current instanceof HTMLSelectElement) {
        currentValue = editInputRef.current.value
      } else {
        currentValue = editInputRef.current.value || ''
      }
    }
    const trimmedValue = currentValue.trim()
    let updateData: any = {}

    if (field === 'company_name') {
      if (!trimmedValue) {
        alert('Company name cannot be empty')
        return
      }
      updateData.company_name = trimmedValue
    } else if (field === 'job_title') {
      if (!trimmedValue) {
        alert('Job title cannot be empty')
        return
      }
      updateData.job_title = trimmedValue
    } else if (field === 'location') {
      updateData.location = trimmedValue || null
    } else if (field === 'salary_range') {
      updateData.salary_range = trimmedValue || null
    } else if (field === 'interview_date') {
      updateData.interview_date = trimmedValue || null
    } else if (field === 'interview_type') {
      updateData.interview_type = trimmedValue || null
    }

    try {
      await fetch(`${API_URL}/applications/${app.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      })
      await fetchApplications()
      await fetchStats()
      setEditingField(null)
      initialEditValueRef.current = ''
    } catch (error) {
      console.error('Failed to update field:', error)
      alert('Failed to update field')
    }
  }

  const handleStatusChange = async (app: Application, newStatus: Application['status']) => {
    if (newStatus === app.status) {
      setEditingStatus(null)
      return
    }

    try {
      // Update the status
      await fetch(`${API_URL}/applications/${app.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })

      // Check if we need to create a corresponding event
      const expectedEventType = STATUS_TO_EVENT_MAP[newStatus]
      if (expectedEventType) {
        const existingEventTypes = new Set(app.events?.map(e => e.event_type) || [])
        const eventsToCreate: Array<{ type: string; date: string; sortOrder: number }> = []
        
        // If status is "applied" or later, ensure "interested" exists first
        if ((newStatus === 'applied' || newStatus === 'interviewing' || newStatus === 'offer' || newStatus === 'rejected' || newStatus === 'accepted') 
            && !existingEventTypes.has('interested')) {
          const interestedDate = app.applied_date 
            ? new Date(new Date(app.applied_date).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            : new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          eventsToCreate.push({ type: 'interested', date: interestedDate, sortOrder: EVENT_PRIORITY.interested })
        }
        
        // Add the main event for the new status if it doesn't exist
        if (!existingEventTypes.has(expectedEventType)) {
          const eventDate = getEventDateForStatus(newStatus, app)
          eventsToCreate.push({ type: expectedEventType, date: eventDate, sortOrder: EVENT_PRIORITY[expectedEventType] || 99 })
        }
        
        // Create all missing events
        for (const eventData of eventsToCreate) {
          try {
            await fetch(`${API_URL}/applications/${app.id}/events`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                event_type: eventData.type,
                event_date: eventData.date,
                sort_order: eventData.sortOrder,
                notes: 'Auto-created from status change'
              })
            })
          } catch (error) {
            console.error(`Failed to create event ${eventData.type} for status change:`, error)
          }
        }
      }

      await fetchApplications()
      await fetchStats()
      setEditingStatus(null)
    } catch (error) {
      console.error('Failed to update status:', error)
      alert('Failed to update status')
    }
  }

  const handleToggleTimeline = (appId: string) => {
    const newExpanded = new Set(expandedTimeline)
    if (newExpanded.has(appId)) {
      newExpanded.delete(appId)
    } else {
      newExpanded.add(appId)
    }
    setExpandedTimeline(newExpanded)
  }

  const handleAddEvent = (app: Application) => {
    setEditingEvent({ appId: app.id, eventId: null })
    setEventForm({
      event_type: 'applied',
      interview_type: '',
      event_date: new Date().toISOString().split('T')[0],
      notes: '',
      result: null
    })
  }

  const handleEditEvent = (app: Application, event: ApplicationEvent) => {
    setEditingEvent({ appId: app.id, eventId: event.id })
    setEventForm({
      event_type: event.event_type,
      interview_type: event.interview_type || '',
      event_date: event.event_date,
      notes: event.notes || '',
      result: event.result || null
    })
  }

  const handleCancelEventEdit = () => {
    setEditingEvent(null)
    setEventForm({
      event_type: 'applied',
      interview_type: '',
      event_date: '',
      notes: '',
      result: null
    })
  }

  const handleSaveEvent = async (app: Application) => {
    if (!eventForm.event_date || !eventForm.event_type) {
      alert('Event date and type are required')
      return
    }

    try {
      const url = editingEvent?.eventId
        ? `${API_URL}/applications/events/${editingEvent.eventId}`
        : `${API_URL}/applications/${app.id}/events`
      const method = editingEvent?.eventId ? 'PUT' : 'POST'

      const body = {
        event_type: eventForm.event_type,
        event_date: eventForm.event_date,
        interview_type: eventForm.event_type === 'interview' ? (eventForm.interview_type || null) : null,
        notes: eventForm.notes || null,
        result: eventForm.result || null
      }

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })

      // Fetch updated events to get the latest
      const eventsResponse = await fetch(`${API_URL}/applications/${app.id}/events`)
      let updatedEvents: ApplicationEvent[] = []
      if (eventsResponse.ok) {
        updatedEvents = await eventsResponse.json()
      }

      // Update application status based on last event
      const newStatus = getStatusFromLastEvent(updatedEvents)
      if (newStatus && newStatus !== app.status) {
        await fetch(`${API_URL}/applications/${app.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        })
      }

      await fetchApplications()
      await fetchStats()
      handleCancelEventEdit()
    } catch (error) {
      console.error('Failed to save event:', error)
      alert('Failed to save event')
    }
  }

  const handleDeleteEvent = async (app: Application, eventId: string) => {
    if (!confirm('Delete this event?')) return

    try {
      await fetch(`${API_URL}/applications/events/${eventId}`, {
        method: 'DELETE'
      })

      // Fetch updated events to get the latest
      const eventsResponse = await fetch(`${API_URL}/applications/${app.id}/events`)
      let updatedEvents: ApplicationEvent[] = []
      if (eventsResponse.ok) {
        updatedEvents = await eventsResponse.json()
      }

      // Update application status based on last event (or default to 'applied' if no events)
      const newStatus = getStatusFromLastEvent(updatedEvents) || 'applied'
      if (newStatus !== app.status) {
        await fetch(`${API_URL}/applications/${app.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus })
        })
      }

      await fetchApplications()
      await fetchStats()
    } catch (error) {
      console.error('Failed to delete event:', error)
      alert('Failed to delete event')
    }
  }

  const handleClearAllEvents = async (app: Application) => {
    if (!app.events || app.events.length === 0) return
    
    if (!confirm(`Delete all ${app.events.length} events for this application?`)) return

    try {
      // Delete all events
      const deletePromises = app.events.map(event => 
        fetch(`${API_URL}/applications/events/${event.id}`, {
          method: 'DELETE'
        })
      )
      
      await Promise.all(deletePromises)

      // Update application status to 'applied' (default when no events)
      await fetch(`${API_URL}/applications/${app.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'applied' })
      })

      await fetchApplications()
      await fetchStats()
    } catch (error) {
      console.error('Failed to clear all events:', error)
      alert('Failed to clear all events')
    }
  }


  const handleDeleteApplication = async (id: string) => {
    if (!confirm('Delete this application?')) return
    try {
      await fetch(`${API_URL}/applications/${id}`, { method: 'DELETE' })
      await fetchApplications()
      await fetchStats()
    } catch (error) {
      console.error('Failed to delete application:', error)
    }
  }

  const selectedCycle = cycles.find(c => c.id === selectedCycleId)
  const filteredApplications = statusFilter
    ? applications.filter(app => app.status === statusFilter)
    : applications
  
  // Filter applications where the last event in timeline is an interview
  // Events are already sorted by: event_date ASC, sort_order ASC, created_at ASC
  const currentlyInterviewing = applications.filter(app => {
    if (!app.events || app.events.length === 0) return false
    // Get the last event (most recent in timeline)
    const lastEvent = app.events[app.events.length - 1]
    return lastEvent.event_type === 'interview'
  })

  // Extract controls for Header
  const headerControls = (
    <>
      <div className="cycle-selector" ref={cycleDropdownRef}>
        <button
          className="cycle-selector-btn"
          onClick={() => setIsCycleDropdownOpen(!isCycleDropdownOpen)}
        >
          <span>{selectedCycle ? selectedCycle.name : 'Select Cycle'}</span>
          {selectedCycle?.is_active && <span className="active-badge">Active</span>}
          <ChevronDown size={16} className={isCycleDropdownOpen ? 'open' : ''} />
        </button>
        {isCycleDropdownOpen && (
          <div className="cycle-dropdown">
            {cycles.length === 0 ? (
              <div className="dropdown-empty">No cycles found</div>
            ) : (
              cycles.map(cycle => (
                <div
                  key={cycle.id}
                  className={`cycle-item ${selectedCycleId === cycle.id ? 'active' : ''}`}
                  onClick={() => {
                    setSelectedCycleId(cycle.id)
                    setIsCycleDropdownOpen(false)
                  }}
                >
                  <div className="cycle-item-header">
                    <span className="cycle-item-name">{cycle.name}</span>
                    {cycle.is_active && <span className="active-badge">Active</span>}
                  </div>
                  <div className="cycle-item-meta">
                    <span>{new Date(cycle.start_date).toLocaleDateString()}</span>
                    {cycle.end_date && <span> - {new Date(cycle.end_date).toLocaleDateString()}</span>}
                    <span> • {cycle.application_count || 0} applications</span>
                  </div>
                  <div className="cycle-item-actions">
                    {!cycle.is_active && (
                      <button
                        className="set-active-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSetActiveCycle(cycle.id)
                          setIsCycleDropdownOpen(false)
                        }}
                      >
                        Set Active
                      </button>
                    )}
                    <button
                      className="delete-cycle-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteCycle(cycle.id)
                        setIsCycleDropdownOpen(false)
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
            <div className="cycle-dropdown-footer">
              <button
                className="create-cycle-btn"
                onClick={() => {
                  setIsCycleDropdownOpen(false)
                  setShowCycleModal(true)
                }}
              >
                <Plus size={16} />
                Create New Cycle
              </button>
            </div>
          </div>
        )}
      </div>
      <button
        className="add-application-btn"
        onClick={() => {
          setEditingApplication(null)
          setApplicationForm({
            company_name: '',
            job_title: '',
            status: 'applied',
            applied_date: '',
            interview_date: '',
            interview_type: '',
            notes: '',
            job_posting_url: '',
            salary_range: '',
            location: '',
            job_description_id: ''
          })
          setShowApplicationModal(true)
        }}
        disabled={!selectedCycleId}
      >
        <Plus size={18} />
        Add Application
      </button>
    </>
  )

  // Expose controls to Header via callback
  useEffect(() => {
    if (onControlsReady) {
      onControlsReady(headerControls)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onControlsReady, cycles, selectedCycleId, selectedCycle?.id, selectedCycle?.is_active, isCycleDropdownOpen])

  if (isLoading) {
    return (
      <div className="applications-tracker">
        <div className="loading-state">
          <div className="spinner" />
          <span>Loading...</span>
        </div>
        <style>{`
          .applications-tracker { height: 100%; display: flex; align-items: center; justify-content: center; }
          .loading-state { display: flex; flex-direction: column; align-items: center; gap: 16px; color: var(--text-secondary); }
          .spinner { width: 40px; height: 40px; border: 3px solid var(--border-default); border-top-color: var(--accent-primary); border-radius: 50%; animation: spin 1s linear infinite; }
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    )
  }

  return (
    <div className="applications-tracker">
      {!selectedCycleId ? (
        <div className="empty-state">
          <Briefcase size={64} strokeWidth={1.5} />
          <h2>No Cycle Selected</h2>
          <p>Create a new job search cycle to start tracking applications</p>
          <button
            className="create-cycle-primary-btn"
            onClick={() => setShowCycleModal(true)}
          >
            <Plus size={18} />
            Create Your First Cycle
          </button>
        </div>
      ) : (
        <>
          {stats && (
            <div className="stats-section">
              <button
                className="stats-toggle"
                onClick={() => setIsStatsExpanded(!isStatsExpanded)}
              >
                <TrendingUp size={18} />
                <h3>Statistics</h3>
                <ChevronDown 
                  size={18} 
                  className={isStatsExpanded ? 'open' : ''} 
                />
              </button>
              {isStatsExpanded && (
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{stats.total_applications}</div>
                    <div className="stat-label">Total Applications</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.applied_count}</div>
                    <div className="stat-label">Applied</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.offer_count}</div>
                    <div className="stat-label">Offers</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.rejected_count}</div>
                    <div className="stat-label">Rejected</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{stats.accepted_count}</div>
                    <div className="stat-label">Accepted</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Currently Interviewing Section */}
          {currentlyInterviewing.length > 0 && (
            <div className="currently-interviewing-section">
              <button
                className="currently-interviewing-toggle"
                onClick={() => setIsCurrentlyInterviewingExpanded(!isCurrentlyInterviewingExpanded)}
              >
                <User size={18} />
                <h3>Currently Interviewing ({currentlyInterviewing.length})</h3>
                <ChevronDown 
                  size={18} 
                  className={isCurrentlyInterviewingExpanded ? 'open' : ''} 
                />
              </button>
              {isCurrentlyInterviewingExpanded && (
                <div className="currently-interviewing-list">
                {currentlyInterviewing.map(app => {
                  const lastEventStatus = getStatusFromLastEvent(app.events)
                  const displayStatus = lastEventStatus || app.status
                  const statusColor = STATUS_COLORS[displayStatus] || STATUS_COLORS.applied
                  // Get the most recent interview event (last one in timeline order)
                  // Timeline sorts by: event_date ASC, sort_order ASC, created_at ASC
                  const interviewEvents = app.events?.filter(e => e.event_type === 'interview') || []
                  const latestInterview = interviewEvents.length > 0 
                    ? interviewEvents.sort((a, b) => {
                        // First sort by event_date (ascending)
                        const dateDiff = new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
                        if (dateDiff !== 0) return dateDiff
                        // Then by sort_order (ascending)
                        const orderDiff = (a.sort_order || 0) - (b.sort_order || 0)
                        if (orderDiff !== 0) return orderDiff
                        // Finally by created_at (ascending)
                        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                      })[interviewEvents.length - 1] // Get the last one (most recent in timeline)
                    : null
                  
                  return (
                    <motion.div
                      key={app.id}
                      className="currently-interviewing-card"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => {
                        // Scroll to the application in the main list
                        const element = document.querySelector(`[data-application-id="${app.id}"]`)
                        if (element) {
                          element.scrollIntoView({ behavior: 'smooth', block: 'center' })
                          // Highlight it briefly
                          element.classList.add('highlight')
                          setTimeout(() => element.classList.remove('highlight'), 2000)
                        }
                      }}
                    >
                      <div className="interviewing-card-content">
                        <div className="interviewing-card-main">
                          <h4 className="interviewing-company">{app.company_name}</h4>
                          <p className="interviewing-title">{app.job_title}</p>
                        </div>
                        {latestInterview && (
                          <div className="interviewing-card-meta">
                            <div className="interviewing-date">
                              <Calendar size={12} />
                              <span>{new Date(latestInterview.event_date).toLocaleDateString()}</span>
                            </div>
                            {latestInterview.interview_type && (
                              <div className="interviewing-type">
                                <span className="interview-type-badge">
                                  {INTERVIEW_TYPES.find(t => t.value === latestInterview.interview_type)?.label || latestInterview.interview_type}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )
                })}
                </div>
              )}
            </div>
          )}

          {selectedCycleId && (
            <div className="filters-bar">
              <div className="status-filters">
                <Filter size={16} />
                <button
                  className={`filter-btn ${!statusFilter ? 'active' : ''}`}
                  onClick={() => setStatusFilter(null)}
                >
                  All
                </button>
                {Object.keys(STATUS_COLORS).map(status => (
                  <button
                    key={status}
                    className={`filter-btn ${statusFilter === status ? 'active' : ''}`}
                    onClick={() => setStatusFilter(statusFilter === status ? null : status)}
                    style={{
                      backgroundColor: statusFilter === status ? STATUS_COLORS[status].bg : 'transparent',
                      color: statusFilter === status ? STATUS_COLORS[status].text : 'var(--text-secondary)',
                      borderColor: statusFilter === status ? STATUS_COLORS[status].border : 'var(--border-default)'
                    }}
                  >
                    {status
                      .split('_')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ')}
                  </button>
                ))}
              </div>
              <div className="applications-count">
                {filteredApplications.length} {filteredApplications.length === 1 ? 'application' : 'applications'}
              </div>
            </div>
          )}

          <div className="applications-list">
            {filteredApplications.length === 0 ? (
              <div className="empty-applications">
                <FileText size={48} strokeWidth={1.5} />
                <h3>No applications yet</h3>
                <p>Start tracking your job applications by adding your first one</p>
                <button
                  className="add-first-btn"
                  onClick={() => setShowApplicationModal(true)}
                >
                  <Plus size={18} />
                  Add Application
                </button>
              </div>
            ) : (
              filteredApplications.map(app => {
                // Determine status color - use last event status if available, otherwise use app status
                const lastEventStatus = getStatusFromLastEvent(app.events)
                const displayStatus = lastEventStatus || app.status
                const statusColor = STATUS_COLORS[displayStatus] || STATUS_COLORS.applied
                return (
                  <motion.div
                    key={app.id}
                    className="application-card"
                    data-application-id={app.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <div className="application-header">
                      <div className="application-title-section">
                        {editingField?.appId === app.id && editingField.field === 'company_name' ? (
                          <input
                            key={`edit-${app.id}-company_name`}
                            ref={setEditInputRef}
                            type="text"
                            className="inline-edit-input company-name-input"
                            defaultValue={initialEditValueRef.current}
                            onBlur={(e) => {
                              e.stopPropagation()
                              handleSaveField(app, 'company_name')
                            }}
                            onKeyDown={(e) => {
                              e.stopPropagation()
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleSaveField(app, 'company_name')
                              } else if (e.key === 'Escape') {
                                e.preventDefault()
                                handleCancelEdit()
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <h3 
                            className="company-name editable"
                            onClick={() => handleStartEdit(app, 'company_name')}
                            title="Click to edit"
                          >
                            {app.company_name}
                          </h3>
                        )}
                        {editingField?.appId === app.id && editingField.field === 'job_title' ? (
                          <input
                            key={`edit-${app.id}-job_title`}
                            ref={setEditInputRef}
                            type="text"
                            className="inline-edit-input job-title-input"
                            defaultValue={initialEditValueRef.current}
                            onBlur={(e) => {
                              e.stopPropagation()
                              handleSaveField(app, 'job_title')
                            }}
                            onKeyDown={(e) => {
                              e.stopPropagation()
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleSaveField(app, 'job_title')
                              } else if (e.key === 'Escape') {
                                e.preventDefault()
                                handleCancelEdit()
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <h4 
                            className="job-title editable"
                            onClick={() => handleStartEdit(app, 'job_title')}
                            title="Click to edit"
                          >
                            {app.job_title}
                          </h4>
                        )}
                      </div>
                      <div className="application-actions">
                        {editingStatus === app.id ? (
                          <select
                            ref={statusSelectRef}
                            className="status-select"
                            value={displayStatus}
                            onChange={(e) => {
                              const newStatus = e.target.value as Application['status']
                              const newStatusColor = STATUS_COLORS[newStatus] || STATUS_COLORS.applied
                              // Update the select styling immediately for better UX
                              if (statusSelectRef.current) {
                                statusSelectRef.current.style.backgroundColor = newStatusColor.bg
                                statusSelectRef.current.style.color = newStatusColor.text
                                statusSelectRef.current.style.borderColor = newStatusColor.border
                              }
                              handleStatusChange(app, newStatus)
                            }}
                            onBlur={() => setEditingStatus(null)}
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              backgroundColor: statusColor.bg,
                              color: statusColor.text,
                              borderColor: statusColor.border
                            }}
                            autoFocus
                          >
                            {Object.keys(STATUS_COLORS).map(status => {
                              // Convert status key to readable label
                              const statusLabel = status
                                .split('_')
                                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ')
                              return (
                                <option key={status} value={status}>
                                  {statusLabel}
                                </option>
                              )
                            })}
                          </select>
                        ) : (
                          <span
                            className="status-badge editable"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingStatus(app.id)
                              requestAnimationFrame(() => {
                                if (statusSelectRef.current) {
                                  statusSelectRef.current.focus()
                                }
                              })
                            }}
                            style={{
                              backgroundColor: statusColor.bg,
                              color: statusColor.text,
                              borderColor: statusColor.border
                            }}
                            title={lastEventStatus && lastEventStatus !== app.status ? `Status from timeline (last event: ${app.events?.[app.events.length - 1]?.event_type}). Click to override.` : "Click to change status"}
                          >
                            {displayStatus
                              .split('_')
                              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                              .join(' ')}
                            {lastEventStatus && lastEventStatus !== app.status && (
                              <span style={{ fontSize: '0.7rem', opacity: 0.7, marginLeft: '4px' }}>•</span>
                            )}
                          </span>
                        )}
                        <button
                          className="action-btn edit-btn"
                          onClick={() => handleEditApplication(app)}
                          title="Edit"
                        >
                          <Edit3 size={14} />
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteApplication(app.id)}
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>

                    <div className="application-details">
                      <div className="detail-item">
                        <MapPin size={12} />
                        {editingField?.appId === app.id && editingField.field === 'location' ? (
                          <input
                            ref={setEditInputRef}
                            type="text"
                            className="inline-edit-input detail-input"
                            defaultValue={initialEditValueRef.current}
                            onBlur={(e) => {
                              e.stopPropagation()
                              handleSaveField(app, 'location')
                            }}
                            onKeyDown={(e) => {
                              e.stopPropagation()
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleSaveField(app, 'location')
                              } else if (e.key === 'Escape') {
                                e.preventDefault()
                                handleCancelEdit()
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => e.stopPropagation()}
                            placeholder="Location"
                          />
                        ) : (
                          <span 
                            className={app.location ? 'editable' : 'editable add-field'}
                            onClick={() => handleStartEdit(app, 'location')}
                            title="Click to edit"
                          >
                            {app.location || 'Add location'}
                          </span>
                        )}
                      </div>
                      {(() => {
                        // Get the applied event from timeline
                        const appliedEvent = app.events?.find(e => e.event_type === 'applied')
                        const appliedDate = appliedEvent ? appliedEvent.event_date : app.applied_date
                        
                        return appliedDate ? (
                          <div className="detail-item">
                            <Calendar size={12} />
                            <span>Applied: {new Date(appliedDate).toLocaleDateString()}</span>
                          </div>
                        ) : null
                      })()}
                      <div className="detail-item">
                        <Clock size={12} />
                        {(() => {
                          // Get the last event from timeline (any type)
                          const lastEvent = app.events && app.events.length > 0 
                            ? app.events[app.events.length - 1] 
                            : null
                          
                          if (!lastEvent) {
                            return (
                              <span 
                                className="editable add-field"
                                onClick={() => handleToggleTimeline(app.id)}
                                title="Click to add event in timeline"
                              >
                                Add event in timeline
                              </span>
                            )
                          }
                          
                          const eventTypeConfig = EVENT_TYPES.find(t => t.value === lastEvent.event_type)
                          const eventLabel = eventTypeConfig?.label || lastEvent.event_type
                          const eventDate = new Date(lastEvent.event_date).toLocaleDateString()
                          
                          return (
                            <span 
                              className="editable"
                              onClick={() => handleToggleTimeline(app.id)}
                              title="Click to view/edit timeline"
                            >
                              {eventLabel}: {eventDate}
                              {lastEvent.interview_type && (
                                <span className="interview-type-badge">
                                  {' '}({INTERVIEW_TYPES.find(t => t.value === lastEvent.interview_type)?.label || lastEvent.interview_type})
                                </span>
                              )}
                            </span>
                          )
                        })()}
                      </div>
                      <div className="detail-item">
                        <DollarSign size={12} />
                        {editingField?.appId === app.id && editingField.field === 'salary_range' ? (
                          <input
                            ref={setEditInputRef}
                            type="text"
                            className="inline-edit-input detail-input"
                            defaultValue={initialEditValueRef.current}
                            onBlur={(e) => {
                              e.stopPropagation()
                              handleSaveField(app, 'salary_range')
                            }}
                            onKeyDown={(e) => {
                              e.stopPropagation()
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleSaveField(app, 'salary_range')
                              } else if (e.key === 'Escape') {
                                e.preventDefault()
                                handleCancelEdit()
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => e.stopPropagation()}
                            placeholder="Salary range"
                          />
                        ) : (
                          <span 
                            className={app.salary_range ? 'editable' : 'editable add-field'}
                            onClick={() => handleStartEdit(app, 'salary_range')}
                            title="Click to edit"
                          >
                            {app.salary_range || 'Add salary'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Timeline Section */}
                    <div className="timeline-section">
                      <button
                        className="timeline-toggle"
                        onClick={() => handleToggleTimeline(app.id)}
                      >
                        <GitBranch size={14} />
                        <span>Timeline ({app.events?.length || 0} events)</span>
                        <ChevronDown 
                          size={14} 
                          className={expandedTimeline.has(app.id) ? 'open' : ''} 
                        />
                      </button>
                      
                      {expandedTimeline.has(app.id) && (
                        <div className="timeline-content">
                          {editingEvent?.appId === app.id ? (
                            <div className="event-form">
                              <div className="event-form-row">
                                <div className="event-form-group">
                                  <label>Event Type</label>
                                  <select
                                    value={eventForm.event_type}
                                    onChange={(e) => setEventForm({ 
                                      ...eventForm, 
                                      event_type: e.target.value as ApplicationEvent['event_type'] 
                                    })}
                                  >
                                    {EVENT_TYPES.map(type => (
                                      <option key={type.value} value={type.value}>
                                        {type.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                {eventForm.event_type === 'interview' && (
                                  <div className="event-form-group">
                                    <label>Interview Type</label>
                                    <select
                                      value={eventForm.interview_type}
                                      onChange={(e) => setEventForm({ 
                                        ...eventForm, 
                                        interview_type: e.target.value 
                                      })}
                                    >
                                      <option value="">Select type</option>
                                      {INTERVIEW_TYPES.map(type => (
                                        <option key={type.value} value={type.value}>
                                          {type.label}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                                <div className="event-form-group">
                                  <label>Date</label>
                                  <input
                                    type="date"
                                    value={eventForm.event_date}
                                    onChange={(e) => setEventForm({ 
                                      ...eventForm, 
                                      event_date: e.target.value 
                                    })}
                                  />
                                </div>
                              </div>
                              <div className="event-form-row">
                                <div className="event-form-group">
                                  <label>Result</label>
                                  <select
                                    value={eventForm.result || ''}
                                    onChange={(e) => setEventForm({ 
                                      ...eventForm, 
                                      result: e.target.value === '' ? null : e.target.value as 'pass' | 'fail'
                                    })}
                                  >
                                    <option value="">Pending</option>
                                    <option value="pass">Pass</option>
                                    <option value="fail">Fail</option>
                                  </select>
                                </div>
                                <div className="event-form-group" style={{ gridColumn: 'span 2' }}>
                                  <label>Notes</label>
                                  <textarea
                                    value={eventForm.notes}
                                    onChange={(e) => setEventForm({ 
                                      ...eventForm, 
                                      notes: e.target.value 
                                    })}
                                    placeholder="Optional notes..."
                                    rows={2}
                                  />
                                </div>
                              </div>
                              <div className="event-form-actions">
                                <button
                                  className="btn-save"
                                  onClick={() => handleSaveEvent(app)}
                                >
                                  <Save size={14} />
                                  Save
                                </button>
                                <button
                                  className="btn-cancel"
                                  onClick={handleCancelEventEdit}
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              {app.events && app.events.length > 0 ? (
                                <div className="timeline-events">
                                  {app.events.map((event, index) => {
                                    const eventTypeConfig = EVENT_TYPES.find(t => t.value === event.event_type)
                                    const EventIcon = eventTypeConfig?.icon || FileText
                                    const isPass = event.result === 'pass'
                                    const isFail = event.result === 'fail'
                                    return (
                                      <div 
                                        key={event.id} 
                                        className={`timeline-event ${isPass ? 'timeline-event-pass' : ''} ${isFail ? 'timeline-event-fail' : ''}`}
                                      >
                                        <div className="timeline-event-connector">
                                          {index > 0 && <div className={`timeline-connector-line ${isPass ? 'connector-pass' : ''} ${isFail ? 'connector-fail' : ''}`}></div>}
                                          <div className={`timeline-event-icon ${isPass ? 'icon-pass' : ''} ${isFail ? 'icon-fail' : ''}`}>
                                            <EventIcon size={16} />
                                          </div>
                                        </div>
                                        <div className="timeline-event-content">
                                          <div className={`timeline-event-type ${isPass ? 'type-pass' : ''} ${isFail ? 'type-fail' : ''}`}>
                                            {eventTypeConfig?.label || event.event_type}
                                            {event.interview_type && (
                                              <span className="timeline-interview-type">
                                                {' '}({INTERVIEW_TYPES.find(t => t.value === event.interview_type)?.label || event.interview_type})
                                              </span>
                                            )}
                                          </div>
                                          <div className={`timeline-event-date ${isPass ? 'date-pass' : ''} ${isFail ? 'date-fail' : ''}`}>
                                            {new Date(event.event_date).toLocaleDateString()}
                                          </div>
                                          {event.notes && (
                                            <div className="timeline-event-notes">
                                              {event.notes}
                                            </div>
                                          )}
                                          <div className="timeline-event-actions">
                                            <button
                                              className="action-btn edit-btn"
                                              onClick={() => handleEditEvent(app, event)}
                                              title="Edit"
                                            >
                                              <Edit3 size={12} />
                                            </button>
                                            <button
                                              className="action-btn delete-btn"
                                              onClick={() => handleDeleteEvent(app, event.id)}
                                              title="Delete"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )
                                  })}
                                  {/* Add event button at the end of timeline */}
                                  <div className="timeline-event timeline-add-event">
                                    <div className="timeline-event-connector">
                                      <div className="timeline-connector-line"></div>
                                      <button
                                        className="timeline-add-event-icon"
                                        onClick={() => handleAddEvent(app)}
                                        title="Add new event"
                                      >
                                        <Plus size={18} />
                                      </button>
                                    </div>
                                    <div className="timeline-event-content">
                                      <div className="timeline-add-event-label">Add Event</div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div className="timeline-empty">
                                  <p>No events yet. Add events to track your application progress.</p>
                                </div>
                              )}
                              <div className="timeline-actions">
                                <button
                                  className="add-event-btn"
                                  onClick={() => handleAddEvent(app)}
                                >
                                  <Plus size={14} />
                                  Add Event
                                </button>
                                {app.events && app.events.length > 0 && (
                                  <button
                                    className="clear-all-events-btn"
                                    onClick={() => handleClearAllEvents(app)}
                                    title="Delete all events"
                                  >
                                    <Trash2 size={14} />
                                    Clear All Events
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {(app.job_posting_url || app.job_description_title || app.notes) && (
                      <div className="application-footer">
                        {app.job_posting_url && (
                          <a
                            href={app.job_posting_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="external-link"
                          >
                            <ExternalLink size={14} />
                            Job Posting
                          </a>
                        )}
                        {app.job_description_title && (
                          <span className="job-desc-link">
                            <FileText size={14} />
                            {app.job_description_title}
                          </span>
                        )}
                        {app.notes && (
                          <div className="notes-preview">
                            {app.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )
              })
            )}
          </div>
        </>
      )}

      {/* Cycle Modal */}
      <AnimatePresence>
        {showCycleModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCycleModal(false)}
          >
            <motion.div
              className="modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Create Job Search Cycle</h2>
                <button className="close-btn" onClick={() => setShowCycleModal(false)}>
                  <X size={20} />
                </button>
              </div>
              <div className="modal-content">
                <div className="form-group">
                  <label>Cycle Name *</label>
                  <input
                    type="text"
                    value={cycleForm.name}
                    onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })}
                    placeholder="e.g., 2024 Job Search, Summer 2023"
                  />
                </div>
                <div className="form-group">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    value={cycleForm.start_date}
                    onChange={(e) => setCycleForm({ ...cycleForm, start_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={cycleForm.end_date}
                    onChange={(e) => setCycleForm({ ...cycleForm, end_date: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={cycleForm.notes}
                    onChange={(e) => setCycleForm({ ...cycleForm, notes: e.target.value })}
                    placeholder="Optional notes about this job search cycle"
                    rows={3}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-cancel" onClick={() => setShowCycleModal(false)}>
                  Cancel
                </button>
                <button
                  className="btn-save"
                  onClick={handleCreateCycle}
                  disabled={!cycleForm.name || !cycleForm.start_date}
                >
                  Create Cycle
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Application Modal */}
      <AnimatePresence>
        {showApplicationModal && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => {
              setShowApplicationModal(false)
              setEditingApplication(null)
              setIsCreatingNewJobDescription(false)
              setNewJobDescriptionContent('')
              setNewJobDescriptionTitle('')
            }}
          >
            <motion.div
              className="modal large-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>{editingApplication ? 'Edit Application' : 'Add Application'}</h2>
                <button
                  className="close-btn"
                  onClick={() => {
                    setShowApplicationModal(false)
                    setEditingApplication(null)
                    setIsCreatingNewJobDescription(false)
                    setNewJobDescriptionContent('')
                    setNewJobDescriptionTitle('')
                  }}
                >
                  <X size={20} />
                </button>
              </div>
              <div className="modal-content">
                <div className="form-row">
                  <div className="form-group">
                    <label>Company Name *</label>
                    <input
                      type="text"
                      value={applicationForm.company_name}
                      onChange={(e) => setApplicationForm({ ...applicationForm, company_name: e.target.value })}
                      placeholder="e.g., Google, Amazon"
                    />
                  </div>
                  <div className="form-group">
                    <label>Job Title *</label>
                    <input
                      type="text"
                      value={applicationForm.job_title}
                      onChange={(e) => setApplicationForm({ ...applicationForm, job_title: e.target.value })}
                      placeholder="e.g., Software Engineer"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={applicationForm.status}
                      onChange={(e) => setApplicationForm({ ...applicationForm, status: e.target.value as Application['status'] })}
                    >
                      {Object.keys(STATUS_COLORS).map(status => (
                        <option key={status} value={status}>
                          {status
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ')}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Location</label>
                    <input
                      type="text"
                      value={applicationForm.location}
                      onChange={(e) => setApplicationForm({ ...applicationForm, location: e.target.value })}
                      placeholder="e.g., San Francisco, CA"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Applied Date</label>
                    <input
                      type="date"
                      value={applicationForm.applied_date}
                      onChange={(e) => setApplicationForm({ ...applicationForm, applied_date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Interview Date</label>
                    <input
                      type="date"
                      value={applicationForm.interview_date}
                      onChange={(e) => setApplicationForm({ ...applicationForm, interview_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Interview Type</label>
                    <select
                      value={applicationForm.interview_type}
                      onChange={(e) => setApplicationForm({ ...applicationForm, interview_type: e.target.value })}
                    >
                      <option value="">Select type</option>
                      {INTERVIEW_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>


                <div className="form-row">
                  <div className="form-group">
                    <label>Salary Range</label>
                    <input
                      type="text"
                      value={applicationForm.salary_range}
                      onChange={(e) => setApplicationForm({ ...applicationForm, salary_range: e.target.value })}
                      placeholder="e.g., $120k - $150k"
                    />
                  </div>
                  <div className="form-group">
                    <label>Job Posting URL</label>
                    <input
                      type="url"
                      value={applicationForm.job_posting_url}
                      onChange={(e) => setApplicationForm({ ...applicationForm, job_posting_url: e.target.value })}
                      placeholder="https://..."
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Job Description</label>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <select
                      value={applicationForm.job_description_id}
                      onChange={(e) => {
                        if (e.target.value === '__new__') {
                          setIsCreatingNewJobDescription(true)
                          setApplicationForm({ ...applicationForm, job_description_id: '' })
                        } else {
                          setApplicationForm({ ...applicationForm, job_description_id: e.target.value })
                          setIsCreatingNewJobDescription(false)
                        }
                      }}
                      style={{ flex: 1 }}
                    >
                      <option value="">None</option>
                      {jobDescriptions.map(jd => (
                        <option key={jd.id} value={jd.id}>{jd.title}</option>
                      ))}
                      <option value="__new__">+ Create New</option>
                    </select>
                  </div>
                  {isCreatingNewJobDescription && (
                    <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                          Title (optional)
                        </label>
                        <input
                          type="text"
                          value={newJobDescriptionTitle}
                          onChange={(e) => setNewJobDescriptionTitle(e.target.value)}
                          placeholder="Enter a title for this job description"
                          style={{
                            width: '100%',
                            padding: '8px 12px',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text-primary)',
                            fontSize: '0.875rem'
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-secondary)' }}>
                          Job Description Content
                        </label>
                        <textarea
                          value={newJobDescriptionContent}
                          onChange={(e) => setNewJobDescriptionContent(e.target.value)}
                          placeholder="Paste or type the job description here..."
                          rows={8}
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text-primary)',
                            fontSize: '0.875rem',
                            fontFamily: 'inherit',
                            resize: 'vertical'
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          onClick={handleCancelNewJobDescription}
                          style={{
                            padding: '6px 12px',
                            background: 'var(--bg-tertiary)',
                            border: '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-md)',
                            color: 'var(--text-secondary)',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'var(--bg-hover)'
                            e.currentTarget.style.color = 'var(--text-primary)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'var(--bg-tertiary)'
                            e.currentTarget.style.color = 'var(--text-secondary)'
                          }}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveNewJobDescription}
                          disabled={!newJobDescriptionContent.trim() || isSavingJobDescription}
                          style={{
                            padding: '6px 12px',
                            background: 'var(--accent-primary)',
                            border: '1px solid var(--accent-primary)',
                            borderRadius: 'var(--radius-md)',
                            color: 'white',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            cursor: isSavingJobDescription || !newJobDescriptionContent.trim() ? 'not-allowed' : 'pointer',
                            opacity: isSavingJobDescription || !newJobDescriptionContent.trim() ? 0.5 : 1,
                            transition: 'all var(--transition-fast)'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSavingJobDescription && newJobDescriptionContent.trim()) {
                              e.currentTarget.style.background = 'var(--accent-secondary)'
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSavingJobDescription && newJobDescriptionContent.trim()) {
                              e.currentTarget.style.background = 'var(--accent-primary)'
                            }
                          }}
                        >
                          {isSavingJobDescription ? 'Saving...' : 'Save Job Description'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Notes</label>
                  <textarea
                    value={applicationForm.notes}
                    onChange={(e) => setApplicationForm({ ...applicationForm, notes: e.target.value })}
                    placeholder="Additional notes..."
                    rows={4}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  className="btn-cancel"
                  onClick={() => {
                    setShowApplicationModal(false)
                    setEditingApplication(null)
                    setIsCreatingNewJobDescription(false)
                    setNewJobDescriptionContent('')
                    setNewJobDescriptionTitle('')
                  }}
                >
                  Cancel
                </button>
                <button
                  className="btn-save"
                  onClick={handleSaveApplication}
                  disabled={!applicationForm.company_name || !applicationForm.job_title}
                >
                  <Save size={16} />
                  {editingApplication ? 'Update' : 'Create'} Application
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .applications-tracker {
          height: 100%;
          width: 100%;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary);
          overflow: hidden;
          min-height: 0;
        }


        .cycle-selector {
          position: relative;
        }

        .cycle-selector-btn {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          padding: 10px 16px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          min-width: 200px;
          justify-content: space-between;
        }

        .cycle-selector-btn:hover {
          background: var(--bg-hover);
          border-color: var(--border-hover);
        }

        .active-badge {
          padding: 2px 8px;
          background: var(--accent-primary);
          color: white;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
        }

        .cycle-selector-btn svg {
          transition: transform var(--transition-fast);
        }

        .cycle-selector-btn svg.open {
          transform: rotate(180deg);
        }

        .cycle-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 320px;
          max-width: 400px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          z-index: 1000;
          max-height: 500px;
          overflow-y: auto;
        }

        .dropdown-empty {
          padding: var(--space-lg);
          text-align: center;
          color: var(--text-muted);
        }

        .cycle-item {
          padding: var(--space-md);
          border-bottom: 1px solid var(--border-subtle);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .cycle-item:hover {
          background: var(--bg-hover);
        }

        .cycle-item.active {
          background: var(--accent-glow);
        }

        .cycle-item-header {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-xs);
        }

        .cycle-item-name {
          font-weight: 600;
          color: var(--text-primary);
        }

        .cycle-item-meta {
          font-size: 0.875rem;
          color: var(--text-muted);
          margin-bottom: var(--space-sm);
        }

        .cycle-item-actions {
          display: flex;
          gap: var(--space-sm);
        }

        .set-active-btn, .delete-cycle-btn {
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
        }

        .set-active-btn {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }

        .set-active-btn:hover {
          background: var(--accent-glow);
          color: var(--accent-primary);
        }

        .delete-cycle-btn {
          background: transparent;
          color: var(--text-muted);
          display: flex;
          align-items: center;
        }

        .delete-cycle-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          color: var(--accent-danger);
        }

        .cycle-dropdown-footer {
          padding: var(--space-md);
          border-top: 1px solid var(--border-subtle);
        }

        .create-cycle-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-xs);
          padding: 10px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: center;
        }

        .create-cycle-btn:hover {
          background: var(--accent-glow);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }

        .add-application-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-xs);
          padding: 10px 20px;
          background: var(--accent-primary);
          border: none;
          border-radius: var(--radius-md);
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: center;
        }

        .add-application-btn:hover:not(:disabled) {
          background: var(--accent-secondary);
        }

        .add-application-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-lg);
          padding: var(--space-2xl);
          text-align: center;
          min-height: 0;
          width: 100%;
        }

        .empty-state svg {
          color: var(--accent-primary);
          opacity: 0.5;
        }

        .empty-state h2 {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .empty-state p {
          color: var(--text-secondary);
          max-width: 400px;
        }

        .create-cycle-primary-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-xs);
          padding: 12px 24px;
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          border: none;
          border-radius: var(--radius-md);
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
          margin-top: var(--space-md);
        }

        .create-cycle-primary-btn:hover {
          background: linear-gradient(135deg, var(--accent-secondary) 0%, var(--accent-primary) 100%);
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
          transform: translateY(-1px);
        }

        .stats-section {
          margin: var(--space-md) var(--space-xl);
          padding: var(--space-md) var(--space-lg);
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
        }

        .stats-toggle {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          width: 100%;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          text-align: left;
          margin-bottom: var(--space-sm);
        }

        .stats-toggle:hover {
          opacity: 0.8;
        }

        .stats-toggle svg:first-child {
          color: var(--accent-primary);
          flex-shrink: 0;
        }

        .stats-toggle h3 {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
          flex: 1;
        }

        .stats-toggle svg:last-child {
          margin-left: auto;
          color: var(--text-muted);
          transition: transform var(--transition-fast);
          flex-shrink: 0;
        }

        .stats-toggle svg:last-child.open {
          transform: rotate(180deg);
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: var(--space-md);
          padding-top: var(--space-sm);
        }

        .stat-card {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
          text-align: center;
        }

        .stat-value {
          font-size: 2rem;
          font-weight: 700;
          color: var(--accent-primary);
          margin-bottom: var(--space-xs);
        }

        .stat-label {
          font-size: 0.875rem;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .currently-interviewing-section {
          margin: var(--space-md) var(--space-xl);
          padding: var(--space-md) var(--space-lg);
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
        }

        .currently-interviewing-toggle {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          width: 100%;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          text-align: left;
          margin-bottom: var(--space-sm);
        }

        .currently-interviewing-toggle:hover {
          opacity: 0.8;
        }

        .currently-interviewing-toggle svg:first-child {
          color: rgb(245, 158, 11);
          flex-shrink: 0;
        }

        .currently-interviewing-toggle h3 {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
          flex: 1;
        }

        .currently-interviewing-toggle svg:last-child {
          margin-left: auto;
          color: var(--text-muted);
          transition: transform var(--transition-fast);
          flex-shrink: 0;
        }

        .currently-interviewing-toggle svg:last-child.open {
          transform: rotate(180deg);
        }

        .currently-interviewing-list {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: var(--space-sm);
        }

        .currently-interviewing-card {
          padding: var(--space-sm);
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .currently-interviewing-card:hover {
          background: var(--bg-hover);
          border-color: rgb(245, 158, 11);
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
        }

        .interviewing-card-content {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }

        .interviewing-card-main {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .interviewing-company {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
          line-height: 1.2;
        }

        .interviewing-title {
          font-size: 0.75rem;
          color: var(--text-secondary);
          margin: 0;
          line-height: 1.2;
        }

        .interviewing-card-meta {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          flex-wrap: wrap;
          margin-top: 2px;
        }

        .interviewing-date {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.7rem;
          color: var(--text-muted);
        }

        .interviewing-date svg {
          color: var(--text-muted);
          width: 10px;
          height: 10px;
        }

        .interviewing-type {
          display: flex;
          align-items: center;
        }

        .application-card.highlight {
          animation: highlight-pulse 2s ease-in-out;
        }

        @keyframes highlight-pulse {
          0%, 100% { 
            background: var(--bg-tertiary);
            border-color: var(--border-default);
          }
          50% { 
            background: rgba(245, 158, 11, 0.1);
            border-color: rgb(245, 158, 11);
          }
        }


        .filters-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-md) var(--space-xl);
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-subtle);
        }

        .status-filters {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          flex-wrap: wrap;
        }

        .status-filters svg {
          color: var(--text-muted);
        }

        .filter-btn {
          padding: 6px 12px;
          background: transparent;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: center;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .filter-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .filter-btn.active {
          font-weight: 600;
        }

        .applications-count {
          font-size: 0.875rem;
          color: var(--text-muted);
          font-weight: 500;
        }

        .applications-list {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-md) var(--space-lg);
          display: flex;
          flex-direction: column;
          gap: var(--space-sm);
        }

        .empty-applications {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-lg);
          padding: var(--space-2xl);
          text-align: center;
        }

        .empty-applications svg {
          color: var(--accent-primary);
          opacity: 0.5;
        }

        .empty-applications h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .empty-applications p {
          color: var(--text-secondary);
        }

        .add-first-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-xs);
          padding: 10px 20px;
          background: var(--accent-primary);
          border: none;
          border-radius: var(--radius-md);
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: center;
        }

        .add-first-btn:hover {
          background: var(--accent-secondary);
        }

        .application-card {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: var(--space-md);
          transition: all var(--transition-fast);
          overflow: visible;
          position: relative;
        }

        .application-card:hover {
          border-color: var(--border-hover);
          box-shadow: var(--shadow-sm);
        }

        .application-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: var(--space-sm);
        }

        .application-title-section {
          flex: 1;
          min-width: 0;
        }

        .company-name {
          font-size: 1rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 2px 0;
        }

        .company-name.editable {
          cursor: pointer;
          padding: 2px 4px;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }

        .company-name.editable:hover {
          background: var(--bg-hover);
          outline: 1px dashed var(--border-hover);
        }

        .job-title {
          font-size: 0.8rem;
          font-weight: 500;
          color: var(--text-secondary);
          margin: 0;
        }

        .job-title.editable {
          cursor: pointer;
          padding: 2px 4px;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }

        .job-title.editable:hover {
          background: var(--bg-hover);
          outline: 1px dashed var(--border-hover);
        }

        .application-actions {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
        }

        .status-badge {
          padding: 4px 10px;
          border-radius: var(--radius-sm);
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid;
          cursor: pointer;
          transition: all var(--transition-fast);
          user-select: none;
        }

        .status-badge.editable:hover {
          opacity: 0.9;
          transform: scale(1.05);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        }

        .status-select {
          padding: 8px 16px;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 600;
          border: 1px solid;
          cursor: pointer;
          outline: none;
          font-family: inherit;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          padding-right: 36px;
          box-shadow: 0 0 0 2px var(--accent-glow);
        }

        .status-select:focus {
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .status-select option {
          background: var(--bg-elevated);
          color: var(--text-primary);
          padding: 8px;
        }

        .action-btn {
          padding: 4px;
          border-radius: var(--radius-sm);
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .action-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .delete-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          color: var(--accent-danger);
        }

        .application-details {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-sm);
          margin-bottom: var(--space-sm);
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.8rem;
          color: var(--text-secondary);
        }

        .detail-item .editable {
          cursor: pointer;
          padding: 2px 4px;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }

        .detail-item .editable:hover {
          background: var(--bg-hover);
          outline: 1px dashed var(--border-hover);
        }

        .detail-item .editable.add-field {
          color: var(--text-muted);
          font-style: italic;
        }

        .detail-item .editable.add-field:hover {
          color: var(--text-secondary);
        }

        .inline-edit-input {
          background: var(--bg-tertiary);
          border: 1px solid var(--accent-primary);
          border-radius: var(--radius-sm);
          padding: 4px 8px;
          font-size: 0.875rem;
          color: var(--text-primary);
          font-family: inherit;
          outline: none;
          min-width: 100px;
          box-shadow: 0 0 0 2px var(--accent-glow);
        }

        .inline-edit-input.company-name-input {
          font-size: 1.125rem;
          font-weight: 600;
          min-width: 200px;
        }

        .inline-edit-input.job-title-input {
          font-size: 0.875rem;
          font-weight: 500;
          min-width: 200px;
        }

        .inline-edit-input.detail-input {
          min-width: 120px;
        }

        .inline-edit-select {
          background: var(--bg-tertiary);
          border: 1px solid var(--accent-primary);
          border-radius: var(--radius-sm);
          padding: 4px 8px;
          font-size: 0.875rem;
          color: var(--text-primary);
          font-family: inherit;
          outline: none;
          min-width: 150px;
          box-shadow: 0 0 0 2px var(--accent-glow);
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 8px center;
          padding-right: 28px;
          cursor: pointer;
        }

        .interview-type-badge {
          color: var(--accent-primary);
          font-weight: 500;
          cursor: pointer;
          padding: 2px 4px;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }

        .interview-type-badge:hover {
          background: var(--accent-glow);
          text-decoration: underline;
        }

        .interview-result-badge {
          display: inline-block;
          margin-left: 4px;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .interview-result-badge.pass {
          background: rgba(34, 197, 94, 0.1);
          color: rgb(34, 197, 94);
        }

        .interview-result-badge.fail {
          background: rgba(239, 68, 68, 0.1);
          color: rgb(239, 68, 68);
        }

        .interview-type-add {
          margin-left: var(--space-xs);
          font-size: 0.75rem;
          padding: 2px 6px;
        }

        .detail-item svg {
          color: var(--text-muted);
        }

        .timeline-section {
          margin-top: var(--space-sm);
          border-top: 1px solid var(--border-subtle);
          padding-top: var(--space-sm);
        }

        .timeline-toggle {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          width: 100%;
          padding: var(--space-xs) var(--space-sm);
          background: transparent;
          border: none;
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: left;
        }

        .timeline-toggle:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .timeline-toggle svg:last-child {
          margin-left: auto;
          transition: transform var(--transition-fast);
        }

        .timeline-toggle svg:last-child.open {
          transform: rotate(180deg);
        }

        .timeline-content {
          margin-top: var(--space-md);
          overflow: visible;
          position: relative;
        }

        .timeline-events {
          display: flex;
          flex-direction: row;
          gap: 0;
          margin-bottom: var(--space-md);
          overflow-x: auto;
          overflow-y: visible;
          padding: var(--space-sm) var(--space-sm) var(--space-md) var(--space-sm);
          position: relative;
        }

        .timeline-events::-webkit-scrollbar {
          height: 6px;
        }

        .timeline-events::-webkit-scrollbar-track {
          background: var(--bg-tertiary);
          border-radius: 3px;
        }

        .timeline-events::-webkit-scrollbar-thumb {
          background: var(--border-default);
          border-radius: 3px;
        }

        .timeline-events::-webkit-scrollbar-thumb:hover {
          background: var(--border-hover);
        }

        .timeline-event {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          min-width: 120px;
          max-width: 150px;
          flex-shrink: 0;
          padding: var(--space-sm);
          z-index: 1;
          transition: z-index var(--transition-fast);
        }

        .timeline-event:hover {
          z-index: 10;
        }

        .timeline-event-connector {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          position: relative;
          margin-bottom: var(--space-xs);
        }

        .timeline-connector-line {
          position: absolute;
          left: 0;
          right: 0;
          height: 2px;
          background: var(--border-subtle);
          z-index: 0;
          top: 50%;
          transform: translateY(-50%);
        }

        .timeline-event-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--bg-tertiary);
          border: 2px solid var(--border-default);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-primary);
          flex-shrink: 0;
          z-index: 2;
          position: relative;
          transition: all var(--transition-fast);
          margin-top: 0;
        }

        .timeline-event-icon.icon-pass {
          background: rgba(34, 197, 94, 0.1);
          border-color: rgb(34, 197, 94);
          color: rgb(34, 197, 94);
        }

        .timeline-event-icon.icon-fail {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgb(239, 68, 68);
          color: rgb(239, 68, 68);
        }

        .timeline-event:hover .timeline-event-icon {
          transform: scale(1.1);
        }

        .timeline-event:hover .timeline-event-icon.icon-pass {
          background: rgba(34, 197, 94, 0.2);
        }

        .timeline-event:hover .timeline-event-icon.icon-fail {
          background: rgba(239, 68, 68, 0.2);
        }

        .timeline-event-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          width: 100%;
          gap: var(--space-xs);
          position: relative;
          z-index: 1;
        }

        .timeline-event-type {
          font-weight: 600;
          color: var(--text-primary);
          font-size: 0.875rem;
          line-height: 1.3;
        }

        .timeline-event-type.type-pass {
          color: rgb(34, 197, 94);
        }

        .timeline-event-type.type-fail {
          color: rgb(239, 68, 68);
        }

        .timeline-interview-type {
          font-weight: 400;
          color: var(--text-secondary);
          font-size: 0.75rem;
          display: block;
          margin-top: 2px;
        }

        .timeline-result-badge {
          display: inline-block;
          margin-left: var(--space-xs);
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .timeline-result-badge.pass {
          background: rgba(34, 197, 94, 0.1);
          color: rgb(34, 197, 94);
        }

        .timeline-result-badge.fail {
          background: rgba(239, 68, 68, 0.1);
          color: rgb(239, 68, 68);
        }

        .timeline-event-date {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: var(--space-xs);
        }

        .timeline-event-date.date-pass {
          color: rgb(34, 197, 94);
        }

        .timeline-event-date.date-fail {
          color: rgb(239, 68, 68);
        }

        .timeline-connector-line.connector-pass {
          background: rgba(34, 197, 94, 0.3);
        }

        .timeline-connector-line.connector-fail {
          background: rgba(239, 68, 68, 0.3);
        }

        .timeline-event-notes {
          font-size: 0.75rem;
          color: var(--text-secondary);
          line-height: 1.4;
          margin-top: var(--space-xs);
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .timeline-event-actions {
          display: flex;
          gap: var(--space-xs);
          margin-top: var(--space-xs);
          opacity: 0;
          visibility: hidden;
          transition: opacity var(--transition-fast), visibility var(--transition-fast);
          position: relative;
          z-index: 2;
        }

        .timeline-event:hover .timeline-event-actions {
          opacity: 1;
          visibility: visible;
        }

        .timeline-event-actions:hover {
          opacity: 1;
          visibility: visible;
        }

        .timeline-event-actions .action-btn {
          padding: 6px;
          font-size: 0.75rem;
          min-width: 28px;
          min-height: 28px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
          position: relative;
          z-index: 3;
          flex-shrink: 0;
        }

        .timeline-event-actions .action-btn:hover {
          background: var(--bg-hover);
          transform: scale(1.1);
        }

        .timeline-event-actions .delete-btn {
          display: flex;
          opacity: 1;
          visibility: visible;
        }

        .timeline-event-actions .delete-btn:hover {
          background: rgba(239, 68, 68, 0.15);
          border-color: rgb(239, 68, 68);
          color: rgb(239, 68, 68);
        }

        .timeline-event-actions .edit-btn {
          display: flex;
          opacity: 1;
          visibility: visible;
        }

        .timeline-event-actions .edit-btn:hover {
          background: rgba(59, 130, 246, 0.15);
          border-color: rgb(59, 130, 246);
          color: rgb(59, 130, 246);
        }

        .timeline-add-event {
          opacity: 0.6;
          transition: opacity var(--transition-fast);
        }

        .timeline-add-event:hover {
          opacity: 1;
        }

        .timeline-add-event-icon {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: var(--bg-tertiary);
          border: 2px dashed var(--border-default);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary);
          flex-shrink: 0;
          z-index: 2;
          position: relative;
          cursor: pointer;
          transition: all var(--transition-fast);
          padding: 0;
        }

        .timeline-add-event-icon:hover {
          background: var(--accent-glow);
          border-color: var(--accent-primary);
          border-style: solid;
          color: var(--accent-primary);
          transform: scale(1.1);
        }

        .timeline-add-event-label {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-top: var(--space-xs);
          text-align: center;
        }

        .timeline-add-event:hover .timeline-add-event-label {
          color: var(--accent-primary);
        }

        .timeline-empty {
          padding: var(--space-lg);
          text-align: center;
          color: var(--text-muted);
          font-size: 0.875rem;
        }

        .timeline-actions {
          display: flex;
          gap: var(--space-sm);
          margin-top: var(--space-md);
        }

        .add-event-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-xs);
          flex: 1;
          padding: var(--space-sm);
          background: var(--bg-tertiary);
          border: 1px dashed var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .add-event-btn:hover {
          background: var(--bg-hover);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }

        .clear-all-events-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-xs);
          padding: var(--space-sm) var(--space-md);
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .clear-all-events-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgb(239, 68, 68);
          color: rgb(239, 68, 68);
        }

        .event-form {
          background: var(--bg-secondary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: var(--space-md);
          margin-bottom: var(--space-md);
        }

        .event-form-row {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: var(--space-md);
          margin-bottom: var(--space-md);
        }

        .event-form-group {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }

        .event-form-group label {
          font-size: 0.75rem;
          font-weight: 500;
          color: var(--text-secondary);
        }

        .event-form-group select,
        .event-form-group input,
        .event-form-group textarea {
          padding: 6px 10px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-sm);
          color: var(--text-primary);
          font-size: 0.875rem;
          font-family: inherit;
        }

        .event-form-group textarea {
          resize: vertical;
        }

        .event-form-actions {
          display: flex;
          gap: var(--space-sm);
          justify-content: flex-end;
        }

        .event-form-actions .btn-save,
        .event-form-actions .btn-cancel {
          padding: 6px 12px;
          font-size: 0.875rem;
        }

        .application-footer {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-md);
          padding-top: var(--space-md);
          border-top: 1px solid var(--border-subtle);
        }

        .external-link, .job-desc-link {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          font-size: 0.875rem;
          color: var(--accent-primary);
          text-decoration: none;
        }

        .external-link:hover {
          text-decoration: underline;
        }

        .job-desc-link {
          color: var(--text-secondary);
        }

        .notes-preview {
          flex: 1;
          min-width: 200px;
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          padding: 20px;
        }

        .modal {
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          width: 100%;
          max-width: 500px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: var(--shadow-lg);
        }

        .modal.large-modal {
          max-width: 700px;
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-xl);
          border-bottom: 1px solid var(--border-subtle);
        }

        .modal-header h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .close-btn {
          padding: 4px;
          border-radius: var(--radius-sm);
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .modal-content {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-xl);
        }

        .form-group {
          margin-bottom: var(--space-lg);
        }

        .form-group label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: var(--space-xs);
        }

        .form-group input,
        .form-group textarea,
        .form-group select {
          width: 100%;
          padding: 10px 14px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.875rem;
          font-family: inherit;
          transition: all var(--transition-fast);
          box-sizing: border-box;
        }

        .form-group select {
          text-align: left;
          text-align-last: left;
          appearance: none;
          -webkit-appearance: none;
          -moz-appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 14px center;
          padding-right: 40px;
          cursor: pointer;
          line-height: 1.5;
        }

        .form-group select option {
          text-align: left;
          padding: 8px;
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .form-group textarea {
          resize: vertical;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-md);
        }

        .checkbox-group {
          margin-bottom: var(--space-md);
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 16px;
          cursor: pointer;
          font-size: 0.875rem;
          color: var(--text-primary);
          user-select: none;
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          margin: 0;
          cursor: pointer;
          accent-color: var(--accent-primary);
          flex-shrink: 0;
        }

        .checkbox-label input[type="checkbox"]:checked {
          background-color: var(--accent-primary);
          border-color: var(--accent-primary);
        }

        .checkbox-label input[type="checkbox"]:focus {
          outline: 2px solid var(--accent-glow);
          outline-offset: 2px;
        }

        .checkbox-label span {
          color: var(--text-primary);
          font-weight: 500;
        }

        .checkbox-label:hover span {
          color: var(--text-primary);
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: var(--space-sm);
          padding: var(--space-xl);
          border-top: 1px solid var(--border-subtle);
        }

        .btn-cancel, .btn-save {
          padding: 10px 20px;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-xs);
          text-align: center;
        }

        .btn-cancel {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }

        .btn-cancel:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .btn-save {
          background: var(--accent-primary);
          color: white;
        }

        .btn-save:hover:not(:disabled) {
          background: var(--accent-secondary);
        }

        .btn-save:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }


          .cycle-selector-btn {
            min-width: auto;
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
