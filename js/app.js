const $ = s => document.querySelector(s);
let db = {};

async function getJSON(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Impossibile caricare ${path} (${response.status})`);
  return response.json();
}
function fillSelect(select, items, placeholder, getValue=x=>x.id, getLabel=x=>x.name) {
  select.innerHTML = "";
  const first = document.createElement("option");
  first.value = ""; first.textContent = placeholder; select.appendChild(first);
  items.forEach(item => {
    const option = document.createElement("option");
    option.value = getValue(item); option.textContent = getLabel(item);
    select.appendChild(option);
  });
}
function allSubcategories(pillar) { return pillar?.subcategories || []; }
function currentPillar() { return db.taxonomy.pillars.find(p => p.id === $("#pillar").value); }
function currentSubcategory() { return allSubcategories(currentPillar()).find(s => s.id === $("#subcategory").value); }

function updateSubcategories() {
  const subs = allSubcategories(currentPillar());
  fillSelect($("#subcategory"), subs, subs.length ? "Seleziona sottocategoria" : "Nessuna sottocategoria");
  $("#subcategory").disabled = !subs.length;
  updateGenres();
}
function updateGenres() {
  const sub = currentSubcategory();
  const genres = (sub?.genres || []).map(g => ({id:g,name:g.replaceAll("-"," ")}));
  fillSelect($("#genre"), genres, genres.length ? "Seleziona genere" : "Nessun genere disponibile");
  $("#genre").disabled = !genres.length;
  updateHashtagSuggestions();
}
function updateHashtagSuggestions() {
  const pillar = currentPillar();
  const sub = currentSubcategory();
  const genre = $("#genre").value;
  const words = [pillar?.id, sub?.id, genre].filter(Boolean);
  const matches = [];
  (db.hashtags.packages || []).forEach(pkg => {
    const haystack = `${pkg.id} ${pkg.name} ${pkg.use_when || ""}`.toLowerCase();
    if (words.some(w => haystack.includes(w.split("-")[0]) || w.includes(pkg.id))) {
      (pkg.base || []).forEach(tag => matches.push(tag));
      (pkg.optional || []).forEach(tag => matches.push(tag));
      (pkg.test || []).forEach(tag => matches.push(tag));
    }
  });
  const unique = [...new Set(matches)].slice(0,24);
  const box = $("#suggestions");
  box.innerHTML = "";
  unique.forEach(tag => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "tag"; b.textContent = tag;
    b.addEventListener("click", () => addHashtag(tag));
    box.appendChild(b);
  });
}
function addHashtag(tag) {
  const input = $("#hashtags");
  const current = input.value.trim();
  const tags = current ? current.split(/\s+/) : [];
  if (!tags.includes(tag)) input.value = [...tags,tag].join(" ");
}
function populateSubjects() {
  const categories = db.subjects.categories || [];
  fillSelect($("#subjectCategory"), categories, "Nessuna selezione");
  const names = (db.subjects.subjects || []).map(s => s.stage_name_or_name).filter(Boolean);
  $("#subjectOptions").innerHTML = names.map(n => `<option value="${String(n).replaceAll("&","&amp;").replaceAll('"',"&quot;")}">`).join("");
}
function makeBrief() {
  const p = currentPillar(), s = currentSubcategory();
  const selectedFormat = $("#format").selectedOptions[0]?.textContent || "";
  const chosenGenre = $("#genre").selectedOptions[0]?.textContent || "";
  const category = $("#subjectCategory").selectedOptions[0]?.textContent || "";
  return [
    "BAAL AFTER DARK — SCHEDA CONTENUTO",
    `Descrizione: ${$("#description").value.trim()}`,
    `Pilastro: ${p?.name || "Da definire"}`,
    `Sottocategoria: ${s?.name || "Da definire"}`,
    `Genere: ${chosenGenre || "Da definire"}`,
    `Formato: ${selectedFormat || "Da definire"}`,
    `Categoria protagonista: ${category || "Non indicata"}`,
    `Protagonista: ${$("#subject").value.trim() || "Non indicata"}`,
    `Hashtag: ${$("#hashtags").value.trim() || "Da selezionare"}`,
    "",
    "Nota: scheda preparatoria. La generazione del copy AI e i controlli editoriali automatici non sono ancora collegati."
  ].join("\n");
}
async function init() {
  const [taxonomy, hashtags, subjects] = await Promise.all([
    getJSON("data/taxonomy.json"), getJSON("data/hashtags.json"), getJSON("data/subjects.json")
  ]);
  db = {taxonomy,hashtags,subjects};
  fillSelect($("#pillar"), taxonomy.pillars, "Seleziona un pilastro");
  fillSelect($("#format"), taxonomy.formats || [], "Seleziona formato");
  populateSubjects();
  $("#pillar").addEventListener("change", updateSubcategories);
  $("#subcategory").addEventListener("change", updateGenres);
  $("#genre").addEventListener("change", updateHashtagSuggestions);
  $("#subjectCategory").addEventListener("change", updateHashtagSuggestions);
  $("#prepare").addEventListener("click", () => {
    if (!$("#description").value.trim()) { $("#status").textContent = "Inserisci una descrizione del contenuto."; return; }
    $("#output").textContent = makeBrief();
    $("#output").hidden = false;
    $("#copy").disabled = false;
    $("#status").textContent = "Scheda preparata. Gli archivi sono stati caricati correttamente.";
  });
  $("#copy").addEventListener("click", async () => {
    await navigator.clipboard.writeText($("#output").textContent);
    $("#status").textContent = "Scheda copiata.";
  });
  const totalGenres = taxonomy.pillars.reduce((n,p)=>n+(p.subcategories||[]).reduce((m,s)=>m+(s.genres||[]).length,0),0);
  $("#status").textContent = `Archivi caricati: ${taxonomy.pillars.length} pilastri, ${totalGenres} voci di genere, ${(hashtags.packages||[]).length} pacchetti hashtag, ${(subjects.categories||[]).length} categorie protagoniste.`;
}
init().catch(err => { console.error(err); $("#status").textContent = `Errore: ${err.message}. Verifica che i tre JSON siano presenti nella cartella data.`; });
