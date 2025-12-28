import { useState, useEffect, useRef } from 'react'
import { FileText, Copy, Check, Save, ChevronDown, Trash2, Plus, ExternalLink, Edit3 } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

interface JobDescriptionData {
  id: string
  resume_id: string
  content: string
  title: string | null
  job_posting_url: string | null
  created_at: string
  updated_at: string
}

interface JobDescriptionProps {
  resumeId: string | null
  onJobDescriptionChange?: (description: string | null) => void
}

export function JobDescription({ resumeId, onJobDescriptionChange }: JobDescriptionProps) {
  const [jobDescription, setJobDescription] = useState('')
  const [jobPostingUrl, setJobPostingUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [savedDescriptions, setSavedDescriptions] = useState<JobDescriptionData[]>([])
  const [selectedDescriptionId, setSelectedDescriptionId] = useState<string | null>(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [saveTitle, setSaveTitle] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editTitleValue, setEditTitleValue] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const headerActionsRef = useRef<HTMLDivElement>(null)
  const titleInputRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const updateHeight = () => {
      if (textareaRef.current && containerRef.current) {
        const header = containerRef.current.querySelector('.job-description-header')
        const urlContainer = containerRef.current.querySelector('.url-input-container')
        if (header) {
          const headerHeight = header.getBoundingClientRect().height
          const urlHeight = urlContainer ? urlContainer.getBoundingClientRect().height : 0
          const containerHeight = containerRef.current.getBoundingClientRect().height
          const contentPadding = 32 * 2 // var(--space-xl) * 2
          const contentGap = 16 // var(--space-md)
          const textareaPadding = 24 * 2 // var(--space-lg) * 2
          const availableHeight = containerHeight - headerHeight - urlHeight - contentPadding - contentGap - textareaPadding
          textareaRef.current.style.height = `${Math.max(availableHeight, 400)}px`
        }
      }
    }
    
    updateHeight()
    window.addEventListener('resize', updateHeight)
    const observer = new ResizeObserver(updateHeight)
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }
    
    return () => {
      window.removeEventListener('resize', updateHeight)
      observer.disconnect()
    }
  }, [])

  // Load all saved job descriptions when resume changes
  useEffect(() => {
    if (resumeId) {
      fetchSavedDescriptions()
    } else {
      setSavedDescriptions([])
      setJobDescription('')
      setJobPostingUrl('')
      setSelectedDescriptionId(null)
      if (onJobDescriptionChange) {
        onJobDescriptionChange(null)
      }
    }
  }, [resumeId, onJobDescriptionChange])

  // Debug: Log when component renders
  useEffect(() => {
    console.log('JobDescription useEffect - resumeId changed', resumeId, typeof resumeId)
  }, [resumeId])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (headerActionsRef.current && !headerActionsRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchSavedDescriptions = async () => {
    if (!resumeId) return
    const resumeIdString = typeof resumeId === 'string' ? resumeId : String(resumeId)
    try {
      const response = await fetch(`${API_URL}/job-descriptions/resume/${resumeIdString}`)
      if (response.ok) {
        const data = await response.json()
        setSavedDescriptions(data)
        // Load the most recent one if available
        if (data.length > 0 && !selectedDescriptionId) {
          loadDescription(data[0])
        }
      }
    } catch (error) {
      console.error('Failed to fetch job descriptions:', error)
    }
  }

  const loadDescription = async (description: JobDescriptionData) => {
    try {
      const response = await fetch(`${API_URL}/job-descriptions/${description.id}`)
      if (response.ok) {
        const data = await response.json()
        const content = data.content || ''
        setJobDescription(content)
        setJobPostingUrl(data.job_posting_url || '')
        setSelectedDescriptionId(data.id)
        setIsDropdownOpen(false)
        setEditingTitle(false)
        // Notify parent about job description change
        if (onJobDescriptionChange) {
          onJobDescriptionChange(content)
        }
      }
    } catch (error) {
      console.error('Failed to load job description:', error)
    }
  }

  const handleTitleEdit = () => {
    if (!selectedDescription) return
    setEditTitleValue(selectedDescription.title || '')
    setEditingTitle(true)
  }

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      // Select all text
      const range = document.createRange()
      range.selectNodeContents(titleInputRef.current)
      const selection = window.getSelection()
      selection?.removeAllRanges()
      selection?.addRange(range)
    }
  }, [editingTitle])

  const handleTitleSave = async () => {
    if (!selectedDescriptionId) return

    const newTitle = titleInputRef.current?.textContent?.trim() || ''

    try {
      const response = await fetch(`${API_URL}/job-descriptions/${selectedDescriptionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTitle || null,
          content: jobDescription,
          job_posting_url: jobPostingUrl
        })
      })

      if (response.ok) {
        setEditingTitle(false)
        setEditTitleValue('')
        await fetchSavedDescriptions()
      } else {
        console.error('Failed to update title')
        alert('Failed to update title')
      }
    } catch (error) {
      console.error('Failed to update title:', error)
      alert('Failed to update title')
    }
  }

  const handleTitleCancel = () => {
    setEditingTitle(false)
    setEditTitleValue('')
  }
  
  // Notify parent when job description text changes
  useEffect(() => {
    if (onJobDescriptionChange) {
      onJobDescriptionChange(jobDescription || null)
    }
  }, [jobDescription, onJobDescriptionChange])

  const handleSave = async () => {
    if (!resumeId || !jobDescription.trim()) return

    // If a job description is selected, update it directly
    if (selectedDescriptionId) {
      await handleUpdate()
      return
    }

    // Otherwise, show save dialog to create new one
    setShowSaveDialog(true)
  }

  const handleUpdate = async () => {
    if (!selectedDescriptionId || !jobDescription.trim()) return

    try {
      setSaveStatus('saving')
      const response = await fetch(`${API_URL}/job-descriptions/${selectedDescriptionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: jobDescription,
          title: selectedDescription?.title || null,
          job_posting_url: jobPostingUrl.trim() || null
        })
      })

      if (response.ok) {
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
        // Refresh the list to get updated data
        await fetchSavedDescriptions()
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to update job description:', response.status, errorData)
        alert(`Failed to update: ${errorData.error || errorData.details || 'Unknown error'}`)
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 2000)
      }
    } catch (error) {
      console.error('Failed to update job description:', error)
      const errorMessage = error instanceof Error ? error.message : 'Network error'
      alert(`Failed to update: ${errorMessage}`)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }

  const confirmSave = async () => {
    if (!resumeId || !jobDescription.trim()) return

    // Ensure resumeId is a string
    const resumeIdString = typeof resumeId === 'string' ? resumeId : String(resumeId)
    
    if (!resumeIdString || resumeIdString === 'null' || resumeIdString === 'undefined') {
      console.error('Invalid resumeId:', resumeId, typeof resumeId)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
      return
    }

    try {
      setSaveStatus('saving')
      console.log('Saving job description with resumeId:', resumeIdString)
      const response = await fetch(`${API_URL}/job-descriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_id: resumeIdString,
          content: jobDescription,
          title: saveTitle.trim() || null,
          job_posting_url: jobPostingUrl.trim() || null
        })
      })

      if (response.ok) {
        const data = await response.json()
        setSaveStatus('saved')
        setSaveTitle('')
        setShowSaveDialog(false)
        setTimeout(() => setSaveStatus('idle'), 2000)
        // Refresh the list
        await fetchSavedDescriptions()
        // Select the newly saved description
        setSelectedDescriptionId(data.id)
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        console.error('Failed to save job description:', response.status, errorData)
        alert(`Failed to save: ${errorData.error || errorData.details || 'Unknown error'}`)
        setSaveStatus('error')
        setTimeout(() => setSaveStatus('idle'), 2000)
      }
    } catch (error) {
      console.error('Failed to save job description:', error)
      const errorMessage = error instanceof Error ? error.message : 'Network error'
      alert(`Failed to save: ${errorMessage}`)
      setSaveStatus('error')
      setTimeout(() => setSaveStatus('idle'), 2000)
    }
  }

  const handleNew = () => {
    setSelectedDescriptionId(null)
    setJobDescription('')
    setJobPostingUrl('')
    setEditingTitle(false)
    setIsDropdownOpen(false)
    if (onJobDescriptionChange) {
      onJobDescriptionChange(null)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Delete this job description?')) return

    try {
      const response = await fetch(`${API_URL}/job-descriptions/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        // Remove from list
        setSavedDescriptions(savedDescriptions.filter(d => d.id !== id))
        // If deleted one was selected, clear selection
        if (selectedDescriptionId === id) {
          setSelectedDescriptionId(null)
          setJobDescription('')
          setJobPostingUrl('')
        }
      }
    } catch (error) {
      console.error('Failed to delete job description:', error)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jobDescription)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const getDescriptionTitle = (description: JobDescriptionData) => {
    return description.title || `Job Description ${new Date(description.created_at).toLocaleDateString()}`
  }

  const selectedDescription = savedDescriptions.find(d => d.id === selectedDescriptionId)

  return (
    <div className="job-description" ref={containerRef}>
      <div className="job-description-header">
        <div className="header-content">
          <FileText size={20} />
          <h2>Job Description</h2>
          {saveStatus === 'saving' && (
            <span className="save-status saving">
              <Save size={14} />
              Saving...
            </span>
          )}
          {saveStatus === 'saved' && (
            <span className="save-status saved">
              <Check size={14} />
              Saved
            </span>
          )}
          {saveStatus === 'error' && (
            <span className="save-status error">
              Save failed
            </span>
          )}
        </div>
        <div className="header-actions" ref={headerActionsRef}>
          <div style={{ position: 'relative' }}>
            <button
              className="selector-btn"
              onClick={() => !editingTitle && setIsDropdownOpen(!isDropdownOpen)}
              title="Select saved job description"
            >
              {editingTitle ? (
                <span
                  ref={titleInputRef}
                  className="title-edit-input"
                  contentEditable
                  suppressContentEditableWarning
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      titleInputRef.current?.blur()
                    } else if (e.key === 'Escape') {
                      e.preventDefault()
                      handleTitleCancel()
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                  style={{ outline: 'none', flex: 1, minWidth: 0 }}
                >
                  {editTitleValue}
                </span>
              ) : (
                <>
                  <span 
                    className="selector-title"
                    onDoubleClick={(e) => {
                      e.stopPropagation()
                      handleTitleEdit()
                    }}
                    title="Double-click to edit title"
                  >
                    {selectedDescription ? getDescriptionTitle(selectedDescription) : 'Select...'}
                  </span>
                  {selectedDescription && (
                    <button
                      className="edit-title-btn"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleTitleEdit()
                      }}
                      title="Edit title"
                    >
                      <Edit3 size={12} />
                    </button>
                  )}
                </>
              )}
              <ChevronDown size={16} className={isDropdownOpen ? 'open' : ''} />
            </button>
            {isDropdownOpen && (
              <div className="selector-dropdown">
                {savedDescriptions.length === 0 ? (
                  <div className="dropdown-empty">No saved descriptions</div>
                ) : (
                  savedDescriptions.map((desc) => (
                    <div
                      key={desc.id}
                      className={`dropdown-item ${selectedDescriptionId === desc.id ? 'active' : ''}`}
                      onClick={() => loadDescription(desc)}
                    >
                      <span className="item-title">{getDescriptionTitle(desc)}</span>
                      <span className="item-date">{new Date(desc.updated_at).toLocaleDateString()}</span>
                      <button
                        className="delete-item-btn"
                        onClick={(e) => handleDelete(desc.id, e)}
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          <button
            className="new-btn"
            onClick={handleNew}
            title="Create new job description"
          >
            <Plus size={16} />
            <span>New</span>
          </button>
          <button
            className="save-btn"
            onClick={handleSave}
            disabled={!jobDescription.trim() || saveStatus === 'saving' || !resumeId}
            title={selectedDescriptionId ? "Update job description" : "Save job description"}
          >
            <Save size={16} />
            <span>{selectedDescriptionId ? 'Update' : 'Save'}</span>
          </button>
          <button 
            className={`copy-btn ${copied ? 'copied' : ''}`}
            onClick={handleCopy}
            disabled={!jobDescription.trim()}
            title="Copy job description"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {showSaveDialog && (
        <div className="save-dialog-overlay" onClick={() => setShowSaveDialog(false)}>
          <div className="save-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Save Job Description</h3>
            <input
              type="text"
              placeholder="Enter a name for this job description (optional)"
              value={saveTitle}
              onChange={(e) => setSaveTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  confirmSave()
                } else if (e.key === 'Escape') {
                  setShowSaveDialog(false)
                  setSaveTitle('')
                }
              }}
              autoFocus
            />
            <div className="dialog-actions">
              <button className="btn-cancel" onClick={() => {
                setShowSaveDialog(false)
                setSaveTitle('')
              }}>
                Cancel
              </button>
              <button className="btn-save" onClick={confirmSave} disabled={saveStatus === 'saving'}>
                {saveStatus === 'saving' ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="job-description-content">
        <div className="url-input-container">
          <label htmlFor="job-posting-url" className="url-label">
            <ExternalLink size={16} />
            <span>Job Posting URL</span>
          </label>
          <input
            id="job-posting-url"
            type="url"
            className="url-input"
            placeholder="https://example.com/job-posting"
            value={jobPostingUrl}
            onChange={(e) => setJobPostingUrl(e.target.value)}
          />
          {jobPostingUrl && (
            <a
              href={jobPostingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="url-link"
              title="Open in new tab"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
        <textarea
          ref={textareaRef}
          className="job-description-textarea"
          placeholder="Paste or type the job description here..."
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          autoFocus
        />
      </div>

      <style>{`
        .job-description {
          height: 100%;
          width: 100%;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary);
          overflow: hidden;
          min-height: 0;
          position: relative;
        }


        .job-description-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-xl);
          border-bottom: 1px solid var(--border-subtle);
          background: var(--bg-secondary);
          flex-shrink: 0;
          gap: var(--space-md);
          min-height: 80px;
          width: 100%;
          box-sizing: border-box;
          overflow: visible;
        }
        
        .header-content {
          display: flex;
          align-items: center;
          gap: var(--space-md);
          flex-shrink: 1;
          min-width: 0;
        }

        @media (max-width: 1200px) {
          .job-description-header {
            flex-direction: column;
            align-items: stretch;
            gap: var(--space-md);
          }
          
          .header-actions {
            width: 100%;
            justify-content: flex-start;
            flex-wrap: wrap;
          }
        }

        .header-content svg {
          color: var(--accent-primary);
        }

        .header-content h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .save-status {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.8rem;
          margin-left: var(--space-md);
          padding: 4px 8px;
          border-radius: var(--radius-sm);
          font-weight: 500;
        }

        .save-status.saving {
          color: var(--text-muted);
        }

        .save-status.saved {
          color: var(--accent-success);
          background: rgba(34, 197, 94, 0.1);
        }

        .save-status.error {
          color: var(--accent-danger);
          background: rgba(239, 68, 68, 0.1);
        }

        .save-status svg {
          width: 14px;
          height: 14px;
        }

        .header-actions {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          flex-shrink: 0;
          justify-content: flex-end;
          position: relative;
        }

        .selector-btn {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          padding: 8px 16px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          min-width: 180px;
          justify-content: space-between;
          white-space: nowrap;
          position: relative;
        }

        .selector-btn:hover {
          background: var(--bg-hover);
          border-color: var(--border-hover);
          color: var(--text-primary);
        }

        .selector-btn svg {
          transition: transform var(--transition-fast);
        }

        .selector-btn svg.open {
          transform: rotate(180deg);
        }

        .selector-title {
          flex: 1;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .edit-title-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2px 4px;
          margin: 0 4px;
          background: transparent;
          border: none;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          cursor: pointer;
          opacity: 0;
          transition: all var(--transition-fast);
        }

        .selector-btn:hover .edit-title-btn {
          opacity: 1;
        }

        .edit-title-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .title-edit-input {
          flex: 1;
          min-width: 0;
          background: var(--bg-tertiary);
          border: 1px solid var(--accent-primary);
          border-radius: var(--radius-sm);
          padding: 2px 6px;
          color: var(--text-primary);
          font-size: 0.875rem;
          font-weight: 500;
          outline: none;
        }

        .title-edit-input:focus {
          border-color: var(--accent-secondary);
          box-shadow: 0 0 0 2px var(--accent-glow);
        }

        .selector-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          right: 0;
          min-width: 280px;
          max-width: 400px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          padding: 4px;
          z-index: 1000;
          max-height: 400px;
          overflow-y: auto;
        }

        .dropdown-empty {
          padding: var(--space-md);
          text-align: center;
          color: var(--text-muted);
          font-size: 0.875rem;
        }

        .dropdown-item {
          display: flex;
          flex-direction: column;
          padding: var(--space-sm) var(--space-md);
          border-radius: var(--radius-sm);
          cursor: pointer;
          transition: all var(--transition-fast);
          position: relative;
          gap: 4px;
        }

        .dropdown-item:hover {
          background: var(--bg-hover);
        }

        .dropdown-item.active {
          background: var(--accent-glow);
        }

        .item-title {
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
        }

        .item-date {
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .delete-item-btn {
          position: absolute;
          right: var(--space-sm);
          top: 50%;
          transform: translateY(-50%);
          padding: 4px;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          opacity: 0;
          transition: all var(--transition-fast);
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .dropdown-item:hover .delete-item-btn {
          opacity: 1;
        }

        .delete-item-btn:hover {
          background: rgba(239, 68, 68, 0.15);
          color: var(--accent-danger);
        }

        .new-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          white-space: nowrap;
        }

        .new-btn:hover {
          background: var(--bg-hover);
          border-color: var(--border-hover);
          color: var(--text-primary);
        }

        .save-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: var(--accent-primary);
          border: 1px solid var(--accent-primary);
          border-radius: var(--radius-md);
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all var(--transition-fast);
          white-space: nowrap;
        }

        .save-btn:hover:not(:disabled) {
          background: var(--accent-secondary);
          border-color: var(--accent-secondary);
        }

        .save-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .copy-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          white-space: nowrap;
        }

        .copy-btn:hover:not(:disabled) {
          background: var(--bg-hover);
          border-color: var(--border-hover);
          color: var(--text-primary);
        }

        .copy-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .copy-btn.copied {
          color: var(--accent-success);
          border-color: var(--accent-success);
        }

        .save-dialog-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 2000;
        }

        .save-dialog {
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-lg);
          padding: var(--space-xl);
          min-width: 400px;
          box-shadow: var(--shadow-lg);
        }

        .save-dialog h3 {
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: var(--space-md);
        }

        .save-dialog input {
          width: 100%;
          padding: var(--space-sm) var(--space-md);
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.875rem;
          margin-bottom: var(--space-md);
        }

        .save-dialog input:focus {
          outline: none;
          border-color: var(--accent-primary);
        }

        .dialog-actions {
          display: flex;
          gap: var(--space-sm);
          justify-content: flex-end;
        }

        .btn-cancel, .btn-save {
          padding: var(--space-xs) var(--space-md);
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          border: none;
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

        .job-description-content {
          flex: 1;
          padding: var(--space-xl);
          display: flex;
          flex-direction: column;
          min-height: 0;
          overflow: hidden;
          gap: var(--space-md);
        }

        .url-input-container {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          flex-shrink: 0;
          padding: var(--space-sm);
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
        }

        .url-input-container:focus-within {
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .url-label {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .url-label svg {
          color: var(--accent-primary);
        }

        .url-input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 0.875rem;
          padding: var(--space-xs) 0;
          outline: none;
          font-family: var(--font-sans);
        }

        .url-input::placeholder {
          color: var(--text-muted);
        }

        .url-link {
          display: flex;
          align-items: center;
          padding: var(--space-xs);
          color: var(--accent-primary);
          text-decoration: none;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
          flex-shrink: 0;
        }

        .url-link:hover {
          background: var(--accent-glow);
          color: var(--accent-secondary);
        }

        .job-description-textarea {
          flex: 1;
          width: 100%;
          min-height: 400px;
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: var(--space-lg);
          color: var(--text-primary);
          font-size: 0.95rem;
          line-height: 1.7;
          resize: none;
          font-family: var(--font-sans);
          transition: all var(--transition-fast);
          overflow-y: auto;
          box-sizing: border-box;
        }

        .job-description-textarea:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .job-description-textarea::placeholder {
          color: var(--text-muted);
        }
      `}</style>
    </div>
  )
}
