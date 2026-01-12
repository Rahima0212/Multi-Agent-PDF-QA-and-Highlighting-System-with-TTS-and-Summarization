# Multi-Agent PDF QA System - Architecture Diagram & Technical Documentation

> **Complete Single-Document Reference**  
> This document contains all architecture diagrams (3.2) and technical documentation (3.3) as requested, including: sequence diagrams for user upload with asynchronous agent orchestration, setup instructions, agent descriptions, API endpoints, asynchronous execution model, memory handling details, and testing guidelines.

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram-32)
3. [Sequence Diagrams](#sequence-diagrams)
4. [Technical Documentation](#technical-documentation-33)
5. [Components Description](#components-description)
6. [API Endpoints](#api-endpoints)
7. [Asynchronous Execution Model](#asynchronous-execution-model)
8. [Memory Handling Details](#memory-handling-details)
9. [Setup Instructions](#setup-instructions)
10. [Testing Guidelines](#testing-guidelines)

---

## System Overview

The **Multi-Agent PDF QA System** is a sophisticated FastAPI-based application that processes PDF documents using multiple specialized AI agents orchestrated through LangGraph. The system provides asynchronous document processing, intelligent querying with memory management, and real-time audio synthesis.

### Key Features:
- **Asynchronous Document Processing**: Background tasks handle extraction, summarization, and audio generation
- **Multi-Agent Orchestration**: LangGraph orchestrates extraction, QA, highlighting, and TTS agents
- **Chat Memory Management**: Maintains conversation history for context-aware responses
- **Real-time Audio Generation**: Edge-TTS for fast text-to-speech synthesis
- **PDF Highlighting**: Automatically highlights relevant quotes in PDFs
- **Persistent Storage**: PostgreSQL database with SQLAlchemy ORM

---

## Architecture Diagram (3.2)

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          FRONTEND (React + Vite)                        │
│  - Document Upload Interface                                            │
│  - PDF Viewer with Highlighting                                         │
│  - Chat Interface with Memory Display                                   │
│  - Audio Player                                                         │
└────────────────┬────────────────────────────────────────────────────────┘
                 │
                 │ HTTP/REST
                 ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                  FASTAPI SERVER (Backend Service)                       │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                     API Router (Endpoints)                        │  │
│  │  - POST /upload-pdf (Async Upload)                               │  │
│  │  - GET /documents (List Documents)                               │  │
│  │  - GET /documents/{doc_id} (Document Details)                    │  │
│  │  - POST /documents/{doc_id}/query (QA + Highlighting)            │  │
│  │  - GET /documents/{doc_id}/interactions (Chat History)           │  │
│  │  - POST /documents/{doc_id}/generate-audio (TTS)                 │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                   LangGraph Orchestrator                          │  │
│  │  ┌──────────────────────────────────────────────────────────┐    │  │
│  │  │ Document Processing Workflow                             │    │  │
│  │  │  ├─ Extraction Node (Extract Text & Metadata)            │    │  │
│  │  │  ├─ Summarization Node (Generate Summary)               │    │  │
│  │  │  └─ TTS Node (Generate Audio from Summary)              │    │  │
│  │  └──────────────────────────────────────────────────────────┘    │  │
│  │  ┌──────────────────────────────────────────────────────────┐    │  │
│  │  │ QA Workflow                                              │    │  │
│  │  │  ├─ QA Node (Generate Answer with Chat History)         │    │  │
│  │  │  └─ Highlighting Node (Highlight Quotes in PDF)         │    │  │
│  │  └──────────────────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                   Agent Layer                                     │  │
│  │  - ExtractionAgent (PyMuPDF): Text & metadata extraction         │  │
│  │  - SummarizationAgent (Gemini): Document summarization           │  │
│  │  - QAAgent (Gemini): Context-aware Q&A with history              │  │
│  │  - HighlightingAgent (PyMuPDF): PDF highlighting                 │  │
│  │  - TTSAgent (Edge-TTS): Text-to-speech synthesis                 │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└───────────────┬───────────────────────────────────────────────────────┬──┘
                │                                                       │
                ▼                                                       ▼
    ┌──────────────────────────┐                    ┌──────────────────────────┐
    │  PostgreSQL Database     │                    │  File Storage Layer      │
    │  ┌────────────────────┐  │                    │  ┌──────────────────────┐│
    │  │ Documents Table    │  │                    │  │ /data/docs/          ││
    │  │ - id               │  │                    │  │ /data/audio/         ││
    │  │ - filename         │  │                    │  │ /data/highlights/    ││
    │  │ - content (PDF)    │  │                    │  └──────────────────────┘│
    │  │ - text_content     │  │                    └──────────────────────────┘
    │  │ - summary          │  │
    │  │ - audio_path       │  │
    │  │ - created_at       │  │
    │  └────────────────────┘  │
    │  ┌────────────────────┐  │
    │  │ Interactions Table │  │
    │  │ - id               │  │
    │  │ - document_id      │  │
    │  │ - query            │  │
    │  │ - answer           │  │
    │  │ - quotes           │  │
    │  │ - highlight_path   │  │
    │  │ - timestamp        │  │
    │  └────────────────────┘  │
    └──────────────────────────┘
```

---

## Sequence Diagrams (3.2 - User Upload & Asynchronous Agent Orchestration)

### PDF Upload & Asynchronous Processing Flow

```
User                Frontend             FastAPI Server          LangGraph         Database           File System
│                    │                        │                    │                 │                    │
│ Upload PDF         │                        │                    │                 │                    │
├───────────────────>│                        │                    │                 │                    │
│                    │ POST /upload-pdf       │                    │                 │                    │
│                    ├───────────────────────>│                    │                 │                    │
│                    │                        │                    │                 │                    │
│                    │                        │ Save to DB         │                 │                    │
│                    │                        ├────────────────────>│                 │                    │
│                    │                        │<────────────────────┤                 │                    │
│                    │                        │ Return doc_id      │                 │                    │
│                    │<───────────────────────┤                    │                 │                    │
│                    │ {doc_id, filename}    │                    │                 │                    │
│<───────────────────┤                        │                    │                 │                    │
│ Document Ready    │                        │                    │                 │                    │
│                    │                        │ Background Task: run_document_processing()
│                    │                        │                    │                 │                    │
│                    │                        ├──────────────────────────────────────>│                    │
│                    │                        │                    │                 │                    │
│                    │                        │                    │ Extraction      │                    │
│                    │                        │                    ├─────────────────>│ Save Partial       │
│                    │                        │                    │                 │ text_content       │
│                    │                        │                    │                 │                    │
│                    │                        │                    │ Summarization   │                    │
│                    │                        │                    ├─────────────────>│ Save Partial       │
│                    │                        │                    │                 │ summary            │
│                    │                        │                    │                 │                    │
│                    │                        │                    │ TTS Node        │                    │
│                    │                        │                    ├──────────────────────────────────────>│
│                    │                        │                    │                 │                    │ audio_{doc_id}.mp3
│                    │                        │                    │                 ├─────────────────>│
│                    │                        │                    │                 │ audio_path saved   │
│                    │                        │                    │                 │                    │
│ Polling GET /docs │                        │                    │                 │                    │
├───────────────────>│                        │                    │                 │                    │
│                    │ GET /documents/{id}   │                    │                 │                    │
│                    ├───────────────────────>│                    │                 │                    │
│                    │                        │ Query DB           │                 │                    │
│                    │                        ├─────────────────────────────────────>│                    │
│                    │                        │<─────────────────────────────────────┤                    │
│                    │                        │ Full document data │                 │                    │
│                    │<───────────────────────┤                    │                 │                    │
│                    │                        │                    │                 │                    │
│ View Doc           │                        │                    │                 │                    │
│ Download Audio     │                        │                    │                 │                    │
└────────────────────┘                        │                    │                 │                    │


User Query & QA Flow with Memory

User                Frontend             FastAPI Server          LangGraph         Database           Gemini API
│                    │                        │                    │                 │                    │
│ Ask Question       │                        │                    │                 │                    │
├───────────────────>│                        │                    │                 │                    │
│                    │ POST /query            │                    │                 │                    │
│                    ├───────────────────────>│                    │                 │                    │
│                    │                        │                    │                 │                    │
│                    │                        │ Fetch Chat History │                 │                    │
│                    │                        ├─────────────────────────────────────>│                    │
│                    │                        │<─────────────────────────────────────┤                    │
│                    │                        │ [query1→answer1, ...]                │                    │
│                    │                        │                    │                 │                    │
│                    │                        ├──────────────────────────────────────>│                    │
│                    │                        │                    │                 │                    │
│                    │                        │                    │ QA Node         │                    │
│                    │                        │                    ├──────────────────────────────────────>│
│                    │                        │                    │ Condense Q (w/history)
│                    │                        │                    │<──────────────────────────────────────┤
│                    │                        │                    │ Standalone Q    │                    │
│                    │                        │                    │                 │                    │
│                    │                        │                    │ Generate Answer │                    │
│                    │                        │                    ├──────────────────────────────────────>│
│                    │                        │                    │<──────────────────────────────────────┤
│                    │                        │                    │ {answer, quotes}│                    │
│                    │                        │                    │                 │                    │
│                    │                        │                    │ Highlighting    │                    │
│                    │                        │                    │ Node (local)    │                    │
│                    │                        │                    │ Highlight PDFs  │                    │
│                    │                        │                    │                 │                    │
│                    │                        │ Save Interaction   │                 │                    │
│                    │                        ├─────────────────────────────────────>│                    │
│                    │                        │<─────────────────────────────────────┤                    │
│                    │                        │ Interaction saved  │                 │                    │
│                    │<───────────────────────┤                    │                 │                    │
│                    │ {answer, highlight_path}                    │                 │                    │
│<───────────────────┤                        │                    │                 │                    │
│ Display Answer     │                        │                    │                 │                    │
│ Show Highlights    │                        │                    │                 │                    │
└────────────────────┘                        │                    │                 │                    │
```

---

## Technical Documentation (3.3)

### Setup Instructions, Agent Descriptions, API Endpoints, Asynchronous Execution Model, Memory Handling, Testing

---

## Components Description

### 1. **Frontend (React + Vite)**
Located in `frontend/` directory.

**Key Components:**
- **App.jsx**: Main application container
  - Document upload interface
  - Chat/QA interface
  - PDF viewer integration
  - Audio player controls

- **PDFViewer.jsx**: Displays and navigates PDF documents
  - Renders PDF pages
  - Supports highlighting visualization
  - Responsive zoom/scroll

- **AudioPlayer.jsx**: Audio playback control
  - Play/pause functionality
  - Progress tracking
  - Download capabilities

**Technologies:** React 18+, Vite, Tailwind CSS, Framer Motion, Lucide Icons

---

### 2. **FastAPI Backend**
Located in `backend/app/` directory.

#### 2.1 **API Endpoints** (`api/endpoints.py`)

##### POST `/upload-pdf`
- **Purpose**: Accepts PDF file upload and initiates background processing
- **Request Body**: `multipart/form-data` with PDF file
- **Response**: Document object with metadata
- **Behavior**:
  1. Stores PDF in database (LargeBinary)
  2. Saves PDF to disk (`/data/docs/{id}.pdf`)
  3. Triggers background task for async processing
  4. Returns immediately with document ID

**Example:**
```bash
curl -X POST "http://localhost:8000/upload-pdf" \
  -F "file=@document.pdf"
```

**Response:**
```json
{
  "id": 1,
  "filename": "document.pdf",
  "created_at": "2024-01-12T10:30:00",
  "text_content": null,
  "summary": null,
  "audio_path": null
}
```

---

##### GET `/documents`
- **Purpose**: Retrieve list of all processed documents
- **Query Parameters**: None
- **Response**: Array of Document objects
- **Ordering**: By `created_at` descending (newest first)

**Example:**
```bash
curl -X GET "http://localhost:8000/documents"
```

---

##### GET `/documents/{doc_id}`
- **Purpose**: Retrieve specific document details with processing status
- **Path Parameters**: `doc_id` (integer)
- **Response**: Document object with full metadata
- **Error Handling**: Returns 404 if document not found

**Example:**
```bash
curl -X GET "http://localhost:8000/documents/1"
```

**Response:**
```json
{
  "id": 1,
  "filename": "document.pdf",
  "created_at": "2024-01-12T10:30:00",
  "text_content": "Extracted document text...",
  "summary": "Key points about the document...",
  "audio_path": "/data/audio/audio_1.mp3",
  "interactions": []
}
```

---

##### POST `/documents/{doc_id}/query`
- **Purpose**: Query document with QA agent and optional highlighting
- **Path Parameters**: `doc_id` (integer)
- **Request Body**: 
  ```json
  {
    "document_id": 1,
    "query": "What is the main topic?"
  }
  ```
- **Response**: Interaction object with answer and highlights
- **Process**:
  1. Fetches document from database
  2. Retrieves chat history for memory context
  3. Invokes QA workflow (question condensing + answer generation)
  4. Highlights relevant quotes in PDF
  5. Logs interaction to database

**Example:**
```bash
curl -X POST "http://localhost:8000/documents/1/query" \
  -H "Content-Type: application/json" \
  -d '{"document_id": 1, "query": "What is discussed?"}'
```

**Response:**
```json
{
  "id": 1,
  "document_id": 1,
  "query": "What is discussed?",
  "answer": "The document discusses...",
  "quotes": ["Quote 1", "Quote 2"],
  "highlight_path": "/data/highlights/highlighted_uuid.pdf",
  "timestamp": "2024-01-12T10:35:00"
}
```

---

##### GET `/documents/{doc_id}/interactions`
- **Purpose**: Retrieve all QA interactions (chat history) for a document
- **Path Parameters**: `doc_id` (integer)
- **Response**: Array of Interaction objects ordered by timestamp
- **Use Case**: Memory management for context-aware responses

**Example:**
```bash
curl -X GET "http://localhost:8000/documents/1/interactions"
```

---

##### POST `/documents/{doc_id}/generate-audio`
- **Purpose**: Generate text-to-speech audio for document summary
- **Path Parameters**: `doc_id` (integer)
- **Response**: Audio file path
- **Technology**: Edge-TTS (Microsoft neural voices)
- **Features**:
  - Cleans text for natural pronunciation
  - Removes markdown artifacts
  - Uses en-US-AriaNeural voice

---

#### 2.2 **Database Layer** (`db/`)

##### Models (`models.py`)

**Document Table:**
```python
- id (int, PK)
- filename (str)
- content (bytes) - Raw PDF binary
- text_content (str, nullable) - Extracted text
- summary (str, nullable) - Document summary
- audio_path (str, nullable) - Path to generated audio
- created_at (datetime)
- relationships: interactions
```

**Interaction Table:**
```python
- id (int, PK)
- document_id (int, FK)
- query (str) - User question
- answer (str) - AI response
- quotes (JSON) - Highlighted passages
- highlight_path (str, nullable) - Path to highlighted PDF
- timestamp (datetime)
- relationships: document
```

##### Database Configuration (`database.py`)
- **Engine**: AsyncPG (async PostgreSQL driver)
- **Connection Pooling**: SQLAlchemy async session factory
- **URL Format**: `postgresql+asyncpg://user:password@host/database`
- **Features**: Auto-commit disabled for transaction safety

---

#### 2.3 **Agent Layer** (`agents/`)

##### ExtractionAgent (`extraction_agent.py`)
**Responsibility**: Extract text and metadata from PDF

**Methods:**
- `extract_text(pdf_bytes: bytes) -> str`
  - Uses PyMuPDF (fitz)
  - Iterates through all pages
  - Concatenates text content

- `extract_metadata(pdf_bytes: bytes) -> dict`
  - Extracts PDF metadata (title, author, etc.)
  - Returns as dictionary

**Performance**: ~0.5-2s depending on PDF size

---

##### SummarizationAgent (`summarization_agent.py`)
**Responsibility**: Generate concise document summary

**Implementation:**
- Uses Google Gemini 2.5-Flash API
- Temperature: 0 (deterministic output)
- Async method: `generate_summary(text_content: str) -> str`

**Output**: Markdown-formatted summary with headers and bullet points

---

##### QAAgent (`qa_agent.py`)
**Responsibility**: Answer questions about document content

**Features:**
- **Question Condensing**: Resolves pronouns and references using chat history
- **Context-Aware**: Uses previous interactions for continuity
- **Quote Extraction**: Returns exact text passages supporting the answer
- **JSON Output**: Structured response with answer and quotes

**Process:**
1. If chat history exists: Condense question to standalone form
2. Generate answer using document context
3. Extract supporting quotes from text
4. Return structured JSON

**Memory Pattern:**
```
Chat History: [
  {query: "What is X?", answer: "X is..."},
  {query: "Tell me more", answer: "..."}
]

New Query: "Compare it to Y"
→ Condensed: "Compare X to Y?" (resolved "it" reference)
```

---

##### HighlightingAgent (`highlighting_agent.py`)
**Responsibility**: Create highlighted PDFs from quoted text

**Process:**
1. Opens PDF from bytes
2. Searches for each quote on each page
3. Adds yellow highlight annotations
4. Saves to `/data/highlights/`
5. Returns relative path for frontend access

**Error Handling**: Returns None if no quotes found

---

##### TTSAgent (In workflow.py)
**Responsibility**: Convert text to speech audio

**Technology**: Edge-TTS
- Microsoft neural voices
- Voice: en-US-AriaNeural
- Format: MP3
- Speed: ~1-2 seconds for typical summary

**Text Cleaning:** Removes markdown artifacts for natural speech

---

#### 2.4 **Orchestration** (`services/workflow.py`)

##### LangGraph Workflows

**Processing Workflow:**
```
Document Upload
    ↓
Extraction Node (pdf_bytes → text_content, metadata)
    ↓
Parallel Tasks:
├── Summarization Node (text_content → summary)
└── (optional) TTS Node (summary → audio_path)
    ↓
Immediate DB Updates (Partial)
    ↓
Complete
```

**QA Workflow:**
```
User Query
    ↓
QA Node:
├── Fetch Chat History from DB
├── Condense Question (with history context)
├── Generate Answer (with quotes)
    ↓
Highlighting Node:
├── Extract quote locations
├── Create highlighted PDF
    ↓
Return {answer, quotes, highlight_path}
```

**State Definition:**
```python
class AgentState(TypedDict):
    pdf_bytes: bytes
    text_content: str
    metadata: dict
    summary: str
    audio_path: str
    query: str
    answer: str
    highlight_path: str
    quotes: List[str]
    document_id: int
    chat_history: List[dict]
```

---

### 3. **Schemas** (`schemas/schemas.py`)

**Pydantic models for validation:**

```python
class DocumentBase(BaseModel):
    filename: str

class Document(DocumentBase):
    id: int
    created_at: datetime
    text_content: Optional[str] = None
    summary: Optional[str] = None
    audio_path: Optional[str] = None

class InteractionCreate(BaseModel):
    document_id: int
    query: str

class Interaction(BaseModel):
    id: int
    document_id: int
    query: str
    answer: str
    quotes: Optional[List[str]] = None
    highlight_path: Optional[str] = None
    timestamp: datetime
```

---

## Asynchronous Execution Model

### Background Task Processing

```python
@router.post("/upload-pdf")
async def upload_pdf(...):
    # 1. Synchronous: Save to DB and disk
    db.add(db_doc)
    await db.commit()
    
    # 2. Background Task (async, non-blocking)
    background_tasks.add_task(run_document_processing, doc_id, pdf_bytes)
    
    # 3. Immediate Response to user
    return db_doc  # Returns while processing continues
```

### Processing Phases

**Phase 1: Immediate (Blocking)**
- PDF upload to database
- File system storage
- Return document ID to user

**Phase 2: Background (Non-Blocking)**
- Text extraction
- Summarization
- Audio generation
- Progressive database updates

### Concurrency Model

- **FastAPI Background Tasks**: Built-in async task runner
- **Multiple Concurrent Uploads**: Handled by Uvicorn workers
- **LangGraph Async Nodes**: All agent nodes are async-compatible
- **Database**: AsyncPG for non-blocking I/O

### Performance Characteristics

```
Upload PDF: ~0.2s (return doc ID)
  ↓ (background)
Extraction: ~0.5-2s (PDF size dependent)
  ↓
Summarization: ~3-8s (Gemini API latency)
  ↓
TTS: ~2-5s (audio duration)
  ↓
Total: ~6-15s (user doesn't wait)
```

---

## Memory Handling Details

### Chat History Management

#### Storage
- **Location**: PostgreSQL `interactions` table
- **Structure**: 
  ```python
  {
    "query": "User question",
    "answer": "AI response",
    "quotes": ["supporting text"]
  }
  ```

#### Retrieval Pattern
```python
# Fetch chat history for document
history_query = select(models.Interaction)\
    .filter(models.Interaction.document_id == doc_id)\
    .order_by(models.Interaction.timestamp.asc())

# Convert to list for agent
history_list = [
    {"query": h.query, "answer": h.answer} 
    for h in chat_history
]
```

#### Context Injection
```python
inputs = {
    "text_content": doc.text_content,
    "query": new_question,
    "chat_history": history_list  # ← Provided to QA agent
}

result = await qa_workflow.ainvoke(inputs)
```

### Question Condensing Pattern

**Problem**: User asks "Tell me more about that" → "that" is undefined

**Solution**: LLM rewrite with context
```
Input: chat_history = [
  {Q: "What is AI?", A: "AI is..."},
]
New Question: "Tell me more about that"

Condense Prompt: "Rephrase follow-up question as standalone"
Output: "Tell me more about AI"
```

### Memory Limitations

- **Session**: Unlimited (stored in database)
- **Context Window**: Limited by Gemini API
  - Typical token limit: 32,000
  - Chat history limited to recent interactions
- **Optimization**: Fetch only last N interactions if needed

---

## Setup Instructions

### Prerequisites

- Python 3.9+
- PostgreSQL 12+
- Docker (optional, for containerization)
- Google Gemini API Key
- Node.js 18+ (for frontend)

### Backend Setup

#### 1. Environment Configuration

Create `.env` file in backend root:

```bash
# Database
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/pdf_qa_db

# Google Gemini API
GEMINI_API_KEY=your_gemini_api_key_here

# FastAPI
FASTAPI_ENV=development
FASTAPI_DEBUG=true
```

#### 2. Python Environment

```bash
# Navigate to backend
cd backend/

# Create virtual environment
python -m venv venv

# Activate venv
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### 3. Database Setup

```bash
# Create PostgreSQL database
createdb pdf_qa_db

# Initialize tables (automatic on first app startup)
# Tables are created via SQLAlchemy on app startup
```

#### 4. Running the Backend

```bash
cd backend/

# Start FastAPI server (development)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or with Python
python -m uvicorn app.main:app --reload
```

**API Documentation**: http://localhost:8000/docs (Swagger UI)

---

### Frontend Setup

#### 1. Environment Configuration

Create `.env.local` in frontend root:

```bash
VITE_API_URL=http://localhost:8000
```

#### 2. Install Dependencies

```bash
cd frontend/

npm install
```

#### 3. Running the Frontend

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

**Default**: http://localhost:5173

---

### Docker Setup (Optional)

#### 1. Build Images

```bash
docker-compose build
```

#### 2. Start Services

```bash
docker-compose up -d
```

**Services:**
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- PostgreSQL: localhost:5432

#### 3. View Logs

```bash
docker-compose logs -f backend
docker-compose logs -f frontend
```

---

## Testing Guidelines

### Unit Tests

#### Backend Tests

```bash
# Run pytest
cd backend/
pytest

# With coverage
pytest --cov=app

# Specific test file
pytest tests/test_agents.py -v
```

**Test Structure:**
```
backend/
├── tests/
│   ├── test_extraction.py       # Test ExtractionAgent
│   ├── test_qa.py               # Test QAAgent
│   ├── test_highlighting.py     # Test HighlightingAgent
│   ├── test_endpoints.py        # Test API endpoints
│   └── test_workflow.py         # Test LangGraph workflows
```

---

### Integration Tests

#### PDF Upload & Processing

```python
# tests/test_endpoints.py
import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_upload_pdf():
    async with AsyncClient(app=app, base_url="http://test") as client:
        with open("sample.pdf", "rb") as f:
            response = await client.post(
                "/upload-pdf",
                files={"file": f}
            )
        assert response.status_code == 200
        assert "id" in response.json()

@pytest.mark.asyncio
async def test_document_processing_pipeline():
    # 1. Upload
    doc_response = await client.post("/upload-pdf", ...)
    doc_id = doc_response.json()["id"]
    
    # 2. Wait for background processing
    import time
    time.sleep(10)
    
    # 3. Verify extraction complete
    doc = await client.get(f"/documents/{doc_id}")
    assert doc.json()["text_content"] is not None
    assert doc.json()["summary"] is not None
```

---

#### Query & Memory Tests

```python
@pytest.mark.asyncio
async def test_qa_with_memory():
    # 1. Upload document
    doc_id = (await upload_document()).json()["id"]
    
    # 2. First query
    q1 = await client.post(
        f"/documents/{doc_id}/query",
        json={"document_id": doc_id, "query": "What is X?"}
    )
    assert "answer" in q1.json()
    
    # 3. Second query with pronoun
    q2 = await client.post(
        f"/documents/{doc_id}/query",
        json={"document_id": doc_id, "query": "Tell me more about it"}
    )
    # Should resolve "it" to "X" from previous context
    assert "it" not in q2.json()["answer"] or context_preserved
```

---

### Performance Testing

#### Load Testing with Locust

```python
# locustfile.py
from locust import HttpUser, task

class PDFQAUser(HttpUser):
    @task
    def upload_pdf(self):
        with open("sample.pdf", "rb") as f:
            self.client.post("/upload-pdf", files={"file": f})
    
    @task
    def query_document(self):
        self.client.post(
            "/documents/1/query",
            json={"document_id": 1, "query": "test question"}
        )
```

Run:
```bash
locust -f locustfile.py --host=http://localhost:8000
```

---

### Manual Testing Checklist

- [ ] **Upload**: Can upload PDF successfully
- [ ] **Background Processing**: Text extracted within 10s
- [ ] **Summarization**: Summary generated automatically
- [ ] **Audio Generation**: Audio file created and playable
- [ ] **Query**: Can ask questions about document
- [ ] **Memory**: Responses use chat history context
- [ ] **Highlighting**: Quotes highlighted in PDF
- [ ] **UI Rendering**: Frontend displays results correctly
- [ ] **Error Handling**: Proper error messages on failures

---

### API Testing with cURL

#### Test Upload
```bash
curl -X POST "http://localhost:8000/upload-pdf" \
  -F "file=@sample.pdf" \
  -v
```

#### Test Query
```bash
curl -X POST "http://localhost:8000/documents/1/query" \
  -H "Content-Type: application/json" \
  -d '{"document_id": 1, "query": "What is the main topic?"}' \
  -v
```

#### Test Chat History
```bash
curl -X GET "http://localhost:8000/documents/1/interactions" \
  -v
```

---

## Troubleshooting

### Common Issues

#### Database Connection Error
```
Error: CRITICAL: DATABASE_URL is not set!
```
**Solution**: Check `.env` file and ensure `DATABASE_URL` is configured correctly.

#### Gemini API Key Invalid
```
Error: google.auth.exceptions.DefaultCredentialsError
```
**Solution**: Verify `GEMINI_API_KEY` in environment and API is enabled in Google Cloud Console.

#### PDF Extraction Fails
```
Error: fitz.FileError: cannot open file
```
**Solution**: Ensure PDF file is not corrupted. Test with known good PDF.

#### Async Task Hangs
```
Status: Processing (stuck)
```
**Solution**: Check server logs for errors. Restart backend service.

---

## Deployment

### Production Checklist

- [ ] Set `FASTAPI_DEBUG=false` in environment
- [ ] Use strong database credentials
- [ ] Secure Gemini API key (use secrets manager)
- [ ] Configure CORS appropriately (not "*")
- [ ] Use production ASGI server (Gunicorn)
- [ ] Enable database backups
- [ ] Configure logging and monitoring
- [ ] Set up SSL/TLS certificates
- [ ] Use reverse proxy (Nginx)

### Gunicorn Configuration

```bash
gunicorn app.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile - \
  --error-logfile -
```

---

## Architecture Decisions

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Framework | FastAPI | Async support, auto-docs, performance |
| Orchestration | LangGraph | Agent orchestration, state management |
| Database | PostgreSQL | Reliability, ACID compliance, async support |
| LLM | Google Gemini | Fast (2.5-Flash), cost-effective |
| PDF Processing | PyMuPDF | Fast extraction, highlighting capabilities |
| TTS | Edge-TTS | Faster than gTTS, neural quality |
| Frontend | React + Vite | Fast build, HMR, modern tooling |

---

## Future Enhancements

1. **Authentication**: Add user accounts and document sharing
2. **Batch Processing**: Support bulk PDF uploads
3. **Advanced Memory**: Semantic similarity for better context
4. **Multi-Language**: Support for non-English documents
5. **Custom Agents**: User-defined extraction rules
6. **Real-time Updates**: WebSocket for live processing status
7. **Caching**: Redis for frequently asked questions
8. **Analytics**: Track usage patterns and performance

---

## Support & Debugging

### Enable Verbose Logging

```python
# In main.py
import logging
logging.basicConfig(level=logging.DEBUG)
```

### View Application Logs

```bash
# Backend logs
docker-compose logs -f backend

# Database logs
docker-compose logs -f postgres
```

### Debug Database Queries

```python
# In database.py, enable SQL echo
engine = create_async_engine(DATABASE_URL, echo=True)
```

---

**Document Version**: 1.0  
**Last Updated**: January 12, 2026  
**Maintainers**: Development Team
