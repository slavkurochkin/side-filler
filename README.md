# SideFiller

A modern, AI-powered web application for managing your resume alongside job postings and applications. Features intelligent resume optimization, job description analysis, and interview preparation powered by vector embeddings and large language models.

⭐ **If you find this project useful, please consider giving it a star on GitHub!** ⭐

Contributions, forks, and feedback are always welcome! 🚀

![SideFiller](https://img.shields.io/badge/React-18-blue) ![Express](https://img.shields.io/badge/Express-4-green) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue) ![Docker](https://img.shields.io/badge/Docker-Ready-blue) ![AI](https://img.shields.io/badge/AI-Powered-purple)

## 📹 Video Walkthrough

Watch a complete walkthrough of SideFiller's main features:

<div align="center">
  <a href="https://www.youtube.com/watch?v=ZYt7vhjzPhs">
    <img src="docs/video-thumbnail.png" alt="SideFiller Walkthrough" style="width:100%;max-width:800px;border-radius:8px;box-shadow:0 4px 12px rgba(0,0,0,0.15);">
  </a>
  <br>
  <a href="https://www.youtube.com/watch?v=ZYt7vhjzPhs">▶️ Watch on YouTube</a>
</div>

## Features

### Core Functionality
- **Resume Management**: Create and edit resumes with sections for experience, education, projects, and skills
- **Structured Content**: Organize work experience with titles, dates, locations, and bullet points
- **Job Description Storage**: Save and organize job descriptions with labels and metadata
- **Application Tracking**: Track job applications with timeline events, status updates, and interview scheduling
- **Modern UI**: Dark theme with smooth animations and intuitive design

### AI-Powered Features
- **ATS-Optimized Resume Tailoring**: AI-powered bullet point rewriting optimized for specific job descriptions
- **Resume Summary Optimization**: Generate ATS-friendly professional summaries tailored to job requirements
- **Skills Extraction & Matching**: Automatically extract and suggest relevant skills from job descriptions
- **RAG-Powered Insights Agent**: Ask questions about your saved job descriptions using Retrieval-Augmented Generation
- **Interview Preparation**: Get personalized interview preparation suggestions based on application stage and job requirements
- **Vector Search**: Semantic search across job descriptions using embeddings and Qdrant vector database

## Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Framer Motion** for animations
- **Lucide React** for icons

### Backend
- **Express.js** + **TypeScript**
- **PostgreSQL 16** for relational data
- **Qdrant** for vector search and embeddings
- **LangChain** for LLM orchestration
- **OpenAI API** (GPT-4o-mini by default, configurable)
- **@xenova/transformers** for local embeddings (all-MiniLM-L6-v2)

### Infrastructure
- **Docker** + **Docker Compose** for containerization
- **Nginx** as API gateway
- **Node-cron** for scheduled tasks

## Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     API Gateway (Nginx)                          │
│                        Port: 8080                                 │
├────────────────────────┬────────────────────────────────────────┤
│                        │                                          │
│    /                   │    /api/*                               │
│    ↓                   │    ↓                                     │
│  ┌─────────────┐      │  ┌─────────────┐                         │
│  │  Frontend   │      │  │   Backend   │                         │
│  │  (React)    │      │  │  (Express) │                         │
│  │  Port: 3000 │      │  │  Port: 4000 │                         │
│  └─────────────┘      │  └──────┬──────┘                         │
│                        │         │                                │
│                        │         ├──────────────┐                │
│                        │         │              │                 │
│                        │         ↓              ↓                 │
│                        │  ┌─────────────┐  ┌─────────────┐      │
│                        │  │  PostgreSQL │  │   Qdrant    │      │
│                        │  │  Port: 5432 │  │  Port: 6333 │      │
│                        │  └─────────────┘  └─────────────┘      │
└────────────────────────┴─────────────────────────────────────────┘
```

### AI Architecture

#### 1. Embeddings Service (`services/embeddings.ts`)
- **Model**: `Xenova/all-MiniLM-L6-v2` (384-dimensional embeddings)
- **Backend**: ONNX.js with WASM (runs locally, no external API needed)
- **Features**:
  - Generates embeddings for text chunks
  - Batch processing support
  - Normalized cosine similarity vectors

#### 2. Vector Database (`services/qdrant.ts`)
- **Database**: Qdrant vector database
- **Collection**: `job_descriptions` (384 dimensions, cosine distance)
- **Features**:
  - Stores chunked job descriptions as vectors
  - Semantic similarity search
  - Label-based filtering
  - Automatic collection initialization

#### 3. Vector Synchronization (`services/vectorSync.ts`)
- **Chunking Strategy**:
  - Splits job descriptions by paragraphs
  - Falls back to sentence-level splitting for large paragraphs
  - Max chunk size: 500 characters
- **Sync Process**:
  - Generates embeddings for each chunk
  - Upserts vectors to Qdrant with metadata
  - Automatic sync on job description create/update
  - Manual sync endpoint available
  - Scheduled daily sync at 2 AM UTC

#### 4. RAG Service (`services/rag.ts`)
- **Retrieval-Augmented Generation**:
  1. User asks a question
  2. Question is embedded using the same model
  3. Vector search finds top-K similar chunks (default: 5)
  4. Context is built from retrieved chunks
  5. LLM (OpenAI) generates answer using context
- **Features**:
  - Label-based filtering
  - Source attribution
  - Relevance scoring

#### 5. LangChain Integration (`services/langchain.ts`)
- **LLM**: OpenAI (configurable model, default: `gpt-4o-mini`)
- **Configuration**:
  - API key stored in database settings
  - Model selection stored in database
  - Temperature: 0.7
- **Features**:
  - Dynamic client initialization
  - Settings-based configuration

#### 6. AI Routes (`routes/ai.ts`)
- **`POST /api/ai/adjust-experience`**: Rewrite bullet points for ATS optimization
- **`POST /api/ai/adjust-summary`**: Generate/optimize resume summary
- **`POST /api/ai/adjust-skills`**: Extract and suggest skills from job description
- **`POST /api/ai/interview-preparation`**: Generate interview prep suggestions
- **`GET /api/ai/interview-preparation/:applicationId`**: Get existing suggestions

#### 7. Insights Routes (`routes/insights.ts`)
- **`POST /api/insights/query`**: Query RAG agent with a question
- **`POST /api/insights/sync`**: Manually sync all job descriptions
- **`POST /api/insights/sync/:id`**: Sync a specific job description
- **`GET /api/insights/labels`**: Get available job description labels
- **`POST /api/insights/init`**: Initialize Qdrant collection

### Data Flow

#### Job Description Processing Flow
```
1. User creates/updates job description
   ↓
2. Backend saves to PostgreSQL
   ↓
3. Background job triggers vector sync:
   a. Chunk job description text
   b. Generate embeddings for each chunk
   c. Upsert vectors to Qdrant with metadata
   ↓
4. Job description is now searchable via RAG
```

#### RAG Query Flow
```
1. User asks question in Insights Agent
   ↓
2. Frontend sends question to /api/insights/query
   ↓
3. Backend:
   a. Generates embedding for question
   b. Searches Qdrant for similar chunks
   c. Retrieves top-K chunks with metadata
   d. Builds context from chunks
   e. Sends context + question to OpenAI
   f. Returns answer + sources
   ↓
4. Frontend displays formatted answer with source attribution
```

#### Resume Optimization Flow
```
1. User selects job description and resume entry
   ↓
2. Frontend sends current bullets + job description to /api/ai/adjust-experience
   ↓
3. Backend:
   a. Validates OpenAI API key
   b. Builds prompt with job description + current bullets
   c. Calls OpenAI with ATS optimization instructions
   d. Parses and returns optimized bullets
   ↓
4. User reviews and applies suggestions
```

## Quick Start

### Prerequisites

- **Docker** and **Docker Compose** installed on your system
- **OpenAI API Key** (optional, for AI features)

### Running the Application

1. **Clone the repository**:
```bash
git clone <your-repo-url>
cd side-filler
```

2. **Start all services**:
```bash
docker-compose up --build
```

This will start:
- PostgreSQL database (port 5434)
- Qdrant vector database (ports 6335, 6336)
- Backend API server (port 4000)
- Frontend development server (port 3000)
- Nginx gateway (port 8080)

3. **Access the application**:
- **Web App**: http://localhost:8080
- **API**: http://localhost:8080/api
- **Direct Frontend**: http://localhost:3000
- **Direct Backend**: http://localhost:4000
- **Qdrant Dashboard**: http://localhost:6335

4. **Configure AI Features** (optional):
   - Navigate to Settings in the app
   - Enter your OpenAI API key
   - Select your preferred model (default: `gpt-4o-mini`)

### Stopping the Application

```bash
docker-compose down
```

To also remove the database volume:
```bash
docker-compose down -v
```

## Setup & Configuration

### Environment Variables

#### Backend (`backend/.env` or Docker Compose)
- `DATABASE_URL`: PostgreSQL connection string (default: `postgresql://sidefiller:sidefiller_secret@postgres:5432/sidefiller`)
- `PORT`: Server port (default: `4000`)
- `NODE_ENV`: Environment (default: `development`)
- `QDRANT_URL`: Qdrant connection URL (default: `http://qdrant:6333`)

#### Frontend (`frontend/.env`)
- `VITE_API_URL`: Backend API URL (default: `http://localhost:8080/api`)

### Database Setup

The application automatically runs migrations on startup:
- Creates `settings` table for configuration
- Creates `job_descriptions` table
- Creates `applications` and `job_search_cycles` tables
- Creates `interview_preparation_suggestions` table
- Adds necessary indexes and triggers

### Vector Database Setup

Qdrant collection is automatically initialized on first use:
- Collection name: `job_descriptions`
- Vector size: 384 (for all-MiniLM-L6-v2)
- Distance metric: Cosine

### AI Configuration

1. **OpenAI API Key**:
   - Required for: Resume optimization, interview prep, RAG queries
   - Set via Settings UI or directly in database:
   ```sql
   INSERT INTO settings (key, value) 
   VALUES ('openai_api_key', 'your-api-key-here')
   ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
   ```

2. **Model Selection**:
   - Default: `gpt-4o-mini`
   - Can be changed in Settings UI
   - Supported: Any OpenAI model (gpt-4, gpt-4-turbo, gpt-3.5-turbo, etc.)

3. **Embeddings**:
   - Runs locally using ONNX.js
   - No API key required
   - Model downloaded on first use (~80MB)

## How to Use

### Resume Management

1. **Create a Resume**:
   - Click "New Resume" or select existing resume
   - Fill in personal information (name, email, phone, etc.)
   - Add a professional summary

2. **Add Sections**:
   - Click "Add Section"
   - Choose section type (Experience, Education, Projects, Skills)
   - Add entries within sections

3. **Optimize for Job Description**:
   - Open a job description
   - Select a resume entry
   - Click "AI Optimize" to get ATS-optimized bullet points
   - Review and apply suggestions

### Job Descriptions

1. **Add Job Description**:
   - Click "Add Job Description"
   - Paste or type job description content
   - Add title, URL, and label (optional)
   - Save automatically syncs to vector database

2. **Use Insights Agent**:
   - Navigate to "Insights" tab
   - Ask questions about your job descriptions
   - Filter by label if needed
   - View sources and relevance scores

3. **Sync Job Descriptions**:
   - Click "Sync" button in Insights Agent
   - Manually syncs all job descriptions to vector database
   - Automatic sync runs daily at 2 AM UTC

### Application Tracking

1. **Create Job Search Cycle**:
   - Navigate to Applications Tracker
   - Create a new cycle (e.g., "Summer 2024 Job Search")
   - Set start date and optional end date

2. **Add Application**:
   - Click "Add Application"
   - Enter company name, job title
   - Attach job description (optional)
   - Set initial status

3. **Track Timeline**:
   - Add events (applied, recruiter contacted, interview scheduled, etc.)
   - Set interview types (phone, technical, behavioral, etc.)
   - Update status as application progresses

4. **Interview Preparation**:
   - Open an application with attached job description
   - Click "Interview Preparation"
   - Generate AI-powered suggestions
   - View preparation tips based on current stage

### AI Features

#### Resume Optimization
- **Adjust Experience**: Rewrite bullet points to match job description keywords
- **Adjust Summary**: Generate ATS-optimized professional summary
- **Adjust Skills**: Extract and suggest relevant skills

#### Insights Agent
- Ask natural language questions about job descriptions
- Get answers with source attribution
- Filter by job description labels

#### Interview Preparation
- Stage-aware preparation suggestions
- Interview type-specific guidance
- Company research and problem-solving tips
- Custom prompt support for specific concerns

## API Endpoints

### Resumes
- `GET /api/resumes` - List all resumes
- `GET /api/resumes/:id` - Get resume with sections, entries, and bullets
- `POST /api/resumes` - Create new resume
- `PUT /api/resumes/:id` - Update resume
- `DELETE /api/resumes/:id` - Delete resume

### Sections
- `GET /api/sections/resume/:resumeId` - Get sections for a resume
- `POST /api/sections` - Create new section
- `PUT /api/sections/:id` - Update section
- `DELETE /api/sections/:id` - Delete section

### Entries
- `GET /api/entries/section/:sectionId` - Get entries for a section
- `POST /api/entries` - Create new entry
- `PUT /api/entries/:id` - Update entry
- `DELETE /api/entries/:id` - Delete entry

### Bullets
- `GET /api/bullets/entry/:entryId` - Get bullets for an entry
- `POST /api/bullets` - Create new bullet
- `POST /api/bullets/bulk/:entryId` - Bulk update bullets for an entry
- `PUT /api/bullets/:id` - Update bullet
- `DELETE /api/bullets/:id` - Delete bullet

### Job Descriptions
- `GET /api/job-descriptions` - List all job descriptions
- `GET /api/job-descriptions/:id` - Get specific job description
- `POST /api/job-descriptions` - Create new job description (auto-syncs to Qdrant)
- `PUT /api/job-descriptions/:id` - Update job description (auto-syncs to Qdrant)
- `DELETE /api/job-descriptions/:id` - Delete job description (removes from Qdrant)

### AI Endpoints
- `POST /api/ai/adjust-experience` - Optimize experience bullets for job description
- `POST /api/ai/adjust-summary` - Generate/optimize resume summary
- `POST /api/ai/adjust-skills` - Extract and suggest skills
- `POST /api/ai/interview-preparation` - Generate interview prep suggestions
- `GET /api/ai/interview-preparation/:applicationId` - Get interview prep suggestions

### Insights Endpoints
- `POST /api/insights/query` - Query RAG agent with a question
- `POST /api/insights/sync` - Sync all job descriptions to vector database
- `POST /api/insights/sync/:id` - Sync specific job description
- `GET /api/insights/labels` - Get available job description labels
- `POST /api/insights/init` - Initialize Qdrant collection

### Applications
- `GET /api/applications` - List all applications
- `GET /api/applications/:id` - Get application with timeline
- `POST /api/applications` - Create new application
- `PUT /api/applications/:id` - Update application
- `DELETE /api/applications/:id` - Delete application

### Settings
- `GET /api/settings` - Get all settings
- `GET /api/settings/:key` - Get specific setting
- `PUT /api/settings/:key` - Update setting

## Database Schema

### Core Tables

#### `resumes`
- Main resume container with personal information
- Fields: `id`, `name`, `email`, `phone`, `website`, `linkedin`, `github`, `summary`, `title`, `created_at`, `updated_at`

#### `sections`
- Resume sections (experience, education, projects, skills)
- Fields: `id`, `resume_id`, `section_type`, `title`, `sort_order`, `created_at`, `updated_at`

#### `entries`
- Individual items within sections (jobs, degrees, projects)
- Fields: `id`, `section_id`, `title`, `subtitle`, `location`, `start_date`, `end_date`, `is_current`, `description`, `sort_order`, `created_at`, `updated_at`

#### `bullets`
- Bullet points for each entry
- Fields: `id`, `entry_id`, `content`, `sort_order`, `created_at`, `updated_at`

#### `job_descriptions`
- Stored job descriptions (global, not tied to specific resume)
- Fields: `id`, `content`, `title`, `job_posting_url`, `label`, `created_at`, `updated_at`

#### `job_search_cycles`
- Job search campaign tracking
- Fields: `id`, `name`, `start_date`, `end_date`, `is_active`, `notes`, `created_at`, `updated_at`

#### `applications`
- Individual job applications
- Fields: `id`, `cycle_id`, `job_description_id`, `company_name`, `job_title`, `status`, `applied_date`, `interview_date`, `notes`, `job_posting_url`, `salary_range`, `location`, `resume_id`, `created_at`, `updated_at`

#### `application_events`
- Timeline events for applications
- Fields: `id`, `application_id`, `event_type`, `event_date`, `interview_type`, `notes`, `sort_order`, `created_at`, `updated_at`

#### `interview_preparation_suggestions`
- AI-generated interview prep suggestions
- Fields: `id`, `application_id`, `current_stage`, `interview_type`, `suggestion_text`, `created_at`, `updated_at`

#### `settings`
- Application settings (API keys, configuration)
- Fields: `id`, `key`, `value`, `created_at`, `updated_at`

## Development

### Running Without Docker

#### Backend
```bash
cd backend
npm install
npm run dev
```

Make sure PostgreSQL and Qdrant are running:
- PostgreSQL: `localhost:5432`
- Qdrant: `localhost:6333`

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Database Migrations

Migrations run automatically on startup. Manual migrations are in `database/` directory:
- `migration_add_job_descriptions.sql`
- `migration_add_applications_tracker.sql`
- `migration_add_interview_preparation_suggestions.sql`
- And more...

### Testing AI Features

1. **Test Embeddings**:
   ```bash
   # Embeddings run locally, no setup needed
   # First use will download model (~80MB)
   ```

2. **Test Vector Search**:
   ```bash
   # Add a job description via UI
   # Click "Sync" in Insights Agent
   # Query: "What skills are mentioned?"
   ```

3. **Test LLM Features**:
   ```bash
   # Set OpenAI API key in Settings
   # Try "AI Optimize" on a resume entry
   # Generate interview prep suggestions
   ```

## Troubleshooting

### Qdrant Connection Issues
- Ensure Qdrant container is running: `docker ps | grep qdrant`
- Check Qdrant health: `curl http://localhost:6335/health`
- Verify `QDRANT_URL` environment variable

### OpenAI API Errors
- Verify API key is set in Settings
- Check API key validity
- Ensure sufficient API credits
- Check rate limits

### Vector Sync Issues
- Check Qdrant is accessible
- Verify embeddings model downloaded successfully
- Check backend logs for sync errors
- Manually trigger sync via `/api/insights/sync`

### Database Connection Issues
- Verify PostgreSQL is running
- Check `DATABASE_URL` environment variable
- Ensure database exists and migrations ran

## Performance Considerations

- **Embeddings**: First run downloads model (~80MB). Subsequent runs are fast.
- **Vector Search**: Qdrant handles thousands of vectors efficiently
- **LLM Calls**: Rate limits apply based on OpenAI plan
- **Chunking**: Job descriptions are chunked to ~500 characters for optimal retrieval
- **Scheduled Sync**: Daily sync at 2 AM UTC to keep vectors up-to-date

## Security Notes

- **API Keys**: Stored in database, not in environment variables
- **CORS**: Configured for localhost development
- **Helmet**: Security headers enabled
- **Input Validation**: All endpoints validate input
- **SQL Injection**: Protected via parameterized queries

## Contributing

We welcome contributions to SideFiller! Whether you're fixing bugs, adding features, improving documentation, or suggesting enhancements, your help is appreciated.

### How to Contribute

1. **Fork the repository** and clone it to your local machine
2. **Create a new branch** for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/your-bug-fix
   ```
3. **Make your changes** following the coding standards below
4. **Test your changes** to ensure everything works correctly
5. **Commit your changes** with clear, descriptive commit messages
6. **Push to your fork** and open a Pull Request

### Reporting Bugs

If you find a bug, please open an issue with:
- **Clear description** of the bug
- **Steps to reproduce** the issue
- **Expected behavior** vs **actual behavior**
- **Environment details** (OS, Node version, Docker version, etc.)
- **Screenshots or error messages** if applicable

### Suggesting Features

We'd love to hear your ideas! When suggesting a feature:
- **Describe the feature** and why it would be useful
- **Provide use cases** or examples
- **Consider implementation** - is it feasible? What would it involve?
- **Check existing issues** to avoid duplicates

### Pull Request Guidelines

- **Keep PRs focused** - one feature or bug fix per PR
- **Write clear commit messages** - explain what and why
- **Update documentation** if you're adding features or changing behavior
- **Test your changes** before submitting
- **Ensure code follows** the project's style guidelines
- **Reference related issues** in your PR description

### Code Style

- **TypeScript**: Use TypeScript for all new code
- **Formatting**: Follow existing code style and indentation
- **Naming**: Use descriptive variable and function names
- **Comments**: Add comments for complex logic
- **Error Handling**: Include proper error handling and validation
- **Type Safety**: Avoid `any` types - use proper TypeScript types

### Development Setup

Before contributing, make sure you can run the project locally:

1. **Set up the development environment**:
   ```bash
   # Clone your fork
   git clone https://github.com/your-username/side-filler.git
   cd side-filler
   
   # Start services with Docker
   docker-compose up --build
   ```

2. **For local development** (without Docker):
   - Set up PostgreSQL and Qdrant locally
   - Install dependencies: `npm install` in both `backend/` and `frontend/`
   - Run migrations manually if needed
   - Start backend: `cd backend && npm run dev`
   - Start frontend: `cd frontend && npm run dev`

### Testing

- **Test manually** before submitting PRs
- **Test edge cases** and error scenarios
- **Verify AI features** work with valid API keys
- **Check database migrations** if you're modifying schema
- **Test vector sync** if you're modifying job description features

### Areas for Contribution

We especially welcome contributions in:
- 🐛 **Bug fixes** and error handling improvements
- ✨ **New features** that align with the project's goals
- 📚 **Documentation** improvements and examples
- 🎨 **UI/UX** enhancements
- ⚡ **Performance** optimizations
- 🔒 **Security** improvements
- 🧪 **Testing** infrastructure and test coverage

### Questions?

If you have questions about contributing, feel free to:
- Open an issue with the `question` label
- Check existing issues and discussions
- Review the codebase to understand the architecture

Thank you for contributing to SideFiller! 🎉

## License

This project is **free for personal use** and is provided as-is for individual developers and job seekers.

**Commercial Use**: This software is **NOT licensed for commercial use**. If you wish to use this software for commercial purposes, please contact the repository owner for licensing arrangements.

**Personal Use**: You are free to:
- Use this software for your personal job search and resume management
- Fork and modify the code for your personal use
- Contribute improvements back to the project

**Restrictions**:
- ❌ Commercial use without explicit permission
- ❌ Redistribution in commercial products
- ❌ Use in paid services or products

---

⭐ **Star this repository** if you find it helpful!  
🍴 **Fork it** to customize for your needs!  
🐛 **Report issues** or submit pull requests to help improve SideFiller!
