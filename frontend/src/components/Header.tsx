import { motion } from 'framer-motion'
import { FileText, Plus, ChevronDown, Trash2, Settings, Palette, Download, FileText as FileTextIcon, File, Eye, Briefcase, Focus } from 'lucide-react'
import React, { useState, useRef, useEffect } from 'react'
import { Resume } from '../types'
import { ResumeTemplate } from './ResumePreview'

type ViewMode = 'preview' | 'job-description'

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
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
  isFocusMode: boolean
  onFocusModeChange: (enabled: boolean) => void
}

export function Header({ resumes, selectedResumeId, selectedResume, onSelectResume, onCreateResume, onDeleteResume, onOpenSettings, template, onTemplateChange, resumeContentRef, viewMode, onViewModeChange, isFocusMode, onFocusModeChange }: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const exportDropdownRef = useRef<HTMLDivElement>(null)

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return ''
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
  }

  const exportToPDF = async () => {
    if (!resumeContentRef?.current || !selectedResume) return
    
    try {
      const html2canvas = (await import('html2canvas')).default
      const jsPDF = (await import('jspdf')).default
      
      const element = resumeContentRef.current
      
      // Collect link information before capturing
      interface LinkInfo {
        url: string
        x: number
        y: number
        width: number
        height: number
      }
      
      const links: LinkInfo[] = []
      
      // Helper to normalize URLs - just ensure protocol is present, preserve everything else
      const normalizeUrl = (url: string | undefined, type: 'website' | 'linkedin' | 'github'): string | null => {
        if (!url) return null
        let normalized = url.trim()
        if (!normalized) return null
        
        // If URL already has protocol, use it as-is
        if (normalized.match(/^https?:\/\//)) {
          return normalized
        }
        
        // Add protocol if missing
        // For URLs that already contain the domain, just add https://
        if (normalized.includes('linkedin.com') || normalized.includes('github.com') || normalized.includes('.')) {
          return `https://${normalized}`
        }
        
        // For simple usernames, construct the full URL
        if (type === 'linkedin') {
          return `https://www.linkedin.com/in/${normalized.replace(/^\/+|\/+$/g, '')}`
        } else if (type === 'github') {
          return `https://github.com/${normalized.replace(/^\/+|\/+$/g, '')}`
        } else {
          return `https://${normalized}`
        }
      }
      
      // Get element dimensions once for coordinate conversion
      const elementRect = element.getBoundingClientRect()
      const elementWidth = elementRect.width
      const elementHeight = elementRect.height
      
      // Find contact link elements and their positions
      // Match links in order: website, linkedin, github (matching the render order in ResumePreview)
      const availableUrls: Array<{url: string | undefined, type: 'website' | 'linkedin' | 'github'}> = []
      if (selectedResume.website) {
        availableUrls.push({ url: selectedResume.website, type: 'website' })
      }
      if (selectedResume.linkedin) {
        availableUrls.push({ url: selectedResume.linkedin, type: 'linkedin' })
      }
      if (selectedResume.github) {
        availableUrls.push({ url: selectedResume.github, type: 'github' })
      }
      
      const contactLinks = Array.from(element.querySelectorAll('.contact-link')) as HTMLElement[]
      contactLinks.forEach((linkElement, index) => {
        if (index < availableUrls.length) {
          const urlInfo = availableUrls[index]
          const normalizedUrl = normalizeUrl(urlInfo.url, urlInfo.type)
          
          if (normalizedUrl) {
            const rect = linkElement.getBoundingClientRect()
            
            // Get position relative to the resume content element
            const x = rect.left - elementRect.left
            const y = rect.top - elementRect.top
            
            links.push({
              url: normalizedUrl,
              x,
              y,
              width: rect.width,
              height: rect.height
            })
          }
        }
      })
      
      // Hide page indicators and numbers during export
      element.classList.add('exporting')
      
      // Wait a moment for the DOM to update
      await new Promise(resolve => setTimeout(resolve, 50))
      
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      })
      
      // Restore page indicators and numbers
      element.classList.remove('exporting')
      
      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgWidth = 210 // A4 width in mm
      const pageHeight = 297 // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width
      
      // Calculate scale factors: PDF mm per CSS pixel
      // html2canvas with scale:2 creates a canvas 2x larger, but coordinates match CSS pixels
      const scaleX = imgWidth / elementWidth
      const scaleY = imgHeight / elementHeight
      
      // Convert CSS pixels to PDF mm
      const pxToMm = (px: number, isY: boolean = false) => {
        return isY ? (px * scaleY) : (px * scaleX)
      }
      
      // Convert link positions from CSS pixels to PDF mm
      const linkPositions = links.map(link => ({
        url: link.url,
        x: pxToMm(link.x, false),
        y: pxToMm(link.y, true),
        width: pxToMm(link.width, false),
        height: pxToMm(link.height, true)
      }))
      
      let heightLeft = imgHeight
      let position = 0
      let currentPage = 0
      
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      
      // Add links to the first page
      linkPositions.forEach(link => {
        // Check if link is visible on this page (page 0)
        if (link.y >= 0 && link.y < pageHeight) {
          pdf.link(link.x, link.y, link.width, link.height, { url: link.url })
        }
      })
      
      heightLeft -= pageHeight
      currentPage++
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        
        // Add links to this page
        // Since the image is positioned at 'position' (negative), links that are
        // at Y positions from (currentPage * pageHeight) to ((currentPage + 1) * pageHeight)
        // will be visible on this page, but their Y coordinate relative to the page top
        // is link.y - (currentPage * pageHeight)
        linkPositions.forEach(link => {
          const pageStartY = currentPage * pageHeight
          const pageEndY = (currentPage + 1) * pageHeight
          
          // Check if link is visible on this page
          if (link.y >= pageStartY && link.y < pageEndY) {
            const linkYOnPage = link.y - pageStartY
            pdf.link(link.x, linkYOnPage, link.width, link.height, { url: link.url })
          }
        })
        
        heightLeft -= pageHeight
        currentPage++
      }
      
      pdf.save(`${selectedResume.name || 'resume'}.pdf`)
    } catch (error) {
      // Make sure to remove the class even if there's an error
      if (resumeContentRef?.current) {
        resumeContentRef.current.classList.remove('exporting')
      }
      console.error('Failed to export PDF:', error)
      alert('Failed to export PDF. Please try again.')
    }
  }

  const exportToWord = async () => {
    if (!selectedResume) return

    try {
      const { Document, Packer, Paragraph, HeadingLevel, AlignmentType } = await import('docx')
      const { saveAs } = await import('file-saver')

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
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(event.target as Node)) {
        setIsExportDropdownOpen(false)
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
          <span className="selector-text">{(selectedResume?.title && selectedResume.title.trim()) || selectedResume?.name || 'Select Resume'}</span>
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
                  <span>{(resume.title && resume.title.trim()) || resume.name}</span>
                </button>
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation()
                    const displayName = (resume.title && resume.title.trim()) || resume.name
                    if (confirm(`Delete "${displayName}"?`)) {
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
          <div className="export-dropdown-container" ref={exportDropdownRef}>
            <button 
              className="export-dropdown-btn"
              onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
              disabled={viewMode !== 'preview'}
              title="Export resume"
            >
              <Download size={16} />
              <span>Export</span>
              <ChevronDown 
                size={16} 
                className={`export-chevron ${isExportDropdownOpen ? 'open' : ''}`}
              />
            </button>

            {isExportDropdownOpen && (
              <motion.div 
                className="export-dropdown"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
              >
                <button 
                  className="export-dropdown-item"
                  onClick={() => {
                    exportToPDF()
                    setIsExportDropdownOpen(false)
                  }}
                  disabled={!resumeContentRef?.current}
                >
                  <FileTextIcon size={16} />
                  <span>Export to PDF</span>
                </button>
                <button 
                  className="export-dropdown-item"
                  onClick={() => {
                    exportToWord()
                    setIsExportDropdownOpen(false)
                  }}
                >
                  <File size={16} />
                  <span>Export to Word</span>
                </button>
                <button 
                  className="export-dropdown-item"
                  onClick={() => {
                    exportToGoogleDocs()
                    setIsExportDropdownOpen(false)
                  }}
                >
                  <Download size={16} />
                  <span>Copy for Google Docs</span>
                </button>
              </motion.div>
            )}
          </div>
        )}
        <div className="view-mode-toggle">
          <button
            className={`view-mode-btn ${viewMode === 'preview' ? 'active' : ''}`}
            onClick={() => onViewModeChange('preview')}
            title="Resume Preview"
          >
            <Eye size={16} />
            <span>Preview</span>
          </button>
          <button
            className={`view-mode-btn ${viewMode === 'job-description' ? 'active' : ''}`}
            onClick={() => onViewModeChange('job-description')}
            title="Job Description"
          >
            <Briefcase size={16} />
            <span>Job Description</span>
          </button>
        </div>
        {viewMode === 'preview' && (
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
        )}
        <button 
          className={`focus-mode-btn ${isFocusMode ? 'active' : ''}`}
          onClick={() => onFocusModeChange(!isFocusMode)}
          title="Focus Mode - Hide UI for side-by-side editing"
        >
          <Focus size={18} />
        </button>
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

        .export-dropdown-container {
          position: relative;
          display: flex;
          align-items: center;
        }

        .export-dropdown-btn {
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
          height: 36px;
        }

        .export-dropdown-btn:hover:not(:disabled) {
          background: var(--bg-hover);
          border-color: var(--border-hover);
          color: var(--accent-primary);
        }

        .export-dropdown-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .export-dropdown-btn svg {
          flex-shrink: 0;
        }

        .export-chevron {
          color: var(--text-muted);
          flex-shrink: 0;
          transition: transform 150ms ease;
        }

        .export-chevron.open {
          transform: rotate(180deg);
        }

        .export-dropdown {
          position: absolute;
          top: calc(100% + 4px);
          right: 0;
          min-width: 200px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: 8px;
          box-shadow: var(--shadow-lg);
          padding: 4px;
          z-index: 1000;
        }

        .export-dropdown-item {
          width: 100%;
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

        .export-dropdown-item:hover:not(:disabled) {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .export-dropdown-item:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .export-dropdown-item svg {
          flex-shrink: 0;
        }

        .view-mode-toggle {
          display: flex;
          align-items: center;
          gap: 4px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 2px;
        }

        .view-mode-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: var(--radius-sm);
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 150ms ease;
          background: transparent;
          border: none;
          white-space: nowrap;
        }

        .view-mode-btn span {
          white-space: nowrap;
        }

        .view-mode-btn:hover {
          color: var(--text-primary);
          background: var(--bg-hover);
        }

        .view-mode-btn.active {
          background: var(--accent-primary);
          color: white;
        }

        .view-mode-btn.active:hover {
          background: var(--accent-secondary);
        }

        .view-mode-btn svg {
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

        .focus-mode-btn {
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

        .focus-mode-btn:hover {
          background: var(--bg-hover);
          border-color: var(--border-hover);
          color: var(--text-primary);
        }

        .focus-mode-btn.active {
          background: var(--accent-glow);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
        }

        .focus-mode-btn.active:hover {
          background: var(--accent-primary);
          color: white;
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
