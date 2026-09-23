const config = window.DAILY_NEWS_CONFIG || {};
const select = document.querySelector("#date-select");
const status = document.querySelector("#status");
const publication = document.querySelector("#publication");
const image = document.querySelector("#image");
const date = document.querySelector("#date");
const headline = document.querySelector("#headline");
const summary = document.querySelector("#summary");

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
}

async function loadPublications() {
  if (!config.supabaseUrl) throw new Error("The Supabase URL is not configured.");
  const headers = config.supabaseAnonKey
    ? { apikey: config.supabaseAnonKey, Authorization: `Bearer ${config.supabaseAnonKey}` }
    : {};
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
