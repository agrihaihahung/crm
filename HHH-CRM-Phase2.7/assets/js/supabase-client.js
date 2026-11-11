/* Supabase browser client – load supabase-js v2 from CDN in index.html/auth.html */
(() => {
  const cfg = window.HHH_SUPABASE_CONFIG || {};
  const configured = cfg.url && cfg.anonKey &&
    !cfg.url.includes("YOUR_PROJECT_ID") &&
    !cfg.anonKey.includes("YOUR_SUPABASE");
  window.HHH_DB = {
    configured,
    client: configured && window.supabase
      ? window.supabase.createClient(cfg.url, cfg.anonKey)
      : null
  };
})();
