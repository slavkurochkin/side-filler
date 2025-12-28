import { motion } from 'framer-motion'
import { Mail, Phone, MapPin, Calendar, Globe, Linkedin, Github } from 'lucide-react'
import { Resume } from '../types'
import React, { useState, useEffect, useRef } from 'react'
import { loadThemeColor } from './Settings'

export type ResumeTemplate = 'classic' | 'modern' | 'minimal'

interface ResumePreviewProps {
  resume: Resume | null
  template: ResumeTemplate
  resumeContentRef?: React.RefObject<HTMLDivElement>
  apiUrl?: string
  onUpdate?: (resumeId: string) => void
}

export function ResumePreview({ resume, template, resumeContentRef: externalRef, apiUrl, onUpdate }: ResumePreviewProps) {
  const [themeColor, setThemeColor] = useState<string>('#6366f1')
  const [totalPages, setTotalPages] = useState<number>(1)
  const [editingField, setEditingField] = useState<string | null>(null)
  const internalRef = useRef<HTMLDivElement>(null)
  const resumeContentRef = externalRef || internalRef

  useEffect(() => {
    const color = loadThemeColor()
    setThemeColor(color)
    document.documentElement.style.setProperty('--resume-accent-color', color)
    
    // Listen for theme color changes
    const handleStorageChange = () => {
      const newColor = loadThemeColor()
      setThemeColor(newColor)
      document.documentElement.style.setProperty('--resume-accent-color', newColor)
    }
    window.addEventListener('storage', handleStorageChange)
    
    // Also check periodically for changes (in case same window)
    const interval = setInterval(() => {
      const current = loadThemeColor()
      if (current !== color) {
        setThemeColor(current)
        document.documentElement.style.setProperty('--resume-accent-color', current)
      }
    }, 100)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    document.documentElement.style.setProperty('--resume-accent-color', themeColor)
  }, [themeColor])

  const A4_HEIGHT_PX = 1123
  const PADDING_PX = 96
  const USABLE_HEIGHT = A4_HEIGHT_PX - PADDING_PX

  // Calculate total pages based on A4 dimensions
  useEffect(() => {
    if (!resumeContentRef.current || !resume) return

    const calculatePages = () => {
      const element = resumeContentRef.current
      if (!element) return

      // Get the actual scroll height of the content
      const contentHeight = element.scrollHeight
      const pages = Math.max(1, Math.ceil(contentHeight / USABLE_HEIGHT))
      setTotalPages(pages)
    }

    // Calculate after a short delay to ensure DOM is rendered
    const timeoutId = setTimeout(calculatePages, 100)
    
    // Use ResizeObserver to recalculate when content changes
    const resizeObserver = new ResizeObserver(() => {
      calculatePages()
    })
    
    if (resumeContentRef.current) {
      resizeObserver.observe(resumeContentRef.current)
    }

    window.addEventListener('resize', calculatePages)

    return () => {
      clearTimeout(timeoutId)
      resizeObserver.disconnect()
      window.removeEventListener('resize', calculatePages)
    }
  }, [resume, resumeContentRef, themeColor])


  if (!resume) {
    return (
      <div className="preview-empty">
        <div className="empty-content">
          <div className="empty-icon">📄</div>
          <h3>No Resume Selected</h3>
          <p>Select or create a resume to see the preview</p>
        </div>
        <style>{`
          .preview-empty {
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-primary);
          }
          .empty-content {
            text-align: center;
            color: var(--text-muted);
          }
          .empty-icon {
            font-size: 4rem;
            margin-bottom: var(--space-lg);
            opacity: 0.5;
          }
          .empty-content h3 {
            color: var(--text-secondary);
            margin-bottom: var(--space-sm);
          }
        `}</style>
      </div>
    )
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  // Save field when editing is complete
  const handleSave = async (field: string, value: string, entryId?: string, bulletId?: string) => {
    if (!resume || !apiUrl || !onUpdate) {
      console.log('Missing requirements:', { resume: !!resume, apiUrl, onUpdate: !!onUpdate })
      return
    }

    // Don't save if value is empty (unless it was already empty)
    if (!value.trim()) {
      console.log('Empty value, skipping save')
      setEditingField(null)
      return
    }

    try {
      let response
      let responseData
      
      // Check bulletId first, since bullets can have entryId too
      if (bulletId) {
        // Update bullet
        const payload = { content: value.trim() }
        console.log('Updating bullet:', { bulletId, value: value.trim(), payload })
        response = await fetch(`${apiUrl}/bullets/${bulletId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }
        
        responseData = await response.json()
        console.log('Bullet update response:', responseData)
        
      } else if (entryId) {
        // Update entry field
        const payload = { [field]: value.trim() }
        console.log('Updating entry:', { entryId, field, value: value.trim(), payload })
        response = await fetch(`${apiUrl}/entries/${entryId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }
        
        responseData = await response.json()
        console.log('Entry update response:', responseData)
        
      } else {
        // Update resume field
        const payload = { [field]: value.trim() }
        console.log('Updating resume:', { resumeId: resume.id, field, value: value.trim(), payload })
        response = await fetch(`${apiUrl}/resumes/${resume.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
          throw new Error(errorData.error || `HTTP ${response.status}`)
        }
        
        responseData = await response.json()
        console.log('Resume update response:', responseData)
        
        // Verify the update was saved
        if (responseData[field] !== value.trim()) {
          console.warn('API response value does not match saved value:', {
            expected: value.trim(),
            received: responseData[field]
          })
        }
      }

      console.log('Update successful, refreshing resume data...')
      // Small delay to ensure database commit, then refresh
      await new Promise(resolve => setTimeout(resolve, 100))
      // Wait for the refresh to complete
      await onUpdate(resume.id)
      console.log('Resume data refreshed')
    } catch (error) {
      console.error('Failed to update:', error)
      alert(`Failed to save changes: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setEditingField(null)
    }
  }

  // Handle contentEditable blur - save the value
  const handleBlur = (e: React.FocusEvent<HTMLElement>, field: string, entryId?: string, bulletId?: string) => {
    if (!apiUrl) return
    
    // Get the current text content from the DOM element
    const element = e.currentTarget
    const newValue = element.textContent?.trim() || ''
    
    // Get the original value to compare
    let originalValue = ''
    if (bulletId) {
      originalValue = resume?.sections?.flatMap(s => s.entries || [])
        .find(e => e.bullets?.some(b => b.id === bulletId))
        ?.bullets?.find(b => b.id === bulletId)?.content || ''
    } else if (entryId) {
      const entry = resume?.sections?.flatMap(s => s.entries || [])
        .find(e => e.id === entryId)
      originalValue = entry?.[field as keyof typeof entry] as string || ''
    } else {
      originalValue = resume?.[field as keyof Resume] as string || ''
    }
    
    const fieldKey = bulletId ? `bullet-${bulletId}` : entryId ? `entry-${entryId}-${field}` : field
    setEditingField(null)
    
    // Only save if value changed
    if (newValue !== originalValue.trim()) {
      console.log('Saving changed value:', { field, entryId, bulletId, oldValue: originalValue, newValue })
      handleSave(field, newValue, entryId, bulletId)
    }
  }

  // Handle focus - just track which field is being edited
  const handleFocus = (field: string, entryId?: string, bulletId?: string) => {
    if (!apiUrl) return
    const fieldKey = bulletId ? `bullet-${bulletId}` : entryId ? `entry-${entryId}-${field}` : field
    setEditingField(fieldKey)
  }

  // Handle Enter key to blur (save)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      e.currentTarget.blur()
    }
  }


  // Group sections by title to avoid duplicate section titles
  const groupedSections = resume?.sections?.reduce((acc, section) => {
    const title = section.title.toUpperCase()
    if (!acc[title]) {
      acc[title] = []
    }
    acc[title].push(section)
    return acc
  }, {} as Record<string, typeof resume.sections>) || {}

  return (
    <div className="resume-preview">
      <div className="preview-container">
        <motion.div 
          ref={resumeContentRef}
          className={`resume-paper template-${template}`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Header */}
          <header className="resume-header">
            <h1 
              className="resume-name editable-field"
              contentEditable={!!apiUrl}
              suppressContentEditableWarning
              onFocus={() => handleFocus('name')}
              onBlur={(e) => apiUrl && handleBlur(e, 'name')}
              onKeyDown={handleKeyDown}
              title={apiUrl ? 'Click to edit' : undefined}
            >
              {resume.name || 'Your Name'}
            </h1>
            <div className="contact-row">
              {(resume.email || apiUrl) && (
                <span className="contact-item" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Mail size={14} />
                  <span
                    className={apiUrl ? 'editable-field' : ''}
                    contentEditable={!!apiUrl}
                    suppressContentEditableWarning
                    onFocus={() => handleFocus('email')}
                    onBlur={(e) => apiUrl && handleBlur(e, 'email')}
                    onKeyDown={handleKeyDown}
                    title={apiUrl ? (resume.email ? 'Click to edit' : 'Click to add email') : undefined}
                    style={{ outline: 'none' }}
                  >
                    {resume.email || (apiUrl ? 'Add email' : '')}
                  </span>
                </span>
              )}
              {(resume.phone || apiUrl) && (
                <span className="contact-item" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Phone size={14} />
                  <span
                    className={apiUrl ? 'editable-field' : ''}
                    contentEditable={!!apiUrl}
                    suppressContentEditableWarning
                    onFocus={() => handleFocus('phone')}
                    onBlur={(e) => apiUrl && handleBlur(e, 'phone')}
                    onKeyDown={handleKeyDown}
                    title={apiUrl ? (resume.phone ? 'Click to edit' : 'Click to add phone') : undefined}
                    style={{ outline: 'none' }}
                  >
                    {resume.phone || (apiUrl ? 'Add phone' : '')}
                  </span>
                </span>
              )}
              {resume.website && (
                <span className="contact-item contact-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Globe size={14} />
                  <span
                    className={apiUrl ? 'editable-field' : ''}
                    contentEditable={!!apiUrl}
                    suppressContentEditableWarning
                    onFocus={() => handleFocus('website')}
                    onBlur={(e) => apiUrl && handleBlur(e, 'website')}
                    onKeyDown={handleKeyDown}
                    title={apiUrl ? 'Click to edit' : undefined}
                    style={{ outline: 'none' }}
                  >
                    {resume.website.replace(/^https?:\/\//, '')}
                  </span>
                </span>
              )}
              {resume.linkedin && (
                <span className="contact-item contact-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Linkedin size={14} />
                  <span
                    className={apiUrl ? 'editable-field' : ''}
                    contentEditable={!!apiUrl}
                    suppressContentEditableWarning
                    onFocus={() => handleFocus('linkedin')}
                    onBlur={(e) => apiUrl && handleBlur(e, 'linkedin')}
                    onKeyDown={handleKeyDown}
                    title={apiUrl ? 'Click to edit' : undefined}
                    style={{ outline: 'none' }}
                  >
                    LinkedIn
                  </span>
                </span>
              )}
              {resume.github && (
                <span className="contact-item contact-link" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Github size={14} />
                  <span
                    className={apiUrl ? 'editable-field' : ''}
                    contentEditable={!!apiUrl}
                    suppressContentEditableWarning
                    onFocus={() => handleFocus('github')}
                    onBlur={(e) => apiUrl && handleBlur(e, 'github')}
                    onKeyDown={handleKeyDown}
                    title={apiUrl ? 'Click to edit' : undefined}
                    style={{ outline: 'none' }}
                  >
                    GitHub
                  </span>
                </span>
              )}
            </div>
            {resume.summary && (
              <p 
                className="resume-summary editable-field"
                contentEditable={!!apiUrl}
                suppressContentEditableWarning
                onFocus={() => handleFocus('summary')}
                onBlur={(e) => apiUrl && handleBlur(e, 'summary')}
                onKeyDown={handleKeyDown}
                title={apiUrl ? 'Click to edit' : undefined}
              >
                {resume.summary}
              </p>
            )}
          </header>

          {/* Sections */}
          <div className="resume-body">
            {groupedSections && Object.entries(groupedSections).map(([title, sections], groupIndex) => {
              if (!sections || sections.length === 0) return null
              const isSkillsSection = title.toUpperCase() === 'SKILLS'
              return (
              <motion.section 
                key={title} 
                className="resume-section"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: groupIndex * 0.1 }}
              >
                <h2 className="section-title">{title}</h2>
                <div className="section-divider" />
                
                {isSkillsSection ? (
                  <div className="skills-badges">
                    {sections?.flatMap(section => 
                      section.entries?.flatMap(entry =>
                        entry.bullets?.map((bullet) => (
                          <span key={bullet.id} className="skill-badge">
                            {bullet.content}
                          </span>
                        )) || []
                      ) || []
                    )}
                  </div>
                ) : (
                  <div className="entries">
                    {sections?.flatMap(section => 
                      section.entries?.map((entry) => (
                        <div key={entry.id} className="entry">
                          <div className="entry-header">
                            <div className="entry-main">
                              <h3 
                                className="entry-title editable-field"
                                contentEditable={!!apiUrl}
                                suppressContentEditableWarning
                                onFocus={() => handleFocus('title', entry.id)}
                                onBlur={(e) => apiUrl && handleBlur(e, 'title', entry.id)}
                                onKeyDown={handleKeyDown}
                                title={apiUrl ? 'Click to edit' : undefined}
                              >
                                {entry.title}
                              </h3>
                              {entry.subtitle && (
                                <span 
                                  className="entry-subtitle editable-field"
                                  contentEditable={!!apiUrl}
                                  suppressContentEditableWarning
                                  onFocus={() => handleFocus('subtitle', entry.id)}
                                  onBlur={(e) => apiUrl && handleBlur(e, 'subtitle', entry.id)}
                                  onKeyDown={handleKeyDown}
                                  title={apiUrl ? 'Click to edit' : undefined}
                                >
                                  {entry.subtitle}
                                </span>
                              )}
                            </div>
                            <div className="entry-meta">
                              {(entry.start_date || entry.end_date || entry.is_current) && (
                                <span className="entry-date">
                                  <Calendar size={12} />
                                  {formatDate(entry.start_date)}
                                  {(entry.end_date || entry.is_current) && ' — '}
                                  {entry.is_current ? 'Present' : formatDate(entry.end_date)}
                                </span>
                              )}
                              {entry.location && (
                                <span className="entry-location">
                                  <MapPin size={12} />
                                  {entry.location}
                                </span>
                              )}
                            </div>
                          </div>
                          
                          {entry.description && (
                            <p 
                              className="entry-description editable-field"
                              contentEditable={!!apiUrl}
                              suppressContentEditableWarning
                              onFocus={() => handleFocus('description', entry.id)}
                              onBlur={(e) => apiUrl && handleBlur(e, 'description', entry.id)}
                              onKeyDown={handleKeyDown}
                              title={apiUrl ? 'Click to edit' : undefined}
                            >
                              {entry.description}
                            </p>
                          )}
                          
                          {entry.bullets && entry.bullets.length > 0 && (
                            <ul className="entry-bullets">
                              {entry.bullets.map((bullet) => (
                                <li 
                                  key={bullet.id}
                                  className="editable-field"
                                  contentEditable={!!apiUrl}
                                  suppressContentEditableWarning
                                  onFocus={() => handleFocus('content', entry.id, bullet.id)}
                                  onBlur={(e) => apiUrl && handleBlur(e, 'content', entry.id, bullet.id)}
                                  onKeyDown={handleKeyDown}
                                  title={apiUrl ? 'Click to edit' : undefined}
                                >
                                  {bullet.content}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )) || []
                    )}
                  </div>
                )}
              </motion.section>
              )
            })}
          </div>

          {/* Empty state for no sections */}
          {(!resume.sections || resume.sections.length === 0) && (
            <div className="no-sections">
              <p>Add sections to your resume using the editor on the left</p>
            </div>
          )}

        </motion.div>
      </div>


      <style>{`
        :root {
          --resume-accent-color: ${themeColor};
        }
        
        .resume-preview {
          height: 100%;
          overflow-y: auto;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
          padding: var(--space-xl);
          position: relative;
        }

        .preview-container {
          max-width: 850px;
          margin: 0 auto;
          position: relative;
        }

        .resume-paper {
          background: #ffffff;
          color: #1a1a2e;
          border-radius: var(--radius-lg);
          box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.4),
            0 0 0 1px rgba(255, 255, 255, 0.1);
          padding: 3rem;
          min-height: 100%;
          position: relative;
          width: 210mm; /* A4 width */
          min-height: 297mm; /* A4 height */
          margin: 0 auto;
          /* Ensure proper page sizing */
          box-sizing: border-box;
        }

        .resume-header {
          margin-bottom: 2rem;
          padding-bottom: 1.5rem;
          border-bottom: 2px solid #e2e8f0;
        }

        .resume-name {
          font-size: 2.25rem;
          font-weight: 700;
          color: #1e293b;
          letter-spacing: -0.02em;
          margin-bottom: 0.75rem;
        }

        .contact-row {
          display: flex;
          gap: 1.5rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }

        .contact-item {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          color: #64748b;
          font-size: 0.9rem;
        }

        .contact-item svg {
          color: var(--resume-accent-color);
        }

        .contact-link {
          text-decoration: none;
          transition: color 150ms ease;
        }

        .contact-link:hover {
          color: var(--resume-accent-color);
        }

        .resume-summary {
          color: #475569;
          font-size: 0.95rem;
          line-height: 1.7;
          max-width: 650px;
          margin: 0 auto;
        }

        .resume-body {
          display: flex;
          flex-direction: column;
          gap: 1.75rem;
        }

        .resume-section {
          page-break-inside: avoid;
          break-inside: avoid;
        }

        /* Prevent orphan/widow lines */
        .entry-bullets {
          orphans: 3;
          widows: 3;
          page-break-inside: auto;
        }

        .entry-bullets li {
          orphans: 3;
          widows: 3;
          page-break-inside: avoid;
          break-inside: avoid;
          /* Prevent single bullet points from being isolated on a page */
          min-height: 1.5em;
        }

        /* Don't break bullet points themselves */
        .entry-bullets li::before {
          page-break-after: avoid;
        }

        .entry-description,
        .resume-summary {
          orphans: 3;
          widows: 3;
          page-break-inside: avoid;
          break-inside: avoid;
        }

        /* Keep entries together when possible, but allow breaks if necessary */
        .entry {
          page-break-inside: avoid;
          break-inside: avoid;
          orphans: 2;
          widows: 2;
          /* If an entry must break, try to keep at least 2 lines together */
          page-break-after: auto;
        }

        /* Don't leave just the title on one page */
        .entry-header {
          page-break-after: avoid;
          break-after: avoid;
        }

        /* Try to keep at least 2 bullets with the entry header */
        .entry-header + .entry-description,
        .entry-header ~ .entry-bullets {
          page-break-before: avoid;
          break-before: avoid;
        }


        .section-title {
          font-size: 1.1rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 0.5rem;
        }

        .section-divider {
          height: 2px;
          margin-bottom: 1rem;
        }

        .entries {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
        }

        .entry {
          position: relative;
        }

        .entry-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin-bottom: 0.5rem;
        }

        .entry-main {
          flex: 1;
        }

        .entry-title {
          font-size: 1.05rem;
          font-weight: 600;
          color: #1e293b;
          margin-bottom: 0.125rem;
        }

        .entry-subtitle {
          color: #475569;
          font-size: 0.95rem;
          font-weight: 500;
        }

        .entry-meta {
          text-align: right;
          flex-shrink: 0;
        }

        .entry-date,
        .entry-location {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 0.375rem;
          font-size: 0.85rem;
          color: #64748b;
        }

        .entry-date svg,
        .entry-location svg {
          color: #94a3b8;
        }

        .entry-description {
          color: #475569;
          font-size: 0.9rem;
          line-height: 1.6;
          margin-bottom: 0.5rem;
        }

        .entry-bullets {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .entry-bullets li {
          position: relative;
          padding-left: 1.25rem;
          font-size: 0.9rem;
          color: #475569;
          line-height: 1.6;
          margin-bottom: 0.375rem;
        }

        .entry-bullets li::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0.6em;
          width: 5px;
          height: 5px;
          background: var(--resume-accent-color);
          border-radius: 50%;
        }

        /* Editable field styles */
        .editable-field {
          position: relative;
          transition: all 150ms ease;
          outline: none;
        }

        .editable-field[contenteditable="true"]:hover {
          background: rgba(99, 102, 241, 0.05);
          border-radius: 4px;
          cursor: text;
        }

        .editable-field[contenteditable="true"]:focus {
          background: rgba(99, 102, 241, 0.1);
          border-radius: 4px;
          outline: 2px solid rgba(99, 102, 241, 0.3);
          outline-offset: 2px;
        }

        .editable-field[contenteditable="true"]:empty::before {
          content: attr(title);
          color: #94a3b8;
          font-style: italic;
          opacity: 0.5;
        }

        .editable-field[contenteditable="true"]:empty:focus::before {
          content: '';
        }

        /* Prevent link navigation when editing */
        .contact-link.editable-field[contenteditable="true"] {
          pointer-events: auto;
        }

        .contact-link.editable-field[contenteditable="true"]:focus {
          pointer-events: auto;
        }

        .skills-badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .skill-badge {
          display: inline-block;
          padding: 0.375rem 0.75rem;
          color: var(--resume-accent-color);
          border: 1px solid var(--resume-accent-color);
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: 500;
          line-height: 1.4;
          position: relative;
          background-color: transparent;
        }

        .skill-badge::before {
          content: '';
          position: absolute;
          inset: 0;
          background-color: var(--resume-accent-color);
          opacity: 0.15;
          border-radius: 6px;
          z-index: -1;
        }

        .no-sections {
          text-align: center;
          padding: 3rem;
          color: #94a3b8;
        }

        /* Template: Classic (default) */
        .template-classic .resume-header {
          text-align: center;
        }

        .template-classic .section-title {
          color: var(--resume-accent-color);
        }

        .template-classic .section-divider {
          background: linear-gradient(90deg, var(--resume-accent-color) 0%, transparent 100%);
        }

        /* Template: Modern */
        .template-modern .resume-header {
          text-align: left;
          border-bottom: 3px solid #1e293b;
          padding-bottom: 1.5rem;
        }

        .template-modern .resume-name {
          font-size: 2.5rem;
          color: #0f172a;
          margin-bottom: 0.5rem;
        }

        .template-modern .contact-row {
          justify-content: flex-start;
          gap: 1.25rem;
        }

        .template-modern .section-title {
          color: #0f172a;
          font-size: 1.15rem;
          border-left: 4px solid var(--resume-accent-color);
          padding-left: 0.75rem;
          margin-bottom: 0.75rem;
        }

        .template-modern .section-divider {
          display: none;
        }

        .template-modern .entry-title {
          color: #0f172a;
          font-size: 1.1rem;
        }

        .template-modern .entry-bullets li::before {
          background: #0f172a;
          width: 6px;
          height: 6px;
        }

        /* Template: Minimal */
        .template-minimal .resume-paper {
          padding: 4rem;
        }

        .template-minimal .resume-header {
          text-align: left;
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 2rem;
          margin-bottom: 3rem;
        }

        .template-minimal .resume-name {
          font-size: 2rem;
          font-weight: 300;
          letter-spacing: 0.05em;
          color: #1e293b;
          margin-bottom: 1rem;
        }

        .template-minimal .contact-row {
          justify-content: flex-start;
          gap: 2rem;
        }

        .template-minimal .contact-item {
          color: #64748b;
          font-size: 0.85rem;
        }

        .template-minimal .resume-summary {
          font-size: 0.9rem;
          line-height: 1.8;
          color: #475569;
        }

        .template-minimal .section-title {
          color: #64748b;
          font-size: 0.9rem;
          font-weight: 400;
          letter-spacing: 0.15em;
          margin-bottom: 1.5rem;
        }

        .template-minimal .section-divider {
          display: none;
        }

        .template-minimal .entries {
          gap: 2rem;
        }

        .template-minimal .entry-title {
          font-size: 1rem;
          font-weight: 500;
          color: #1e293b;
        }

        .template-minimal .entry-bullets li {
          font-size: 0.875rem;
          line-height: 1.8;
          color: #475569;
        }

        .template-minimal .entry-bullets li::before {
          background: #cbd5e1;
          width: 4px;
          height: 4px;
        }

        /* Skill badges template styles */
        .template-modern .skill-badge {
          color: #0f172a;
          border-color: #0f172a;
        }

        .template-modern .skill-badge::before {
          background-color: #0f172a;
          opacity: 0.15;
        }

        .template-minimal .skill-badge {
          color: #475569;
          border-color: #cbd5e1;
          font-weight: 400;
        }

        .template-minimal .skill-badge::before {
          background-color: #cbd5e1;
          opacity: 0.1;
        }

        /* Print styles */
        @media print {
          .resume-preview {
            padding: 0;
            background: white;
          }
          .resume-paper {
            box-shadow: none;
            border-radius: 0;
          }
        }
      `}</style>
    </div>
  )
}

