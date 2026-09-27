/* =====================================================
   MediCare — Auth Logic
   Handles: Role selection, Login/Register toggle, Form
   ===================================================== */

// ---------- State ----------
const state = {
  role: "patient", // patient | doctor | admin
  mode: "login",   // login | register
};

// ---------- DOM ----------
const roleTabs      = document.querySelectorAll(".role-tab");
const roleIndicator = document.querySelector(".role-indicator");
const authBtns      = document.querySelectorAll(".auth-btn");
const form          = document.getElementById("authForm");
const nameGroup     = document.getElementById("nameGroup");
const confirmGroup  = document.getElementById("confirmGroup");
const forgotWrap    = document.getElementById("forgotWrap");
const submitBtn     = document.getElementById("submitBtn");
const formMessage   = document.getElementById("formMessage");
const fullNameInput = document.getElementById("fullName");
const emailInput    = document.getElementById("email");
const passInput     = document.getElementById("password");
const confirmInput  = document.getElementById("confirmPassword");

// ---------- Role Tab Logic ----------
roleTabs.forEach((tab, index) => {
  tab.addEventListener("click", () => {
    roleTabs.forEach((t) => t.classList.remove("active"));
    tab.classList.add("active");

    state.role = tab.dataset.role;
    moveIndicator(index);
    updateSubmitText();
    clearMessage();
  });
});

function moveIndicator(index) {
  // indicator width = (100% - padding(10) - gaps(8)) / 3
  // shift by index * (indicatorWidth + gap)
  const gap = 4;
  const tabWidth = roleTabs[0].offsetWidth;
  roleIndicator.style.transform = `translateX(${index * (tabWidth + gap)}px)`;
}

// Fix indicator position on load & resize
window.addEventListener("load", () => {
  const activeIndex = [...roleTabs].findIndex((t) => t.classList.contains("active"));
  moveIndicator(activeIndex);
});
window.addEventListener("resize", () => {
  const activeIndex = [...roleTabs].findIndex((t) => t.classList.contains("active"));
  moveIndicator(activeIndex);
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
    nameGroup.classList.remove("hidden");
    confirmGroup.classList.remove("hidden");
    forgotWrap.classList.add("hidden");
  } else {
    nameGroup.classList.add("hidden");
    confirmGroup.classList.add("hidden");
    forgotWrap.classList.remove("hidden");
  }
}

function updateSubmitText() {
  const roleLabel = state.role.charAt(0).toUpperCase() + state.role.slice(1);
  const actionLabel = state.mode === "login" ? "Login" : "Register";
  submitBtn.querySelector(".btn-text").textContent = `${actionLabel} as ${roleLabel}`;
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
    // 🔗 Backend API call yahan aayegi (Week 2 me)
    // const res = await fetch("http://localhost:8080/api/auth/login", { ... });

    await new Promise((resolve) => setTimeout(resolve, 1200)); // mock delay

    const roleLabel = state.role.charAt(0).toUpperCase() + state.role.slice(1);
    const action = state.mode === "login" ? "Logged in" : "Registered";
    showMessage(`${action} successfully as ${roleLabel}! 🎉`, "success");

    // 🚀 Redirect (baad me role ke hisaab se different pages)
    // window.location.href = `${state.role}-dashboard.html`;
  } catch (err) {
    showMessage("Something went wrong. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.querySelector(".btn-text").textContent = originalText;
  }
});

// ---------- Init ----------
updateSubmitText();