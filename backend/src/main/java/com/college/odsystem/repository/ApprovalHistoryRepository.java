package com.college.odsystem.repository;

import com.college.odsystem.model.entity.ApprovalHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ApprovalHistoryRepository extends JpaRepository<ApprovalHistory, String> {

    List<ApprovalHistory> findByOdRequestIdOrderByCreatedAtAsc(String odRequestId);
}
