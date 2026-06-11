from fastapi import APIRouter
from pydantic import BaseModel
from urllib.parse import quote
from pathlib import Path

from app.vector_store import search_chunks
from app.groq_client import ask_groq

router = APIRouter()


class ChatRequest(BaseModel):
    message: str


last_sources = []


def is_asking_source(
    message: str
) -> bool:
    message = message.lower()

    source_keywords = [
        "sumber",
        "dokumen",
        "pdf",
        "referensi",
        "file",
        "download",
        "unduh"
    ]

    return any(
        keyword in message
        for keyword in source_keywords
    )


def get_source_name(
    source
):
    if isinstance(source, dict):
        source_name = source.get(
            "source"
        )
    elif isinstance(source, str):
        source_name = source
    else:
        return None

    if not source_name:
        return None

    return Path(
        source_name
    ).name


def normalize_sources(
    sources
):
    clean_sources = []

    for source in sources:
        source_name = get_source_name(
            source
        )

        if source_name and source_name not in clean_sources:
            clean_sources.append(
                source_name
            )

    return clean_sources


@router.post("/chat")
def chat(
    request: ChatRequest
):
    global last_sources

    user_message = request.message.strip()

    if is_asking_source(
        user_message
    ):
        if last_sources:
            files = []

            for source_name in last_sources:
                files.append({
                    "name": source_name,
                    "url": f"/download/{quote(source_name)}"
                })

            return {
                "answer": "Berikut sumber dokumen yang digunakan:",
                "files": files,
                "file": files[0] if files else None
            }

        return {
            "answer": "Belum ada sumber dokumen terakhir. Silakan tanyakan informasi akademik terlebih dahulu.",
            "files": [],
            "file": None
        }

    search_result = search_chunks(
        user_message
    )

    documents = search_result[
        "documents"
    ]

    sources = search_result[
        "sources"
    ]

    context = "\n".join(
        documents
    )

    clean_sources = normalize_sources(
        sources
    )

    if clean_sources:
        last_sources = clean_sources

    answer = ask_groq(
        context,
        user_message
    )

    return {
        "answer": answer,
        "sources": clean_sources
    }