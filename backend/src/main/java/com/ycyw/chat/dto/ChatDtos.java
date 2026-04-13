package com.ycyw.chat.dto;

import com.ycyw.chat.entity.ChatSession;
import com.ycyw.chat.entity.Message;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Data Transfer Objects for REST API and WebSocket exchanges.
 * Strict separation between JPA entities and exposed objects.
 */
public class ChatDtos {

    private ChatDtos() {} // Utility class

    // ── Queries ──

    /** Request to create a chat session. */
    public record CreateSessionRequest(
        @NotBlank(message = "Le nom est requis")
        @Size(max = 100)
        String userName,

        @Size(max = 255)
        String userEmail
    ) {}

    /** Message sent via WebSocket (client → server). */
    public record SendMessageRequest(
        @NotBlank(message = "Le sessionId est requis")
        String sessionId,

        @NotBlank(message = "Le message ne peut pas être vide")
        @Size(max = 5000)
        String content,

        @NotBlank
        String senderType
    ) {}

    // ── Response ──

    /** Summary of a session (list). */
    public record SessionSummaryResponse(
        UUID id,
        String userName,
        String status,
        Instant createdAt,
        Instant closedAt,
        int messageCount
    ) {
        public static SessionSummaryResponse from(ChatSession session) {
            return new SessionSummaryResponse(
                session.getId(),
                session.getUserName(),
                session.getStatus().name(),
                session.getCreatedAt(),
                session.getClosedAt(),
                session.getMessages().size()
            );
        }
    }

    /** Full details of a session (including messages). */
    public record SessionDetailResponse(
        UUID id,
        String userName,
        String userEmail,
        String status,
        Instant createdAt,
        Instant closedAt,
        List<MessageResponse> messages
    ) {
        public static SessionDetailResponse from(ChatSession session) {
            return new SessionDetailResponse(
                session.getId(),
                session.getUserName(),
                session.getUserEmail(),
                session.getStatus().name(),
                session.getCreatedAt(),
                session.getClosedAt(),
                session.getMessages().stream()
                    .map(MessageResponse::from)
                    .toList()
            );
        }
    }

    /** Individual message. */
    public record MessageResponse(
        UUID id,
        String senderType,
        String content,
        Instant sentAt
    ) {
        public static MessageResponse from(Message message) {
            return new MessageResponse(
                message.getId(),
                message.getSenderType().name(),
                message.getContent(),
                message.getSentAt()
            );
        }
    }

    /** WebSocket notification (server → client). */
    public record ChatMessageEvent(
        UUID messageId,
        UUID sessionId,
        String senderType,
        String content,
        Instant sentAt
    ) {}

    /** Typing indicator. */
    public record TypingEvent(
        UUID sessionId,
        String senderType,
        boolean typing
    ) {}
}
