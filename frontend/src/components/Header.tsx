import { motion } from 'framer-motion'
import { FileText, Plus, ChevronDown, Trash2, Settings, Palette, Download, FileText as FileTextIcon, File } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'
import { Resume } from '../types'
import { ResumeTemplate } from './ResumePreview'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { Document, Packer, Paragraph, HeadingLevel, AlignmentType } from 'docx'
import { saveAs } from 'file-saver'

interface HeaderProps {
  resumes: Resume[]
  selectedResumeId: string | null
  selectedResume: Resume | null
  onSelectResume: (id: string) => void
  onCreateResume: () => void
  onDeleteResume: (id: string) => void
  onOpenSettings: () => void
  template: ResumeTemplate
  onTemplateChange: (template: ResumeTemplate) => void
  resumeContentRef: React.RefObject<HTMLDivElement> | null
}

export function Header({ resumes, selectedResumeId, selectedResume, onSelectResume, onCreateResume, onDeleteResume, onOpenSettings, template, onTemplateChange, resumeContentRef }: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  const exportToPDF = async () => {
    if (!resumeContentRef?.current || !selectedResume) return
    
    try {
      const element = resumeContentRef.current
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210
      const pageHeight = 297
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      let heightLeft = imgHeight
      let position = 0
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= pageHeight
      }
      
      pdf.save(`${selectedResume.name || 'resume'}.pdf`)
    } catch (error) {
      console.error('Failed to export PDF:', error)
      alert('Failed to export PDF. Please try again.')
    }
  }

  const exportToWord = async () => {
    if (!selectedResume) return

    const children: Paragraph[] = [
      new Paragraph({
        text: selectedResume.name || 'Your Name',
        heading: HeadingLevel.TITLE,
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 }
      })
    ]

    const contactInfo: string[] = []
    if (selectedResume.email) contactInfo.push(selectedResume.email)
    if (selectedResume.phone) contactInfo.push(selectedResume.phone)
    if (selectedResume.website) contactInfo.push(selectedResume.website.replace(/^https?:\/\//, ''))
    if (selectedResume.linkedin) contactInfo.push('LinkedIn: ' + selectedResume.linkedin)
    if (selectedResume.github) contactInfo.push('GitHub: ' + selectedResume.github)

    if (contactInfo.length > 0) {
      children.push(
        new Paragraph({
          text: contactInfo.join(' • '),
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        })
      )
    }

    if (selectedResume.summary) {
      children.push(
        new Paragraph({
          text: selectedResume.summary,
          spacing: { after: 400 }
        })
      )
    }

    if (selectedResume.sections) {
      for (const section of selectedResume.sections) {
        children.push(
          new Paragraph({
            text: section.title.toUpperCase(),
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 400, after: 200 }
          })
        )

        if (section.entries) {
          for (const entry of section.entries) {
            const entryTitle = entry.subtitle 
              ? `${entry.title} | ${entry.subtitle}`
              : entry.title
            
            children.push(
              new Paragraph({
                text: entryTitle,
                heading: HeadingLevel.HEADING_2,
                spacing: { before: 200, after: 100 }
              })
            )

            const dateRange = entry.start_date || entry.end_date || entry.is_current
              ? `${formatDate(entry.start_date)} - ${entry.is_current ? 'Present' : formatDate(entry.end_date)}`
              : ''
            
            if (dateRange || entry.location) {
              const meta = [dateRange, entry.location].filter(Boolean).join(' • ')
              children.push(
                new Paragraph({
                  text: meta,
                  spacing: { after: 100 }
                })
              )
            }

            if (entry.bullets && entry.bullets.length > 0) {
              for (const bullet of entry.bullets) {
                children.push(
                  new Paragraph({
                    text: `• ${bullet.content}`,
                    spacing: { after: 100 },
                    indent: { left: 400 }
                  })
                )
              }
            }
          }
        }
      }
    }

    const doc = new Document({
      sections: [{
        children
      }]
    })

    try {
      const blob = await Packer.toBlob(doc)
      saveAs(blob, `${selectedResume.name || 'resume'}.docx`)
    } catch (error) {
      console.error('Failed to export Word:', error)
      alert('Failed to export Word document. Please try again.')
    }
  }

  const exportToGoogleDocs = () => {
    if (!selectedResume) return

    let text = `${selectedResume.name || 'Your Name'}\n\n`

    const contactInfo: string[] = []
    if (selectedResume.email) contactInfo.push(selectedResume.email)
    if (selectedResume.phone) contactInfo.push(selectedResume.phone)
    if (selectedResume.website) contactInfo.push(selectedResume.website.replace(/^https?:\/\//, ''))
    if (selectedResume.linkedin) contactInfo.push('LinkedIn: ' + selectedResume.linkedin)
    if (selectedResume.github) contactInfo.push('GitHub: ' + selectedResume.github)

    if (contactInfo.length > 0) {
      text += contactInfo.join(' • ') + '\n\n'
    }

    if (selectedResume.summary) {
      text += selectedResume.summary + '\n\n'
    }

    if (selectedResume.sections) {
      for (const section of selectedResume.sections) {
        text += `${section.title.toUpperCase()}\n`
        text += '─'.repeat(section.title.length) + '\n\n'

        if (section.entries) {
          for (const entry of section.entries) {
            const entryTitle = entry.subtitle 
              ? `${entry.title} | ${entry.subtitle}`
              : entry.title
            
            text += `${entryTitle}\n`

            const dateRange = entry.start_date || entry.end_date || entry.is_current
              ? `${formatDate(entry.start_date)} - ${entry.is_current ? 'Present' : formatDate(entry.end_date)}`
              : ''
            
            if (dateRange || entry.location) {
              const meta = [dateRange, entry.location].filter(Boolean).join(' • ')
              text += `${meta}\n`
            }

            if (entry.bullets && entry.bullets.length > 0) {
              for (const bullet of entry.bullets) {
                text += `• ${bullet.content}\n`
              }
            }
            text += '\n'
          }
        }
      }
    }

    navigator.clipboard.writeText(text).then(() => {
      alert('Resume copied to clipboard! You can now paste it into Google Docs.')
    }).catch(() => {
      alert('Failed to copy to clipboard. Please try again.')
    })
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="logo">
          <div className="logo-icon">
            <FileText size={18} />
          </div>
          <span className="logo-text">SideFiller</span>
        </div>
      </div>

      <div className="header-center" ref={dropdownRef}>
        <button 
          className="resume-selector"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
        >
          <span className="selector-text">{selectedResume?.name || 'Select Resume'}</span>
          <ChevronDown 
            size={16} 
            className={`selector-chevron ${isDropdownOpen ? 'open' : ''}`}
          />
        </button>

        {isDropdownOpen && (
          <motion.div 
            className="selector-dropdown"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            {resumes.map(resume => (
              <div key={resume.id} className="dropdown-row">
                <button
                  className={`dropdown-item ${resume.id === selectedResumeId ? 'active' : ''}`}
                  onClick={() => {
                    onSelectResume(resume.id)
                    setIsDropdownOpen(false)
                  }}
                >
                  <FileText size={14} />
                  <span>{resume.name}</span>
                </button>
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`Delete "${resume.name}"?`)) {
                      onDeleteResume(resume.id)
                    }
                  }}
                  title="Delete resume"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
            <div className="dropdown-divider" />
            <button 
              className="dropdown-item create"
              onClick={() => {
                onCreateResume()
                setIsDropdownOpen(false)
              }}
            >
              <Plus size={14} />
              <span>Create New Resume</span>
            </button>
          </motion.div>
        )}
      </div>

      <div className="header-right">
        {selectedResume && (
          <div className="export-buttons-header">
            <button 
              className="export-btn-header"
              onClick={exportToPDF}
              title="Export to PDF"
              disabled={!resumeContentRef?.current}
            >
              <FileTextIcon size={16} />
              <span>PDF</span>
            </button>
            <button 
              className="export-btn-header"
              onClick={exportToWord}
              title="Export to Word"
            >
              <File size={16} />
              <span>Word</span>
            </button>
            <button 
              className="export-btn-header"
              onClick={exportToGoogleDocs}
              title="Copy for Google Docs"
            >
              <Download size={16} />
              <span>Google Docs</span>
            </button>
          </div>
        )}
        <div className="template-selector-header">
          <Palette size={16} />
          <select 
            value={template} 
            onChange={(e) => onTemplateChange(e.target.value as ResumeTemplate)}
            className="template-select-header"
          >
            <option value="classic">Classic</option>
            <option value="modern">Modern</option>
            <option value="minimal">Minimal</option>
          </select>
        </div>
        <button 
          className="settings-btn"
          onClick={onOpenSettings}
          title="Settings"
        >
          <Settings size={18} />
        </button>
        <motion.button 
          className="new-resume-btn"
          onClick={onCreateResume}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Plus size={16} />
          <span>New Resume</span>
        </motion.button>
      </div>

      <style>{`
        .app-header {
          height: 56px;
          background: var(--bg-secondary);
          border-bottom: 1px solid var(--border-subtle);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          position: relative;
          z-index: 100;
          flex-shrink: 0;
        }

        .header-left {
          flex: 1;
          display: flex;
          align-items: center;
        }

        .header-right {
          flex: 1;
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 10px;
        }

        .export-buttons-header {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .export-btn-header {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 150ms ease;
        }

        .export-btn-header:hover:not(:disabled) {
          background: var(--bg-hover);
          border-color: var(--border-hover);
          color: var(--accent-primary);
        }

        .export-btn-header:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .export-btn-header svg {
          flex-shrink: 0;
        }

        .template-selector-header {
          display: flex;
          align-items: center;
          gap: 8px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: 8px;
          padding: 6px 10px;
          transition: all 150ms ease;
        }

        .template-selector-header:hover {
          border-color: var(--border-hover);
          background: var(--bg-hover);
        }

        .template-selector-header svg {
          color: var(--text-secondary);
          flex-shrink: 0;
        }

        .template-select-header {
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 0.875rem;
          cursor: pointer;
          outline: none;
          padding: 0;
          font-weight: 500;
        }

        .template-select-header:hover {
          color: var(--accent-primary);
        }

        .settings-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: 8px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 150ms ease;
        }

        .settings-btn:hover {
          background: var(--bg-hover);
          border-color: var(--border-hover);
          color: var(--text-primary);
        }

        .header-center {
          position: relative;
          display: flex;
          align-items: center;
        }

        .logo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .logo-icon {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }

        .logo-text {
          font-weight: 600;
          font-size: 1rem;
          color: var(--text-primary);
          letter-spacing: -0.02em;
        }

        .resume-selector {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: 8px;
          cursor: pointer;
          transition: all 150ms ease;
          min-width: 160px;
          max-width: 220px;
          height: 36px;
        }

        .resume-selector:hover {
          border-color: var(--border-hover);
          background: var(--bg-hover);
        }

        .selector-text {
          flex: 1;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-primary);
          text-align: left;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          line-height: 1.2;
        }

        .selector-chevron {
          color: var(--text-muted);
          flex-shrink: 0;
          transition: transform 150ms ease;
        }

        .selector-chevron.open {
          transform: rotate(180deg);
        }

        .selector-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          left: 50%;
          transform: translateX(-50%);
          min-width: 220px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: 8px;
          box-shadow: var(--shadow-lg);
          padding: 4px;
          z-index: 1000;
        }

        .dropdown-row {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .dropdown-row:hover .delete-btn {
          opacity: 1;
        }

        .dropdown-item {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-radius: 6px;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 150ms ease;
          text-align: left;
          font-size: 0.875rem;
          background: transparent;
          border: none;
        }

        .dropdown-item:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .dropdown-item.active {
          background: var(--accent-glow);
          color: var(--accent-secondary);
        }

        .dropdown-item.create {
          color: var(--accent-primary);
          width: 100%;
        }

        .dropdown-item.create:hover {
          background: var(--accent-glow);
        }

        .delete-btn {
          padding: 8px;
          border-radius: 6px;
          color: var(--text-muted);
          cursor: pointer;
          transition: all 150ms ease;
          background: transparent;
          border: none;
          opacity: 0;
        }

        .delete-btn:hover {
          background: rgba(239, 68, 68, 0.15);
          color: var(--accent-danger);
        }

        .dropdown-divider {
          height: 1px;
          background: var(--border-subtle);
          margin: 4px 0;
        }

        .new-resume-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          border-radius: 8px;
          color: white;
          font-weight: 500;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 150ms ease;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
          border: none;
          height: 36px;
        }

        .new-resume-btn:hover {
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
        }
      `}</style>
    </header>
  )
}
