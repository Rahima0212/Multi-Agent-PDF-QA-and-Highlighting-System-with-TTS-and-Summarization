import os
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.messages import HumanMessage, AIMessage
from langchain_core.output_parsers import StrOutputParser

class QAAgent:
    def __init__(self, api_key: str = None):
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=self.api_key,
            temperature=0
        )

    async def get_answer(self, context: str, question: str, chat_history: list = None) -> dict:
        """
        Answers a question based on the provided context and chat history using Gemini asynchronously.
        Uses a 'condense question' pattern to resolve references like 'it' or 'that'.
        Returns a dict with 'answer' and 'quotes'.
        """
        # 1. Resolve references if there is history
        standalone_question = question
        if chat_history and len(chat_history) > 0:
            condense_template = """Given the following conversation and a follow-up question, rephrase the follow-up question to be a standalone question, in its original language.
            
            Chat History:
            {chat_history}
            Follow-up Question: {question}
            Standalone question:"""
            
            condense_prompt = ChatPromptTemplate.from_template(condense_template)
            condense_chain = condense_prompt | self.llm | StrOutputParser()
            
            # Format history for the condenser
            history_str = "\n".join([f"Human: {h['query']}\nAssistant: {h['answer']}" for h in chat_history])
            
            print(f"DEBUG: Re-writing question for context...")
            standalone_question = await condense_chain.ainvoke({
                "chat_history": history_str,
                "question": question
            })
            print(f"DEBUG: Standalone Question: {standalone_question}")

        # 2. Final Answer Generation with Quote Extraction
        template = """You are an intelligent AI assistant. Answer the question based ONLY on the provided document context.
        
        IMPORTANT: Your output MUST be in valid JSON format with two keys:
        - "answer": Your detailed response to the user.
        - "quotes": A list of short, exact strings (excerpts) from the source text that justify your answer.
        
        Example JSON output:
        {{
            "answer": "The project uses PostgreSQL.",
            "quotes": ["Database Type: You must use PostgreSQL", "local PostgreSQL instance"]
        }}

        Context:
        {context}
        
        Question: {question}
        JSON Response:"""
        
        prompt = ChatPromptTemplate.from_template(template)
        # Use a higher temperature for the answer if needed, but 0 is safer for JSON
        chain = prompt | self.llm | StrOutputParser()
        
        raw_response = await chain.ainvoke({
            "context": context,
            "question": standalone_question
        })
        
        import json
        try:
            # Clean potential markdown code blocks
            clean_json = raw_response.strip()
            if clean_json.startswith("```json"):
                clean_json = clean_json[7:]
            if clean_json.endswith("```"):
                clean_json = clean_json[:-3]
            
            parsed = json.loads(clean_json)
            return {
                "answer": parsed.get("answer", "No answer generated."),
                "quotes": parsed.get("quotes", [])
            }
        except Exception as e:
            print(f"Error parsing JSON response from LLM: {e}")
            return {"answer": raw_response, "quotes": []}
