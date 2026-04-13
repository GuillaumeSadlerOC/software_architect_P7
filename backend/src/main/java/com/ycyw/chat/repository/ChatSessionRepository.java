package com.ycyw.chat.repository;

import com.ycyw.chat.entity.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

/**
 * Spring Data JPA repository for chat sessions.
 * SQL queries are generated automatically according to naming convention.
 */
@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, UUID> {

    /** Retrieves sessions sorted by descending creation date. */
    List<ChatSession> findAllByOrderByCreatedAtDesc();

    /** Retrieves open sessions. */
    List<ChatSession> findByStatusOrderByCreatedAtDesc(ChatSession.SessionStatus status);
}
