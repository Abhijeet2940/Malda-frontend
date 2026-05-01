import React, { useState } from "react";
import ReCAPTCHA from "react-google-recaptcha";
import { institutes } from "../data/institutes";
import { bookingAPI, requestsAPI, blockedDatesAPI } from "../services/api";
import "../styles.css";
import maldaQR from "../Assets/MaldaQR.jpeg";

export const BookingFormPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [selectedDateBlocked, setSelectedDateBlocked] = useState(false);
  const [blockedDateCheckLoading, setBlockedDateCheckLoading] = useState(false);
  const [dateAvailabilityMessage, setDateAvailabilityMessage] = useState<string>("");
  const [selectedInstituteBlocked, setSelectedInstituteBlocked] = useState(false);
  const [formData, setFormData] = useState({
    // Personal Information
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    designation: "",
    department: "",
    // Address Information
    organization: "railway", // Default to railway
    streetAddress: "",
    addressLine2: "",
    city: "",
    state: "",
    zip: "",
    country: "",
    // Identity Information
    panNumber: "",
    aadhaarNumber: "",
    aadhaarFile: null as File | null,
    // Booking Information
    institute: "",
    bookingDate: "",
    purpose: "", // Combined field for both purpose and event type
    bookingCategory: "",
    guests: "1",
    // Event Booking Details (required by backend)
    eventDuration: "",
    facility: "AC", // Default to AC (removed from form)
    specialRequirements: "",
    // Railway/Employee IDs
    railwayEmployeeId: "",
    employeeIdProof: null as File | null,
    nonMemberEmployeeId: "",
    nonMemberEmployeeIdProof: null as File | null,
    // Guarantor Information
    guarantorName: "",
    guarantorEmployeeId: "",
    guarantorPhone: "",
    guarantorFile: null as File | null,
    // PPO Information
    ppoNumber: "",
    ppoFile: null as File | null,
    // Payment
    paymentScreenshot: null as File | null,
    // New fields after QR
    refNo: "",
    amountPaid: "",
    // Bank Account Details
    accountNo: "",
    ifscCode: "",
    bankName: "",
    // Request Date (auto-set to today)
    requestDate: new Date().toLocaleDateString('en-CA'),
    // Form validation fields (not sent to backend)
    termsAccepted: false,
    captcha: "",
  });

  React.useEffect(() => {
    const loadUnavailableDates = async () => {
      try {
        const data = await bookingAPI.getBookings();
        const bookings = Array.isArray(data) ? data : data.bookings || [];
        const dates = bookings
          .filter((booking: any) => booking.bookingDate && booking.institute)
          .map((booking: any) => `${booking.institute.toString().toLowerCase()}|${booking.bookingDate}`);
        setUnavailableDates(dates);
      } catch (err) {
        // Error handled silently
      }
    };

    loadUnavailableDates();
  }, []);

  React.useEffect(() => {
    const checkBlockedDate = async () => {
      if (formData.institute && formData.bookingDate) {
        setBlockedDateCheckLoading(true);
        try {
          const blocked = await blockedDatesAPI.isDateBlocked(formData.institute, formData.bookingDate);
          setSelectedDateBlocked(blocked);
        } catch (err) {
          setSelectedDateBlocked(false);
        } finally {
          setBlockedDateCheckLoading(false);
        }
      } else {
        setSelectedDateBlocked(false);
      }
    };

    checkBlockedDate();
  }, [formData.institute, formData.bookingDate]);

  React.useEffect(() => {
    const checkInstituteBlocked = () => {
      if (formData.institute) {
        const institute = institutes.find(inst => inst.id === formData.institute);
        setSelectedInstituteBlocked(institute?.blocked || false);
      } else {
        setSelectedInstituteBlocked(false);
      }
    };

    checkInstituteBlocked();
  }, [formData.institute]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value, type } = e.target;
    if (type === "file") {
      const input = e.target as HTMLInputElement;
      const file = input.files?.[0] || null;
      setFormData({
        ...formData,
        [name]: file,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleNext = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (step === 1) {
      if (selectedInstituteBlocked) {
        alert("Booking is currently not available for the selected institute. Please choose another institute.");
        return;
      }
      
      const isRailwayEmployee = formData.bookingCategory === "Railway Employee / Institute Member";
      const isNonMemberEmployee = formData.bookingCategory === "Non-Member E. Rly. Employee";
      const isContractEmployee = formData.bookingCategory === "Contract Employee";
      const isNonRailwayPerson = formData.bookingCategory === "Non-Railway Person";
      const isExMember = formData.bookingCategory === "Ex. Member / Retired Person";
      
      const baseValidation =
        formData.institute &&
        formData.bookingDate &&
        formData.purpose &&
        formData.bookingCategory &&
        formData.guests &&
        formData.firstName &&
        formData.lastName &&
        formData.email &&
        formData.phone &&
        formData.streetAddress &&
        formData.city &&
        formData.state &&
        formData.zip &&
        formData.country;
      
      const railwayValidation = (isRailwayEmployee || isContractEmployee) && (formData.railwayEmployeeId && formData.employeeIdProof);
      const nonMemberValidation = isNonMemberEmployee && (formData.nonMemberEmployeeId && formData.nonMemberEmployeeIdProof);
      const nonRailwayValidation = isNonRailwayPerson && (formData.guarantorName && formData.guarantorEmployeeId && formData.guarantorPhone && formData.guarantorFile);
      const exMemberValidation = isExMember && formData.ppoNumber && formData.ppoFile;
      
      if (dateUnavailable) {
        alert("This date is already booked for the selected institute. Please choose another date.");
        return;
      }
      if (baseValidation && (!isRailwayEmployee || railwayValidation) && (!isNonMemberEmployee || nonMemberValidation) && (!isNonRailwayPerson || nonRailwayValidation) && (!isExMember || exMemberValidation)) {
        setStep(2);
      } else {
        alert("Please fill all required fields");
      }
    }
  };

  const handlePrevious = () => {
    setStep(step - 1);
  };

  const selectedInstitute = formData.institute;
  const selectedDateKey = selectedInstitute && formData.bookingDate ? `${selectedInstitute.toLowerCase()}|${formData.bookingDate}` : null;
  const dateUnavailable = selectedDateKey ? unavailableDates.includes(selectedDateKey) : false;
  const bookingAvailabilityText = selectedInstitute
    ? formData.bookingDate
      ? dateUnavailable
        ? "Selected date is already booked for this institute. Please choose another date."
        : selectedDateBlocked
          ? "Selected date is blocked by the administration. Please choose another date."
          : "Selected date is available for booking."
      : "Select a date to check availability."
    : "Select institute first to check availability.";

  const qrCodeMap: Record<string, { src: string; label: string }> = {
    malda: { src: maldaQR, label: "Malda Institute QR Code" },
    sahibganj: { src: "/src/Assests/sahibganj-qr.png", label: "Sahibganj Institute QR Code" },
    bhagalpur: { src: "/src/Assests/bhagalpur-qr.png", label: "Bhagalpur Institute QR Code" },
  };
  const selectedQr = qrCodeMap[formData.institute] || { src: "/src/Assests/Indian Railways.png", label: "Institute QR" };

  // Calculate total payment amount based on booking category
  const calculatePaymentAmount = (): number => {
    const isNonRailway = formData.bookingCategory === "Non-Railway Person";
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
    
    return rateOfHiring + electricCharge + cleaningCharge + depositAmount;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Payment screenshot check
    if (!formData.paymentScreenshot) {
      alert("Payment screenshot is required. Please upload before submitting.");
      return;
    }

    if (formData.purpose && formData.eventDuration && formData.termsAccepted && formData.captcha && formData.refNo && formData.amountPaid && formData.accountNo && formData.ifscCode && formData.bankName) {
      try {
        // Check if the selected date is blocked
        const isDateBlocked = await blockedDatesAPI.isDateBlocked(formData.institute, formData.bookingDate);
        if (isDateBlocked) {
          alert("The selected booking date is blocked by the administration. Please choose a different date.");
          return;
        }

        // Map form data to backend expected format
        const submitData = {
          ...formData,
          // Backend expects employeeEmail, set it to empty string since we removed the field
          employeeEmail: "",
          // Backend expects eventType, map from purpose
          eventType: formData.purpose,
          // Backend expects facilities, map from facility (AC preference)
          facilities: formData.facility,
          // Calculate and send total amount based on booking category
          amount: calculatePaymentAmount(),
          // Backend expects requestDate, ensure it's set to today (local date)
          requestDate: new Date().toLocaleDateString('en-CA'),
          // For Non-Member E. Rly. Employee, map nonMemberEmployeeId to railwayEmployeeId
          ...(formData.bookingCategory === "Non-Member E. Rly. Employee" && {
            railwayEmployeeId: formData.nonMemberEmployeeId,
            nonMemberEmployeeId: "",
          }),
          // Explicitly ensure paymentScreenshot is included
          paymentScreenshot: formData.paymentScreenshot,
          // Include new fields
          refNo: formData.refNo,
          amountPaid: formData.amountPaid,
          accountNo: formData.accountNo,
          ifscCode: formData.ifscCode,
          bankName: formData.bankName,
        };


        // Submit booking to API with actual file objects
        const response = await requestsAPI.submitRequest(submitData);
        alert("Booking request submitted successfully! Your request ID is: " + (response.requestId || response.id));

        // Notify admin panel to refresh bookings if open
        window.dispatchEvent(new Event("bookingSubmitted"));

        // Reset form
        setFormData({
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          designation: "",
          department: "",
          organization: "railway",
          streetAddress: "",
          addressLine2: "",
          city: "",
          state: "",
          zip: "",
          country: "",
          panNumber: "",
          aadhaarNumber: "",
          aadhaarFile: null,
          institute: "",
          bookingDate: "",
          purpose: "",
          bookingCategory: "",
          guests: "1",
          railwayEmployeeId: "",
          employeeIdProof: null,
          nonMemberEmployeeId: "",
          nonMemberEmployeeIdProof: null,
          guarantorName: "",
          guarantorEmployeeId: "",
          guarantorPhone: "",
          guarantorFile: null,
          ppoNumber: "",
          ppoFile: null,
          paymentScreenshot: null,
          eventDuration: "",
          facility: "AC",
          specialRequirements: "",
          refNo: "",
          amountPaid: "",
          requestDate: new Date().toLocaleDateString('en-CA'),
          termsAccepted: false,
          captcha: "",
        });
        setStep(1);
      } catch (error) {
        alert("Error submitting booking: " + (error instanceof Error ? error.message : "Unknown error"));
      }
    } else {
      alert("Please fill all required fields");
    }
  };

  return (
    <section className="page-section booking-form-page">
      <div className="container">
      <h2 className="booking-form-title">Malda Institute Booking Form</h2>
        <div className="booking-form-wrapper">
          <form onSubmit={step === 1 ? handleNext : handleSubmit} className="booking-form-main">
            <div className="form-step-indicator">
              <span className="step-text">Step {step} of 2</span>
              <div className="progress-bar-container">
                <div className="progress-bar-fill" style={{ width: `${(step / 2) * 100}%` }}></div>
              </div>
            </div>

            {step === 1 ? (
              <div className="form-step">
                <h2>Booking & Contact Details</h2>

                <div className="form-section-title">Booking Information</div>

                <div className="form-group">
                  <label htmlFor="institute">
                    Select Institute <span className="required">*</span>
                  </label>
                  <select
                    id="institute"
                    name="institute"
                    value={formData.institute}
                    onChange={handleChange}
                    required
                  >
                    <option value="">Choose an institute</option>
                    {institutes.map((inst) => (
                      <option 
                        key={inst.id} 
                        value={inst.id}
                        disabled={inst.blocked}
                        style={{ 
                          color: inst.blocked ? '#999' : 'inherit',
                          fontStyle: inst.blocked ? 'italic' : 'normal'
                        }}
                      >
                        {inst.name} {inst.blocked ? '(Currently Unavailable)' : ''}
                      </option>
                    ))}
                  </select>
                  {selectedInstituteBlocked && (
                    <small style={{ color: '#dc2626', display: 'block', marginTop: '0.5rem' }}>
                      This institute is currently not available for booking. Please select another institute.
                    </small>
                  )}
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="bookingDate">
                      Booking Date <span className="required">*</span>
                    </label>
                    <input
                      type="date"
                      id="bookingDate"
                      name="bookingDate"
                      value={formData.bookingDate}
                      onChange={handleChange}
                      min={new Date().toISOString().split('T')[0]}
                      max={(() => {
                        const today = new Date();
                        const maxDate = new Date(today);
                        maxDate.setMonth(today.getMonth() + 12);
                        return maxDate.toISOString().split('T')[0];
                      })()}
                      required
                    />
                    <small style={{ display: 'block', marginTop: '0.5rem', color: dateUnavailable || selectedDateBlocked ? '#dc2626' : '#16a34a' }}>
                      {blockedDateCheckLoading ? "Checking booking availability..." : bookingAvailabilityText}
                    </small>
                  </div>

                  <div className="form-group">
                    <label htmlFor="purpose">
                      Purpose of Booking <span className="required">*</span>
                    </label>
                    <select
                      id="purpose"
                      name="purpose"
                      value={formData.purpose}
                      onChange={handleChange}
                      required
                    >
                      <option value="">Select purpose</option>
                      <option value="Seminar">Seminar/Workshop</option>
                      <option value="Workshop">Wedding/Reception</option>
                      <option value="Workshop">Cultural program</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>
                    Employee Type <span className="required">*</span>
                  </label>
                  <div className="radio-group">
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="bookingCategory"
                        value="Railway Employee"
                        checked={
                          formData.bookingCategory === "Railway Employee / Institute Member" ||
                          formData.bookingCategory === "Non-Member E. Rly. Employee" ||
                          formData.bookingCategory === "Ex. Member / Retired Person"
                        }
                        onChange={() => {
                          setFormData(prev => ({ ...prev, bookingCategory: "Railway Employee / Institute Member" }));
                        }}
                        required
                      />
                      Railway Employee
                    </label>
                    <label className="radio-label">
                      <input
                        type="radio"
                        name="bookingCategory"
                        value="Non-Railway Person"
                        checked={formData.bookingCategory === "Non-Railway Person"}
                        onChange={() => {
                          setFormData(prev => ({ ...prev, bookingCategory: "Non-Railway Person" }));
                        }}
                        required
                      />
                      Non-Railway Person
                    </label>
                  </div>
                </div>

                {[
                  "Railway Employee / Institute Member",
                  "Non-Member E. Rly. Employee",
                  "Ex. Member / Retired Person"
                ].includes(formData.bookingCategory) && (
                  <div className="form-group">
                    <label>
                      Railway Employee Category <span className="required">*</span>
                    </label>
                    <div className="radio-group">
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="railwayEmployeeCategory"
                          value="Railway Employee / Institute Member"
                          checked={formData.bookingCategory === "Railway Employee / Institute Member"}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, bookingCategory: "Railway Employee / Institute Member" }));
                          }}
                          required
                        />
                        Current Serving member of ER/NER
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="railwayEmployeeCategory"
                          value="Non-Member E. Rly. Employee"
                          checked={formData.bookingCategory === "Non-Member E. Rly. Employee"}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, bookingCategory: "Non-Member E. Rly. Employee" }));
                          }}
                          required
                        />
                        Non Member E. Rly. Employee
                      </label>
                      <label className="radio-label">
                        <input
                          type="radio"
                          name="railwayEmployeeCategory"
                          value="Ex. Member / Retired Person"
                          checked={formData.bookingCategory === "Ex. Member / Retired Person"}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, bookingCategory: "Ex. Member / Retired Person" }));
                          }}
                          required
                        />
                        Ex. Member / Retired Person
                      </label>
                    </div>
                  </div>
                )}

                {formData.bookingCategory === "Railway Employee / Institute Member" && (
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="railwayEmployeeId">
                        Railway Employee ID <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="railwayEmployeeId"
                        name="railwayEmployeeId"
                        value={formData.railwayEmployeeId}
                        onChange={handleChange}
                        placeholder="Enter your Railway Employee ID"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="employeeIdProof">
                        Upload Employee ID Proof <span className="required">*</span>
                      </label>
                      <input
                        type="file"
                        id="employeeIdProof"
                        name="employeeIdProof"
                        onChange={handleChange}
                        accept=".jpg,.jpeg,.png,.pdf"
                        required
                      />
                  <small>Accepted: jpg, jpeg, png (Max 2 MB)</small>
                    </div>

                  </div>
                )}

                {formData.bookingCategory === "Non-Member E. Rly. Employee" && (
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="nonMemberEmployeeId">
                        Railway Employee ID <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="nonMemberEmployeeId"
                        name="nonMemberEmployeeId"
                        value={formData.nonMemberEmployeeId}
                        onChange={handleChange}
                        placeholder="Enter your Railway Employee ID"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="nonMemberEmployeeIdProof">
                        Upload Employee ID Proof <span className="required">*</span>
                      </label>
                      <input
                        type="file"
                        id="nonMemberEmployeeIdProof"
                        name="nonMemberEmployeeIdProof"
                        onChange={handleChange}
                        accept=".jpg,.jpeg,.png,.pdf"
                        required
                      />
                  <small>Accepted: jpg, jpeg, png (Max 2 MB)</small>
                    </div>
                  </div>
                )}

                {formData.bookingCategory === "Ex. Member / Retired Person" && (
                  <div className="guarantor-section">
                    <div className="form-section-title">PPO  Details</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label htmlFor="ppoNumber">
                          PPO /Account Number <span className="required">*</span>
                        </label>
                        <input
                          type="text"
                          id="ppoNumber"
                          name="ppoNumber"
                          value={formData.ppoNumber}
                          onChange={handleChange}
                          placeholder="Enter your PPO account number"
                          required
                        />
                      </div>
                      <div className="form-group">
                        <label htmlFor="ppoFile">
                          Upload PPO ID File <span className="required">*</span>
                        </label>
                        <input
                          type="file"
                          id="ppoFile"
                          name="ppoFile"
                          onChange={handleChange}
                          accept=".jpg,.jpeg,.png,.pdf"
                          required
                        />
                  <small>Accepted: jpg, jpeg, png (Max 2 MB)</small>
                      </div>

                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label htmlFor="guests">
                    Estimate Number of Guests <span className="required">*</span>
                  </label>
                  <input
                    type="number"
                    id="guests"
                    name="guests"
                    value={formData.guests}
                    onChange={handleChange}
                    min="1"
                    required
                  />
                </div>

                <div className="form-section-title">Contact Information</div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="firstName">
                      First Name <span className="required">*</span>
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="lastName">
                      Last Name 
                    </label>
                    <input
                      type="text"
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleChange}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="email">
                    Email <span className="required">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="phone">
                      Phone <span className="required">*</span>
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>
                <input
                  type="hidden"
                  name="organization"
                  value={formData.organization}
                />

                <div className="form-group">
                  <label htmlFor="streetAddress">Street Address</label>
                  <input
                    type="text"
                    id="streetAddress"
                    name="streetAddress"
                    value={formData.streetAddress}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="addressLine2">Address Line 2</label>
                  <input
                    type="text"
                    id="addressLine2"
                    name="addressLine2"
                    value={formData.addressLine2}
                    onChange={handleChange}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="city">City <span className="required">*</span></label>
                    <input
                      type="text"
                      id="city"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="state" >State / Province<span className="required">*</span></label>
                    <input
                      type="text"
                      id="state"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="zip">ZIP / Postal Code<span className="required">*</span></label>
                    <input
                      type="text"
                      id="zip"
                      name="zip"
                      value={formData.zip}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="country">Country <span className="required">*</span></label>
                    <input
                      type="text"
                      id="country"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="panNumber">
                    PAN Number <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="panNumber"
                    name="panNumber"
                    value={formData.panNumber}
                    onChange={handleChange}
                    maxLength={10}
                    placeholder="Enter 10 character PAN number"
                    required
                  />
                  <small>{formData.panNumber.length} of 10 max characters</small>
                </div>

                <div className="form-group">
                  <label htmlFor="aadhaarNumber">
                    AADHAAR Number <span className="required">*</span>
                  </label>
                  <input
                    type="text"
                    id="aadhaarNumber"
                    name="aadhaarNumber"
                    value={formData.aadhaarNumber}
                    onChange={handleChange}
                    maxLength={12}
                    placeholder="Enter 12 character AADHAAR number"
                    required
                  />
                  <small>{formData.aadhaarNumber.length} of 12 max characters</small>
                </div>

                <div className="form-group">
                  <label htmlFor="aadhaarFile">
                    Upload AADHAAR Card <span className="required">*</span>
                  </label>
                  <input
                    type="file"
                    id="aadhaarFile"
                    name="aadhaarFile"
                    onChange={handleChange}
                    accept=".jpg,.jpeg,.png,.pdf"
                    required
                  />
                  <small>Accepted only jpg and jpeg (Max 2 MB)</small>
                </div>

                <button type="submit" className="primary-button" disabled={dateUnavailable}>
                  Next
                </button>
                {dateUnavailable && (
                  <p style={{ color: '#dc2626', marginTop: '0.75rem' }}>
                    This date is already booked. Please choose another date or institute.
                  </p>
                )}
              </div>
            ) : (
              <div className="form-step">
                <h2>Payment Details</h2>

                <div className="form-section-title">Event Booking Details</div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="eventDuration">
                      Event Duration in  (Days) <span className="required">*</span>
                    </label>
                    <input
                      type="number"
                      id="eventDuration"
                      name="eventDuration"
                      value={formData.eventDuration}
                      onChange={handleChange}
                      min="0"
                      max="3"
                      placeholder="1-3 days"
                      required
                    />
                  </div>
                </div>

                {/* Payment Summary */}
                {(() => {
                  const isNonRailway = formData.bookingCategory === "Non-Railway Person";
                  
                  let rateOfHiring, electricCharge, cleaningCharge, depositName, depositAmount;
                  
                  if (isNonRailway) {
                    rateOfHiring = 25000;
                    electricCharge = 4000;
                    cleaningCharge = 3000;
                    depositName = "Caution Money";
                    depositAmount = 10000;
                  } else {
                    rateOfHiring = 10000;
                    electricCharge = 4000;
                    cleaningCharge = 2000;
                    depositName = "Security Deposit";
                    depositAmount = 4000;
                  }
                  
                  const total = rateOfHiring + electricCharge + cleaningCharge + depositAmount;
                  
                  return (
                    <div className="payment-summary">
                      <div className="payment-row">
                        <span>Rate of Hiring</span>
                        <span>₹{rateOfHiring.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="payment-row">
                        <span>Electric Charge</span>
                        <span>₹{electricCharge.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="payment-row">
                        <span>Cleaning Charge</span>
                        <span>₹{cleaningCharge.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="payment-row">
                        <span>{depositName}</span>
                        <span>₹{depositAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                      <div className="payment-row payment-total">
                        <span>Total</span>
                        <span>₹{total.toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* QR Code Payment Section */}
                <div className="qr-payment-section">
                  <p>Scan the QR to Pay for <strong>{selectedInstitute ? selectedInstitute.toUpperCase() : "selected institute"}</strong>:</p>
                  <div className="qr-code-box">
                    <img src={selectedQr.src} alt={selectedQr.label} className="qr-image" />
                    <span>{selectedQr.label}</span>
                  </div>
                  <p>Please follow these steps:</p>
                  <ol className="qr-steps">
                    <li>Scan the QR code using any UPI payment app</li>
                    <li>Make payment</li>
                    <li>Take a screenshot of the successful payment</li>
                    <li>Upload the screenshot below</li>
                    <li>Upload the reference number</li>
                    <li>Upload the  payement amount</li>
                  </ol>
                  <div className="form-group">
                    <label htmlFor="paymentScreenshot">Upload Payment Screenshot <span className="required">*</span></label>
                    <input
                      type="file"
                      id="paymentScreenshot"
                      name="paymentScreenshot"
                      onChange={handleChange}
                      accept=".jpg,.jpeg,.png"
                      required
                    />
                  <small>Accepted: jpg, jpeg, png (Max 2 MB)</small>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="refNo">
                        Ref. NO <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="refNo"
                        name="refNo"
                        value={formData.refNo}
                        onChange={handleChange}
                        placeholder="Enter reference number"
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="amountPaid">
                        Amount Paid <span className="required">*</span>
                      </label>
                      <input
                        type="number"
                        id="amountPaid"
                        name="amountPaid"
                        value={formData.amountPaid}
                        onChange={handleChange}
                        placeholder="Enter amount paid"
                        min="0"
                        step="0.01"
                        required
                      />
                    </div>
                  </div>

                      <h3>Bank Details for Security Money refund<span className="required">*</span></h3>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="accountNo">
                        Account No. <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="accountNo"
                        name="accountNo"
                        value={formData.accountNo}
                        onChange={handleChange}
                        placeholder="Enter account number"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="ifscCode">
                        IFSC Code <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="ifscCode"
                        name="ifscCode"
                        value={formData.ifscCode}
                        onChange={handleChange}
                        placeholder="Enter IFSC code"
                        required
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="bankName">
                        Bank Name <span className="required">*</span>
                      </label>
                      <input
                        type="text"
                        id="bankName"
                        name="bankName"
                        value={formData.bankName}
                        onChange={handleChange}
                        placeholder="Enter bank name"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="termsConditions">
                    Terms & Conditions <span className="required">*</span>
                  </label>
                  <div id="termsConditions" className="terms-display">
                    <ol>
                      <li>Booking is valid only in the name of the person/institution mentioned; review begins after full payment via QR code in the form.</li>
                      <li>Auditorium timing: Ceremonial events – 10 AM to 10 PM  . Any change requires prior approval.</li>
                      <li>In case of false information provided, the booking may be cancelled without any refund.</li>
                      <li>Caution deposit is refundable within 14 days after adjustments. Cancellations: 75% refund if 30+ days prior; 50% if less than 30 days.</li>
                      <li>Booking will be provided according to priority rule book.</li>
                      <li>Institute is not responsible for AC/power issues (no emergency backup). Bookings may be rescheduled/cancelled by the administration due to natural or extraordinary circumstances.</li>
                    </ol>
                  </div>
                </div>

                <div className="form-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="termsAccepted"
                      checked={formData.termsAccepted}
                      onChange={(e) => setFormData({ ...formData, termsAccepted: e.target.checked })}
                      required
                    />
                    I accept the Terms & Conditions <span className="required">*</span>
                  </label>
                </div>

                <div className="form-group">
                  <label>
                    Verification <span className="required">*</span>
                  </label>
                  <ReCAPTCHA
                    sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
                    onChange={(value: string | null) => setFormData({ ...formData, captcha: value ?? "" })}
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="secondary-button"
                  >
                    Previous
                  </button>
                  <button type="submit" className="primary-button">
                    Submit Booking
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  );
};
