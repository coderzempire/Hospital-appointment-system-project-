/* =====================================================
   MediCare — Reset Password Logic
   ===================================================== */

const resetState = {
  role: "patient",
  email: "",
  otp: "123456",
};

const rolePills   = document.querySelectorAll(".role-pill");
const steps       = document.querySelectorAll(".step-content");
const stepDots    = document.querySelectorAll(".step");
const stepLines   = document.querySelectorAll(".step-line");
const form1       = document.querySelector('form[data-step="1"]');
const form2       = document.querySelector('form[data-step="2"]');
const msg1        = document.getElementById("msg1");
const msg2        = document.getElementById("msg2");
const otpEmailEl  = document.getElementById("otpEmail");
const resetEmail  = document.getElementById("resetEmail");
const otpInput    = document.getElementById("otp");
const newPass     = document.getElementById("newPassword");
const confirmPass = document.getElementById("confirmNewPassword");

function goToStep(stepNum) {
  steps.forEach((s) => {
    s.classList.toggle("hidden", Number(s.dataset.step) !== stepNum);
  });

  stepDots.forEach((dot) => {
    const n = Number(dot.dataset.step);
    dot.classList.remove("active", "done");
    if (n < stepNum) dot.classList.add("done");
    if (n === stepNum) dot.classList.add("active");
  });

  stepLines.forEach((line, i) => {
    if (i < stepNum - 1) line.style.background = "linear-gradient(90deg, #7c5cff, #00d4ff)";
    else line.style.background = "rgba(255,255,255,0.12)";
  });

  clearAllMessages();
}

function showMsg(el, text, type = "error") {
  el.textContent = text;
  el.className = `form-message ${type}`;
}

function clearAllMessages() {
  [msg1, msg2].forEach((m) => {
    m.textContent = "";
    m.className = "form-message";
  });
}

rolePills.forEach((pill) => {
  pill.addEventListener("click", () => {
    rolePills.forEach((p) => p.classList.remove("active"));
    pill.classList.add("active");
    resetState.role = pill.dataset.role;
  });
});

form1.addEventListener("submit", async (e) => {
  e.preventDefault();

  const email = resetEmail.value.trim();

  if (!email) return showMsg(msg1, "Please enter your email.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return showMsg(msg1, "Please enter a valid email address.");
  }

  resetState.email = email;

  const btn = form1.querySelector(".submit-btn");
  const btnText = btn.querySelector(".btn-text");
  const originalText = btnText.textContent;
  btn.disabled = true;
  btnText.textContent = "Sending OTP...";

  try {
    await new Promise((r) => setTimeout(r, 1000));
    showMsg(msg1, "OTP sent successfully! ✅", "success");
    otpEmailEl.textContent = email;
    setTimeout(() => goToStep(2), 800);
  } catch (err) {
    showMsg(msg1, "Something went wrong. Try again.");
  } finally {
    btn.disabled = false;
    btnText.textContent = originalText;
  }
});

form2.addEventListener("submit", async (e) => {
  e.preventDefault();

  const otp = otpInput.value.trim();
  const password = newPass.value;
  const confirm = confirmPass.value;

  if (!otp || !password || !confirm) {
    return showMsg(msg2, "Please fill in all fields.");
  }
  if (otp.length !== 6 || !/^\d+$/.test(otp)) {
    return showMsg(msg2, "OTP must be 6 digits.");
  }
  if (otp !== resetState.otp) {
    return showMsg(msg2, "Invalid OTP. Please try again.");
  }
  if (password.length < 6) {
    return showMsg(msg2, "Password must be at least 6 characters.");
  }
  if (password !== confirm) {
    return showMsg(msg2, "Passwords do not match.");
  }

  const btn = form2.querySelector(".submit-btn");
  const btnText = btn.querySelector(".btn-text");
  const originalText = btnText.textContent;
  btn.disabled = true;
  btnText.textContent = "Resetting...";

  try {
    await new Promise((r) => setTimeout(r, 1000));

    localStorage.setItem(
      `reset_${resetState.role}_${resetState.email}`,
      password
    );

    if (resetState.role === "admin" && resetState.email === "admin@medicare.com") {
      localStorage.setItem("medicare_admin_pass", password);
    }

    showMsg(msg2, "Password reset successfully! ✅", "success");
    setTimeout(() => goToStep(3), 800);
  } catch (err) {
    showMsg(msg2, "Something went wrong. Try again.");
  } finally {
    btn.disabled = false;
    btnText.textContent = originalText;
  }
});

goToStep(1);