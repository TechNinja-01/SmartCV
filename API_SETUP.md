# API Configuration Guide

This guide explains how to set up the API keys required for the new features in your SmartCV application.

## Required API Keys

Your application now uses two external APIs:

1. **Gemini API** - for the Interview Question Generator
2. **JSearch API** - for the Job Search Module

---

## 1. Gemini API Setup (Interview Questions)

### Step 1: Create a Google AI Studio Key
1. Go to [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account

### Step 2: Get Your API Key
1. In AI Studio, click "Create API key"
2. Give it a descriptive name like "SmartCV Interview Generator"
4. Copy the API key immediately (you won't be able to see it again)

### Step 3: Save the key securely
- Keep the key private and do not commit it
- Add it to your local `.env` file only

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
# Gemini API Key (for Interview Question Generator)
GEMINI_API_KEY=your_gemini_api_key_here

# JSearch API Key (for Job Search)
VITE_JSEARCH_API_KEY=your_jsearch_api_key_here
```

### Step 2: Add Your Keys
Replace the placeholder values with your actual API keys:

```bash
# Example (use your actual keys):
GEMINI_API_KEY=AIza...
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
1. **Gemini**: Go to Google AI Studio and rotate/delete the compromised key
2. **RapidAPI**: Go to your dashboard and rotate your key
3. Generate new keys and update your `.env` file

---

## Cost Estimates

### Gemini (Interview Questions)
- Model: gemini-2.5-flash
- Pricing varies by Google AI Studio terms

### JSearch (Job Search)
- Free tier: 2,500 requests/month
- Each search = 1 request
- 2,500 searches should be plenty for personal use
- Pro tier available if you need more

---

## Troubleshooting

### Error: "API key not configured on server"
- Make sure your `.env` file is in the project root
- Check that the variable name is exactly `GEMINI_API_KEY`
- Restart your dev server after adding the key

### Error: "JSearch API key not configured"
- Make sure your `.env` file is in the project root
- Check that the variable name is exactly `VITE_JSEARCH_API_KEY`
- Verify you've subscribed to the JSearch API on RapidAPI
- Restart your dev server after adding the key

### Interview Questions Not Generating
- Verify your Gemini API key is valid
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
- **Gemini**: [https://ai.google.dev/gemini-api/docs](https://ai.google.dev/gemini-api/docs)
- **RapidAPI/JSearch**: [https://support.rapidapi.com](https://support.rapidapi.com)
