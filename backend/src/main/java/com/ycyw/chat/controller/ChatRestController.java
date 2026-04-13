package com.ycyw.chat.controller;

import com.ycyw.chat.dto.ChatDtos.*;
import com.ycyw.chat.service.ChatService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST controller for chat session management.
 *
 * Endpoints:
 * - POST   /api/chat/sessions             → Create a session
 * - GET    /api/chat/sessions             → List all sessions
 * - GET    /api/chat/sessions/{id}        → Session details (with messages)
 * - PATCH  /api/chat/sessions/{id}/close  → Close a session
 * - DELETE /api/chat/sessions/{id}        → Delete a session (agent only)
 *
 * Session mutations trigger a WebSocket broadcast on /topic/sessions
 * to synchronize session lists across all connected clients (cross-tab sync).
 */
@RestController
@RequestMapping("/api/chat/sessions")
@Tag(name = "Chat", description = "Chat session management API")
public class ChatRestController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    public ChatRestController(ChatService chatService,
                               SimpMessagingTemplate messagingTemplate) {
        this.chatService = chatService;
        this.messagingTemplate = messagingTemplate;
    }

    @PostMapping
    @Operation(summary = "Create a new chat session")
    public ResponseEntity<SessionDetailResponse> createSession(
            @Valid @RequestBody CreateSessionRequest request) {
        SessionDetailResponse session = chatService.createSession(request);
        messagingTemplate.convertAndSend("/topic/sessions", "CREATED");
        return ResponseEntity.status(HttpStatus.CREATED).body(session);
    }

    @GetMapping
    @Operation(summary = "List all chat sessions")
    public ResponseEntity<List<SessionSummaryResponse>> listSessions(
            @RequestParam(required = false, defaultValue = "false") boolean openOnly) {
        List<SessionSummaryResponse> sessions = openOnly
                ? chatService.listOpenSessions()
                : chatService.listSessions();
        return ResponseEntity.ok(sessions);
    }

    @GetMapping("/{sessionId}")
    @Operation(summary = "Get session details (with messages)")
    public ResponseEntity<SessionDetailResponse> getSession(
            @PathVariable UUID sessionId) {
        return ResponseEntity.ok(chatService.getSession(sessionId));
    }

    @PatchMapping("/{sessionId}/close")
    @Operation(summary = "Close a chat session")
    public ResponseEntity<SessionSummaryResponse> closeSession(
            @PathVariable UUID sessionId) {
        SessionSummaryResponse result = chatService.closeSession(sessionId);
        messagingTemplate.convertAndSend("/topic/sessions", "CLOSED");
        return ResponseEntity.ok(result);
    }

    @DeleteMapping("/{sessionId}")
    @Operation(summary = "Delete a chat session and all its messages")
    public ResponseEntity<Void> deleteSession(@PathVariable UUID sessionId) {
        chatService.deleteSession(sessionId);
        messagingTemplate.convertAndSend("/topic/sessions", "DELETED");
        return ResponseEntity.noContent().build();
    }
}