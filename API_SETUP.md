# API Configuration Guide

This guide explains how to set up the API keys required for the new features in your SmartCV application.

## Required API Keys

Your application now uses two external APIs:

1. **OpenAI API** - for the Interview Question Generator
2. **JSearch API** - for the Job Search Module

---

## 1. OpenAI API Setup (Interview Questions)

### Step 1: Create an OpenAI Account
1. Go to [https://platform.openai.com/signup](https://platform.openai.com/signup)
2. Sign up for a new account or log in if you already have one

### Step 2: Get Your API Key
1. Navigate to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Click "Create new secret key"
3. Give it a descriptive name like "SmartCV Interview Generator"
4. Copy the API key immediately (you won't be able to see it again)

### Step 3: Add Credits (if needed)
- OpenAI requires you to add credits to your account
- Go to [https://platform.openai.com/account/billing](https://platform.openai.com/account/billing)
- Add at least $5 to start (you can always add more later)
- The app uses GPT-3.5-turbo which costs approximately $0.002 per generation

---

## 2. JSearch API Setup (Job Search)

### Step 1: Create a RapidAPI Account
1. Go to [https://rapidapi.com/auth/sign-up](https://rapidapi.com/auth/sign-up)
2. Sign up for a free account

### Step 2: Subscribe to JSearch API
1. Visit [https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch)
2. Click "Subscribe to Test" or "Pricing"
3. Choose a plan:
   - **Basic (Free)**: 2,500 requests/month - perfect for testing
   - **Pro**: More requests if you need higher limits
4. Click "Subscribe"

### Step 3: Get Your API Key
1. After subscribing, you'll see the API dashboard
2. Look for "X-RapidAPI-Key" in the code snippets
3. Copy your API key (it should look like a long string of characters)

---

## 3. Configure Environment Variables

### Step 1: Create .env File
1. In your project root directory, create a file named `.env`
2. Copy the contents from `.env.example`:

```bash
# OpenAI API Key (for Interview Question Generator)
VITE_OPENAI_API_KEY=your_openai_api_key_here

# JSearch API Key (for Job Search)
VITE_JSEARCH_API_KEY=your_jsearch_api_key_here
```

### Step 2: Add Your Keys
Replace the placeholder values with your actual API keys:

```bash
# Example (use your actual keys):
VITE_OPENAI_API_KEY=sk-proj-abc123xyz456...
VITE_JSEARCH_API_KEY=def789ghi012...
```

### Step 3: Restart Your Dev Server
After adding the keys, restart your development server:

```bash
npm run dev
```

---

## 4. Testing Your Setup

### Test Interview Questions
1. Navigate to the "Interview Prep" section
2. Fill in:
   - Job Title: "Software Engineer"
   - Experience Level: "Mid-Level"
   - (Optional) Job Description
3. Click "Generate Questions"
4. You should see 10 interview questions appear

### Test Job Search
1. Navigate to the "Job Search" section
2. Fill in:
   - Job Title: "Frontend Developer"
   - Location: "New York" (optional)
3. Click "Search Jobs"
4. You should see a list of job postings

---

## Security Best Practices

### Important Notes:
- **NEVER commit your `.env` file to Git** - it's already in `.gitignore`
- **NEVER share your API keys publicly**
- **Rotate your keys** if you suspect they've been compromised
- The `.env.example` file shows the format but contains no real keys

### If Your Keys Are Compromised:
1. **OpenAI**: Go to your API keys page and delete the compromised key
2. **RapidAPI**: Go to your dashboard and rotate your key
3. Generate new keys and update your `.env` file

---

## Cost Estimates

### OpenAI (Interview Questions)
- Model: GPT-3.5-turbo
- Cost: ~$0.002 per request (10 questions)
- 100 generations = ~$0.20
- Very affordable for personal use

### JSearch (Job Search)
- Free tier: 2,500 requests/month
- Each search = 1 request
- 2,500 searches should be plenty for personal use
- Pro tier available if you need more

---

## Troubleshooting

### Error: "OpenAI API key not configured"
- Make sure your `.env` file is in the project root
- Check that the variable name is exactly `VITE_OPENAI_API_KEY`
- Restart your dev server after adding the key

### Error: "JSearch API key not configured"
- Make sure your `.env` file is in the project root
- Check that the variable name is exactly `VITE_JSEARCH_API_KEY`
- Verify you've subscribed to the JSearch API on RapidAPI
- Restart your dev server after adding the key

### Interview Questions Not Generating
- Check your OpenAI account has available credits
- Verify your API key is valid
- Check browser console for error messages

### Job Search Returns No Results
- Try broader search terms (e.g., "Software Engineer" instead of specific titles)
- Try searching without a location first
- Verify you haven't exceeded your RapidAPI request limit

---

## Support

If you continue to experience issues:

1. Check the browser console for detailed error messages
2. Verify your API keys are correct and active
3. Ensure you have sufficient credits/quota remaining
4. Try the examples provided in the testing section

For API-specific issues:
- **OpenAI**: [https://help.openai.com](https://help.openai.com)
- **RapidAPI/JSearch**: [https://support.rapidapi.com](https://support.rapidapi.com)
