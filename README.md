# SmartCV - Your AI-Powered Career Assistant

A comprehensive career platform featuring AI-powered resume analysis, interview preparation, and job search capabilities.

## Features

### 🎯 ATS Resume Review
- Upload PDF resumes for instant analysis
- AI-powered ATS compatibility scoring
- Detailed feedback on tone, content, structure, and skills
- Resume history and tracking

### 💼 Interview Question Generator (NEW!)
- Generate custom interview questions using OpenAI
- Tailored to job title, experience level, and description
- Questions categorized by type and difficulty
- Regenerate for fresh questions anytime

### 🔍 Job Search Module (NEW!)
- Real-time job listings via JSearch API
- Search by job title and location
- Direct application links
- Company logos and job details

### 🎨 Modern Design
- Soft pastel color palette
- Responsive layout for all devices
- Tab-based navigation
- Smooth animations and transitions

## Tech Stack

- ⚡️ React Router v7
- 🎨 TailwindCSS v4
- 🔐 Puter.js for authentication & storage
- 🤖 OpenAI API for interview questions
- 💼 JSearch API for job listings
- 🔒 TypeScript
- 📦 Vite

## Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure API Keys
Create a `.env` file (see `.env.example`):
```bash
VITE_OPENAI_API_KEY=your_openai_api_key_here
VITE_JSEARCH_API_KEY=your_jsearch_api_key_here
```

**For detailed setup instructions, see [API_SETUP.md](./API_SETUP.md)**

### 3. Start Development Server
```bash
npm run dev
```

Visit `http://localhost:5173`

## Documentation

- **[QUICKSTART.md](./QUICKSTART.md)** - Get up and running in 5 minutes
- **[API_SETUP.md](./API_SETUP.md)** - Detailed API key configuration
- **[FEATURES.md](./FEATURES.md)** - Complete feature documentation

## API Keys Required

### OpenAI API (Interview Questions)
- Sign up at: https://platform.openai.com/signup
- Get API key: https://platform.openai.com/api-keys
- Cost: ~$0.002 per generation

### JSearch API (Job Search)
- Sign up at: https://rapidapi.com
- Subscribe to: https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
- Free tier: 2,500 requests/month

## Features Overview

### Navigation
The app has three main sections accessible from the navbar:
- **ATS Review** - Resume analysis
- **Interview Prep** - Question generation
- **Job Search** - Job listings

### ATS Resume Review
1. Upload PDF resume
2. Add job details (optional)
3. Get AI-powered feedback
4. View detailed scores and tips

### Interview Question Generator
1. Enter job title
2. Select experience level
3. Add job description (optional)
4. Generate 10 tailored questions
5. Regenerate for more questions

### Job Search
1. Enter job title
2. Add location (optional)
3. Browse real-time listings
4. Apply directly via provided links

## Building for Production

Create a production build:

```bash
npm run build
```

## Deployment

### Docker Deployment

To build and run using Docker:

```bash
docker build -t my-app .

# Run the container
docker run -p 3000:3000 my-app
```

The containerized application can be deployed to any platform that supports Docker, including:

- AWS ECS
- Google Cloud Run
- Azure Container Apps
- Digital Ocean App Platform
- Fly.io
- Railway

### DIY Deployment

If you're familiar with deploying Node applications, the built-in app server is production-ready.

Make sure to deploy the output of `npm run build`

```
├── package.json
├── package-lock.json (or pnpm-lock.yaml, or bun.lockb)
├── build/
│   ├── client/    # Static assets
│   └── server/    # Server-side code
```

## Styling

This template comes with [Tailwind CSS](https://tailwindcss.com/) already configured for a simple default starting experience. You can use whatever CSS framework you prefer.

---

