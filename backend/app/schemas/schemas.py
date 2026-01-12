from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List

class DocumentBase(BaseModel):
    filename: str

class DocumentCreate(DocumentBase):
    pass

class Document(DocumentBase):
    id: int
    text_content: Optional[str] = None
    summary: Optional[str] = None
    audio_path: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class InteractionBase(BaseModel):
    query: str

class InteractionCreate(InteractionBase):
    document_id: int

class Interaction(InteractionBase):
    id: int
    document_id: int
    answer: str
    quotes: Optional[List[str]] = None
    highlight_path: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True
