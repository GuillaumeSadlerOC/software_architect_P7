package com.ycyw.chat.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Entity representing a chat session.
 *
 * A session is initiated by a client (connected or invited) 
 * and contains a set of messages exchanged with an agent.
 */
@Entity
@Table(name = "chat_sessions")
public class ChatSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /** User name (guest or logged in). */
    @Column(nullable = false, length = 100)
    private String userName;

    /** User email (optional for guests). */
    @Column(length = 255)
    private String userEmail;

    /** Session status: OPEN or CLOSED. */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private SessionStatus status = SessionStatus.OPEN;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    private Instant closedAt;

    @OneToMany(mappedBy = "chatSession", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sentAt ASC")
    private List<Message> messages = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }

    // ── Getters & Setters ──

    public UUID getId() { return id; }

    public String getUserName() { return userName; }
    public void setUserName(String userName) { this.userName = userName; }

    public String getUserEmail() { return userEmail; }
    public void setUserEmail(String userEmail) { this.userEmail = userEmail; }

    public SessionStatus getStatus() { return status; }
    public void setStatus(SessionStatus status) { this.status = status; }

    public Instant getCreatedAt() { return createdAt; }

    public Instant getClosedAt() { return closedAt; }
    public void setClosedAt(Instant closedAt) { this.closedAt = closedAt; }

    public List<Message> getMessages() { return messages; }

    public void addMessage(Message message) {
        messages.add(message);
        message.setChatSession(this);
    }

    public enum SessionStatus {
        OPEN, CLOSED
    }
}
