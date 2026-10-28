package com.college.odsystem.service;

import com.college.odsystem.dto.OdApprovalActionDto;
import com.college.odsystem.dto.OdRequestCreateDto;
import com.college.odsystem.dto.OdRequestResponseDto;
import com.college.odsystem.dto.OdResubmitDto;
import com.college.odsystem.model.entity.ApprovalHistory;
import com.college.odsystem.model.entity.OdRequest;
import com.college.odsystem.model.enums.ApprovalAction;
import com.college.odsystem.model.enums.Category;
import com.college.odsystem.model.enums.OdStatus;
import com.college.odsystem.model.enums.Role;
import com.college.odsystem.model.enums.Stage;
import com.college.odsystem.repository.ApprovalHistoryRepository;
import com.college.odsystem.repository.OdRequestRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OdWorkflowServiceTest {

    @Mock
    private OdRequestRepository odRequestRepository;

    @Mock
    private ApprovalHistoryRepository approvalHistoryRepository;

    @Mock
    private EmailNotificationService emailNotificationService;

    @InjectMocks
    private OdWorkflowService odWorkflowService;

    private OdRequest mockRequest;

    @BeforeEach
    void setUp() {
        mockRequest = new OdRequest();
        mockRequest.setId("req-123");
        mockRequest.setStudentId("student-1");
        mockRequest.setStudentName("John Doe");
        mockRequest.setDepartment("Computer Science");
        mockRequest.setOdDate(LocalDate.now().plusDays(2));
        mockRequest.setCategory(Category.TECHNICAL);
        mockRequest.setReason("Hackathon Participation");
        mockRequest.setCurrentStage(Stage.COUNSELLOR);
        mockRequest.setStatus(OdStatus.PENDING);
        mockRequest.setLastStageUpdatedAt(Instant.now());
        mockRequest.setEscalated(false);
    }

    @Test
    @DisplayName("Rule 1: Student requester starts at Stage 1 (COUNSELLOR)")
    void testCreateRequest_asStudent_startsAtStage1() {
        OdRequestCreateDto dto = new OdRequestCreateDto();
        dto.setStudentId("student-1");
        dto.setStudentName("John Doe");
        dto.setRequesterRole(Role.STUDENT);
        dto.setDepartment("Computer Science");
        dto.setOdDate(LocalDate.now().plusDays(1));
        dto.setCategory(Category.TECHNICAL);
        dto.setReason("Paper Presentation");

        when(odRequestRepository.save(any(OdRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        OdRequestResponseDto response = odWorkflowService.createOdRequest(dto);

        assertEquals(Stage.COUNSELLOR, response.getCurrentStage());
        assertEquals(OdStatus.PENDING, response.getStatus());
        verify(emailNotificationService).notifyApproverPending(any(OdRequest.class), eq(Stage.COUNSELLOR));
        verify(approvalHistoryRepository).save(any(ApprovalHistory.class));
    }

    @Test
    @DisplayName("Rule 1: Manager requester skips Stage 1 and starts at Stage 2 (CLASS_COORDINATOR)")
    void testCreateRequest_asManager_skipsStage1_startsAtStage2() {
        OdRequestCreateDto dto = new OdRequestCreateDto();
        dto.setStudentId("manager-1");
        dto.setStudentName("Manager Jane");
        dto.setRequesterRole(Role.MANAGER);
        dto.setDepartment("Computer Science");
        dto.setOdDate(LocalDate.now().plusDays(1));
        dto.setCategory(Category.TECHNICAL);
        dto.setReason("Department Delegation");

        when(odRequestRepository.save(any(OdRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        OdRequestResponseDto response = odWorkflowService.createOdRequest(dto);

        assertEquals(Stage.CLASS_COORDINATOR, response.getCurrentStage());
        assertEquals(OdStatus.PENDING, response.getStatus());
        verify(emailNotificationService).notifyApproverPending(any(OdRequest.class), eq(Stage.CLASS_COORDINATOR));
    }

    @Test
    @DisplayName("Rule 2: Rejection at Stage 3 (HOD) sends request back to Stage 2 (CLASS_COORDINATOR), not final")
    void testRejectAtStage3_revertsToStage2() {
        mockRequest.setCurrentStage(Stage.HOD);
        mockRequest.setStatus(OdStatus.PENDING);
        when(odRequestRepository.findById("req-123")).thenReturn(Optional.of(mockRequest));
        when(odRequestRepository.save(any(OdRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        OdApprovalActionDto action = new OdApprovalActionDto("hod-1", "Dr. Smith", Role.HOD, "Needs prior coordinator re-verification");

        OdRequestResponseDto response = odWorkflowService.rejectRequest("req-123", action);

        assertEquals(Stage.CLASS_COORDINATOR, response.getCurrentStage());
        assertEquals(OdStatus.PENDING, response.getStatus()); // Stays PENDING, sent back to previous stage
        verify(emailNotificationService).notifyApproverPending(any(OdRequest.class), eq(Stage.CLASS_COORDINATOR));

        ArgumentCaptor<ApprovalHistory> historyCaptor = ArgumentCaptor.forClass(ApprovalHistory.class);
        verify(approvalHistoryRepository).save(historyCaptor.capture());
        assertEquals(ApprovalAction.REJECTED_TO_PREVIOUS, historyCaptor.getValue().getAction());
    }

    @Test
    @DisplayName("Rule 2: Rejection at Stage 2 (CLASS_COORDINATOR) sends request back to Stage 1 (COUNSELLOR)")
    void testRejectAtStage2_revertsToStage1() {
        mockRequest.setCurrentStage(Stage.CLASS_COORDINATOR);
        mockRequest.setStatus(OdStatus.PENDING);
        when(odRequestRepository.findById("req-123")).thenReturn(Optional.of(mockRequest));
        when(odRequestRepository.save(any(OdRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        OdApprovalActionDto action = new OdApprovalActionDto("coord-1", "Prof. Alan", Role.CLASS_COORDINATOR, "Check attendance with counsellor");

        OdRequestResponseDto response = odWorkflowService.rejectRequest("req-123", action);

        assertEquals(Stage.COUNSELLOR, response.getCurrentStage());
        assertEquals(OdStatus.PENDING, response.getStatus());
        verify(emailNotificationService).notifyApproverPending(any(OdRequest.class), eq(Stage.COUNSELLOR));
    }

    @Test
    @DisplayName("Rule 2: Rejection at Stage 1 (COUNSELLOR) is final decline")
    void testRejectAtStage1_finalDeclined() {
        mockRequest.setCurrentStage(Stage.COUNSELLOR);
        mockRequest.setStatus(OdStatus.PENDING);
        when(odRequestRepository.findById("req-123")).thenReturn(Optional.of(mockRequest));
        when(odRequestRepository.save(any(OdRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        OdApprovalActionDto action = new OdApprovalActionDto("coun-1", "Prof. Bob", Role.COUNSELLOR, "Internal exam on that date");

        OdRequestResponseDto response = odWorkflowService.rejectRequest("req-123", action);

        assertEquals(OdStatus.DECLINED, response.getStatus());
        verify(emailNotificationService).notifyRequesterDeclined(any(OdRequest.class), eq("Internal exam on that date"));
    }

    @Test
    @DisplayName("Rule 5: Rejection requires mandatory comment; throws exception if blank")
    void testReject_mandatoryCommentRequired() {
        mockRequest.setCurrentStage(Stage.COUNSELLOR);
        when(odRequestRepository.findById("req-123")).thenReturn(Optional.of(mockRequest));

        OdApprovalActionDto actionNoComment = new OdApprovalActionDto("coun-1", "Prof. Bob", Role.COUNSELLOR, "   ");

        assertThrows(IllegalArgumentException.class, () -> odWorkflowService.rejectRequest("req-123", actionNoComment));
        verify(odRequestRepository, never()).save(any());
    }

    @Test
    @DisplayName("Rule 5 & 6: Approval comment is optional, and notifies next approver by email")
    void testApprove_commentOptional_notifiesNextApprover() {
        mockRequest.setCurrentStage(Stage.COUNSELLOR);
        when(odRequestRepository.findById("req-123")).thenReturn(Optional.of(mockRequest));
        when(odRequestRepository.save(any(OdRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        OdApprovalActionDto action = new OdApprovalActionDto("coun-1", "Prof. Bob", Role.COUNSELLOR, null);

        OdRequestResponseDto response = odWorkflowService.approveRequest("req-123", action);

        assertEquals(Stage.CLASS_COORDINATOR, response.getCurrentStage());
        assertEquals(OdStatus.PENDING, response.getStatus());
        verify(emailNotificationService).notifyApproverPending(any(OdRequest.class), eq(Stage.CLASS_COORDINATOR));
    }

    @Test
    @DisplayName("Rule 3: Return for correction sets status to RETURNED_FOR_CORRECTION")
    void testReturnForCorrection() {
        mockRequest.setCurrentStage(Stage.COUNSELLOR);
        when(odRequestRepository.findById("req-123")).thenReturn(Optional.of(mockRequest));
        when(odRequestRepository.save(any(OdRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        OdApprovalActionDto action = new OdApprovalActionDto("coun-1", "Prof. Bob", Role.COUNSELLOR, "Upload official event brochure");

        OdRequestResponseDto response = odWorkflowService.returnForCorrection("req-123", action);

        assertEquals(OdStatus.RETURNED_FOR_CORRECTION, response.getStatus());
        verify(emailNotificationService).notifyRequesterReturned(any(OdRequest.class), eq("Upload official event brochure"));
    }

    @Test
    @DisplayName("Rule 3: Resubmit allows requester to edit and resets to PENDING at initial stage")
    void testResubmitRequest() {
        mockRequest.setStatus(OdStatus.RETURNED_FOR_CORRECTION);
        when(odRequestRepository.findById("req-123")).thenReturn(Optional.of(mockRequest));
        when(odRequestRepository.save(any(OdRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        OdResubmitDto resubmitDto = new OdResubmitDto();
        resubmitDto.setRequesterId("student-1");
        resubmitDto.setOdDate(LocalDate.now().plusDays(3));
        resubmitDto.setCategory(Category.TECHNICAL);
        resubmitDto.setReason("Updated reason with new event dates");
        resubmitDto.setProofFilePath("new-proof.pdf");

        OdRequestResponseDto response = odWorkflowService.resubmitRequest("req-123", resubmitDto);

        assertEquals(OdStatus.PENDING, response.getStatus());
        assertEquals(Stage.COUNSELLOR, response.getCurrentStage());
        assertEquals("new-proof.pdf", response.getProofFilePath());
        verify(emailNotificationService).notifyApproverPending(any(OdRequest.class), eq(Stage.COUNSELLOR));
    }

    @Test
    @DisplayName("Rule 4: Auto-escalate requests pending longer than 48 hours")
    void testAutoEscalatePendingRequests() {
        OdRequest staleRequest = new OdRequest();
        staleRequest.setId("stale-1");
        staleRequest.setCurrentStage(Stage.CLASS_COORDINATOR);
        staleRequest.setStatus(OdStatus.PENDING);
        staleRequest.setEscalated(false);
        staleRequest.setLastStageUpdatedAt(Instant.now().minus(50, ChronoUnit.HOURS));

        when(odRequestRepository.findRequestsNeedingEscalation(eq(OdStatus.PENDING), any(Instant.class)))
                .thenReturn(List.of(staleRequest));

        int escalatedCount = odWorkflowService.autoEscalatePendingRequests();

        assertEquals(1, escalatedCount);
        assertTrue(staleRequest.isEscalated());
        verify(odRequestRepository).save(staleRequest);
        verify(emailNotificationService).notifyEscalation(staleRequest, Stage.CLASS_COORDINATOR);

        ArgumentCaptor<ApprovalHistory> historyCaptor = ArgumentCaptor.forClass(ApprovalHistory.class);
        verify(approvalHistoryRepository).save(historyCaptor.capture());
        assertEquals(ApprovalAction.ESCALATED, historyCaptor.getValue().getAction());
    }

    @Test
    @DisplayName("Role checks: Non-authorized role cannot approve stage")
    void testRoleCheck_unauthorizedRoleThrowsSecurityException() {
        mockRequest.setCurrentStage(Stage.HOD);
        when(odRequestRepository.findById("req-123")).thenReturn(Optional.of(mockRequest));

        // COUNSELLOR attempts to approve HOD stage
        OdApprovalActionDto action = new OdApprovalActionDto("coun-1", "Prof. Bob", Role.COUNSELLOR, "Approving HOD stage");

        assertThrows(SecurityException.class, () -> odWorkflowService.approveRequest("req-123", action));
        verify(odRequestRepository, never()).save(any());
    }
}
