package com.ycyw.chat.service;
 
import com.ycyw.chat.dto.ChatDtos.*;
import com.ycyw.chat.entity.ChatSession;
import com.ycyw.chat.entity.Message;
import com.ycyw.chat.repository.ChatSessionRepository;
import com.ycyw.chat.repository.MessageRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
 
import java.time.Instant;
import java.util.List;
import java.util.UUID;

/**
 * Business service for managing chat sessions and messages.
 *
 * Responsibilities :
 * - Creating and closing sessions
 * - Persistence of messages in a PostgreSQL database
 * - Entity → DTO Transformations
 *
 * In production, this service would be complemented by :
 * - A queuing system (estimating waiting time)
 * - Integration with the authentication system (JWT → userId)
 * - Push notifications for agents
 */
@Service
@Transactional
public class ChatService {
 
    private static final Logger log = LoggerFactory.getLogger(ChatService.class);
 
    private final ChatSessionRepository sessionRepository;
    private final MessageRepository messageRepository;
 
    public ChatService(ChatSessionRepository sessionRepository,
                       MessageRepository messageRepository) {
        this.sessionRepository = sessionRepository;
        this.messageRepository = messageRepository;
    }

    /**
     * Create a new chat session.
     * Automatically adds a welcome system message.
     */
    public SessionDetailResponse createSession(CreateSessionRequest request) {
        ChatSession session = new ChatSession();
        session.setUserName(request.userName());
        session.setUserEmail(request.userEmail());
        session.setStatus(ChatSession.SessionStatus.OPEN);

        // Welcome system message
        Message welcome = new Message();
        welcome.setSenderType(Message.SenderType.SYSTEM);
        welcome.setContent("Bienvenue " + request.userName()
                + " ! Un agent va vous répondre dans quelques instants.");
        session.addMessage(welcome);
 
        ChatSession saved = sessionRepository.save(session);
        log.info("Session créée : {} pour {}", saved.getId(), request.userName());
        return SessionDetailResponse.from(saved);
    }

    /**
     * Adds a message to an existing session and returns the event to be
     * streamed via WebSocket.
     */
    public ChatMessageEvent addMessage(UUID sessionId, String content,
                                        Message.SenderType senderType) {
        ChatSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Session introuvable : " + sessionId));
 
        if (session.getStatus() == ChatSession.SessionStatus.CLOSED) {
            throw new IllegalStateException("Impossible d'écrire dans une session fermée.");
        }
 
        Message message = new Message();
        message.setSenderType(senderType);
        message.setContent(content);
        session.addMessage(message);
 
        messageRepository.save(message);
        log.debug("Message ajouté à la session {} par {}", sessionId, senderType);
 
        return new ChatMessageEvent(
                message.getId(),
                sessionId,
                senderType.name(),
                content,
                message.getSentAt()
        );
    }

    /**
     * Close a chat session.
     */
    public SessionSummaryResponse closeSession(UUID sessionId) {
        ChatSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Session introuvable : " + sessionId));
 
        session.setStatus(ChatSession.SessionStatus.CLOSED);
        session.setClosedAt(Instant.now());

        // Message système de clôture
        Message closeMsg = new Message();
        closeMsg.setSenderType(Message.SenderType.SYSTEM);
        closeMsg.setContent("La session a été fermée. Merci de votre visite !");
        session.addMessage(closeMsg);
 
        sessionRepository.save(session);
        log.info("Session fermée : {}", sessionId);
        return SessionSummaryResponse.from(session);
    }

    /**
     * Deletes a chat session and all its messages (cascade).
     */
    public void deleteSession(UUID sessionId) {
        ChatSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Session introuvable : " + sessionId));
        sessionRepository.delete(session);
        log.info("Session supprimée : {}", sessionId);
    }

    /**
     * Retrieves the complete details of a session (including all messages).
     */
    @Transactional(readOnly = true)
    public SessionDetailResponse getSession(UUID sessionId) {
        ChatSession session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Session introuvable : " + sessionId));
        return SessionDetailResponse.from(session);
    }

    /**
     * List of all sessions (summary, without messages).
     */
    @Transactional(readOnly = true)
    public List<SessionSummaryResponse> listSessions() {
        return sessionRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(SessionSummaryResponse::from)
                .toList();
    }

    /**
     * List of open sessions (agent view).
     */
    @Transactional(readOnly = true)
    public List<SessionSummaryResponse> listOpenSessions() {
        return sessionRepository
                .findByStatusOrderByCreatedAtDesc(ChatSession.SessionStatus.OPEN)
                .stream()
                .map(SessionSummaryResponse::from)
                .toList();
    }
}