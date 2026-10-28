package com.college.odsystem.dto;

import com.college.odsystem.model.enums.Category;
import com.college.odsystem.model.enums.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public class OdRequestCreateDto {

    @NotBlank(message = "Student ID is required")
    private String studentId;

    @NotBlank(message = "Student Name is required")
    private String studentName;

    private Role requesterRole = Role.STUDENT;

    @NotBlank(message = "Department is required")
    private String department;

    @NotNull(message = "OD Date is required")
    private LocalDate odDate;

    @NotNull(message = "Category is required")
    private Category category;

    @NotBlank(message = "Reason is required")
    private String reason;

    private String proofFilePath;

    public OdRequestCreateDto() {}

    public String getStudentId() { return studentId; }
    public void setStudentId(String studentId) { this.studentId = studentId; }

    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }

    public Role getRequesterRole() { return requesterRole; }
    public void setRequesterRole(Role requesterRole) { this.requesterRole = requesterRole; }

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
}
