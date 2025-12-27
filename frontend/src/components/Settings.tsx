import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Mail, Phone, Globe, Linkedin, Github, Save, Palette } from 'lucide-react'

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

export function Settings({ isOpen, onClose, onSave }: SettingsProps) {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [themeColor, setThemeColor] = useState<string>('#6366f1')

  useEffect(() => {
    if (isOpen) {
      setSettings(loadSettings())
      setThemeColor(loadThemeColor())
    }
  }, [isOpen])

  const handleSave = () => {
    saveSettings(settings)
    saveThemeColor(themeColor)
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
              max-width: 500px;
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
            .form-group textarea {
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
            .form-group textarea:focus {
              outline: none;
              border-color: var(--accent-primary);
              box-shadow: 0 0 0 3px var(--accent-glow);
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

