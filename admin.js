/* =====================================================
   MediCare — Admin Dashboard Logic
   Uses localStorage for demo (no backend yet)
   ===================================================== */

// ---------- Auth Guard ----------
const currentUser = JSON.parse(localStorage.getItem("medicare_user") || "null");
if (!currentUser || currentUser.role !== "admin") {
  alert("Please login as Admin first.");
  window.location.href = "index.html";
}

// ---------- Data Helpers ----------
const DB = {
  get: (key, fallback) => JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)),
  set: (key, val) => localStorage.setItem(key, JSON.stringify(val)),
};

let doctors = DB.get("medicare_doctors", []);
let hospitalStatus = DB.get("medicare_status", "open");

// ---------- DOM ----------
const navItems     = document.querySelectorAll(".nav-item");
const pageSections = document.querySelectorAll(".page-section");
const pageTitle    = document.getElementById("pageTitle");
const pageSubtitle = document.getElementById("pageSubtitle");
const menuToggle   = document.getElementById("menuToggle");
const sidebar      = document.getElementById("sidebar");
const logoutBtn    = document.getElementById("logoutBtn");
const statusToggle = document.getElementById("statusToggle");

const doctorModal     = document.getElementById("doctorModal");
const doctorForm      = document.getElementById("doctorForm");
const modalTitle      = document.getElementById("modalTitle");
const addDoctorBtn    = document.getElementById("addDoctorBtn");
const cancelDoctorBtn = document.getElementById("cancelDoctorBtn");
const doctorMsg       = document.getElementById("doctorMsg");

const confirmModal  = document.getElementById("confirmModal");
const confirmText   = document.getElementById("confirmText");
const confirmOk     = document.getElementById("confirmOk");
const confirmCancel = document.getElementById("confirmCancel");

// ---------- Sidebar Navigation ----------
const pageMeta = {
  dashboard: { title: "Dashboard",  subtitle: "Overview of your hospital" },
  doctors:   { title: "Doctors",    subtitle: "Manage your medical staff" },
  reports:   { title: "Reports",    subtitle: "Hospital analytics" },
  payments:  { title: "Payments",   subtitle: "Fees and bank details" },
  settings:  { title: "Settings",   subtitle: "Hospital & admin preferences" },
};

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    const section = item.dataset.section;

    navItems.forEach((n) => n.classList.remove("active"));
    item.classList.add("active");

    pageSections.forEach((s) => s.classList.remove("active"));
    document.getElementById(`section-${section}`).classList.add("active");

    pageTitle.textContent = pageMeta[section].title;
    pageSubtitle.textContent = pageMeta[section].subtitle;

    sidebar.classList.remove("open");

    if (section === "dashboard") renderDashboard();
    if (section === "doctors") renderDoctorsTable();
    if (section === "reports") renderCharts();
  });
});

menuToggle.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

// ---------- Logout ----------
logoutBtn.addEventListener("click", () => {
  localStorage.removeItem("medicare_user");
  window.location.href = "index.html";
});

// ---------- Hospital Status ----------
function renderStatus() {
  statusToggle.classList.toggle("closed", hospitalStatus === "closed");
  statusToggle.querySelector(".status-text").textContent =
    hospitalStatus === "open" ? "Hospital: Open" : "Hospital: Closed";
}

statusToggle.addEventListener("click", () => {
  hospitalStatus = hospitalStatus === "open" ? "closed" : "open";
  DB.set("medicare_status", hospitalStatus);
  renderStatus();
});

// ---------- Dashboard ----------
function renderDashboard() {
  document.getElementById("statDoctors").textContent = doctors.length;
  document.getElementById("statPatients").textContent =
    DB.get("medicare_patients_count", 24);
  document.getElementById("statAppointments").textContent =
    DB.get("medicare_appointments_count", 12);
  document.getElementById("statRevenue").textContent =
    DB.get("medicare_revenue", 18500).toLocaleString("en-IN");

  const recentList = document.getElementById("recentDoctorsList");
  const recent = doctors.slice(-5).reverse();

  if (recent.length === 0) {
    recentList.innerHTML = `<p style="color:rgba(255,255,255,0.5); font-size:13px; text-align:center; padding:14px;">No doctors yet.</p>`;
    return;
  }

  recentList.innerHTML = recent
    .map(
      (d) => `
    <div class="recent-item">
      <div class="recent-avatar">${d.name.replace("Dr. ", "").charAt(0)}</div>
      <div class="recent-info">
        <h4>${d.name}</h4>
        <p>${d.specialization} • ₹${d.fee}</p>
      </div>
      <span class="badge active">Active</span>
    </div>`
    )
    .join("");
}

// ---------- Doctors Table ----------
function renderDoctorsTable() {
  const tbody = document.getElementById("doctorsTableBody");
  const empty = document.getElementById("doctorsEmpty");

  if (doctors.length === 0) {
    tbody.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }

  empty.classList.add("hidden");
  tbody.innerHTML = doctors
    .map(
      (d, idx) => `
    <tr>
      <td>${d.name}</td>
      <td>${d.specialization}</td>
      <td>${d.email}</td>
      <td>${d.phone}</td>
      <td>₹${d.fee}</td>
      <td><span class="badge active">Active</span></td>
      <td>
        <button class="action-btn edit" data-idx="${idx}">Edit</button>
        <button class="action-btn delete" data-idx="${idx}">Remove</button>
      </td>
    </tr>`
    )
    .join("");

  tbody.querySelectorAll(".action-btn.edit").forEach((btn) => {
    btn.addEventListener("click", () => openDoctorModal(Number(btn.dataset.idx)));
  });

  tbody.querySelectorAll(".action-btn.delete").forEach((btn) => {
    btn.addEventListener("click", () => confirmDeleteDoctor(Number(btn.dataset.idx)));
  });
}

// ---------- Add / Edit Doctor Modal ----------
let editingIdx = null;

function openDoctorModal(idx = null) {
  editingIdx = idx;
  doctorMsg.textContent = "";
  doctorMsg.className = "form-message";

  if (idx !== null) {
    const d = doctors[idx];
    modalTitle.textContent = "Edit Doctor";
    document.getElementById("doctorId").value = idx;
    document.getElementById("docName").value = d.name;
    document.getElementById("docSpec").value = d.specialization;
    document.getElementById("docFee").value = d.fee;
    document.getElementById("docEmail").value = d.email;
    document.getElementById("docPhone").value = d.phone;
    document.getElementById("docPass").value = "";
  } else {
    modalTitle.textContent = "Add New Doctor";
    doctorForm.reset();
    document.getElementById("doctorId").value = "";
  }

  doctorModal.classList.remove("hidden");
}

function closeDoctorModal() {
  doctorModal.classList.add("hidden");
  doctorForm.reset();
  editingIdx = null;
}

addDoctorBtn.addEventListener("click", () => openDoctorModal());
cancelDoctorBtn.addEventListener("click", closeDoctorModal);
doctorModal.addEventListener("click", (e) => {
  if (e.target === doctorModal) closeDoctorModal();
});

doctorForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const name  = document.getElementById("docName").value.trim();
  const spec  = document.getElementById("docSpec").value;
  const fee   = document.getElementById("docFee").value;
  const email = document.getElementById("docEmail").value.trim();
  const phone = document.getElementById("docPhone").value.trim();
  const pass  = document.getElementById("docPass").value.trim();

  if (!name || !spec || !fee || !email || !phone) {
    return showDoctorMsg("Please fill all required fields.");
  }
  if (fee < 0) return showDoctorMsg("Fee cannot be negative.");

  const doctorData = {
    name,
    specialization: spec,
    fee: Number(fee),
    email,
    phone,
    password: pass || generatePassword(),
  };

  if (editingIdx !== null) {
    doctors[editingIdx] = { ...doctors[editingIdx], ...doctorData };
  } else {
    if (doctors.some((d) => d.email === email)) {
      return showDoctorMsg("A doctor with this email already exists.");
    }
    doctors.push(doctorData);
  }

  DB.set("medicare_doctors", doctors);
  showDoctorMsg("Doctor saved successfully! ✅", "success");

  setTimeout(() => {
    closeDoctorModal();
    renderDoctorsTable();
    renderDashboard();
  }, 800);
});

function showDoctorMsg(text, type = "error") {
  doctorMsg.textContent = text;
  doctorMsg.className = `form-message ${type}`;
}

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let p = "";
  for (let i = 0; i < 8; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

// ---------- Delete Confirm ----------
let deleteIdx = null;

function confirmDeleteDoctor(idx) {
  deleteIdx = idx;
  confirmText.textContent = `Remove ${doctors[idx].name}? This cannot be undone.`;
  confirmModal.classList.remove("hidden");
}

confirmCancel.addEventListener("click", () => {
  confirmModal.classList.add("hidden");
  deleteIdx = null;
});

confirmOk.addEventListener("click", () => {
  if (deleteIdx !== null) {
    doctors.splice(deleteIdx, 1);
    DB.set("medicare_doctors", doctors);
    renderDoctorsTable();
    renderDashboard();
  }
  confirmModal.classList.add("hidden");
  deleteIdx = null;
});

confirmModal.addEventListener("click", (e) => {
  if (e.target === confirmModal) {
    confirmModal.classList.add("hidden");
    deleteIdx = null;
  }
});

// ---------- Reports ----------
function renderCharts() {
  const specCount = {};
  doctors.forEach((d) => {
    specCount[d.specialization] = (specCount[d.specialization] || 0) + 1;
  });

  const specContainer = document.getElementById("specializationChart");
  const entries = Object.entries(specCount);

  if (entries.length === 0) {
    specContainer.innerHTML = `<p style="color:rgba(255,255,255,0.5); font-size:13px;">No data yet.</p>`;
  } else {
    const max = Math.max(...entries.map(([, v]) => v));
    specContainer.innerHTML = entries
      .map(
        ([spec, count]) => `
      <div class="bar-row">
        <div class="bar-label">${spec}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${(count / max) * 100}%"></div>
        </div>
        <div class="bar-value">${count}</div>
      </div>`
      )
      .join("");
  }

  const weekly = [
    { day: "Mon", count: 12 },
    { day: "Tue", count: 18 },
    { day: "Wed", count: 9 },
    { day: "Thu", count: 22 },
    { day: "Fri", count: 15 },
    { day: "Sat", count: 7 },
    { day: "Sun", count: 3 },
  ];
  const maxW = Math.max(...weekly.map((w) => w.count));
  document.getElementById("weeklyChart").innerHTML = weekly
    .map(
      (w) => `
    <div class="bar-row">
      <div class="bar-label">${w.day}</div>
      <div class="bar-track">
        <div class="bar-fill" style="width:${(w.count / maxW) * 100}%"></div>
      </div>
      <div class="bar-value">${w.count}</div>
    </div>`
    )
    .join("");
}

// ---------- Payment Settings ----------
const paymentForm = document.getElementById("paymentForm");
const paymentMsg = document.getElementById("paymentMsg");

function loadPaymentSettings() {
  const p = DB.get("medicare_payment", {
    consultFee: 500,
    emergencyFee: 1500,
    bankAcc: "",
    ifsc: "",
    upiId: "",
  });
  document.getElementById("consultFee").value = p.consultFee;
  document.getElementById("emergencyFee").value = p.emergencyFee;
  document.getElementById("bankAcc").value = p.bankAcc;
  document.getElementById("ifsc").value = p.ifsc;
  document.getElementById("upiId").value = p.upiId;
}

paymentForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const data = {
    consultFee: Number(document.getElementById("consultFee").value) || 0,
    emergencyFee: Number(document.getElementById("emergencyFee").value) || 0,
    bankAcc: document.getElementById("bankAcc").value.trim(),
    ifsc: document.getElementById("ifsc").value.trim().toUpperCase(),
    upiId: document.getElementById("upiId").value.trim(),
  };

  DB.set("medicare_payment", data);
  paymentMsg.textContent = "Payment settings saved! ✅";
  paymentMsg.className = "form-message success";
  setTimeout(() => (paymentMsg.textContent = ""), 2500);
});

// ---------- Hospital Settings ----------
const hospitalForm = document.getElementById("hospitalForm");
const hospitalMsg = document.getElementById("hospitalMsg");

function loadHospitalSettings() {
  const h = DB.get("medicare_hospital", {
    name: "MediCare Hospital",
    email: "contact@medicare.com",
    phone: "",
    address: "",
  });
  document.getElementById("hospitalName").value = h.name;
  document.getElementById("hospitalEmail").value = h.email;
  document.getElementById("hospitalPhone").value = h.phone;
  document.getElementById("hospitalAddr").value = h.address;
}

hospitalForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = {
    name: document.getElementById("hospitalName").value.trim(),
    email: document.getElementById("hospitalEmail").value.trim(),
    phone: document.getElementById("hospitalPhone").value.trim(),
    address: document.getElementById("hospitalAddr").value.trim(),
  };
  DB.set("medicare_hospital", data);
  hospitalMsg.textContent = "Hospital info saved! ✅";
  hospitalMsg.className = "form-message success";
  setTimeout(() => (hospitalMsg.textContent = ""), 2500);
});

// ---------- Admin Password Change ----------
const adminPassForm = document.getElementById("adminPassForm");
const adminPassMsg = document.getElementById("adminPassMsg");

adminPassForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const curr = document.getElementById("currPass").value;
  const next = document.getElementById("newPass").value;

  const storedPass = localStorage.getItem("medicare_admin_pass") || "admin123";

  if (curr !== storedPass) {
    adminPassMsg.textContent = "Current password is incorrect.";
    adminPassMsg.className = "form-message error";
    return;
  }
  if (next.length < 6) {
    adminPassMsg.textContent = "New password must be at least 6 characters.";
    adminPassMsg.className = "form-message error";
    return;
  }

  localStorage.setItem("medicare_admin_pass", next);
  adminPassMsg.textContent = "Password updated! ✅";
  adminPassMsg.className = "form-message success";
  adminPassForm.reset();
  setTimeout(() => (adminPassMsg.textContent = ""), 2500);
});

// ---------- Init ----------
renderStatus();
renderDashboard();
renderDoctorsTable();
renderCharts();
loadPaymentSettings();
loadHospitalSettings();