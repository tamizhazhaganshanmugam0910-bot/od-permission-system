package com.college.odsystem.service;

import com.college.odsystem.model.entity.OdRequest;
import com.college.odsystem.model.enums.Stage;

public interface EmailNotificationService {

    void notifyApproverPending(OdRequest request, Stage stage);

    void notifyRequesterReturned(OdRequest request, String reason);

    void notifyRequesterDeclined(OdRequest request, String reason);

    void notifyRequesterCompleted(OdRequest request);

    void notifyEscalation(OdRequest request, Stage stage);
}
