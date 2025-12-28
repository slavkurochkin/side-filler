import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  User, Mail, Phone, FileText, Plus, ChevronDown, ChevronRight,
  Briefcase, GraduationCap, FolderKanban, Sparkles, Edit3, Trash2, Save, X,
  Globe, Linkedin, Github, Copy, Check, ChevronsDown, ChevronsUp, Loader2
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

  const addSection = async (type: string) => {
    try {
      await fetch(`${apiUrl}/sections`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resume_id: resume.id,
          section_type: type,
          title: type.charAt(0).toUpperCase() + type.slice(1),
          sort_order: (resume.sections?.length || 0)
        })
      })
      onUpdate(resume.id)
    } catch (error) {
      console.error('Failed to add section:', error)
    }
  }

  const addEntry = async (sectionId: string) => {
    try {
      await fetch(`${apiUrl}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section_id: sectionId,
          title: 'New Entry',
          subtitle: '',
          sort_order: 0
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
              <button className="btn-save" onClick={() => saveEdit('summary')}>
                <Save size={14} /> Save
              </button>
              <button className="btn-cancel" onClick={() => setEditingField(null)}>
                <X size={14} /> Cancel
              </button>
            </div>
          </div>
        ) : (
          <p 
            className="summary"
            onClick={() => startEdit('summary', resume.summary || '')}
          >
            {resume.summary || 'Click to add a professional summary...'}
            <Edit3 size={12} className="edit-icon" />
          </p>
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

        .summary {
          color: var(--text-secondary);
          font-size: 0.9rem;
          line-height: 1.6;
          cursor: pointer;
          padding: var(--space-sm);
          border-radius: var(--radius-sm);
          margin: 0 calc(-1 * var(--space-sm));
          display: flex;
          align-items: flex-start;
          gap: var(--space-sm);
        }

        .summary:hover {
          background: var(--bg-tertiary);
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

        .btn-save, .btn-cancel {
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
  jobDescription
}: SectionCardProps) {
  const Icon = sectionIcons[section.section_type] || FileText

  return (
    <motion.div 
      className="section-card"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      layout
    >
      <div className="section-header" onClick={onToggle}>
        <div className="section-title">
          <div className="section-icon">
            <Icon size={16} />
          </div>
          <h3>{section.title}</h3>
          <span className="entry-count">{section.entries?.length || 0}</span>
        </div>
        <div className="section-actions">
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

      <style>{`
        .section-card {
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          margin-bottom: var(--space-md);
          overflow: hidden;
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

  const adjustWithAI = async () => {
    if (!jobDescription || !entry.bullets || entry.bullets.length === 0) {
      return
    }

    setIsLoadingAI(true)
    setAiError(null)
    setShowAIModal(true)

    try {
      const response = await fetch(`${apiUrl}/ai/adjust-experience`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobDescription,
          entryTitle: entry.title,
          entrySubtitle: entry.subtitle,
          entryLocation: entry.location,
          currentBullets: entry.bullets.map(b => b.content)
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

  const declineAISuggestions = () => {
    setShowAIModal(false)
    setSuggestedBullets([])
    setAiError(null)
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
                onClick={adjustWithAI}
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
              <span>{bullet.content}</span>
              <button className="delete-bullet" onClick={() => deleteBullet(bullet.id)}>
                <X size={10} />
              </button>
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
                    <button className="btn-accept" onClick={acceptAISuggestions}>
                      Accept Changes
                    </button>
                  </div>
                </>
              ) : null}
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
        .btn-accept {
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

        .delete-bullet {
          opacity: 0;
          padding: 2px;
          color: var(--text-muted);
          transition: all var(--transition-fast);
        }

        .bullets-list li:hover .delete-bullet {
          opacity: 1;
        }

        .delete-bullet:hover {
          color: var(--accent-danger);
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

