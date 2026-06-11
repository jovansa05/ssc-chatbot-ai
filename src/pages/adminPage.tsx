import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaUpload,
  FaTrash,
  FaEye,
  FaFilePdf,
  FaTimes,
} from "react-icons/fa";

interface Document {
  id: string;
  name: string;
  size: number;
  type: string;
  lastModified: Date;
  url?: string;
  file?: File;
}

function AdminPage() {
  const navigate = useNavigate();

  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loadingDocuments, setLoadingDocuments] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    docId: string | null;
    docName: string | null;
  }>({
    isOpen: false,
    docId: null,
    docName: null,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const ADMIN_PASSWORD = "admin123";
  const API_BASE_URL = "http://localhost:8000";

  const loadDocuments = async () => {
    try {
      setLoadingDocuments(true);

      const response = await fetch(`${API_BASE_URL}/documents`);

      if (!response.ok) {
        throw new Error("Gagal mengambil daftar dokumen");
      }

      const data = await response.json();

      const docs = data.map((file: any, index: number) => ({
        id: index.toString(),
        name: file.name,
        url: file.url,
        size: file.size || 0,
        type: "application/pdf",
        lastModified: new Date(),
      }));

      setDocuments(docs);
    } catch (error) {
      console.error("Error load documents:", error);
      setUploadStatus("❌ Gagal mengambil daftar dokumen dari backend!");
    } finally {
      setLoadingDocuments(false);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const handlePasswordSubmit = () => {
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setPasswordError(false);
      setPasswordInput("");
    } else {
      setPasswordError(true);
      setPasswordInput("");
    }
  };

  const handleKeyDownPassword = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      handlePasswordSubmit();
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) {
      return "0 Bytes";
    }

    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return (
      parseFloat((bytes / Math.pow(k, i)).toFixed(2)) +
      " " +
      sizes[i]
    );
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (file && file.type === "application/pdf") {
      setSelectedFile(file);
      setUploadStatus("");

      const previewUrl = URL.createObjectURL(file);
      setFilePreview(previewUrl);
    } else {
      setUploadStatus("❌ Hanya file PDF yang diperbolehkan!");
      setSelectedFile(null);
      setFilePreview(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadStatus("⚠️ Pilih file PDF terlebih dahulu!");
      return;
    }

    try {
      const formData = new FormData();

      formData.append("file", selectedFile);

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.message || "Upload gagal"
        );
      }

      await loadDocuments();

      setUploadStatus("✅ PDF berhasil diupload!");

      setSelectedFile(null);
      setFilePreview(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      setTimeout(() => {
        setUploadStatus("");
      }, 3000);
    } catch (error) {
      console.error("Error upload PDF:", error);
      setUploadStatus("❌ Upload gagal!");
    }
  };

  const openDeleteModal = (id: string, name: string) => {
    setDeleteModal({
      isOpen: true,
      docId: id,
      docName: name,
    });
  };

  const closeDeleteModal = () => {
    setDeleteModal({
      isOpen: false,
      docId: null,
      docName: null,
    });
  };

  const confirmDelete = async () => {
    if (!deleteModal.docName) {
      closeDeleteModal();
      return;
    }

    try {
      const response = await fetch(
        `${API_BASE_URL}/documents/${encodeURIComponent(deleteModal.docName)}`,
        {
          method: "DELETE",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.message || "Gagal menghapus dokumen"
        );
      }

      await loadDocuments();

      setUploadStatus(
        `✅ File berhasil dihapus! Chunk terhapus dari ChromaDB: ${data.chroma_deleted}`
      );

      setTimeout(() => {
        setUploadStatus("");
      }, 3000);
    } catch (error) {
      console.error("Error delete document:", error);

      setUploadStatus("❌ Gagal menghapus file!");
    } finally {
      closeDeleteModal();
    }
  };

  const handleView = (doc: Document) => {
    if (doc.url) {
      window.open(`${API_BASE_URL}${doc.url}`, "_blank");
      return;
    }

    window.open(
      `${API_BASE_URL}/download/${encodeURIComponent(doc.name)}`,
      "_blank"
    );
  };

  const cancelPreview = () => {
    setSelectedFile(null);
    setFilePreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const adminContent = (
    <div className="admin-card">
      <button
        className="admin-back-btn"
        onClick={() => navigate("/")}
      >
        <span style={{ marginRight: "8px" }}>
          <FaArrowLeft />
        </span>
        Kembali
      </button>

      <h1>SSC Admin Panel</h1>

      <p>
        Upload atau perbarui dokumen akademik yang digunakan
        chatbot.
      </p>

      <div className="upload-section">
        <h2>Upload PDF Baru</h2>

        <div className="file-upload-wrapper">
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            ref={fileInputRef}
            id="file-upload"
            className="file-upload-input"
          />

          <label
            htmlFor="file-upload"
            className="file-upload-label"
          >
            <span className="file-upload-icon">📁</span>

            <span className="file-upload-text">
              {selectedFile
                ? selectedFile.name
                : "Pilih file PDF..."}
            </span>

            <span className="file-upload-browse">
              Browse
            </span>
          </label>
        </div>

        {selectedFile && filePreview && (
          <div className="preview-container">
            <div className="preview-header">
              <strong>
                📄 Preview: {selectedFile.name}
              </strong>

              <button
                className="preview-cancel"
                onClick={cancelPreview}
              >
                ✕
              </button>
            </div>

            <div className="preview-actions">
              <button
                className="preview-btn"
                onClick={() =>
                  window.open(filePreview, "_blank")
                }
              >
                <span style={{ marginRight: "6px" }}>
                  <FaEye />
                </span>
                Lihat Preview
              </button>
            </div>

            <div className="file-info">
              <p>Ukuran: {formatFileSize(selectedFile.size)}</p>
              <p>Jenis: {selectedFile.type}</p>
            </div>
          </div>
        )}

        <button
          className="upload-btn"
          onClick={handleUpload}
        >
          <span style={{ marginRight: "8px" }}>
            <FaUpload />
          </span>
          Upload Dokumen
        </button>

        {uploadStatus && (
          <div
            className={`upload-status ${uploadStatus.includes("✅")
                ? "success"
                : "error"
              }`}
          >
            {uploadStatus}
          </div>
        )}
      </div>

      <div className="admin-divider" />

      <div className="document-section">
        <div className="doc-section-header">
          <h2>Dokumen Saat Ini</h2>

          <span className="doc-count">
            {documents.length} file
          </span>
        </div>

        {loadingDocuments ? (
          <div className="doc-empty">
            Memuat dokumen...
          </div>
        ) : documents.length === 0 ? (
          <div className="doc-empty">
            Belum ada dokumen. Upload file PDF pertama Anda!
          </div>
        ) : (
          <ul className="doc-list">
            {documents.map((doc) => (
              <li
                key={doc.id}
                className="doc-item"
              >
                <span
                  style={{
                    fontSize: "24px",
                    color: "#c80000",
                    flexShrink: 0,
                  }}
                >
                  <FaFilePdf />
                </span>

                <div className="doc-info">
                  <span className="doc-name">
                    {doc.name}
                  </span>

                  <span className="doc-meta">
                    {formatFileSize(doc.size)} •{" "}
                    {formatDate(doc.lastModified)}
                  </span>
                </div>

                <div className="doc-actions">
                  <button
                    className="doc-view-btn"
                    onClick={() => handleView(doc)}
                    title="Lihat dokumen"
                  >
                    <FaEye />
                  </button>

                  <button
                    className="doc-delete-btn"
                    onClick={() =>
                      openDeleteModal(doc.id, doc.name)
                    }
                    title="Hapus dokumen"
                  >
                    <FaTrash />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );

  if (!isAuthenticated) {
    return (
      <div className="admin-container-blur">
        <div className="blurred">
          {adminContent}
        </div>

        <div className="password-modal-overlay">
          <div className="password-modal">
            <div className="password-modal-header">
              <h3>🔐 Admin Access Required</h3>
            </div>

            <div className="password-modal-body">
              <p>
                Masukkan password untuk mengakses halaman
                admin:
              </p>

              <input
                type="password"
                placeholder="Password"
                value={passwordInput}
                onChange={(e) =>
                  setPasswordInput(e.target.value)
                }
                onKeyDown={handleKeyDownPassword}
                autoFocus
                className={
                  passwordError
                    ? "password-input-error"
                    : ""
                }
              />

              {passwordError && (
                <div className="password-error-msg">
                  ❌ Password salah! Silakan coba lagi.
                </div>
              )}
            </div>

            <div className="password-modal-footer">
              <button
                className="password-btn-cancel"
                onClick={() => navigate("/")}
              >
                Batal
              </button>

              <button
                className="password-btn-submit"
                onClick={handlePasswordSubmit}
              >
                Masuk
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="admin-container">
        {adminContent}
      </div>

      {deleteModal.isOpen && (
        <div
          className="delete-modal-overlay"
          onClick={closeDeleteModal}
        >
          <div
            className="delete-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="delete-modal-header">
              <h3>🗑️ Hapus File</h3>

              <button
                className="delete-modal-close"
                onClick={closeDeleteModal}
              >
                <FaTimes />
              </button>
            </div>

            <div className="delete-modal-body">
              <p>
                Apakah Anda yakin ingin menghapus file ini?
              </p>

              <div className="delete-file-name">
                {deleteModal.docName}
              </div>
            </div>

            <div className="delete-modal-footer">
              <button
                className="delete-btn-cancel"
                onClick={closeDeleteModal}
              >
                Batal
              </button>

              <button
                className="delete-btn-confirm"
                onClick={confirmDelete}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default AdminPage;