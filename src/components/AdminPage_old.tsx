import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../context/AuthContext";
import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";
import { bookingAPI, fileApprovalAPI, reportsAPI, type FileApprovalData } from "../services/api";
import "../styles.css";

type ApprovalStatus =
  | "pending_os"
  | "pending_wi"
  | "pending_dpo"
  | "pending_sr_dpo"
  | "approved"
  | "rejected";

interface ApprovalEntry {
  role: string;
  action: "approved" | "rejected";
  at: string;
  remark: string;
}

interface Booking {
  id: string;
  submittedAt: string;
  institute: string;
  bookingDate: string;
  purpose: string;
  bookingCategory: string;
  guests: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organization: string;
  streetAddress: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  panNumber: string;
  aadhaarNumber: string;
  railwayEmployeeId: string;
  nonMemberEmployeeId: string;
  guarantorName?: string;
  guarantorEmployeeId?: string;
  guarantorPhone?: string;
  ppoNumber?: string;
  acPreference: string;
  hours: string;
  aadhaarFile: string | null;
  employeeIdProof: string | null;
  nonMemberEmployeeIdProof: string | null;
  guarantorFile?: string | null;
  ppoFile?: string | null;
  paymentScreenshot: string | null;
  approvalStatus: ApprovalStatus;
  approvalHistory: ApprovalEntry[];
}

const APPROVAL_STEPS: { status: ApprovalStatus; label: string; role: Role }[] = [
  { status: "pending_os",     label: "OS",     role: "os" },
  { status: "pending_wi",     label: "WI",     role: "wi" },
  { status: "pending_dpo",    label: "DPO",    role: "dpo" },
  { status: "pending_sr_dpo", label: "SR-DPO", role: "sr-dpo" },
];

const NEXT_STATUS: Record<ApprovalStatus, ApprovalStatus> = {
  pending_os:     "pending_wi",
  pending_wi:     "pending_dpo",
  pending_dpo:    "pending_sr_dpo",
  pending_sr_dpo: "approved",
  approved:       "approved",
  rejected:       "rejected",
};

const ROLE_CAN_ACT: Record<string, ApprovalStatus> = {
  os:       "pending_os",
  wi:       "pending_wi",
  dpo:      "pending_dpo",
  "sr-dpo": "pending_sr_dpo",
};

const STATUS_LABEL: Record<ApprovalStatus, string> = {
  pending_os:     "Pending OS",
  pending_wi:     "Pending WI",
  pending_dpo:    "Pending DPO",
  pending_sr_dpo: "Pending SR-DPO",
  approved:       "Approved",
  rejected:       "Rejected",
};

const STATUS_COLOR: Record<ApprovalStatus, string> = {
  pending_os:     "#f59e0b",
  pending_wi:     "#f59e0b",
  pending_dpo:    "#f59e0b",
  pending_sr_dpo: "#f59e0b",
  approved:       "#16a34a",
  rejected:       "#dc2626",
};

const AdminPage: React.FC = () => {
  const { logout, role } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [search, setSearch] = useState("");
  const [remark, setRemark] = useState("");
  const [activeTab, setActiveTab] = useState<"bookings" | "monthly" | "daterange" | "payment">("bookings");
  const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7));
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fileApprovals, setFileApprovals] = useState<FileApprovalData | null>(null);
  const [fileApprovalLoading, setFileApprovalLoading] = useState(false);
  const [selectedFileForApproval, setSelectedFileForApproval] = useState<string | null>(null);
  const [fileApprovalRemark, setFileApprovalRemark] = useState("");

  const canAccessReports = role === "sr-dpo" || role === "admin";

  // Load bookings on mount
  useEffect(() => {
    loadBookings();
  }, []);

  // Load file approvals when selected booking changes
  useEffect(() => {
    if (selected) {
      loadFileApprovals(selected.id);
    }
  }, [selected]);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bookingAPI.getBookings();
      setBookings(data.bookings || []);
    } catch (err) {
      setError("Failed to load bookings. Please try again.");
      console.error("Error loading bookings:", err);
    } finally {
      setLoading(false);
    }
  };

  const loadFileApprovals = async (bookingId: string) => {
    try {
      setFileApprovalLoading(true);
      const data = await fileApprovalAPI.getFileApprovals(bookingId);
      setFileApprovals(data);
    } catch (err) {
      console.error("Error loading file approvals:", err);
      setFileApprovals(null);
    } finally {
      setFileApprovalLoading(false);
    }
  };

  // Helper: Calculate booking amount based on category
  const calculateBookingAmount = (booking: Booking): number => {
    const isNonRailway = booking.bookingCategory === "Non-Railway Person";
    let rateOfHiring, electricCharge, cleaningCharge, depositAmount;

    if (isNonRailway) {
      rateOfHiring = 25000;
      electricCharge = 4000;
      cleaningCharge = 3000;
      depositAmount = 10000;
    } else {
      rateOfHiring = 10000;
      electricCharge = 4000;
      cleaningCharge = 2000;
      depositAmount = 4000;
    }
    const extraHoursCharge = (parseInt(booking.hours) || 0) * 2000;
    return rateOfHiring + electricCharge + cleaningCharge + depositAmount + extraHoursCharge;
  };

  // Export to Excel
  const exportToExcel = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${fileName}_${new Date().toLocaleDateString()}.xlsx`);
  };

  // Export table to PDF
  const exportToPDF = (tableId: string, fileName: string) => {
    const element = document.getElementById(tableId);
    if (!element) return;
    const opt = {
      margin: 10,
      filename: `${fileName}_${new Date().toLocaleDateString()}.pdf`,
      image: { type: "jpeg" as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: "landscape", unit: "mm", format: "a4" },
    };
    (html2pdf() as any).set(opt).from(element).save();
  };

  const handleLogout = () => {
    logout();
    navigate("/admin-login");
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this booking?")) return;
    try {
      await bookingAPI.deleteBooking(id);
      setBookings(bookings.filter((b) => b.id !== id));
      if (selected?.id === id) setSelected(null);
      alert("Booking deleted successfully!");
    } catch (err) {
      alert("Failed to delete booking. Please try again.");
      console.error("Error deleting booking:", err);
    }
  };

  const handleAction = async (action: "approved" | "rejected") => {
    if (!selected || !role) return;
    try {
      const entry = {
        role: role.toUpperCase(),
        action,
        at: new Date().toLocaleString(),
        remark: remark.trim(),
      };
      const newStatus =
        action === "rejected" ? "rejected" : NEXT_STATUS[selected.approvalStatus];

      const updated = await bookingAPI.updateBookingStatus(selected.id, newStatus, entry);
      
      // Update local state
      const updatedBookings = bookings.map((b) =>
        b.id === selected.id ? updated : b
      );
      setBookings(updatedBookings);
      setSelected(updated);
      setRemark("");
      alert(`Booking ${action === "approved" ? "approved" : "rejected"} successfully!`);
    } catch (err) {
      alert("Failed to update booking status. Please try again.");
      console.error("Error updating booking:", err);
    }
  };

  const handleFileApproval = async (
    fileType: string,
    approvalStatus: "approved" | "rejected"
  ) => {
    if (!selected || !role) return;
    try {
      await fileApprovalAPI.approveFile({
        bookingId: selected.id,
        fileType,
        approvalStatus,
        approverRole: role,
        remarks: fileApprovalRemark.trim(),
      });

      // Reload file approvals
      await loadFileApprovals(selected.id);
      setSelectedFileForApproval(null);
      setFileApprovalRemark("");
      alert(`File ${approvalStatus === "approved" ? "approved" : "rejected"} successfully!`);
    } catch (err) {
      alert("Failed to update file approval. Please try again.");
      console.error("Error updating file approval:", err);
    }
  };

  const handleBulkFileApproval = async (fileTypes: string[]) => {
    if (!selected || !role) return;
    try {
      await fileApprovalAPI.bulkApproveFiles(selected.id, fileTypes, role);
      await loadFileApprovals(selected.id);
      alert("Files approved successfully!");
    } catch (err) {
      alert("Failed to bulk approve files. Please try again.");
      console.error("Error bulk approving files:", err);
    }
  };

  // Calculate derived values
  const visibleBookings = bookings.filter((b) => {
    if (role === "admin") return true;
    return b.approvalStatus === ROLE_CAN_ACT[role as string] ||
      b.approvalStatus === "approved" ||
      b.approvalStatus === "rejected";
  });

  const filtered = visibleBookings.filter((b) =>
    `${b.firstName} ${b.lastName} ${b.email} ${b.institute} ${b.bookingDate}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const canAct =
    role !== "admin" &&
    selected &&
    selected.approvalStatus === ROLE_CAN_ACT[role as string];

  const roleLabel = role ? role.toUpperCase() : "";

  return (
    <section className="page-section admin-page">
      <div className="admin-header-bar">
        <h2>Dashboard — {roleLabel}</h2>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {canAccessReports && (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button 
                className={activeTab === "bookings" ? "primary-button" : "secondary-button"}
                onClick={() => setActiveTab("bookings")}
              >
                Bookings
              </button>
              <button 
                className={activeTab === "monthly" ? "primary-button" : "secondary-button"}
                onClick={() => setActiveTab("monthly")}
              >
                Monthly Report
              </button>
              <button 
                className={activeTab === "daterange" ? "primary-button" : "secondary-button"}
                onClick={() => setActiveTab("daterange")}
              >
                Date Range
              </button>
              <button 
                className={activeTab === "payment" ? "primary-button" : "secondary-button"}
                onClick={() => setActiveTab("payment")}
              >
                Payment Status
              </button>
            </div>
          )}
          <button className="secondary-button" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      {activeTab === "bookings" && (
        <BookingsTab 
          loading={loading}
          error={error}
          filtered={filtered}
          selected={selected}
          setSelected={setSelected}
          search={search}
          setSearch={setSearch}
          setRemark={setRemark}
          remark={remark}
          role={role}
          canAct={canAct}
          handleAction={handleAction}
          handleDelete={handleDelete}
          fileApprovalLoading={fileApprovalLoading}
          fileApprovals={fileApprovals}
          selectedFileForApproval={selectedFileForApproval}
          setSelectedFileForApproval={setSelectedFileForApproval}
          fileApprovalRemark={fileApprovalRemark}
          setFileApprovalRemark={setFileApprovalRemark}
          handleFileApproval={handleFileApproval}
        />
      )}

      {activeTab === "monthly" && canAccessReports && (
        <MonthlyReportTab monthYear={monthYear} setMonthYear={setMonthYear} />
      )}

      {activeTab === "daterange" && canAccessReports && (
        <DateRangeReportTab fromDate={fromDate} setFromDate={setFromDate} toDate={toDate} setToDate={setToDate} />
      )}

      {activeTab === "payment" && canAccessReports && (
        <PaymentReportTab />
      )}

    </section>
  );
};

// Sub-component for Bookings Tab
const BookingsTab: React.FC<any> = ({
  loading, error, filtered, selected, setSelected, search, setSearch, setRemark, remark, role, 
  canAct, handleAction, handleDelete, fileApprovalLoading, fileApprovals, selectedFileForApproval,
  setSelectedFileForApproval, fileApprovalRemark, setFileApprovalRemark, handleFileApproval
})
                      <div className="admin-detail-header">
                        <h3>Booking Details</h3>
                        {role === "admin" && (
                          <button className="admin-delete-btn" onClick={() => handleDelete(selected.id)}>
                            Delete
                          </button>
                        )}
                      </div>

                      {(role === "admin" || role === "sr-dpo") && (
                      <div className="approval-stepper">
                        {APPROVAL_STEPS.map((step, i) => {
                          const stepIndex = APPROVAL_STEPS.findIndex(
                            (s) => s.status === (selected.approvalStatus || "pending_os")
                          );
                          const isApproved = selected.approvalStatus === "approved";
                          const isRejected = selected.approvalStatus === "rejected";
                          let state: "done" | "active" | "pending" | "rejected" = "pending";
                          if (isRejected) {
                            const rejectedAt = (selected.approvalHistory || []).findIndex((h) => h.action === "rejected");
                            const rejectedStepIdx = rejectedAt >= 0 ? rejectedAt : -1;
                            state = i < rejectedStepIdx ? "done" : i === rejectedStepIdx ? "rejected" : "pending";
                          } else if (isApproved || i < stepIndex) {
                            state = "done";
                          } else if (i === stepIndex) {
                            state = "active";
                          }
                          return (
                            <div key={step.status} className={`approval-step approval-step--${state}`}>
                              <div className="approval-step-circle">{i + 1}</div>
                              <div className="approval-step-label">{step.label}</div>
                            </div>
                          );
                        })}
                        <div className={`approval-step approval-step--${selected.approvalStatus === "approved" ? "done" : "pending"}`}>
                          <div className="approval-step-circle">✓</div>
                          <div className="approval-step-label">Final</div>
                        </div>
                      </div>
                      )}

                      <div style={{ marginBottom: "1.5rem" }}>
                        <span
                          className="approval-badge approval-badge--large"
                          style={{ background: STATUS_COLOR[selected.approvalStatus || "pending_os"] }}
                        >
                          {STATUS_LABEL[selected.approvalStatus || "pending_os"]}
                        </span>
                      </div>

                      {canAct && (
                        <div className="approval-action-box">
                          <label>Remark (optional)</label>
                          <textarea
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            placeholder="Enter your remark..."
                            rows={2}
                          />
                          <div className="approval-action-buttons">
                            <button className="approve-btn" onClick={() => handleAction("approved")}>
                              ✓ Approve
                            </button>
                            <button className="reject-btn" onClick={() => handleAction("rejected")}>
                              ✗ Reject
                            </button>
                          </div>
                        </div>
                      )}

                      {/* FILE APPROVALS SECTION */}
                      {fileApprovalLoading ? (
                        <div style={{ padding: "1rem", textAlign: "center", color: "#6b7280" }}>
                          Loading file approvals...
                        </div>
                      ) : fileApprovals ? (
                        <div style={{ marginBottom: "2rem", padding: "1rem", background: "#f9fafb", borderRadius: "0.5rem" }}>
                          <h4 style={{ marginTop: 0 }}>📄 File Approvals</h4>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "1rem" }}>
                            {[
                              { key: "aadhaarFile", label: "Aadhaar File" },
                              { key: "employeeIdProof", label: "Employee ID Proof" },
                              { key: "nonMemberEmployeeIdProof", label: "Non-Member ID Proof" },
                              { key: "guarantorFile", label: "Guarantor ID Proof" },
                              { key: "ppoFile", label: "PPO ID File" },
                              { key: "paymentScreenshot", label: "Payment Screenshot" },
                            ].map(({ key, label }) => {
                              const fileData = fileApprovals[key as keyof FileApprovalData];
                              if (!fileData) return null;
                              return (
                                <div
                                  key={key}
                                  style={{
                                    padding: "1rem",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "0.375rem",
                                    background: "white",
                                  }}
                                >
                                  <div style={{ fontWeight: "bold", marginBottom: "0.5rem" }}>{label}</div>
                                  <div
                                    style={{
                                      padding: "0.5rem 0.75rem",
                                      borderRadius: "0.25rem",
                                      marginBottom: "0.75rem",
                                      fontSize: "0.875rem",
                                      background: fileData.approved ? "#d1fae5" : "#fee2e2",
                                      color: fileData.approved ? "#065f46" : "#991b1b",
                                    }}
                                  >
                                    {fileData.approved ? "✓ Approved" : "⏳ Pending"}
                                  </div>
                                  {!fileData.approved && (canAct || role === "admin") && (
                                    <>
                                      {selectedFileForApproval === key ? (
                                        <div>
                                          <textarea
                                            placeholder="Remark (optional)"
                                            value={fileApprovalRemark}
                                            onChange={(e) => setFileApprovalRemark(e.target.value)}
                                            rows={2}
                                            style={{
                                              width: "100%",
                                              marginBottom: "0.5rem",
                                              padding: "0.5rem",
                                              borderRadius: "0.25rem",
                                              border: "1px solid #d1d5db",
                                              fontSize: "0.875rem",
                                            }}
                                          />
                                          <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.875rem" }}>
                                            <button
                                              className="approve-btn"
                                              onClick={() => handleFileApproval(key, "approved")}
                                              style={{ flex: 1, padding: "0.5rem" }}
                                            >
                                              ✓
                                            </button>
                                            <button
                                              className="reject-btn"
                                              onClick={() => handleFileApproval(key, "rejected")}
                                              style={{ flex: 1, padding: "0.5rem" }}
                                            >
                                              ✗
                                            </button>
                                            <button
                                              className="secondary-button"
                                              onClick={() => {
                                                setSelectedFileForApproval(null);
                                                setFileApprovalRemark("");
                                              }}
                                              style={{ flex: 1, padding: "0.5rem" }}
                                            >
                                              Cancel
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <button
                                          className="primary-button"
                                          onClick={() => setSelectedFileForApproval(key)}
                                          style={{ width: "100%", padding: "0.5rem", fontSize: "0.875rem" }}
                                        >
                                          Review
                                        </button>
                                      )}
                                    </>
                                  )}
                                  {fileData.history && fileData.history.length > 0 && (
                                    <div style={{ marginTop: "0.75rem", fontSize: "0.75rem", color: "#6b7280" }}>
                                      {fileData.history.map((h, i) => (
                                        <div key={i}>
                                          <strong>{h.role}</strong>: {h.action} ({new Date(h.approvedAt).toLocaleDateString()})
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                  <table className="admin-detail-table">
                    <tbody>
                      {[
                        ["Submitted At", selected.submittedAt],
                        ["Institute", selected.institute],
                        ["Booking Date", selected.bookingDate],
                        ["Purpose", selected.purpose],
                        ["Booking Category", selected.bookingCategory],
                        ["Guests", selected.guests],
                        ["First Name", selected.firstName],
                        ["Last Name", selected.lastName],
                        ["Email", selected.email],
                        ["Phone", selected.phone],
                        ["Organization", selected.organization],
                        ["Street Address", selected.streetAddress],
                        ["Address Line 2", selected.addressLine2],
                        ["City", selected.city],
                        ["State", selected.state],
                        ["ZIP", selected.zip],
                        ["Country", selected.country],
                        ["PAN Number", selected.panNumber],
                        ["Aadhaar Number", selected.aadhaarNumber],
                        ["Railway Employee ID", selected.railwayEmployeeId],
                        ["Non-Member Employee ID", selected.nonMemberEmployeeId],
                        ...(selected.bookingCategory === "Non-Railway Person" ? [
                          ["Guarantor Railway Employee Name", selected.guarantorName],
                          ["Guarantor Employee ID", selected.guarantorEmployeeId],
                          ["Guarantor Phone Number", selected.guarantorPhone],
                        ] : []),
                        ...(selected.bookingCategory === "Ex. Member / Retired Person" ? [
                          ["PPO Account Number", selected.ppoNumber],
                        ] : []),
                        ["AC Preference", selected.acPreference],
                        ["Extra Hours", selected.hours],
                      ].map(([label, value]) => (
                        <tr key={label}>
                          <td className="admin-table-label">{label}</td>
                          <td className="admin-table-value">{value || "—"}</td>
                        </tr>
                      ))}
                      {[
                        ["Aadhaar File", selected.aadhaarFile],
                        ["Employee ID Proof", selected.employeeIdProof],
                        ["Non-Member ID Proof", selected.nonMemberEmployeeIdProof],
                        ...(selected.bookingCategory === "Non-Railway Person" ? [
                          ["Guarantor ID Proof", selected.guarantorFile],
                        ] : []),
                        ...(selected.bookingCategory === "Ex. Member / Retired Person" ? [
                          ["PPO ID File", selected.ppoFile],
                        ] : []),
                        ["Payment Screenshot", selected.paymentScreenshot],
                      ].map(([label, src]) => (
                        <tr key={label}>
                          <td className="admin-table-label">{label}</td>
                          <td className="admin-table-value">
                            {src ? (
                              src.startsWith("data:image") ? (
                                <a href={src} target="_blank" rel="noreferrer">
                                  <img src={src as string} alt={label as string} className="admin-file-preview" />
                                </a>
                              ) : (
                                <a href={src} target="_blank" rel="noreferrer" download>
                                  View PDF
                                </a>
                              )
                            ) : "—"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {(selected.approvalHistory || []).length > 0 && (
                    <div className="approval-history">
                      <h4>Approval History</h4>
                      {(selected.approvalHistory || []).map((h, i) => (
                        <div key={i} className={`history-entry history-entry--${h.action}`}>
                          <span className="history-role">{h.role}</span>
                          <span className="history-action">{h.action === "approved" ? "✓ Approved" : "✗ Rejected"}</span>
                          <span className="history-at">{h.at}</span>
                          {h.remark && <span className="history-remark">"{h.remark}"</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}

        {/* MONTHLY REPORT TAB */}
        {activeTab === "monthly" && canAccessReports && (() => {
          const [reportData, setReportData] = React.useState<any[]>([]);
          const [monthlyLoading, setMonthlyLoading] = React.useState(false);

          React.useEffect(() => {
            const loadMonthlyReport = async () => {
              try {
                setMonthlyLoading(true);
                const data = await reportsAPI.getMonthlyReport(monthYear);
                setReportData(data.reportData || []);
              } catch (err) {
                console.error("Error loading monthly report:", err);
                setReportData([]);
              } finally {
                setMonthlyLoading(false);
              }
            };
            loadMonthlyReport();
          }, [monthYear]);

          return (
            <div style={{ padding: "2rem", flex: 1, overflowY: "auto" }}>
              <h3>Institute-wise Monthly Report ({monthYear})</h3>
              <div style={{ marginBottom: "1rem", display: "flex", gap: "1rem", alignItems: "flex-end" }}>
                <div>
                  <label>Select Month:</label>
                  <input type="month" value={monthYear} onChange={(e) => setMonthYear(e.target.value)} />
                </div>
                <button className="primary-button" onClick={() => exportToExcel(reportData, `Monthly_Report_${monthYear}`)}>
                  📥 Excel
                </button>
                <button className="primary-button" onClick={() => exportToPDF("monthly-table", `Monthly_Report_${monthYear}`)}>
                  📥 PDF
                </button>
              </div>
              {monthlyLoading ? (
                <div style={{ textAlign: "center", color: "#6b7280" }}>Loading report...</div>
              ) : (
                <table id="monthly-table" style={{ width: "100%", borderCollapse: "collapse", marginTop: "1rem" }}>
                  <thead>
                    <tr style={{ background: "#f3f4f6", borderBottom: "2px solid #d1d5db" }}>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "bold" }}>Institute</th>
                      <th style={{ padding: "0.75rem", textAlign: "right", fontWeight: "bold" }}>Bookings</th>
                      <th style={{ padding: "0.75rem", textAlign: "right", fontWeight: "bold" }}>Revenue</th>
                      <th style={{ padding: "0.75rem", textAlign: "right", fontWeight: "bold" }}>Approved</th>
                      <th style={{ padding: "0.75rem", textAlign: "right", fontWeight: "bold" }}>Rejected</th>
                      <th style={{ padding: "0.75rem", textAlign: "right", fontWeight: "bold" }}>Pending</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "1rem", textAlign: "center", color: "#6b7280" }}>
                          No bookings for this month
                        </td>
                      </tr>
                    ) : (
                      reportData.map((row, i) => (
                        <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                          <td style={{ padding: "0.75rem" }}>{row.Institute}</td>
                          <td style={{ padding: "0.75rem", textAlign: "right" }}>{row.Bookings}</td>
                          <td style={{ padding: "0.75rem", textAlign: "right", fontWeight: "bold", color: "#059669" }}>{row.Revenue}</td>
                          <td style={{ padding: "0.75rem", textAlign: "right", color: "#16a34a" }}>{row.Approved}</td>
                          <td style={{ padding: "0.75rem", textAlign: "right", color: "#dc2626" }}>{row.Rejected}</td>
                          <td style={{ padding: "0.75rem", textAlign: "right", color: "#f59e0b" }}>{row.Pending}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          );
        })()}

        {/* DATE RANGE REPORT TAB */}
        {activeTab === "daterange" && canAccessReports && (() => {
          const [dateRangeReportData, setDateRangeReportData] = React.useState<any[]>([]);
          const [dateRangeLoading, setDateRangeLoading] = React.useState(false);

          React.useEffect(() => {
            const loadDateRangeReport = async () => {
              if (!fromDate || !toDate) {
                setDateRangeReportData([]);
                return;
              }
              try {
                setDateRangeLoading(true);
                const data = await reportsAPI.getDateRangeReport(fromDate, toDate);
                setDateRangeReportData(data.reportData || []);
              } catch (err) {
                console.error("Error loading date range report:", err);
                setDateRangeReportData([]);
              } finally {
                setDateRangeLoading(false);
              }
            };
            loadDateRangeReport();
          }, [fromDate, toDate]);

          return (
            <div style={{ padding: "2rem", flex: 1, overflowY: "auto" }}>
              <h3>Date-wise Booking Summary</h3>
              <div style={{ marginBottom: "1.5rem", display: "flex", gap: "1rem", alignItems: "flex-end" }}>
                <div>
                  <label>From Date:</label>
                  <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
                </div>
                <div>
                  <label>To Date:</label>
                  <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
                </div>
                <button className="primary-button" onClick={() => {
                  exportToExcel(dateRangeReportData, `DateRange_${fromDate}_to_${toDate}`);
                }}>
                  📥 Excel
                </button>
                <button className="primary-button" onClick={() => exportToPDF("daterange-table", `DateRange_${fromDate}_to_${toDate}`)}>
                  📥 PDF
                </button>
              </div>
              {dateRangeLoading ? (
                <div style={{ textAlign: "center", color: "#6b7280" }}>Loading report...</div>
              ) : (
                <table id="daterange-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f3f4f6", borderBottom: "2px solid #d1d5db" }}>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "bold" }}>Booking Date</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "bold" }}>Name</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "bold" }}>Institute</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "bold" }}>Category</th>
                      <th style={{ padding: "0.75rem", textAlign: "right", fontWeight: "bold" }}>Amount</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "bold" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dateRangeReportData.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "1rem", textAlign: "center", color: "#6b7280" }}>
                          No bookings in this date range
                        </td>
                      </tr>
                    ) : (
                      dateRangeReportData.map((b, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb" }}>
                          <td style={{ padding: "0.75rem" }}>{b["Booking Date"]}</td>
                          <td style={{ padding: "0.75rem" }}>{b.Name}</td>
                          <td style={{ padding: "0.75rem" }}>{b.Institute}</td>
                          <td style={{ padding: "0.75rem" }}>{b.Category}</td>
                          <td style={{ padding: "0.75rem", textAlign: "right", fontWeight: "bold", color: "#059669" }}>{b.Amount}</td>
                          <td style={{ padding: "0.75rem" }}>
                            <span style={{ background: STATUS_COLOR[b.statusKey], color: "white", padding: "0.25rem 0.5rem", borderRadius: "0.25rem", fontSize: "0.875rem" }}>
                              {b.Status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          );
        })()}

        {/* PAYMENT STATUS TAB */}
        {activeTab === "payment" && canAccessReports && (() => {
          const [paymentReportData, setPaymentReportData] = React.useState<any[]>([]);
          const [paymentLoading, setPaymentLoading] = React.useState(false);

          React.useEffect(() => {
            const loadPaymentReport = async () => {
              try {
                setPaymentLoading(true);
                const data = await reportsAPI.getPaymentStatusReport();
                setPaymentReportData(data.reportData || []);
              } catch (err) {
                console.error("Error loading payment status report:", err);
                setPaymentReportData([]);
              } finally {
                setPaymentLoading(false);
              }
            };
            loadPaymentReport();
          }, []);

          return (
            <div style={{ padding: "2rem", flex: 1, overflowY: "auto" }}>
              <h3>Payment Status Report</h3>
              <div style={{ marginBottom: "1rem" }}>
                <button className="primary-button" onClick={() => exportToExcel(paymentReportData, "Payment_Status_Report")}>
                  📥 Excel
                </button>
                <button className="primary-button" style={{ marginLeft: "0.5rem" }} onClick={() => exportToPDF("payment-table", "Payment_Status_Report")}>
                  📥 PDF
                </button>
              </div>
              {paymentLoading ? (
                <div style={{ textAlign: "center", color: "#6b7280" }}>Loading report...</div>
              ) : (
                <table id="payment-table" style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f3f4f6", borderBottom: "2px solid #d1d5db" }}>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "bold" }}>Booking ID</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "bold" }}>Name</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "bold" }}>Institute</th>
                      <th style={{ padding: "0.75rem", textAlign: "right", fontWeight: "bold" }}>Amount</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "bold" }}>Payment</th>
                      <th style={{ padding: "0.75rem", textAlign: "left", fontWeight: "bold" }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentReportData.length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ padding: "1rem", textAlign: "center", color: "#6b7280" }}>
                          No bookings found
                        </td>
                      </tr>
                    ) : (
                      paymentReportData.map((b, idx) => (
                        <tr key={idx} style={{ borderBottom: "1px solid #e5e7eb" }}>
                          <td style={{ padding: "0.75rem", fontSize: "0.875rem" }}>{b["Booking ID"]}</td>
                          <td style={{ padding: "0.75rem" }}>{b.Name}</td>
                          <td style={{ padding: "0.75rem" }}>{b.Institute}</td>
                          <td style={{ padding: "0.75rem", fontWeight: "bold", color: "#059669" }}>{b.Amount}</td>
                          <td style={{ padding: "0.75rem" }}>
                            <span style={{ color: b["Payment"] === "✓ Uploaded" ? "#16a34a" : "#dc2626", fontWeight: "bold" }}>
                              {b["Payment"]}
                            </span>
                          </td>
                          <td style={{ padding: "0.75rem" }}>
                            <span style={{ background: STATUS_COLOR[b.statusKey], color: "white", padding: "0.25rem 0.5rem", borderRadius: "0.25rem", fontSize: "0.875rem" }}>
                              {b.Status}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>
          );
        })()}
      </div>
    </section>
  );
};

export default AdminPage;
