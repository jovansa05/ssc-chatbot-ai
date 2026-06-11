from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse
from pathlib import Path
from urllib.parse import quote, unquote

from app.pdf_loader import extract_text_from_pdf
from app.chunker import chunk_text
from app.vector_store import save_chunks, delete_chunks_by_source

router = APIRouter()

BASE_DIR = Path(__file__).resolve().parents[2]
UPLOAD_FOLDER = BASE_DIR / "pdfs"

UPLOAD_FOLDER.mkdir(
    exist_ok=True
)


@router.post("/upload")
async def upload_pdf(
    file: UploadFile = File(...)
):
    if not file.filename:
        raise HTTPException(
            status_code=400,
            detail="Nama file tidak valid"
        )

    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(
            status_code=400,
            detail="Hanya file PDF yang diperbolehkan"
        )

    safe_filename = Path(
        file.filename
    ).name

    file_path = UPLOAD_FOLDER / safe_filename

    with open(
        file_path,
        "wb"
    ) as buffer:
        buffer.write(
            await file.read()
        )

    text = extract_text_from_pdf(
        str(file_path)
    )

    chunks = chunk_text(
        text
    )

    save_chunks(
        chunks,
        safe_filename
    )

    return {
        "message": "PDF berhasil diupload dan diindex",
        "filename": safe_filename,
        "chunks": len(chunks)
    }


@router.get("/documents")
def get_documents():
    files = []

    if not UPLOAD_FOLDER.exists():
        return files

    for file_path in UPLOAD_FOLDER.iterdir():
        if file_path.is_file() and file_path.suffix.lower() == ".pdf":
            files.append({
                "name": file_path.name,
                "url": f"/download/{quote(file_path.name)}",
                "size": file_path.stat().st_size
            })

    return files


@router.get("/download/{filename:path}")
def download_pdf(
    filename: str
):
    decoded_filename = unquote(
        filename
    )

    safe_filename = Path(
        decoded_filename
    ).name

    file_path = UPLOAD_FOLDER / safe_filename

    if not file_path.exists() or not file_path.is_file():
        raise HTTPException(
            status_code=404,
            detail=f"File PDF tidak ditemukan: {safe_filename}"
        )

    if file_path.suffix.lower() != ".pdf":
        raise HTTPException(
            status_code=400,
            detail="File bukan PDF"
        )

    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=safe_filename
    )


@router.delete("/documents/{filename:path}")
def delete_document(
    filename: str
):
    decoded_filename = unquote(
        filename
    )

    safe_filename = Path(
        decoded_filename
    ).name

    file_path = UPLOAD_FOLDER / safe_filename

    file_deleted = False

    if file_path.exists() and file_path.is_file():
        file_path.unlink()
        file_deleted = True

    chroma_result = delete_chunks_by_source(
        safe_filename
    )

    if not file_deleted and chroma_result.get("deleted", 0) == 0:
        raise HTTPException(
            status_code=404,
            detail=f"Dokumen tidak ditemukan: {safe_filename}"
        )

    return {
        "message": "Dokumen berhasil dihapus",
        "filename": safe_filename,
        "file_deleted": file_deleted,
        "chroma_deleted": chroma_result.get("deleted", 0),
        "chroma_message": chroma_result.get("message")
    }