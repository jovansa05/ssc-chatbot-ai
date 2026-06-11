from fastapi import FastAPI
from app.routes.upload import router as upload_router
from app.routes.pdf import router as pdf_router
from app.routes.chat import router as chat_router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.include_router(upload_router)
app.include_router(pdf_router)
app.include_router(chat_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {
        "status": "success",
        "message": "SSC Chatbot Backend Running"
    }