import fitz
from io import BytesIO
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.models import Document
from sqlalchemy import select

class ExtractionAgent:
    def extract_text(self, pdf_bytes: bytes) -> str:
        """Requirement: Extracts text from a PDF file provided as bytes."""
        text = ""
        with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
            for page in doc:
                text += page.get_text()
        return text

    def extract_metadata(self, pdf_bytes: bytes) -> dict:
        """Requirement: Extracts metadata from a PDF file."""
        with fitz.open(stream=pdf_bytes, filetype="pdf") as doc:
            return doc.metadata

    async def process_document(self, pdf_bytes: bytes, filename: str, db: AsyncSession):
        """
        Processes the document: updates the existing record with extracted text.
        (The record is created in the upload endpoint).
        """
        try:
            # 1. Extract Text
            text = self.extract_text(pdf_bytes)
            
            # 2. Extract Metadata (optional but good for context)
            metadata = self.extract_metadata(pdf_bytes)

            return {"text": text, "metadata": metadata}
        except Exception as e:
            print(f"Extraction Error: {e}")
            raise e