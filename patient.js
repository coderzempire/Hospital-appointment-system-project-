/* =====================================================
   MediCare — Patient Dashboard Logic
   Uses localStorage for demo (Firebase later)
   ===================================================== */

// ---------- Auth Guard ----------
const currentUser = JSON.parse(localStorage.getItem("medicare_user") || "null");
if (!currentUser || currentUser.role !== "patient") {
  alert("Please login as Patient first.");
  window.location.href = "index.html";
}

// ---------- Data Helpers ----------
const DB = {
  get: (key, fallback) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)),
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
};

const patientEmail = currentUser.email;
const patientKey = `medicare_patient_${patientEmail}`;
const apptKey = `medicare_appts_${patientEmail}`;
const payKey = `medicare_pays_${patientEmail}`;

// Load or init patient profile
let patient = DB.get(patientKey, {
  name: patientEmail.split("@")[0],
  email: patientEmail,
  phone: "",
  age: "",
  gender: "",
  blood: "",
  address: "",
  isOld: false, // new patient by default
});

// Special demo: patient@medicare.com is old
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

// Load appointments and payments
let appointments = DB.get(apptKey, []);
let payments = DB.get(payKey, []);

// Seed demo history for old patient
if (patient.isOld && appointments.length === 0) {
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

// ---------- DOM ----------
const navItems     = document.querySelectorAll(".nav-item");
const pageSections = document.querySelectorAll(".page-section");
const sidebar      = document.getElementById("sidebar");
const menuToggle   = document.getElementById("menuToggle");
const logoutBtn    = document.getElementById("logoutBtn");
const welcomeText  = document.getElementById("welcomeText");
const welcomeBannerTitle = document.getElementById("welcomeBannerTitle");
const welcomeBannerMsg   = document.getElementById("welcomeBannerMsg");
const pageSubtitle = document.getElementById("pageSubtitle");
const patientAvatar = document.getElementById("patientAvatar");

// ---------- Doctors (from admin data) ----------
function getAllDoctors() {
  const docs = DB.get("medicare_doctors", []);
  // Add mock availability if not present
  return docs.map((d, i) => ({
    ...d,
    availability: d.availability || "Mon-Sat, 9AM - 5PM",
    status: d.status || (i % 3 === 2 ? "busy" : "available"),
  }));
}

// ---------- Init Header ----------
function initHeader() {
  const firstName = patient.name.split(" ")[0];
  welcomeText.textContent = `Welcome, ${firstName} 👋`;
  patientAvatar.textContent = firstName.charAt(0);
  welcomeBannerTitle.textContent = `Hello, ${patient.name.split(" ")[0]}!`;
  welcomeBannerMsg.textContent = patient.isOld
    ? `Good to see you again! ${appointments.filter(a => a.status === "upcoming").length} upcoming appointment(s).`
    : "Welcome to MediCare. Find your doctor and book your first appointment.";
}

// ---------- Hospital Status ----------
function initHospitalStatus() {
  const status = DB.get("medicare_status", "open");
  const pill = document.getElementById("statusPill");
  pill.classList.toggle("closed", status === "closed");
  pill.querySelector(".status-text").textContent =
    status === "open" ? "Hospital: Open" : "Hospital: Closed";
}

// ---------- Sidebar Navigation ----------
const pageMeta = {
  dashboard:    { title: "Dashboard",       subtitle: "Your health, our priority" },
  doctors:      { title: "Find Doctors",    subtitle: "Search medical specialists" },
  book:         { title: "Book Appointment", subtitle: "Select doctor, date & time" },
  appointments: { title: "My Appointments", subtitle: "Track your visits" },
  payments:     { title: "Payments",        subtitle: "All your transactions" },
  profile:      { title: "My Profile",      subtitle: "Manage personal info" },
};

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const section = item.dataset.section;

    navItems.forEach((n) => n.classList.remove("active"));
    item.classList.add("active");

    pageSections.forEach((s) => s.classList.remove("active"));
    document.getElementById(`section-${section}`).classList.add("active");

    pageSubtitle.textContent = pageMeta[section].subtitle;
    sidebar.classList.remove("open");

    if (section === "dashboard") renderDashboard();
    if (section === "doctors") renderAllDoctors();
    if (section === "book") renderBookDoctors();
    if (section === "appointments") renderAppointments();
    if (section === "payments") renderPayments();
    if (section === "profile") loadProfile();
  });
});

menuToggle.addEventListener("click", () => sidebar.classList.toggle("open"));

logoutBtn.addEventListener("click", () => {
  if (confirm("Logout from MediCare?")) {
    localStorage.removeItem("medicare_user");
    window.location.href = "index.html";
  }
});

// ---------- Dashboard ----------
function renderDashboard() {
  const upcoming = appointments.filter(a => a.status === "upcoming").length;
  const visits = appointments.filter(a => a.status === "completed").length;
  const spent = payments
    .filter(p => p.status === "success")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  document.getElementById("statUpcoming").textContent = upcoming;
  document.getElementById("statVisits").textContent = visits;
  document.getElementById("statSpent").textContent = spent.toLocaleString("en-IN");
  document.getElementById("statBlood").textContent = patient.blood || "—";

  // Featured doctors
  const doctors = getAllDoctors();
  const featured = doctors.slice(0, 3);
  document.getElementById("featuredDoctors").innerHTML = featured.length
    ? featured.map(d => doctorCardHTML(d, false)).join("")
    : `<p style="color:rgba(255,255,255,0.5); font-size:13px;">No doctors available yet. Please contact admin.</p>`;

  // History panel (old patients only)
  const historyPanel = document.getElementById("historyPanel");
  if (patient.isOld && appointments.length > 0) {
    historyPanel.style.display = "block";
    document.getElementById("historyList").innerHTML = appointments
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

  // Bind book buttons
  bindDoctorBookButtons();
}

// ---------- Doctor Card HTML ----------
function doctorCardHTML(d, showBookBtn = true) {
  const initial = d.name.replace("Dr. ", "").charAt(0);
  const available = d.status === "available";
  return `
    <div class="doctor-card">
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
      ${showBookBtn && available ? `<button class="doctor-book-btn" data-email="${d.email}">Book Appointment</button>` : ""}
    </div>
  `;
}

// ---------- All Doctors ----------
function renderAllDoctors() {
  const query = document.getElementById("doctorSearch").value.toLowerCase();
  const spec = document.getElementById("specFilter").value;

  let doctors = getAllDoctors();
  if (query) doctors = doctors.filter(d => d.name.toLowerCase().includes(query));
  if (spec) doctors = doctors.filter(d => d.specialization === spec);

  document.getElementById("allDoctors").innerHTML = doctors.length
    ? doctors.map(d => doctorCardHTML(d, true)).join("")
    : `<p style="color:rgba(255,255,255,0.5); font-size:13px;">No doctors match your search.</p>`;

  bindDoctorBookButtons();
}

document.getElementById("doctorSearch").addEventListener("input", renderAllDoctors);
document.getElementById("specFilter").addEventListener("change", renderAllDoctors);

// ---------- Book Doctors (Step 1) ----------
let selectedDoctor = null;
let selectedDate = "";
let selectedTime = "";

function renderBookDoctors() {
  const doctors = getAllDoctors();
  document.getElementById("bookDoctorsList").innerHTML = doctors.length
    ? doctors.map(d => doctorCardHTML(d, false)).join("")
    : `<p style="color:rgba(255,255,255,0.5); font-size:13px;">No doctors available.</p>`;

  // Bind card click (select doctor)
  document.querySelectorAll("#bookDoctorsList .doctor-card").forEach(card => {
    card.addEventListener("click", () => {
      const name = card.querySelector(".doctor-name").textContent;
      const doctor = doctors.find(d => d.name === name);
      selectDoctor(doctor);
    });
  });
}

function bindDoctorBookButtons() {
  document.querySelectorAll(".doctor-book-btn").forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const email = btn.dataset.email;
      const doctor = getAllDoctors().find(d => d.email === email);
      if (doctor) {
        // Switch to book section
        navItems.forEach(n => n.classList.remove("active"));
        document.querySelector('[data-section="book"]').classList.add("active");
        pageSections.forEach(s => s.classList.remove("active"));
        document.getElementById("section-book").classList.add("active");
        pageSubtitle.textContent = pageMeta.book.subtitle;

        renderBookDoctors();
        selectDoctor(doctor);
      }
    });
  });
}

// ---------- Select Doctor ----------
function selectDoctor(doctor) {
  selectedDoctor = doctor;

  // Highlight selection
  document.querySelectorAll("#bookDoctorsList .doctor-card").forEach(c => {
    c.classList.toggle("selected",
      c.querySelector(".doctor-name").textContent === doctor.name);
  });

  // Mark step 1 done
  setBookingStep(2);

  // Show selected doctor in step 2
  const initial = doctor.name.replace("Dr. ", "").charAt(0);
  document.getElementById("selectedDoctorInfo").innerHTML = `
    <div class="doctor-avatar">${initial}</div>
    <div>
      <div class="doctor-name">${doctor.name}</div>
      <div class="doctor-spec">${doctor.specialization} • ₹${doctor.fee}</div>
    </div>
  `;

  // Set min date to today
  const today = new Date().toISOString().split("T")[0];
  const dateInput = document.getElementById("apptDate");
  dateInput.min = today;
  dateInput.value = "";
  selectedDate = "";
  selectedTime = "";

  // Render time slots
  renderTimeSlots();
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

document.getElementById("apptDate").addEventListener("change", (e) => {
  selectedDate = e.target.value;
});

// ---------- Proceed to Pay ----------
document.getElementById("proceedToPay").addEventListener("click", () => {
  if (!selectedDoctor) return alert("Please select a doctor first.");
  if (!selectedDate) return alert("Please choose a date.");
  if (!selectedTime) return alert("Please select a time slot.");

  const date = new Date(selectedDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date < today) return alert("Please choose a future date.");

  // Populate payment summary
  document.getElementById("payDoctor").textContent = selectedDoctor.name;
  document.getElementById("payDateTime").textContent = `${formatDate(selectedDate)} at ${selectedTime}`;
  document.getElementById("payAmount").textContent = `₹${selectedDoctor.fee}`;

  // Minimum ₹200 rule
  const fee = Number(selectedDoctor.fee);
  const payable = Math.max(fee, 200);
  document.getElementById("payTotal").textContent = `₹${payable}`;

  // Build UPI URL for QR
  const upiURL = `upi://pay?pa=medicare@upi&pn=MediCare%20Hospital&am=${payable}&cu=INR&tn=Appointment%20with%20${encodeURIComponent(selectedDoctor.name)}`;
  document.getElementById("qrImage").src =
    `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(upiURL)}`;

  setBookingStep(3);
  document.getElementById("payMsg").textContent = "";
});

document.getElementById("backToStep2").addEventListener("click", () => setBookingStep(2));

// ---------- Confirm Payment ----------
document.getElementById("confirmPayment").addEventListener("click", () => {
  const fee = Number(selectedDoctor.fee);
  const payable = Math.max(fee, 200);

  const apptId = "APT-" + Date.now().toString().slice(-8);
  const txnId = "TXN" + Math.random().toString(36).slice(2, 10).toUpperCase();

  // Save appointment
  const appt = {
    id: apptId,
    doctorName: selectedDoctor.name,
    doctorSpec: selectedDoctor.specialization,
    date: selectedDate,
    time: selectedTime,
    reason: document.getElementById("apptReason").value.trim() || "General checkup",
    status: "upcoming",
    disease: "",
    paid: payable,
  };
  appointments.push(appt);
  DB.set(apptKey, appointments);

  // Save payment
  payments.push({
    id: "PAY-" + Date.now().toString().slice(-8),
    date: new Date().toISOString().split("T")[0],
    doctorName: selectedDoctor.name,
    amount: payable,
    method: "UPI",
    status: "success",
    txnId,
  });
  DB.set(payKey, payments);

  // Mark patient as old now
  if (!patient.isOld) {
    patient.isOld = true;
    DB.set(patientKey, patient);
  }

  // Show success modal
  document.getElementById("successText").textContent =
    `Appointment with ${selectedDoctor.name} on ${formatDate(selectedDate)} at ${selectedTime}. Txn ID: ${txnId}`;
  document.getElementById("successModal").classList.remove("hidden");
});

document.getElementById("successOk").addEventListener("click", () => {
  document.getElementById("successModal").classList.add("hidden");
  // Reset booking
  selectedDoctor = null;
  selectedDate = "";
  selectedTime = "";
  document.getElementById("apptReason").value = "";
  setBookingStep(1);

  // Go to appointments
  navItems.forEach(n => n.classList.remove("active"));
  document.querySelector('[data-section="appointments"]').classList.add("active");
  pageSections.forEach(s => s.classList.remove("active"));
  document.getElementById("section-appointments").classList.add("active");
  pageSubtitle.textContent = pageMeta.appointments.subtitle;
  renderAppointments();
});

// ---------- Appointments ----------
let currentTab = "upcoming";

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentTab = btn.dataset.tab;
    renderAppointments();
  });
});

function renderAppointments() {
  const list = document.getElementById("apptList");
  const filtered = appointments.filter(a =>
    currentTab === "upcoming" ? a.status === "upcoming" : a.status !== "upcoming"
  );

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state">
      <p>${currentTab === "upcoming" ? "No upcoming appointments." : "No past appointments."}</p>
    </div>`;
    return;
  }

  // Sort: upcoming asc, past desc
  filtered.sort((a, b) => currentTab === "upcoming"
    ? new Date(a.date) - new Date(b.date)
    : new Date(b.date) - new Date(a.date));

  list.innerHTML = filtered.map(a => {
    const d = new Date(a.date);
    const day = d.getDate();
    const month = d.toLocaleString("en-US", { month: "short" });
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
            : `<span class="badge" style="color:#b9a8ff;background:rgba(185,168,255,0.15);border:1px solid rgba(185,168,255,0.3);">Completed</span>`}
        </div>
      </div>
    `;
  }).join("");

  // Bind cancel
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
}

// ---------- Payments ----------
function renderPayments() {
  const tbody = document.getElementById("paymentsTableBody");
  const empty = document.getElementById("paymentsEmpty");

  if (payments.length === 0) {
    tbody.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");

  tbody.innerHTML = payments.slice().reverse().map(p => `
    <tr>
      <td>${formatDate(p.date)}</td>
      <td>${p.doctorName}</td>
      <td>₹${p.amount}</td>
      <td>${p.method}</td>
      <td><span class="badge active">${p.status}</span></td>
      <td><code style="font-size:11px;color:#b9a8ff;">${p.txnId}</code></td>
    </tr>
 