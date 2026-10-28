import { jsPDF } from "jspdf";
import type { ODRequest } from "./types";
import { CATEGORY_LABELS } from "./types";

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function generateODPDF(req: ODRequest): void {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 20;

  // ---- Watermark seal ----
  doc.saveGraphicsState();
  doc.setGState(new (doc as any).GState({ opacity: 0.08 }));
  doc.setTextColor(20, 60, 120);
  doc.setFontSize(72);
  doc.setFont("helvetica", "bold");
  doc.text("COLLEGE\nSEAL", pageWidth / 2, pageHeight / 2 - 10, {
    align: "center",
    angle: 35,
  });
  // Seal circle
  doc.setDrawColor(20, 60, 120);
  doc.setLineWidth(1.2);
  doc.circle(pageWidth / 2, pageHeight / 2, 45, "S");
  doc.setLineWidth(0.4);
  doc.circle(pageWidth / 2, pageHeight / 2, 48, "S");
  doc.restoreGraphicsState();

  // ---- Header ----
  doc.setTextColor(20, 40, 80);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("COLLEGE OF ENGINEERING", pageWidth / 2, 28, { align: "center" });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 80);
  doc.text("Office of Student Affairs | On-Duty Permission Certificate", pageWidth / 2, 35, {
    align: "center",
  });

  // Divider line
  doc.setDrawColor(20, 60, 120);
  doc.setLineWidth(0.8);
  doc.line(margin, 40, pageWidth - margin, 40);

  // ---- Title ----
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("On-Duty (OD) Permission Certificate", pageWidth / 2, 52, { align: "center" });

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`Certificate Reference: OD-${req.id.slice(0, 8).toUpperCase()}`, pageWidth / 2, 58, {
    align: "center",
  });

  // ---- Student Details ----
  let y = 72;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Student Details", margin, y);
  doc.setLineWidth(0.3);
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y + 2, pageWidth - margin, y + 2);
  y += 10;

  const detailRows: [string, string][] = [
    ["Student Name", req.student_name],
    ["Department", req.department],
    ["OD Date", formatDate(req.od_date)],
    ["Category", CATEGORY_LABELS[req.category]],
  ];

  doc.setFontSize(10);
  for (const [label, value] of detailRows) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text(label, margin, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(20, 20, 20);
    doc.text(value, margin + 55, y);
    y += 8;
  }

  // ---- Reason ----
  y += 4;
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60, 60, 60);
  doc.text("Reason / Description", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.setTextColor(20, 20, 20);
  const reasonLines = doc.splitTextToSize(req.reason, pageWidth - margin * 2);
  doc.text(reasonLines, margin, y);
  y += reasonLines.length * 5 + 8;

  // ---- Approval Trail ----
  y += 4;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  doc.text("Approval Trail", margin, y);
  doc.setLineWidth(0.3);
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y + 2, pageWidth - margin, y + 2);
  y += 10;

  const approvals: [string, string | null, string | null][] = [
    ["Counsellor", req.counsellor_name, req.counsellor_remark],
    ["Class Coordinator", req.coordinator_name, req.coordinator_remark],
    ["HOD (Head of Dept.)", req.hod_name, req.hod_remark],
  ];

  doc.setFontSize(10);
  for (const [roleLabel, approverName, remark] of approvals) {
    // Role + status
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 60);
    doc.text(roleLabel, margin, y);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(22, 101, 52);
    doc.text("APPROVED", margin + 60, y);

    if (approverName) {
      doc.setTextColor(20, 20, 20);
      doc.text(approverName, margin + 95, y);
    }

    y += 6;
    if (remark) {
      doc.setFont("helvetica", "italic");
      doc.setTextColor(110, 110, 110);
      const remarkLines = doc.splitTextToSize(`Remark: ${remark}`, pageWidth - margin * 2 - 10);
      doc.text(remarkLines, margin + 10, y);
      y += remarkLines.length * 5;
    }

    // Signature line
    doc.setDrawColor(120, 120, 120);
    doc.setLineWidth(0.3);
    doc.line(margin + 95, y + 2, margin + 145, y + 2);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(140, 140, 140);
    doc.text("Signature", margin + 110, y + 6);
    y += 12;
  }

  // ---- Footer ----
  doc.setDrawColor(20, 60, 120);
  doc.setLineWidth(0.8);
  doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Generated on ${formatDate(new Date().toISOString())} | This is a system-generated certificate.`,
    pageWidth / 2,
    pageHeight - 18,
    { align: "center" },
  );
  doc.text("All three approvals verified electronically.", pageWidth / 2, pageHeight - 14, {
    align: "center",
  });

  // ---- Save ----
  const dateStr = req.od_date;
  doc.save(`OD_${dateStr}.pdf`);
}
