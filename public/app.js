const config = window.DAILY_NEWS_CONFIG || {};
const select = document.querySelector("#date-select");
const status = document.querySelector("#status");
const publication = document.querySelector("#publication");
const image = document.querySelector("#image");
const date = document.querySelector("#date");
const headline = document.querySelector("#headline");
const summary = document.querySelector("#summary");
const statsLink = document.querySelector("#stats-summary");
const statsCache = {};
const fmt = new Intl.NumberFormat("en");

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function imageUrl(path) {
  return `${config.supabaseUrl}/storage/v1/object/public/${encodeURIComponent(config.imageBucket)}/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

function render(item) {
  date.textContent = item.publication_date;
  date.dateTime = item.publication_date;
  headline.textContent = item.headline;
  summary.textContent = item.summary;
  image.src = imageUrl(item.image_path);
  image.alt = `${item.headline} caricature`;
  publication.hidden = false;
  loadStats(item.publication_date);
}

function supabaseHeaders() {
  return config.supabaseAnonKey
    ? { apikey: config.supabaseAnonKey, Authorization: `Bearer ${config.supabaseAnonKey}` }
    : {};
}

async function loadStats(day) {
  statsLink.hidden = true;
  try {
    if (!statsCache[day]) {
      const response = await fetch(
        `${config.supabaseUrl}/rest/v1/social_stats?select=platform,views,likes,reposts,replies&publication_date=eq.${day}`,
        { headers: supabaseHeaders() }
      );
      statsCache[day] = response.ok ? await response.json() : [];
    }
    const rows = statsCache[day];
    if (!rows.length || date.dateTime !== day) return;
    const total = { views: 0, likes: 0, reposts: 0, replies: 0 };
    for (const row of rows) for (const key of Object.keys(total)) total[key] += row[key] || 0;
    statsLink.href = `stats.html#${day}`;
    statsLink.textContent =
      `\u{1F441} ${fmt.format(total.views)} views \u00b7 \u2665 ${fmt.format(total.likes)} likes \u00b7 ` +
      `\u21BB ${fmt.format(total.reposts)} shares \u00b7 \u{1F4AC} ${fmt.format(total.replies)} comments` +
      ` on ${rows.length} network${rows.length === 1 ? "" : "s"} \u2014 detailed stats \u2192`;
    statsLink.hidden = false;
  } catch {
    statsLink.hidden = true;
  }
}

async function loadPublications() {
  if (!config.supabaseUrl) throw new Error("The Supabase URL is not configured.");
  const headers = supabaseHeaders();
  const query = new URL(
    `${config.supabaseUrl}/rest/v1/publications?select=publication_date,headline,summary,image_path&status=eq.complete&order=publication_date.desc`
  );
  const response = await fetch(query, { headers });
  if (!response.ok) throw new Error(`Could not load publications (HTTP ${response.status}).`);
  const items = await response.json();
  if (!Array.isArray(items) || items.length === 0) throw new Error("No completed publications are available yet.");

  select.replaceChildren(...items.map((item) => {
    const option = new Option(item.publication_date, item.publication_date);
    option.dataset.publication = JSON.stringify(item);
    return option;
  }));
  select.disabled = false;
  select.addEventListener("change", () => render(JSON.parse(select.selectedOptions[0].dataset.publication)));
  render(items[0]);
  setStatus(`${items.length} publication${items.length === 1 ? "" : "s"} available`);
}

loadPublications().catch((error) => setStatus(error.message, true));
