/* =====================================================
   MediCare — Patient Dashboard Logic (FIXED VERSION)
   Fixes: Navigation + Admin Doctor Sync
   ===================================================== */

console.log("✅ patient.js loaded");

// ---------- Auth Guard ----------
let currentUser = null;
try {
  currentUser = JSON.parse(localStorage.getItem("medicare_user") || "null");
} catch (e) {
  console.error("Auth parse error:", e);
}

if (!currentUser || currentUser.role !== "patient") {
  alert("Please login as Patient first.");
  window.location.href = "index.html";
}

const patientEmail = (currentUser?.email || "").toLowerCase();
const patientKey = `medicare_patient_${patientEmail}`;
const apptKey    = `medicare_appts_${patientEmail}`;
const payKey     = `medicare_pays_${patientEmail}`;

console.log("👤 Logged in as:", patientEmail);

// ---------- Safe Storage Helpers ----------
const DB = {
  get(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      console.error("DB.get error:", key, e);
      return fallback;
    }
  },
  set(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.error("DB.set error:", key, e);
    }
  },
};

// ---------- Load Patient Profile ----------
let patient = DB.get(patientKey, {
  name: patientEmail.split("@")[0] || "Patient",
  email: patientEmail,
  phone: "",
  age: "",
  gender: "",
  blood: "",
  address: "",
  isOld: false,
});

if (patientEmail === "patient@medicare.com" && !localStorage.getItem(patientKey)) {
  patient = {
    name: "Rahul Sharma",
    email: "patient@medicare.com",
    phone: "+91 98765 43210",
    age: 32,
    gender: "Male",
    blood: "O+",
    address: "Mumbai, Maharashtra",
    isOld: true,
  };
  DB.set(patientKey, patient);
}

let appointments = DB.get(apptKey, []);
let payments     = DB.get(payKey, []);

// Seed demo history for old patient
if (patient.isOld && appointments.length === 0 && patientEmail === "patient@medicare.com") {
  appointments = [
    {
      id: "APT-DEMO-1",
      doctorName: "Dr. Aarav Mehta",
      doctorSpec: "Cardiology",
      date: "2025-08-15",
      time: "10:30 AM",
      reason: "Chest pain checkup",
      status: "completed",
      disease: "Mild hypertension",
      paid: 800,
    },
    {
      id: "APT-DEMO-2",
      doctorName: "Dr. Sneha Kapoor",
      doctorSpec: "Dermatology",
      date: "2025-10-02",
      time: "04:00 PM",
      reason: "Skin rash",
      status: "completed",
      disease: "Allergic dermatitis",
      paid: 500,
    },
  ];
  payments = [
    { id: "PAY-DEMO-1", date: "2025-08-15", doctorName: "Dr. Aarav Mehta", amount: 800, method: "UPI", status: "success", txnId: "TXN8A9C2F1K" },
    { id: "PAY-DEMO-2", date: "2025-10-02", doctorName: "Dr. Sneha Kapoor", amount: 500, method: "UPI", status: "success", txnId: "TXN4B7D9E3M" },
  ];
  DB.set(apptKey, appointments);
  DB.set(payKey, payments);
}

// ---------- Utils ----------
function formatDate(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function safeBind(id, event, handler) {
  const el = document.getElementById(id);
  if (el) el.addEventListener(event, handler);
  else console.warn(`⚠️ Element not found: #${id}`);
}

/* =====================================================
   ✅ FIX #1: DOCTOR SYNC WITH ADMIN
   Admin may store doctors under any of these keys.
   We merge all sources + normalize field names.
   ===================================================== */
function getAllDoctors() {
  const POSSIBLE_KEYS = [
    "medicare_doctors",
    "medicare_doctor",
    "doctors",
    "medicareDoctors",
    "medicare_doctor_list",
    "medicare_admin_doctors",
  ];

  let raw = [];
  let foundKey = null;

  for (const key of POSSIBLE_KEYS) {
    const data = DB.get(key, null);
    if (Array.isArray(data) && data.length) {
      raw = data;
      foundKey = key;
      break;
    }
  }

  // Fallback: scan ALL localStorage for anything that looks like doctors
  if (!raw.length) {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.toLowerCase().includes("doctor")) continue;
      try {
        const v = JSON.parse(localStorage.getItem(k));
        if (Array.isArray(v) && v.length && (v[0].name || v[0].specialization || v[0].spec)) {
          raw = v;
          foundKey = k;
          break;
        }
      } catch {}
    }
  }

  console.log(`📋 Doctors loaded from "${foundKey}" → ${raw.length} entries`);

  // Normalize field names (admin may use spec/speciality/etc.)
  return raw.map((d, i) => ({
    id:             d.id || d._id || d.doctorId || `doc-${i}`,
    name:           d.name || d.doctorName || d.fullName || "Unknown Doctor",
    email:          (d.email || d.doctorEmail || "").toLowerCase(),
    specialization: d.specialization || d.spec || d.speciality || d.department || "General",
    fee:            Number(d.fee || d.consultationFee || d.consultation_fee || d.price || 0),
    availability:   d.availability || d.timing || d.schedule || "Mon-Sat, 9AM - 5PM",
    status:         d.status || (d.available === false ? "busy" : "available"),
    phone:          d.phone || d.mobile || "",
    qualification:  d.qualification || d.degree || "",
  }));
}

/* =====================================================
   ✅ FIX #2: NAVIGATION (Event Delegation + Ready Check)
   Uses a single delegated listener so it works even if
   elements are rendered later, and matches sections by
   BOTH data-section and href fallback.
   ===================================================== */
function switchSection(section) {
  console.log("🔀 Switching to section:", section);

  // Update nav active state
  document.querySelectorAll(".nav-item").forEach(n => {
    const sec = n.dataset.section || (n.getAttribute("href") || "").replace("#", "");
    n.classList.toggle("active", sec === section);
  });

  // Hide all sections, show target
  let found = false;
  document.querySelectorAll(".page-section").forEach(s => {
    const match = s.id === `section-${section}` || s.dataset.section === section;
    s.classList.toggle("active", match);
    if (match) found = true;
  });

  if (!found) {
    console.warn(`⚠️ No .page-section found for "${section}" (expected id="section-${section}")`);
  }

  // Update subtitle
  const subtitles = {
    dashboard:    "Your health, our priority",
    doctors:      "Search medical specialists",
    book:         "Select doctor, date & time",
    appointments: "Track your visits",
    payments:     "All your transactions",
    profile:      "Manage personal info",
  };
  const sub = document.getElementById("pageSubtitle");
  if (sub) sub.textContent = subtitles[section] || "";

  // Close mobile sidebar
  document.getElementById("sidebar")?.classList.remove("open");

  // Render section content
  if (section === "dashboard")    renderDashboard();
  if (section === "doctors")      renderAllDoctors();
  if (section === "book")         renderBookDoctors();
  if (section === "appointments") renderAppointments();
  if (section === "payments")     renderPayments();
  if (section === "profile")      loadProfile();
}

// Global delegated click handler — works even if nav items added dynamically
document.addEventListener("click", (e) => {
  const navItem = e.target.closest(".nav-item");
  if (navItem && (navItem.dataset.section || navItem.getAttribute("href"))) {
    e.preventDefault();
    const section = navItem.dataset.section || (navItem.getAttribute("href") || "").replace("#", "");
    switchSection(section);
  }
});

// ---------- Doctor Card HTML ----------
function doctorCardHTML(d, showBookBtn = true) {
  const initial = (d.name || "D").replace("Dr. ", "").trim().charAt(0).toUpperCase();
  const available = d.status === "available";
  return `
    <div class="doctor-card" data-doctor-id="${d.id}">
      <div class="doctor-top">
        <div class="doctor-avatar">${initial}</div>
        <div>
          <div class="doctor-name">${d.name}</div>
          <div class="doctor-spec">${d.specialization}</div>
        </div>
      </div>
      <div class="doctor-availability">🕐 ${d.availability}</div>
      <div class="doctor-meta">
        <div class="doctor-fee">₹${d.fee} <small>/ visit</small></div>
        <span class="doctor-status ${available ? 'available' : 'busy'}">
          <span class="dot"></span> ${available ? 'Available' : 'Busy'}
        </span>
      </div>
      ${showBookBtn && available
        ? `<button class="doctor-book-btn" data-doctor-id="${d.id}">Book Appointment</button>`
        : ""}
    </div>
  `;
}

// ---------- Header ----------
function initHeader() {
  const firstName = (patient.name || "Patient").split(" ")[0];
  const welcomeText = document.getElementById("welcomeText");
  const patientAvatar = document.getElementById("patientAvatar");
  const welcomeBannerTitle = document.getElementById("welcomeBannerTitle");
  const welcomeBannerMsg = document.getElementById("welcomeBannerMsg");

  if (welcomeText) welcomeText.textContent = `Welcome, ${firstName} 👋`;
  if (patientAvatar) patientAvatar.textContent = firstName.charAt(0).toUpperCase();
  if (welcomeBannerTitle) welcomeBannerTitle.textContent = `Hello, ${firstName}!`;
  if (welcomeBannerMsg) {
    welcomeBannerMsg.textContent = patient.isOld
      ? `Good to see you again! ${appointments.filter(a => a.status === "upcoming").length} upcoming appointment(s).`
      : "Welcome to MediCare. Find your doctor and book your first appointment.";
  }
}

// ---------- Hospital Status ----------
function initHospitalStatus() {
  const status = DB.get("medicare_status", "open");
  const pill = document.getElementById("statusPill");
  if (!pill) return;
  pill.classList.toggle("closed", status === "closed");
  const txt = pill.querySelector(".status-text");
  if (txt) txt.textContent = status === "open" ? "Hospital: Open" : "Hospital: Closed";
}

// ---------- Dashboard ----------
function renderDashboard() {
  try {
    const upcoming = appointments.filter(a => a.status === "upcoming").length;
    const visits = appointments.filter(a => a.status === "completed").length;
    const spent = payments
      .filter(p => p.status === "success")
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const elU = document.getElementById("statUpcoming");
    const elV = document.getElementById("statVisits");
    const elS = document.getElementById("statSpent");
    const elB = document.getElementById("statBlood");
    if (elU) elU.textContent = upcoming;
    if (elV) elV.textContent = visits;
    if (elS) elS.textContent = spent.toLocaleString("en-IN");
    if (elB) elB.textContent = patient.blood || "—";

    const doctors = getAllDoctors();
    const featured = doctors.slice(0, 3);
    const fd = document.getElementById("featuredDoctors");
    if (fd) {
      fd.innerHTML = featured.length
        ? featured.map(d => doctorCardHTML(d, false)).join("")
        : `<p style="color:rgba(255,255,255,0.5); font-size:13px; grid-column:1/-1;">No doctors available yet. Please contact admin.</p>`;
    }

    const historyPanel = document.getElementById("historyPanel");
    const historyList = document.getElementById("historyList");
    if (historyPanel && historyList) {
      if (patient.isOld && appointments.length > 0) {
        historyPanel.style.display = "block";
        historyList.innerHTML = appointments
          .slice(-4)
          .reverse()
          .map(a => `
            <div class="history-item">
              <span class="h-icon">${a.status === "completed" ? "✅" : "📅"}</span>
              <div class="h-info">
                <h4>${a.doctorName} — ${a.doctorSpec}</h4>
                <p>${formatDate(a.date)} • ${a.time} ${a.disease ? `• ${a.disease}` : ""}</p>
              </div>
            </div>
          `)
          .join("");
      } else {
        historyPanel.style.display = "none";
      }
    }

    bindDoctorBookButtons();
  } catch (e) {
    console.error("renderDashboard error:", e);
  }
}

// ---------- All Doctors ----------
function renderAllDoctors() {
  try {
    const searchEl = document.getElementById("doctorSearch");
    const specEl = document.getElementById("specFilter");
    const query = searchEl ? searchEl.value.toLowerCase() : "";
    const spec = specEl ? specEl.value : "";

    let doctors = getAllDoctors();

    // Populate specialization filter dynamically
    if (specEl && specEl.options.length <= 1) {
      const specs = [...new Set(doctors.map(d => d.specialization))].sort();
      specEl.innerHTML = `<option value="">All Specializations</option>` +
        specs.map(s => `<option value="${s}">${s}</option>`).join("");
    }

    if (query) doctors = doctors.filter(d => (d.name || "").toLowerCase().includes(query));
    if (spec)  doctors = doctors.filter(d => d.specialization === spec);

    const container = document.getElementById("allDoctors");
    if (!container) return;

    container.innerHTML = doctors.length
      ? doctors.map(d => doctorCardHTML(d, true)).join("")
      : `<p style="color:rgba(255,255,255,0.5); font-size:13px; grid-column:1/-1;">No doctors match your search.</p>`;

    bindDoctorBookButtons();
  } catch (e) {
    console.error("renderAllDoctors error:", e);
  }
}

// ---------- Book Doctors (Step 1) ----------
let selectedDoctor = null;
let selectedDate = "";
let selectedTime = "";

function renderBookDoctors() {
  try {
    const doctors = getAllDoctors();
    const container = document.getElementById("bookDoctorsList");
    if (!container) return;

    container.innerHTML = doctors.length
      ? doctors.map(d => doctorCardHTML(d, false)).join("")
      : `<p style="color:rgba(255,255,255,0.5); font-size:13px; grid-column:1/-1;">No doctors available. Please contact admin.</p>`;

    container.querySelectorAll(".doctor-card").forEach(card => {
      card.addEventListener("click", () => {
        const id = card.dataset.doctorId;
        const doctor = doctors.find(d => String(d.id) === String(id));
        if (doctor) selectDoctor(doctor);
      });
    });
  } catch (e) {
    console.error("renderBookDoctors error:", e);
  }
}

function bindDoctorBookButtons() {
  document.querySelectorAll(".doctor-book-btn").forEach(btn => {
    // Remove previous listeners to avoid duplicates
    const clone = btn.cloneNode(true);
    btn.parentNode.replaceChild(clone, btn);

    clone.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = clone.dataset.doctorId;
      const doctor = getAllDoctors().find(d => String(d.id) === String(id));
      if (!doctor) return;

      switchSection("book");
      renderBookDoctors();
      setTimeout(() => selectDoctor(doctor), 100);
    });
  });
}

// ---------- Select Doctor ----------
function selectDoctor(doctor) {
  try {
    selectedDoctor = doctor;

    document.querySelectorAll("#bookDoctorsList .doctor-card").forEach(c => {
      c.classList.toggle("selected", String(c.dataset.doctorId) === String(doctor.id));
    });

    setBookingStep(2);

    const initial = (doctor.name || "D").replace("Dr. ", "").trim().charAt(0).toUpperCase();
    const infoEl = document.getElementById("selectedDoctorInfo");
    if (infoEl) {
      infoEl.innerHTML = `
        <div class="doctor-avatar">${initial}</div>
        <div>
          <div class="doctor-name">${doctor.name}</div>
          <div class="doctor-spec">${doctor.specialization} • ₹${doctor.fee}</div>
        </div>
      `;
    }

    const today = new Date().toISOString().split("T")[0];
    const dateInput = document.getElementById("apptDate");
    if (dateInput) {
      dateInput.min = today;
      dateInput.value = "";
    }
    selectedDate = "";
    selectedTime = "";

    renderTimeSlots();
  } catch (e) {
    console.error("selectDoctor error:", e);
  }
}

// ---------- Booking Step Navigation ----------
function setBookingStep(n) {
  document.querySelectorAll(".bstep").forEach(s => {
    const step = Number(s.dataset.step);
    s.classList.remove("active", "done");
    if (step < n) s.classList.add("done");
    if (step === n) s.classList.add("active");
  });

  document.querySelectorAll(".booking-panel").forEach(p => {
    p.classList.toggle("hidden", Number(p.dataset.panel) !== n);
  });
}

// ---------- Time Slots ----------
const ALL_SLOTS = [
  "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
  "11:00 AM", "11:30 AM", "12:00 PM",
  "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
  "04:00 PM", "04:30 PM", "05:00 PM",
];

function renderTimeSlots() {
  const container = document.getElementById("timeSlots");
  if (!container) return;

  // Determine taken slots for this doctor + date
  const taken = new Set(
    appointments
      .filter(a =>
        String(a.doctorId || "") === String(selectedDoctor?.id || "") &&
        a.date === selectedDate &&
        (a.status === "upcoming" || a.status === "confirmed")
      )
      .map(a => a.time)
  );

  container.innerHTML = ALL_SLOTS.map(slot => `
    <button class="time-slot ${taken.has(slot) ? "disabled" : ""}"
            data-time="${slot}"
            ${taken.has(slot) ? "disabled" : ""}>${slot}</button>
  `).join("");

  container.querySelectorAll(".time-slot:not(.disabled)").forEach(btn => {
    btn.addEventListener("click", () => {
      container.querySelectorAll(".time-slot").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      selectedTime = btn.dataset.time;
    });
  });
}

// ---------- Appointments ----------
let currentTab = "upcoming";

function renderAppointments() {
  try {
    const list = document.getElementById("apptList");
    if (!list) return;

    const filtered = appointments.filter(a =>
      currentTab === "upcoming" ? a.status === "upcoming" : a.status !== "upcoming"
    );

    if (filtered.length === 0) {
      list.innerHTML = `<div class="empty-state"><p>${currentTab === "upcoming" ? "No upcoming appointments." : "No past appointments."}</p></div>`;
      return;
    }

    filtered.sort((a, b) =>
      currentTab === "upcoming"
        ? new Date(a.date) - new Date(b.date)
        : new Date(b.date) - new Date(a.date)
    );

    list.innerHTML = filtered.map(a => {
      const d = new Date(a.date);
      const day = isNaN(d) ? "?" : d.getDate();
      const month = isNaN(d) ? "?" : d.toLocaleString("en-US", { month: "short" });
      return `
        <div class="appt-card">
          <div class="appt-date-box">
            <span class="day">${day}</span>
            <span class="month">${month}</span>
          </div>
          <div class="appt-info">
            <h4>${a.doctorName}</h4>
            <p>${a.doctorSpec} • <span class="appt-time">${a.time}</span></p>
            <p>${a.reason}</p>
          </div>
          <div class="appt-actions">
            ${a.status === "upcoming"
              ? `<span class="badge active">Upcoming</span>
                 <button class="appt-cancel" data-id="${a.id}">Cancel</button>`
              : `<span class="badge" style="color:#b9a8ff;background:rgba(185,168,255,0.15);border:1px solid rgba(185,168,255,0.3);">${a.status}</span>`}
          </div>
        </div>
      `;
    }).join("");

    list.querySelectorAll(".appt-cancel").forEach(btn => {
      btn.addEventListener("click", () => {
        if (confirm("Cancel this appointment?")) {
          const id = btn.dataset.id;
          const appt = appointments.find(a => a.id === id);
          if (appt) appt.status = "cancelled";
          DB.set(apptKey, appointments);
          renderAppointments();
          renderDashboard();
        }
      });
    });
  } catch (e) {
    console.error("renderAppointments error:", e);
  }
}

// ---------- Payments ----------
function renderPayments() {
  try {
    const tbody = document.getElementById("paymentsTableBody");
    const empty = document.getElementById("paymentsEmpty");
    if (!tbody) return;

    if (payments.length === 0) {
      tbody.innerHTML = "";
      if (empty) empty.classList.remove("hidden");
      return;
    }
    if (empty) empty.classList.add("hidden");

    tbody.innerHTML = payments.slice().reverse().map(p => `
      <tr>
        <td>${formatDate(p.date)}</td>
        <td>${p.doctorName}</td>
        <td>₹${p.amount}</td>
        <td>${p.method}</td>
        <td><span class="badge active">${p.status}</span></td>
        <td><code style="font-size:11px;color:#b9a8ff;">${p.txnId}</code></td>
      </tr>
    `).join("");
  } catch (e) {
    console.error("renderPayments error:", e);
  }
}

// ---------- Profile ----------
function loadProfile() {
  const set = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val || "";
  };
  set("pName", patient.name);
  set("pEmail", patient.email);
  set("pPhone", patient.phone);
  set("pAge", patient.age);
  set("pGender", patient.gender);
  set("pBlood", patient.blood);
  set("pAddress", patient.address);
}

/* =====================================================
   ✅ INIT — runs on DOM ready
   ===================================================== */
document.addEventListener("DOMContentLoaded", () => {
  console.log("🚀 DOM ready — initializing patient dashboard");

  initHeader();
  initHospitalStatus();
  renderDashboard();

  // Menu toggle
  safeBind("menuToggle", "click", () => {
    document.getElementById("sidebar")?.classList.toggle("open");
  });

  // Logout
  safeBind("logoutBtn", "click", () => {
    if (confirm("Logout from MediCare?")) {
      localStorage.removeItem("medicare_user");
      window.location.href = "index.html";
    }
  });

  // Search / filter
  safeBind("doctorSearch", "input", renderAllDoctors);
  safeBind("specFilter", "change", renderAllDoctors);

  // Date change
  safeBind("apptDate", "change", (e) => {
    selectedDate = e.target.value;
    if (selectedDoctor) renderTimeSlots();
  });

  // Back to step 1
  safeBind("backToStep1", "click", () => setBookingStep(1));

  // Proceed to pay
  safeBind("proceedToPay", "click", () => {
    if (!selectedDoctor) return alert("Please select a doctor first.");
    if (!selectedDate)   return alert("Please choose a date.");
    if (!selectedTime)   return alert("Please select a time slot.");

    const date = new Date(selectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) return alert("Please choose a future date.");

    const payDoctor     = document.getElementById("payDoctor");
    const payDateTime   = document.getElementById("payDateTime");
    const payAmount     = document.getElementById("payAmount");
    const payTotal      = document.getElementById("payTotal");

    if (payDoctor)   payDoctor.textContent   = selectedDoctor.name;
    if (payDateTime) payDateTime.textContent = `${formatDate(selectedDate)} • ${selectedTime}`;
    if (payAmount)   payAmount.textContent   = `₹${selectedDoctor.fee}`;
    if (payTotal)    payTotal.textContent    = `₹${selectedDoctor.fee}`;

    setBookingStep(3);
  });

  // Confirm booking
  safeBind("confirmBooking", "click", () => {
    if (!selectedDoctor || !selectedDate || !selectedTime) {
      return alert("Booking info incomplete. Please restart.");
    }

    const methodEl = document.querySelector('input[name="payMethod"]:checked');
    const method = methodEl ? methodEl.value : "UPI";

    const apptId = "APT-" + Date.now().toString(36).toUpperCase();
    const payId  = "PAY-" + Date.now().toString(36).toUpperCase();
    const txnId  = "TXN" + Math.random().toString(36).substring(2, 10).toUpperCase();

    const newAppt = {
      id: apptId,
      doctorId: selectedDoctor.id,
      doctorName: selectedDoctor.name,
      doctorSpec: selectedDoctor.specialization,
      date: selectedDate,
      time: selectedTime,
      reason: document.getElementById("apptReason")?.value || "General consultation",
      status: "upcoming",
      paid: selectedDoctor.fee,
    };

    const newPay = {
      id: payId,
      date: new Date().toISOString().split("T")[0],
      doctorName: selectedDoctor.name,
      amount: selectedDoctor.fee,
      method,
      status: "success",
      txnId,
    };

    appointments.push(newAppt);
    payments.push(newPay);
    DB.set(apptKey, appointments);
    DB.set(payKey, payments);
alert(`✅ Appointment booked!\n\nDoctor: ${selectedDoctor.name}\nDate: ${formatDate(selectedDate)}\nTime: ${selectedTime}\nTxn: ${txnId}`);

    // Reset
    selectedDoctor = null;
    selectedDate = "";
    selectedTime = "";
    setBookingStep(1);
    switchSection("appointments");
  });

  // Appointment tab toggle
  document.querySelectorAll(".appt-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".appt-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentTab = tab.dataset.tab || "upcoming";
      renderAppointments();
    });
  });

  // Save profile
  safeBind("saveProfile", "click", () => {
    patient.name    = document.getElementById("pName")?.value    || patient.name;
    patient.phone   = document.getElementById("pPhone")?.value   || patient.phone;
    patient.age     = document.getElementById("pAge")?.value     || patient.age;
    patient.gender  = document.getElementById("pGender")?.value  || patient.gender;
    patient.blood   = document.getElementById("pBlood")?.value   || patient.blood;
    patient.address = document.getElementById("pAddress")?.value || patient.address;

    DB.set(patientKey, patient);
    initHeader();
    alert("✅ Profile saved!");
  });

  // Re-render if admin changes doctors in another tab
  window.addEventListener("storage", (e) => {
    if (e.key && e.key.toLowerCase().includes("doctor")) {
      console.log("🔄 Doctor list changed by admin — refreshing");
      const activeSection = document.querySelector(".nav-item.active")?.dataset.section;
      if (activeSection === "doctors")      renderAllDoctors();
      if (activeSection === "dashboard")    renderDashboard();
      if (activeSection === "book")         renderBookDoctors();
    }
  });
});
```

---

🔑 What Was Fixed

1. Navigation Now Works

· Moved all addEventListener calls inside DOMContentLoaded — previously they ran before elements existed.
· Added a global delegated click listener on document that catches .nav-item clicks — works even for dynamically-added nav items.
· Created a single switchSection(name) function used everywhere (nav clicks, doctor-book buttons, redirects).
· Supports both data-section="doctors" and href="#doctors" styles.

2. Admin Doctors Now Sync

· getAllDoctors() now scans 6 possible localStorage keys (medicare_doctors, doctors, medicareDoctors, etc.).
