const config = window.DAILY_NEWS_CONFIG || {};
const PLATFORMS = ["youtube", "instagram", "threads", "bluesky", "mastodon"];
const status = document.querySelector("#status");
const table = document.querySelector("#stats");
const fmt = new Intl.NumberFormat("en");
const NAMES = { youtube: "YouTube", instagram: "Instagram", threads: "Threads", bluesky: "Bluesky", mastodon: "Mastodon" };
const SITES = { youtube: "youtube.com", instagram: "instagram.com", threads: "threads.com", bluesky: "bsky.app", mastodon: "joinmastodon.org" };

// Each network is shown by its own published site icon (favicon).
function icon(platform, postUrl) {
  let site = SITES[platform] || `${platform}.com`;
  try { if (postUrl) site = new URL(postUrl).host; } catch {}
  const img = document.createElement("img");
  img.src = `https://www.google.com/s2/favicons?sz=64&domain=${encodeURIComponent(site)}`;
  img.alt = NAMES[platform] || platform;
  img.title = NAMES[platform] || platform;
  img.width = img.height = 22;
  img.className = "net-icon";
  return img;
}

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

async function query(path) {
  const headers = config.supabaseAnonKey
    ? { apikey: config.supabaseAnonKey, Authorization: `Bearer ${config.supabaseAnonKey}` }
    : {};
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${path}`, { headers });
  if (!response.ok) throw new Error(`Could not load stats (HTTP ${response.status}).`);
  return response.json();
}

function cell(stat) {
  const td = document.createElement("td");
  td.className = "num";
  if (!stat) {
    td.innerHTML = '<span class="muted">–</span>';
    return td;
  }
  const parts = [];
  if (stat.views !== null) parts.push(`👁 ${fmt.format(stat.views)}`);
  if (stat.likes !== null) parts.push(`♥ ${fmt.format(stat.likes)}`);
  if (stat.reposts !== null) parts.push(`↻ ${fmt.format(stat.reposts)}`);
  if (stat.replies !== null) parts.push(`💬 ${fmt.format(stat.replies)}`);
  const text = parts.join("  ") || "–";
  if (stat.post_url) {
    const a = document.createElement("a");
    a.href = stat.post_url;
    a.target = "_blank";
    a.rel = "noopener";
    a.className = "net-link";
    a.setAttribute("aria-label", `Open the post on ${NAMES[stat.platform] || stat.platform}`);
    a.append(icon(stat.platform, stat.post_url));
    td.append(a, " ", text);
  } else {
    td.textContent = text;
  }
  return td;
}

async function load() {
  if (!config.supabaseUrl) throw new Error("The Supabase URL is not configured.");
  const since = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
  const [stats, pubs] = await Promise.all([
    query(`social_stats?select=*&publication_date=gte.${since}&order=publication_date.desc`),
    query(`publications?select=publication_date,headline&status=eq.complete&publication_date=gte.${since}`),
  ]);
  if (!stats.length) throw new Error("No stats collected yet — they appear after the next scheduled run.");

  const headlines = Object.fromEntries(pubs.map((p) => [p.publication_date, p.headline]));
  const byDay = new Map();
  const totals = { views: 0, likes: 0, reposts: 0, replies: 0 };
  for (const s of stats) {
    if (!byDay.has(s.publication_date)) byDay.set(s.publication_date, {});
    byDay.get(s.publication_date)[s.platform] = s;
    for (const k of Object.keys(totals)) totals[k] += s[k] || 0;
  }
  for (const [k, v] of Object.entries(totals)) document.querySelector(`#t-${k}`).textContent = fmt.format(v);

  const rows = [...byDay.keys()].sort().reverse().map((day) => {
    const tr = document.createElement("tr");
    tr.id = day;
    if (location.hash === `#${day}`) tr.className = "highlight";
    const d = document.createElement("td");
    d.className = "day";
    d.textContent = day;
    const h = document.createElement("td");
    h.className = "headline";
    h.textContent = headlines[day] || "";
    tr.append(d, h, ...PLATFORMS.map((p) => cell(byDay.get(day)[p])));
    return tr;
  });
  [...table.tHead.rows[0].cells].slice(2).forEach((th, i) => th.replaceChildren(icon(PLATFORMS[i])));
  table.tBodies[0].replaceChildren(...rows);
  table.hidden = false;
  document.querySelector("tr.highlight")?.scrollIntoView({ block: "center" });
  const latest = stats.reduce((a, s) => (s.updated_at > a ? s.updated_at : a), "");
  setStatus(`Last updated ${new Date(latest).toLocaleString()}`);
}

load().catch((error) => setStatus(error.message, true));
