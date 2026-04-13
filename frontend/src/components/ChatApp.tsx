"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useChat } from "@/lib/useChat";
import {
  createSession,
  listSessions,
  getSession,
  closeSession as closeSessionApi,
  deleteSession as deleteSessionApi,
  SessionSummary,
  SessionDetail,
  MessageData,
} from "@/lib/api";

/**
 * Main component of the PoC Chat — Your Car Your Way.
 *
 * Demonstrates:
 * - Real-time WebSocket communication (STOMP / SockJS)
 * - Persistence of messages in PostgreSQL via Spring Boot
 * - Decoupled architecture (REST API + WebSocket)
 * - Real-time typing indicator (debounced)
 * - Client / Agent switch for demonstration
 * - Cross-tab session synchronization via WebSocket
 * - Accessibility: keyboard navigation, aria-live, focus management
 */
export default function ChatApp() {
  // ── State ──
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [activeSession, setActiveSession] = useState<SessionDetail | null>(null);
  const [messages, setMessages] = useState<MessageData[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [role, setRole] = useState<"CLIENT" | "AGENT">("CLIENT");
  const [typing, setTyping] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");

  // ── Refs ──
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingDisplayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep role in a ref so WebSocket callbacks always read the latest value
  const roleRef = useRef(role);
  useEffect(() => {
    roleRef.current = role;
  }, [role]);

  // ── WebSocket Hook ──
  const {
    connected,
    connect,
    subscribeToSession,
    subscribeToSessionUpdates,
    sendMessage,
    sendTyping,
  } = useChat();

  // ── Load sessions on mount ──
  useEffect(() => {
    connect();
    refreshSessions();
  }, [connect]);

  // Subscribe to global session updates (cross-tab sync)
  useEffect(() => {
    if (!connected) return;
    subscribeToSessionUpdates(() => {
      refreshSessions();
    });
  }, [connected, subscribeToSessionUpdates]);

  const refreshSessions = async () => {
    try {
      const data = await listSessions();
      setSessions(data);
    } catch (err) {
      console.error("Error loading sessions:", err);
    }
  };

  // ── Select a session ──
  const selectSession = useCallback(
    async (sessionId: string) => {
      try {
        const detail = await getSession(sessionId);
        setActiveSession(detail);
        setMessages(detail.messages);

        // Subscribe to real-time messages for this session
        subscribeToSession(
          sessionId,
          (event) => {
            const newMsg: MessageData = {
              id: event.messageId,
              senderType: event.senderType,
              content: event.content,
              sentAt: event.sentAt,
            };
            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;
              return [...prev, newMsg];
            });
            refreshSessions();
          },
          (event) => {
            // Use roleRef to always get the current role value
            if (event.senderType !== roleRef.current) {
              if (typingDisplayTimeoutRef.current) {
                clearTimeout(typingDisplayTimeoutRef.current);
              }
              if (event.typing) {
                setTyping(true);
                typingDisplayTimeoutRef.current = setTimeout(() => {
                  setTyping(false);
                }, 6000);
              } else {
                setTyping(false);
              }
            }
          }
        );

        setTimeout(() => inputRef.current?.focus(), 100);
      } catch (err) {
        console.error("Error loading session:", err);
      }
    },
    [subscribeToSession]
  );

  // ── Auto-scroll on new messages ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  // ── Create a new session ──
  const handleCreateSession = async () => {
    if (!userName.trim()) return;
    try {
      const session = await createSession(userName, userEmail);
      setShowModal(false);
      setUserName("");
      setUserEmail("");
      await refreshSessions();
      selectSession(session.id);
    } catch (err) {
      console.error("Error creating session:", err);
    }
  };

  // ── Send a message ──
  const handleSend = () => {
    if (!inputValue.trim() || !activeSession) return;
    sendMessage(activeSession.id, inputValue.trim(), role);
    setInputValue("");
    sendTyping(activeSession.id, role, false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    inputRef.current?.focus();
  };

  // ── Typing indicator (debounced send, stable display) ──
  const handleInputChange = (value: string) => {
    setInputValue(value);
    if (!activeSession) return;

    if (value.trim()) {
      // Always send typing:true — the receiver handles display stability
      sendTyping(activeSession.id, role, true);

      // Debounce the typing:false (sent after 5s of inactivity)
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        sendTyping(activeSession.id, role, false);
        typingTimeoutRef.current = null;
      }, 5000);
    } else {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      sendTyping(activeSession.id, role, false);
    }
  };

  // ── Close a session ──
  const handleCloseSession = async () => {
    if (!activeSession) return;
    try {
      await closeSessionApi(activeSession.id);
      setActiveSession(null);
      setMessages([]);
      await refreshSessions();
    } catch (err) {
      console.error("Error closing session:", err);
    }
  };

  // ── Delete a session (agent only) ──
  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Supprimer cette conversation ? Cette action est irréversible.")) return;
    try {
      await deleteSessionApi(sessionId);
      if (activeSession?.id === sessionId) {
        setActiveSession(null);
        setMessages([]);
      }
      await refreshSessions();
    } catch (err) {
      console.error("Error deleting session:", err);
    }
  };

  // ── Format time ──
  const formatTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // ── Render ──
  return (
    <div className="app-container">
      {/* ── Sidebar ── */}
      <aside className="sidebar" role="complementary" aria-label="Sessions de tchat">
        <div className="sidebar-header">
          <h1>Your Car Your Way</h1>
          <p>Support Client — PoC Tchat</p>
        </div>

        <div className="sidebar-actions">
          <button
            className="btn-new-session"
            onClick={() => setShowModal(true)}
            aria-label="Démarrer une nouvelle conversation"
          >
            + Nouvelle conversation
          </button>
        </div>

        {/* Role Toggle */}
        <div style={{ padding: "12px 16px", borderBottom: "1px solid #dee2e6" }}>
          <div className="role-toggle" role="radiogroup" aria-label="Rôle actif">
            <button
              className={role === "CLIENT" ? "active" : ""}
              onClick={() => setRole("CLIENT")}
              role="radio"
              aria-checked={role === "CLIENT"}
            >
              Client
            </button>
            <button
              className={role === "AGENT" ? "active" : ""}
              onClick={() => setRole("AGENT")}
              role="radio"
              aria-checked={role === "AGENT"}
            >
              Agent
            </button>
          </div>
        </div>

        {/* Connection Status */}
        <div className="connection-status">
          <span
            className={`status-dot ${connected ? "connected" : "disconnected"}`}
            aria-hidden="true"
          />
          <span>{connected ? "Connecté" : "Déconnecté"}</span>
        </div>

        {/* Sessions List */}
        <ul className="sessions-list" role="list" aria-label="Liste des conversations">
          {sessions.map((s) => (
            <li
              key={s.id}
              className={`session-item ${activeSession?.id === s.id ? "active" : ""}`}
              onClick={() => selectSession(s.id)}
              onKeyDown={(e) => e.key === "Enter" && selectSession(s.id)}
              tabIndex={0}
              role="button"
              aria-label={`Conversation avec ${s.userName}, ${s.status === "OPEN" ? "active" : "fermée"}`}
            >
              <div className="session-item-info">
                <h3>{s.userName}</h3>
                <p>
                  {formatTime(s.createdAt)} · {s.messageCount} message
                  {s.messageCount > 1 ? "s" : ""}
                </p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className={`session-status ${s.status.toLowerCase()}`}>
                  {s.status === "OPEN" ? "Active" : "Fermée"}
                </span>
                {role === "AGENT" && (
                  <button
                    className="btn-delete-session"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSession(s.id);
                    }}
                    aria-label={`Supprimer la conversation avec ${s.userName}`}
                    title="Supprimer"
                  >
                    ✕
                  </button>
                )}
              </div>
            </li>
          ))}
          {sessions.length === 0 && (
            <li style={{ padding: "20px", textAlign: "center", color: "#adb5bd" }}>
              Aucune conversation
            </li>
          )}
        </ul>
      </aside>

      {/* ── Chat Area ── */}
      <main className="chat-area">
        {activeSession ? (
          <>
            {/* Header */}
            <div className="chat-header">
              <h2>
                Conversation avec {activeSession.userName}
                {activeSession.status === "CLOSED" && (
                  <span style={{ color: "#adb5bd", fontWeight: 400, fontSize: "0.85rem" }}>
                    {" "} — Fermée
                  </span>
                )}
              </h2>
              {activeSession.status === "OPEN" && (
                <button
                  className="btn-close-session"
                  onClick={handleCloseSession}
                  aria-label="Fermer cette conversation"
                >
                  Fermer la session
                </button>
              )}
            </div>

            {/* Messages */}
            <div
              className="messages-container"
              role="log"
              aria-label="Messages de la conversation"
              aria-live="polite"
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message ${msg.senderType.toLowerCase()}`}
                >
                  <div>{msg.content}</div>
                  <div className="message-meta">
                    {msg.senderType === "CLIENT"
                      ? "Vous (Client)"
                      : msg.senderType === "AGENT"
                        ? "Agent"
                        : "Système"}{" "}
                    · {formatTime(msg.sentAt)}
                  </div>
                </div>
              ))}

              {typing && (
                <div className="typing-indicator" aria-live="polite">
                  {role === "CLIENT" ? "L'agent" : "Le client"} est en train
                  d&apos;écrire
                  <span>.</span>
                  <span>.</span>
                  <span>.</span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            {activeSession.status === "OPEN" && (
              <div className="chat-input-area">
                <label htmlFor="chat-input" className="sr-only">
                  Votre message
                </label>
                <input
                  id="chat-input"
                  ref={inputRef}
                  type="text"
                  className="chat-input"
                  placeholder={`Écrire en tant que ${role === "CLIENT" ? "client" : "agent"}...`}
                  value={inputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  disabled={!connected}
                  aria-label="Saisir votre message"
                />
                <button
                  className="btn-send"
                  onClick={handleSend}
                  disabled={!connected || !inputValue.trim()}
                  aria-label="Envoyer le message"
                >
                  Envoyer
                </button>
              </div>
            )}
          </>
        ) : (
          /* Empty State */
          <div className="empty-state">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <h2>Your Car Your Way — Tchat PoC</h2>
            <p>Sélectionnez ou créez une conversation pour commencer.</p>
          </div>
        )}
      </main>

      {/* ── Modal : Nouvelle session ── */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowModal(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Nouvelle conversation"
        >
          <div className="modal">
            <h2>Nouvelle conversation</h2>
            <p>Entrez vos informations pour démarrer un tchat avec notre support.</p>

            <label htmlFor="modal-name">Nom *</label>
            <input
              id="modal-name"
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateSession()}
              placeholder="Votre nom"
              autoFocus
              required
              aria-required="true"
            />

            <label htmlFor="modal-email">Email (optionnel)</label>
            <input
              id="modal-email"
              type="email"
              value={userEmail}
              onChange={(e) => setUserEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateSession()}
              placeholder="votre@email.com"
            />

            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>
                Annuler
              </button>
              <button
                className="btn-new-session"
                onClick={handleCreateSession}
                disabled={!userName.trim()}
                style={{ width: "auto" }}
              >
                Démarrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}