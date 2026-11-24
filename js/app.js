
const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];

let db = {};
const selectedTags = new Set(["#BaalAfterDark"]);
let subjectCount = 0;
let pollCount = 0;

const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
}[char]));

async function getJSON(path) {
  const separator = path.includes("?") ? "&" : "?";
  const response = await fetch(
    `${path}${separator}v=3.1.0`,
    { cache: "no-store" }
  );

  if (!response.ok) {
    throw new Error(`Impossibile caricare ${path} (${response.status})`);
  }

  return response.json();
}

function fill(element, items, placeholder, getValue = x => x.id, getLabel = x => x.name) {
  if (!element) {
    throw new Error("Elemento HTML non trovato durante il caricamento dei menu.");
  }

  element.innerHTML = "";

  const first = document.createElement("option");
  first.value = "";
  first.textContent = placeholder;
  element.append(first);

  items.forEach(item => {
    const option = document.createElement("option");
    option.value = getValue(item);
    option.textContent = getLabel(item);
    element.append(option);
  });
}

function pillar() {
  return db.taxonomy.pillars.find(
    item => item.id === $("#pillar").value
  );
}

function subcategory() {
  return (pillar()?.subcategories || []).find(
    item => item.id === $("#subcategory").value
  );
}

function updateSubcategories() {
  const items = pillar()?.subcategories || [];

  fill(
    $("#subcategory"),
    items,
    items.length ? "Seleziona sottocategoria" : "Nessuna sottocategoria"
  );

  $("#subcategory").disabled = !items.length;
  updateGenres();
}

function updateGenres() {
  const items = subcategory()?.genres || [];

  const normalized = items.map(item => ({
    id: typeof item === "string" ? item : item.id,
    name: typeof item === "string"
      ? item.replaceAll("-", " ")
      : (item.name || item.id)
  }));

  fill(
    $("#genre"),
    normalized,
    normalized.length ? "Seleziona genere" : "Nessun genere disponibile"
  );

  $("#genre").disabled = !normalized.length;
  renderTagSuggestions();
}

function packageTags() {
  const pillarId = pillar()?.id || "";
  const subId = subcategory()?.id || "";
  const genreId = $("#genre").value || "";

  const context = `${pillarId} ${subId} ${genreId}`.toLowerCase();
  const relevantPackages = {
    "devils-poll": [
      "poll", "celebrity", "performer",
      "adult-creator", "gooner", "foot-fetish"
    ],
    "vip-shoot": [
      "celebrity", "glamour", "cosplay",
      "edit", "adult-creator"
    ],
    "extreme-fetish": [
      "foot-fetish", "femdom-bdsm", "gooner",
      "edit", "anal"
    ],
    "porno-explicit": [
      "performer", "adult-creator", "gooner", "edit"
    ]
  };

  let results = [];

  for (const pkg of db.hashtags.packages || []) {
    let relevant = (relevantPackages[pillarId] || []).includes(pkg.id);

    if (context.includes("feet") || context.includes("foot")) {
      relevant = ["foot-fetish", "gooner"].includes(pkg.id);
    }

    if (context.includes("anal") || context.includes("rear")) {
      relevant = ["anal", "anal-rear", "rear-focused"].includes(pkg.id);
    }

    if (context.includes("cosplay")) {
      relevant = ["cosplay", "glamour"].includes(pkg.id);
    }

    if (
      context.includes("celebrity") ||
      context.includes("movie") ||
      context.includes("red-carpet")
    ) {
      relevant = ["celebrity", "glamour"].includes(pkg.id);
    }

    if (!relevant) continue;

    for (const status of ["base", "optional", "test"]) {
      const filter = $("#tagStatus")?.value || "all";

      if (filter !== "all" && filter !== status) continue;

      (pkg[status] || []).forEach(tag => {
        if (!tag.includes("[")) {
          results.push({
            tag,
            status,
            package: pkg.name || pkg.id
          });
        }
      });
    }
  }

  const query = $("#tagSearch")?.value.trim().toLowerCase() || "";

  results = results.filter(item =>
    !query ||
    `${item.tag} ${item.package}`.toLowerCase().includes(query)
  );

  return [...new Map(results.map(item => [item.tag, item])).values()];
}

function renderTagSuggestions() {
  const box = $("#suggestions");
  if (!box) return;

  box.innerHTML = "";

  packageTags().forEach(item => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tag" +
      (selectedTags.has(item.tag) ? " selected" : "");

    button.textContent = `${item.tag} · ${item.status}`;
    button.title = `Pacchetto: ${item.package}`;

    button.addEventListener("click", () => {
      if (selectedTags.has(item.tag)) {
        selectedTags.delete(item.tag);
      } else {
        selectedTags.add(item.tag);
      }

      syncTags();
      renderTagSuggestions();
    });

    box.append(button);
  });
}

function syncTags() {
  $("#hashtags").value = [...selectedTags].join(" ");
}

function readTags() {
  const raw = $("#hashtags").value.match(/#[\p{L}\p{N}_]+/gu) || [];

  selectedTags.clear();
  raw.forEach(tag => selectedTags.add(tag));

  if (!selectedTags.has("#BaalAfterDark")) {
    selectedTags.add("#BaalAfterDark");
  }

  syncTags();
  renderTagSuggestions();
}

function addSubjectRow() {
  subjectCount++;

  const row = document.createElement("div");
  row.className = "subject-row";

  const categories = db.subjects.categories || [];

  row.innerHTML = `
    <div>
      <label>Categoria</label>
      <select class="subject-category">
        <option value="">Non indicata</option>
        ${categories.map(category =>
          `<option value="${esc(category.id)}">${esc(category.name)}</option>`
        ).join("")}
      </select>
    </div>
    <div>
      <label>Protagonista</label>
      <input class="subject-name" list="subjectOptions"
        placeholder="Nome o pseudonimo">
      <datalist id="subjectOptions">
        ${(db.subjects.subjects || []).map(subject =>
          `<option value="${esc(subject.stage_name_or_name)}"></option>`
        ).join("")}
      </datalist>
    </div>
    <button class="remove" type="button">Rimuovi</button>
  `;

  $(".remove", row).addEventListener("click", () => {
    row.remove();
    if (!$("#subjects").children.length) addSubjectRow();
  });

  $("#subjects").append(row);
}

function addPollOption(value = "") {
  pollCount++;

  const row = document.createElement("div");
  row.className = "poll-row";

  row.innerHTML = `
    <div>
      <label>Opzione ${pollCount}</label>
      <input class="poll-option" maxlength="25"
        value="${esc(value)}" placeholder="Nome / scelta">
    </div>
    <button type="button" class="remove">Rimuovi</button>
  `;

  $(".remove", row).addEventListener("click", () => row.remove());
  $("#pollOptions").append(row);
}

function getSubjectData() {
  return $$(".subject-row").map(row => ({
    category: row.querySelector(".subject-category")
      .selectedOptions[0]?.textContent || "Non indicata",
    name: row.querySelector(".subject-name").value.trim()
  })).filter(item => item.name || item.category !== "Non indicata");
}

function makeBrief() {
  const p = pillar();
  const s = subcategory();
  const format = $("#format").selectedOptions[0]?.textContent || "Da definire";
  const subjects = getSubjectData();
  const isPoll = $("#format").value === "poll";

  const lines = [
    "BAAL AFTER DARK — SCHEDA CONTENUTO",
    "",
    `Descrizione media: ${$("#description").value.trim()}`,
    `Pilastro: ${p?.name || "Da definire"}`,
    `Sottocategoria: ${s?.name || "Da definire"}`,
    `Genere: ${$("#genre").selectedOptions[0]?.textContent || "Da definire"}`,
    `Formato: ${format}`,
    `Modalità: ${$("#mode").selectedOptions[0]?.textContent || "Contenuto singolo"}`,
    "",
    "PROTAGONISTI"
  ];

  if (subjects.length) {
    subjects.forEach((subject, index) => {
      lines.push(
        `${index + 1}. ${subject.name} | Categoria: ${subject.category}`
      );
    });
  } else {
    lines.push("Non indicati");
  }

  lines.push(
    "",
    `Contesto: ${$("#contextType").value || "Non specificato"}`,
    `Dettaglio contesto: ${$("#contextDetail").value.trim() || "Non specificato"}`,
    `Angolazione editoriale: ${$("#angle").value.trim() || "Da definire"}`,
    `Obiettivo: ${$("#objective").value || "Non specificato"}`
  );

  if (isPoll) {
    lines.push(
      "",
      "SONDAGGIO",
      `Domanda: ${$("#pollQuestion").value.trim() || "Da definire"}`
    );

    $$(".poll-option").forEach((option, index) => {
      if (option.value.trim()) {
        lines.push(`${index + 1}. ${option.value.trim()}`);
      }
    });

    lines.push(
      `Durata: ${$("#pollDuration").value || "Non specificata"}`,
      `Nota: ${$("#pollNote").value.trim() || "Nessuna"}`
    );
  }

  lines.push(
    "",
    `Hashtag: ${[...selectedTags].join(" ")}`,
    "",
    "ISTRUZIONI PER IL COPY",
    "Scrivi il copy in inglese naturale, coerente con il pilastro e con l'angolazione indicata.",
    "Usa la descrizione come fonte dei fatti: riorganizza soggetti, azioni, dettagli visivi e atmosfera senza inventare informazioni.",
    "Rispetta il limite ordinario di 280 caratteri, hashtag inclusi.",
    "Mantieni il controllo editoriale all'autore."
  );

  return lines.join("\n");
}

function resetAll() {
  document.querySelectorAll("input, textarea").forEach(element => {
    element.value = "";
  });

  $("#mode").value = "single";
  $("#contextType").value = "";
  $("#objective").value = "";
  $("#pollDuration").value = "";
  $("#pollOptions").innerHTML = "";

  pollCount = 0;
  addPollOption();
  addPollOption();

  $("#pillar").value = "";
  updateSubcategories();

  $("#format").value = "";
  $("#subjects").innerHTML = "";

  addSubjectRow();

  selectedTags.clear();
  selectedTags.add("#BaalAfterDark");
  syncTags();

  $("#output").hidden = true;
  $("#copy").disabled = true;
  $("#status").textContent = "Scheda azzerata.";

  renderTagSuggestions();
}

function exportHashtags() {
  const blob = new Blob(
    [JSON.stringify(db.hashtags, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "hashtags.json";
  link.click();

  URL.revokeObjectURL(url);

  $("#status").textContent =
    "Archivio esportato. Per renderlo permanente, sostituisci il JSON nel repository.";
}

async function init() {
  const [taxonomy, hashtags, subjects] = await Promise.all([
    getJSON("data/taxonomy.json"),
    getJSON("data/hashtags.json"),
    getJSON("data/subjects.json")
  ]);

  db = { taxonomy, hashtags, subjects };

  fill($("#pillar"), taxonomy.pillars, "Seleziona un pilastro");
  fill($("#format"), taxonomy.formats || [], "Seleziona formato");

  $("#pillar").addEventListener("change", updateSubcategories);
  $("#subcategory").addEventListener("change", updateGenres);
  $("#genre").addEventListener("change", renderTagSuggestions);

  $("#tagSearch").addEventListener("input", renderTagSuggestions);
  $("#tagStatus").addEventListener("change", renderTagSuggestions);
  $("#hashtags").addEventListener("change", readTags);

  $("#addSubject").addEventListener("click", addSubjectRow);
  $("#addPollOption").addEventListener("click", () => addPollOption());

  $("#clear").addEventListener("click", resetAll);
  $("#exportTags").addEventListener("click", exportHashtags);

  $("#prepare").addEventListener("click", () => {
    if (!$("#description").value.trim()) {
      $("#status").textContent = "Inserisci la descrizione del media.";
      return;
    }

    if ($("#format").value === "poll" && !$("#pollQuestion").value.trim()) {
      $("#status").textContent = "Inserisci la domanda del sondaggio.";
      return;
    }

    $("#output").textContent = makeBrief();
    $("#output").hidden = false;
    $("#copy").disabled = false;
    $("#status").textContent =
      "Scheda preparata. Verifica il contenuto prima di copiarlo.";
  });

  $("#copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText($("#output").textContent);
      $("#status").textContent = "Scheda copiata.";
    } catch {
      $("#status").textContent =
        "Copia automatica non disponibile: seleziona il testo della scheda.";
    }
  });

  addSubjectRow();
  addPollOption();
  addPollOption();

  syncTags();
  renderTagSuggestions();

  $("#status").textContent =
    `Archivi caricati: ${taxonomy.pillars.length} pilastri, ` +
    `${hashtags.packages.length} pacchetti hashtag, ` +
    `${subjects.categories.length} categorie protagoniste.`;
}

init().catch(error => {
  $("#status").textContent =
    `Errore: ${error.message}. Verifica i tre file JSON nella cartella data.`;
  console.error(error);
});
