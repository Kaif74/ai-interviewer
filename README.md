# 🎙️ AI Interviewer — Voice Interview Practice Agent

A full-stack voice-based interview practice application where candidates speak naturally with an AI-powered interviewer. The system asks questions, listens to spoken responses, evaluates answers against predefined reference answers, provides coaching, and generates a detailed feedback report.

---

## ✨ Features

- **Conversational Voice AI**: Speak naturally to an AI interviewer. It uses Speech-to-Text (Groq Whisper) to understand you and Text-to-Speech (Mistral) to reply.
- **Structured State Machine**: Follows a deterministic interview loop (`Asking` → `Listening` → `Evaluating` → `Coaching`/`Follow-Up` → `Next Question`).
- **Smart Non-Answer Detection**: Automatically detects when a candidate says "I don't know," skips, or stays silent, and gently re-prompts them instead of advancing the interview prematurely.
- **Real-Time Evaluation**: Answers are instantly evaluated against a fixed set of reference questions using an LLM. 
- **Q&A Management UI**: Includes a premium, built-in admin dashboard (`/manage-questions`) to Create, Read, Update, Delete, and reorder interview questions on the fly—no code changes required!
- **Hugging Face Ready**: Fully configured for easy deployment on Hugging Face Spaces using Docker.

---

## 🏗️ Architecture

```
┌────────────────────────────────────────────────┐
│                  Frontend                       │
│          React + Vite + Tailwind CSS            │
│                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │ Landing   │ │Interview │ │  Feedback    │   │
│  │   Page    │ │  Page    │ │    Page      │   │
│  └──────────┘ └──────────┘ └──────────────┘   │
│       │            │              │             │
│  ┌────────────────────────────────────────┐    │
│  │        InterviewContext (useReducer)    │    │
│  └────────────────────────────────────────┘    │
│       │                                        │
│  ┌────────────────────────────────────────┐    │
│  │   API Service (Axios) — /api/interview  │    │
│  └────────────────────────────────────────┘    │
└──────────────────────┬─────────────────────────┘
                       │ HTTP (Streamed)
┌──────────────────────▼─────────────────────────┐
│                   Backend                       │
│             Node.js + Express                   │
│                                                 │
│  ┌─────────────────────────────────────────┐   │
│  │   Controllers (Interview & Questions)    │   │
│  └──────────────────┬──────────────────────┘   │
│                     │                           │
│  ┌──────────────────▼──────────────────────┐   │
│  │         InterviewService                 │   │
│  │    (State Machine + Orchestration)       │   │
│  └──────────────────┬──────────────────────┘   │
│         ┌───────────┼───────────┐              │
│         ▼           ▼           ▼              │
│  ┌───────────┐ ┌─────────┐ ┌────────┐        │
│  │STTService │ │Retrieval│ │Prompt  │        │
│  │(Groq)     │ │Service  │ │Service │        │
│  └───────────┘ └─────────┘ └────────┘        │
│         │                       │              │
│         ▼                       ▼              │
│  ┌───────────┐          ┌────────────┐        │
│  │LLMService │          │TTSService  │        │
│  │(Groq LLM) │          │(Mistral)   │        │
│  └───────────┘          └────────────┘        │
│         │                                      │
│         ▼                                      │
│  ┌─────────────┐                               │
│  │Feedback     │                               │
│  │Service      │                               │
│  └─────────────┘                               │
└────────────────────────────────────────────────┘
```

### Interview State Machine

```
ASKING → LISTENING → EVALUATING
                        ├── Non-Answer detected → Re-prompt Candidate (up to 3x)
                        ├── score ≥ 7 → NEXT_QUESTION
                        ├── score < 7 && !followUp → FOLLOW_UP → EVALUATING
                        └── score < 5 after followUp → COACHING → NEXT_QUESTION
NEXT_QUESTION → ASKING (loop) | END (all done)
```

---

## 🚀 Setup & Local Development

### Prerequisites

- Node.js 20+
- npm 9+
- API keys for:
  - [Groq](https://console.groq.com/) — Fast LLM & Speech-to-Text (Whisper)
  - [Mistral](https://console.mistral.ai/) — Text-to-Speech

### 1. Clone & Install

```bash
git clone <repo-url>
cd ai-interviewer

# Install Backend
cd backend
npm install

# Install Frontend
cd ../frontend
npm install
```

### 2. Configure Environment Variables

In the `backend` directory, copy the example env file:
```bash
cp .env.example .env
```

Edit `.env` and add your API keys:
```env
PORT=7860
GROQ_API_KEY=gsk_...
MISTRAL_API_KEY=...
LLM_MODEL=llama-3.3-70b-versatile
REASONING_FORMAT=none
```

### 3. Run the Servers

**Terminal 1 — Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Open **http://localhost:5173** in your browser.



## 🛠️ Q&A Management System

The application features a built-in Q&A Management UI accessible via the **Settings / Manage Questions** link in the header (when not in an active interview).

- **CRUD Operations**: Add new questions, edit existing ones, or delete them.
- **Reordering**: Move questions up and down to change the flow of the interview.
- **Multi-language**: Define questions and follow-ups in English, Hindi, and German.
- **Live Updates**: Changes are instantly saved to `questions.json` and hot-reloaded into the backend memory—no server restarts required!

---

## 📡 API Documentation

### `POST /api/interview/start`
Start a new interview session.
**Request:** `{ "language": "en" }`

### `POST /api/interview/respond/stream`
Submit an audio response via Multipart Form-Data and receive a Server-Sent Events (SSE) stream of the interviewer's reply audio chunks.

### `POST /api/interview/end`
End the interview and generate the final feedback report.

### `GET /api/questions`
Fetch the complete, ordered array of all interview questions.

### `POST /api/questions`
Create a new interview question.

### `PUT /api/questions/:id`
Update an existing question by ID.

### `DELETE /api/questions/:id`
Delete a question from the database.

---

## 📂 Folder Structure

```
ai-interviewer/
├── backend/
│   ├── Dockerfile                # Hugging Face deployment config
│   ├── README.md                 # Hugging Face Space metadata
│   ├── package.json
│   └── src/
│       ├── server.js             # Express server entry point (Binds to 0.0.0.0:7860)
│       ├── app.js                # Express app factory & CORS config
│       ├── config/               # Environment variables & constants
│       ├── controllers/          # Interview & Questions route handlers
│       ├── routes/               # API endpoint definitions
│       ├── services/             # Core Business Logic (LLM, STT, TTS, State)
│       ├── models/               # State object schemas
│       ├── utils/                # Loggers, SSE streaming helpers, async wrappers
│       └── database/
│           └── questions.json    # Writable database for interview questions
│
└── frontend/
    ├── package.json
    ├── vite.config.js            
    └── src/
        ├── App.jsx               # React Router configuration
        ├── index.css             # Tailwind + Custom Glassmorphism UI
        ├── context/              # Global Interview State (useReducer)
        ├── services/             # Axios API client calls
        ├── hooks/                # Audio recording, playback, and timer logic
        ├── components/           # Reusable UI elements (Buttons, Charts, Visualizers)
        └── pages/
            ├── LandingPage.jsx   
            ├── InterviewPage.jsx 
            ├── FeedbackPage.jsx  
            └── QuestionsManagePage.jsx # Admin dashboard for CRUD operations
```

---

## 💡 Future Improvements

- **Database Migration**: Move `questions.json` and session storage to a persistent database (PostgreSQL/MongoDB) for production-scale state management.
- **Authentication**: Add JWT user accounts to save personal interview histories.
- **WebSocket Integration**: Upgrade SSE/REST streaming to full WebSockets for bidirectional real-time audio.
- **Video Analysis**: Capture webcam video to analyze candidate body language.
- **Resume Parsing**: Dynamically generate the question set by parsing a candidate's uploaded PDF resume.
