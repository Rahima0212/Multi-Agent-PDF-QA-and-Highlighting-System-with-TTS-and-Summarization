from gtts import gTTS
import os
import uuid

class TTSAgent:
    def __init__(self, storage_dir: str = "/data/audio"):
        self.storage_dir = storage_dir
        if not os.path.exists(self.storage_dir):
            os.makedirs(self.storage_dir, exist_ok=True)

    def generate_audio(self, text: str) -> str:
        """
        Converts text to an MP3 audio file and returns the file path.
        """
        filename = f"{uuid.uuid4()}.mp3"
        file_path = os.path.join(self.storage_dir, filename)
        
        tts = gTTS(text=text, lang='en')
        tts.save(file_path)
        
        return file_path
