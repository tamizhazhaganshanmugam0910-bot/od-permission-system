package com.college.odsystem.dto;

import com.college.odsystem.model.enums.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class OdApprovalActionDto {

    @NotBlank(message = "Actor ID is required")
    private String actorId;

    @NotBlank(message = "Actor Name is required")
    private String actorName;

    @NotNull(message = "Actor Role is required")
    private Role actorRole;

    private String comment;

    public OdApprovalActionDto() {}

    public OdApprovalActionDto(String actorId, String actorName, Role actorRole, String comment) {
        this.actorId = actorId;
        this.actorName = actorName;
        this.actorRole = actorRole;
        this.comment = comment;
    }

    public String getActorId() { return actorId; }
    public void setActorId(String actorId) { this.actorId = actorId; }

    public String getActorName() { return actorName; }
    public void setActorName(String actorName) { this.actorName = actorName; }

    public Role getActorRole() { return actorRole; }
    public void setActorRole(Role actorRole) { this.actorRole = actorRole; }

    public String getComment() { return comment; }
    public void setComment(String comment) { this.comment = comment; }
}
