package com.college.odsystem.service;

import com.college.odsystem.dto.OdApprovalActionDto;
import com.college.odsystem.dto.OdRequestCreateDto;
import com.college.odsystem.dto.OdRequestResponseDto;
import com.college.odsystem.dto.OdResubmitDto;
import com.college.odsystem.dto.ApprovalHistoryDto;
import com.college.odsystem.model.entity.ApprovalHistory;
import com.college.odsystem.model.entity.OdRequest;
import com.college.odsystem.model.enums.ApprovalAction;
import com.college.odsystem.model.enums.OdStatus;
import com.college.odsystem.model.enums.Role;
import com.college.odsystem.model.enums.Stage;
import com.college.odsystem.repository.ApprovalHistoryRepository;
import com.college.odsystem.repository.OdRequestRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class OdWorkflowService {

    private final OdRequestRepository odRequestRepository;
    private final ApprovalHistoryRepository approvalHistoryRepository;
    private final EmailNotificationService emailNotificationService;

    public OdWorkflowService(
            OdRequestRepository odRequestRepository,
            ApprovalHistoryRepository approvalHistoryRepository,
            EmailNotificationService emailNotificationService
    ) {
        this.odRequestRepository = odRequestRepository;
        this.approvalHistoryRepository = approvalHistoryRepository;
        this.emailNotificationService = emailNotificationService;
    }

    /**
     * Requirement 1: Stage-skipping. If requester is a MANAGER, start at Stage 2 (CLASS_COORDINATOR).
     * Otherwise, start at Stage 1 (COUNSELLOR).
     */
    @Transactional
    public OdRequestResponseDto createOdRequest(OdRequestCreateDto dto) {
        OdRequest request = new OdRequest();
        request.setStudentId(dto.getStudentId());
        request.setStudentName(dto.getStudentName());
        request.setDepartment(dto.getDepartment());
        request.setOdDate(dto.getOdDate());
        request.setCategory(dto.getCategory());
        request.setReason(dto.getReason());
        request.setProofFilePath(dto.getProofFilePath());
        request.setStatus(OdStatus.PENDING);
        request.setEscalated(false);

        // Stage-skipping logic
        if (dto.getRequesterRole() == Role.MANAGER) {
            request.setCurrentStage(Stage.CLASS_COORDINATOR);
        } else {
            request.setCurrentStage(Stage.COUNSELLOR);
        }

        Instant now = Instant.now();
        request.setLastStageUpdatedAt(now);
        OdRequest saved = odRequestRepository.save(request);

        // Record creation in approval history
        ApprovalHistory history = new ApprovalHistory(
                saved.getId(),
                saved.getCurrentStage(),
                ApprovalAction.SUBMITTED,
                dto.getStudentId(),
                dto.getStudentName(),
                dto.getRequesterRole() != null ? dto.getRequesterRole() : Role.STUDENT,
                "Request submitted"
        );
        approvalHistoryRepository.save(history);

        // Notify initial approver
        emailNotificationService.notifyApproverPending(saved, saved.getCurrentStage());

        return toResponseDto(saved);
    }

    /**
     * Requirement 5: Comment is optional on approve.
     * Requirement 6: Notify next approver by email when stage is approved.
     * Requirement 7: Enforce role checks for current stage.
     */
    @Transactional
    public OdRequestResponseDto approveRequest(String requestId, OdApprovalActionDto actionDto) {
        OdRequest request = getRequestOrThrow(requestId);

        if (request.getStatus() != OdStatus.PENDING) {
            throw new IllegalStateException("Only pending requests can be approved. Current status: " + request.getStatus());
        }

        enforceApproverRole(request.getCurrentStage(), actionDto.getActorRole());

        Stage currentStage = request.getCurrentStage();
        String comment = actionDto.getComment(); // Optional on approve

        // Update stage-specific remarks and IDs
        if (currentStage == Stage.COUNSELLOR) {
            request.setCounsellorId(actionDto.getActorId());
            request.setCounsellorName(actionDto.getActorName());
            request.setCounsellorRemark(comment);
            request.setCurrentStage(Stage.CLASS_COORDINATOR);
        } else if (currentStage == Stage.CLASS_COORDINATOR) {
            request.setCoordinatorId(actionDto.getActorId());
            request.setCoordinatorName(actionDto.getActorName());
            request.setCoordinatorRemark(comment);
            request.setCurrentStage(Stage.HOD);
        } else if (currentStage == Stage.HOD) {
            request.setHodId(actionDto.getActorId());
            request.setHodName(actionDto.getActorName());
            request.setHodRemark(comment);
            request.setCurrentStage(Stage.DONE);
            request.setStatus(OdStatus.COMPLETED);
            request.setPdfGenerated(true);
        }

        request.setLastStageUpdatedAt(Instant.now());
        request.setEscalated(false);
        OdRequest saved = odRequestRepository.save(request);

        // Record approval in history
        ApprovalHistory history = new ApprovalHistory(
                saved.getId(),
                currentStage,
                ApprovalAction.APPROVED,
                actionDto.getActorId(),
                actionDto.getActorName(),
                actionDto.getActorRole(),
                comment
        );
        approvalHistoryRepository.save(history);

        // Notify next approver or requester
        if (saved.getStatus() == OdStatus.COMPLETED) {
            emailNotificationService.notifyRequesterCompleted(saved);
        } else {
            emailNotificationService.notifyApproverPending(saved, saved.getCurrentStage());
        }

        return toResponseDto(saved);
    }

    /**
     * Requirement 2: Rejection at Stage 2 or 3 sends request back to previous stage, not final.
     * Requirement 5: Comment is MANDATORY on reject.
     */
    @Transactional
    public OdRequestResponseDto rejectRequest(String requestId, OdApprovalActionDto actionDto) {
        OdRequest request = getRequestOrThrow(requestId);

        if (request.getStatus() != OdStatus.PENDING) {
            throw new IllegalStateException("Only pending requests can be rejected. Current status: " + request.getStatus());
        }

        enforceApproverRole(request.getCurrentStage(), actionDto.getActorRole());

        // Mandatory comment validation on reject
        if (actionDto.getComment() == null || actionDto.getComment().trim().isEmpty()) {
            throw new IllegalArgumentException("Comment is mandatory when rejecting a request.");
        }

        Stage currentStage = request.getCurrentStage();
        String comment = actionDto.getComment().trim();
        ApprovalAction historyAction;

        if (currentStage == Stage.HOD) {
            // Stage 3 -> Revert to Stage 2 (CLASS_COORDINATOR)
            request.setHodName(actionDto.getActorName());
            request.setHodRemark(comment);
            request.setCurrentStage(Stage.CLASS_COORDINATOR);
            historyAction = ApprovalAction.REJECTED_TO_PREVIOUS;
            emailNotificationService.notifyApproverPending(request, Stage.CLASS_COORDINATOR);
        } else if (currentStage == Stage.CLASS_COORDINATOR) {
            // Stage 2 -> Revert to Stage 1 (COUNSELLOR)
            request.setCoordinatorName(actionDto.getActorName());
            request.setCoordinatorRemark(comment);
            request.setCurrentStage(Stage.COUNSELLOR);
            historyAction = ApprovalAction.REJECTED_TO_PREVIOUS;
            emailNotificationService.notifyApproverPending(request, Stage.COUNSELLOR);
        } else {
            // Stage 1 (COUNSELLOR) -> Final decline
            request.setCounsellorName(actionDto.getActorName());
            request.setCounsellorRemark(comment);
            request.setStatus(OdStatus.DECLINED);
            request.setDeclinedBy(actionDto.getActorRole().name());
            request.setDeclineReason(comment);
            historyAction = ApprovalAction.REJECTED_FINAL;
            emailNotificationService.notifyRequesterDeclined(request, comment);
        }

        request.setLastStageUpdatedAt(Instant.now());
        request.setEscalated(false);
        OdRequest saved = odRequestRepository.save(request);

        // Record history
        ApprovalHistory history = new ApprovalHistory(
                saved.getId(),
                currentStage,
                historyAction,
                actionDto.getActorId(),
                actionDto.getActorName(),
                actionDto.getActorRole(),
                comment
        );
        approvalHistoryRepository.save(history);

        return toResponseDto(saved);
    }

    /**
     * Requirement 3: Add a RETURNED_FOR_CORRECTION status so requester can edit and resubmit.
     */
    @Transactional
    public OdRequestResponseDto returnForCorrection(String requestId, OdApprovalActionDto actionDto) {
        OdRequest request = getRequestOrThrow(requestId);

        if (request.getStatus() != OdStatus.PENDING) {
            throw new IllegalStateException("Only pending requests can be returned for correction.");
        }

        enforceApproverRole(request.getCurrentStage(), actionDto.getActorRole());

        if (actionDto.getComment() == null || actionDto.getComment().trim().isEmpty()) {
            throw new IllegalArgumentException("Comment is mandatory when returning a request for correction.");
        }

        String comment = actionDto.getComment().trim();
        Stage currentStage = request.getCurrentStage();

        request.setStatus(OdStatus.RETURNED_FOR_CORRECTION);
        request.setDeclinedBy(actionDto.getActorRole().name());
        request.setDeclineReason(comment);
        request.setLastStageUpdatedAt(Instant.now());
        request.setEscalated(false);

        OdRequest saved = odRequestRepository.save(request);

        // Record history
        ApprovalHistory history = new ApprovalHistory(
                saved.getId(),
                currentStage,
                ApprovalAction.RETURNED_FOR_CORRECTION,
                actionDto.getActorId(),
                actionDto.getActorName(),
                actionDto.getActorRole(),
                comment
        );
        approvalHistoryRepository.save(history);

        emailNotificationService.notifyRequesterReturned(saved, comment);

        return toResponseDto(saved);
    }

    /**
     * Requirement 3 (cont): Requester edits and resubmits request.
     */
    @Transactional
    public OdRequestResponseDto resubmitRequest(String requestId, OdResubmitDto resubmitDto) {
        OdRequest request = getRequestOrThrow(requestId);

        if (request.getStatus() != OdStatus.RETURNED_FOR_CORRECTION) {
            throw new IllegalStateException("Only requests in RETURNED_FOR_CORRECTION status can be resubmitted.");
        }

        if (!request.getStudentId().equals(resubmitDto.getRequesterId())) {
            throw new SecurityException("Only the original requester can resubmit this request.");
        }

        request.setOdDate(resubmitDto.getOdDate());
        request.setCategory(resubmitDto.getCategory());
        request.setReason(resubmitDto.getReason());
        if (resubmitDto.getProofFilePath() != null) {
            request.setProofFilePath(resubmitDto.getProofFilePath());
        }

        // Reset to initial stage (COUNSELLOR) and status PENDING
        request.setCurrentStage(Stage.COUNSELLOR);
        request.setStatus(OdStatus.PENDING);
        request.setDeclineReason(null);
        request.setDeclinedBy(null);
        request.setEscalated(false);
        request.setLastStageUpdatedAt(Instant.now());

        OdRequest saved = odRequestRepository.save(request);

        ApprovalHistory history = new ApprovalHistory(
                saved.getId(),
                saved.getCurrentStage(),
                ApprovalAction.RESUBMITTED,
                resubmitDto.getRequesterId(),
                request.getStudentName(),
                Role.STUDENT,
                "Request corrected and resubmitted by student"
        );
        approvalHistoryRepository.save(history);

        emailNotificationService.notifyApproverPending(saved, saved.getCurrentStage());

        return toResponseDto(saved);
    }

    /**
     * Requirement 4: Auto-escalate if a stage is pending longer than 48 hours.
     */
    @Transactional
    public int autoEscalatePendingRequests() {
        Instant cutoffTime = Instant.now().minus(Duration.ofHours(48));
        List<OdRequest> pendingStale = odRequestRepository.findRequestsNeedingEscalation(OdStatus.PENDING, cutoffTime);

        int count = 0;
        for (OdRequest req : pendingStale) {
            req.setEscalated(true);
            odRequestRepository.save(req);

            ApprovalHistory history = new ApprovalHistory(
                    req.getId(),
                    req.getCurrentStage(),
                    ApprovalAction.ESCALATED,
                    "SYSTEM",
                    "Auto-Escalation Engine",
                    Role.ADMIN,
                    "Auto-escalated: pending longer than 48 hours at " + req.getCurrentStage()
            );
            approvalHistoryRepository.save(history);

            emailNotificationService.notifyEscalation(req, req.getCurrentStage());
            count++;
        }
        return count;
    }

    @Transactional(readOnly = true)
    public OdRequestResponseDto getRequestById(String requestId) {
        OdRequest request = getRequestOrThrow(requestId);
        return toResponseDto(request);
    }

    @Transactional(readOnly = true)
    public List<OdRequestResponseDto> getRequestsByStudent(String studentId) {
        return odRequestRepository.findByStudentIdOrderByCreatedAtDesc(studentId)
                .stream()
                .map(this::toResponseDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OdRequestResponseDto> getPendingForStage(Stage stage) {
        return odRequestRepository.findByCurrentStageAndStatus(stage, OdStatus.PENDING)
                .stream()
                .map(this::toResponseDto)
                .toList();
    }

    private void enforceApproverRole(Stage stage, Role role) {
        if (role == null || !role.isAuthorizedForStage(stage)) {
            throw new SecurityException("Actor with role " + role + " is not authorized to act on stage " + stage);
        }
    }

    private OdRequest getRequestOrThrow(String requestId) {
        return odRequestRepository.findById(requestId)
                .orElseThrow(() -> new NoSuchElementException("OD request not found with id: " + requestId));
    }

    private OdRequestResponseDto toResponseDto(OdRequest request) {
        List<ApprovalHistoryDto> history = approvalHistoryRepository
                .findByOdRequestIdOrderByCreatedAtAsc(request.getId())
                .stream()
                .map(ApprovalHistoryDto::fromEntity)
                .toList();
        return OdRequestResponseDto.fromEntity(request, history);
    }
}
