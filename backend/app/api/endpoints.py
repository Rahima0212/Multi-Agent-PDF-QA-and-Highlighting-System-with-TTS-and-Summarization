from fastapi import APIRouter, Depends, UploadFile, File, BackgroundTasks, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
from app.db.database import get_db, AsyncSessionLocal
from app.db import models
from app.schemas import schemas
from app.services.workflow import create_workflow, create_qa_workflow
import os


router = APIRouter()

processing_workflow = create_workflow()
qa_workflow = create_qa_workflow()

async def run_document_processing(doc_id: int, pdf_bytes: bytes):
    print(f"BACKEND_DEBUG: run_document_processing started for ID {doc_id}")
    async with AsyncSessionLocal() as db:
        try:
            inputs = {
                "pdf_bytes": pdf_bytes,
                "document_id": doc_id
            }
            await processing_workflow.ainvoke(inputs)
            print(f"BACKEND_DEBUG: Processing workflow complete for document {doc_id}")
        except Exception as e:
            print(f"CRITICAL DB ERROR processing document {doc_id}: {e}")
            await db.rollback()

@router.post("/upload-pdf", response_model=schemas.Document)
async def upload_pdf(background_tasks: BackgroundTasks, file: UploadFile = File(...), db: AsyncSession = Depends(get_db)):
    """
    API for uploading PDFs (Asynchronous).
    """
    content = await file.read()
    db_doc = models.Document(filename=file.filename, content=content)
    db.add(db_doc)
    await db.commit()
    await db.refresh(db_doc)
    
    # Save PDF to disk for serving
    pdf_path = f"/data/docs/{db_doc.id}.pdf"
    os.makedirs(os.path.dirname(pdf_path), exist_ok=True)
    with open(pdf_path, "wb") as f:
        f.write(content)
    
    # Trigger background processing - passing only ID and bytes to the background task
    background_tasks.add_task(run_document_processing, db_doc.id, content)
    return db_doc

@router.get("/documents", response_model=List[schemas.Document])
async def list_documents(db: AsyncSession = Depends(get_db)):
    """
    Retrieves all processing results.
    """
    query = select(models.Document).order_by(models.Document.created_at.desc())
    result = await db.execute(query)
    return result.scalars().all()

@router.get("/documents/{doc_id}", response_model=schemas.Document)
async def get_document(doc_id: int, db: AsyncSession = Depends(get_db)):
    """
    Retrieve specific document metadata.
    """
    query = select(models.Document).filter(models.Document.id == doc_id)
    result = await db.execute(query)
    doc = result.scalar_one_or_none()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.post("/documents/{doc_id}/query", response_model=schemas.Interaction)
async def query_document(doc_id: int, interaction: schemas.InteractionCreate, db: AsyncSession = Depends(get_db)):
    """
    API for querying the document using QA and Highlighting agents.
    """
    query = select(models.Document).filter(models.Document.id == interaction.document_id)
    result = await db.execute(query)
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not doc.text_content:
        raise HTTPException(status_code=400, detail="Document text extraction not yet complete")

    # Fetch chat history for this document (Memory Management)
    history_query = select(models.Interaction).filter(models.Interaction.document_id == interaction.document_id).order_by(models.Interaction.timestamp.asc())
    history_res = await db.execute(history_query)
    chat_history = history_res.scalars().all()
    
    # Convert to list of dicts for the agent
    history_list = [{"query": h.query, "answer": h.answer} for h in chat_history]
    print(f"MEMORY_DEBUG: Fetched {len(history_list)} past interactions for document {interaction.document_id}")
    if history_list:
        print(f"MEMORY_DEBUG: Latest history entry Query: {history_list[-1]['query'][:50]}...")

    inputs = {
        "text_content": doc.text_content,
        "query": interaction.query,
        "pdf_bytes": doc.content,
        "chat_history": history_list
    }
    
    # Orchestrate QA and Highlighting Agents via LangGraph
    result = await qa_workflow.ainvoke(inputs)
    
    # Log Interaction to DB
    db_interaction = models.Interaction(
        document_id=interaction.document_id,
        query=interaction.query,
        answer=result.get("answer"),
        quotes=result.get("quotes"),
        highlight_path=result.get("highlight_path")
    )
    db.add(db_interaction)
    await db.commit()
    await db.refresh(db_interaction)
    print(f"DB_LOG: Successfully logged interaction for document {interaction.document_id}")
    
    return db_interaction

@router.get("/documents/{doc_id}/interactions", response_model=List[schemas.Interaction])
async def get_interactions(doc_id: int, db: AsyncSession = Depends(get_db)):
    """
    Retrieve interaction logs and chat history.
    """
    query = select(models.Interaction).filter(models.Interaction.document_id == doc_id).order_by(models.Interaction.timestamp.asc())
    result = await db.execute(query)
    return result.scalars().all()

@router.post("/documents/{doc_id}/generate-audio")
async def generate_full_pdf_audio(doc_id: int, db: AsyncSession = Depends(get_db)):
    """
    Generate TTS audio for the full PDF text content using edge-tts (faster).
    """
    import edge_tts
    from app.services.workflow import clean_text_for_tts
    
    query = select(models.Document).filter(models.Document.id == doc_id)
    result = await db.execute(query)
    doc = result.scalar_one_or_none()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    if not doc.text_content:
        raise HTTPException(status_code=400, detail="Document text extraction not yet complete")
    
    # Generate audio filename
    audio_filename = f"full_audio_{doc_id}.mp3"
    audio_dir = "/data/audio"
    os.makedirs(audio_dir, exist_ok=True)
    file_path = os.path.join(audio_dir, audio_filename)
    
    # Clean text for TTS
    # Clean text for TTS
    clean_text = clean_text_for_tts(doc.text_content)
    
    # Use TTSAgent
    from app.agents.tts_agent import TTSAgent
    agent = TTSAgent()
    audio_path = await agent.generate_audio(clean_text)
    
    return {"audio_path": audio_path, "message": "Audio generated successfully"}

@router.post("/generate-selection-audio")
async def generate_selection_audio(text: str):
    """
    Generate TTS audio for selected text.
    """
    import edge_tts
    import uuid
    from app.services.workflow import clean_text_for_tts
    
    if not text or len(text.strip()) == 0:
        raise HTTPException(status_code=400, detail="No text provided")
    
    # Generate unique audio filename
    audio_filename = f"selection_{uuid.uuid4().hex[:8]}.mp3"
    audio_dir = "/data/audio"
    os.makedirs(audio_dir, exist_ok=True)
    file_path = os.path.join(audio_dir, audio_filename)
    
    # Clean text for TTS
    # Clean text for TTS
    clean_text = clean_text_for_tts(text)
    
    # Use TTSAgent
    from app.agents.tts_agent import TTSAgent
    agent = TTSAgent()
    audio_path = await agent.generate_audio(clean_text)
    
    return {"audio_path": audio_path, "message": "Selection audio generated successfully"}
