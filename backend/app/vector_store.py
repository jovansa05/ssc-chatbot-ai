import chromadb
import uuid
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parents[1]
CHROMA_DIR = BASE_DIR / "chroma_db"

client = chromadb.PersistentClient(
    path=str(CHROMA_DIR)
)

collection = client.get_or_create_collection(
    name="ssc_documents"
)


def delete_chunks_by_source(filename: str):
    try:
        result = collection.get(
            where={
                "source": filename
            }
        )

        ids = result.get(
            "ids",
            []
        )

        if not ids:
            return {
                "deleted": 0,
                "message": "Tidak ada chunk yang ditemukan di ChromaDB"
            }

        collection.delete(
            ids=ids
        )

        return {
            "deleted": len(ids),
            "message": "Chunk berhasil dihapus dari ChromaDB"
        }

    except Exception as error:
        print("ERROR DELETE CHROMA:", error)

        return {
            "deleted": 0,
            "message": "Gagal menghapus chunk dari ChromaDB"
        }


def save_chunks(chunks, filename):
    if not chunks:
        return {
            "saved": 0,
            "message": "Tidak ada chunk yang disimpan"
        }

    # Hapus chunk lama dari file yang sama supaya tidak dobel saat upload ulang
    delete_chunks_by_source(
        filename
    )

    documents = []
    metadatas = []
    ids = []

    for index, chunk in enumerate(chunks):
        if not chunk or not chunk.strip():
            continue

        documents.append(
            chunk
        )

        metadatas.append({
            "source": filename,
            "chunk_index": index
        })

        ids.append(
            str(uuid.uuid4())
        )

    if not documents:
        return {
            "saved": 0,
            "message": "Chunk kosong, tidak ada yang disimpan"
        }

    collection.add(
        documents=documents,
        metadatas=metadatas,
        ids=ids
    )

    print("SAVED TO CHROMA:", filename)
    print("TOTAL CHUNKS SAVED:", len(documents))

    return {
        "saved": len(documents),
        "message": "Chunk berhasil disimpan ke ChromaDB"
    }


def search_chunks(query):
    results = collection.query(
        query_texts=[query],
        n_results=5,
        include=[
            "documents",
            "metadatas",
            "distances"
        ]
    )

    documents = results.get(
        "documents",
        [[]]
    )[0]

    metadatas = results.get(
        "metadatas",
        [[]]
    )[0]

    distances = results.get(
        "distances",
        [[]]
    )[0]

    print("QUERY:", query)
    print("SEARCH SOURCES:")

    for metadata, distance in zip(metadatas, distances):
        print(
            "-",
            metadata.get("source") if metadata else None,
            "| distance:",
            distance
        )

    return {
        "documents": documents,
        "sources": metadatas,
        "distances": distances
    }


def get_all_sources():
    try:
        result = collection.get(
            include=[
                "metadatas"
            ]
        )

        metadatas = result.get(
            "metadatas",
            []
        )

        source_counter = {}

        for metadata in metadatas:
            if not metadata:
                continue

            source = metadata.get(
                "source"
            )

            if not source:
                continue

            if source not in source_counter:
                source_counter[source] = 0

            source_counter[source] += 1

        sources = []

        for source, count in source_counter.items():
            sources.append({
                "source": source,
                "chunks": count
            })

        return sources

    except Exception as error:
        print("ERROR GET SOURCES:", error)
        return []


def get_collection_count():
    try:
        return collection.count()
    except Exception as error:
        print("ERROR COUNT CHROMA:", error)
        return 0


def delete_document(filename):
    return delete_chunks_by_source(
        filename
    )