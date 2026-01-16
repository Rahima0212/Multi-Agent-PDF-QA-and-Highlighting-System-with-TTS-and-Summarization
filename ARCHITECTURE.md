# System Architecture

## Sequence Diagram

This diagram illustrates the asynchronous flow of the Multi-Agent PDF QA System, highlighting the interaction between the User, React UI, FastAPI Backend, PostgreSQL DB, and the various LangGraph Agents.

```mermaid
sequenceDiagram
    actor User
    participant UI as React Frontend
    participant API as FastAPI Backend
    participant DB as PostgreSQL
    participant Worker as Background Task (LangGraph)
    participant Extract as Extraction Agent
    participant Summ as Summarization Agent
    participant TTS as TTS Agent
    participant QA as QA Agent
    participant High as Highlighting Agent

    %% Upload Flow
    User->>UI: Upload PDF
    UI->>API: POST /upload-pdf (file)
    API->>DB: Create Document Record (Pending)
    API->>API: Save PDF to Disk (/data/docs)
    API->>Worker: Trigger Background Processing (ID)
    API-->>UI: Return Document ID & Initial State
    
    rect rgb(240, 248, 255)
    note right of Worker: Asynchronous Orchestration
    Worker->>Extract: Extract Text & Metadata
    Extract-->>Worker: Plain Text
    Worker->>DB: Update Document (Text Content)
    
    Worker->>Summ: Generate Summary (Gemini)
    Summ-->>Worker: Summary Text
    Worker->>DB: Update Document (Summary)
    
    Worker->>TTS: Generate Audio (EdgeTTS)
    TTS-->>Worker: Audio File Path
    Worker->>DB: Update Document (Audio Path)
    end

    %% UI Polling / Updates
    loop Every 1s
        UI->>API: GET /documents/{id}
        API->>DB: Query Status
        DB-->>API: Status (Summary/Audio Ready?)
        API-->>UI: Document State
    end
    UI->>User: Display Summary & Enable Audio Player

    %% QA Flow
    User->>UI: Ask Question
    UI->>API: POST /documents/{id}/query
    API->>DB: Fetch Chat History
    DB-->>API: History
    API->>Worker: Invoke QA Workflow (Text + History)
    
    rect rgb(255, 240, 245)
    note right of Worker: QA & Highlighting
    Worker->>QA: Answer Question (Gemini + RAG)
    QA-->>Worker: Answer + Quotes
    Worker->>High: Highlight Quotes in PDF
    High-->>Worker: Highlighted PDF Path
    end
    
    Worker->>DB: Log Interaction (Query, Answer, Quotes, Path)
    Worker-->>API: Return Interaction
    API-->>UI: Display Answer & Update PDF View
```
