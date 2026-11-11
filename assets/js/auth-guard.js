// When Supabase is configured, require a valid session before showing CRM.
document.addEventListener("DOMContentLoaded", async () => {
  if (!window.HHH_DB?.client) return; // Allow local UI preview before project credentials are added.
  try {
    const {data,error} = await window.HHH_DB.client.auth.getSession();
    if (error || !data.session) location.replace("login.html");
  } catch {
    location.replace("login.html");
  }
});
