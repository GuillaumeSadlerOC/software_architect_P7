import { useRef, useCallback, useEffect, useState } from "react";
import { Client, IMessage } from "@stomp/stompjs";
import SockJS from "sockjs-client";

/**
 * Custom hook for STOMP WebSocket connection management.
 *
 * Handles:
 * - Connection/disconnection to the broker
 * - Session-specific topic subscriptions (messages + typing)
 * - Global session update subscription (cross-tab sync)
 * - Connection status (for visual indicator)
 */

interface ChatMessageEvent {
  messageId: string;
  sessionId: string;
  senderType: string;
  content: string;
  sentAt: string;
}

interface TypingEvent {
  sessionId: string;
  senderType: string;
  typing: boolean;
}

const WS_URL =
  typeof window !== "undefined"
    ? `${window.location.protocol === "https:" ? "https" : "http"}://${window.location.host}/ws/chat`
    : "http://localhost/ws/chat";

export function useChat() {
  const clientRef = useRef<Client | null>(null);
  const [connected, setConnected] = useState(false);
  const subscriptionsRef = useRef<Map<string, { unsubscribe: () => void }>>(new Map());

  /** Connect to the STOMP broker. */
  const connect = useCallback(() => {
    if (clientRef.current?.active) return;

    const stompClient = new Client({
      webSocketFactory: () => new SockJS(WS_URL) as WebSocket,
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      onConnect: () => {
        console.log("[WS] Connected to STOMP broker");
        setConnected(true);
      },
      onDisconnect: () => {
        console.log("[WS] Disconnected");
        setConnected(false);
      },
      onStompError: (frame) => {
        console.error("[WS] STOMP error:", frame.headers["message"]);
      },
    });

    stompClient.activate();
    clientRef.current = stompClient;
  }, []);

  /** Clean disconnection. */
  const disconnect = useCallback(() => {
    subscriptionsRef.current.forEach((sub) => sub.unsubscribe());
    subscriptionsRef.current.clear();
    clientRef.current?.deactivate();
    setConnected(false);
  }, []);

  /** Subscribe to messages for a specific session. */
  const subscribeToSession = useCallback(
    (
      sessionId: string,
      onMessage: (event: ChatMessageEvent) => void,
      onTyping?: (event: TypingEvent) => void
    ) => {
      if (!clientRef.current?.active) return;

      // Unsubscribe from previous subscriptions if they exist
      const existingMsg = subscriptionsRef.current.get(`msg-${sessionId}`);
      if (existingMsg) existingMsg.unsubscribe();
      const existingTyp = subscriptionsRef.current.get(`typ-${sessionId}`);
      if (existingTyp) existingTyp.unsubscribe();

      // Subscribe to messages
      const msgSub = clientRef.current.subscribe(
        `/topic/chat.${sessionId}`,
        (frame: IMessage) => {
          const event: ChatMessageEvent = JSON.parse(frame.body);
          onMessage(event);
        }
      );
      subscriptionsRef.current.set(`msg-${sessionId}`, msgSub);

      // Subscribe to typing indicator
      if (onTyping) {
        const typSub = clientRef.current.subscribe(
          `/topic/chat.${sessionId}.typing`,
          (frame: IMessage) => {
            const event: TypingEvent = JSON.parse(frame.body);
            onTyping(event);
          }
        );
        subscriptionsRef.current.set(`typ-${sessionId}`, typSub);
      }
    },
    []
  );

  /** Subscribe to global session updates (cross-tab synchronization). */
  const subscribeToSessionUpdates = useCallback(
    (onUpdate: () => void) => {
      if (!clientRef.current?.active) return;

      // Avoid duplicate subscription
      const existing = subscriptionsRef.current.get("session-updates");
      if (existing) existing.unsubscribe();

      const sub = clientRef.current.subscribe(
        "/topic/sessions",
        () => {
          onUpdate();
        }
      );
      subscriptionsRef.current.set("session-updates", sub);
    },
    []
  );

  /** Send a message via STOMP. */
  const sendMessage = useCallback(
    (sessionId: string, content: string, senderType: string) => {
      if (!clientRef.current?.active) return;
      clientRef.current.publish({
        destination: "/app/chat.send",
        body: JSON.stringify({ sessionId, content, senderType }),
      });
    },
    []
  );

  /** Send a typing indicator. */
  const sendTyping = useCallback(
    (sessionId: string, senderType: string, typing: boolean) => {
      if (!clientRef.current?.active) return;
      clientRef.current.publish({
        destination: "/app/chat.typing",
        body: JSON.stringify({ sessionId, senderType, typing }),
      });
    },
    []
  );

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connected,
    connect,
    disconnect,
    subscribeToSession,
    subscribeToSessionUpdates,
    sendMessage,
    sendTyping,
  };
}