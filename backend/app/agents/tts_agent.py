import os
import uuid
import edge_tts

class TTSAgent:
    def __init__(self, storage_dir: str = "/data/audio"):
        self.storage_dir = storage_dir
        if not os.path.exists(self.storage_dir):
            os.makedirs(self.storage_dir, exist_ok=True)

    async def generate_audio(self, text: str) -> str:
        """
        Converts text to an MP3 audio file using edge-tts (async) and returns the file path.
        """
        filename = f"{uuid.uuid4()}.mp3"
        file_path = os.path.join(self.storage_dir, filename)
        
        communicate = edge_tts.Communicate(text, "en-US-AriaNeural")
        await communicate.save(file_path)
        
        return file_path
