import os
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

client = Groq(
    api_key=os.getenv("GROQ_API_KEY")
)

def ask_groq(context, question):

    prompt = f"""
    Kamu adalah chatbot SSC Universitas Telkom Surabaya.

    Jawab pertanyaan hanya berdasarkan context berikut.

    Context:
    {context}

    Pertanyaan:
    {question}
    """

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return response.choices[0].message.content