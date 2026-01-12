import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser

class SummarizationAgent:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",  # Using Flash for faster summarization
            google_api_key=self.api_key,
            temperature=0.3
        )

    async def generate_summary(self, text: str) -> str:
        """
        Generates a concise summary of the provided text asynchronously.
        """
        template = """Provide a concise summary of the following document content. 
        Focus on the main topics and key takeaways. Keep the summary concise and under 200 words for optimal readability and audio narration.
        
        Content: {text}
        
        Summary:"""
        prompt = ChatPromptTemplate.from_template(template)
        
        chain = prompt | self.llm | StrOutputParser()
        
        return await chain.ainvoke({"text": text})
