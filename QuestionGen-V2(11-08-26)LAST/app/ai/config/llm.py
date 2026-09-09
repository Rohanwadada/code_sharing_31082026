# comment oout the 2nd get_llm function if you want to use Google Gemini instead of Azure OpenAI

import os
from langchain_google_genai import ChatGoogleGenerativeAI
from dotenv import load_dotenv
from langchain_openai import AzureChatOpenAI


# Load environment variables from .env file if present
load_dotenv()

def get_llm(model_name: str = "gemini-1.5-flash"):
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY environment variable is not set")
        
    llm = ChatGoogleGenerativeAI(
        model=model_name,
        temperature=1.0,
        max_retries=2,
        google_api_key=api_key,
    )
    return llm


# def get_llm(model_name: str = "gpt-4o-mini"):
#     api_key = os.getenv("AZURE_OPENAI_API_KEY")
#     if not api_key:
#         raise ValueError("AZURE_OPENAI_API_KEY environment variable is not set")
        
#     llm = AzureChatOpenAI(
#     azure_deployment=os.environ.get("AZURE_OPENAI_DEPLOYMENT", "gpt-4o-mini"),
#     azure_endpoint=os.environ.get("AZURE_OPENAI_ENDPOINT"),
#     api_version=os.environ.get("AZURE_OPENAI_API_VERSION"),
#     temperature=0,
#     )
#     return llm
