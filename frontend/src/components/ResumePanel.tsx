import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, Mail, Phone, FileText, Plus, ChevronDown, ChevronRight,
  Briefcase, GraduationCap, FolderKanban, Sparkles, Edit3, Trash2, Save, X,
  Globe, Linkedin, Github, Copy, Check, ChevronsDown, ChevronsUp, Loader2, GripVertical
} from 'lucide-react'
import { Resume, Section, Entry } from '../types'

interface ResumePanelProps {
  resume: Resume | null
  onUpdate: (id: string) => void
  apiUrl: string
  jobDescription?: string | null
}

const sectionIcons: Record<string, typeof Briefcase> = {
  experience: Briefcase,
  education: GraduationCap,
  projects: FolderKanban,
  skills: Sparkles,
  custom: FileText
}

export function ResumePanel({ resume, onUpdate, apiUrl, jobDescription }: ResumePanelProps) {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set())
  const [editingField, setEditingField] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null)
  const [dragOverSectionId, setDragOverSectionId] = useState<string | null>(null)
  const [showSummaryAIModal, setShowSummaryAIModal] = useState(false)
  const [isLoadingSummaryAI, setIsLoadingSummaryAI] = useState(false)
  const [summaryAIError, setSummaryAIError] = useState<string | null>(null)
  const [suggestedSummary, setSuggestedSummary] = useState<string>('')
  const [summaryAdditionalInstructions, setSummaryAdditionalInstructions] = useState('')

  if (!resume) {
    return (
      <div className="empty-state">
        <FileText size={48} strokeWidth={1.5} />
        <h3>No Resume Selected</h3>
        <p>Select or create a resume to get started</p>
      </div>
    )
  }

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId)
    } else {
      newExpanded.add(sectionId)
    }
    setExpandedSections(newExpanded)
  }

  const expandAllSections = () => {
    if (!resume.sections) return
    const allSectionIds = new Set(resume.sections.map(s => s.id))
    setExpandedSections(allSectionIds)
  }

  const collapseAllSections = () => {
    setExpandedSections(new Set())
  }

  const allExpanded = resume.sections && resume.sections.length > 0 && 
    resume.sections.every(s => expandedSections.has(s.id))

  const startEdit = (field: string, value: string) => {
    setEditingField(field)
    setEditValue(value)
  }

  const saveEdit = async (field: string) => {
    try {
      // Convert empty strings to null for optional fields like title
      const value = editValue.trim() === '' && field === 'title' ? null : editValue.trim()
      await fetch(`${apiUrl}/resumes/${resume.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      })
      setEditingField(null)
      onUpdate(resume.id)
    } catch (error) {
      console.error('Failed to update:', error)
    }
  }

  const adjustSummaryWithAI = async () => {
    if (!jobDescription) {
      return
    }

    setIsLoadingSummaryAI(true)
    setSummaryAIError(null)

    try {
      const response = await fetch(`${apiUrl}/ai/adjust-summary`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription,
          currentSummary: resume.summary || '',
          resumeName: resume.name,
          resumeTitle: resume.title || undefined,
          additionalInstructions: summaryAdditionalInstructions.trim() || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate AI suggestions' }))
        throw new Error(errorData.error || 'Failed to generate AI suggestions')
      }

      const data = await response.json()
      setSuggestedSummary(data.suggestedSummary || '')
    } catch (error) {
      console.error('Failed to adjust summary with AI:', error)
      setSummaryAIError(error instanceof Error ? error.message : 'Failed to generate AI suggestions')
      setSuggestedSummary('')
    } finally {
      setIsLoadingSummaryAI(false)
    }
  }

  const acceptSummaryAISuggestion = async () => {
    if (!suggestedSummary.trim()) return

    try {
      setEditValue(suggestedSummary)
      setShowSummaryAIModal(false)
      setSuggestedSummary('')
      // If not already editing, start editing with the suggested summary
      if (editingField !== 'summary') {
        setEditingField('summary')
      }
    } catch (error) {
      console.error('Failed to accept AI suggestion:', error)
      alert('Failed to accept suggestion. Please try again.')
    }
  }

  const declineSummaryAISuggestion = () => {
    setShowSummaryAIModal(false)
    setSuggestedSummary('')
    setSummaryAIError(null)
    setSummaryAdditionalInstructions('')
  }

  const addSection = async (type: string) => {
    try {
      await fetch(`${apiUrl}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_id: resume.id,
          section_type: type,
          title: type.charAt(0).toUpperCase() + type.slice(1)
          // Don't specify sort_order - let the backend calculate it to group by type
        })
      })
      onUpdate(resume.id)
    } catch (error) {
      console.error('Failed to add section:', error)
    }
  }

  const addEntry = async (sectionId: string) => {
    try {
      // Find the section to get its current entries count
      const section = resume.sections?.find(s => s.id === sectionId)
      const currentEntriesCount = section?.entries?.length || 0
      
      await fetch(`${apiUrl}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_id: sectionId,
          title: 'New Entry',
          subtitle: ''
          // Don't specify sort_order - let the backend calculate it to be at the end
        })
      })
      onUpdate(resume.id)
    } catch (error) {
      console.error('Failed to add entry:', error)
    }
  }

  const deleteSection = async (sectionId: string) => {
    if (!confirm('Delete this section and all its entries?')) return
    try {
      await fetch(`${apiUrl}/sections/${sectionId}`, { method: 'DELETE' })
      onUpdate(resume.id)
    } catch (error) {
      console.error('Failed to delete section:', error)
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  const handleDragStart = (e: React.DragEvent, sectionId: string) => {
    setDraggedSectionId(sectionId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', sectionId)
  }

  const handleDragEnd = () => {
    setDraggedSectionId(null)
    setDragOverSectionId(null)
  }

  const handleDragOver = (e: React.DragEvent, sectionId: string) => {
    e.preventDefault()
    if (draggedSectionId && draggedSectionId !== sectionId) {
      setDragOverSectionId(sectionId)
    }
  }

  const handleDragLeave = () => {
    setDragOverSectionId(null)
  }

  const handleDrop = async (e: React.DragEvent, targetSectionId: string) => {
    e.preventDefault()
    setDragOverSectionId(null)

    if (!draggedSectionId || draggedSectionId === targetSectionId || !resume.sections) {
      setDraggedSectionId(null)
      return
    }

    const sections = [...resume.sections]
    const draggedIndex = sections.findIndex(s => s.id === draggedSectionId)
    const targetIndex = sections.findIndex(s => s.id === targetSectionId)

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedSectionId(null)
      return
    }

    // Remove dragged section and insert at target position
    const [draggedSection] = sections.splice(draggedIndex, 1)
    sections.splice(targetIndex, 0, draggedSection)

    // Update sort_order for all affected sections
    try {
      const updatePromises = sections.map((section, index) =>
        fetch(`${apiUrl}/sections/${section.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: index })
        })
      )
      await Promise.all(updatePromises)
      onUpdate(resume.id)
    } catch (error) {
      console.error('Failed to reorder sections:', error)
    }

    setDraggedSectionId(null)
  }

  return (
    <div className="resume-panel">
      <div className="resume-header">
        <div className="profile-section">
          <div className="avatar">
            <User size={28} />
          </div>
          <div className="profile-info">
            {editingField === 'title' ? (
              <div className="edit-inline">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Resume title"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit('title')}
                />
                <button onClick={() => saveEdit('title')}><Save size={14} /></button>
                <button onClick={() => setEditingField(null)}><X size={14} /></button>
              </div>
            ) : (
              <h2 
                className="profile-name"
                onClick={() => startEdit('title', resume.title || '')}
                title="Click to edit resume title"
              >
                {(resume.title && resume.title.trim()) || 'Untitled Resume'}
                <Edit3 size={14} className="edit-icon" />
              </h2>
            )}
            {editingField === 'name' ? (
              <div className="edit-inline">
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && saveEdit('name')}
                />
                <button onClick={() => saveEdit('name')}><Save size={14} /></button>
                <button onClick={() => setEditingField(null)}><X size={14} /></button>
              </div>
            ) : (
              <div 
                className="profile-name-secondary"
                onClick={() => startEdit('name', resume.name)}
                title="Click to edit applicant name"
              >
                {resume.name}
                <Edit3 size={12} className="edit-icon" />
              </div>
            )}
            <div className="contact-info">
              <span 
                className="contact-item clickable"
                onClick={() => editingField !== 'email' && startEdit('email', resume.email || '')}
              >
                <Mail size={12} />
                {editingField === 'email' ? (
                  <input
                    type="email"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveEdit('email')}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit('email')}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span>{resume.email || 'Add email'}</span>
                )}
              </span>
              <span 
                className="contact-item clickable"
                onClick={() => editingField !== 'phone' && startEdit('phone', resume.phone || '')}
              >
                <Phone size={12} />
                {editingField === 'phone' ? (
                  <input
                    type="tel"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveEdit('phone')}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit('phone')}
                    autoFocus
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span>{resume.phone || 'Add phone'}</span>
                )}
              </span>
            </div>
            <div className="contact-info links-row">
              <span 
                className="contact-item clickable"
                onClick={() => editingField !== 'website' && startEdit('website', resume.website || '')}
              >
                <Globe size={12} />
                {editingField === 'website' ? (
                  <input
                    type="url"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveEdit('website')}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit('website')}
                    autoFocus
                    placeholder="https://..."
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span>{resume.website || 'Add website'}</span>
                )}
              </span>
              <span 
                className="contact-item clickable"
                onClick={() => editingField !== 'linkedin' && startEdit('linkedin', resume.linkedin || '')}
              >
                <Linkedin size={12} />
                {editingField === 'linkedin' ? (
                  <input
                    type="url"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveEdit('linkedin')}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit('linkedin')}
                    autoFocus
                    placeholder="https://linkedin.com/in/..."
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span>{resume.linkedin || 'Add LinkedIn'}</span>
                )}
              </span>
              <span 
                className="contact-item clickable"
                onClick={() => editingField !== 'github' && startEdit('github', resume.github || '')}
              >
                <Github size={12} />
                {editingField === 'github' ? (
                  <input
                    type="url"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onBlur={() => saveEdit('github')}
                    onKeyDown={(e) => e.key === 'Enter' && saveEdit('github')}
                    autoFocus
                    placeholder="https://github.com/..."
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <span>{resume.github || 'Add GitHub'}</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {editingField === 'summary' ? (
          <div className="summary-edit">
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              placeholder="Professional summary..."
              rows={3}
              autoFocus
            />
            <div className="edit-actions">
              {jobDescription && (
                <button 
                  className="btn-ai-summary" 
                  onClick={() => setShowSummaryAIModal(true)}
                  title="Generate AI-optimized summary"
                >
                  <Sparkles size={14} /> AI
                </button>
              )}
              <button className="btn-save" onClick={() => saveEdit('summary')}>
                <Save size={14} /> Save
              </button>
              <button className="btn-cancel" onClick={() => setEditingField(null)}>
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="summary-container">
            <p 
              className="summary"
              onClick={() => startEdit('summary', resume.summary || '')}
            >
              {resume.summary || 'Click to add a professional summary...'}
              <Edit3 size={12} className="edit-icon" />
            </p>
            {jobDescription && (
              <button 
                className="summary-ai-btn"
                onClick={() => setShowSummaryAIModal(true)}
                title={resume.summary ? "Optimize summary with AI" : "Generate AI-optimized summary"}
              >
                <Sparkles size={12} /> {resume.summary ? 'Optimize' : 'Generate'}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="sections-container">
        {resume.sections && resume.sections.length > 0 && (
          <div className="sections-header">
            <button 
              className="expand-all-btn"
              onClick={allExpanded ? collapseAllSections : expandAllSections}
              title={allExpanded ? 'Collapse all sections' : 'Expand all sections'}
            >
              {allExpanded ? <ChevronsUp size={16} /> : <ChevronsDown size={16} />}
              <span>{allExpanded ? 'Collapse All' : 'Expand All'}</span>
            </button>
          </div>
        )}
        <AnimatePresence>
          {resume.sections?.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              isExpanded={expandedSections.has(section.id)}
              onToggle={() => toggleSection(section.id)}
              onAddEntry={() => addEntry(section.id)}
              onDelete={() => deleteSection(section.id)}
              onUpdate={() => onUpdate(resume.id)}
              apiUrl={apiUrl}
              formatDate={formatDate}
              jobDescription={jobDescription}
              isDragging={draggedSectionId === section.id}
              isDragOver={dragOverSectionId === section.id}
              onDragStart={(e) => handleDragStart(e, section.id)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => handleDragOver(e, section.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, section.id)}
            />
          ))}
        </AnimatePresence>

        <div className="add-section">
          <span className="add-label">Add Section</span>
          <div className="section-types">
            {['experience', 'education', 'projects', 'skills'].map((type) => {
              const Icon = sectionIcons[type]
              return (
                <motion.button
                  key={type}
                  className="type-btn"
                  onClick={() => addSection(type)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Icon size={16} />
                  <span>{type}</span>
                </motion.button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Summary AI Modal */}
      {showSummaryAIModal && (
        <div className="summary-ai-modal-overlay" onClick={declineSummaryAISuggestion}>
          <div className="summary-ai-modal" onClick={(e) => e.stopPropagation()}>
            <div className="summary-ai-modal-header">
              <h3>
                <Sparkles size={18} />
                AI-Optimized Summary
              </h3>
              <button className="close-modal-btn" onClick={declineSummaryAISuggestion}>
                <X size={18} />
              </button>
            </div>

            <div className="summary-ai-modal-content">
              {isLoadingSummaryAI ? (
                <div className="ai-loading">
                  <Loader2 size={24} className="spinner" />
                  <p>Analyzing job description and generating summary...</p>
                </div>
              ) : summaryAIError ? (
                <div className="ai-error">
                  <p>{summaryAIError}</p>
                  <button className="btn-retry" onClick={adjustSummaryWithAI}>
                    Try Again
                  </button>
                </div>
              ) : suggestedSummary ? (
                <>
                  <div className="ai-instructions-section">
                    <label className="ai-instructions-label">Additional Instructions (Optional)</label>
                    <textarea
                      className="ai-instructions-input"
                      value={summaryAdditionalInstructions}
                      onChange={(e) => setSummaryAdditionalInstructions(e.target.value)}
                      placeholder="Add any specific instructions for the AI (e.g., 'Keep it under 80 words', 'Emphasize technical skills')"
                      rows={3}
                    />
                  </div>
                  <div className="summary-ai-comparison">
                    <div className="comparison-section">
                      <h4>Current Summary</h4>
                      <div className="summary-compare">
                        {resume.summary || <em>No summary provided</em>}
                      </div>
                    </div>
                    <div className="comparison-section">
                      <h4>Suggested Summary (Editable)</h4>
                      <textarea
                        className="summary-input-editable"
                        value={suggestedSummary}
                        onChange={(e) => setSuggestedSummary(e.target.value)}
                        placeholder="AI-generated summary..."
                        rows={6}
                      />
                    </div>
                  </div>
                  <div className="summary-ai-modal-actions">
                    <button className="btn-decline" onClick={declineSummaryAISuggestion}>
                      Decline
                    </button>
                    <button className="btn-regenerate" onClick={adjustSummaryWithAI} disabled={isLoadingSummaryAI}>
                      Regenerate
                    </button>
                    <button className="btn-accept" onClick={acceptSummaryAISuggestion}>
                      Use This Summary
                    </button>
                  </div>
                </>
              ) : (
                <div className="ai-instructions-section">
                  <label className="ai-instructions-label">Additional Instructions (Optional)</label>
                  <textarea
                    className="ai-instructions-input"
                    value={summaryAdditionalInstructions}
                    onChange={(e) => setSummaryAdditionalInstructions(e.target.value)}
                    placeholder="Add any specific instructions for the AI (e.g., 'Keep it under 80 words', 'Emphasize technical skills')"
                    rows={3}
                  />
                  <div className="summary-ai-modal-actions">
                    <button className="btn-decline" onClick={declineSummaryAISuggestion}>
                      Cancel
                    </button>
                    <button className="btn-generate" onClick={adjustSummaryWithAI} disabled={isLoadingSummaryAI}>
                      Generate Summary
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .resume-panel {
          height: 100%;
          display: flex;
          flex-direction: column;
          overflow: hidden;
        }

        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: var(--space-md);
          color: var(--text-muted);
        }

        .empty-state h3 {
          color: var(--text-secondary);
          font-weight: 500;
        }

        .resume-header {
          padding: var(--space-xl);
          border-bottom: 1px solid var(--border-subtle);
        }

        .profile-section {
          display: flex;
          gap: var(--space-md);
          margin-bottom: var(--space-md);
        }

        .avatar {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          border-radius: var(--radius-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          flex-shrink: 0;
        }

        .profile-info {
          flex: 1;
          min-width: 0;
        }

        .profile-name {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: var(--space-xs);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }

        .profile-name-secondary {
          font-size: 0.95rem;
          font-weight: 400;
          color: var(--text-secondary);
          margin-bottom: var(--space-xs);
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: var(--space-xs);
        }

        .edit-icon {
          opacity: 0;
          color: var(--text-muted);
          transition: opacity var(--transition-fast);
        }

        .profile-name:hover .edit-icon,
        .profile-name-secondary:hover .edit-icon,
        .summary:hover .edit-icon,
        .contact-item:hover .edit-icon {
          opacity: 1;
        }

        .contact-info {
          display: flex;
          gap: var(--space-md);
          flex-wrap: wrap;
        }

        .contact-info.links-row {
          margin-top: var(--space-xs);
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          color: var(--text-secondary);
          font-size: 0.875rem;
        }

        .contact-item.clickable {
          cursor: pointer;
          padding: 4px 8px;
          margin: -4px -8px;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
        }

        .contact-item.clickable:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .contact-item input {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-sm);
          padding: 2px 6px;
          font-size: 0.875rem;
          color: var(--text-primary);
        }

        .edit-inline {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
        }

        .edit-inline input {
          background: var(--bg-tertiary);
          border: 1px solid var(--accent-primary);
          border-radius: var(--radius-sm);
          padding: 4px 8px;
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
          width: 200px;
        }

        .edit-inline button {
          padding: 4px;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          transition: all var(--transition-fast);
        }

        .edit-inline button:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .summary-container {
          position: relative;
          margin: 0 calc(-1 * var(--space-sm));
        }

        .summary {
          color: var(--text-secondary);
          font-size: 0.9rem;
          line-height: 1.6;
          cursor: pointer;
          padding: var(--space-sm);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: flex-start;
          gap: var(--space-sm);
        }

        .summary:hover {
          background: var(--bg-tertiary);
        }

        .summary-ai-btn {
          position: absolute;
          top: var(--space-xs);
          right: var(--space-xs);
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-sm);
          color: var(--accent-primary);
          font-size: 0.75rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          opacity: 0;
        }

        .summary-container:hover .summary-ai-btn {
          opacity: 1;
        }

        .summary-ai-btn:hover {
          background: var(--accent-glow);
          border-color: var(--accent-primary);
        }

        .summary-edit textarea {
          width: 100%;
          background: var(--bg-tertiary);
          border: 1px solid var(--accent-primary);
          border-radius: var(--radius-sm);
          padding: var(--space-sm);
          color: var(--text-primary);
          font-size: 0.9rem;
          line-height: 1.6;
          resize: vertical;
        }

        .edit-actions {
          display: flex;
          gap: var(--space-sm);
          margin-top: var(--space-sm);
        }

        .btn-save, .btn-cancel, .btn-ai-summary {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          padding: var(--space-xs) var(--space-sm);
          border-radius: var(--radius-sm);
          font-size: 0.8rem;
          font-weight: 500;
          transition: all var(--transition-fast);
        }

        .btn-save {
          background: var(--accent-primary);
          color: white;
        }

        .btn-cancel {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }

        .btn-ai-summary {
          background: var(--accent-glow);
          color: var(--accent-primary);
          border: 1px solid var(--accent-primary);
        }

        .btn-ai-summary:hover {
          background: var(--accent-primary);
          color: white;
        }

        .summary-ai-modal-overlay {
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

        .summary-ai-modal {
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: 16px;
          width: 100%;
          max-width: 800px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .summary-ai-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .summary-ai-modal-header h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .summary-ai-modal-header h3 svg {
          color: var(--accent-primary);
        }

        .close-modal-btn {
          padding: 4px;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .close-modal-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .summary-ai-modal-content {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        .ai-instructions-section {
          margin-bottom: 24px;
        }

        .ai-instructions-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .ai-instructions-input {
          width: 100%;
          background: var(--bg-secondary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 12px;
          color: var(--text-primary);
          font-size: 0.875rem;
          line-height: 1.5;
          resize: vertical;
          font-family: inherit;
        }

        .ai-instructions-input:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .ai-instructions-input::placeholder {
          color: var(--text-muted);
        }

        .summary-ai-comparison {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .comparison-section h4 {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 12px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .summary-compare {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 16px;
          color: var(--text-secondary);
          font-size: 0.9rem;
          line-height: 1.6;
          min-height: 120px;
        }

        .summary-compare em {
          color: var(--text-muted);
          font-style: italic;
        }

        .summary-input-editable {
          width: 100%;
          background: var(--bg-secondary);
          border: 1px solid var(--accent-primary);
          border-radius: var(--radius-md);
          padding: 16px;
          color: var(--text-primary);
          font-size: 0.9rem;
          line-height: 1.6;
          resize: vertical;
          font-family: inherit;
        }

        .summary-input-editable:focus {
          outline: none;
          border-color: var(--accent-secondary);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .summary-ai-modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding-top: 16px;
          border-top: 1px solid var(--border-subtle);
        }

        .ai-instructions-section {
          margin-bottom: 24px;
        }

        .ai-instructions-label {
          display: block;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .ai-instructions-input {
          width: 100%;
          background: var(--bg-secondary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 12px;
          color: var(--text-primary);
          font-size: 0.875rem;
          line-height: 1.5;
          resize: vertical;
          font-family: inherit;
        }

        .ai-instructions-input:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .ai-instructions-input::placeholder {
          color: var(--text-muted);
        }

        .btn-decline, .btn-accept, .btn-regenerate, .btn-generate {
          padding: 10px 20px;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
          border: none;
        }

        .btn-decline {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }

        .btn-decline:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .btn-regenerate, .btn-generate {
          background: var(--bg-tertiary);
          color: var(--accent-primary);
          border: 1px solid var(--accent-primary);
        }

        .btn-regenerate:hover:not(:disabled), .btn-generate:hover:not(:disabled) {
          background: var(--accent-glow);
          color: var(--accent-secondary);
        }

        .btn-regenerate:disabled, .btn-generate:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-accept {
          background: var(--accent-primary);
          color: white;
        }

        .btn-accept:hover {
          background: var(--accent-secondary);
        }

        .ai-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          gap: 16px;
          color: var(--text-secondary);
        }

        .ai-loading .spinner {
          animation: spin 1s linear infinite;
          color: var(--accent-primary);
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .ai-error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 48px 24px;
          gap: 16px;
          color: var(--accent-danger);
          text-align: center;
        }

        .btn-retry {
          padding: 8px 16px;
          background: var(--accent-primary);
          color: white;
          border: none;
          border-radius: var(--radius-md);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .btn-retry:hover {
          background: var(--accent-secondary);
        }

        @media (max-width: 768px) {
          .summary-ai-comparison {
            grid-template-columns: 1fr;
          }
        }

        .sections-container {
          flex: 1;
          overflow-y: auto;
          padding: var(--space-lg);
        }

        .sections-header {
          display: flex;
          justify-content: flex-end;
          margin-bottom: var(--space-md);
        }

        .expand-all-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 150ms ease;
        }

        .expand-all-btn:hover {
          background: var(--bg-hover);
          border-color: var(--border-hover);
          color: var(--text-primary);
        }

        .add-section {
          margin-top: var(--space-lg);
          padding: var(--space-lg);
          border: 2px dashed var(--border-default);
          border-radius: var(--radius-lg);
          text-align: center;
        }

        .add-label {
          display: block;
          color: var(--text-muted);
          font-size: 0.875rem;
          margin-bottom: var(--space-md);
        }

        .section-types {
          display: flex;
          gap: var(--space-sm);
          justify-content: center;
          flex-wrap: wrap;
        }

        .type-btn {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          padding: var(--space-sm) var(--space-md);
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.8rem;
          text-transform: capitalize;
          transition: all var(--transition-fast);
        }

        .type-btn:hover {
          background: var(--accent-glow);
          border-color: var(--accent-primary);
          color: var(--accent-secondary);
        }
      `}</style>
    </div>
  )
}

interface SectionCardProps {
  section: Section
  isExpanded: boolean
  onToggle: () => void
  onAddEntry: () => void
  onDelete: () => void
  onUpdate: () => void
  apiUrl: string
  formatDate: (date?: string) => string
  jobDescription?: string | null
  isDragging?: boolean
  isDragOver?: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onDrop: (e: React.DragEvent) => void
}

function SectionCard({ 
  section, 
  isExpanded, 
  onToggle, 
  onAddEntry, 
  onDelete,
  onUpdate,
  apiUrl,
  formatDate,
  jobDescription,
  isDragging = false,
  isDragOver = false,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop
}: SectionCardProps) {
  const Icon = sectionIcons[section.section_type] || FileText
  const isSkillsSection = section.section_type === 'skills'
  const [showSkillsAIModal, setShowSkillsAIModal] = useState(false)
  const [isLoadingSkillsAI, setIsLoadingSkillsAI] = useState(false)
  const [skillsAIError, setSkillsAIError] = useState<string | null>(null)
  const [suggestedSkills, setSuggestedSkills] = useState<string[]>([])
  const [skillsAdditionalInstructions, setSkillsAdditionalInstructions] = useState('')

  const adjustSkillsWithAI = async () => {
    if (!jobDescription) {
      return
    }

    setIsLoadingSkillsAI(true)
    setSkillsAIError(null)

    try {
      // Collect all current skills from all entries in the section
      const currentSkills = section.entries?.flatMap(entry => 
        entry.bullets?.map(bullet => bullet.content) || []
      ) || []

      const response = await fetch(`${apiUrl}/ai/adjust-skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription,
          currentSkills,
          additionalInstructions: skillsAdditionalInstructions.trim() || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate AI suggestions' }))
        throw new Error(errorData.error || 'Failed to generate AI suggestions')
      }

      const data = await response.json()
      setSuggestedSkills(data.suggestedSkills || [])
    } catch (error) {
      console.error('Failed to adjust skills with AI:', error)
      setSkillsAIError(error instanceof Error ? error.message : 'Failed to generate AI suggestions')
      setSuggestedSkills([])
    } finally {
      setIsLoadingSkillsAI(false)
    }
  }

  const acceptSkillsAISuggestions = async () => {
    if (suggestedSkills.length === 0) return

    try {
      // Get the first entry in the section, or create one if none exists
      let entryId: string | null = null
      if (section.entries && section.entries.length > 0) {
        entryId = section.entries[0].id
      } else {
        // Create a new entry for the skills section
        const createEntryResponse = await fetch(`${apiUrl}/entries`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section_id: section.id,
            title: 'Skills',
            sort_order: 0
          })
        })
        if (!createEntryResponse.ok) {
          throw new Error('Failed to create entry')
        }
        const newEntry = await createEntryResponse.json()
        entryId = newEntry.id
      }

      if (!entryId) {
        throw new Error('No entry available')
      }

      // Use bulk update to replace all bullets with the new skills
      await fetch(`${apiUrl}/bullets/bulk/${entryId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bullets: suggestedSkills.filter(s => s.trim().length > 0).map(content => ({ content: content.trim() }))
        })
      })

      setShowSkillsAIModal(false)
      setSuggestedSkills([])
      onUpdate()
    } catch (error) {
      console.error('Failed to update skills:', error)
      alert('Failed to update skills. Please try again.')
    }
  }

  const declineSkillsAISuggestions = () => {
    setShowSkillsAIModal(false)
    setSuggestedSkills([])
    setSkillsAIError(null)
    setSkillsAdditionalInstructions('')
  }

  const updateSuggestedSkill = (index: number, value: string) => {
    const updated = [...suggestedSkills]
    updated[index] = value
    setSuggestedSkills(updated)
  }

  const removeSuggestedSkill = (index: number) => {
    const updated = suggestedSkills.filter((_, i) => i !== index)
    setSuggestedSkills(updated)
  }

  const addSuggestedSkill = () => {
    setSuggestedSkills([...suggestedSkills, ''])
  }

  return (
    <motion.div 
      className={`section-card ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isDragging ? 0.5 : 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      layout
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="section-header" onClick={onToggle}>
        <div className="section-title">
          <div 
            className="drag-handle" 
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <GripVertical size={16} />
          </div>
          <div className="section-icon">
            <Icon size={16} />
          </div>
          <h3>{section.title}</h3>
          <span className="entry-count">{section.entries?.length || 0}</span>
        </div>
        <div className="section-actions">
          {isSkillsSection && jobDescription && (
            <button 
              className="action-btn ai-btn" 
              onClick={(e) => { 
                e.stopPropagation(); 
                setShowSkillsAIModal(true);
              }}
              title="Generate AI-optimized skills"
            >
              <Sparkles size={14} />
            </button>
          )}
          <button className="action-btn delete" onClick={(e) => { e.stopPropagation(); onDelete(); }}>
            <Trash2 size={14} />
          </button>
          {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div 
            className="section-content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {section.entries?.map((entry) => (
              <EntryCard 
                key={entry.id} 
                entry={entry} 
                onUpdate={onUpdate}
                apiUrl={apiUrl}
                formatDate={formatDate}
                jobDescription={section.section_type === 'experience' ? jobDescription : null}
              />
            ))}
            
            <button className="add-entry-btn" onClick={onAddEntry}>
              <Plus size={14} />
              Add Entry
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Skills AI Modal */}
      {showSkillsAIModal && (
        <div className="skills-ai-modal-overlay" onClick={declineSkillsAISuggestions}>
          <div className="skills-ai-modal" onClick={(e) => e.stopPropagation()}>
            <div className="skills-ai-modal-header">
              <h3>
                <Sparkles size={18} />
                AI-Optimized Skills
              </h3>
              <button className="close-modal-btn" onClick={declineSkillsAISuggestions}>
                <X size={18} />
              </button>
            </div>

            <div className="skills-ai-modal-content">
              {isLoadingSkillsAI ? (
                <div className="ai-loading">
                  <Loader2 size={24} className="spinner" />
                  <p>Analyzing job description and generating skills...</p>
                </div>
              ) : skillsAIError ? (
                <div className="ai-error">
                  <p>{skillsAIError}</p>
                  <button className="btn-retry" onClick={adjustSkillsWithAI}>
                    Try Again
                  </button>
                </div>
              ) : suggestedSkills.length > 0 ? (
                <>
                  <div className="ai-instructions-section">
                    <label className="ai-instructions-label">Additional Instructions (Optional)</label>
                    <textarea
                      className="ai-instructions-input"
                      value={skillsAdditionalInstructions}
                      onChange={(e) => setSkillsAdditionalInstructions(e.target.value)}
                      placeholder="Add any specific instructions for the AI (e.g., 'Focus on cloud technologies', 'Include soft skills')"
                      rows={3}
                    />
                  </div>
                  <div className="skills-ai-comparison">
                    <div className="comparison-section">
                      <h4>Current Skills</h4>
                      <div className="skills-compare">
                        {section.entries?.flatMap(entry => 
                          entry.bullets?.map(bullet => bullet.content) || []
                        ).length > 0 ? (
                          <div className="skills-tags">
                            {section.entries?.flatMap(entry => 
                              entry.bullets?.map(bullet => (
                                <span key={bullet.id} className="skill-tag">
                                  {bullet.content}
                                </span>
                              )) || []
                            )}
                          </div>
                        ) : (
                          <em>No skills provided</em>
                        )}
                      </div>
                    </div>
                    <div className="comparison-section">
                      <h4>Suggested Skills (Editable)</h4>
                      <div className="suggested-skills-editable">
                        {suggestedSkills.map((skill, idx) => (
                          <div key={idx} className="skill-input-row">
                            <input
                              type="text"
                              className="skill-input"
                              value={skill}
                              onChange={(e) => updateSuggestedSkill(idx, e.target.value)}
                              placeholder={`Skill ${idx + 1}...`}
                            />
                            <button 
                              className="skill-remove-btn" 
                              onClick={() => removeSuggestedSkill(idx)}
                              title="Remove skill"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        <button className="skill-add-btn" onClick={addSuggestedSkill}>
                          <Plus size={14} /> Add Skill
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="skills-ai-modal-actions">
                    <button className="btn-decline" onClick={declineSkillsAISuggestions}>
                      Decline
                    </button>
                    <button className="btn-regenerate" onClick={adjustSkillsWithAI} disabled={isLoadingSkillsAI}>
                      Regenerate
                    </button>
                    <button className="btn-accept" onClick={acceptSkillsAISuggestions}>
                      Use These Skills
                    </button>
                  </div>
                </>
              ) : (
                <div className="ai-instructions-section">
                  <label className="ai-instructions-label">Additional Instructions (Optional)</label>
                  <textarea
                    className="ai-instructions-input"
                    value={skillsAdditionalInstructions}
                    onChange={(e) => setSkillsAdditionalInstructions(e.target.value)}
                    placeholder="Add any specific instructions for the AI (e.g., 'Focus on cloud technologies', 'Include soft skills')"
                    rows={3}
                  />
                  <div className="skills-ai-modal-actions">
                    <button className="btn-decline" onClick={declineSkillsAISuggestions}>
                      Cancel
                    </button>
                    <button className="btn-generate" onClick={adjustSkillsWithAI} disabled={isLoadingSkillsAI}>
                      Generate Skills
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .section-card {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          margin-bottom: var(--space-md);
          overflow: hidden;
          cursor: move;
          transition: all var(--transition-fast);
        }

        .section-card.dragging {
          opacity: 0.5;
          cursor: grabbing;
        }

        .section-card.drag-over {
          border-color: var(--accent-primary);
          border-width: 2px;
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: var(--space-md) var(--space-lg);
          cursor: pointer;
          transition: background var(--transition-fast);
        }

        .section-header:hover {
          background: var(--bg-hover);
        }

        .section-title {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          flex: 1;
        }

        .drag-handle {
          display: flex;
          align-items: center;
          color: var(--text-muted);
          cursor: grab;
          padding: 4px;
          margin: -4px;
          border-radius: var(--radius-sm);
          transition: all var(--transition-fast);
          opacity: 0;
        }

        .section-card:hover .drag-handle {
          opacity: 1;
        }

        .drag-handle:active {
          cursor: grabbing;
        }

        .drag-handle:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .section-icon {
          width: 28px;
          height: 28px;
          background: var(--accent-glow);
          border-radius: var(--radius-sm);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--accent-primary);
        }

        .section-title h3 {
          font-size: 0.95rem;
          font-weight: 600;
        }

        .entry-count {
          background: var(--bg-hover);
          padding: 2px 8px;
          border-radius: var(--radius-full);
          font-size: 0.75rem;
          color: var(--text-muted);
        }

        .section-actions {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          color: var(--text-muted);
        }

        .action-btn {
          padding: var(--space-xs);
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          opacity: 0;
          transition: all var(--transition-fast);
        }

        .section-header:hover .action-btn {
          opacity: 1;
        }

        .action-btn:hover {
          background: var(--bg-hover);
        }

        .action-btn.delete:hover {
          color: var(--accent-danger);
        }

        .action-btn.ai-btn {
          color: var(--accent-primary);
        }

        .action-btn.ai-btn:hover {
          background: rgba(99, 102, 241, 0.1);
          color: var(--accent-secondary);
        }

        .skills-ai-modal-overlay {
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

        .skills-ai-modal {
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: 16px;
          width: 100%;
          max-width: 900px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .skills-ai-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .skills-ai-modal-header h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .skills-ai-modal-header h3 svg {
          color: var(--accent-primary);
        }

        .skills-ai-modal-content {
          padding: 24px;
          overflow-y: auto;
          flex: 1;
        }

        .skills-ai-comparison {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .skills-compare {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 16px;
          min-height: 200px;
          max-height: 400px;
          overflow-y: auto;
        }

        .skills-compare em {
          color: var(--text-muted);
          font-style: italic;
        }

        .skills-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .skill-tag {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-full);
          padding: 6px 12px;
          font-size: 0.875rem;
          color: var(--text-primary);
          white-space: nowrap;
        }

        .suggested-skills-editable {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          padding: 16px;
          min-height: 200px;
          max-height: 400px;
          overflow-y: auto;
        }

        .skill-input-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }

        .skill-input {
          flex: 1;
          background: var(--bg-tertiary);
          border: 1px solid var(--accent-primary);
          border-radius: var(--radius-sm);
          padding: 8px 12px;
          color: var(--text-primary);
          font-size: 0.875rem;
          font-family: inherit;
        }

        .skill-input:focus {
          outline: none;
          border-color: var(--accent-secondary);
          box-shadow: 0 0 0 2px var(--accent-glow);
        }

        .skill-remove-btn {
          padding: 6px;
          background: transparent;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .skill-remove-btn:hover {
          background: var(--accent-danger);
          border-color: var(--accent-danger);
          color: white;
        }

        .skill-add-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 12px;
          background: var(--bg-tertiary);
          border: 1px dashed var(--border-default);
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all var(--transition-fast);
          width: 100%;
          justify-content: center;
          margin-top: 8px;
        }

        .skill-add-btn:hover {
          background: var(--accent-glow);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }

        .skills-ai-modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding-top: 16px;
          border-top: 1px solid var(--border-subtle);
        }

        @media (max-width: 768px) {
          .skills-ai-comparison {
            grid-template-columns: 1fr;
          }
        }

        .section-content {
          padding: 0 var(--space-lg) var(--space-lg);
          overflow: hidden;
        }

        .add-entry-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: var(--space-xs);
          width: 100%;
          padding: var(--space-sm);
          border: 1px dashed var(--border-default);
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          font-size: 0.8rem;
          transition: all var(--transition-fast);
          margin-top: var(--space-sm);
        }

        .add-entry-btn:hover {
          border-color: var(--accent-primary);
          color: var(--accent-primary);
          background: var(--accent-glow);
        }
      `}</style>
    </motion.div>
  )
}

interface EntryCardProps {
  entry: Entry
  onUpdate: () => void
  apiUrl: string
  formatDate: (date?: string) => string
  jobDescription?: string | null
}

function EntryCard({ entry, onUpdate, apiUrl, formatDate, jobDescription }: EntryCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editData, setEditData] = useState(entry)
  const [newBullet, setNewBullet] = useState('')
  const [copiedField, setCopiedField] = useState<string | null>(null)
  const [showAIModal, setShowAIModal] = useState(false)
  const [suggestedBullets, setSuggestedBullets] = useState<string[]>([])
  const [isLoadingAI, setIsLoadingAI] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [editingBulletId, setEditingBulletId] = useState<string | null>(null)
  const [editingBulletContent, setEditingBulletContent] = useState('')
  const [additionalInstructions, setAdditionalInstructions] = useState('')

  const copyField = async (field: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const copyTitle = () => copyField('title', entry.title)
  
  const copyCompany = () => {
    copyField('company', entry.subtitle || '')
  }
  
  const copyLocation = () => {
    copyField('location', entry.location || '')
  }
  
  const copyDates = () => {
    const dateRange = `${formatDate(entry.start_date)} - ${entry.is_current ? 'Present' : formatDate(entry.end_date)}`
    copyField('dates', dateRange)
  }
  
  const copyBullets = () => {
    if (entry.bullets && entry.bullets.length > 0) {
      const text = entry.bullets.map(b => `• ${b.content}`).join('\n')
      copyField('bullets', text)
    }
  }

  const copyAll = () => {
    const dateRange = `${formatDate(entry.start_date)} - ${entry.is_current ? 'Present' : formatDate(entry.end_date)}`
    let text = `${entry.title}\n`
    if (entry.subtitle) text += `${entry.subtitle}`
    if (entry.location) text += ` | ${entry.location}`
    text += `\n${dateRange}\n`
    if (entry.bullets && entry.bullets.length > 0) {
      text += '\n'
      entry.bullets.forEach(bullet => {
        text += `• ${bullet.content}\n`
      })
    }
    copyField('all', text.trim())
  }

  const saveEntry = async () => {
    try {
      await fetch(`${apiUrl}/entries/${entry.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData)
      })
      setIsEditing(false)
      onUpdate()
    } catch (error) {
      console.error('Failed to save entry:', error)
    }
  }

  const deleteEntry = async () => {
    if (!confirm('Delete this entry?')) return
    try {
      await fetch(`${apiUrl}/entries/${entry.id}`, { method: 'DELETE' })
      onUpdate()
    } catch (error) {
      console.error('Failed to delete entry:', error)
    }
  }

  const addBullet = async () => {
    if (!newBullet.trim()) return
    try {
      await fetch(`${apiUrl}/bullets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          entry_id: entry.id,
          content: newBullet,
          sort_order: entry.bullets?.length || 0
        })
      })
      setNewBullet('')
      onUpdate()
    } catch (error) {
      console.error('Failed to add bullet:', error)
    }
  }

  const deleteBullet = async (bulletId: string) => {
    try {
      await fetch(`${apiUrl}/bullets/${bulletId}`, { method: 'DELETE' })
      onUpdate()
    } catch (error) {
      console.error('Failed to delete bullet:', error)
    }
  }

  const startEditBullet = (bulletId: string, content: string) => {
    setEditingBulletId(bulletId)
    setEditingBulletContent(content)
  }

  const cancelEditBullet = () => {
    setEditingBulletId(null)
    setEditingBulletContent('')
  }

  const saveBullet = async (bulletId: string) => {
    if (!editingBulletContent.trim()) return
    try {
      await fetch(`${apiUrl}/bullets/${bulletId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editingBulletContent.trim() })
      })
      setEditingBulletId(null)
      setEditingBulletContent('')
      onUpdate()
    } catch (error) {
      console.error('Failed to update bullet:', error)
    }
  }

  const adjustWithAI = async () => {
    if (!jobDescription || !entry.bullets || entry.bullets.length === 0) {
      return
    }

    setIsLoadingAI(true)
    setAiError(null)

    try {
      const response = await fetch(`${apiUrl}/ai/adjust-experience`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription,
          entryTitle: entry.title,
          entrySubtitle: entry.subtitle,
          entryLocation: entry.location,
          currentBullets: entry.bullets.map(b => b.content),
          additionalInstructions: additionalInstructions.trim() || undefined
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to generate AI suggestions' }))
        throw new Error(errorData.error || 'Failed to generate AI suggestions')
      }

      const data = await response.json()
      setSuggestedBullets(data.suggestedBullets || [])
    } catch (error) {
      console.error('Failed to adjust experience with AI:', error)
      setAiError(error instanceof Error ? error.message : 'Failed to generate AI suggestions')
      setSuggestedBullets([])
    } finally {
      setIsLoadingAI(false)
    }
  }

  const acceptAISuggestions = async () => {
    if (suggestedBullets.length === 0) return

    try {
      // Use the current suggestedBullets state which may have been edited
      await fetch(`${apiUrl}/bullets/bulk/${entry.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bullets: suggestedBullets.filter(b => b.trim().length > 0).map(content => ({ content: content.trim() }))
        })
      })
      setShowAIModal(false)
      setSuggestedBullets([])
      onUpdate()
    } catch (error) {
      console.error('Failed to update bullets:', error)
      alert('Failed to update bullets. Please try again.')
    }
  }

  const updateSuggestedBullet = (index: number, value: string) => {
    const updated = [...suggestedBullets]
    updated[index] = value
    setSuggestedBullets(updated)
  }

  // Auto-resize textarea to fit content
  const autoResizeTextarea = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto'
    textarea.style.height = `${textarea.scrollHeight}px`
  }

  // Ref to store textarea elements for auto-resize
  const textareaRefs = useRef<(HTMLTextAreaElement | null)[]>([])
  const bulletEditTextareaRef = useRef<HTMLTextAreaElement | null>(null)

  // Auto-resize textareas when suggestions load or change
  useEffect(() => {
    if (suggestedBullets.length > 0 && showAIModal) {
      textareaRefs.current.forEach((textarea) => {
        if (textarea) {
          autoResizeTextarea(textarea)
        }
      })
    }
  }, [suggestedBullets, showAIModal])

  // Auto-resize bullet edit textarea when editing starts or content changes
  useEffect(() => {
    if (editingBulletId && bulletEditTextareaRef.current) {
      autoResizeTextarea(bulletEditTextareaRef.current)
    }
  }, [editingBulletId, editingBulletContent])

  const declineAISuggestions = () => {
    setShowAIModal(false)
    setSuggestedBullets([])
    setAiError(null)
    setAdditionalInstructions('')
  }

  if (isEditing) {
    return (
      <div className="entry-card editing">
        <div className="entry-form">
          <input
            type="text"
            placeholder="Title (e.g., Senior Developer)"
            value={editData.title}
            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
          />
          <input
            type="text"
            placeholder="Subtitle (e.g., Company Name)"
            value={editData.subtitle || ''}
            onChange={(e) => setEditData({ ...editData, subtitle: e.target.value })}
          />
          <input
            type="text"
            placeholder="Location"
            value={editData.location || ''}
            onChange={(e) => setEditData({ ...editData, location: e.target.value })}
          />
          <div className="date-row">
            <input
              type="date"
              value={editData.start_date?.split('T')[0] || ''}
              onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
            />
            <span>to</span>
            <input
              type="date"
              value={editData.end_date?.split('T')[0] || ''}
              onChange={(e) => setEditData({ ...editData, end_date: e.target.value })}
              disabled={editData.is_current}
            />
            <label>
              <input
                type="checkbox"
                checked={editData.is_current}
                onChange={(e) => setEditData({ ...editData, is_current: e.target.checked })}
              />
              Current
            </label>
          </div>
          <div className="form-actions">
            <button className="btn-save" onClick={saveEntry}>
              <Save size={14} /> Save
            </button>
            <button className="btn-cancel" onClick={() => setIsEditing(false)}>
              <X size={14} /> Cancel
            </button>
          </div>
        </div>

        <style>{`
          .entry-card.editing {
            background: var(--bg-elevated);
            border: 1px solid var(--accent-primary);
            border-radius: var(--radius-md);
            padding: var(--space-md);
            margin-bottom: var(--space-sm);
          }

          .entry-form {
            display: flex;
            flex-direction: column;
            gap: var(--space-sm);
          }

          .entry-form input[type="text"],
          .entry-form input[type="date"] {
            background: var(--bg-tertiary);
            border: 1px solid var(--border-default);
            border-radius: var(--radius-sm);
            padding: var(--space-sm);
            color: var(--text-primary);
            font-size: 0.875rem;
          }

          .entry-form input:focus {
            border-color: var(--accent-primary);
            outline: none;
          }

          .date-row {
            display: flex;
            align-items: center;
            gap: var(--space-sm);
          }

          .date-row span {
            color: var(--text-muted);
          }

          .date-row label {
            display: flex;
            align-items: center;
            gap: var(--space-xs);
            color: var(--text-secondary);
            font-size: 0.8rem;
            margin-left: var(--space-sm);
          }

          .form-actions {
            display: flex;
            gap: var(--space-sm);
            margin-top: var(--space-sm);
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="entry-card">
      <div className="entry-header">
        <div className="entry-info">
          <div className="copyable-field">
            <h4>{entry.title}</h4>
            <button 
              className={`copy-field-btn ${copiedField === 'title' ? 'copied' : ''}`}
              onClick={copyTitle}
              title="Copy title"
            >
              {copiedField === 'title' ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
          {entry.subtitle && (
            <div className="copyable-field">
              <span className="subtitle">{entry.subtitle}</span>
              <button 
                className={`copy-field-btn ${copiedField === 'company' ? 'copied' : ''}`}
                onClick={copyCompany}
                title="Copy company name"
              >
                {copiedField === 'company' ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          )}
          {entry.location && (
            <div className="copyable-field">
              <span className="location">• {entry.location}</span>
              <button 
                className={`copy-field-btn ${copiedField === 'location' ? 'copied' : ''}`}
                onClick={copyLocation}
                title="Copy location"
              >
                {copiedField === 'location' ? <Check size={12} /> : <Copy size={12} />}
              </button>
            </div>
          )}
        </div>
        <div className="entry-meta">
          <div className="copyable-field">
            <span className="date-range">
              {formatDate(entry.start_date)} - {entry.is_current ? 'Present' : formatDate(entry.end_date)}
            </span>
            <button 
              className={`copy-field-btn ${copiedField === 'dates' ? 'copied' : ''}`}
              onClick={copyDates}
              title="Copy dates"
            >
              {copiedField === 'dates' ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>
          <div className="entry-actions">
            {jobDescription && entry.bullets && entry.bullets.length > 0 && (
              <button 
                onClick={() => setShowAIModal(true)}
                className="ai-adjust-btn"
                title="Adjust with AI"
              >
                <Sparkles size={14} />
              </button>
            )}
            <button 
              onClick={copyAll} 
              className={copiedField === 'all' ? 'copied' : ''}
              title="Copy all"
            >
              {copiedField === 'all' ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <button onClick={() => setIsEditing(true)} title="Edit entry"><Edit3 size={12} /></button>
            <button onClick={deleteEntry} title="Delete entry"><Trash2 size={12} /></button>
          </div>
        </div>
      </div>

      <div className="bullets-section">
        <div className="bullets-header">
          <span className="bullets-label">Accomplishments</span>
          {entry.bullets && entry.bullets.length > 0 && (
            <button 
              className={`copy-field-btn visible ${copiedField === 'bullets' ? 'copied' : ''}`}
              onClick={copyBullets}
              title="Copy all bullet points"
            >
              {copiedField === 'bullets' ? <Check size={12} /> : <Copy size={12} />}
            </button>
          )}
        </div>
        <ul className="bullets-list">
          {entry.bullets?.map((bullet) => (
            <li key={bullet.id}>
              {editingBulletId === bullet.id ? (
                <div className="bullet-edit">
                  <textarea
                    ref={bulletEditTextareaRef}
                    value={editingBulletContent}
                    onChange={(e) => {
                      setEditingBulletContent(e.target.value)
                      autoResizeTextarea(e.target)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault()
                        saveBullet(bullet.id)
                      } else if (e.key === 'Escape') {
                        cancelEditBullet()
                      }
                    }}
                    autoFocus
                    className="bullet-edit-input"
                    rows={1}
                  />
                  <button 
                    className="bullet-save" 
                    onClick={() => saveBullet(bullet.id)}
                    title="Save"
                  >
                    <Save size={12} />
                  </button>
                  <button 
                    className="bullet-cancel" 
                    onClick={cancelEditBullet}
                    title="Cancel"
                  >
                    <X size={12} />
                  </button>
                </div>
              ) : (
                <>
                  <span 
                    className="bullet-content"
                    onClick={() => startEditBullet(bullet.id, bullet.content)}
                    title="Click to edit"
                  >
                    {bullet.content}
                  </span>
                  <div className="bullet-actions">
                    <button 
                      className="edit-bullet" 
                      onClick={() => startEditBullet(bullet.id, bullet.content)}
                      title="Edit bullet"
                    >
                      <Edit3 size={10} />
                    </button>
                    <button 
                      className="delete-bullet" 
                      onClick={() => deleteBullet(bullet.id)}
                      title="Delete bullet"
                    >
                      <X size={10} />
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="add-bullet">
        <input
          type="text"
          placeholder="Add bullet point..."
          value={newBullet}
          onChange={(e) => setNewBullet(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addBullet()}
        />
        <button onClick={addBullet} disabled={!newBullet.trim()}>
          <Plus size={14} />
        </button>
      </div>

      {/* AI Adjustment Modal */}
      {showAIModal && (
        <div className="ai-modal-overlay" onClick={declineAISuggestions}>
          <div className="ai-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ai-modal-header">
              <h3>
                <Sparkles size={18} />
                AI-Suggested Bullet Points
              </h3>
              <button className="close-modal-btn" onClick={declineAISuggestions}>
                <X size={18} />
              </button>
            </div>

            <div className="ai-modal-content">
              {isLoadingAI ? (
                <div className="ai-loading">
                  <Loader2 size={24} className="spinner" />
                  <p>Analyzing job description and generating suggestions...</p>
                </div>
              ) : aiError ? (
                <div className="ai-error">
                  <p>{aiError}</p>
                  <button className="btn-retry" onClick={adjustWithAI}>
                    Try Again
                  </button>
                </div>
              ) : suggestedBullets.length > 0 ? (
                <>
                  <div className="ai-instructions-section">
                    <label className="ai-instructions-label">Additional Instructions (Optional)</label>
                    <textarea
                      className="ai-instructions-input"
                      value={additionalInstructions}
                      onChange={(e) => setAdditionalInstructions(e.target.value)}
                      placeholder="Add any specific instructions for the AI (e.g., 'Emphasize leadership skills', 'Focus on metrics')"
                      rows={3}
                    />
                  </div>
                  <div className="ai-comparison">
                    <div className="comparison-section">
                      <h4>Current Bullets</h4>
                      <ul className="bullets-compare">
                        {entry.bullets?.map((bullet, idx) => (
                          <li key={bullet.id}>{bullet.content}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="comparison-section">
                      <h4>Suggested Bullets (Editable)</h4>
                      <div className="suggested-bullets-editable">
                        {suggestedBullets.map((bullet, idx) => (
                          <textarea
                            key={idx}
                            ref={(el) => {
                              textareaRefs.current[idx] = el
                              if (el) autoResizeTextarea(el)
                            }}
                            className="bullet-input-editable"
                            value={bullet}
                            onChange={(e) => {
                              updateSuggestedBullet(idx, e.target.value)
                              autoResizeTextarea(e.target)
                            }}
                            placeholder={`Bullet point ${idx + 1}...`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="ai-modal-actions">
                    <button className="btn-decline" onClick={declineAISuggestions}>
                      Decline
                    </button>
                    <button className="btn-regenerate" onClick={adjustWithAI} disabled={isLoadingAI}>
                      Regenerate
                    </button>
                    <button className="btn-accept" onClick={acceptAISuggestions}>
                      Accept Changes
                    </button>
                  </div>
                </>
              ) : (
                <div className="ai-instructions-section">
                  <label className="ai-instructions-label">Additional Instructions (Optional)</label>
                  <textarea
                    className="ai-instructions-input"
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    placeholder="Add any specific instructions for the AI (e.g., 'Emphasize leadership skills', 'Focus on metrics')"
                    rows={3}
                  />
                  <div className="ai-modal-actions">
                    <button className="btn-decline" onClick={declineAISuggestions}>
                      Cancel
                    </button>
                    <button className="btn-generate" onClick={adjustWithAI} disabled={isLoadingAI}>
                      Generate Suggestions
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        .entry-card {
          background: var(--bg-elevated);
          border-radius: var(--radius-md);
          padding: var(--space-md);
          margin-bottom: var(--space-sm);
          border: 1px solid var(--border-subtle);
        }

        .entry-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: var(--space-sm);
        }

        .entry-info h4 {
          font-size: 0.9rem;
          font-weight: 600;
          margin-bottom: 0;
        }

        .copyable-field {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 2px;
        }

        .copyable-field:hover .copy-field-btn {
          opacity: 1;
        }

        .copy-field-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 2px 4px;
          border-radius: 4px;
          color: var(--text-muted);
          opacity: 0;
          transition: all 150ms ease;
          background: transparent;
          border: none;
          cursor: pointer;
          font-size: 0.7rem;
        }

        .copy-field-btn:hover {
          background: var(--bg-hover);
          color: var(--accent-primary);
        }

        .copy-field-btn.copied {
          color: var(--accent-success, #22c55e);
          opacity: 1;
        }

        .bullets-header:hover .copy-field-btn.visible {
          opacity: 1;
        }

        .copy-field-btn.visible {
          opacity: 0;
          background: transparent;
          padding: 2px 4px;
        }

        .copy-field-btn.visible:hover {
          background: var(--bg-hover);
          color: var(--accent-primary);
        }

        .subtitle {
          color: var(--accent-secondary);
          font-size: 0.8rem;
        }

        .location {
          color: var(--text-muted);
          font-size: 0.8rem;
        }

        .entry-meta {
          text-align: right;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 4px;
        }

        .date-range {
          font-size: 0.75rem;
          color: var(--text-muted);
          font-family: var(--font-mono);
        }

        .bullets-section {
          margin-top: var(--space-sm);
        }

        .bullets-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-xs);
        }

        .bullets-label {
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--text-muted);
          font-weight: 500;
        }

        .entry-actions {
          display: flex;
          gap: var(--space-xs);
          margin-top: var(--space-xs);
          opacity: 0;
          transition: opacity var(--transition-fast);
        }

        .entry-card:hover .entry-actions {
          opacity: 1;
        }

        .entry-actions button {
          padding: 4px;
          border-radius: var(--radius-sm);
          color: var(--text-muted);
          background: transparent;
          border: none;
          cursor: pointer;
        }

        .entry-actions button:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .entry-actions button.copied {
          color: var(--accent-success, #22c55e);
        }

        .entry-actions .ai-adjust-btn {
          color: var(--accent-primary, #6366f1);
        }

        .entry-actions .ai-adjust-btn:hover {
          background: rgba(99, 102, 241, 0.1);
          color: var(--accent-secondary, #818cf8);
        }

        .ai-modal-overlay {
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

        .ai-modal {
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: 16px;
          width: 100%;
          max-width: 900px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        }

        .ai-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .ai-modal-header h3 {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 1.125rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .ai-modal-header svg {
          color: var(--accent-primary);
        }

        .close-modal-btn {
          padding: 8px;
          border-radius: 8px;
          color: var(--text-muted);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 150ms ease;
        }

        .close-modal-btn:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .ai-modal-content {
          flex: 1;
          overflow-y: auto;
          padding: 24px;
        }

        .ai-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          gap: 16px;
          color: var(--text-secondary);
        }

        .ai-loading .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .ai-error {
          text-align: center;
          padding: 40px 20px;
          color: var(--text-secondary);
        }

        .ai-error p {
          margin-bottom: 16px;
          color: var(--accent-danger);
        }

        .btn-retry {
          padding: 8px 16px;
          background: var(--accent-primary);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
        }

        .btn-retry:hover {
          background: var(--accent-secondary);
        }

        .ai-comparison {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .comparison-section h4 {
          font-size: 0.9rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 12px;
        }

        .bullets-compare {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .bullets-compare li {
          padding: 8px 12px;
          margin-bottom: 8px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: 6px;
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.5;
        }

        .bullets-compare.suggested li {
          background: rgba(99, 102, 241, 0.1);
          border-color: var(--accent-primary);
          color: var(--text-primary);
        }

        .suggested-bullets-editable {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .bullet-input-editable {
          width: 100%;
          padding: 10px 12px;
          background: rgba(99, 102, 241, 0.1);
          border: 2px solid var(--accent-primary);
          border-radius: 6px;
          font-size: 0.875rem;
          color: var(--text-primary);
          line-height: 1.5;
          resize: none;
          overflow: hidden;
          min-height: 50px;
          font-family: var(--font-sans, inherit);
          transition: border-color 150ms ease, box-shadow 150ms ease;
        }

        .bullet-input-editable:focus {
          outline: none;
          border-color: var(--accent-secondary);
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
          background: rgba(99, 102, 241, 0.15);
        }

        .bullet-input-editable::placeholder {
          color: var(--text-muted);
        }

        .ai-modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding-top: 20px;
          border-top: 1px solid var(--border-subtle);
        }

        .btn-decline,
        .btn-accept,
        .btn-regenerate,
        .btn-generate {
          padding: 10px 20px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 150ms ease;
          border: none;
        }

        .btn-decline {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }

        .btn-decline:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .btn-regenerate, .btn-generate {
          background: var(--bg-tertiary);
          color: var(--accent-primary);
          border: 1px solid var(--accent-primary);
        }

        .btn-regenerate:hover:not(:disabled), .btn-generate:hover:not(:disabled) {
          background: var(--accent-glow);
          color: var(--accent-secondary);
        }

        .btn-regenerate:disabled, .btn-generate:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-accept {
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          color: white;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        }

        .btn-accept:hover {
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
        }

        @media (max-width: 768px) {
          .ai-comparison {
            grid-template-columns: 1fr;
          }
        }

        .bullets-list {
          list-style: none;
          margin: var(--space-sm) 0;
        }

        .bullets-list li {
          display: flex;
          align-items: flex-start;
          gap: var(--space-sm);
          padding: var(--space-xs) 0;
          padding-left: var(--space-md);
          position: relative;
          font-size: 0.85rem;
          color: var(--text-secondary);
        }

        .bullets-list li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 10px;
          width: 4px;
          height: 4px;
          background: var(--accent-primary);
          border-radius: 50%;
        }

        .bullets-list li span {
          flex: 1;
        }

        .bullet-content {
          flex: 1;
          cursor: pointer;
          padding: 2px 4px;
          margin: -2px -4px;
          border-radius: var(--radius-sm);
          transition: background var(--transition-fast);
        }

        .bullet-content:hover {
          background: var(--bg-hover);
        }

        .bullet-actions {
          display: flex;
          gap: 4px;
          opacity: 0;
          transition: opacity var(--transition-fast);
        }

        .bullets-list li:hover .bullet-actions {
          opacity: 1;
        }

        .edit-bullet,
        .delete-bullet {
          padding: 2px;
          color: var(--text-muted);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .edit-bullet:hover {
          color: var(--accent-primary);
          background: var(--bg-hover);
        }

        .delete-bullet:hover {
          color: var(--accent-danger);
          background: var(--bg-hover);
        }

        .bullet-edit {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          flex: 1;
        }

        .bullet-edit-input {
          flex: 1;
          background: var(--bg-tertiary);
          border: 1px solid var(--accent-primary);
          border-radius: var(--radius-sm);
          padding: var(--space-xs) var(--space-sm);
          font-size: 0.85rem;
          color: var(--text-primary);
          font-family: inherit;
          resize: none;
          overflow: hidden;
          min-height: 24px;
          line-height: 1.5;
        }

        .bullet-edit-input:focus {
          outline: none;
          border-color: var(--accent-secondary);
          box-shadow: 0 0 0 2px var(--accent-glow);
        }

        .bullet-save,
        .bullet-cancel {
          padding: 4px;
          border-radius: var(--radius-sm);
          background: transparent;
          border: none;
          cursor: pointer;
          color: var(--text-muted);
          transition: all var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .bullet-save:hover {
          color: var(--accent-success, #22c55e);
          background: var(--bg-hover);
        }

        .bullet-cancel:hover {
          color: var(--accent-danger);
          background: var(--bg-hover);
        }

        .add-bullet {
          display: flex;
          gap: var(--space-xs);
          margin-top: var(--space-sm);
        }

        .add-bullet input {
          flex: 1;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-sm);
          padding: var(--space-xs) var(--space-sm);
          font-size: 0.8rem;
          color: var(--text-primary);
        }

        .add-bullet input:focus {
          border-color: var(--accent-primary);
          outline: none;
        }

        .add-bullet button {
          padding: var(--space-xs) var(--space-sm);
          background: var(--accent-glow);
          border-radius: var(--radius-sm);
          color: var(--accent-primary);
          transition: all var(--transition-fast);
        }

        .add-bullet button:hover:not(:disabled) {
          background: var(--accent-primary);
          color: white;
        }

        .add-bullet button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  )
}

