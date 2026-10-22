/* =====================================================
   MediCare — Doctor Dashboard Logic
   ===================================================== */
console.log("✅ doctor.js loaded");

// Global error catcher
window.addEventListener("error", (e) =>
  console.error("💥 Error:", e.message, "line", e.lineno));

// ---------- Auth Guard ----------
let loggedInDoctor = null;
try {
  loggedInDoctor = JSON.parse(localStorage.getItem("medicare_doctor_user") || "null");
} catch (e) { console.error(e); }

if (!loggedInDoctor || loggedInDoctor.role !== "doctor") {
  alert("Please login as Doctor first.");
  window.location.href = "doctor-login.html";
}

console.log("👨‍⚕️ Logged in:", loggedInDoctor);

// ---------- Helpers ----------
const $ = (id) => document.getElementById(id);
const DB = {
  get(k, fb) { try { const r = localStorage.getItem(k); return r ? JSON.parse(r) : fb; } catch { return fb; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { console.error(e); } }
};

const formatDate = (s) => {
  const d = new Date(s);
  return isNaN(d) ? s : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
};

// ---------- Find current doctor (full record) ----------
function getFullDoctorRecord() {
  const keys = ["medicare_doctors","medicare_doctor","doctors","medicareDoctors",
                "medicare_doctor_list","medicare_admin_doctors","doctorList","allDoctors"];
  for (const k of keys) {
    const docs = DB.get(k, null);
    if (Array.isArray(docs)) {
      const found = docs.find(d => String(d.id) === String(loggedInDoctor.id));
      if (found) return { doctor: found, key: k };
    }
  }
  return { doctor: loggedInDoctor, key: null };
}

let { doctor: currentDoctor, key: doctorStoreKey } = getFullDoctorRecord();

// ---------- Load ALL appointments for this doctor ----------
function loadAllAppointments() {
  const result = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith("medicare_appts_")) continue;
    const patientEmail = key.replace("medicare_appts_", "").toLowerCase();
    try {
      const appts = JSON.parse(localStorage.getItem(key) || "[]");
      if (!Array.isArray(appts)) continue;
      appts.forEach(a => {
        const matchById    = String(a.doctorId || "") === String(currentDoctor.id || "");
        const matchByEmail = currentDoctor.email && a.doctorEmail &&
                             a.doctorEmail.toLowerCase() === currentDoctor.email.toLowerCase();
        const matchByName  = a.doctorName && a.doctorName === currentDoctor.name;
        if (matchById || matchByEmail || matchByName) {
          result.push({ ...a, patientEmail });
        }
      });
    } catch (e) { console.error("loadAppointments:", key, e); }
  }
  return result;
}

// ---------- Update appointment in patient's storage ----------
function updateAppointment(appt, updates) {
  const key = `medicare_appts_${appt.patientEmail}`;
  const appts = DB.get(key, []);
  const idx = appts.findIndex(a => a.id === appt.id);
  if (idx < 0) return false;
  appts[idx] = { ...appts[idx], ...updates };
  DB.set(key, appts);
  return true;
}

// ---------- Patient info lookup ----------
function getPatientInfo(email) {
  const p = DB.get(`medicare_patient_${email}`, null);
  return p || { name: email.split("@")[0], email, phone: "", age: "", gender: "", blood: "" };
}

// ---------- Appointment category ----------
function apptCategory(a) {
  if (a.status === "completed") return "completed";
  if (a.status === "rejected")  return "rejected";
  if (a.status === "cancelled") return "cancelled";
  if (a.doctorApproved === true) return "accepted";
  return "pending";
}

// =====================================================
// RENDERING
// =====================================================

function initHeader() {
  const name = (currentDoctor.name || "Doctor").replace("Dr. ", "");
  if ($("welcomeText")) $("welcomeText").textContent = `Welcome, ${currentDoctor.name} 👋`;
  if ($("doctorAvatar")) $("doctorAvatar").textContent = name.charAt(0).toUpperCase();
  updateStatusPill(currentDoctor.status || "available");
}

function updateStatusPill(status) {
  const pill = $("statusPill");
  if (!pill) return;
  pill.classList.remove("busy", "offline");
  if (status === "busy")    pill.classList.add("busy");
  if (status === "offline") pill.classList.add("offline");
  const txt = pill.querySelector(".status-text");
  if (txt) txt.textContent = status.charAt(0).toUpperCase() + status.slice(1);
}

function renderDashboard() {
  const all = loadAllAppointments();
  const today = new Date().toISOString().split("T")[0];

  const todays    = all.filter(a => a.date === today &&
                    ["pending","accepted"].includes(apptCategory(a)));
  const pending   = all.filter(a => apptCategory(a) === "pending");
  const completed = all.filter(a => apptCategory(a) === "completed");
  const patients  = new Set(all.map(a => a.patientEmail));

  $("statToday")     && ($("statToday").textContent     = todays.length);
  $("statPending")   && ($("statPending").textContent   = pending.length);
  $("statCompleted") && ($("statCompleted").textContent = completed.length);
  $("statPatients")  && ($("statPatients").textContent  = patients.size);

  const cont = $("dashboardPending");
  if (!cont) return;
  if (!pending.length) {
    cont.innerHTML = `<div class="empty">🎉 No pending requests right now.</div>`;
    return;
  }
  cont.innerHTML = pending.map(a => apptHTML(a, "pending")).join("");
  bindApptActions(cont);
}

function apptHTML(a, category) {
  const p = getPatientInfo(a.patientEmail);
  return `
    <div class="appt" data-appt-id="${a.id}" data-patient-email="${a.patientEmail}">
      <div class="appt-left">
        <h4>${p.name} <span class="badge ${category}">${category}</span></h4>
        <div class="meta">📅 ${formatDate(a.date)} • ⏰ ${a.time}</div>
        <div class="meta">📧 ${p.email}${p.phone ? " • 📞 " + p.phone : ""}</div>
        ${a.reason ? `<div class="reason">📝 ${a.reason}</div>` : ""}
        ${a.disease ? `<div class="meta" style="margin-top:6px">🩺 Diagnosis: <b>${a.disease}</b></div>` : ""}
        ${a.notes ? `<div class="meta">💬 Notes: ${a.notes}</div>` : ""}
      </div>
      <div class="appt-actions">
        ${category === "pending" ? `
          <button class="btn-sm btn-accept" data-action="accept" data-id="${a.id}" data-email="${a.patientEmail}">✅ Accept</button>
          <button class="btn-sm btn-reject" data-action="reject" data-id="${a.id}" data-email="${a.patientEmail}">❌ Reject</button>
        ` : ""}
        ${category === "accepted" ? `
          <button class="btn-sm btn-complete" data-action="complete" data-id="${a.id}" data-email="${a.patientEmail}">🏁 Mark Complete</button>
        ` : ""}
      </div>
    </div>
  `;
}

function renderAppointments() {
  const cont = $("appointmentsList");
  if (!cont) return;
  const all = loadAllAppointments();
  const filtered = all.filter(a => apptCategory(a) === currentTab);

  // Sort: pending/accepted by date asc, others desc
  filtered.sort((a, b) => currentTab === "completed" || currentTab === "rejected"
    ? new Date(b.date) - new Date(a.date)
    : new Date(a.date) - new Date(b.date));

  if (!filtered.length) {
    cont.innerHTML = `<div class="empty">No ${currentTab} appointments.</div>`;
    return;
  }
  cont.innerHTML = filtered.map(a => apptHTML(a, currentTab)).join("");
  bindApptActions(cont);
}

function bindApptActions(container) {
  container.querySelectorAll("[data-action]").forEach(btn => {
    btn.onclick = () => handleApptAction(btn.dataset.action, btn.dataset.id, btn.dataset.email);
  });
}

function handleApptAction(action, apptId, patientEmail) {
  const appt = loadAllAppointments().find(a => a.id === apptId && a.patientEmail === patientEmail);
  if (!appt) return alert("Appointment not found.");

  if (action === "accept") {
    updateAppointment(appt, { doctorApproved: true, status: "upcoming" });
    alert(`✅ Appointment accepted for ${getPatientInfo(patientEmail).name}.`);
    refreshAll();
  }
  else if (action === "reject") {
    if (!confirm(`Reject appointment with ${getPatientInfo(patientEmail).name}?`)) return;
    updateAppointment(appt, { doctorApproved: false, status: "rejected" });
    alert("❌ Appointment rejected. Patient will see it under history.");
    refreshAll();
  }
  else if (action === "complete") {
    const disease = prompt("Enter diagnosis / disease:", appt.disease || "");
    if (disease === null) return;
    const notes = prompt("Enter consultation notes (optional):", appt.notes || "");
    if (notes === null) return;
    updateAppointment(appt, {
      status: "completed",
      doctorApproved: true,
      disease: disease || "Not specified",
      notes: notes || "",
      completedAt: new Date().toISOString()
    });
    alert("🏁 Appointment marked as completed.");
    refreshAll();
  }
}

// ---------- Patients section ----------
function renderPatients() {
  const cont = $("patientsList");
  if (!cont) return;

  const completed = loadAllAppointments().filter(a => apptCategory(a) === "completed");
  if (!completed.length) {
    cont.innerHTML = `<div class="empty">No completed consultations yet.</div>`;
    return;
  }
  completed.sort((a, b) => new Date(b.date) - new Date(a.date));

  cont.innerHTML = completed.map(a => {
    const p = getPatientInfo(a.patientEmail);
    return `
      <div class="patient-card" data-id="${a.id}" data-email="${a.patientEmail}">
        <div class="head">
          <div>
            <h4>${p.name}</h4>
            <div class="meta">${p.gender || "—"} • ${p.age ? p.age + " yrs" : "—"} • ${p.blood || "—"} • 📞 ${p.phone || "—"}</div>
            <div class="meta">📅 Visited: ${formatDate(a.date)} • ⏰ ${a.time}</div>
            <div class="meta">📝 Reason: ${a.reason || "—"}</div>
          </div>
          <span class="badge completed">Completed</span>
        </div>
        <div class="field">
          <label>Diagnosis / Disease</label>
          <input type="text" class="disease-input" value="${a.disease || ""}" placeholder="e.g. Hypertension">
        </div>
        <div class="field">
          <label>Notes / Prescription</label>
          <textarea class="notes-input" placeholder="Prescription, follow-up advice...">${a.notes || ""}</textarea>
        </div>
        <button class="btn-sm btn-complete save-patient-btn" style="margin-top:8px">
          💾 Save Updates
        </button>
      </div>
    `;
  }).join("");

  cont.querySelectorAll(".save-patient-btn").forEach(btn => {
    btn.onclick = () => {
      const card = btn.closest(".patient-card");
      const apptId = card.dataset.id;
      const email = card.dataset.email;
      const disease = card.querySelector(".disease-input").value.trim();
      const notes = card.querySelector(".notes-input").value.trim();
      const appt = loadAllAppointments().find(a => a.id === apptId && a.patientEmail === email);
      if (!appt) return alert("Appointment not found.");
      updateAppointment(appt, { disease: disease || "Not specified", notes });
      alert("✅ Patient record updated.");
      renderPatients();
    };
  });
}

// ---------- Availability ----------
function renderAvailability() {
  document.querySelectorAll(".status-btn").forEach(btn => {
    btn.classList.toggle("selected", btn.dataset.status === (currentDoctor.status || "available"));
  });
  if ($("availHours")) $("availHours").value = currentDoctor.availability || "";
}

function saveAvailability() {
  const sel = document.querySelector(".status-btn.selected");
  const status = sel ? sel.dataset.status : "available";
  const hours = $("availHours")?.value.trim() || "Mon-Sat, 9AM - 5PM";

  // Update in doctor store
  const keys = ["medicare_doctors","medicare_doctor","doctors","medicareDoctors",
                "medicare_doctor_list","medicare_admin_doctors"];
  let saved = false;
  for (const k of keys) {
    const docs = DB.get(k, null);
    if (!Array.isArray(docs)) continue;
    const idx = docs.findIndex(d => String(d.id) === String(currentDoctor.id));
    if (idx >= 0) {
      docs[idx].status = status;
      docs[idx].availability = hours;
      DB.set(k, docs);
      saved = true;
      break;
    }
  }
  currentDoctor.status = status;
  currentDoctor.availability = hours;
  updateStatusPill(status);
  alert(saved ? "✅ Availability updated!" : "⚠️ Doctor record not found — changes saved to session only.");
}

// ---------- Profile ----------
function renderProfile() {
  const card = $("profileCard");
  if (!card) return;
  card.innerHTML = `
    <h3 style="margin-bottom:20px">⚙️ My Profile</h3>
    <div class="field"><label>Doctor ID</label>
      <input value="${currentDoctor.id || "—"}" disabled style="opacity:0.6"></div>
    <div class="field"><label>Name</label>
      <input value="${currentDoctor.name || "—"}" disabled style="opacity:0.6"></div>
    <div class="field"><label>Email</label>
      <input value="${currentDoctor.email || "—"}" disabled style="opacity:0.6"></div>
    <div class="field"><label>Specialization</label>
      <input value="${currentDoctor.specialization || "—"}" disabled style="opacity:0.6"></div>
    <div class="field"><label>Qualification</label>
      <input value="${currentDoctor.qualification || "—"}" disabled style="opacity:0.6"></div>
    <div class="field"><label>Consultation Fee</label>
      <input value="₹${currentDoctor.fee || 0}" disabled style="opacity:0.6"></div>
    <div class="field"><label>Phone</label>
      <input value="${currentDoctor.phone || "—"}" disabled style="opacity:0.6"></div>
    <div class="field"><label>Working Hours</label>
      <input value="${currentDoctor.availability || "—"}" disabled style="opacity:0.6"></div>
    <p class="muted" style="margin-top:16px">
      To update profile details, please contact the hospital admin.
    </p>
  `;
}

// ---------- Navigation ----------
let currentTab = "pending";

const SUBTITLES = {
  dashboard:    "Your dashboard overview",
  appointments: "Manage all appointment requests",
  patients:     "Attended patients & diagnoses",
  availability: "Set your status & working hours",
  profile:      "Your registered details"
};

function switchSection(section) {
  document.querySelectorAll(".nav-item").forEach(n =>
    n.classList.toggle("active", n.dataset.section === section));
  document.querySelectorAll(".page-section").forEach(s =>
    s.classList.toggle("active", s.id === `section-${section}`));
  if ($("pageSubtitle")) $("pageSubtitle").textContent = SUBTITLES[section] || "";
  $("sidebar")?.classList.remove("open");

  if (section === "dashboard")    renderDashboard();
  if (section === "appointments") renderAppointments();
  if (section === "patients")     renderPatients();
  if (section === "availability") renderAvailability();
  if (section === "profile")      renderProfile();
}

function refreshAll() {
  renderDashboard();
  if (document.getElementById("section-appointments").classList.contains("active"))
    renderAppointments();
  if (document.getElementById("section-patients").classList.contains("active"))
    renderPatients();
}

// ---------- INIT ----------
function initDoctorDashboard() {
  console.log("🚀 Initializing doctor dashboard, readyState =", document.readyState);

  initHeader();

  // Nav
  document.querySelectorAll(".nav-item[data-section]").forEach(item => {
    item.onclick = () => switchSection(item.dataset.section);
  });

  // Logout
  if ($("logoutBtn")) $("logoutBtn").onclick = () => {
    if (confirm("Logout from doctor portal?")) {
      localStorage.removeItem("medicare_doctor_user");
      window.location.href = "doctor-login.html";
    }
  };

  // Menu toggle
  if ($("menuToggle")) $("menuToggle").onclick = () =>
    $("sidebar")?.classList.toggle("open");

  // Tabs
  document.querySelectorAll(".tab").forEach(tab => {
    tab.onclick = () => {
      document.querySelectorAll(".tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentTab = tab.dataset.tab;
      renderAppointments();
    };
  });

  // Availability status buttons
  document.querySelectorAll(".status-btn").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".status-btn").forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
    };
  });
  if ($("saveAvailability")) $("saveAvailability").onclick = saveAvailability;

  // Initial render
  renderDashboard();

  // Sync with changes from other tabs (patients booking)
  window.addEventListener("storage", (e) => {
    if (e.key && (e.key.startsWith("medicare_appts_") || e.key.toLowerCase().includes("doctor"))) {
      console.log("🔄 Data changed — refreshing");
      refreshAll();
    }
  });

  console.log("✅ Doctor dashboard ready");
}

// Run
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initDoctorDashboard);
} else {
  initDoctorDashboard();
}