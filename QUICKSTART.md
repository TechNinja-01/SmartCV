# Quick Start Guide

Get your expanded SmartCV app running in 5 minutes!

## Step 1: Install Dependencies
```bash
npm install
```

## Step 2: Set Up API Keys

### Create .env file
Copy the example file:
```bash
cp .env.example .env
```

### Get OpenAI API Key (for Interview Questions)
1. Go to https://platform.openai.com/api-keys
2. Create new key
3. Copy the key

### Get JSearch API Key (for Job Search)
1. Go to https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
2. Subscribe (free tier available)
3. Copy your RapidAPI key

### Add keys to .env
```bash
VITE_OPENAI_API_KEY=sk-proj-your-key-here
VITE_JSEARCH_API_KEY=your-rapidapi-key-here
```

## Step 3: Run the App
```bash
npm run dev
```

Visit: `http://localhost:5173`

## Step 4: Test the Features

### Test Interview Questions
1. Click "Interview Prep" in the navbar
2. Enter: "Software Engineer" + "Mid-Level"
3. Click "Generate Questions"
4. You should see 10 questions

### Test Job Search
1. Click "Job Search" in the navbar
2. Enter: "Frontend Developer"
3. Click "Search Jobs"
4. You should see job listings

### Test ATS Review (Existing)
1. Click "ATS Review" in the navbar
2. Upload a PDF resume
3. Get AI-powered feedback

## Troubleshooting

### "API key not configured" error?
- Check `.env` file exists in project root
- Verify variable names are exactly: `VITE_OPENAI_API_KEY` and `VITE_JSEARCH_API_KEY`
- Restart dev server after adding keys

### No questions generating?
- Verify OpenAI key is valid
- Check you have credits in your OpenAI account
- Check browser console for errors

### No jobs appearing?
- Verify you subscribed to JSearch on RapidAPI
- Try broader search terms
- Check you haven't exceeded free tier limit

## Need More Help?

See detailed guides:
- **API_SETUP.md** - Complete API setup instructions
- **FEATURES.md** - Full feature documentation
- **README.md** - Original project documentation

## What's New?

Your app now has 3 main features:
1. **ATS Review** - Original resume analyzer (unchanged)
2. **Interview Prep** - NEW! AI-generated interview questions
3. **Job Search** - NEW! Real-time job listings

All features are accessible from the navigation bar. The design uses soft pastel colors and is fully responsive.

Enjoy!
