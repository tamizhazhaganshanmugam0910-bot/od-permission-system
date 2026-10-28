package com.college.odsystem.service.impl;

import com.college.odsystem.model.entity.OdRequest;
import com.college.odsystem.model.enums.Stage;
import com.college.odsystem.service.EmailNotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class EmailNotificationServiceImpl implements EmailNotificationService {

    private static final Logger log = LoggerFactory.getLogger(EmailNotificationServiceImpl.class);

    @Override
    public void notifyApproverPending(OdRequest request, Stage stage) {
        log.info("Sending email notification: OD Request {} is now pending for approver stage {}", request.getId(), stage);
    }

    @Override
    public void notifyRequesterReturned(OdRequest request, String reason) {
        log.info("Sending email notification: OD Request {} returned for correction to student {}. Reason: {}",
                request.getId(), request.getStudentName(), reason);
    }

    @Override
    public void notifyRequesterDeclined(OdRequest request, String reason) {
        log.info("Sending email notification: OD Request {} has been declined. Reason: {}", request.getId(), reason);
    }

    @Override
    public void notifyRequesterCompleted(OdRequest request) {
        log.info("Sending email notification: OD Request {} has been fully approved and completed.", request.getId());
    }

    @Override
    public void notifyEscalation(OdRequest request, Stage stage) {
        log.warn("Sending email notification: OD Request {} has been ESCALATED at stage {} after exceeding 48 hours.",
                request.getId(), stage);
    }
}
