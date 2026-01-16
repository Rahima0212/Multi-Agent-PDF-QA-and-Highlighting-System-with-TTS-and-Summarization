# Multi-Agent PDF QA, Highlighting, Summarization & TTS System

## 📌 Overview

This project is a **multi-container, AI-powered system** that processes uploaded PDF documents and enables:

- 📄 PDF text extraction  
- ❓ Question Answering (QA) over PDF content  
- 🖍️ Relevant content identification (for highlighting)  
- 📝 Document summarization  
- 🔊 Text-to-Speech (TTS) generation  
- 🧠 Modular, agent-oriented backend design  
- 🐳 Fully containerized architecture using Docker Compose  

The system was built as part of an **internship onboarding task** to demonstrate backend engineering, AI integration, and system design skills.

---

## 🏗️ High-Level Architecture

#### User
### ↓
#### Frontend (Vite / React)
### ↓
#### FastAPI Backend
#### ├── PDF Extraction Logic
#### ├── QA & Retrieval Logic
#### ├── Summarization Logic
#### ├── TTS Generation Logic
#### └── Database Logging
### ↓
#### PostgreSQL Database


The entire system runs using **Docker Compose** with isolated containers for each service.

---

## 🧩 Multi-Container Docker Setup

The project uses a **4-container Docker Compose architecture**:

| Container  | Description |
|-----------|-------------|
| `db` | PostgreSQL 15 database (persistent via Docker volumes) |
| `backend` | FastAPI backend handling AI logic |
| `frontend` | Custom frontend UI (Vite-based) |
| `pgadmin` | pgAdmin for database inspection (bonus feature) |

This setup ensures:
- Clear separation of concerns
- Environment-based configuration
- Production-style networking using Docker service names
- Persistent database storage

---

## ⚙️ Backend (FastAPI + SQLAlchemy)

The backend is responsible for all core functionality and data persistence.

### Key Technologies
- **FastAPI** — API layer and request handling
- **SQLAlchemy** — ORM for database interaction
- **PostgreSQL** — Primary relational database
- **LLMs** — QA, summarization, and TTS

### Features
- PDF upload and parsing
- Text extraction and preprocessing
- Context-based question answering using LLMs
- Document summarization
- Text-to-speech audio generation
- API-based communication with frontend
- Database connectivity via PostgreSQL

### Design Notes
- Logic is **modular and agent-oriented**, where each major responsibility maps to a logical agent
- Designed to be easily extendable to:
  - LangGraph-based orchestration
  - Fully asynchronous execution
  - Session-based memory

---

## 🎨 Frontend

The frontend is a **custom UI** built with modern tooling and runs in its own container.

### Responsibilities
- Upload PDFs
- Submit user queries
- Display answers and summaries
- Trigger TTS generation
- Communicate with backend via environment-configured API URL

---

## 🗄️ Database (PostgreSQL)

PostgreSQL is used as the system database and runs in an isolated container.

### Design Notes
- Persistent storage via Docker volumes
- Clean ORM-based access via SQLAlchemy
- pgAdmin included for database inspection and debugging

### Intended Data Storage
- Uploaded PDFs (or metadata)
- User queries
- Generated answers
- Summaries
- Audio file paths
- Timestamps

A pgAdmin container is included to simplify database inspection and debugging.

---

## 🤖 AI & NLP Capabilities

The system integrates Large Language Models (LLMs) for:

- **Question Answering** constrained to PDF content
- **Summarization** of long documents
- **Text-to-Speech (TTS)** for accessibility and multimodal output

The architecture is designed so each AI capability functions as an independent logical agent.

---

## 🚀 Getting Started

### Prerequisites
- Docker
- Docker Compose

### Run the application
```bash
docker-compose up --build
