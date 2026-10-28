package com.college.odsystem.model.entity;

import com.college.odsystem.model.enums.Category;
import com.college.odsystem.model.enums.OdStatus;
import com.college.odsystem.model.enums.Stage;
import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "od_requests")
public class OdRequest {

    @Id
    @Column(name = "id", length = 36, nullable = false)
    private String id;

    @Column(name = "student_id", length = 36, nullable = false)
    private String studentId;

    @Column(name = "student_name", nullable = false)
    private String studentName;

    @Column(name = "department", nullable = false)
    private String department;

    @Column(name = "od_date", nullable = false)
    private LocalDate odDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false)
    private Category category;

    @Column(name = "reason", nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Column(name = "proof_file_path")
    private String proofFilePath;

    @Enumerated(EnumType.STRING)
    @Column(name = "current_stage", nullable = false)
    private Stage currentStage;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private OdStatus status;

    @Column(name = "is_escalated", nullable = false)
    private boolean isEscalated = false;

    @Column(name = "last_stage_updated_at", nullable = false)
    private Instant lastStageUpdatedAt;

    @Column(name = "declined_by")
    private String declinedBy;

    @Column(name = "decline_reason", columnDefinition = "TEXT")
    private String declineReason;

    @Column(name = "counsellor_id", length = 36)
    private String counsellorId;

    @Column(name = "counsellor_name")
    private String counsellorName;

    @Column(name = "counsellor_remark", columnDefinition = "TEXT")
    private String counsellorRemark;

    @Column(name = "coordinator_id", length = 36)
    private String coordinatorId;

    @Column(name = "coordinator_name")
    private String coordinatorName;

    @Column(name = "coordinator_remark", columnDefinition = "TEXT")
    private String coordinatorRemark;

    @Column(name = "hod_id", length = 36)
    private String hodId;

    @Column(name = "hod_name")
    private String hodName;

    @Column(name = "hod_remark", columnDefinition = "TEXT")
    private String hodRemark;

    @Column(name = "pdf_generated", nullable = false)
    private boolean pdfGenerated = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public OdRequest() {}

    @PrePersist
    public void onPrePersist() {
        if (this.id == null) {
            this.id = UUID.randomUUID().toString();
        }
        Instant now = Instant.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
        if (this.lastStageUpdatedAt == null) {
            this.lastStageUpdatedAt = now;
        }
    }

    @PreUpdate
    public void onPreUpdate() {
        this.updatedAt = Instant.now();
    }

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public String getDepartment() { return department; }
    public void setDepartment(String department) { this.department = department; }

    public LocalDate getOdDate() { return odDate; }
    public void setOdDate(LocalDate odDate) { this.odDate = odDate; }

    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getProofFilePath() { return proofFilePath; }
    public void setProofFilePath(String proofFilePath) { this.proofFilePath = proofFilePath; }

    public Stage getCurrentStage() { return currentStage; }
    public void setCurrentStage(Stage currentStage) { this.currentStage = currentStage; }

    public OdStatus getStatus() { return status; }
    public void setStatus(OdStatus status) { this.status = status; }

    public boolean isEscalated() { return isEscalated; }
    public void setEscalated(boolean escalated) { isEscalated = escalated; }

    public Instant getLastStageUpdatedAt() { return lastStageUpdatedAt; }
    public void setLastStageUpdatedAt(Instant lastStageUpdatedAt) { this.lastStageUpdatedAt = lastStageUpdatedAt; }

    public String getDeclinedBy() { return declinedBy; }
    public void setDeclinedBy(String declinedBy) { this.declinedBy = declinedBy; }

    public String getDeclineReason() { return declineReason; }
    public void setDeclineReason(String declineReason) { this.declineReason = declineReason; }

    public String getCounsellorId() { return counsellorId; }
    public void setCounsellorId(String counsellorId) { this.counsellorId = counsellorId; }

    public String getCounsellorName() { return counsellorName; }
    public void setCounsellorName(String counsellorName) { this.counsellorName = counsellorName; }

    public String getCounsellorRemark() { return counsellorRemark; }
    public void setCounsellorRemark(String counsellorRemark) { this.counsellorRemark = counsellorRemark; }

    public String getCoordinatorId() { return coordinatorId; }
    public void setCoordinatorId(String coordinatorId) { this.coordinatorId = coordinatorId; }

    public String getCoordinatorName() { return coordinatorName; }
    public void setCoordinatorName(String coordinatorName) { this.coordinatorName = coordinatorName; }

    public String getCoordinatorRemark() { return coordinatorRemark; }
    public void setCoordinatorRemark(String coordinatorRemark) { this.coordinatorRemark = coordinatorRemark; }

    public String getHodId() { return hodId; }
    public void setHodId(String hodId) { this.hodId = hodId; }

    public String getHodName() { return hodName; }
    public void setHodName(String hodName) { this.hodName = hodName; }

    public String getHodRemark() { return hodRemark; }
    public void setHodRemark(String hodRemark) { this.hodRemark = hodRemark; }

    public boolean isPdfGenerated() { return pdfGenerated; }
    public void setPdfGenerated(boolean pdfGenerated) { this.pdfGenerated = pdfGenerated; }

    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }

    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}
