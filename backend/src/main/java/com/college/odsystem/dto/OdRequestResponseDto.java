package com.college.odsystem.dto;

import com.college.odsystem.model.entity.OdRequest;
import com.college.odsystem.model.enums.Category;
import com.college.odsystem.model.enums.OdStatus;
import com.college.odsystem.model.enums.Stage;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public class OdRequestResponseDto {

    private String id;
    private String studentId;
    private String studentName;
    private String department;
    private LocalDate odDate;
    private Category category;
    private String reason;
    private String proofFilePath;
    private Stage currentStage;
    private OdStatus status;
    private boolean isEscalated;
    private Instant lastStageUpdatedAt;
    private String declinedBy;
    private String declineReason;
    private String counsellorId;
    private String counsellorName;
    private String counsellorRemark;
    private String coordinatorId;
    private String coordinatorName;
    private String coordinatorRemark;
    private String hodId;
    private String hodName;
    private String hodRemark;
    private boolean pdfGenerated;
    private Instant createdAt;
    private Instant updatedAt;
    private List<ApprovalHistoryDto> history;

    public OdRequestResponseDto() {}

    public static OdRequestResponseDto fromEntity(OdRequest entity, List<ApprovalHistoryDto> history) {
        OdRequestResponseDto dto = new OdRequestResponseDto();
        dto.setId(entity.getId());
        dto.setStudentId(entity.getStudentId());
        dto.setStudentName(entity.getStudentName());
        dto.setDepartment(entity.getDepartment());
        dto.setOdDate(entity.getOdDate());
        dto.setCategory(entity.getCategory());
        dto.setReason(entity.getReason());
        dto.setProofFilePath(entity.getProofFilePath());
        dto.setCurrentStage(entity.getCurrentStage());
        dto.setStatus(entity.getStatus());
        dto.setEscalated(entity.isEscalated());
        dto.setLastStageUpdatedAt(entity.getLastStageUpdatedAt());
        dto.setDeclinedBy(entity.getDeclinedBy());
        dto.setDeclineReason(entity.getDeclineReason());
        dto.setCounsellorId(entity.getCounsellorId());
        dto.setCounsellorName(entity.getCounsellorName());
        dto.setCounsellorRemark(entity.getCounsellorRemark());
        dto.setCoordinatorId(entity.getCoordinatorId());
        dto.setCoordinatorName(entity.getCoordinatorName());
        dto.setCoordinatorRemark(entity.getCoordinatorRemark());
        dto.setHodId(entity.getHodId());
        dto.setHodName(entity.getHodName());
        dto.setHodRemark(entity.getHodRemark());
        dto.setPdfGenerated(entity.isPdfGenerated());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        dto.setHistory(history);
        return dto;
    }

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

    public List<ApprovalHistoryDto> getHistory() { return history; }
    public void setHistory(List<ApprovalHistoryDto> history) { this.history = history; }
}
