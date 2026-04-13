package com.ycyw.chat.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

/**
 * Entity representing a message in a chat session.
 *
 * Each message is time-stamped and identifies its sender
 * via the senderType field (CLIENT, AGENT or SYSTEM).
 */
@Entity
@Table(name = "messages", indexes = {
    @Index(name = "idx_message_session", columnList = "chat_session_id"),
    @Index(name = "idx_message_sent_at", columnList = "sentAt")
})
public class Message {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "chat_session_id", nullable = false)
    private ChatSession chatSession;

    /** Sender type: CLIENT, AGENT, or SYSTEM. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private SenderType senderType;

    /** Textual content of the message. */
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(nullable = false, updatable = false)
    private Instant sentAt;

    @PrePersist
    protected void onCreate() {
        this.sentAt = Instant.now();
    }

    // ── Getters & Setters ──

    public UUID getId() { return id; }

    public ChatSession getChatSession() { return chatSession; }
    public void setChatSession(ChatSession chatSession) { this.chatSession = chatSession; }

    public SenderType getSenderType() { return senderType; }
    public void setSenderType(SenderType senderType) { this.senderType = senderType; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public Instant getSentAt() { return sentAt; }

    public enum SenderType {
        CLIENT, AGENT, SYSTEM
    }
}
