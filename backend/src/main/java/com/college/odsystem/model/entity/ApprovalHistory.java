package com.college.odsystem.model.entity;

import com.college.odsystem.model.enums.ApprovalAction;
import com.college.odsystem.model.enums.Role;
import com.college.odsystem.model.enums.Stage;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "approval_history")
public class ApprovalHistory {

    @Id
    @Column(name = "id", length = 36, nullable = false)
    private String id;

    @Column(name = "od_request_id", length = 36, nullable = false)
    private String odRequestId;

    @Enumerated(EnumType.STRING)
    @Column(name = "stage", nullable = false)
    private Stage stage;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false)
    private ApprovalAction action;

    @Column(name = "actor_id", length = 36, nullable = false)
    private String actorId;

    @Column(name = "actor_name", nullable = false)
    private String actorName;

    @Enumerated(EnumType.STRING)
    @Column(name = "actor_role", nullable = false)
    private Role actorRole;

    @Column(name = "comments", columnDefinition = "TEXT")
    private String comments;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public ApprovalHistory() {}

    public ApprovalHistory(String odRequestId, Stage stage, ApprovalAction action,
                           String actorId, String actorName, Role actorRole, String comments) {
        this.id = UUID.randomUUID().toString();
        this.odRequestId = odRequestId;
        this.stage = stage;
        this.action = action;
        this.actorId = actorId;
        this.actorName = actorName;
        this.actorRole = actorRole;
        this.comments = comments;
        this.createdAt = Instant.now();
    }

    @PrePersist
    public void onPrePersist() {
        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getOdRequestId() { return odRequestId; }
    public void setOdRequestId(String odRequestId) { this.odRequestId = odRequestId; }

    public Stage getStage() { return stage; }
    public void setStage(Stage stage) { this.stage = stage; }

    public ApprovalAction getAction() { return action; }
    public void setAction(ApprovalAction action) { this.action = action; }

    public String getActorId() { return actorId; }
    public void setActorId(String actorId) { this.actorId = actorId; }

    public String getActorName() { return actorName; }
    public void setActorName(String actorName) { this.actorName = actorName; }

    public Role getActorRole() { return actorRole; }
    public void setActorRole(Role actorRole) { this.actorRole = actorRole; }

    public String getComments() { return comments; }
    public void setComments(String comments) { this.comments = comments; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}
