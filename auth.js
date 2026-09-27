/* =====================================================
   MediCare — Auth Logic
   Login:   Patient / Doctor / Admin
   Register: Only Patient
   ===================================================== */

// ---------- State ----------
const state = {
  role: "patient",
  mode: "login",
};

// ---------- DOM ----------
const roleTabs      = document.querySelectorAll(".role-tab");
const roleTabsWrap  = document.getElementById("roleTabs");
const roleIndicator = document.querySelector(".role-indicator");
const authBtns      = document.querySelectorAll(".auth-btn");
const form          = document.getElementById("authForm");
const nameGroup     = document.getElementById("nameGroup");
const confirmGroup  = document.getElementById("confirmGroup");
const forgotWrap    = document.getElementById("forgotWrap");
const registerNote  = document.getElementById("registerNote");
const submitBtn     = document.getElementById("submitBtn");
const formMessage   = document.getElementById("formMessage");
const fullNameInput = document.getElementById("fullName");
const emailInput    = document.getElementById("email");
const passInput     = document.getElementById("password");
const confirmInput  = document.getElementById("confirmPassword");

// ---------- Role Tab Logic ----------
roleTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => {
    if (state.mode === "register") return;
    roleTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");
    state.role = tab.dataset.role;
    moveIndicator(index);
    updateSubmitText();
    clearMessage();
  });
});

function moveIndicator(index) {
  const gap = 4;
  const tabWidth = roleTabs[0].offsetWidth;
  roleIndicator.style.transform = `translateX(${index * (tabWidth + gap)}px)`;
}

function resetIndicatorToPatient() {
  roleTabs.forEach((t) => t.classList.remove("active"));
  roleTabs[0].classList.add("active");
  state.role = "patient";
  moveIndicator(0);
}

window.addEventListener("load", () => {
  const activeIndex = [...roleTabs].findIndex((t) =>
    t.classList.contains("active")
  );
  moveIndicator(activeIndex < 0 ? 0 : activeIndex);
});

window.addEventListener("resize", () => {
  if (state.mode === "register") return;
  const activeIndex = [...roleTabs].findIndex((t) =>
    t.classList.contains("active")
  );
  moveIndicator(activeIndex < 0 ? 0 : activeIndex);
});

// ---------- Login / Register Toggle ----------
authBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    authBtns.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.mode = btn.dataset.mode;
    toggleFormFields();
    updateSubmitText();
    clearMessage();
  });
});

function toggleFormFields() {
  if (state.mode === "register") {
    roleTabsWrap.classList.add("hidden");
    resetIndicatorToPatient();
    nameGroup.classList.remove("hidden");
    confirmGroup.classList.remove("hidden");
    forgotWrap.classList.add("hidden");
    registerNote.classList.remove("hidden");
  } else {
    roleTabsWrap.classList.remove("hidden");
    nameGroup.classList.add("hidden");
    confirmGroup.classList.add("hidden");
    forgotWrap.classList.remove("hidden");
    registerNote.classList.add("hidden");
    resetIndicatorToPatient();
  }
}

function updateSubmitText() {
  const roleLabel = state.role.charAt(0).toUpperCase() + state.role.slice(1);
  let text;
  if (state.mode === "register") {
    text = "Register as Patient";
  } else {
    text = `Login as ${roleLabel}`;
  }
  submitBtn.querySelector(".btn-text").textContent = text;
}

// ---------- Message Helpers ----------
function showMessage(text, type = "error") {
  formMessage.textContent = text;
  formMessage.className = `form-message ${type}`;
}

function clearMessage() {
  formMessage.textContent = "";
  formMessage.className = "form-message";
}

// ---------- Form Submit (SINGLE HANDLER) ----------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessage();

  const email = emailInput.value.trim().toLowerCase();
  const password = passInput.value;

  // ----- Validation -----
  if (!email || !password) {
    return showMessage("Please fill in all fields.");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return showMessage("Please enter a valid email address.");
  }
  if (password.length < 6) {
    return showMessage("Password must be at least 6 characters.");
  }
  if (state.mode === "register") {
    const fullName = fullNameInput.value.trim();
    const confirmPassword = confirmInput.value;
    if (!fullName) return showMessage("Please enter your full name.");
    if (password !== confirmPassword) {
      return showMessage("Passwords do not match.");
    }
  }

  // ----- Loading state -----
  submitBtn.disabled = true;
  const originalText = submitBtn.querySelector(".btn-text").textContent;
  submitBtn.querySelector(".btn-text").textContent = "Please wait...";

  try {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const demoUsers = {
      "admin@medicare.com":   { password: "admin123",   role: "admin"   },
      "doctor@medicare.com":  { password: "doctor123",  role: "doctor"  },
      "patient@medicare.com": { password: "patient123", role: "patient" },
    };

    // ==================== LOGIN ====================
    if (state.mode === "login") {
      let valid = false;

      // 1) ADMIN
      if (state.role === "admin") {
        const adminPass = localStorage.getItem("medicare_admin_pass") || "admin123";
        if (email === "admin@medicare.com" && password === adminPass) {
          valid = true;
        }
      }

      // 2) DOCTOR
      else if (state.role === "doctor") {
        const doctors = JSON.parse(localStorage.getItem("medicare_doctors") || "[]");
        const found = doctors.find(
          (d) => d.email.toLowerCase() === email && d.password === password
        );
        if (found) valid = true;
        else if (
          demoUsers[email] &&
          demoUsers[email].password === password &&
          demoUsers[email].role === "doctor"
        ) {
          valid = true;
        }
      }

      // 3) PATIENT
      else if (state.role === "patient") {
        const patients = JSON.parse(localStorage.getItem("medicare_patients") || "[]");
        const found = patients.find(
          (p) => p.email.toLowerCase() === email && p.password === password
        );
        if (found) valid = true;
        else if (
          demoUsers[email] &&
          demoUsers[email].password === password &&
          demoUsers[email].role === "patient"
        ) {
          valid = true;
        }
      }

      // Invalid
      if (!valid) {
        submitBtn.disabled = false;
        submitBtn.querySelector(".btn-text").textContent = originalText;
        return showMessage("Invalid email or password. Please try again.");
      }

      // Save logged-in user
      localStorage.setItem(
        "medicare_user",
        JSON.stringify({ email, role: state.role })
      );

      const roleLabel = state.role.charAt(0).toUpperCase() + state.role.slice(1);
      showMessage(`Logged in successfully as ${roleLabel}! 🎉`, "success");

      setTimeout(() => {
        if (state.role === "admin") {
          window.location.href = "admin-dashboard.html";
        } else if (state.role === "doctor") {
          alert("Doctor dashboard coming soon!");
          submitBtn.disabled = false;
          submitBtn.querySelector(".btn-text").textContent = originalText;
        } else {
          window.location.href = "patient-dashboard.html";
        }
      }, 800);
    }

    // ==================== REGISTER (only Patient) ====================
    else {
      const fullName = fullNameInput.value.trim();
      const patients = JSON.parse(localStorage.getItem("medicare_patients") || "[]");

      // Duplicate check
      if (patients.some((p) => p.email.toLowerCase() === email)) {
        submitBtn.disabled = false;
        submitBtn.querySelector(".btn-text").textContent = originalText;
        return showMessage("This email is already registered. Please login.");
      }

      // Save patient
      patients.push({
        fullName,
        email,
        password,
        role: "patient",
        createdAt: new Date().toISOString(),
      });
      localStorage.setItem("medicare_patients", JSON.stringify(patients));

      // Create patient dashboard profile
      localStorage.setItem(
        `medicare_patient_${email}`,
        JSON.stringify({
          name: fullName,
          email,
          phone: "",
          age: "",
          gender: "",
          blood: "",
          address: "",
          isOld: false,
        })
      );

      showMessage("Registered successfully! Please login. 🎉", "success");

      setTimeout(() => {
        submitBtn.disabled = false;
        submitBtn.querySelector(".btn-text").textContent = originalText;
        // Auto switch to login tab
        document.querySelector('.auth-btn[data-mode="login"]').click();
        emailInput.value = email;
        passInput.value = "";
        confirmInput.value = "";
        fullNameInput.value = "";
      }, 1200);
    }
  } catch (err) {
    console.error(err);
    showMessage("Something went wrong. Please try again.");
    submitBtn.disabled = false;
    submitBtn.querySelector(".btn-text").textContent = originalText;
  }
});

// ---------- Init ----------
updateSubmitText();