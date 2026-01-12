import fitz  # PyMuPDF
import os
import uuid

class HighlightingAgent:
    def __init__(self, storage_dir: str = "/data/highlights"):
        self.storage_dir = storage_dir
        if not os.path.exists(self.storage_dir):
            os.makedirs(self.storage_dir, exist_ok=True)

    def highlight_text(self, pdf_bytes: bytes, quotes: list) -> str:
        """
        Highlights specific quotes in a PDF and returns the relative path to the saved file.
        """
        if not quotes:
            print("DEBUG: No quotes provided for highlighting.")
            return None

        try:
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            highlighted = False
            
            for quote in quotes:
                if not quote or len(quote.strip()) < 5:  # Skip too short/empty quotes
                    continue
                
                print(f"DEBUG: Searching to highlight quote: {quote[:50]}...")
                for page in doc:
                    text_instances = page.search_for(quote)
                    for inst in text_instances:
                        page.add_highlight_annot(inst)
                        highlighted = True
            
            if highlighted:
                filename = f"highlighted_{uuid.uuid4()}.pdf"
                file_path = os.path.join(self.storage_dir, filename)
                doc.save(file_path)
                doc.close()
                # Return relative path for frontend access
                return f"/data/highlights/{filename}"
            else:
                print("DEBUG: No matches found for any quotes in PDF.")
                doc.close()
                return None
                
        except Exception as e:
            print(f"CRITICAL ERROR in HighlightingAgent: {e}")
            return None
