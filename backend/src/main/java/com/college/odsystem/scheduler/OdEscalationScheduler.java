package com.college.odsystem.scheduler;

import com.college.odsystem.service.OdWorkflowService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class OdEscalationScheduler {

    private static final Logger log = LoggerFactory.getLogger(OdEscalationScheduler.class);

    private final OdWorkflowService odWorkflowService;

    public OdEscalationScheduler(OdWorkflowService odWorkflowService) {
        this.odWorkflowService = odWorkflowService;
    }

    /**
     * Requirement 4: Auto-escalate if a stage is pending longer than 48 hours.
     * Runs every hour to check and escalate stale requests.
     */
    @Scheduled(cron = "0 0 * * * *")
    public void runEscalationJob() {
        log.info("Starting scheduled auto-escalation check for stale OD requests (>48 hours)...");
        int escalatedCount = odWorkflowService.autoEscalatePendingRequests();
        if (escalatedCount > 0) {
            log.warn("Auto-escalation completed. Total requests escalated: {}", escalatedCount);
        } else {
            log.info("No stale OD requests found requiring escalation.");
        }
    }
}
