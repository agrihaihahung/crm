document.getElementById("loginForm").addEventListener("submit", async e => {
  e.preventDefault();
  const message = document.getElementById("message");
  const button = e.currentTarget.querySelector("button");
  if (!window.HHH_DB?.client) {
    message.textContent = "Chưa cấu hình Supabase. Hãy cập nhật assets/js/supabase-config.js.";
    return;
  }
  const form = new FormData(e.currentTarget);
  button.disabled = true; button.textContent = "Đang đăng nhập...";
  try {
    const {error} = await window.HHH_DB.client.auth.signInWithPassword({
      email: String(form.get("email")).trim(),
      password: String(form.get("password"))
    });
    if (error) throw error;
    location.href = "index.html";
  } catch (err) {
    message.textContent = err.message || "Không thể đăng nhập.";
  } finally {
    button.disabled = false; button.textContent = "Đăng nhập";
  }
});
