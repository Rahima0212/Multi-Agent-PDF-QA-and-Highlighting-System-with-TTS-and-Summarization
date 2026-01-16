# Technical Documentation

## 1. Setup Instructions

### Prerequisites
- **Docker & Docker Compose**: Ensure Docker Desktop is running.
- **Python 3.11+** (for local dev, though Docker handles runtime).
- **Node.js 18+** (for local frontend dev).
- **Gemini API Key**: Required for AI agents.

### Configuration
1.  **Clone Repository**:
    ```bash
    git clone <repo_url>
    cd Task1
    ```
2.  **Environment Variables**:
    Create a `.env` file in the root directory:
    ```env
    POSTGRES_USER=postgres
    POSTGRES_PASSWORD=password
    POSTGRES_DB=pdf_qa
    GEMINI_API_KEY=your_gemini_key_here
    PGADMIN_EMAIL=admin@admin.com
    PGADMIN_PASSWORD=admin
    ```

### Running the Application
Run the entire stack (Backend, Frontend, DB) with one command:
```bash
docker-compose up --build
```

### Access Points
- **Frontend App**: [http://localhost:5173](http://localhost:5173)
- **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **PgAdmin (DB GUI)**: [http://localhost:5050](http://localhost:5050)

---

## 2. Agent Descriptions

The system uses specialized agents orchestrated by **LangGraph**.

### 1. Extraction Agent
- **File**: `backend/app/agents/extraction_agent.py`
- **Role**: Extracts raw text and metadata from uploaded PDF blobs.
- **Tools**: `PyMuPDF` (fitz).
- **Async Strategy**: Uses `asyncio.to_thread` for blocking PDF operations.

### 2. Summarization Agent
- **File**: `backend/app/agents/summarization_agent.py`
- **Role**: Generates concise executive summaries of the content.
- **Model**: `gemini-2.5-flash` (via LangChain).
- **Config**: Temperature 0.3 for consistent output.

### 3. TTS (Text-to-Speech) Agent
- **File**: `backend/app/agents/tts_agent.py`
- **Role**: Converts text summaries to speech.
- **Engine**: `edge-tts` (Microsoft Edge Online TTS service).
- **Benefits**: Native async support, high-quality neural voices, zero cost.

### 4. QA (Question Answering) Agent
- **File**: `backend/app/agents/qa_agent.py`
- **Role**: Answers user queries based on document context.
- **Features**:
    - **Context Awareness**: Rephrases follow-up questions using Chat History.
    - **Quote Extraction**: Returns exact quotes used to derive the answer for evidence.

### 5. Highlighting Agent
- **File**: `backend/app/agents/highlighting_agent.py`
- **Role**: Takes quotes from the QA Agent and visually highlights them in the PDF.
- **Output**: Generates a new temporary PDF file with yellow highlights for the frontend viewer.

---

## 3. API Endpoints

### Documents
- **`POST /upload-pdf`**: Uploads file, saves to DB/Disk, and triggers background processing.
- **`GET /documents`**: Lists all uploaded documents.
- **`GET /documents/{id}`**: Gets processed status (summary, audio path).

### Interactions
- **`POST /documents/{id}/query`**: Sends a question to the QA workflow.
    - **Body**: `{"query": "string", "document_id": int}`
    - **Returns**: Answer, Quotes, Highlighted PDF Path.
- **`GET /documents/{id}/interactions`**: Retrieves full chat history.

### Audio
- **`POST /documents/{id}/generate-audio`**: Manually regenerates audio for full text.
- **`POST /generate-selection-audio`**: Generates TTS for a specific text selection.

---

## 4. Asynchronous Execution Model

### Architecture
The system is built on an **Event-Loop Non-Blocking Architecture**.
- **FastAPI**: Handles HTTP requests asynchronously (`async def`).
- **LangGraph**: Definition of agent workflows as State Graphs.
- **BackgroundTasks**: Long-running processing (Extraction -> Summary -> TTS) is offloaded to background workers so the Upload API returns immediately.

### Database Logging
All state changes are logged to **PostgreSQL** asynchronously using `SQLAlchemy` + `asyncpg`.
- **Partial Updates**: The DB is updated incrementally as each agent finishes (e.g., Text Ready -> Summary Ready -> Audio Ready).
- **Polling**: The frontend polls the DB status to unlock features progressively.

---

## 5. Memory Handling Details

### Stateless Database-Backed Memory
We do **not** use in-memory session objects (like `ConversationBufferMemory`). Instead:
1.  **Persistence**: Every Query/Answer pair is saved to the `interactions` table in Postgres.
2.  **Injection**: When a new query arrives, the backend:
    -   Fetches the last N interactions from the DB.
    -   Formats them into a prompt.
    -   Injects them into the `QAAgent`.
3.  **Condense & Answer**: The agent rewrites the query to be standalone before answering.

**Benefit**: This ensures chat history survives server restarts and scales across multiple containers.

---

## 6. Testing Guidelines

### Backend Tests
- **Unit Tests**: Run with `pytest`.
- **Manual API Test**: Use the Swagger UI at `/docs`.
    1.  **Upload**: Upload a PDF and wait for processing logs in Docker.
    2.  **Query**: Execute a query and check if `highlight_path` is returned.

### Frontend Verification
1.  **Upload**: Check if the progress bar updates (polling works).
2.  **Summary**: Verify the summary expands/collapses.
3.  **Audio**: Click the Play button to verify `edge-tts` output.
4.  **Highlights**: Ask a question, wait for the response, and verify the PDF viewer jumps to the highlighted section.
