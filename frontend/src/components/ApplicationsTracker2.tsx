// ApplicationsTracker Component v2.0 - FULL VERSION - NO TEST CODE
// Last updated: 2025-12-28 18:45:00
import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Briefcase, Plus, Edit3, Trash2, Filter, X, Calendar, MapPin, 
  DollarSign, ExternalLink, CheckCircle2, Clock, FileText, 
  TrendingUp, ChevronDown, Save, AlertCircle
} from 'lucide-react'
import { JobSearchCycle, Application, ApplicationStats } from '../types'

// Module loaded successfully

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

const STATUS_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  interested: { bg: 'rgba(99, 102, 241, 0.1)', text: 'rgb(99, 102, 241)', border: 'rgb(99, 102, 241)' },
  applied: { bg: 'rgba(59, 130, 246, 0.1)', text: 'rgb(59, 130, 246)', border: 'rgb(59, 130, 246)' },
  interviewing: { bg: 'rgba(245, 158, 11, 0.1)', text: 'rgb(245, 158, 11)', border: 'rgb(245, 158, 11)' },
  offer: { bg: 'rgba(34, 197, 94, 0.1)', text: 'rgb(34, 197, 94)', border: 'rgb(34, 197, 94)' },
  rejected: { bg: 'rgba(239, 68, 68, 0.1)', text: 'rgb(239, 68, 68)', border: 'rgb(239, 68, 68)' },
  withdrawn: { bg: 'rgba(107, 114, 128, 0.1)', text: 'rgb(107, 114, 128)', border: 'rgb(107, 114, 128)' },
  accepted: { bg: 'rgba(16, 185, 129, 0.1)', text: 'rgb(16, 185, 129)', border: 'rgb(16, 185, 129)' }
}

// Applications Tracker Component - v2.0
export function ApplicationsTracker() {
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
    reply_received: null as boolean | null,
    reply_date: '',
    notes: '',
    job_posting_url: '',
    salary_range: '',
    location: '',
    job_description_id: ''
  })
  const [jobDescriptions, setJobDescriptions] = useState<Array<{ id: string; title: string | null }>>([])
  const [isCycleDropdownOpen, setIsCycleDropdownOpen] = useState(false)
  const cycleDropdownRef = useRef<HTMLDivElement>(null)
  const [editingField, setEditingField] = useState<{ appId: string; field: string } | null>(null)
  const editInputRef = useRef<HTMLInputElement | null>(null)
  const initialEditValueRef = useRef<string>('')
  
  const setEditInputRef = (element: HTMLInputElement | null) => {
    editInputRef.current = element
    if (element) {
      // Use requestAnimationFrame to ensure the element is fully mounted and DOM is updated
      requestAnimationFrame(() => {
        if (element) {
          element.focus()
          element.select()
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

  const fetchApplications = async () => {
    if (!selectedCycleId) return
    try {
      const url = statusFilter 
        ? `${API_URL}/applications/cycle/${selectedCycleId}?status=${statusFilter}`
        : `${API_URL}/applications/cycle/${selectedCycleId}`
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
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
        reply_received: null, // Start as waiting for reply
        reply_date: null
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
          reply_received: null,
          reply_date: '',
          notes: '',
          job_posting_url: '',
          salary_range: '',
          location: '',
          job_description_id: ''
        })
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
      reply_received: app.reply_received,
      reply_date: app.reply_date || '',
      notes: app.notes || '',
      job_posting_url: app.job_posting_url || '',
      salary_range: app.salary_range || '',
      location: app.location || '',
      job_description_id: app.job_description_id || ''
    })
    setShowApplicationModal(true)
  }

  const handleToggleReplyReceived = async (app: Application, newState: boolean | null) => {
    const replyDate = newState === true ? new Date().toISOString().split('T')[0] : null

    try {
      await fetch(`${API_URL}/applications/${app.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reply_received: newState,
          reply_date: replyDate
        })
      })
      await fetchApplications()
      await fetchStats()
    } catch (error) {
      console.error('Failed to update reply status:', error)
    }
  }

  const handleStartEdit = (app: Application, field: string) => {
    let value = ''
    if (field === 'company_name') value = app.company_name
    else if (field === 'job_title') value = app.job_title
    else if (field === 'location') value = app.location || ''
    else if (field === 'salary_range') value = app.salary_range || ''
    else if (field === 'interview_date') value = app.interview_date ? app.interview_date.split('T')[0] : ''
    
    initialEditValueRef.current = value
    setEditingField({ appId: app.id, field })
    
    // Set the input value after a brief delay to ensure it's mounted
    requestAnimationFrame(() => {
      if (editInputRef.current) {
        editInputRef.current.value = value
        editInputRef.current.focus()
        editInputRef.current.select()
      }
    })
  }

  const handleCancelEdit = () => {
    setEditingField(null)
    initialEditValueRef.current = ''
  }

  const handleSaveField = async (app: Application, field: string) => {
    const currentValue = editInputRef.current?.value || ''
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
      <div className="tracker-header">
        <div className="header-content">
          <Briefcase size={24} />
          <h1>Applications Tracker</h1>
        </div>
        <div className="header-actions">
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
                reply_received: null, // Start as waiting
                reply_date: '',
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
        </div>
      </div>

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
                <div className="stat-value">{stats.interviewing_count}</div>
                <div className="stat-label">Interviewing</div>
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
              <div className="stat-card">
                <div className="stat-value">{stats.replied_count || 0}</div>
                <div className="stat-label">Replies</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.no_reply_count || 0}</div>
                <div className="stat-label">No Reply</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{stats.waiting_reply_count || 0}</div>
                <div className="stat-label">Waiting</div>
              </div>
            </div>
          )}

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
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
            <div className="applications-count">
              {filteredApplications.length} {filteredApplications.length === 1 ? 'application' : 'applications'}
            </div>
          </div>

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
                const statusColor = STATUS_COLORS[app.status] || STATUS_COLORS.applied
                return (
                  <motion.div
                    key={app.id}
                    className="application-card"
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
                        <span
                          className="status-badge"
                          style={{
                            backgroundColor: statusColor.bg,
                            color: statusColor.text,
                            borderColor: statusColor.border
                          }}
                        >
                          {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                        </span>
                        <button
                          className="action-btn edit-btn"
                          onClick={() => handleEditApplication(app)}
                          title="Edit"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteApplication(app.id)}
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="application-details">
                      <div className="detail-item">
                        <MapPin size={14} />
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
                      {app.applied_date && (
                        <div className="detail-item">
                          <Calendar size={14} />
                          <span>Applied: {new Date(app.applied_date).toLocaleDateString()}</span>
                        </div>
                      )}
                      <div className="detail-item">
                        <Clock size={14} />
                        {editingField?.appId === app.id && editingField.field === 'interview_date' ? (
                          <input
                            ref={setEditInputRef}
                            type="date"
                            className="inline-edit-input detail-input"
                            defaultValue={initialEditValueRef.current}
                            onBlur={(e) => {
                              e.stopPropagation()
                              handleSaveField(app, 'interview_date')
                            }}
                            onKeyDown={(e) => {
                              e.stopPropagation()
                              if (e.key === 'Enter') {
                                e.preventDefault()
                                handleSaveField(app, 'interview_date')
                              } else if (e.key === 'Escape') {
                                e.preventDefault()
                                handleCancelEdit()
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <span 
                            className={app.interview_date ? 'editable' : 'editable add-field'}
                            onClick={() => handleStartEdit(app, 'interview_date')}
                            title="Click to edit"
                          >
                            {app.interview_date ? `Interview: ${new Date(app.interview_date).toLocaleDateString()}` : 'Add interview date'}
                          </span>
                        )}
                      </div>
                      <div className="detail-item">
                        <DollarSign size={14} />
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
                      {/* Reply status - three states: null (waiting), true (received), false (no reply) */}
                      {app.reply_received === true ? (
                        <div className="detail-item reply-received">
                          <CheckCircle2 size={14} />
                          <span>Reply received{app.reply_date ? ` on ${new Date(app.reply_date).toLocaleDateString()}` : ''}</span>
                          <button
                            className="toggle-reply-btn"
                            onClick={() => handleToggleReplyReceived(app, false)}
                            title="Mark as no reply"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : app.reply_received === false ? (
                        <div className="detail-item no-reply">
                          <AlertCircle size={14} />
                          <span>No reply</span>
                          <button
                            className="toggle-reply-btn"
                            onClick={() => handleToggleReplyReceived(app, null)}
                            title="Reset to waiting"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <div className="reply-actions">
                          <button
                            className="mark-reply-btn"
                            onClick={() => handleToggleReplyReceived(app, true)}
                            title="Mark reply as received"
                          >
                            <CheckCircle2 size={14} />
                            <span>Reply Received</span>
                          </button>
                          <button
                            className="mark-no-reply-btn"
                            onClick={() => handleToggleReplyReceived(app, false)}
                            title="Mark as no reply"
                          >
                            <AlertCircle size={14} />
                            <span>No Reply</span>
                          </button>
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
                          {status.charAt(0).toUpperCase() + status.slice(1)}
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
                    <label>Reply Status</label>
                    <select
                      value={applicationForm.reply_received === null ? 'waiting' : applicationForm.reply_received ? 'received' : 'no_reply'}
                      onChange={(e) => {
                        const value = e.target.value
                        const replyReceived = value === 'waiting' ? null : value === 'received' ? true : false
                        const replyDate = replyReceived === true ? new Date().toISOString().split('T')[0] : ''
                        setApplicationForm({ 
                          ...applicationForm, 
                          reply_received: replyReceived,
                          reply_date: replyDate
                        })
                      }}
                    >
                      <option value="waiting">Waiting for Reply</option>
                      <option value="received">Reply Received</option>
                      <option value="no_reply">No Reply</option>
                    </select>
                  </div>
                  {applicationForm.reply_received === true && (
                    <div className="form-group">
                      <label>Reply Date</label>
                      <input
                        type="date"
                        value={applicationForm.reply_date}
                        onChange={(e) => setApplicationForm({ ...applicationForm, reply_date: e.target.value })}
                      />
                    </div>
                  )}
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
                  <select
                    value={applicationForm.job_description_id}
                    onChange={(e) => setApplicationForm({ ...applicationForm, job_description_id: e.target.value })}
                  >
                    <option value="">None</option>
                    {jobDescriptions.map(jd => (
                      <option key={jd.id} value={jd.id}>{jd.title}</option>
                    ))}
                  </select>
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

        .tracker-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-xl);
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-secondary);
          flex-shrink: 0;
          width: 100%;
          box-sizing: border-box;
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }

        .header-content svg {
          color: var(--accent-primary);
        }

        .header-content h1 {
          font-size: 1.5rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: var(--space-md);
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

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: var(--space-md);
          padding: var(--space-xl);
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-subtle);
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
          padding: var(--space-xl);
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
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
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
          transition: all var(--transition-fast);
        }

        .application-card:hover {
          border-color: var(--border-hover);
          box-shadow: var(--shadow-sm);
        }

        .application-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: var(--space-md);
        }

        .application-title-section {
          flex: 1;
          min-width: 0;
        }

        .company-name {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0 0 var(--space-xs) 0;
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
          font-size: 0.875rem;
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
          gap: var(--space-sm);
        }

        .status-badge {
          padding: 4px 12px;
          border-radius: var(--radius-md);
          font-size: 0.75rem;
          font-weight: 600;
          border: 1px solid;
        }

        .action-btn {
          padding: 6px;
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
          gap: var(--space-md);
          margin-bottom: var(--space-md);
        }

        .detail-item {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          font-size: 0.875rem;
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

        .detail-item.reply-received {
          background: rgba(34, 197, 94, 0.1);
          padding: 6px 10px;
          border-radius: var(--radius-md);
          border: 1px solid rgba(34, 197, 94, 0.3);
          position: relative;
        }

        .detail-item svg {
          color: var(--text-muted);
        }

        .detail-item.reply-received svg {
          color: rgb(34, 197, 94);
        }

        .detail-item.no-reply {
          background: rgba(239, 68, 68, 0.1);
          padding: 6px 10px;
          border-radius: var(--radius-md);
          border: 1px solid rgba(239, 68, 68, 0.3);
          position: relative;
        }

        .detail-item.no-reply svg {
          color: rgb(239, 68, 68);
        }

        .reply-actions {
          display: flex;
          gap: var(--space-xs);
        }

        .mark-reply-btn {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          padding: 6px 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .mark-reply-btn:hover {
          background: rgba(34, 197, 94, 0.1);
          border-color: rgba(34, 197, 94, 0.3);
          color: rgb(34, 197, 94);
        }

        .mark-no-reply-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-xs);
          padding: 6px 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all var(--transition-fast);
          text-align: center;
        }

        .mark-no-reply-btn:hover {
          background: rgba(239, 68, 68, 0.1);
          border-color: rgba(239, 68, 68, 0.3);
          color: rgb(239, 68, 68);
        }

        .mark-reply-btn svg {
          color: inherit;
        }

        .toggle-reply-btn {
          margin-left: var(--space-xs);
          padding: 2px 4px;
          border-radius: var(--radius-sm);
          border: none;
          background: transparent;
          color: var(--text-muted);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          opacity: 0.6;
          transition: all var(--transition-fast);
        }

        .detail-item.reply-received:hover .toggle-reply-btn,
        .detail-item.no-reply:hover .toggle-reply-btn {
          opacity: 1;
        }

        .toggle-reply-btn:hover {
          background: rgba(239, 68, 68, 0.15);
          color: var(--accent-danger);
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

          .tracker-header {
            flex-direction: column;
            align-items: stretch;
            gap: var(--space-md);
          }

          .header-actions {
            width: 100%;
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
