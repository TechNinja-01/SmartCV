# Where to Insert API Keys - Visual Guide

## Quick Answer

Create a file named `.env` in your **project root directory** (same location as `package.json`) and add your API keys there.

---

## Step-by-Step Guide

### 1. Locate Your Project Root

Your project root is the main folder containing:
- `package.json`
- `README.md`
- `app/` folder
- `node_modules/` folder

```
your-project/          ← YOU ARE HERE (project root)
├── .env              ← CREATE THIS FILE
├── .env.example      ← Template provided
├── package.json
├── README.md
├── app/
├── node_modules/
└── ...
```

### 2. Create the .env File

**Option A: Copy from template**
```bash
cp .env.example .env
```

**Option B: Create manually**
Create a new file named `.env` (note the dot at the start)

### 3. Add Your API Keys

Open the `.env` file and add your keys:

```bash
# Gemini API Key (for Interview Question Generator)
GEMINI_API_KEY=AIza...

# JSearch API Key (for Job Search)
VITE_JSEARCH_API_KEY=def789ghi012...
```

**Important**:
- No quotes needed around the values
- No spaces around the `=` sign
- Each key on its own line
- The file name is exactly `.env` (with the dot)

---

## Where to Get Each API Key

### Gemini API Key

1. **Get the key from**: https://aistudio.google.com/app/apikey
2. **It looks like**: `AIza...`
3. **Paste it after**: `GEMINI_API_KEY=`

**Example**:
```bash
GEMINI_API_KEY=AIzaSyExampleKey
```

---

### JSearch API Key

1. **Get the key from**: https://rapidapi.com (after subscribing to JSearch)
2. **It looks like**: A long string of letters and numbers
3. **Paste it after**: `VITE_JSEARCH_API_KEY=`

**Example**:
```bash
VITE_JSEARCH_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

## Complete .env File Example

Your complete `.env` file should look like this:

```bash
GEMINI_API_KEY=AIzaSyExampleKey
VITE_JSEARCH_API_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

## File Location Diagram

```
📁 your-smartcv-project/
│
├── 📄 .env                    ← YOUR API KEYS GO HERE!
│   └── Contains:
│       GEMINI_API_KEY=AIza...
│       VITE_JSEARCH_API_KEY=...
│
├── 📄 .env.example            ← Template (no real keys)
├── 📄 package.json
├── 📄 README.md
│
├── 📁 app/
│   ├── 📁 routes/
│   │   ├── api.generate-questions.ts ← Uses GEMINI_API_KEY
│   │   ├── jobs.tsx           ← Uses VITE_JSEARCH_API_KEY
│   │   └── ...
│   └── ...
│
└── 📁 node_modules/
```

---

## How the App Uses These Keys

### In `app/routes/api.generate-questions.ts`:
```typescript
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
```

### In `app/routes/jobs.tsx` (Line ~49):
```typescript
const JSEARCH_API_KEY = import.meta.env.VITE_JSEARCH_API_KEY;
```

The app automatically reads from `.env` when you use `import.meta.env.VARIABLE_NAME`.

---

## Common Mistakes to Avoid

❌ **Wrong**: Creating `.env` inside the `app/` folder
✅ **Correct**: Creating `.env` in project root (next to `package.json`)

❌ **Wrong**: Naming the file `env.txt` or `.env.local`
✅ **Correct**: Naming it exactly `.env`

❌ **Wrong**: Adding quotes around values
```bash
GEMINI_API_KEY="AIza..."  ❌
```
✅ **Correct**: No quotes
```bash
GEMINI_API_KEY=AIza...  ✅
```

❌ **Wrong**: Spaces around equals sign
```bash
GEMINI_API_KEY = AIza...  ❌
```
✅ **Correct**: No spaces
```bash
GEMINI_API_KEY=AIza...  ✅
```

---

## After Adding Keys

### 1. Restart Your Dev Server

If the server is running, stop it (Ctrl+C) and restart:
```bash
npm run dev
```

### 2. Check if Keys Are Working

**Test Interview Questions**:
1. Go to http://localhost:5173/interview
2. Fill in the form
3. Click "Generate Questions"
4. If you see questions → Gemini key works! ✅

**Test Job Search**:
1. Go to http://localhost:5173/jobs
2. Enter a job title
3. Click "Search Jobs"
4. If you see jobs → JSearch key works! ✅

---

## Still Having Issues?

### Check the Browser Console

1. Open browser developer tools (F12)
2. Go to "Console" tab
3. Look for error messages

**Common errors**:

"API key not configured on server"
→ Check `.env` file exists and has `GEMINI_API_KEY`

"API error: 401 Unauthorized"
→ Your API key is invalid or incorrect

"API error: 429 Too Many Requests"
→ You've exceeded your API quota

---

## Security Reminder

🔒 **NEVER commit your `.env` file to Git**

The `.env` file is already in `.gitignore`, so it won't be committed accidentally.

If you need to share the project:
- Share `.env.example` (template)
- Never share `.env` (contains real keys)

---

## Need More Help?

- Full setup guide: See [API_SETUP.md](./API_SETUP.md)
- Quick start: See [QUICKSTART.md](./QUICKSTART.md)
- Feature docs: See [FEATURES.md](./FEATURES.md)

Your `.env` file is the ONLY place you need to add API keys. No code changes required!
