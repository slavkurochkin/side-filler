# SideFiller

A modern web application for managing your resume alongside job postings and applications. Features a two-column layout where you can edit your resume on the left while browsing job listings on the right.

![SideFiller](https://img.shields.io/badge/React-18-blue) ![Express](https://img.shields.io/badge/Express-4-green) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-blue) ![Docker](https://img.shields.io/badge/Docker-Ready-blue)

## Features

- **Resume Management**: Create and edit resumes with sections for experience, education, projects, and skills
- **Structured Content**: Organize work experience with titles, dates, locations, and bullet points
- **Integrated Web Viewer**: Browse job postings and applications without leaving the app
- **Bookmark System**: Save job postings with status tracking (saved, applied, interviewing, rejected, offer)
- **Modern UI**: Dark theme with smooth animations and intuitive design
- **Fully Dockerized**: Easy deployment with Docker Compose

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Framer Motion
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL 16
- **API Gateway**: Nginx
- **Containerization**: Docker + Docker Compose

## Quick Start

### Prerequisites

- Docker and Docker Compose installed on your system

### Running the Application

1. Clone the repository:
```bash
git clone <your-repo-url>
cd side-filler
```

2. Start all services:
```bash
docker-compose up --build
```

3. Access the application:
- **Web App**: http://localhost:8080
- **API**: http://localhost:8080/api
- **Direct Frontend**: http://localhost:3000
- **Direct Backend**: http://localhost:4000

### Stopping the Application

```bash
docker-compose down
```

To also remove the database volume:
```bash
docker-compose down -v
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     API Gateway (Nginx)                      │
│                        Port: 8080                            │
├────────────────────────┬────────────────────────────────────┤
│                        │                                     │
│    /                   │    /api/*                           │
│    ↓                   │    ↓                                │
│  ┌─────────────┐      │  ┌─────────────┐                    │
│  │  Frontend   │      │  │   Backend   │                    │
│  │  (React)    │      │  │  (Express)  │                    │
│  │  Port: 3000 │      │  │  Port: 4000 │                    │
│  └─────────────┘      │  └──────┬──────┘                    │
│                        │         │                           │
│                        │         ↓                           │
│                        │  ┌─────────────┐                    │
│                        │  │  PostgreSQL │                    │
│                        │  │  Port: 5432 │                    │
│                        │  └─────────────┘                    │
└────────────────────────┴────────────────────────────────────┘
```

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

### Saved URLs
- `GET /api/urls` - List all saved URLs
- `GET /api/urls/resume/:resumeId` - Get URLs for a resume
- `POST /api/urls` - Save new URL
- `PUT /api/urls/:id` - Update saved URL
- `DELETE /api/urls/:id` - Delete saved URL

## Database Schema

### Tables
- **resumes**: Main resume container with name, email, phone, summary
- **sections**: Resume sections (experience, education, projects, skills)
- **entries**: Individual items within sections (jobs, degrees, projects)
- **bullets**: Bullet points for each entry
- **saved_urls**: Bookmarked job postings with status tracking

## Development

### Running Without Docker

**Backend**:
```bash
cd backend
npm install
npm run dev
```

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

**Database**:
Make sure PostgreSQL is running and update the `DATABASE_URL` environment variable.

### Environment Variables

**Backend**:
- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Server port (default: 4000)
- `NODE_ENV`: Environment (development/production)

**Frontend**:
- `VITE_API_URL`: Backend API URL

## License

MIT

