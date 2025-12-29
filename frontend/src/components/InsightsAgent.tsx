import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Sparkles, Send, Loader2, RefreshCw, CheckCircle2, AlertCircle, BookOpen } from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export function InsightsAgent() {
  const [question, setQuestion] = useState('')
  const [selectedLabel, setSelectedLabel] = useState<string>('')
  const [labels, setLabels] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [answer, setAnswer] = useState<string | null>(null)
  const [sources, setSources] = useState<Array<{
    job_description_id: string
    label: string | null
    title: string | null
    chunk_text: string
    score: number
  }>>([])
  const [error, setError] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [syncStatus, setSyncStatus] = useState<{ synced: number; failed: number } | null>(null)

  useEffect(() => {
    fetchLabels()
  }, [])

  const fetchLabels = async () => {
    try {
      const response = await fetch(`${API_URL}/insights/labels`)
      if (response.ok) {
        const data = await response.json()
        setLabels(data.labels || [])
      }
    } catch (error) {
      console.error('Failed to fetch labels:', error)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    setSyncStatus(null)
    setError(null)
    
    try {
      const response = await fetch(`${API_URL}/insights/sync`, {
        method: 'POST',
      })
      
      if (response.ok) {
        const data = await response.json()
        setSyncStatus({
          synced: data.synced || 0,
          failed: data.failed || 0,
        })
        if (data.errors && data.errors.length > 0) {
          console.warn('Sync errors:', data.errors)
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        setError(errorData.error || 'Failed to sync job descriptions')
      }
    } catch (error) {
      console.error('Failed to sync:', error)
      setError('Failed to sync job descriptions')
    } finally {
      setIsSyncing(false)
    }
  }

  const handleQuery = async () => {
    if (!question.trim()) return
    
    setIsLoading(true)
    setAnswer(null)
    setSources([])
    setError(null)
    
    try {
      const response = await fetch(`${API_URL}/insights/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          label: selectedLabel || null,
        }),
      })
      
      if (response.ok) {
        const data = await response.json()
        setAnswer(data.answer)
        setSources(data.sources || [])
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }))
        setError(errorData.error || 'Failed to process query')
        if (errorData.details) {
          console.error('Error details:', errorData.details)
        }
      }
    } catch (error) {
      console.error('Failed to query:', error)
      setError('Failed to process query. Please check your connection.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleQuery()
    }
  }

  // Format answer text with markdown-like formatting
  const formatAnswer = (text: string): string => {
    // Escape HTML first
    let formatted = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
    
    // Bold text (**text**)
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    
    // Split into paragraphs first
    const paragraphs = formatted.split(/\n\n+/)
    
    // Process each paragraph
    const processedParagraphs = paragraphs.map(para => {
      // Check if it's a numbered list item
      const listMatch = para.match(/^(\d+)\.\s+(.+)$/m)
      if (listMatch) {
        // Split by numbered items
        const items = para.split(/(?=^\d+\.\s+)/m).filter(item => item.trim())
        if (items.length > 0) {
          return items.map(item => {
            const match = item.match(/^(\d+)\.\s+(.+)$/s)
            if (match) {
              const content = match[2]
                .replace(/\(Source (\d+)\)/g, '<span class="source-ref">(Source $1)</span>')
                .trim()
              return `<div class="list-item"><span class="list-number">${match[1]}.</span><span class="list-content">${content}</span></div>`
            }
            return `<p>${item.replace(/\n/g, '<br>')}</p>`
          }).join('')
        }
      }
      
      // Regular paragraph
      return `<p>${para.replace(/\n/g, '<br>').replace(/\(Source (\d+)\)/g, '<span class="source-ref">(Source $1)</span>')}</p>`
    })
    
    return processedParagraphs.join('')
  }

  return (
    <div className="insights-agent">
      <div className="insights-container">
        <div className="insights-header">
          <div className="header-content">
            <Sparkles size={24} />
            <h2>Insights Agent</h2>
          </div>
          <button
            className="sync-btn"
            onClick={handleSync}
            disabled={isSyncing}
            title="Sync all job descriptions to vector database"
          >
            {isSyncing ? (
              <>
                <Loader2 size={16} className="spinning" />
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <RefreshCw size={16} />
                <span>Sync</span>
              </>
            )}
          </button>
        </div>

        {syncStatus && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="sync-status"
          >
            {syncStatus.failed === 0 ? (
              <CheckCircle2 size={16} className="success-icon" />
            ) : (
              <AlertCircle size={16} className="warning-icon" />
            )}
            <span>
              Synced {syncStatus.synced} job description{syncStatus.synced !== 1 ? 's' : ''}
              {syncStatus.failed > 0 && `, ${syncStatus.failed} failed`}
            </span>
          </motion.div>
        )}

        <div className="query-section">
          <div className="query-controls">
            <div className="label-selector">
              <label htmlFor="label-select">Filter by Label (optional)</label>
              <select
                id="label-select"
                value={selectedLabel}
                onChange={(e) => setSelectedLabel(e.target.value)}
              >
                <option value="">All Job Descriptions</option>
                {labels.map((label) => (
                  <option key={label} value={label}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="query-input-container">
            <textarea
              className="query-input"
              placeholder="Ask a question about job descriptions... (e.g., What are the key skills for SDET positions?)"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyPress={handleKeyPress}
              rows={3}
            />
            <button
              className="query-btn"
              onClick={handleQuery}
              disabled={!question.trim() || isLoading}
            >
              {isLoading ? (
                <Loader2 size={18} className="spinning" />
              ) : (
                <Send size={18} />
              )}
            </button>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="error-message"
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </motion.div>
        )}

        {answer && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="answer-section"
          >
            <div className="answer-header">
              <h3>Answer</h3>
            </div>
            <div className="answer-content" dangerouslySetInnerHTML={{ __html: formatAnswer(answer) }}></div>
            
            {sources.length > 0 && (
              <div className="sources-section">
                <h4>
                  <BookOpen size={16} />
                  Sources ({sources.length})
                </h4>
                <div className="sources-list">
                  {sources.map((source, index) => (
                    <div key={index} className="source-item">
                      <div className="source-header">
                        <span className="source-title">
                          {source.title || `Job Description ${source.job_description_id.slice(0, 8)}`}
                        </span>
                        {source.label && (
                          <span className="source-label">{source.label}</span>
                        )}
                        <span className="source-score">{(source.score * 100).toFixed(1)}% match</span>
                      </div>
                      <div className="source-text">{source.chunk_text}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}

        {!answer && !isLoading && !error && (
          <div className="empty-state">
            <Sparkles size={48} strokeWidth={1.5} />
            <h3>Ask a Question</h3>
            <p>Get insights from your saved job descriptions</p>
            <p className="hint">
              Try: "What are the key skills for [position]?" or "What technologies are mentioned?"
            </p>
          </div>
        )}
      </div>

      <style>{`
        .insights-agent {
          height: 100%;
          width: 100%;
          display: flex;
          flex-direction: column;
          background: var(--bg-primary);
          overflow: hidden;
        }

        .insights-container {
          flex: 1;
          display: flex;
          flex-direction: column;
          padding: var(--space-xl) var(--space-2xl);
          overflow-y: auto;
          max-width: 1400px;
          width: 100%;
          margin: 0 auto;
        }

        .insights-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: var(--space-lg);
          padding-bottom: var(--space-md);
          border-bottom: 1px solid var(--border-subtle);
        }

        .header-content {
          display: flex;
          align-items: center;
          gap: var(--space-md);
        }

        .header-content svg {
          color: var(--accent-primary);
        }

        .header-content h2 {
          font-size: 1.75rem;
          font-weight: 700;
          color: var(--text-primary);
          margin: 0;
          letter-spacing: -0.02em;
        }

        .sync-btn {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          padding: var(--space-sm) var(--space-md);
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-secondary);
          font-size: 0.875rem;
          font-weight: 500;
          cursor: pointer;
          transition: all var(--transition-fast);
        }

        .sync-btn:hover:not(:disabled) {
          background: var(--bg-hover);
          border-color: var(--border-hover);
          color: var(--text-primary);
        }

        .sync-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .sync-status {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          padding: var(--space-sm) var(--space-md);
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          margin-bottom: var(--space-lg);
          font-size: 0.875rem;
          font-weight: 500;
        }

        .success-icon {
          color: var(--accent-success);
        }

        .warning-icon {
          color: var(--accent-warning);
        }

        .query-section {
          margin-bottom: var(--space-xl);
          background: var(--bg-secondary);
          padding: var(--space-lg);
          border-radius: var(--radius-lg);
          border: 1px solid var(--border-subtle);
        }

        .query-controls {
          margin-bottom: var(--space-md);
        }

        .label-selector {
          display: flex;
          flex-direction: column;
          gap: var(--space-xs);
        }

        .label-selector label {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: var(--space-xs);
        }

        .label-selector select {
          padding: var(--space-sm) var(--space-md);
          background: var(--bg-tertiary);
          border: 1px solid var(--border-default);
          border-radius: var(--radius-md);
          color: var(--text-primary);
          font-size: 0.875rem;
          cursor: pointer;
          transition: all var(--transition-fast);
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23999' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right var(--space-sm) center;
          padding-right: calc(var(--space-md) + 20px);
        }

        .label-selector select:hover {
          border-color: var(--border-hover);
        }

        .label-selector select:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .query-input-container {
          display: flex;
          gap: var(--space-sm);
          align-items: flex-end;
        }

        .query-input {
          flex: 1;
          padding: var(--space-md) var(--space-lg);
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          color: var(--text-primary);
          font-size: 1rem;
          font-family: inherit;
          resize: vertical;
          min-height: 100px;
          line-height: 1.6;
          transition: all var(--transition-fast);
        }

        .query-input:focus {
          outline: none;
          border-color: var(--accent-primary);
          box-shadow: 0 0 0 3px var(--accent-glow);
        }

        .query-input::placeholder {
          color: var(--text-muted);
        }

        .query-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: var(--space-md);
          background: var(--accent-primary);
          border: 1px solid var(--accent-primary);
          border-radius: var(--radius-lg);
          color: white;
          cursor: pointer;
          transition: all var(--transition-fast);
          min-width: 56px;
          height: 56px;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
        }

        .query-btn:hover:not(:disabled) {
          background: var(--accent-secondary);
          border-color: var(--accent-secondary);
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
          transform: translateY(-1px);
        }

        .query-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .error-message {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          padding: var(--space-md);
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid var(--accent-danger);
          border-radius: var(--radius-md);
          color: var(--accent-danger);
          margin-bottom: var(--space-md);
          font-size: 0.875rem;
        }

        .answer-section {
          background: var(--bg-secondary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-lg);
          padding: var(--space-xl);
          margin-bottom: var(--space-md);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .answer-header {
          margin-bottom: var(--space-lg);
          padding-bottom: var(--space-md);
          border-bottom: 2px solid var(--border-subtle);
        }

        .answer-section h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
          display: flex;
          align-items: center;
          gap: var(--space-sm);
        }

        .answer-content {
          color: var(--text-secondary);
          line-height: 1.8;
          font-size: 0.95rem;
          margin-bottom: var(--space-xl);
        }

        .answer-content p {
          margin: 0 0 var(--space-md) 0;
        }

        .answer-content p:last-child {
          margin-bottom: 0;
        }

        .answer-content strong {
          color: var(--text-primary);
          font-weight: 600;
        }

        .list-item {
          display: flex;
          gap: var(--space-sm);
          margin-bottom: var(--space-sm);
          padding: var(--space-xs) 0;
          align-items: flex-start;
        }

        .list-number {
          font-weight: 600;
          color: var(--accent-primary);
          min-width: 24px;
          flex-shrink: 0;
        }

        .list-content {
          flex: 1;
          color: var(--text-secondary);
        }

        .source-ref {
          color: var(--accent-primary);
          font-weight: 500;
          font-size: 0.9em;
        }

        .sources-section {
          border-top: 2px solid var(--border-subtle);
          padding-top: var(--space-xl);
          margin-top: var(--space-xl);
        }

        .sources-section h4 {
          display: flex;
          align-items: center;
          gap: var(--space-xs);
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-secondary);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0 0 var(--space-lg) 0;
        }

        .sources-list {
          display: flex;
          flex-direction: column;
          gap: var(--space-md);
        }

        .source-item {
          padding: var(--space-md) var(--space-lg);
          background: var(--bg-tertiary);
          border: 1px solid var(--border-subtle);
          border-radius: var(--radius-md);
          transition: all var(--transition-fast);
        }

        .source-item:hover {
          background: var(--bg-hover);
          border-color: var(--border-hover);
        }

        .source-header {
          display: flex;
          align-items: center;
          gap: var(--space-sm);
          margin-bottom: var(--space-sm);
          flex-wrap: wrap;
        }

        .source-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .source-label {
          font-size: 0.75rem;
          padding: 2px 8px;
          background: var(--accent-glow);
          color: var(--accent-primary);
          border-radius: var(--radius-sm);
          font-weight: 500;
        }

        .source-score {
          font-size: 0.75rem;
          color: var(--text-muted);
          margin-left: auto;
        }

        .source-text {
          font-size: 0.875rem;
          color: var(--text-secondary);
          line-height: 1.7;
          padding: var(--space-sm);
          background: var(--bg-secondary);
          border-radius: var(--radius-sm);
          border-left: 3px solid var(--accent-primary);
        }

        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: var(--space-2xl);
          color: var(--text-muted);
        }

        .empty-state svg {
          color: var(--accent-primary);
          margin-bottom: var(--space-lg);
        }

        .empty-state h3 {
          font-size: 1.25rem;
          font-weight: 600;
          color: var(--text-secondary);
          margin: 0 0 var(--space-sm) 0;
        }

        .empty-state p {
          margin: 0 0 var(--space-xs) 0;
        }

        .hint {
          font-size: 0.875rem;
          font-style: italic;
          margin-top: var(--space-md);
        }

        @media (max-width: 768px) {
          .insights-container {
            padding: var(--space-md);
          }

          .insights-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-md);
          }

          .query-input-container {
            flex-direction: column;
            align-items: stretch;
          }

          .query-btn {
            width: 100%;
            height: 48px;
          }

          .answer-section {
            padding: var(--space-md);
          }

          .source-header {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-xs);
          }

          .source-score {
            margin-left: 0;
          }
        }

        /* Improve scrollbar styling */
        .insights-container::-webkit-scrollbar {
          width: 8px;
        }

        .insights-container::-webkit-scrollbar-track {
          background: var(--bg-tertiary);
        }

        .insights-container::-webkit-scrollbar-thumb {
          background: var(--border-default);
          border-radius: 4px;
        }

        .insights-container::-webkit-scrollbar-thumb:hover {
          background: var(--border-hover);
        }
      `}</style>
    </div>
  )
}
