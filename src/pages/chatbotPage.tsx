import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaPaperPlane, FaRobot } from "react-icons/fa";
import { HiUserCircle } from "react-icons/hi2";
import logo from "../assets/logo-telkom.png";

interface MessageFile {
  name: string;
  url: string;
}

interface Message {
  id: number;
  role: "bot" | "user";
  text: string;
  time: string;
  file?: MessageFile;
}

function ChatbotPage() {
  const navigate = useNavigate();

  const API_BASE_URL = "http://localhost:8000";

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "bot",
      text: "Halo! 👋 Ada yang bisa saya bantu terkait informasi akademik?",
      time: new Date().toLocaleTimeString("id-ID", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [newMsgIds, setNewMsgIds] = useState<Set<number>>(
    new Set()
  );
  const [sendAnim, setSendAnim] = useState(false);

  const msgIdCounter = useRef(2);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const handleAdminClick = () => {
    navigate("/admin");
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages, isTyping]);

  const getCurrentTime = () => {
    return new Date().toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const normalizeFileUrl = (url: string) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      return url;
    }

    return `${API_BASE_URL}${url}`;
  };

  const addNewMessageAnimation = (id: number) => {
    setNewMsgIds((prev) => {
      const updated = new Set(prev);
      updated.add(id);
      return updated;
    });
  };

  const handleSend = async () => {
    if (!input.trim()) {
      return;
    }

    setSendAnim(true);

    setTimeout(() => {
      setSendAnim(false);
    }, 600);

    const userText = input.trim();
    const currentTime = getCurrentTime();

    setInput("");

    const userId = msgIdCounter.current++;

    setMessages((prev) => [
      ...prev,
      {
        id: userId,
        role: "user",
        text: userText,
        time: currentTime,
      },
    ]);

    addNewMessageAnimation(userId);

    setIsTyping(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userText,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.detail || data.message || "Gagal menghubungi server"
        );
      }

      const botId = msgIdCounter.current++;

      const botMessage: Message = {
        id: botId,
        role: "bot",
        text:
          data.answer ||
          "Maaf, saya belum mendapatkan jawaban dari server.",
        time: getCurrentTime(),
        file: data.file
          ? {
              name: data.file.name,
              url: normalizeFileUrl(data.file.url),
            }
          : undefined,
      };

      setMessages((prev) => [...prev, botMessage]);

      addNewMessageAnimation(botId);
    } catch (error) {
      console.error("Error chat:", error);

      const botId = msgIdCounter.current++;

      setMessages((prev) => [
        ...prev,
        {
          id: botId,
          role: "bot",
          text: "Maaf, terjadi kesalahan saat menghubungi server.",
          time: getCurrentTime(),
        },
      ]);

      addNewMessageAnimation(botId);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  const renderBotBubble = (msg: Message) => {
    return (
      <div
        key={msg.id}
        className={`message-row bot ${
          newMsgIds.has(msg.id) ? "msg-float-in" : ""
        }`}
      >
        <div className="avatar">
          <FaRobot />
        </div>

        <div className="bubble-wrapper">
          <div className="sender-name">PhilloBot</div>

          <div className="bot-bubble">
            <div className="bubble-text">
              {msg.text.split("\n").map((line, i, arr) => (
                <span key={i}>
                  {line}
                  {i < arr.length - 1 ? <br /> : null}
                </span>
              ))}
            </div>

            {msg.file ? (
              <div className="file-attachment">
                <div className="file-attachment-info">
                  <span className="file-attachment-icon">📄</span>

                  <span className="file-attachment-name">
                    {msg.file.name}
                  </span>
                </div>

                <a
                  href={msg.file.url}
                  download={msg.file.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="file-attachment-btn"
                >
                  ⬇ Download PDF
                </a>
              </div>
            ) : null}

            <div className="bubble-time">{msg.time}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderUserBubble = (msg: Message) => {
    return (
      <div
        key={msg.id}
        className={`message-row user ${
          newMsgIds.has(msg.id) ? "msg-float-in" : ""
        }`}
      >
        <div className="bubble-wrapper">
          <div className="sender-name user-name">Anda</div>

          <div className="user-bubble">
            <div className="bubble-text">{msg.text}</div>

            <div className="bubble-time">{msg.time}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="chatbot-container">
      <div className="chat-header">
        <div className="logo-circle">
          <img src={logo} alt="Logo" />
        </div>

        <div className="header-text">
          <h1>SSC Akademik - Chatbot</h1>

          <p className="header-subtitle">
            Tanya Apapun Seputar Akademik!
          </p>
        </div>

        <button className="admin-icon" onClick={handleAdminClick}>
          <HiUserCircle />
        </button>
      </div>

      <div className="chat-area">
        <div className="chat-date">Hari Ini</div>

        {messages.map((msg) =>
          msg.role === "bot"
            ? renderBotBubble(msg)
            : renderUserBubble(msg)
        )}

        {isTyping && (
          <div className="message-row bot msg-float-in">
            <div className="avatar">
              <FaRobot />
            </div>

            <div className="bubble-wrapper">
              <div className="sender-name">PhilloBot</div>

              <div className="bot-bubble typing-bubble">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      <div className="input-area">
        <input
          type="text"
          placeholder="Ketik pertanyaan Anda..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isTyping}
        />

        <button
          onClick={handleSend}
          className={sendAnim ? "plane-fly" : ""}
          disabled={isTyping}
        >
          <FaPaperPlane />
        </button>
      </div>
    </div>
  );
}

export default ChatbotPage;