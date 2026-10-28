package com.college.odsystem.dto;

import com.college.odsystem.model.entity.ApprovalHistory;
import com.college.odsystem.model.enums.ApprovalAction;
import com.college.odsystem.model.enums.Role;
import com.college.odsystem.model.enums.Stage;
import java.time.Instant;

public class ApprovalHistoryDto {

    private String id;
    private String odRequestId;
    private Stage stage;
    private ApprovalAction action;
    private String actorId;
    private String actorName;
    private Role actorRole;
    private String comments;
    private Instant createdAt;

    public ApprovalHistoryDto() {}

    public static ApprovalHistoryDto fromEntity(ApprovalHistory entity) {
        ApprovalHistoryDto dto = new ApprovalHistoryDto();
        dto.setId(entity.getId());
        dto.setOdRequestId(entity.getOdRequestId());
        dto.setStage(entity.getStage());
        dto.setAction(entity.getAction());
        dto.setActorId(entity.getActorId());
        dto.setActorName(entity.getActorName());
        dto.setActorRole(entity.getActorRole());
        dto.setComments(entity.getComments());
        dto.setCreatedAt(entity.getCreatedAt());
        return dto;
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
