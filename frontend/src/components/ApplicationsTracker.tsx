import { motion } from 'framer-motion'
import { Briefcase } from 'lucide-react'

export function ApplicationsTracker() {
  return (
    <div className="applications-tracker">
      <div className="empty-state">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="empty-content"
        >
          <div className="empty-icon">
            <Briefcase size={48} strokeWidth={1.5} />
          </div>
          <h2>Applications Tracker</h2>
          <p>Track your job applications and their status</p>
          <p className="coming-soon">Coming soon...</p>
        </motion.div>
      </div>
      <style>{`
        .applications-tracker {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-primary);
        }

        .empty-state {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .empty-content {
          text-align: center;
          max-width: 500px;
          padding: var(--space-2xl);
        }

        .empty-icon {
          margin-bottom: var(--space-lg);
          color: var(--accent-primary);
          display: flex;
          justify-content: center;
        }

        .empty-content h2 {
          font-size: 2rem;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: var(--space-md);
        }

        .empty-content p {
          color: var(--text-secondary);
          font-size: 1.1rem;
          margin-bottom: var(--space-sm);
        }

        .coming-soon {
          color: var(--text-muted);
          font-style: italic;
          margin-top: var(--space-lg);
        }
      `}</style>
    </div>
  )
}

