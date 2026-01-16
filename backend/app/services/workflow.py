from typing import TypedDict, Annotated, List, Union
from langgraph.graph import StateGraph, END
import operator
import os
import time
import asyncio
from app.db.database import AsyncSessionLocal
from app.db import models
from sqlalchemy import select

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

async def extraction_node(state: AgentState):
    start_time = time.perf_counter()
    print("DEBUG: Starting Extraction Node")
    try:
        from app.agents.extraction_agent import ExtractionAgent
        agent = ExtractionAgent()
        # Extraction can be CPU bound, but since it's PyMuPDF it's usually fast.
        # We can run it in a thread if needed, but for now we'll just await if it were async.
        text = await agent.extract_text(state["pdf_bytes"])
        metadata = await agent.extract_metadata(state["pdf_bytes"])
        duration = time.perf_counter() - start_time
        print(f"PERF_DEBUG: Extraction took {duration:.2f}s. Text length: {len(text)}")
        
        # Immediate DB Update for Text Readiness
        async with AsyncSessionLocal() as db:
            query = select(models.Document).filter(models.Document.id == state["document_id"])
            res = await db.execute(query)
            db_doc = res.scalar_one_or_none()
            if db_doc:
                db_doc.text_content = text
                await db.commit()
                print(f"DB_LOG: Partial update - Extraction complete for doc {state['document_id']}")

        return {"text_content": text, "metadata": metadata}
    except Exception as e:
        print(f"CRITICAL ERROR in extraction_node: {e}")
        raise e

async def summarization_node(state: AgentState):
    start_time = time.perf_counter()
    print("DEBUG: Starting Summarization Node")
    try:
        from app.agents.summarization_agent import SummarizationAgent
        agent = SummarizationAgent()
        summary = await agent.generate_summary(state["text_content"])
        duration = time.perf_counter() - start_time
        print(f"PERF_DEBUG: Summarization took {duration:.2f}s. Summary length: {len(summary)}")
        
        # Immediate DB Update for Summary Readiness
        async with AsyncSessionLocal() as db:
            query = select(models.Document).filter(models.Document.id == state["document_id"])
            res = await db.execute(query)
            db_doc = res.scalar_one_or_none()
            if db_doc:
                db_doc.summary = summary
                await db.commit()
                print(f"DB_LOG: Partial update - Summary complete for doc {state['document_id']}")

        return {"summary": summary}
    except Exception as e:
        print(f"CRITICAL ERROR in summarization_node: {e}")
        raise e

import re

def clean_text_for_tts(text: str) -> str:
    """Removes markdown artifacts for cleaner audio narration."""
    # Remove headings (###)
    text = re.sub(r'#+\s*', '', text)
    # Remove bold/italic (**, *)
    text = re.sub(r'\*+', '', text)
    # Remove bullet points
    text = re.sub(r'^\s*[\-\*\+]\s+', '', text, flags=re.MULTILINE)
    # Remove numbering
    text = re.sub(r'^\s*\d+\.\s+', '', text, flags=re.MULTILINE)
    return text.strip()

async def tts_node(state: dict):
    start_time = time.perf_counter()
    summary_text = state.get("summary")
    doc_id = state.get("document_id")
    
    print(f"DEBUG: Starting TTS Node for doc_id: {doc_id}")
    if not summary_text:
        return {"audio_path": None}

    try:
        audio_filename = f"audio_{doc_id}.mp3"
        audio_dir = "/data/audio"
        os.makedirs(audio_dir, exist_ok=True)
        file_path = os.path.join(audio_dir, audio_filename)

        # Clean text for TTS
        clean_text = clean_text_for_tts(summary_text)

        # Use new Async TTS Agent
        from app.agents.tts_agent import TTSAgent
        agent = TTSAgent()
        audio_path = await agent.generate_audio(clean_text)
        
        # Extract filename from path for logging
        audio_filename = os.path.basename(audio_path)

        duration = time.perf_counter() - start_time
        print(f"PERF_DEBUG: TTS took {duration:.2f}s. Path: /data/audio/{audio_filename}")
        
        audio_path = f"/data/audio/{audio_filename}"
        
        # Immediate DB Update for Audio Readiness
        async with AsyncSessionLocal() as db:
            query = select(models.Document).filter(models.Document.id == doc_id)
            res = await db.execute(query)
            db_doc = res.scalar_one_or_none()
            if db_doc:
                db_doc.audio_path = audio_path
                await db.commit()
                print(f"DB_LOG: Partial update - Audio complete for doc {doc_id}")

        return {"audio_path": audio_path}
    except Exception as e:
        print(f"CRITICAL ERROR in TTS Node: {e}")
        return {"audio_path": None}

async def qa_node(state: AgentState):
    start_time = time.perf_counter()
    print(f"DEBUG: Starting QA Node for query: {state['query']}")
    try:
        from app.agents.qa_agent import QAAgent
        agent = QAAgent()
        qa_result = await agent.get_answer(state["text_content"], state["query"], state.get("chat_history", []))
        duration = time.perf_counter() - start_time
        print(f"PERF_DEBUG: QA took {duration:.2f}s")
        return {"answer": qa_result["answer"], "quotes": qa_result.get("quotes", [])}
    except Exception as e:
        print(f"CRITICAL ERROR in qa_node: {e}")
        raise e

async def highlighting_node(state: AgentState):
    start_time = time.perf_counter()
    print("DEBUG: Starting Highlighting Node")
    try:
        from app.agents.highlighting_agent import HighlightingAgent
        agent = HighlightingAgent()
        # Use the extracted quotes for high-precision highlighting
        highlight_path = await agent.highlight_text(state["pdf_bytes"], state.get("quotes", []))
        duration = time.perf_counter() - start_time
        print(f"PERF_DEBUG: Highlighting took {duration:.2f}s. Path: {highlight_path}")
        return {"highlight_path": highlight_path}
    except Exception as e:
        print(f"CRITICAL ERROR in highlighting_node: {e}")
        raise e

def create_workflow():
    workflow = StateGraph(AgentState)

    workflow.add_node("extract", extraction_node)
    workflow.add_node("summarize", summarization_node)
    workflow.add_node("tts", tts_node)
    
    workflow.set_entry_point("extract")
    workflow.add_edge("extract", "summarize")
    workflow.add_edge("summarize", "tts")
    workflow.add_edge("tts", END)

    return workflow.compile()

def create_qa_workflow():
    workflow = StateGraph(AgentState)

    workflow.add_node("qa", qa_node)
    workflow.add_node("highlight", highlighting_node)
    
    workflow.set_entry_point("qa")
    workflow.add_edge("qa", "highlight")
    workflow.add_edge("highlight", END)

    return workflow.compile()
