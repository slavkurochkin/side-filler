import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ResumePanel } from './components/ResumePanel'
import { ResumePreview, ResumeTemplate } from './components/ResumePreview'
import { Header } from './components/Header'
import { Settings, UserSettings, loadSettings } from './components/Settings'
import { Resume } from './types'

const API_URL = import.meta.env.VITE_API_URL || '/api'

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
  const resumeContentRef = useRef<HTMLDivElement>(null)

  // Load template from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('resume-template')
    if (saved && (saved === 'classic' || saved === 'modern' || saved === 'minimal')) {
      setTemplate(saved as ResumeTemplate)
    }
  }, [])

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
      const response = await fetch(`${API_URL}/resumes/${id}`)
      const data = await response.json()
      setSelectedResume(data)
    } catch (error) {
      console.error('Failed to fetch resume details:', error)
    }
  }

  const handleCreateResume = async () => {
    try {
      const settings = loadSettings()
      const response = await fetch(`${API_URL}/resumes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: settings.defaultName || 'New Resume',
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
    } catch (error) {
      console.error('Failed to create resume:', error)
    }
  }

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
      />

      <Settings 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSave={setUserSettings}
      />
      
      <main 
        id="main-container"
        className="main-container"
        style={{ cursor: isDragging ? 'col-resize' : 'default' }}
      >
        <AnimatePresence mode="wait">
          <motion.div 
            className="panel left-panel"
            style={{ width: `${leftPanelWidth}%` }}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <ResumePanel 
              resume={selectedResume}
              onUpdate={fetchResumeDetails}
              apiUrl={API_URL}
            />
          </motion.div>
        </AnimatePresence>

        <div 
          className={`resize-handle ${isDragging ? 'active' : ''}`}
          onMouseDown={handleResizeStart}
        >
          <div className="resize-indicator" />
        </div>

        <motion.div 
          className="panel right-panel"
          style={{ width: `${100 - leftPanelWidth}%` }}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <ResumePreview resume={selectedResume} template={template} resumeContentRef={resumeContentRef} />
        </motion.div>
      </main>

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
      `}</style>
    </div>
  )
}

export default App

