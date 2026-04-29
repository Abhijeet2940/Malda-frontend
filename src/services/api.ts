const API_BASE_URL = "http://localhost:8080/api";

// Requests API calls (for booking form submissions)
export const requestsAPI = {
  // Submit new booking request with multipart/form-data
  submitRequest: async (bookingData: any) => {
    try {
      const formData = new FormData();

    // Fields to send to backend (excluding form validation fields and null values)
    const fieldsToSend: { [key: string]: string } = {
      employeeEmail: "employeeEmail",
      firstName: "firstName",
      lastName: "lastName",
      email: "email",
      phone: "phone",
      designation: "designation",
      department: "department",
      organization: "organization",
      streetAddress: "streetAddress",
      addressLine2: "addressLine2",
      city: "city",
      state: "state",
      zip: "zip",
      country: "country",
      panNumber: "panNumber",
      aadhaarNumber: "aadhaarNumber",
      institute: "institute",
      bookingDate: "bookingDate",
      purpose: "purpose",
      bookingCategory: "bookingCategory",
      guests: "guests",
      railwayEmployeeId: "railwayEmployeeId",
      eventType: "eventType",
      eventDuration: "eventDuration",
      facilities: "facilities",
      specialRequirements: "specialRequirements",
      requestDate: "requestDate",
      guarantorName: "guarantorName",
      guarantorEmployeeId: "guarantorEmployeeId",
      guarantorPhone: "guarantorPhone",
      ppoNumber: "ppoNumber",
      refNo: "refNo",
      amountPaid: "amountPaid",
      accountNo: "accountNo",
      ifscCode: "ifscCode",
      bankName: "bankName",
      ppoFile: "ppoFile",
    };

    // File field mappings (frontend field name -> backend parameter name)
    const fileFields: { [key: string]: string } = {
      aadhaarFile: "aadhaarFile",
      employeeIdProof: "employeeIdProof",
      nonMemberEmployeeIdProof: "nonMemberIdProof", // Map to backend field name
      paymentScreenshot: "paymentScreenshot",
      guarantorFile: "guarantorFile",
      ppoFile: "ppoFile",
    };

    // Add text fields to FormData
    Object.keys(fieldsToSend).forEach((key) => {
      const value = bookingData[key];
      // Special handling for PPO number - only send if booking category is retired person
      if (key === 'ppoNumber') {
        if (bookingData.bookingCategory === "Ex. Member / Retired Person") {
          formData.append(fieldsToSend[key], value !== null && value !== undefined ? String(value) : "");
        }
        // Skip PPO number for non-retired persons
        return;
      }
      // Always send the field, even if empty, as backend might require all fields
      formData.append(fieldsToSend[key], value !== null && value !== undefined ? String(value) : "");
    });

    // Add file fields to FormData
    Object.keys(fileFields).forEach((key) => {
      const value = bookingData[key];
      // Special handling for PPO file - only send if booking category is retired person
      if (key === 'ppoFile') {
        if (bookingData.bookingCategory === "Ex. Member / Retired Person" && value) {
          formData.append(fileFields[key], value);
          console.log(`✅ PPO File appended to FormData: ${value.name || 'unknown'}`);
        }
        // Skip PPO file for non-retired persons
        return;
      }
      
      // For other file types, check if they have data
      if (value) {
        formData.append(fileFields[key], value);
      } else if (value != null) {
        // If somehow the file value is a filename string (unlikely), make a log warning
        console.warn(`Skipping non-file value for ${key}:`, value);
      }
    });

    // Debug: confirm formData payload before request
    console.group("📊 requestsAPI.submitRequest -> FormData payload");
    console.log("Total FormData entries:", Array.from(formData.entries()).length);
    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        console.log(`✅ ${key}: [File] ${value.name} (${value.type}, ${value.size} bytes)`);
      } else {
        console.log(`${key}:`, value);
      }
    }
    console.groupEnd();

    // Special validation for payment screenshot
    const paymentScreenshotValue = formData.get("paymentScreenshot");
    console.log("🔍 Payment Screenshot Check:");
    console.log("  - Has key:", formData.has("paymentScreenshot"));
    console.log("  - Value:", paymentScreenshotValue);
    console.log("  - Is File:", paymentScreenshotValue instanceof File);
    if (paymentScreenshotValue instanceof File) {
      console.log(`  - File details: ${paymentScreenshotValue.name} (${paymentScreenshotValue.type}, ${paymentScreenshotValue.size} bytes)`);
    }

    if (!formData.has("paymentScreenshot") || !formData.get("paymentScreenshot")) {
      console.error("❌ paymentScreenshot is missing or empty in FormData (required). Aborting API call.");
      throw new Error("paymentScreenshot is required");
    }
    console.log("✅ Payment screenshot validation passed");

    // Special validation for PPO file when booking category is retired person
    const bookingCategory = formData.get("bookingCategory");
    console.log("🔍 PPO File Check:");
    console.log("  - Booking Category:", bookingCategory);
    if (bookingCategory === "Ex. Member / Retired Person") {
      const ppoNumber = formData.get("ppoNumber");
      const ppoFile = formData.get("ppoFile");
      console.log("  - PPO Number:", ppoNumber);
      console.log("  - PPO File present:", formData.has("ppoFile"));
      console.log("  - PPO File value:", ppoFile);
      console.log("  - PPO File constructor:", ppoFile?.constructor?.name);
      console.log("  - PPO File instanceof File:", ppoFile instanceof File);
      console.log("  - PPO File instanceof Blob:", ppoFile instanceof Blob);
      console.log("  - PPO File.name:", ppoFile?.name);
      console.log("  - PPO File.size:", ppoFile?.size);
      console.log("  - PPO File.type:", ppoFile?.type);
      
      // Simplified check - just verify the file exists and has basic properties
      const isPpoFileValid = !!(ppoFile && ppoFile.name && ppoFile.size !== undefined && ppoFile.type);
      
      console.log("  - PPO File is File:", isPpoFileValid);
      if (isPpoFileValid) {
        console.log(`  - PPO File details: ${ppoFile.name} (${ppoFile.type}, ${ppoFile.size} bytes)`);
      }

      if (!ppoNumber || ppoNumber.trim() === "") {
        console.error("❌ ppoNumber is missing or empty for retired person booking (required). Aborting API call.");
        throw new Error("ppoNumber is required for retired person bookings");
      }
      if (!formData.has("ppoFile") || !ppoFile) {
        console.error("❌ ppoFile is missing for retired person booking (required). Aborting API call.");
        throw new Error("ppoFile is required for retired person bookings");
      }
      console.log("✅ PPO validation passed - PPO file and number are present");
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    const response = await fetch(`${API_BASE_URL}/requests`, {
      method: "POST",
      body: formData,
      signal: controller.signal,
      // Don't set Content-Type header - browser will set it with boundary
    });

    clearTimeout(timeoutId); // Clear timeout if request completes

    console.log("API response status:", response.status);
    console.log("API response ok:", response.ok);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Backend error response:", errorText);
      throw new Error(`Failed to submit booking request: ${response.status} ${errorText}`);
    }

    const responseData = await response.json();
    console.log("API response data:", responseData);
    return responseData;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.error("Request timed out after 30 seconds");
        throw new Error("Request timed out. Please check your backend server.");
      }
      console.error("API request failed:", error);
      throw error;
    }
  },

  // Get all requests
  getRequests: async () => {
    const response = await fetch(`${API_BASE_URL}/requests`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error("Failed to fetch requests");
    return response.json();
  },

  // Get single request by ID
  getRequest: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/requests/${id}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error("Failed to fetch request");
    return response.json();
  },

  // Update booking status
  updateBookingStatus: async (id: string, status: string, approvalEntry: any, role: string) => {
    const response = await fetch(`${API_BASE_URL}/requests/${id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status, approvalEntry, role }),
    });
    if (!response.ok) throw new Error("Failed to update booking status");
    return response.json();
  },

  // Delete booking
  deleteBooking: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/requests/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete booking");
    return response.json();
  },

  // Approve by OS
  approveByOS: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/requests/${id}/approve/os`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error("Failed to approve request by OS");
    return response.json();
  },

  // Reject by OS
  rejectByOS: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/requests/${id}/reject/os`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error("Failed to reject request by OS");
    return response.json();
  },

  // Approve by WI
  approveByWI: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/requests/${id}/approve/wi`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error("Failed to approve request by WI");
    return response.json();
  },

  // Reject by WI
  rejectByWI: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/requests/${id}/reject/wi`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error("Failed to reject request by WI");
    return response.json();
  },

  // Approve by DPO
  approveByDPO: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/requests/${id}/approve/dpo`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error("Failed to approve request by DPO");
    return response.json();
  },

  // Reject by DPO
  rejectByDPO: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/requests/${id}/reject/dpo`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error("Failed to reject request by DPO");
    return response.json();
  },

  // Approve by SR-DPO
  approveBySRDPO: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/requests/${id}/approve/sr-dpo`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error("Failed to approve request by SR-DPO");
    return response.json();
  },

  // Reject by SR-DPO
  rejectBySRDPO: async (id: string) => {
    const response = await fetch(`${API_BASE_URL}/requests/${id}/reject/sr-dpo`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error("Failed to reject request by SR-DPO");
    return response.json();
  },
};

// Blocked Dates API calls
export const blockedDatesAPI = {
  // Get all blocked dates
  getAllBlockedDates: async () => {
    const response = await fetch(`${API_BASE_URL}/blocked-dates`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error("Failed to fetch blocked dates");
    return response.json();
  },

  // Get blocked dates by institute
  getBlockedDatesByInstitute: async (institute: string) => {
    const response = await fetch(`${API_BASE_URL}/blocked-dates/institute/${institute}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error("Failed to fetch blocked dates for institute");
    return response.json();
  },

  // Check if a date is blocked
  isDateBlocked: async (institute: string, date: string) => {
    const response = await fetch(`${API_BASE_URL}/blocked-dates/check?institute=${encodeURIComponent(institute)}&date=${encodeURIComponent(date)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) throw new Error("Failed to check if date is blocked");
    return response.json();
  },

  // Block a date
  blockDate: async (institute: string, blockedDate: string, blockedBy: string, reason?: string) => {
    const response = await fetch(`${API_BASE_URL}/blocked-dates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute,
        blockedDate,
        blockedBy,
        reason: reason || ""
      }),
    });
    if (!response.ok) throw new Error("Failed to block date");
    return response.json();
  },

  // Unblock a date
  unblockDate: async (institute: string, date: string) => {
    const response = await fetch(`${API_BASE_URL}/blocked-dates/unblock?institute=${encodeURIComponent(institute)}&date=${encodeURIComponent(date)}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to unblock date");
    return response.ok;
  },

  // Delete blocked date by ID
  deleteBlockedDate: async (id: number) => {
    const response = await fetch(`${API_BASE_URL}/blocked-dates/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete blocked date");
    return response.ok;
  },
};

// Booking API calls (maps to requests API)
export const bookingAPI = {
  // Create new booking (uses requests endpoint)
  createBooking: async (bookingData: any) => {
    return requestsAPI.submitRequest(bookingData);
  },

  // Get all bookings (uses requests endpoint)
  getBookings: async () => {
    return requestsAPI.getRequests();
  },

  // Get single booking
  getBooking: async (id: string) => {
    return requestsAPI.getRequest(id);
  },

  // Update booking status by role, including approval entry and remarks
  updateBookingStatus: async (
    id: string,
    approvalStatus: string,
    approvalEntry: any,
    role?: string
  ) => {
    const response = await fetch(`${API_BASE_URL}/requests/${id}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: approvalStatus, approvalEntry, role }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update booking status: ${errorText}`);
    }
    return response.json();
  },

  // Delete booking
  deleteBooking: async (id: string) => {
    return requestsAPI.deleteRequest(id);
  },
};

// Reports API calls
export const reportsAPI = {
  // Get monthly report
  getMonthlyReport: async (monthYear: string) => {
    const response = await fetch(
      `${API_BASE_URL}/reports/monthly?month=${monthYear}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (response.status === 404) {
      return { reportData: [] };
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to fetch monthly report: ${response.status} ${text}`);
    }
    return response.json();
  },

  // Get date range report
  getDateRangeReport: async (fromDate: string, toDate: string) => {
    const response = await fetch(
      `${API_BASE_URL}/reports/date-range?from=${fromDate}&to=${toDate}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (response.status === 404) {
      return { reportData: [] };
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to fetch date range report: ${response.status} ${text}`);
    }
    return response.json();
  },

  // Get payment status report
  getPaymentStatusReport: async () => {
    const response = await fetch(`${API_BASE_URL}/reports/payment-status`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (response.status === 404) {
      return { reportData: [] };
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to fetch payment status report: ${response.status} ${text}`);
    }
    return response.json();
  },
};
