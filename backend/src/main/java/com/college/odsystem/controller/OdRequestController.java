package com.college.odsystem.controller;

import com.college.odsystem.dto.OdApprovalActionDto;
import com.college.odsystem.dto.OdRequestCreateDto;
import com.college.odsystem.dto.OdRequestResponseDto;
import com.college.odsystem.dto.OdResubmitDto;
import com.college.odsystem.model.enums.Stage;
import com.college.odsystem.service.OdWorkflowService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/od-requests")
@CrossOrigin(origins = "*")
public class OdRequestController {

    private final OdWorkflowService odWorkflowService;

    public OdRequestController(OdWorkflowService odWorkflowService) {
        this.odWorkflowService = odWorkflowService;
    }

    @PostMapping
    public ResponseEntity<OdRequestResponseDto> createRequest(@Valid @RequestBody OdRequestCreateDto dto) {
        OdRequestResponseDto response = odWorkflowService.createOdRequest(dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<OdRequestResponseDto> getRequestById(@PathVariable String id) {
        return ResponseEntity.ok(odWorkflowService.getRequestById(id));
    }

    @GetMapping("/student/{studentId}")
    public ResponseEntity<List<OdRequestResponseDto>> getStudentRequests(@PathVariable String studentId) {
        return ResponseEntity.ok(odWorkflowService.getRequestsByStudent(studentId));
    }

    @GetMapping("/pending/{stage}")
    public ResponseEntity<List<OdRequestResponseDto>> getPendingForStage(@PathVariable Stage stage) {
        return ResponseEntity.ok(odWorkflowService.getPendingForStage(stage));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<OdRequestResponseDto> approveStage(
            @PathVariable String id,
            @Valid @RequestBody OdApprovalActionDto actionDto
    ) {
        return ResponseEntity.ok(odWorkflowService.approveRequest(id, actionDto));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<OdRequestResponseDto> rejectStage(
            @PathVariable String id,
            @Valid @RequestBody OdApprovalActionDto actionDto
    ) {
        return ResponseEntity.ok(odWorkflowService.rejectRequest(id, actionDto));
    }

    @PostMapping("/{id}/return-for-correction")
    public ResponseEntity<OdRequestResponseDto> returnForCorrection(
            @PathVariable String id,
            @Valid @RequestBody OdApprovalActionDto actionDto
    ) {
        return ResponseEntity.ok(odWorkflowService.returnForCorrection(id, actionDto));
    }

    @PostMapping("/{id}/resubmit")
    public ResponseEntity<OdRequestResponseDto> resubmitRequest(
            @PathVariable String id,
            @Valid @RequestBody OdResubmitDto resubmitDto
    ) {
        return ResponseEntity.ok(odWorkflowService.resubmitRequest(id, resubmitDto));
    }

    @PostMapping("/escalate-now")
    public ResponseEntity<Map<String, Object>> triggerEscalation() {
        int escalatedCount = odWorkflowService.autoEscalatePendingRequests();
        return ResponseEntity.ok(Map.of("escalatedCount", escalatedCount, "success", true));
    }
}
