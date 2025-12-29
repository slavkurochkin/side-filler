import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Loader2, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Application } from '../types'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

interface InterviewPreparationSuggestion {
  id: string
  application_id: string
  current_stage: string
  interview_type: string | null
  suggestion_text: string
  created_at: string
  updated_at: string
}

interface InterviewPreparationProps {
  application: Application
  onClose?: () => void
}

export function InterviewPreparation({ application, onClose }: InterviewPreparationProps) {
  const [suggestion, setSuggestion] = useState<InterviewPreparationSuggestion | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [customPrompt, setCustomPrompt] = useState('')

  // Check if job description exists
  const hasJobDescription = !!application.job_description_id

  // Fetch existing suggestion on mount
  useEffect(() => {
    if (application.id) {
      fetchSuggestion()
    }
  }, [application.id])

  const fetchSuggestion = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const response = await fetch(`${API_URL}/ai/interview-preparation/${application.id}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to fetch suggestion')
      }
      
      const data = await response.json()
      // Backend returns null when no suggestion exists (instead of 404)
      setSuggestion(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch suggestion')
    } finally {
      setIsLoading(false)
    }
  }

  const generateSuggestion = async () => {
    if (!hasJobDescription) {
      setError('Job description is required. Please attach a job description to this application first.')
      return
    }

    try {
      setIsGenerating(true)
      setError(null)
      
      const response = await fetch(`${API_URL}/ai/interview-preparation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId: application.id,
          customPrompt: customPrompt.trim() || undefined,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to generate suggestion')
      }

      const data = await response.json()
      setSuggestion(data.suggestion)
      setCustomPrompt('') // Clear custom prompt after successful generation
      setIsExpanded(true) // Auto-expand to show the new suggestion
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate suggestion')
    } finally {
      setIsGenerating(false)
    }
  }

  // Helper function to render text with bold formatting
  const renderBoldText = (text: string): React.ReactNode[] => {
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    const boldRegex = /\*\*(.+?)\*\*/g
    let match

    while ((match = boldRegex.exec(text)) !== null) {
      // Add text before the bold section
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index))
      }
      // Add the bold text
      parts.push(
        <strong key={match.index} style={{ fontWeight: 600, color: '#f8fafc' }}>
          {match[1]}
        </strong>
      )
      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex))
    }

    return parts.length > 0 ? parts : [text]
  }

  // Format the suggestion text with proper line breaks
  const formatSuggestionText = (text: string) => {
    // Convert all bullet points (*, •) to dashes
    let normalizedText = text.replace(/^(\s*)[\*•](\s+)/gm, '$1-$2')
    
    // Split by double newlines for paragraphs
    const paragraphs = normalizedText.split(/\n\s*\n/).filter(p => p.trim())
    return paragraphs.map((paragraph, index) => {
      // Check if paragraph starts with a markdown-style header
      const headerMatch = paragraph.match(/^(#{1,6})\s+(.+)$/m)
      if (headerMatch) {
        const level = headerMatch[1].length
        const content = headerMatch[2]
        const HeaderTag = `h${Math.min(level + 1, 6)}` as keyof JSX.IntrinsicElements
        return (
          <HeaderTag key={index} style={{ 
            marginTop: index > 0 ? '1.5rem' : '0',
            marginBottom: '0.75rem',
            fontWeight: 600,
            fontSize: level === 1 ? '1.25rem' : level === 2 ? '1.1rem' : '1rem',
            color: '#f8fafc'
          }}>
            {renderBoldText(content)}
          </HeaderTag>
        )
      }
      
      // Check if paragraph is a list item (only dashes now, or numbered)
      if (paragraph.match(/^[\d\-]\s+/m)) {
        const lines = paragraph.split('\n').filter(l => l.trim())
        return (
          <ul key={index} style={{ marginTop: index > 0 ? '1rem' : '0', paddingLeft: '1.5rem', color: '#f8fafc', listStyle: 'none' }}>
            {lines.map((line, lineIndex) => {
              // Remove list markers (numbers or dashes) - all will be rendered as dashes
              const cleanLine = line.replace(/^[\d\-]\s+/, '').trim()
              return (
                <li key={lineIndex} style={{ marginBottom: '0.5rem', color: '#f8fafc' }}>
                  {renderBoldText(cleanLine)}
                </li>
              )
            })}
          </ul>
        )
      }
      
      // Regular paragraph
      return (
        <p key={index} style={{ 
          marginTop: index > 0 ? '1rem' : '0',
          marginBottom: '0.5rem',
          lineHeight: '1.6',
          color: '#f8fafc'
        }}>
          {paragraph.split('\n').map((line, lineIndex, array) => (
            <React.Fragment key={lineIndex}>
              {renderBoldText(line)}
              {lineIndex < array.length - 1 && <br />}
            </React.Fragment>
          ))}
        </p>
      )
    })
  }

  if (!hasJobDescription && !suggestion) {
    return (
      <div className="interview-preparation-container">
        <div className="interview-prep-header">
          <Sparkles size={16} />
          <span>Interview Preparation</span>
        </div>
        <div className="interview-prep-message">
          <p>Attach a job description to this application to get AI-powered interview preparation suggestions.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="interview-preparation-container">
      <div className="interview-prep-header">
        <Sparkles size={16} />
        <span>Interview Preparation</span>
        {onClose && (
          <button className="close-btn" onClick={onClose} title="Close">
            <X size={14} />
          </button>
        )}
      </div>

      {error && (
        <div className="interview-prep-error">
          <p>{error}</p>
        </div>
      )}

      {isLoading && !suggestion && (
        <div className="interview-prep-loading">
          <Loader2 size={16} className="spinner" />
          <span>Loading suggestion...</span>
        </div>
      )}

      {!suggestion && !isLoading && (
        <div className="interview-prep-empty">
          <p>No preparation suggestions yet. Generate one based on your current stage in the application timeline.</p>
          
          {hasJobDescription && (
            <>
              <div className="custom-prompt-section">
                <label htmlFor="custom-prompt">Additional context (optional):</label>
                <textarea
                  id="custom-prompt"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  placeholder="e.g., I'm particularly nervous about system design questions..."
                  rows={3}
                />
              </div>
              
              <button
                className="generate-suggestion-btn"
                onClick={generateSuggestion}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} className="spinner" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles size={16} />
                    Generate Preparation Suggestions
                  </>
                )}
              </button>
            </>
          )}
        </div>
      )}

      {suggestion && (
        <div className="interview-prep-content">
          <div className="suggestion-meta">
            <span className="stage-badge">
              Stage: {suggestion.current_stage.replace('_', ' ')}
            </span>
            {suggestion.interview_type && (
              <span className="interview-type-badge">
                {suggestion.interview_type.replace('_', ' ')}
              </span>
            )}
            <span className="suggestion-date">
              Generated: {new Date(suggestion.created_at).toLocaleDateString()}
            </span>
          </div>

          <button
            className="expand-toggle-btn"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            <span>{isExpanded ? 'Collapse' : 'Expand'} Suggestion</span>
          </button>

          <AnimatePresence>
            {isExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ 
                  overflow: 'hidden',
                  backgroundColor: 'transparent',
                  background: 'transparent'
                }}
              >
                <div
                  className="interview-prep-suggestion-content-dark"
                  style={{ 
                    backgroundColor: '#22222f',
                    background: '#22222f',
                    backgroundImage: 'none',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    padding: '1rem',
                    marginBottom: '1rem',
                    color: '#f8fafc',
                    display: 'block',
                    position: 'relative',
                    transform: 'translateZ(0)',
                    willChange: 'background-color'
                  } as React.CSSProperties}
                >
                  <div style={{ color: '#f8fafc', backgroundColor: 'transparent' } as React.CSSProperties}>
                    {formatSuggestionText(suggestion.suggestion_text)}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="suggestion-actions">
            <button
              className="regenerate-btn"
              onClick={generateSuggestion}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={14} className="spinner" />
                  Regenerating...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Regenerate
                </>
              )}
            </button>
          </div>
        </div>
      )}

      <style>{`
        /* Interview Preparation Styles - Cache busted */
        .interview-preparation-container {
          background: var(--bg-tertiary) !important;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          padding: 1rem;
          margin-top: 1rem;
        }
        
        .interview-preparation-container * {
          box-sizing: border-box;
        }

        .interview-prep-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .interview-prep-header .close-btn {
          margin-left: auto;
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          display: flex;
          align-items: center;
          color: var(--text-secondary);
          opacity: 0.7;
          transition: opacity 0.2s;
        }

        .interview-prep-header .close-btn:hover {
          opacity: 1;
          color: var(--text-primary);
        }

        .interview-prep-message,
        .interview-prep-empty {
          color: var(--text-secondary);
          font-size: 0.9rem;
          line-height: 1.5;
        }

        .interview-prep-error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
          border-radius: var(--radius-sm);
          padding: 0.75rem;
          margin-bottom: 1rem;
          color: var(--accent-danger);
          font-size: 0.9rem;
        }

        .interview-prep-loading {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-secondary);
          font-size: 0.9rem;
        }

        .custom-prompt-section {
          margin: 1rem 0;
        }

        .custom-prompt-section label {
          display: block;
          margin-bottom: 0.5rem;
          font-size: 0.9rem;
          color: var(--text-primary);
          font-weight: 500;
        }

        .custom-prompt-section textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--border-default);
          border-radius: var(--radius-sm);
          font-size: 0.9rem;
          font-family: inherit;
          resize: vertical;
          background: var(--bg-elevated);
          color: var(--text-primary);
        }

        .custom-prompt-section textarea:focus {
          outline: none;
          border-color: var(--accent-primary);
        }

        .generate-suggestion-btn,
        .regenerate-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.75rem 1rem;
          background: var(--accent-primary);
          color: white;
          border: none;
          border-radius: var(--radius-sm);
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all var(--transition-fast);
          margin-top: 0.5rem;
        }

        .generate-suggestion-btn:hover:not(:disabled),
        .regenerate-btn:hover:not(:disabled) {
          background: var(--accent-secondary);
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }

        .generate-suggestion-btn:disabled,
        .regenerate-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .interview-prep-content {
          margin-top: 1rem;
        }

        .suggestion-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          font-size: 0.85rem;
        }

        .stage-badge,
        .interview-type-badge {
          padding: 0.25rem 0.5rem;
          background: var(--accent-glow);
          color: var(--accent-primary);
          border-radius: var(--radius-sm);
          font-weight: 500;
        }

        .interview-type-badge {
          background: rgba(139, 92, 246, 0.15);
          color: rgb(139, 92, 246);
        }

        .suggestion-date {
          color: var(--text-secondary);
          margin-left: auto;
        }

        .expand-toggle-btn {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          background: none;
          border: none;
          cursor: pointer;
          color: var(--text-secondary);
          font-size: 0.9rem;
          padding: 0.5rem 0;
          margin-bottom: 0.5rem;
          transition: color var(--transition-fast);
        }

        .expand-toggle-btn:hover {
          color: var(--text-primary);
        }

        /* CRITICAL: Override any .suggestion-text rules that might set white background */
        /* This must come first to override any global or cached CSS rules */
        .interview-preparation-container .suggestion-text,
        .interview-preparation-container div.suggestion-text,
        .interview-prep-content .suggestion-text,
        .interview-prep-content div.suggestion-text,
        .suggestion-text {
          background: #22222f !important;
          background-color: #22222f !important;
          background-image: none !important;
          color: #f8fafc !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 6px !important;
          padding: 1rem !important;
          margin-bottom: 1rem !important;
          line-height: 1.6 !important;
        }

        /* Use unique class name to avoid any conflicts */
        .interview-prep-suggestion-content-dark {
          background: #22222f !important;
          background-color: #22222f !important;
          background-image: none !important;
          color: #f8fafc !important;
          border: 1px solid rgba(255, 255, 255, 0.1) !important;
          border-radius: 6px !important;
          padding: 1rem !important;
          margin-bottom: 1rem !important;
          line-height: 1.6 !important;
          transform: translateZ(0);
          will-change: background-color;
        }
        
        .interview-prep-suggestion-content-dark *,
        .interview-prep-suggestion-content-dark h1,
        .interview-prep-suggestion-content-dark h2,
        .interview-prep-suggestion-content-dark h3,
        .interview-prep-suggestion-content-dark h4,
        .interview-prep-suggestion-content-dark h5,
        .interview-prep-suggestion-content-dark h6,
        .interview-prep-suggestion-content-dark p,
        .interview-prep-suggestion-content-dark span,
        .interview-prep-suggestion-content-dark div,
        .interview-prep-suggestion-content-dark ul {
          list-style: none !important;
        }

        .interview-prep-suggestion-content-dark ul,
        .interview-prep-suggestion-content-dark ol,
        .interview-prep-suggestion-content-dark li,
        .interview-prep-suggestion-content-dark strong,
        .interview-prep-suggestion-content-dark em,
        .interview-prep-suggestion-content-dark b,
        .interview-prep-suggestion-content-dark i,
        .interview-prep-suggestion-content-dark a {
          color: #f8fafc !important;
        }

        .suggestion-text *,
        .suggestion-text h1,
        .suggestion-text h2,
        .suggestion-text h3,
        .suggestion-text h4,
        .suggestion-text h5,
        .suggestion-text h6,
        .suggestion-text p,
        .suggestion-text span,
        .suggestion-text div,
        .suggestion-text ul,
        .suggestion-text ol,
        .suggestion-text li,
        .suggestion-text strong,
        .suggestion-text em,
        .suggestion-text b,
        .suggestion-text i,
        .suggestion-text a {
          color: #f8fafc !important;
        }

        .suggestion-text h2,
        .suggestion-text h3,
        .suggestion-text h4 {
          margin-top: 1.5rem;
          margin-bottom: 0.75rem;
          font-weight: 600;
        }

        .suggestion-text h2 {
          font-size: 1.25rem;
        }

        .suggestion-text h3 {
          font-size: 1.1rem;
        }

        .suggestion-text h4 {
          font-size: 1rem;
        }

        .suggestion-text p {
          margin-bottom: 0.75rem;
        }

        .suggestion-text ul {
          margin: 0.75rem 0;
          padding-left: 1.5rem;
          list-style: none;
        }

        .suggestion-text li {
          margin-bottom: 0.5rem;
        }

        .suggestion-actions {
          display: flex;
          justify-content: flex-end;
        }

        .regenerate-btn {
          padding: 0.5rem 0.75rem;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  )
}

