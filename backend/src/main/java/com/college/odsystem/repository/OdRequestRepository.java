package com.college.odsystem.repository;

import com.college.odsystem.model.entity.OdRequest;
import com.college.odsystem.model.enums.OdStatus;
import com.college.odsystem.model.enums.Stage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface OdRequestRepository extends JpaRepository<OdRequest, String> {

    List<OdRequest> findByStudentIdOrderByCreatedAtDesc(String studentId);

    List<OdRequest> findByCurrentStageAndStatus(Stage currentStage, OdStatus status);

    @Query("SELECT r FROM OdRequest r WHERE r.status = :status AND r.isEscalated = false AND r.lastStageUpdatedAt < :cutoffTime")
    List<OdRequest> findRequestsNeedingEscalation(
            @Param("status") OdStatus status,
            @Param("cutoffTime") Instant cutoffTime
    );
}
