import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import type { Role } from "../context/AuthContext";
import * as XLSX from "xlsx";
import html2pdf from "html2pdf.js";
import { bookingAPI, reportsAPI, blockedDatesAPI } from "../services/api";
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
  validationStatus?: string;
}

interface Booking {
  id: string;
  submittedAt: string;
  employeeEmail?: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  designation?: string;
  department?: string;
  organization: string;
  streetAddress: string;
  addressLine2: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  panNumber: string;
  aadhaarNumber: string;
  institute: string;
  bookingDate: string;
  purpose: string;
  bookingCategory: string;
  eventType?: string;
  eventDuration?: string;
  facilities?: string;
  specialRequirements?: string;
  guests: string;
  railwayEmployeeId: string;
  nonMemberEmployeeId: string;
  guarantorName?: string;
  guarantorEmployeeId?: string;
  guarantorPhone?: string;
  ppoNumber?: string;
  acPreference: string;
  hours: string;
  aadhaarFileName?: string | null;
  railwayEmployeeIdProofFileName?: string | null;
  nonMemberEmployeeIdProofFileName?: string | null;
  paymentScreenshotFileName?: string | null;
  ppoFileName?: string | null;
  aadhaarFile: string | null;
  employeeIdProof: string | null;
  nonMemberEmployeeIdProof: string | null;
  guarantorFile?: string | null;
  ppoFile?: string | null;
  guarantorFileName?: string | null;
  paymentScreenshot: string | null;
  approvalStatus: ApprovalStatus;
  approvalHistory: ApprovalEntry[];
  refNo?: string;
  amountPaid?: string;
  accountNo?: string;
  ifscCode?: string;
  bankName?: string;
}

const constructFileUrl = (fileType: string | null, bookingId: string | null): string | null => {
  if (!fileType || !bookingId) return null;

  // Map file types to backend download endpoints
  const fileTypeMap: Record<string, string> = {
    aadhaarCard: "aadhaarCard",
    aadhaarFile: "aadhaarCard",
    employeeIdProof: "employeeIdProof",
    railwayEmployeeIdProof: "employeeIdProof",
    nonMemberEmployeeIdProof: "nonMemberIdProof",
    guarantorFile: "guarantorFile",
    ppoFile: "ppoFile",
    paymentScreenshot: "paymentScreenshot",
  };

  const mappedType = fileTypeMap[fileType] || fileType;
  const downloadUrl = `http://localhost:8080/api/requests/${bookingId}/download/${mappedType}`;
  
  return downloadUrl;
};

const NEXT_STATUS: Record<ApprovalStatus, ApprovalStatus> = {
  pending_os:     "pending_wi",
  pending_wi:     "pending_dpo",
  pending_dpo:    "pending_sr_dpo",
  pending_sr_dpo: "approved",
  approved:       "approved",
  rejected:       "rejected",
};

const resolveReportValue = (row: any, keys: string[], defaultValue: any = "-") => {
  for (const key of keys) {
    if (row && row[key] !== undefined && row[key] !== null && row[key] !== "") {
      return row[key];
    }
  }
  return defaultValue;
};

const normalizeApprovalRole = (rawRole: string | undefined | null): Role | "unknown" => {
  if (!rawRole) return "unknown";
  const normalized = rawRole.toString().trim().toLowerCase().replace(/_/g, "-").replace(/\s+/g, "-");
  if (normalized === "os") return "os";
  if (normalized === "wi") return "wi";
  if (normalized === "dpo") return "dpo";
  if (normalized === "sr-dpo" || normalized === "srdpo") return "sr-dpo";
  if (normalized === "admin") return "admin";
  return "unknown";
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

const APPROVAL_STEPS: { status: ApprovalStatus; label: string; role: Role }[] = [
  { status: "pending_os",     label: "OS",     role: "os" },
  { status: "pending_wi",     label: "WI",     role: "wi" },
  { status: "pending_dpo",    label: "DPO",    role: "dpo" },
  { status: "pending_sr_dpo", label: "SR-DPO", role: "sr-dpo" },
];

const BACKEND_TO_UI_STATUS: Record<string, ApprovalStatus> = {
  pending: "pending_os",
  os_approved: "pending_wi",
  wi_approved: "pending_dpo",
  dpo_approved: "pending_sr_dpo",
  approved: "approved",
  rejected: "rejected",
};

const mapApprovalStatus = (status?: string): ApprovalStatus => {
  if (!status) return "pending_os";
  const normalized = status.toString().trim().toLowerCase();
  if (normalized in BACKEND_TO_UI_STATUS) {
    return BACKEND_TO_UI_STATUS[normalized];
  }
  // support existing UI strings
  if (normalized === "pending_os" || normalized === "pending_wi" || normalized === "pending_dpo" || normalized === "pending_sr_dpo" || normalized === "approved" || normalized === "rejected") {
    return normalized as ApprovalStatus;
  }
  return "pending_os"; // fallback
};

const normalizeMonthlyReportData = (reportData: any[]): any[] => {
  if (!Array.isArray(reportData) || reportData.length === 0) return [];
  const hasAggregateFields = reportData.every((row) => row && (row.bookings !== undefined || row.Revenue !== undefined || row.revenue !== undefined));
  if (hasAggregateFields) return reportData;

  const group: Record<string, any> = {};
  reportData.forEach((row) => {
    const institute = resolveReportValue(row, ["institute", "Institute", "InstituteName"], "Unknown");
    const approvalStatus = resolveReportValue(row, ["approvalStatus", "status", "ApprovalStatus"], "pending").toString().toLowerCase();
    const amount = Number(resolveReportValue(row, ["revenue", "Revenue", "amount", "total", "payment"], 0)) || 0;
    if (!group[institute]) {
      group[institute] = { institute, bookings: 0, revenue: 0, approved: 0, rejected: 0, pending: 0 };
    }
    group[institute].bookings += 1;
    group[institute].revenue += amount;
    if (approvalStatus.includes("approved")) {
      group[institute].approved += 1;
    } else if (approvalStatus.includes("reject")) {
      group[institute].rejected += 1;
    } else {
      group[institute].pending += 1;
    }
  });
  return Object.values(group);
};

const normalizeDateRangeReportData = (reportData: any[]): any[] => {
  if (!Array.isArray(reportData) || reportData.length === 0) return [];
  return reportData.map((row) => {
    const amount = Number(resolveReportValue(row, ["amount", "Amount", "paymentAmount", "revenue"], 0)) || 0;
    const bookingCategory = resolveReportValue(row, ["bookingCategory", "Booking Category", "category"], "");
    const hours = Number(resolveReportValue(row, ["hours", "duration", "eventDuration"], 0)) || 0;
    return {
      ...row,
      amount: amount || 0,
      name: resolveReportValue(row, ["applicantFirstName", "applicantLastName"], "") ? `${resolveReportValue(row, ["applicantFirstName"], "")} ${resolveReportValue(row, ["applicantLastName"], "")}`.trim() : resolveReportValue(row, ["name", "Name"], ""),
      bookingDate: resolveReportValue(row, ["bookingDate", "Booking Date", "date"], ""),
      institute: resolveReportValue(row, ["institute", "Institute"], ""),
      category: bookingCategory || resolveReportValue(row, ["category", "Category"], ""),
      status: resolveReportValue(row, ["approvalStatus", "status", "Status"], ""),
    };
  });
};

const normalizePaymentStatusData = (reportData: any[]): any[] => {
  if (!Array.isArray(reportData) || reportData.length === 0) return [];
  return reportData.map((row) => ({
    ...row,
    id: resolveReportValue(row, ["id", "bookingId", "requestId"], ""),
    name: resolveReportValue(row, ["applicantFirstName", "applicantLastName"], "") ? `${resolveReportValue(row, ["applicantFirstName"], "")} ${resolveReportValue(row, ["applicantLastName"], "")}`.trim() : resolveReportValue(row, ["name", "Name", "applicantName"], ""),
    institute: resolveReportValue(row, ["institute", "Institute"], ""),
    bookingCategory: resolveReportValue(row, ["bookingCategory", "category", "BookingCategory"], ""),
    amount: Number(resolveReportValue(row, ["amount", "Amount", "total", "payment"], 0)) || 0,
    payment: resolveReportValue(row, ["paymentStatus", "Payment", "payment"], ""),
    status: resolveReportValue(row, ["approvalStatus", "status", "Status"], ""),
  }));
};

const ROLE_CAN_ACT: Record<string, ApprovalStatus> = {
  os:       "pending_os",
  wi:       "pending_wi",
  dpo:      "pending_dpo",
  "sr-dpo": "pending_sr_dpo",
};

const AdminPage: React.FC = () => {
  const { logout, role, institute } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selected, setSelected] = useState<Booking | null>(null);
  const [search, setSearch] = useState("");
  const [remark, setRemark] = useState("");
  const [validationStatus, setValidationStatus] = useState("");
  const [activeTab, setActiveTab] = useState<"bookings" | "monthly" | "daterange" | "payment" | "dateblocking">("bookings");
  const [monthYear, setMonthYear] = useState(new Date().toISOString().slice(0, 7));
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [blockedDates, setBlockedDates] = useState<any[]>([]);
  const [blockedDatesLoading, setBlockedDatesLoading] = useState(false);
  const [dateToBlock, setDateToBlock] = useState("");
  const [selectedInstitute, setSelectedInstitute] = useState("");

  const canAccessReports = role === "sr-dpo" || role === "admin" ;

  useEffect(() => {
    loadBookings();
    loadBlockedDates();
  }, []);

  const loadBlockedDates = async () => {
    try {
      setBlockedDatesLoading(true);
      const data = await blockedDatesAPI.getAllBlockedDates();
      setBlockedDates(data || []);
    } catch (err) {
      console.error("Failed to load blocked dates:", err);
      setBlockedDates([]);
    } finally {
      setBlockedDatesLoading(false);
    }
  };

  useEffect(() => {
    const onBookingSubmitted = () => {
      loadBookings();
    };

    window.addEventListener("bookingSubmitted", onBookingSubmitted);
    return () => {
      window.removeEventListener("bookingSubmitted", onBookingSubmitted);
    };
  }, []);

  const loadBookings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await bookingAPI.getBookings();
      const bookingData = Array.isArray(data) ? data : data.bookings || [];
      const normalizedBookings = bookingData.map((booking: any) => {
        // Handle different possible ID field names from backend
        const bookingId = booking.requestId || booking.id;

        const normalizedBooking = {
          ...booking,
          id: bookingId,
          submittedAt: booking.createdDate || booking.requestDate || booking.submittedAt,
          employeeEmail: booking.employeeEmail || booking.applicantEmail,
          firstName: booking.applicantFirstName || booking.firstName,
          lastName: booking.applicantLastName || booking.lastName,
          email: booking.applicantEmail || booking.email,
          phone: booking.applicantPhone || booking.phone,
          designation: booking.designation,
          department: booking.department,
          organization: booking.organization,
          streetAddress: booking.streetAddress,
          addressLine2: booking.addressLine2,
          city: booking.city,
          state: booking.state,
          zip: booking.zip,
          country: booking.country,
          panNumber: booking.panNumber,
          aadhaarNumber: booking.aadhaarNumber,
          institute: booking.institute,
          bookingDate: booking.bookingDate,
          purpose: booking.purpose,
          bookingCategory: booking.bookingCategory,
          eventType: booking.eventType,
          eventDuration: booking.eventDuration,
          facilities: booking.facilities,
          specialRequirements: booking.specialRequirements,
          guests: booking.guests,
          railwayEmployeeId: booking.railwayEmployeeId,
          nonMemberEmployeeId: booking.nonMemberEmployeeId,
          guarantorName: booking.guarantorName,
          guarantorEmployeeId: booking.guarantorEmployeeId,
          guarantorPhone: booking.guarantorPhone,
          ppoNumber: booking.ppoNumber || booking.ppo_number || "",
          acPreference: booking.acPreference,
          hours: booking.hours,

          // Extract payment screenshot filename from fileApprovalData JSON if not available as dedicated field
          paymentScreenshotFileName: (() => {
            let filename = booking.paymentScreenshotFileName || booking.paymentScreenshot || booking.payment_screenshot_file_name || null;

            // If not found in dedicated field, try to extract from fileApprovalData JSON
            if (!filename && booking.fileApprovalData) {
              try {
                const fileApprovalData = typeof booking.fileApprovalData === 'string'
                  ? JSON.parse(booking.fileApprovalData)
                  : booking.fileApprovalData;

                if (fileApprovalData && fileApprovalData.paymentScreenshot && fileApprovalData.paymentScreenshot.fileName) {
                  filename = fileApprovalData.paymentScreenshot.fileName;
                }
              } catch (e) {
                // Silent catch for parse errors
              }
            }

            return filename;
          })(),

          // Handle file existence with file name fields and construct download URLs
          aadhaarFileName: booking.aadhaarFileName || booking.aadhaar_file_name || null,
          railwayEmployeeIdProofFileName: booking.railwayEmployeeIdProofFileName || booking.railway_employee_id_proof_file_name || null,
          nonMemberEmployeeIdProofFileName: booking.nonMemberEmployeeIdProofFileName || booking.non_member_employee_id_proof_file_name || null,
          ppoFileName: booking.ppoFileName || booking.ppo_file_name || null,
          guarantorFileName: booking.guarantorFileName || booking.guarantor_file_name || null,
          aadhaarFile: (booking.aadhaarFileName || booking.aadhaar_file_name) ? constructFileUrl("aadhaarCard", bookingId) : null,
          employeeIdProof: (booking.railwayEmployeeIdProofFileName || booking.railway_employee_id_proof_file_name) ? constructFileUrl("employeeIdProof", bookingId) : null,
          nonMemberEmployeeIdProof: (booking.nonMemberEmployeeIdProofFileName || booking.non_member_employee_id_proof_file_name) ? constructFileUrl("nonMemberIdProof", bookingId) : null,
          guarantorFile: (booking.guarantorFileName || booking.guarantor_file_name) ? constructFileUrl("guarantorFile", bookingId) : null,
          ppoFile: (() => {
            // First try dedicated fields
            let filename = booking.ppoFile || booking.ppo_file || booking.ppoFileName || booking.ppo_file_name || null;

            // If not found in dedicated field, try to extract from fileApprovalData JSON
            if (!filename && booking.fileApprovalData) {
              try {
                const fileApprovalData = typeof booking.fileApprovalData === 'string'
                  ? JSON.parse(booking.fileApprovalData)
                  : booking.fileApprovalData;

                if (fileApprovalData && fileApprovalData.ppoFile && fileApprovalData.ppoFile.fileName) {
                  filename = fileApprovalData.ppoFile.fileName;
                }
              } catch (e) {
                // Silent catch for parse errors
              }
            }

            return filename ? constructFileUrl("ppoFile", bookingId) : null;
          })(),
          paymentScreenshot: (() => {
            const filename = (() => {
              let fname = booking.paymentScreenshotFileName || booking.paymentScreenshot || booking.payment_screenshot_file_name || null;

              // If not found in dedicated field, try to extract from fileApprovalData JSON
              if (!fname && booking.fileApprovalData) {
                try {
                  const fileApprovalData = typeof booking.fileApprovalData === 'string'
                    ? JSON.parse(booking.fileApprovalData)
                    : booking.fileApprovalData;

                  if (fileApprovalData && fileApprovalData.paymentScreenshot && fileApprovalData.paymentScreenshot.fileName) {
                    fname = fileApprovalData.paymentScreenshot.fileName;
                  }
                } catch (e) {
                  // Silent catch for parse errors
                }
              }

              return fname;
            })();

            return filename ? constructFileUrl("paymentScreenshot", bookingId) : null;
          })(),
          refNo: booking.refNo || booking.ref_no || booking.referenceNo || booking.reference_no || "",
          amountPaid: booking.amountPaid || booking.amount_paid || booking.amount || booking.totalAmount || "",
          accountNo: booking.accountNo || booking.account_no || booking.accountNumber || booking.account_number || "",
          ifscCode: booking.ifscCode || booking.ifsc_code || booking.ifsc || "",
          bankName: booking.bankName || booking.bank_name || booking.bank || "",
          approvalStatus: mapApprovalStatus(booking.approvalStatus),
          approvalHistory: booking.approvalHistory || [],
        };

        return normalizedBooking;
      });
      setBookings(normalizedBookings);
    } catch (err) {
      setError("Failed to load bookings. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

  const exportToExcel = (data: any[], fileName: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Report");
    XLSX.writeFile(workbook, `${fileName}_${new Date().toLocaleDateString()}.xlsx`);
  };

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
    }
  };

  const handleAction = async (action: "approved" | "rejected") => {
    if (!selected || !role) return;
    if (!selected.id) {
      alert("Cannot perform action: booking ID is missing");
      return;
    }

    // Validate required fields
    if (!remark.trim()) {
      alert("Remark is required");
      return;
    }

    if ((role === "os" || role === "wi" || role === "dpo") && !validationStatus) {
      alert("Validation status is required");
      return;
    }

    try {
      const entry = {
        role: role.toUpperCase(),
        action,
        at: new Date().toLocaleString(),
        remark: remark.trim(),
        validationStatus: (role === "os" || role === "wi" || role === "dpo") ? validationStatus : undefined,
      };
      const newStatus = action === "rejected" ? "rejected" : NEXT_STATUS[selected.approvalStatus];
      const updated = await bookingAPI.updateBookingStatus(selected.id, newStatus, entry, role);

      const updatedBookings = bookings.map((b) =>
        b.id === selected.id ? updated : b
      );
      setBookings(updatedBookings);
      setSelected(updated);
      setRemark("");
      setValidationStatus("");
      setValidationStatus("");
      alert(`Booking ${action === "approved" ? "approved" : "rejected"} successfully!`);
    } catch (err) {
      alert("Failed to update booking status. Please try again.");
    }
  };

  const isSrDpo = role === "sr-dpo";

  const srDpoPending = bookings.filter((b) => 
    b.approvalStatus === "pending_sr_dpo" && 
    (!institute || b.institute?.toString().toLowerCase() === institute.toLowerCase())
  );
  const srDpoInProgress = bookings.filter((b) =>
    ["pending_os", "pending_wi", "pending_dpo"].includes(b.approvalStatus) &&
    (!institute || b.institute?.toString().toLowerCase() === institute.toLowerCase())
  );
  const srDpoFinalized = bookings.filter((b) =>
    ["approved", "rejected"].includes(b.approvalStatus) &&
    (!institute || b.institute?.toString().toLowerCase() === institute.toLowerCase())
  );

  const visibleBookings = isSrDpo
    ? [...srDpoPending, ...srDpoInProgress, ...srDpoFinalized]
    : bookings.filter((b) => {
        if (role === "admin") return true;
        const targetStatus = ROLE_CAN_ACT[role as string];
        if (!institute) {
          // DPO has no institute assigned in auth context, so show all DPO-eligible bookings
          return (
            b.approvalStatus === targetStatus ||
            b.approvalStatus === "approved" ||
            b.approvalStatus === "rejected"
          );
        }
        const matchedInstitute = b.institute?.toString().toLowerCase() === institute.toLowerCase();
        if (!matchedInstitute) return false;
        return (
          b.approvalStatus === targetStatus ||
          b.approvalStatus === "approved" ||
          b.approvalStatus === "rejected"
        );
      });

  const filterFn = (b: Booking) =>
    `${b.firstName} ${b.lastName} ${b.email} ${b.institute} ${b.bookingDate}`
      .toLowerCase()
      .includes(search.toLowerCase());

  const filtered = visibleBookings.filter(filterFn);
  const srDpoFiltered = (list: Booking[]) => list.filter(filterFn);
  const visiblePending = visibleBookings.filter((b) => b.approvalStatus === ROLE_CAN_ACT[role as string]);
  const visibleFinalized = visibleBookings.filter((b) => ["approved", "rejected"].includes(b.approvalStatus));

  const canAct = role !== "admin" && selected && selected.approvalStatus === ROLE_CAN_ACT[role as string];
  const roleLabel = role ? `${role.toUpperCase()}${institute ? ` / ${institute.toUpperCase()}` : ""}` : "";

  return (
    <section className="page-section admin-page">
      <div className="admin-header-bar">
        <h2>Dashboard — {roleLabel}</h2>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          {canAccessReports && (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className={activeTab === "bookings" ? "primary-button" : "secondary-button"} onClick={() => setActiveTab("bookings")}>Bookings</button>
              <button className={activeTab === "monthly" ? "primary-button" : "secondary-button"} onClick={() => setActiveTab("monthly")}>Monthly Report</button>
              <button className={activeTab === "daterange" ? "primary-button" : "secondary-button"} onClick={() => setActiveTab("daterange")}>Date Range</button>
              <button className={activeTab === "payment" ? "primary-button" : "secondary-button"} onClick={() => setActiveTab("payment")}>Payment Status</button>
              {(role === "sr-dpo" || role === "admin") && (
                <button className={activeTab === "dateblocking" ? "primary-button" : "secondary-button"} onClick={() => setActiveTab("dateblocking")}>Block Dates</button>
              )}
            </div>
          )}
          <button className="secondary-button" onClick={handleLogout}>Logout</button>
        </div>
      </div>

      <div className="admin-body">
        {activeTab === "bookings" && (
          <>
            {loading && <div className="admin-empty">Loading bookings...</div>}
            {error && <div className="admin-empty" style={{ color: "#dc2626" }}>{error}</div>}
            {!loading && !error && (
              <>
                <div className="admin-list-panel">
                  <div className="admin-search">
                    <input type="text" placeholder="Search by name, email, institute..." value={search} onChange={(e) => setSearch(e.target.value)} />
                  </div>
                  {isSrDpo ? (
                    <>
                      <section style={{ marginBottom: "1rem" }}>
                        <h4>SR-DPO Pending</h4>
                        {srDpoFiltered(srDpoPending).length === 0 ? (
                          <p className="admin-empty">No pending SR-DPO requests.</p>
                        ) : (
                          srDpoFiltered(srDpoPending).map((b) => (
                            <div key={b.id} className={`admin-booking-card ${selected?.id === b.id ? "active" : ""}`} onClick={() => { setSelected(b); setRemark(""); }}>
                              <div className="admin-card-name">{b.firstName} {b.lastName}</div>
                              <div className="admin-card-meta">{b.institute} — {b.bookingDate}</div>
                              <span className="approval-badge" style={{ background: STATUS_COLOR[b.approvalStatus || "pending_os"] }}>
                                {STATUS_LABEL[b.approvalStatus || "pending_os"]}
                              </span>
                            </div>
                          ))
                        )}
                      </section>

                      <section style={{ marginBottom: "1rem" }}>
                        <h4>In Review (Other levels)</h4>
                        {srDpoFiltered(srDpoInProgress).length === 0 ? (
                          <p className="admin-empty">No in-progress requests from OS/WI/DPO.</p>
                        ) : (
                          srDpoFiltered(srDpoInProgress).map((b) => (
                            <div key={b.id} className={`admin-booking-card ${selected?.id === b.id ? "active" : ""}`} onClick={() => { setSelected(b); setRemark(""); setValidationStatus(""); }}>
                              <div className="admin-card-name">{b.firstName} {b.lastName}</div>
                              <div className="admin-card-meta">{b.institute} — {b.bookingDate}</div>
                              <span className="approval-badge" style={{ background: STATUS_COLOR[b.approvalStatus || "pending_os"] }}>
                                {STATUS_LABEL[b.approvalStatus || "pending_os"]}
                              </span>
                            </div>
                          ))
                        )}
                      </section>

                      <section style={{ marginBottom: "1rem" }}>
                        <h4>SR-DPO Records (Approved + Rejected)</h4>
                        {srDpoFiltered(srDpoFinalized).length === 0 ? (
                          <p className="admin-empty">No finalized SR-DPO records.</p>
                        ) : (
                          srDpoFiltered(srDpoFinalized).map((b) => (
                            <div key={b.id} className={`admin-booking-card ${selected?.id === b.id ? "active" : ""}`} onClick={() => { setSelected(b); setRemark(""); setValidationStatus(""); }}>
                              <div className="admin-card-name">{b.firstName} {b.lastName}</div>
                              <div className="admin-card-meta">{b.institute} — {b.bookingDate}</div>
                              <span className="approval-badge" style={{ background: STATUS_COLOR[b.approvalStatus || "pending_os"] }}>
                                {STATUS_LABEL[b.approvalStatus || "pending_os"]}
                              </span>
                            </div>
                          ))
                        )}
                      </section>
                    </>
                  ) : (
                    <>
                      <section style={{ marginBottom: "1rem" }}>
                        <h4>Pending {role?.toUpperCase() || ""} Requests</h4>
                        {visiblePending.filter(filterFn).length === 0 ? (
                          <p className="admin-empty">No pending requests for your role and institute.</p>
                        ) : (
                          visiblePending.filter(filterFn).map((b) => (
                            <div key={b.id} className={`admin-booking-card ${selected?.id === b.id ? "active" : ""}`} onClick={() => { setSelected(b); setRemark(""); setValidationStatus(""); }}>
                              <div className="admin-card-name">{b.firstName} {b.lastName}</div>
                              <div className="admin-card-meta">{b.institute} — {b.bookingDate}</div>
                              <span className="approval-badge" style={{ background: STATUS_COLOR[b.approvalStatus || "pending_os"] }}>
                                {STATUS_LABEL[b.approvalStatus || "pending_os"]}
                              </span>
                            </div>
                          ))
                        )}
                      </section>

                      <section style={{ marginBottom: "1rem" }}>
                        <h4>Approved / Rejected Records</h4>
                        {visibleFinalized.filter(filterFn).length === 0 ? (
                          <p className="admin-empty">No finalized records yet.</p>
                        ) : (
                          visibleFinalized.filter(filterFn).map((b) => (
                            <div key={b.id} className={`admin-booking-card ${selected?.id === b.id ? "active" : ""}`} onClick={() => { setSelected(b); setRemark(""); setValidationStatus(""); }}>
                              <div className="admin-card-name">{b.firstName} {b.lastName}</div>
                              <div className="admin-card-meta">{b.institute} — {b.bookingDate}</div>
                              <span className="approval-badge" style={{ background: STATUS_COLOR[b.approvalStatus || "pending_os"] }}>
                                {STATUS_LABEL[b.approvalStatus || "pending_os"]}
                              </span>
                            </div>
                          ))
                        )}
                      </section>
                    </>
                  )}
                </div>

                <div className="admin-detail-panel">
                  {!selected ? (
                    <div className="admin-empty">Select a booking to view details.</div>
                  ) : (
                    <>
                      <div className="admin-detail-header">
                        <h3>Booking Details</h3>
                        {role === "admin" && <button className="admin-delete-btn" onClick={() => handleDelete(selected.id)}>Delete</button>}
                      </div>

                      {(role === "admin" || role === "sr-dpo") && (
                        <div className="approval-stepper">
                          {APPROVAL_STEPS.map((step, i) => {
                            const stepIndex = APPROVAL_STEPS.findIndex((s) => s.status === (selected.approvalStatus || "pending_os"));
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
                        <span className="approval-badge approval-badge--large" style={{ background: STATUS_COLOR[selected.approvalStatus || "pending_os"] }}>
                          {STATUS_LABEL[selected.approvalStatus || "pending_os"]}
                        </span>
                      </div>

                      {canAct && (
                        <div className="approval-action-box">
                          {(role === "os" || role === "wi" || role === "dpo") && (
                            <div style={{ marginBottom: "1rem" }}>
                              <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "bold" }}>
                                Validation Status <span style={{ color: "#dc2626" }}>*</span>
                              </label>
                              <select
                                value={validationStatus}
                                onChange={(e) => setValidationStatus(e.target.value)}
                                style={{
                                  width: "100%",
                                  padding: "0.5rem",
                                  border: "1px solid #d1d5db",
                                  borderRadius: "0.375rem",
                                  fontSize: "0.875rem"
                                }}
                                required
                              >
                                <option value="">Select validation status</option>
                                <option value="valid">Valid booking data</option>
                                <option value="valid_with_issues">Valid but not having correct details</option>
                              </select>
                            </div>
                          )}
                          {role === "os" && role === "wi" && role === "dpo" && (
                            <label>Remark <span style={{ color: "#dc2626" }}>*</span></label>
                          )}
                          <textarea
                            value={remark}
                            onChange={(e) => setRemark(e.target.value)}
                            placeholder="Enter your remark..."
                            rows={2}
                            required
                          />
                          <div className="approval-action-buttons">
                            {role !== "os" && role !== "wi" && role !== "dpo" && (
                              <button className="approve-btn" onClick={() => handleAction("approved")}>✓ Approve</button>
                            )}
                            {role === "os" || role === "wi" || role === "dpo" ? (
                              <button className="approve-btn" onClick={() => handleAction("approved")}>✓ Forwarded (with Remarks)</button>
                            ) : null}
                            {role !== "os" && role !== "wi" && (
                              <button className="reject-btn" onClick={() => handleAction("rejected")}>✗ Reject</button>
                            )}
                          </div>
                        </div>
                      )}

                      <table className="admin-detail-table">
                        <tbody>
                          {[
                            ["Booking ID", selected.id],
                            ["Submitted At", selected.submittedAt || "N/A"],
                            ["Employee Email", selected.employeeEmail || selected.email], // Use employeeEmail if available, fallback to email
                            ["First Name", selected.firstName],
                            ["Last Name", selected.lastName],
                            ["Email", selected.email], // This is the contact email, different from employeeEmail
                            ["Phone", selected.phone],
                            // ["Designation", selected.designation || "—"], // Add designation field
                            // ["Department", selected.department || "—"], // Add department field
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
                            ...(selected.bookingCategory === "Ex. Member / Retired Person" ? [["PPO Number", selected.ppoNumber]] : []),
                            ...(selected.bookingCategory === "Non-Railway Person" ? [
                              ["Guarantor Name", selected.guarantorName],
                              ["Guarantor Employee ID", selected.guarantorEmployeeId],
                              ["Guarantor Phone", selected.guarantorPhone]
                            ] : []),
                            ["Institute", selected.institute],
                            ["Booking Date", selected.bookingDate],
                            ["Purpose", selected.purpose],
                            ["Booking Category", selected.bookingCategory],
                            ["Event Type", selected.eventType || "—"], // Add event type
                            ["Event Duration", selected.eventDuration || "—"], // Add event duration
                            ["Facilities", selected.facilities || "—"], // Add facilities
                            // ["Special Requirements", selected.specialRequirements || "—"], // Add special requirements
                            ["Guests", selected.guests],
                            ["Ref. NO", selected.refNo || "—"],
                            ["Amount Paid", selected.amountPaid || "—"],
                            ["Account No.", selected.accountNo || "—"],
                            ["IFSC Code", selected.ifscCode || "—"],
                            ["Bank Name", selected.bankName || "—"],
                          ].map(([label, value]) => (
                            <tr key={label}>
                              <td className="admin-table-label">{label}</td>
                              <td className="admin-table-value">{value || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {/* Uploaded Documents Section */}
                      <div style={{ marginTop: "2rem", padding: "1rem", background: "#f9fafb", borderRadius: "0.5rem" }}>
                        <h4 style={{ marginTop: 0, marginBottom: "1rem" }}>📎 Uploaded Documents</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
                          {[
                            { label: "Aadhaar File", url: selected.aadhaarFile, icon: "🆔" },
                            { label: "Employee ID Proof", url: selected.employeeIdProof, icon: "👤" },
                            { label: "Non-Member ID Proof", url: selected.nonMemberEmployeeIdProof, icon: "🆔" },
                            ...(selected.bookingCategory === "Non-Railway Person" ? [{ label: "Guarantor ID Proof", url: selected.guarantorFile, icon: "🤝" }] : []),
                            ...(selected.bookingCategory === "Ex. Member / Retired Person" ? [{ label: "PPO File", url: selected.ppoFile, icon: "📋" }] : []),
                            { label: "Payment Screenshot", url: selected.paymentScreenshot, icon: "💳" },
                          ].map(({ label, url, icon }) => (
                            <div key={label} style={{
                              padding: "1rem",
                              border: "1px solid #e5e7eb",
                              borderRadius: "0.375rem",
                              background: "white",
                              textAlign: "center"
                            }}>
                              <div style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>{icon}</div>
                              <div style={{ fontWeight: "bold", marginBottom: "0.5rem", fontSize: "0.875rem" }}>{label}</div>
                              {url ? (
                                <a
                                  href={url}
                                  target="_blank"
                                  style={{
                                    color: "#2563eb",
                                    textDecoration: "none",
                                    padding: "0.5rem 1rem",
                                    border: "1px solid #2563eb",
                                    borderRadius: "0.25rem",
                                    display: "inline-block",
                                    fontSize: "0.875rem"
                                  }}
                                >
                                  📄 View Document
                                </a>
                              ) : (
                                <span style={{ color: "#6b7280", fontSize: "0.875rem" }}>Not uploaded</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {selected && (
                        <div className="approval-history">
                          <h4>📋 Approval Remarks & Validation Status</h4>
                          <div style={{ overflowX: "auto", marginTop: "1rem" }}>
                            <table style={{
                              width: "100%",
                              borderCollapse: "collapse",
                              background: "white",
                              borderRadius: "0.5rem",
                              overflow: "hidden",
                              boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                            }}>
                              <thead>
                                <tr style={{ background: "#f8fafc" }}>
                                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: "600", color: "#374151", borderBottom: "1px solid #e5e7eb" }}>Level</th>
                                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: "600", color: "#374151", borderBottom: "1px solid #e5e7eb" }}>Action</th>
                                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: "600", color: "#374151", borderBottom: "1px solid #e5e7eb" }}>Validation Status</th>
                                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: "600", color: "#374151", borderBottom: "1px solid #e5e7eb" }}>Remarks</th>
                                  <th style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: "600", color: "#374151", borderBottom: "1px solid #e5e7eb" }}>Date & Time</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(() => {
                                  // Filter approval history based on user role
                                  console.log('Current role:', role);
                                  console.log('Approval history:', selected.approvalHistory);
                                  
                                  const normalizedRole = normalizeApprovalRole(role);
                                  const approvalHistoryEntries = Array.isArray(selected.approvalHistory)
                                    ? selected.approvalHistory
                                    : typeof selected.approvalHistory === 'string'
                                    ? (() => {
                                        try {
                                          return JSON.parse(selected.approvalHistory || '[]');
                                        } catch (parseError) {
                                          console.warn('Failed to parse approvalHistory string:', parseError);
                                          return [];
                                        }
                                      })()
                                    : [];
                                  const allHistory = approvalHistoryEntries.filter((h) => {
                                    const historyRole = normalizeApprovalRole(h.role);
                                    console.log('Approval history item:', h.role, '->', historyRole);

                                    if (normalizedRole === 'sr-dpo' || normalizedRole === 'admin') {
                                      console.log(`${normalizedRole.toUpperCase()}: showing all history`);
                                      return true;
                                    }

                                    if (normalizedRole === 'dpo') {
                                      const result = historyRole === 'os' || historyRole === 'wi' || historyRole === 'dpo';
                                      console.log('DPO: showing OS/WI/DPO, item role:', historyRole, 'include?', result);
                                      return result;
                                    }

                                    if (normalizedRole === 'wi') {
                                      const result = historyRole === 'os' || historyRole === 'wi';
                                      console.log('WI: showing OS/WI, item role:', historyRole, 'include?', result);
                                      return result;
                                    }

                                    if (normalizedRole === 'os') {
                                      const result = historyRole === 'os';
                                      console.log('OS: showing OS only, item role:', historyRole, 'include?', result);
                                      return result;
                                    }

                                    console.log('Unknown role:', normalizedRole, 'defaulting to false');
                                    return false;
                                  });

                                  console.log('Filtered history:', allHistory);
                                  
                                  // If no history items to show, display a message
                                  if (allHistory.length === 0) {
                                    return (
                                      <tr>
                                        <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "#6b7280", fontStyle: "italic" }}>
                                          {role === 'os' ? 'No approval history available yet. You will see approvals after they are processed.' : 'No approval history available for your role level.'}
                                          {/* Debug info */}
                                          <div style={{ marginTop: "1rem", fontSize: "0.75rem", color: "#9ca3af" }}>
                                            <strong>Debug Info:</strong><br/>
                                            Current Role: {role}<br/>
                                            Raw History Count: {(selected.approvalHistory || []).length}<br/>
                                            Raw History: {JSON.stringify(selected.approvalHistory, null, 2)}
                                          </div>
                                        </td>
                                      </tr>
                                    );
                                  }

                                  return allHistory.map((h, i) => {
                                    const getValidationStatusColor = (status?: string) => {
                                      if (!status) return "#f3f4f6";
                                      switch (status) {
                                        case "valid": return "#d1fae5";
                                        case "valid_with_issues": return "#fef3c7";
                                        default: return "#f3f4f6";
                                      }
                                    };

                                    const getValidationTextColor = (status?: string) => {
                                      if (!status) return "#6b7280";
                                      switch (status) {
                                        case "valid": return "#065f46";
                                        case "valid_with_issues": return "#92400e";
                                        default: return "#6b7280";
                                      }
                                    };

                                    return (
                                      <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                                        <td style={{ padding: "0.75rem 1rem", fontWeight: "500", color: "#374151" }}>
                                          {h.role.toUpperCase()}
                                        </td>
                                        <td style={{ padding: "0.75rem 1rem" }}>
                                          <span style={{
                                            padding: "0.25rem 0.5rem",
                                            borderRadius: "0.25rem",
                                            fontSize: "0.75rem",
                                            fontWeight: "bold",
                                            color: h.action === "approved" ? "#065f46" : "#dc2626",
                                            background: h.action === "approved" ? "#dcfce7" : "#fef2f2"
                                          }}>
                                            {h.action === "approved" ? "✓ APPROVED" : "✗ REJECTED"}
                                          </span>
                                        </td>
                                        <td style={{ padding: "0.75rem 1rem" }}>
                                          {h.validationStatus ? (
                                            <span style={{
                                              padding: "0.25rem 0.5rem",
                                              borderRadius: "0.25rem",
                                              fontSize: "0.75rem",
                                              fontWeight: "500",
                                              color: getValidationTextColor(h.validationStatus),
                                              background: getValidationStatusColor(h.validationStatus)
                                            }}>
                                              {h.validationStatus === "valid_with_issues" ? "VALID WITH ISSUES" : h.validationStatus.toUpperCase()}
                                            </span>
                                          ) : (
                                            <span style={{ color: "#9ca3af", fontSize: "0.75rem" }}>—</span>
                                          )}
                                        </td>
                                        <td style={{ padding: "0.75rem 1rem", maxWidth: "300px" }}>
                                          {h.remark ? (
                                            <div style={{
                                              fontSize: "0.875rem",
                                              color: "#4b5563",
                                              fontStyle: "italic",
                                              wordWrap: "break-word"
                                            }}>
                                              "{h.remark}"
                                            </div>
                                          ) : (
                                            <span style={{ color: "#9ca3af", fontSize: "0.75rem" }}>—</span>
                                          )}
                                        </td>
                                        <td style={{ padding: "0.75rem 1rem", fontSize: "0.75rem", color: "#6b7280" }}>
                                          {h.at}
                                        </td>
                                      </tr>
                                    );
                                  });
                                })()}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </>
            )}
          </>
        )}

        {activeTab === "monthly" && canAccessReports && (
          <MonthlyTab monthYear={monthYear} setMonthYear={setMonthYear} calculateBookingAmount={calculateBookingAmount} exportToExcel={exportToExcel} exportToPDF={exportToPDF} />
        )}

        {activeTab === "daterange" && canAccessReports && (
          <DateRangeTab fromDate={fromDate} setFromDate={setFromDate} toDate={toDate} setToDate={setToDate} calculateBookingAmount={calculateBookingAmount} exportToExcel={exportToExcel} exportToPDF={exportToPDF} />
        )}

        {activeTab === "payment" && canAccessReports && (
          <PaymentTab calculateBookingAmount={calculateBookingAmount} exportToExcel={exportToExcel} exportToPDF={exportToPDF} />
        )}

        {activeTab === "dateblocking" && (
          <div style={{ padding: "2rem", background: "#f9fafb", borderRadius: "0.5rem" }}>
            <h3 style={{ marginBottom: "2rem" }}>📅 Block/Unblock Booking Dates</h3>
            
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "1fr 1fr auto", 
              gap: "1rem", 
              marginBottom: "2rem",
              alignItems: "end",
              background: "white",
              padding: "1.5rem",
              borderRadius: "0.5rem",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
            }}>
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Select Institute</label>
                <select 
                  value={selectedInstitute}
                  onChange={(e) => setSelectedInstitute(e.target.value)}
                  style={{ 
                    width: "100%", 
                    padding: "0.5rem", 
                    border: "1px solid #ddd", 
                    borderRadius: "0.375rem"
                  }}
                >
                  <option value="">-- Select Institute --</option>
                  <option value="malda">Malda Institute</option>
                  <option value="sahibganj">Sahibganj Institute</option>
                  <option value="bhagalpur">Bhagalpur Institute</option>
                </select>
              </div>
              
              <div>
                <label style={{ display: "block", marginBottom: "0.5rem", fontWeight: "500" }}>Select Date to Block</label>
                <input 
                  type="date"
                  value={dateToBlock}
                  onChange={(e) => setDateToBlock(e.target.value)}
                  style={{ 
                    width: "100%", 
                    padding: "0.5rem", 
                    border: "1px solid #ddd", 
                    borderRadius: "0.375rem"
                  }}
                />
              </div>

              <button 
                onClick={async () => {
                  if (selectedInstitute && dateToBlock) {
                    try {
                      // Check if date is already blocked
                      const isBlocked = await blockedDatesAPI.isDateBlocked(selectedInstitute, dateToBlock);
                      if (isBlocked) {
                        alert("Date is already blocked for this institute");
                        return;
                      }

                      // Block the date
                      const result = await blockedDatesAPI.blockDate(selectedInstitute, dateToBlock, role || "admin", "");
                      setBlockedDates([...blockedDates, result]);
                      setDateToBlock("");
                      alert("Date blocked successfully!");
                    } catch (err) {
                      console.error("Failed to block date:", err);
                      alert("Failed to block date. Please try again.");
                    }
                  } else {
                    alert("Please select institute and date");
                  }
                }}
                style={{
                  padding: "0.5rem 1.5rem",
                  background: "#dc2626",
                  color: "white",
                  border: "none",
                  borderRadius: "0.375rem",
                  cursor: "pointer",
                  fontWeight: "500",
                  whiteSpace: "nowrap"
                }}
              >
                🚫 Block Date
              </button>
            </div>

            <div style={{ background: "white", borderRadius: "0.5rem", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
              <h4 style={{ padding: "1rem", background: "#f3f4f6", marginBottom: 0, borderBottom: "1px solid #e5e7eb" }}>
                🔒 Blocked Dates ({blockedDates.length})
              </h4>
              
              {blockedDatesLoading ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
                  Loading blocked dates...
                </div>
              ) : blockedDates.length === 0 ? (
                <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>
                  No dates blocked yet
                </div>
              ) : (
                <div style={{ padding: "1rem" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                        <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600" }}>Institute</th>
                        <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600" }}>Blocked Date</th>
                        <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600" }}>Blocked By</th>
                        <th style={{ padding: "1rem", textAlign: "left", fontWeight: "600" }}>Blocked At</th>
                        <th style={{ padding: "1rem", textAlign: "center", fontWeight: "600" }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {blockedDates.map((blockedDate, idx) => (
                        <tr key={blockedDate.id || idx} style={{ borderBottom: "1px solid #e5e7eb" }}>
                          <td style={{ padding: "1rem", textTransform: "capitalize" }}>
                            {blockedDate.institute?.charAt(0).toUpperCase() + blockedDate.institute?.slice(1)} Institute
                          </td>
                          <td style={{ padding: "1rem" }}>
                            {new Date(blockedDate.blockedDate).toLocaleDateString("en-GB", { 
                              weekday: "short", 
                              year: "numeric", 
                              month: "short", 
                              day: "numeric" 
                            })}
                          </td>
                          <td style={{ padding: "1rem" }}>
                            {blockedDate.blockedBy}
                          </td>
                          <td style={{ padding: "1rem" }}>
                            {new Date(blockedDate.blockedAt).toLocaleDateString("en-GB", {
                              year: "numeric",
                              month: "short", 
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit"
                            })}
                          </td>
                          <td style={{ padding: "1rem", textAlign: "center" }}>
                            <button
                              onClick={async () => {
                                if (window.confirm("Are you sure you want to unblock this date?")) {
                                  try {
                                    await blockedDatesAPI.unblockDate(blockedDate.institute, blockedDate.blockedDate);
                                    setBlockedDates(blockedDates.filter((_, i) => i !== idx));
                                    alert("Date unblocked successfully!");
                                  } catch (err) {
                                    console.error("Failed to unblock date:", err);
                                    alert("Failed to unblock date. Please try again.");
                                  }
                                }
                              }}
                              style={{
                                padding: "0.5rem 1rem",
                                background: "#10b981",
                                color: "white",
                                border: "none",
                                borderRadius: "0.375rem",
                                cursor: "pointer",
                                fontSize: "0.875rem"
                              }}
                            >
                              🔓 Unblock
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <p style={{ marginTop: "1rem", padding: "1rem", background: "#fef3c7", borderRadius: "0.375rem", fontSize: "0.875rem" }}>
              ℹ️ Note: Blocked dates will prevent users from booking on these dates.
            </p>
          </div>
        )}
      </div>
    </section>
  );
};

const MonthlyTab: React.FC<any> = ({ monthYear, setMonthYear, exportToExcel, exportToPDF }) => {
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await reportsAPI.getMonthlyReport(monthYear);
        setReportData(normalizeMonthlyReportData(data.reportData || []));
      } catch (err) {
        // Error handled silently
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [monthYear]);

  return (
    <div style={{ padding: "2rem", flex: 1, overflowY: "auto" }}>
      <h3>Institute-wise Monthly Report ({monthYear})</h3>
      <div style={{ marginBottom: "1rem", display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <label>Select Month: <input type="month" value={monthYear} onChange={(e) => setMonthYear(e.target.value)} /></label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="secondary-button" onClick={() => exportToExcel(reportData, `monthly-report-${monthYear}`)}>
            Export Excel
          </button>
          <button className="secondary-button" onClick={() => exportToPDF("monthly-table", `monthly-report-${monthYear}`)}>
            Export PDF
          </button>
        </div>
      </div>
      {loading ? <div>Loading...</div> : reportData.length === 0 ? <div>No monthly report data found for this month.</div> : <table id="monthly-table" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr style={{ background: "#f3f4f6" }}><th style={{ padding: "0.75rem", textAlign: "center" }}>Institute</th><th style={{ padding: "0.75rem", textAlign: "center" }}>Bookings</th><th style={{ padding: "0.75rem", textAlign: "center" }}>Revenue</th><th style={{ padding: "0.75rem", textAlign: "center" }}>Approved</th>
        <th style={{ padding: "0.75rem", textAlign: "center" }}>Rejected</th>
        <th style={{ padding: "0.75rem", textAlign: "center" }}>Pending</th></tr></thead>
        <tbody>{reportData.map((row, i) => {
          const institute = resolveReportValue(row, ["institute", "Institute", "InstituteName"]);
          const bookingsCount = resolveReportValue(row, ["bookings", "Bookings"], 0);
          const revenue = resolveReportValue(row, ["revenue", "Revenue"], 0);
          const approved = resolveReportValue(row, ["approved", "Approved"], 0);
          const rejected = resolveReportValue(row, ["rejected", "Rejected"], 0);
          const pending = resolveReportValue(row, ["pending", "Pending"], 0);
          return (
            <tr key={i}>
              <td style={{ textAlign: "center", padding: "0.5rem" }}>{institute}</td>
              <td style={{ textAlign: "center", padding: "0.5rem" }}>{bookingsCount}</td>
              <td style={{ textAlign: "center", padding: "0.5rem" }}>{revenue}</td>
              <td style={{ textAlign: "center", padding: "0.5rem" }}>{approved}</td>
              <td style={{ textAlign: "center", padding: "0.5rem" }}>{rejected}</td>
              <td style={{ textAlign: "center", padding: "0.5rem" }}>{pending}</td>
            </tr>
          );
        })}</tbody>
      </table>}
    </div>
  );
};

const DateRangeTab: React.FC<any> = ({ fromDate, setFromDate, toDate, setToDate, exportToExcel, exportToPDF }) => {
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fromDate || !toDate) return;
    const load = async () => {
      try {
        setLoading(true);
        const data = await reportsAPI.getDateRangeReport(fromDate, toDate);
        setReportData(normalizeDateRangeReportData(data.reportData || []));
      } catch (err) {
        // Error handled silently
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [fromDate, toDate]);

  return (
    <div style={{ padding: "2rem", flex: 1, overflowY: "auto" }}>
      <div style={{ marginBottom: "1rem", display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ margin: 0 }}>Date-wise Booking Summary</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="secondary-button" onClick={() => exportToExcel(reportData, `date-range-report-${fromDate}-${toDate}`)}>
            Export Excel
          </button>
          <button className="secondary-button" onClick={() => exportToPDF("daterange-table", `date-range-report-${fromDate}-${toDate}`)}>
            Export PDF
          </button>
        </div>
      </div>
      <div style={{ marginBottom: "1rem" }}><input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /> to <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
      {loading ? <div>Loading...</div> : reportData.length===0 ? <div>No reports found for selected range.</div> : <table id="daterange-table" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th style={{ padding: "0.75rem", textAlign: "center" }}>Booking Date</th><th style={{ padding: "0.75rem", textAlign: "center" }}>Name</th><th style={{ padding: "0.75rem", textAlign: "center" }}>Institute</th><th style={{ padding: "0.75rem", textAlign: "center" }}>Category</th><th style={{ padding: "0.75rem", textAlign: "center" }}>Amount</th><th style={{ padding: "0.75rem", textAlign: "center" }}>Status</th></tr></thead>
        <tbody>{reportData.map((b, i) => {
          const bookingDate = resolveReportValue(b, ["bookingDate", "Booking Date", "date"]);
          const name = resolveReportValue(b, ["name", "Name", "applicantName"]);
          const institute = resolveReportValue(b, ["institute", "Institute"]);
          const category = resolveReportValue(b, ["category", "Category"]);
          const amount = resolveReportValue(b, ["amount", "Amount"]);
          const status = resolveReportValue(b, ["status", "Status"]);
          return (<tr key={i}><td style={{ textAlign: "center", padding: "0.5rem" }}>{bookingDate}</td><td style={{ textAlign: "center", padding: "0.5rem" }}>{name}</td><td style={{ textAlign: "center", padding: "0.5rem" }}>{institute}</td><td style={{ textAlign: "center", padding: "0.5rem" }}>{category}</td><td style={{ textAlign: "center", padding: "0.5rem" }}>{amount}</td><td style={{ textAlign: "center", padding: "0.5rem" }}>{status}</td></tr>);
        })}</tbody>
      </table>}
    </div>
  );
};

const PaymentTab: React.FC<any> = ({ exportToExcel, exportToPDF }) => {
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const data = await reportsAPI.getPaymentStatusReport();
        setReportData(normalizePaymentStatusData(data.reportData || []));
      } catch (err) {
        // Error handled silently
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div style={{ padding: "2rem", flex: 1, overflowY: "auto" }}>
      <div style={{ marginBottom: "1rem", display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h3 style={{ margin: 0 }}>Payment Status Report</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="secondary-button" onClick={() => exportToExcel(reportData, `payment-status-report`)}>
            Export Excel
          </button>
          <button className="secondary-button" onClick={() => exportToPDF("payment-table", `payment-status-report`)}>
            Export PDF
          </button>
        </div>
      </div>
      {loading ? <div>Loading...</div> : reportData.length===0 ? <div>No payment status report data found.</div> : <table id="payment-table" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead><tr><th style={{ padding: "0.75rem", textAlign: "center" }}>Booking ID</th><th style={{ padding: "0.75rem", textAlign: "center" }}>Name</th><th style={{ padding: "0.75rem", textAlign: "center" }}>Institute</th><th style={{ padding: "0.75rem", textAlign: "center" }}>Amount</th><th style={{ padding: "0.75rem", textAlign: "center" }}>Status</th></tr></thead>
        <tbody>{reportData.map((b, i) => {
          const id = resolveReportValue(b, ["id", "Booking ID", "bookingId"]);
          const name = resolveReportValue(b, ["name", "firstName", "firstName"]);
          const institute = resolveReportValue(b, ["institute", "Institute"]);
          const bookingCategory = resolveReportValue(b, ["bookingCategory", "category"]);
          
          // Calculate amount based on booking category
          let calculatedAmount: number;
          if (bookingCategory === "Non-Railway Person") {
            calculatedAmount = 42000; // 25000 + 4000 + 3000 + 10000
          } else {
            calculatedAmount = 20000; // 10000 + 4000 + 2000 + 4000
          }
          
          const status = resolveReportValue(b, ["status", "Status"]);
          return (<tr key={i}><td style={{ textAlign: "center", padding: "0.5rem" }}>{id}</td><td style={{ textAlign: "center", padding: "0.5rem" }}>{name}</td><td style={{ textAlign: "center", padding: "0.5rem" }}>{institute}</td><td style={{ textAlign: "center", padding: "0.5rem" }}>{calculatedAmount}</td><td style={{ textAlign: "center", padding: "0.5rem" }}>{status}</td></tr>);
        })}</tbody>
      </table>}
    </div>
  );
};

export default AdminPage;
