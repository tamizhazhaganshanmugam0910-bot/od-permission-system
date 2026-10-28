package com.college.odsystem.dto;

import com.college.odsystem.model.enums.Category;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

public class OdResubmitDto {

    @NotBlank(message = "Requester ID is required")
    private String requesterId;

    @NotNull(message = "OD Date is required")
    private LocalDate odDate;

    @NotNull(message = "Category is required")
    private Category category;

    @NotBlank(message = "Reason is required")
    private String reason;

    private String proofFilePath;

    public OdResubmitDto() {}

    public String getRequesterId() { return requesterId; }
    public void setRequesterId(String requesterId) { this.requesterId = requesterId; }

    public LocalDate getOdDate() { return odDate; }
    public void setOdDate(LocalDate odDate) { this.odDate = odDate; }

    public Category getCategory() { return category; }
    public void setCategory(Category category) { this.category = category; }

    public String getReason() { return reason; }
    public void setReason(String reason) { this.reason = reason; }

    public String getProofFilePath() { return proofFilePath; }
    public void setProofFilePath(String proofFilePath) { this.proofFilePath = proofFilePath; }
}
