import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FileText, X } from 'lucide-react'
import { ResumePanel } from './components/ResumePanel'
import { ResumePreview, ResumeTemplate } from './components/ResumePreview'
import { JobDescription } from './components/JobDescription'
import { Header } from './components/Header'
import { Settings, UserSettings, loadSettings } from './components/Settings'
import { ApplicationsTracker } from './components/ApplicationsTracker'
import { InsightsAgent } from './components/InsightsAgent'
import { Resume } from './types'

const API_URL = import.meta.env.VITE_API_URL || '/api'

type ViewMode = 'preview' | 'job-description'
type Page = 'resume-builder' | 'applications-tracker' | 'insights-agent'

function App() {
  const [resumes, setResumes] = useState<Resume[]>([])
  const [selectedResumeId, setSelectedResumeId] = useState<string | null>(null)
  const [selectedResume, setSelectedResume] = useState<Resume | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [leftPanelWidth, setLeftPanelWidth] = useState(50)
  const [isDragging, setIsDragging] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [userSettings, setUserSettings] = useState<UserSettings>(loadSettings)
  const [template, setTemplate] = useState<ResumeTemplate>('classic')
  const [viewMode, setViewMode] = useState<ViewMode>('preview')
  const [currentJobDescription, setCurrentJobDescription] = useState<string | null>(null)
  const resumeContentRef = useRef<HTMLDivElement>(null)
  const [showTitleModal, setShowTitleModal] = useState(false)
  const [titleInput, setTitleInput] = useState('')
  const titleInputRef = useRef<HTMLInputElement>(null)
  const [isFocusMode, setIsFocusMode] = useState(() => {
    const saved = localStorage.getItem('focus-mode')
    return saved === 'true'
  })
  const [currentPage, setCurrentPage] = useState<Page>(() => {
    const saved = localStorage.getItem('current-page')
    return (saved as Page) || 'resume-builder'
  })


  // Load template from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('resume-template')
    if (saved && (saved === 'classic' || saved === 'modern' || saved === 'minimal')) {
      setTemplate(saved as ResumeTemplate)
    }
  }, [])

  // Save focus mode to localStorage
  useEffect(() => {
    localStorage.setItem('focus-mode', String(isFocusMode))
  }, [isFocusMode])

  // Save current page to localStorage
  useEffect(() => {
    localStorage.setItem('current-page', currentPage)
  }, [currentPage])

  // Keyboard shortcut to exit focus mode (Esc key)
  useEffect(() => {
    if (!isFocusMode) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFocusMode(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isFocusMode])

  const handleTemplateChange = (newTemplate: ResumeTemplate) => {
    setTemplate(newTemplate)
    localStorage.setItem('resume-template', newTemplate)
  }

  // Fetch resumes list
  useEffect(() => {
    fetchResumes()
  }, [])

  // Fetch selected resume details
  useEffect(() => {
    if (selectedResumeId) {
      fetchResumeDetails(selectedResumeId)
    }
  }, [selectedResumeId])

  // Clear job description when switching to preview mode
  useEffect(() => {
    if (viewMode === 'preview') {
      setCurrentJobDescription(null)
    }
  }, [viewMode])

  const fetchResumes = async () => {
    try {
      const response = await fetch(`${API_URL}/resumes`)
      const data = await response.json()
      setResumes(data)
      if (data.length > 0 && !selectedResumeId) {
        setSelectedResumeId(data[0].id)
      }
    } catch (error) {
      console.error('Failed to fetch resumes:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchResumeDetails = async (id: string) => {
    try {
      // Add cache-busting timestamp to ensure fresh data
      const response = await fetch(`${API_URL}/resumes/${id}?t=${Date.now()}`, {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      if (!response.ok) {
        throw new Error(`Failed to fetch resume: ${response.status}`)
      }
      const data = await response.json()
      console.log('Fetched resume data:', data)
      setSelectedResume(data)
    } catch (error) {
      console.error('Failed to fetch resume details:', error)
      throw error
    }
  }

  const handleCreateResume = () => {
    setTitleInput('')
    setShowTitleModal(true)
  }

  const handleTitleSubmit = async () => {
    if (!titleInput.trim()) return
    
    try {
      const settings = loadSettings()
      const response = await fetch(`${API_URL}/resumes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: settings.defaultName || 'New Resume',
          title: titleInput.trim(),
          email: settings.defaultEmail || '',
          phone: settings.defaultPhone || '',
          website: settings.defaultWebsite || '',
          linkedin: settings.defaultLinkedin || '',
          github: settings.defaultGithub || '',
          summary: settings.defaultSummary || ''
        })
      })
      const newResume = await response.json()
      setResumes([newResume, ...resumes])
      setSelectedResumeId(newResume.id)
      setShowTitleModal(false)
      setTitleInput('')
    } catch (error) {
      console.error('Failed to create resume:', error)
    }
  }

  const handleTitleCancel = () => {
    setShowTitleModal(false)
    setTitleInput('')
  }

  useEffect(() => {
    if (showTitleModal && titleInputRef.current) {
      titleInputRef.current.focus()
    }
  }, [showTitleModal])

  const handleDeleteResume = async (id: string) => {
    try {
      await fetch(`${API_URL}/resumes/${id}`, {
        method: 'DELETE'
      })
      const updatedResumes = resumes.filter(r => r.id !== id)
      setResumes(updatedResumes)
      
      // If we deleted the selected resume, select another one
      if (selectedResumeId === id) {
        if (updatedResumes.length > 0) {
          setSelectedResumeId(updatedResumes[0].id)
        } else {
          setSelectedResumeId(null)
          setSelectedResume(null)
        }
      }
    } catch (error) {
      console.error('Failed to delete resume:', error)
    }
  }

  const handleResizeStart = () => {
    setIsDragging(true)
  }

  const handleResize = (e: React.MouseEvent) => {
    if (!isDragging) return
    const container = document.getElementById('main-container')
    if (!container) return
    const rect = container.getBoundingClientRect()
    const newWidth = ((e.clientX - rect.left) / rect.width) * 100
    setLeftPanelWidth(Math.min(Math.max(newWidth, 25), 75))
  }

  const handleResizeEnd = () => {
    setIsDragging(false)
  }

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleResize as unknown as EventListener)
      document.addEventListener('mouseup', handleResizeEnd)
      return () => {
        document.removeEventListener('mousemove', handleResize as unknown as EventListener)
        document.removeEventListener('mouseup', handleResizeEnd)
      }
    }
  }, [isDragging])

  if (isLoading) {
    return (
      <div className="loading-screen">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="loading-content"
        >
          <div className="loading-spinner" />
          <span>Loading SideFiller...</span>
        </motion.div>
        <style>{`
          .loading-screen {
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            background: var(--bg-primary);
          }
          .loading-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: var(--space-lg);
            color: var(--text-secondary);
          }
          .loading-spinner {
            width: 40px;
            height: 40px;
            border: 3px solid var(--border-default);
            border-top-color: var(--accent-primary);
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className="app">
      {!isFocusMode && (
        <Header 
          resumes={resumes}
          selectedResumeId={selectedResumeId}
          selectedResume={selectedResume}
          onSelectResume={setSelectedResumeId}
          onCreateResume={handleCreateResume}
          onDeleteResume={handleDeleteResume}
          onOpenSettings={() => setIsSettingsOpen(true)}
          template={template}
          onTemplateChange={handleTemplateChange}
          resumeContentRef={resumeContentRef}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          isFocusMode={isFocusMode}
          onFocusModeChange={setIsFocusMode}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
        />
      )}

      <Settings 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={setUserSettings}
      />

      <AnimatePresence>
        {showTitleModal && (
          <motion.div
            className="title-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleTitleCancel}
          >
            <motion.div
              className="title-modal"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="title-modal-header">
                <div className="title-modal-title">
                  <FileText size={20} />
                  <h2>Create New Resume</h2>
                </div>
                <button className="title-modal-close" onClick={handleTitleCancel}>
                  <X size={18} />
                </button>
              </div>

              <div className="title-modal-content">
                <label htmlFor="resume-title-input">Resume Title</label>
                <p className="title-modal-description">
                  Give your resume a unique title to easily identify it in the dropdown
                </p>
                <input
                  id="resume-title-input"
                  ref={titleInputRef}
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleTitleSubmit()
                    } else if (e.key === 'Escape') {
                      handleTitleCancel()
                    }
                  }}
                  placeholder="e.g., Software Engineer Resume, Marketing Manager CV"
                  autoFocus
                />
              </div>

              <div className="title-modal-footer">
                <button className="btn-cancel" onClick={handleTitleCancel}>
                  Cancel
                </button>
                <button 
                  className="btn-create" 
                  onClick={handleTitleSubmit}
                  disabled={!titleInput.trim()}
                >
                  Create Resume
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <main 
        id="main-container"
        className={`main-container ${isFocusMode ? 'focus-mode' : ''}`}
        style={{ cursor: isDragging ? 'col-resize' : 'default' }}
      >
        <AnimatePresence mode="wait">
          {currentPage === 'resume-builder' ? (
            <>
              <motion.div 
                key="resume-builder-left"
                className="panel left-panel"
                style={{ width: isFocusMode ? '100%' : `${leftPanelWidth}%` }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ResumePanel 
                  resume={selectedResume}
                  onUpdate={fetchResumeDetails}
                  apiUrl={API_URL}
                  jobDescription={currentJobDescription}
                />
              </motion.div>

              {!isFocusMode && (
                <>
                  <div 
                    className={`resize-handle ${isDragging ? 'active' : ''}`}
                    onMouseDown={handleResizeStart}
                  >
                    <div className="resize-indicator" />
                  </div>

                  <motion.div 
                    key="resume-builder-right"
                    className="panel right-panel"
                    style={{ width: `${100 - leftPanelWidth}%` }}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  >
                    <AnimatePresence mode="wait">
                      {viewMode === 'preview' ? (
                        <motion.div
                          key="preview"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ height: '100%' }}
                        >
                          <ResumePreview 
                            resume={selectedResume} 
                            template={template} 
                            resumeContentRef={resumeContentRef}
                            apiUrl={API_URL}
                            onUpdate={fetchResumeDetails}
                          />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="job-description"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
                        >
                          <JobDescription 
                            resumeId={selectedResumeId}
                            onJobDescriptionChange={setCurrentJobDescription}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                </>
              )}
            </>
          ) : currentPage === 'applications-tracker' ? (
            <motion.div
              key="applications-tracker"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ width: '100%', height: '100%' }}
            >
              <ApplicationsTracker />
            </motion.div>
          ) : currentPage === 'insights-agent' ? (
            <motion.div
              key="insights-agent"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ width: '100%', height: '100%' }}
            >
              <InsightsAgent />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {isFocusMode && (
        <motion.button
          className="exit-focus-mode-btn"
          onClick={() => setIsFocusMode(false)}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          title="Exit Focus Mode (Press Esc)"
        >
          <X size={18} />
          <span>Exit Focus Mode</span>
        </motion.button>
      )}

      <style>{`
        .app {
          height: 100vh;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary);
          overflow: hidden;
        }
        
        .main-container {
          flex: 1;
          display: flex;
          overflow: hidden;
          position: relative;
        }
        
        .panel {
          height: 100%;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          min-height: 0;
        }
        
        .left-panel {
          background: var(--bg-secondary);
          border-right: 1px solid var(--border-subtle);
        }
        
        .right-panel {
          background: var(--bg-primary);
        }
        
        .resize-handle {
          width: 6px;
          cursor: col-resize;
          background: transparent;
          position: relative;
          z-index: 10;
          transition: background var(--transition-fast);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .resize-handle:hover,
        .resize-handle.active {
          background: var(--accent-glow);
        }
        
        .resize-indicator {
          width: 2px;
          height: 48px;
          background: var(--border-default);
          border-radius: var(--radius-full);
          transition: all var(--transition-fast);
        }
        
        .resize-handle:hover .resize-indicator,
        .resize-handle.active .resize-indicator {
          height: 64px;
          background: var(--accent-primary);
          box-shadow: 0 0 12px var(--accent-glow);
        }

        .title-modal-overlay {
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

        .title-modal {
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: 16px;
          width: 100%;
          max-width: 480px;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
          display: flex;
          flex-direction: column;
        }

        .title-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border-subtle);
        }

        .title-modal-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .title-modal-title h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .title-modal-title svg {
          color: var(--accent-primary);
          flex-shrink: 0;
        }

        .title-modal-close {
          padding: 8px;
          border-radius: 8px;
          color: var(--text-muted);
          background: transparent;
          border: none;
          cursor: pointer;
          transition: all 150ms ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .title-modal-close:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .title-modal-content {
          padding: 24px;
        }

        .title-modal-content label {
          display: block;
          font-size: 0.875rem;
          font-weight: 500;
          color: var(--text-secondary);
          margin-bottom: 8px;
        }

        .title-modal-description {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin-bottom: 16px;
          line-height: 1.5;
        }

        .title-modal-content input {
          width: 100%;
          padding: 12px 14px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 0.9rem;
          transition: all 150ms ease;
          font-family: inherit;
        }

        .title-modal-content input:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .title-modal-content input::placeholder {
          color: var(--text-muted);
        }

        .title-modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid var(--border-subtle);
        }

        .btn-cancel,
        .btn-create {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          border-radius: 8px;
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 150ms ease;
          border: none;
          font-family: inherit;
        }

        .btn-cancel {
          background: var(--bg-tertiary);
          color: var(--text-secondary);
        }

        .btn-cancel:hover {
          background: var(--bg-hover);
          color: var(--text-primary);
        }

        .btn-create {
          background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
          color: white;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        }

        .btn-create:hover:not(:disabled) {
          box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
        }

        .btn-create:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .main-container.focus-mode {
          height: 100vh;
        }

        .exit-focus-mode-btn {
          position: fixed;
          top: 20px;
          right: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 16px;
          background: var(--bg-elevated);
          border: 1px solid var(--border-default);
          border-radius: 8px;
          color: var(--text-primary);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          transition: all 150ms ease;
        }

        .exit-focus-mode-btn:hover {
          background: var(--bg-hover);
          border-color: var(--accent-primary);
          color: var(--accent-primary);
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.2);
        }

        .exit-focus-mode-btn svg {
          flex-shrink: 0;
        }
      `}</style>
    </div>
  )
}

export default App

