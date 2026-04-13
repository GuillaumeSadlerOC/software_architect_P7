/**
 * REST API client for the Spring Boot backend.
 * The calls go through Traefik (same origin → no CORS in production).
 */

const API_BASE = "/api/chat/sessions";
 
export interface SessionSummary {
  id: string;
  userName: string;
  status: string;
  createdAt: string;
  closedAt: string | null;
  messageCount: number;
}
 
export interface MessageData {
  id: string;
  senderType: string;
  content: string;
  sentAt: string;
}
 
export interface SessionDetail {
  id: string;
  userName: string;
  userEmail: string | null;
  status: string;
  createdAt: string;
  closedAt: string | null;
  messages: MessageData[];
}

/** Create a new session. */
export async function createSession(
  userName: string,
  userEmail?: string
): Promise<SessionDetail> {
  const res = await fetch(API_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userName, userEmail: userEmail || null }),
  });
  if (!res.ok) throw new Error("Erreur lors de la création de la session");
  return res.json();
}

/** List all sessions. */
export async function listSessions(): Promise<SessionSummary[]> {
  const res = await fetch(API_BASE);
  if (!res.ok) throw new Error("Erreur lors du chargement des sessions");
  return res.json();
}

/** Retrieve session details. */
export async function getSession(sessionId: string): Promise<SessionDetail> {
  const res = await fetch(`${API_BASE}/${sessionId}`);
  if (!res.ok) throw new Error("Session introuvable");
  return res.json();
}

/** Close a session. */
export async function closeSession(
  sessionId: string
): Promise<SessionSummary> {
  const res = await fetch(`${API_BASE}/${sessionId}/close`, {
    method: "PATCH",
  });
  if (!res.ok) throw new Error("Erreur lors de la fermeture de la session");
  return res.json();
}
 
/** Delete a session (agent only). */
export async function deleteSession(sessionId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/${sessionId}`, {
    method: "DELETE",
  });
  if (!res.ok) throw new Error("Erreur lors de la suppression de la session");
}
