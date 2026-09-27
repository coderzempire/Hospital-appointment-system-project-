/* =====================================================
   MediCare — Patient Dashboard Logic (Robust Version)
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

const patientEmail = (currentUser && currentUser.email) ? currentUser.email.toLowerCase() : "";
const patientKey = `medicare_patient_${patientEmail}`;
const apptKey = `medicare_appts_${patientEmail}`;
const payKey = `medicare_pays_${patientEmail}`;

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

// Demo patient (old)
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

// Load appointments + payments
let appointments = DB.get(apptKey, []);
let payments = DB.get(payKey, []);

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
    {
      id: "PAY-DEMO-1",
      date: "2025-08-15",
      doctorName: "Dr. Aarav Mehta",
      amount: 800,
      method: "UPI",
      status: "success",
      txnId: "TXN8A9C2F1K",
    },
    {
      id: "PAY-DEMO-2",
      date: "2025-10-02",
      doctorName: "Dr. Sneha Kapoor",
      amount: 500,
      method: "UPI",
      status: "success",
      txnId: "TXN4B7D9E3M",
    },
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
  if (el) {
    el.addEventListener(event, handler);
  } else {
    console.warn(`⚠️ Element not found: #${id}`);
  }
}

// ---------- GetAllDoctors ----------
function getAllDoctors() {
  const docs = DB.get("medicare_doctors", []);
  console.log("📋 Doctors loaded:", docs.length);
  return docs.map((d, i) => ({
    ...d,
    availability: d.availability || "Mon-Sat, 9AM - 5PM",
    status: d.status || (i % 3 === 2 ? "busy" : "available"),
  }));
}

// ---------- Doctor Card HTML ----------
function doctorCardHTML(d, showBookBtn = true) {
  const initial = (d.name || "D").replace("Dr. ", "").charAt(0).toUpperCase();
  const available = d.status === "available";
  return `
    <div class="doctor-card">
      <div class="doctor-top">
        <div class="doctor-avatar">${initial}</div>
        <div>
          <div class="doctor-name">${d.name || "Unknown"}</div>
          <div class="doctor-spec">${d.specialization || "General"}</div>
        </div>
      </div>
      <div class="doctor-availability">🕐 ${d.availability}</div>
      <div class="doctor-meta">
        <div class="doctor-fee">₹${d.fee || 0} <small>/ visit</small></div>
        <span class="doctor-status ${available ? 'available' : 'busy'}">
          <span class="dot"></span> ${available ? 'Available' : 'Busy'}
        </span>
      </div>
      ${showBookBtn && available ? `<button class="doctor-book-btn" data-email="${d.email}">Book Appointment</button>` : ""}
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

    // Featured doctors
    const doctors = getAllDoctors();
    const featured = doctors.slice(0, 3);
    const fd = document.getElementById("featuredDoctors");
    if (fd) {
      fd.innerHTML = featured.length
        ? featured.map(d => doctorCardHTML(d, false)).join("")
        : `<p style="color:rgba(255,255,255,0.5); font-size:13px; grid-column:1/-1;">No doctors available yet. Please contact admin.</p>`;
    }

    // History panel
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
    if (query) doctors = doctors.filter(d => (d.name || "").toLowerCase().includes(query));
    if (spec) doctors = doctors.filter(d => d.specialization === spec);

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
        const nameEl = card.querySelector(".doctor-name");
        if (!nameEl) return;
        const name = nameEl.textContent;
        const doctor = doctors.find(d => d.name === name);
        if (doctor) selectDoctor(doctor);
      });
    });
  } catch (e) {
    console.error("renderBookDoctors error:", e);
  }
}

function bindDoctorBookButtons() {
  document.querySelectorAll(".doctor-book-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const email = btn.dataset.email;
      const doctor = getAllDoctors().find(d => d.email === email);
      if (!doctor) return;

      // Switch to Book section
      document.querySelectorAll(".nav-item").forEach(n => n.classList.remove("active"));
      const bookNav = document.querySelector('[data-section="book"]');
      if (bookNav) bookNav.classList.add("active");

      document.querySelectorAll(".page-section").forEach(s => s.classList.remove("active"));
      const bookSection = document.getElementById("section-book");
      if (bookSection) bookSection.classList.add("active");

      const sub = document.getElementById("pageSubtitle");
      if (sub) sub.textContent = "Select doctor, date & time";

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
      const nameEl = c.querySelector(".doctor-name");
      if (nameEl) {
        c.classList.toggle("selected", nameEl.textContent === doctor.name);
      }
    });

    setBookingStep(2);

    const initial = (doctor.name || "D").replace("Dr. ", "").charAt(0).toUpperCase();
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
  container.innerHTML = ALL_SLOTS.map(slot => `
    <button class="time-slot" data-time="${slot}">${slot}</button>
  `).join("");

  container.querySelectorAll(".time-slot").forEach(btn => {
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
      list.innerHTML = `<div class="empty-state">
        <p>${currentTab === "upcoming" ? "No upcoming appointments." : "No past appointments."}</p>
      </div>`;
      return;
    }

    filtered.sort((a, b) => currentTab === "upcoming"
      ? new Date(a.date) - new Date(b.date)
      : new Date(b.date) - new Date(a.date));

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

// =====================================================
// ============ EVENT LISTENERS (Attach) ===============
// =====================================================

// Sidebar navigation
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => {
    try {
      const section = item.dataset.section;
      document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
      item.classList.add("active");

      document.querySelectorAll(".page-section").forEach((s) => s.classList.remove("active"));
      const target = document.getElementById(`section-${section}`);
      if (target) target.classList.add("active");

      const sub = document.getElementById("pageSubtitle");
      if (sub) {
        const subtitles = {
          dashboard: "Your health, our priority",
          doctors: "Search medical specialists",
          book: "Select doctor, date & time",
          appointments: "Track your visits",
          payments: "All your transactions",
          profile: "Manage personal info",
        };
        sub.textContent = subtitles[section] || "";
      }

      const sb = document.getElementById("sidebar");
      if (sb) sb.classList.remove("open");

      // Render section content
      if (section === "dashboard") renderDashboard();
      if (section === "doctors") renderAllDoctors();
      if (section === "book") renderBookDoctors();
      if (section === "appointments") renderAppointments();
      if (section === "payments") renderPayments();
      if (section === "profile") loadProfile();
    } catch (e) {
      console.error("nav error:", e);
    }
  });
});

// Menu toggle
safeBind("menuToggle", "click", () => {
  const sb = document.getElementById("sidebar");
  if (sb) sb.classList.toggle("open");
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
});

// Proceed to pay
safeBind("proceedToPay", "click", () => {
  if (!selectedDoctor) return alert("Please select a doctor first.");
  if (!selectedDate) return alert("Please choose a date.");
  if (!selectedTime) return alert("Please select a time slot.");

  const date = new Date(selectedDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return alert("Please choose a future date.");

  const payDoctor = document.getElementById("payDoctor");
  const payDateTime = document.getElementById("payDateTime");
  const payAmount = document.getElementById("payAmount");
  const payTotal = document.getElementById("payTotal");

  if (payDoctor) payDoctor