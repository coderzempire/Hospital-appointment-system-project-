/* =====================================================
   MediCare — Auth Logic
   Login:   Patient / Doctor / Admin
   Register: Only Patient
   ===================================================== */

// ---------- State ----------
const state = {
  role: "patient", // patient | doctor | admin
  mode: "login",   // login | register
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
    // Register mode me role change allowed nahi
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

// Fix indicator on load & resize
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
    // Hide role tabs + force patient
    roleTabsWrap.classList.add("hidden");
    resetIndicatorToPatient();

    // Show register-only fields
    nameGroup.classList.remove("hidden");
    confirmGroup.classList.remove("hidden");
    forgotWrap.classList.add("hidden");
    registerNote.classList.remove("hidden");
  } else {
    // Show role tabs
    roleTabsWrap.classList.remove("hidden");

    // Hide register-only fields
    nameGroup.classList.add("hidden");
    confirmGroup.classList.add("hidden");
    forgotWrap.classList.remove("hidden");
    registerNote.classList.add("hidden");

    // Reset to patient role
    resetIndicatorToPatient();
  }
}

function updateSubmitText() {
  const roleLabel = state.role.charAt(0).toUpperCase() + state.role.slice(1);
  const actionLabel = state.mode === "login" ? "Login" : "Register";

  let text;
  if (state.mode === "register") {
    text = "Register as Patient";
  } else {
    text = `${actionLabel} as ${roleLabel}`;
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

// ---------- Form Submit ----------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearMessage();

  const email = emailInput.value.trim();
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

  // ----- Simulate API call -----
  submitBtn.disabled = true;
  const originalText = submitBtn.querySelector(".btn-text").textContent;
  submitBtn.querySelector(".btn-text").textContent = "Please wait...";

  try {
    // 🔗 Backend API yahan aayegi (Week 2 me)
    // LOGIN:    POST /api/auth/login    { email, password, role }
    // REGISTER: POST /api/auth/register { fullName, email, password }

    await new Promise((resolve) => setTimeout(resolve, 1200)); // mock delay

    if (state.mode === "login") {
      const roleLabel =
        state.role.charAt(0).toUpperCase() + state.role.slice(1);
      showMessage(`Logged in successfully as ${roleLabel}! 🎉`, "success");

      // 🚀 Redirect (baad me role ke hisaab se)
      // window.location.href = `${state.role}-dashboard.html`;
    } else {
      showMessage("Registered successfully as Patient! 🎉", "success");

      // 🚀 Redirect to login (baad me)
      // window.location.href = "index.html";
    }
  } catch (err) {
    showMessage("Something went wrong. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector(".btn-text").textContent = originalText;
  }
});

// ---------- Init ----------
updateSubmitText();