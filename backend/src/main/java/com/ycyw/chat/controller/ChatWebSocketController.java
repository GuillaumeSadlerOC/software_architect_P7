package com.ycyw.chat.controller;

import com.ycyw.chat.dto.ChatDtos.*;
import com.ycyw.chat.entity.Message;
import com.ycyw.chat.service.ChatService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.UUID;

/**
 * WebSocket controller (STOMP) for real-time message exchange.
 *
 * Data flow :
 * 1. The client sends a message to /app/chat.send
 * 2. The message is persisted in the database (PostgreSQL).
 * 3. The message is broadcast on /topic/chat.{sessionId} to all subscribers
 *
 * Strike indicator :
 * 1. The client sends an event to /app/chat.typing
 * 2. The event is being rebroadcast on /topic/chat.{sessionId}.typing
 */
@Controller
public class ChatWebSocketController {

    private static final Logger log = LoggerFactory.getLogger(ChatWebSocketController.class);

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatWebSocketController(ChatService chatService,
                                    SimpMessagingTemplate messagingTemplate) {
        this.chatService = chatService;
        this.messagingTemplate = messagingTemplate;
    }

    /**
     * Receiving and sending a chat message.
     *
     * @param request The message sent by the client or the agent
     */
    @MessageMapping("/chat.send")
    public void sendMessage(@Payload SendMessageRequest request) {
        log.debug("Message reçu pour session {} de {}", request.sessionId(), request.senderType());

        UUID sessionId = UUID.fromString(request.sessionId());
        Message.SenderType senderType = Message.SenderType.valueOf(request.senderType());

        // Persistence in base
        ChatMessageEvent event = chatService.addMessage(sessionId, request.content(), senderType);

        // Real-time broadcast to all session subscribers
        messagingTemplate.convertAndSend(
            "/topic/chat." + request.sessionId(),
            event
        );
    }

    /**
     * Typing indicator.
     * Not persisted — broadcast only in real time.
     */
    @MessageMapping("/chat.typing")
    public void typing(@Payload TypingEvent event) {
        messagingTemplate.convertAndSend(
            "/topic/chat." + event.sessionId() + ".typing",
            event
        );
    }
}
