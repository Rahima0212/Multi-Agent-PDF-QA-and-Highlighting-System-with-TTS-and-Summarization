from sqlalchemy import Column, Integer, String, Text, DateTime, LargeBinary, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
import datetime

Base = declarative_base()

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String, index=True)
    content = Column(LargeBinary)  # Storing PDF as blob
    text_content = Column(Text, nullable=True)
    summary = Column(Text, nullable=True)
    audio_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    interactions = relationship("Interaction", back_populates="document")

class Interaction(Base):
    __tablename__ = "interactions"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"))
    query = Column(Text)
    answer = Column(Text)
    quotes = Column(JSON, nullable=True)
    highlight_path = Column(String, nullable=True)  # Path to highlighted PDF
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    document = relationship("Document", back_populates="interactions")
