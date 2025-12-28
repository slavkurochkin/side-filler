import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Mail, Phone, Globe, Linkedin, Github, Save, Palette, Key } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export interface UserSettings {
  defaultName: string
  defaultEmail: string
  defaultPhone: string
  defaultWebsite: string
  defaultLinkedin: string
  defaultGithub: string
  defaultSummary: string
}

const DEFAULT_SETTINGS: UserSettings = {
  defaultName: '',
  defaultEmail: '',
  defaultPhone: '',
  defaultWebsite: '',
  defaultLinkedin: '',
  defaultGithub: '',
  defaultSummary: ''
}

interface SettingsProps {
  isOpen: boolean
  onClose: () => void
  onSave: (settings: UserSettings) => void
}

export function loadSettings(): UserSettings {
  try {
    const stored = localStorage.getItem('sidefiller-settings')
    if (stored) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
    }
  } catch (e) {
    console.error('Failed to load settings:', e)
  }
  return DEFAULT_SETTINGS
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem('sidefiller-settings', JSON.stringify(settings))
  } catch (e) {
    console.error('Failed to save settings:', e)
  }
}

export function loadThemeColor(): string {
  try {
    const stored = localStorage.getItem('resume-theme-color')
    return stored || '#6366f1'
  } catch (e) {
    console.error('Failed to load theme color:', e)
    return '#6366f1'
  }
}

export function saveThemeColor(color: string): void {
  try {
    localStorage.setItem('resume-theme-color', color)
    // Update CSS variable
    document.documentElement.style.setProperty('--resume-accent-color', color)
  } catch (e) {
    console.error('Failed to save theme color:', e)
  }
}

export type SkillsDisplayMode = 'badges' | 'bullets'

export function loadSkillsDisplayMode(): SkillsDisplayMode {
  try {
    const stored = localStorage.getItem('skills-display-mode')
    return (stored === 'badges' || stored === 'bullets') ? stored : 'badges'
  } catch (e) {
    console.error('Failed to load skills display mode:', e)
    return 'badges'
  }
}

export function saveSkillsDisplayMode(mode: SkillsDisplayMode): void {
  try {
    localStorage.setItem('skills-display-mode', mode)
  } catch (e) {
    console.error('Failed to save skills display mode:', e)
  }
}

export function Settings({ isOpen, onClose, onSave }: SettingsProps) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [themeColor, setThemeColor] = useState<string>('#6366f1')
  const [skillsDisplayMode, setSkillsDisplayMode] = useState<SkillsDisplayMode>('badges')
  const [openaiKey, setOpenaiKey] = useState<string>('')
  const [originalOpenaiKey, setOriginalOpenaiKey] = useState<string>('')
  const [openaiModel, setOpenaiModel] = useState<string>('gpt-4o-mini')
  const [isLoadingKey, setIsLoadingKey] = useState(false)
  const [isKeyFocused, setIsKeyFocused] = useState(false)
  
  const OPENAI_MODELS = [
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini (Fast & Cost-effective)' },
    { value: 'gpt-4o', label: 'GPT-4o (Recommended)' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-4', label: 'GPT-4' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo (Legacy)' },
  ]

  useEffect(() => {
    if (isOpen) {
      setSettings(loadSettings())
      setThemeColor(loadThemeColor())
      setSkillsDisplayMode(loadSkillsDisplayMode())
      fetchOpenAIKey()
      fetchOpenAIModel()
    }
  }, [isOpen])

  const fetchOpenAIKey = async () => {
    setIsLoadingKey(true)
    try {
      const response = await fetch(`${API_URL}/settings/openai_api_key`)
      if (response.ok) {
        const data = await response.json()
        const keyValue = data.value || ''
        setOpenaiKey(keyValue)
        setOriginalOpenaiKey(keyValue)
      } else if (response.status === 404) {
        // Key doesn't exist yet, that's fine
        setOpenaiKey('')
        setOriginalOpenaiKey('')
      }
    } catch (error) {
      console.error('Failed to fetch OpenAI key:', error)
      setOpenaiKey('')
      setOriginalOpenaiKey('')
    } finally {
      setIsLoadingKey(false)
    }
  }

  const fetchOpenAIModel = async () => {
    try {
      const response = await fetch(`${API_URL}/settings/openai_model`)
      if (response.ok) {
        const data = await response.json()
        setOpenaiModel(data.value || 'gpt-4o-mini')
      } else if (response.status === 404) {
        // Model doesn't exist yet, use default
        setOpenaiModel('gpt-4o-mini')
      }
    } catch (error) {
      console.error('Failed to fetch OpenAI model:', error)
      setOpenaiModel('gpt-4o-mini')
    }
  }

  const getDisplayValue = () => {
    if (isLoadingKey) return ''
    if (isKeyFocused || openaiKey === '') {
      // Show actual value when focused or empty
      return openaiKey
    }
    if (originalOpenaiKey && openaiKey === originalOpenaiKey && originalOpenaiKey.length > 4) {
      // Show masked value with last 4 characters when not focused and unchanged
      const last4 = originalOpenaiKey.slice(-4)
      return '•'.repeat(Math.max(0, originalOpenaiKey.length - 4)) + last4
    }
    // Show actual value when user has changed it or key is too short
    return openaiKey
  }
  
  const handleKeyFocus = () => {
    setIsKeyFocused(true)
    // When focusing, if the key hasn't been changed, ensure we show the original value
    if (openaiKey === originalOpenaiKey && originalOpenaiKey) {
      setOpenaiKey(originalOpenaiKey)
    }
  }

  const handleSave = async () => {
    saveSettings(settings)
    saveThemeColor(themeColor)
    saveSkillsDisplayMode(skillsDisplayMode)
    
    // Save OpenAI key and model to backend
    try {
      await Promise.all([
        fetch(`${API_URL}/settings/openai_api_key`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: openaiKey })
        }),
        fetch(`${API_URL}/settings/openai_model`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value: openaiModel })
        })
      ])
    } catch (error) {
      console.error('Failed to save OpenAI settings:', error)
    }
    
    onSave(settings)
    onClose()
  }

  const updateField = (field: keyof UserSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          className="settings-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div 
            className="settings-modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            onClick={e => e.stopPropagation()}
          >
            <div className="settings-header">
              <h2>Settings</h2>
              <button className="close-btn" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            <div className="settings-content">
              <div className="settings-section">
                <h3>Default Profile Information</h3>
                <p className="section-desc">
                  These values will be pre-filled when creating new resumes
                </p>

                <div className="form-group">
                  <label>
                    <User size={16} />
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={settings.defaultName}
                    onChange={e => updateField('defaultName', e.target.value)}
                    placeholder="John Doe"
                  />
                </div>

                <div className="form-group">
                  <label>
                    <Mail size={16} />
                    Email
                  </label>
                  <input
                    type="email"
                    value={settings.defaultEmail}
                    onChange={e => updateField('defaultEmail', e.target.value)}
                    placeholder="john@example.com"
                  />
                </div>

                <div className="form-group">
                  <label>
                    <Phone size={16} />
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={settings.defaultPhone}
                    onChange={e => updateField('defaultPhone', e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>

                <div className="form-group">
                  <label>
                    <Globe size={16} />
                    Website
                  </label>
                  <input
                    type="url"
                    value={settings.defaultWebsite}
                    onChange={e => updateField('defaultWebsite', e.target.value)}
                    placeholder="https://yourwebsite.com"
                  />
                </div>

                <div className="form-group">
                  <label>
                    <Linkedin size={16} />
                    LinkedIn
                  </label>
                  <input
                    type="url"
                    value={settings.defaultLinkedin}
                    onChange={e => updateField('defaultLinkedin', e.target.value)}
                    placeholder="https://linkedin.com/in/yourprofile"
                  />
                </div>

                <div className="form-group">
                  <label>
                    <Github size={16} />
                    GitHub
                  </label>
                  <input
                    type="url"
                    value={settings.defaultGithub}
                    onChange={e => updateField('defaultGithub', e.target.value)}
                    placeholder="https://github.com/yourusername"
                  />
                </div>

                <div className="form-group">
                  <label>
                    Default Summary
                  </label>
                  <textarea
                    value={settings.defaultSummary}
                    onChange={e => updateField('defaultSummary', e.target.value)}
                    placeholder="A brief professional summary..."
                    rows={3}
                  />
                </div>
              </div>

              <div className="settings-section">
                <h3>
                  <Key size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                  API Configuration
                </h3>
                <p className="section-desc">
                  Configure API keys for AI-powered features
                </p>

                <div className="form-group">
                  <label>
                    <Key size={16} />
                    OpenAI API Key
                  </label>
                  <input
                    type="text"
                    value={getDisplayValue()}
                    onChange={e => setOpenaiKey(e.target.value)}
                    onFocus={handleKeyFocus}
                    onBlur={() => setIsKeyFocused(false)}
                    placeholder={isLoadingKey ? 'Loading...' : 'sk-...'}
                    disabled={isLoadingKey}
                  />
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
                    Your API key is stored securely in the database and used for Langchain services
                  </p>
                </div>

                <div className="form-group">
                  <label>
                    OpenAI Model
                  </label>
                  <select
                    value={openaiModel}
                    onChange={e => setOpenaiModel(e.target.value)}
                  >
                    {OPENAI_MODELS.map(model => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </select>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: 0 }}>
                    Choose the OpenAI model to use for AI-powered features. GPT-4o Mini is fastest and most cost-effective.
                  </p>
                </div>
              </div>

              <div className="settings-section">
                <h3>
                  <Palette size={16} style={{ display: 'inline', marginRight: '8px', verticalAlign: 'middle' }} />
                  Resume Theme Color
                </h3>
                <p className="section-desc">
                  Choose the accent color used in your resume preview
                </p>

                <div className="form-group">
                  <label>
                    Theme Color
                  </label>
                  <div className="color-picker-container">
                    <input
                      type="color"
                      value={themeColor}
                      onChange={e => {
                        setThemeColor(e.target.value)
                        saveThemeColor(e.target.value)
                      }}
                      className="color-picker"
                    />
                    <input
                      type="text"
                      value={themeColor}
                      onChange={e => {
                        const color = e.target.value
                        if (/^#[0-9A-F]{6}$/i.test(color)) {
                          setThemeColor(color)
                          saveThemeColor(color)
                        }
                      }}
                      className="color-input"
                      placeholder="#6366f1"
                    />
                  </div>
                  <div className="color-presets">
                    {[
                      { name: 'Purple', value: '#6366f1' },
                      { name: 'Blue', value: '#3b82f6' },
                      { name: 'Green', value: '#10b981' },
                      { name: 'Red', value: '#ef4444' },
                      { name: 'Orange', value: '#f59e0b' },
                      { name: 'Teal', value: '#14b8a6' },
                      { name: 'Indigo', value: '#6366f1' },
                      { name: 'Pink', value: '#ec4899' }
                    ].map(preset => (
                      <button
                        key={preset.value}
                        className={`color-preset ${themeColor === preset.value ? 'active' : ''}`}
                        onClick={() => {
                          setThemeColor(preset.value)
                          saveThemeColor(preset.value)
                        }}
                        style={{ backgroundColor: preset.value }}
                        title={preset.name}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="settings-section">
                <h3>Skills Display Mode</h3>
                <p className="section-desc">
                  Choose how skills are displayed in the resume preview
                </p>

                <div className="form-group">
                  <label>
                    Display Format
                  </label>
                  <div className="toggle-group">
                    <button
                      className={`toggle-option ${skillsDisplayMode === 'badges' ? 'active' : ''}`}
                      onClick={() => {
                        setSkillsDisplayMode('badges')
                        saveSkillsDisplayMode('badges')
                      }}
                    >
                      Badge Labels
                    </button>
                    <button
                      className={`toggle-option ${skillsDisplayMode === 'bullets' ? 'active' : ''}`}
                      onClick={() => {
                        setSkillsDisplayMode('bullets')
                        saveSkillsDisplayMode('bullets')
                      }}
                    >
                      3 Column Bullets
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="settings-footer">
              <button className="btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button className="btn-save" onClick={handleSave}>
                <Save size={16} />
                Save Settings
              </button>
            </div>
          </motion.div>

          <style>{`
            .settings-overlay {
              position: fixed;
              inset: 0;
              background: rgba(0, 0, 0, 0.7);
              backdrop-filter: blur(4px);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 1000;
              padding: 20px;
            }

            .settings-modal {
              background: var(--bg-elevated);
              border: 1px solid var(--border-default);
              border-radius: 16px;
              width: 100%;
              max-width: 600px;
              max-height: 90vh;
              display: flex;
              flex-direction: column;
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
            }

            .settings-header {
              display: flex;
              align-items: center;
              justify-content: space-between;
              padding: 20px 24px;
              border-bottom: 1px solid var(--border-subtle);
            }

            .settings-header h2 {
              font-size: 1.25rem;
              font-weight: 600;
              color: var(--text-primary);
            }

            .close-btn {
              padding: 8px;
              border-radius: 8px;
              color: var(--text-muted);
              background: transparent;
              border: none;
              cursor: pointer;
              transition: all 150ms ease;
            }

            .close-btn:hover {
              background: var(--bg-hover);
              color: var(--text-primary);
            }

            .settings-content {
              flex: 1;
              overflow-y: auto;
              padding: 24px;
            }

            .settings-section h3 {
              font-size: 0.9rem;
              font-weight: 600;
              color: var(--text-primary);
              margin-bottom: 4px;
            }

            .section-desc {
              font-size: 0.8rem;
              color: var(--text-muted);
              margin-bottom: 20px;
            }

            .form-group {
              margin-bottom: 16px;
            }

            .form-group label {
              display: flex;
              align-items: center;
              gap: 8px;
              font-size: 0.8rem;
              font-weight: 500;
              color: var(--text-secondary);
              margin-bottom: 6px;
            }

            .form-group input,
            .form-group textarea,
            .form-group select {
              width: 100%;
              padding: 10px 12px;
              background: var(--bg-tertiary);
              border: 1px solid var(--border-default);
              border-radius: 8px;
              color: var(--text-primary);
              font-size: 0.9rem;
              transition: all 150ms ease;
            }

            .form-group input:focus,
            .form-group textarea:focus,
            .form-group select:focus {
              outline: none;
              border-color: var(--accent-primary);
              box-shadow: 0 0 0 3px var(--accent-glow);
            }

            .form-group select {
              cursor: pointer;
              appearance: none;
              background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%236366f1' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
              background-repeat: no-repeat;
              background-position: right 12px center;
              padding-right: 36px;
            }

            .form-group input::placeholder,
            .form-group textarea::placeholder {
              color: var(--text-muted);
            }

            .color-picker-container {
              display: flex;
              gap: 10px;
              align-items: center;
            }

            .color-picker {
              width: 60px;
              height: 40px;
              border: 1px solid var(--border-default);
              border-radius: 8px;
              cursor: pointer;
              background: transparent;
              padding: 0;
            }

            .color-picker::-webkit-color-swatch-wrapper {
              padding: 0;
            }

            .color-picker::-webkit-color-swatch {
              border: none;
              border-radius: 6px;
            }

            .color-input {
              flex: 1;
              font-family: monospace;
            }

            .color-presets {
              display: flex;
              gap: 8px;
              margin-top: 12px;
              flex-wrap: wrap;
            }

            .color-preset {
              width: 32px;
              height: 32px;
              border-radius: 6px;
              border: 2px solid transparent;
              cursor: pointer;
              transition: all 150ms ease;
              padding: 0;
            }

            .color-preset:hover {
              transform: scale(1.1);
              border-color: var(--text-primary);
            }

            .color-preset.active {
              border-color: var(--text-primary);
              box-shadow: 0 0 0 2px var(--bg-primary), 0 0 0 4px var(--text-primary);
            }

            .form-group textarea {
              resize: vertical;
              min-height: 80px;
            }

            .toggle-group {
              display: flex;
              gap: 8px;
            }

            .toggle-option {
              flex: 1;
              padding: 10px 16px;
              background: var(--bg-tertiary);
              border: 1px solid var(--border-default);
              border-radius: 8px;
              color: var(--text-secondary);
              font-size: 0.875rem;
              font-weight: 500;
              cursor: pointer;
              transition: all 150ms ease;
            }

            .toggle-option:hover {
              background: var(--bg-hover);
              border-color: var(--border-hover);
              color: var(--text-primary);
            }

            .toggle-option.active {
              background: var(--accent-glow);
              border-color: var(--accent-primary);
              color: var(--accent-primary);
            }

            .settings-footer {
              display: flex;
              justify-content: flex-end;
              gap: 12px;
              padding: 16px 24px;
              border-top: 1px solid var(--border-subtle);
            }

            .btn-cancel,
            .btn-save {
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
              background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%);
              color: white;
              box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
            }

            .btn-save:hover {
              box-shadow: 0 4px 16px rgba(99, 102, 241, 0.4);
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

