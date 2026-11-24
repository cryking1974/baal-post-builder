
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
    `${path}${separator}v=3.1.3`,
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
  const genreId = $("#genre")?.value || "";
  const filter = $("#tagStatus")?.value || "all";

  if (!pillarId || !subId) return [];

  const results = [];

  for (const pkg of db.hashtags.packages || []) {
    const relevant = (pkg.associations || []).some(association => {
      if (
        association.pillar_id !== pillarId ||
        association.subcategory_id !== subId
      ) return false;

      // Il genere selezionato restringe i suggerimenti.
      // Senza genere, mostra i pacchetti della sottocategoria.
      return !genreId || (association.genre_ids || []).includes(genreId);
    });

    if (!relevant) continue;

    for (const sourceStatus of ["base", "optional", "test"]) {
      const tags = pkg[sourceStatus] || [];
      const effectiveStatus = pkg.status_override || sourceStatus;
      const filterStatus = effectiveStatus === "candidate_unverified"
        ? "test"
        : sourceStatus;

      if (filter !== "all" && filter !== filterStatus) continue;

      tags.forEach(tag => {
        if (typeof tag !== "string" || tag.includes("[")) return;
        results.push({
          tag,
          status: effectiveStatus,
          package: pkg.name || pkg.id
        });
      });
    }
  }

  const query = $("#tagSearch")?.value.trim().toLowerCase() || "";
  const filtered = results.filter(item =>
    !query ||
    `${item.tag} ${item.package} ${item.status}`.toLowerCase().includes(query)
  );

  return [...new Map(filtered.map(item => [item.tag, item])).values()];
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
  const selectedHashtags = [...selectedTags].filter(Boolean);
  const description = $("#description").value.trim();
  const contextType = $("#contextType").selectedOptions[0]?.textContent || "Non specificato";
  const contextDetail = $("#contextDetail").value.trim();
  const angle = $("#angle").value.trim();
  const objective = $("#objective").selectedOptions[0]?.textContent || "Non specificato";
  const genre = $("#genre").selectedOptions[0]?.textContent || "Non specificato";
  const mode = $("#mode").selectedOptions[0]?.textContent || "Contenuto singolo";

  const lines = [
    "BAAL AFTER DARK — BRIEF EDITORIALE PER LA GENERAZIONE DEL POST",
    "",
    "1. CLASSIFICAZIONE",
    `Pilastro: ${p?.name || "Non selezionato"}`,
    `Sottocategoria: ${s?.name || "Non selezionata"}`,
    `Genere: ${genre}`,
    `Formato media: ${format}`,
    `Modalità: ${mode}`,
    "",
    "2. MATERIALE DI PARTENZA",
    `Descrizione fornita dall'autore: ${description || "Non fornita"}`,
    "Tratta questa descrizione come unica fonte dei fatti visivi. Non aggiungere azioni, dettagli, identità o circostanze che non siano dichiarati."
  ];

  lines.push("", "3. SOGGETTI");
  if (subjects.length) {
    subjects.forEach((subject, index) => {
      lines.push(`${index + 1}. ${subject.name} | Categoria: ${subject.category}`);
    });
  } else {
    lines.push("Nessun soggetto indicato.");
  }

  lines.push(
    "",
    "4. CONTESTO E DIREZIONE EDITORIALE",
    `Tipo di contesto: ${contextType}`,
    `Dettaglio contesto: ${contextDetail || "Non specificato"}`,
    `Angolazione desiderata dall'autore: ${angle || "Non specificata: scegli l'angolazione più efficace usando soltanto i dati disponibili"}`,
    `Obiettivo del post: ${objective}`,
    "",
    "5. HASHTAG SELEZIONATI",
    selectedHashtags.length ? selectedHashtags.join(" ") : "Nessun hashtag selezionato.",
    "Usa gli hashtag selezionati senza inventarne altri. Mantieni soltanto quelli coerenti con il contenuto; se un tag appare incongruente, segnalalo nelle note invece di inserirlo forzatamente."
  );

  if (isPoll) {
    lines.push(
      "",
      "6. DATI DEL SONDAGGIO",
      `Domanda: ${$("#pollQuestion").value.trim() || "Non specificata"}`
    );

    const options = $$(".poll-option")
      .map(option => option.value.trim())
      .filter(Boolean);

    if (options.length) {
      options.forEach((option, index) => lines.push(`Opzione ${index + 1}: ${option}`));
    } else {
      lines.push("Opzioni: non specificate.");
    }

    lines.push(
      `Durata prevista: ${$("#pollDuration").value || "Non specificata"}`,
      `Nota sul sondaggio: ${$("#pollNote").value.trim() || "Nessuna"}`
    );
  }

  lines.push(
    "",
    "7. DIREZIONE DEL MARCHIO BAAL",
    "Scrivi in inglese naturale, idiomatico e incisivo per un pubblico internazionale.",
    "Voce BAAL: sicura, intelligente, ironica e tagliente; provocatoria quando il contesto lo consente, mai supplichevole o da fan account.",
    "Evita complimenti generici, cliché da chatbot, aggettivi gonfi, aperture ripetitive, emoji decorative e domande inserite soltanto per ottenere interazioni.",
    "Il copy deve aggiungere un punto di vista, un dettaglio significativo o un motivo per partecipare: non limitarti a parafrasare la descrizione del media.",
    "",
    "8. CRITERI EDITORIALI SPECIFICI",
    "PORNO EXPLICIT: privilegia identificazione corretta della performer, genere effettivo e un dettaglio distintivo non grafico. Non trasformare il copy in una descrizione sessuale esplicita.",
    "VIP SHOOT: collega persona, momento e contesto. Spiega perché il contenuto è interessante; non sessualizzare artificialmente una figura pubblica e non inventare attualità o viralità.",
    "EXTREME FETISH: usa la terminologia della nicchia con precisione. Mantieni il focus sul dettaglio o sulla cultura specifica, senza confondere categorie diverse e senza descrizioni sessuali grafiche.",
    "THE DEVIL'S POLL: crea un'introduzione breve e una domanda chiara. Mantieni le opzioni equilibrate e distinguibili. Il testo del post deve restare separato dalle opzioni native del sondaggio X.",
    "BEHIND BAAL: usa un tono trasparente, concreto e autoironico. Non gonfiare risultati né inventare retroscena."
  );

  if (isPoll) {
    lines.push(
      "",
      "9. OUTPUT RICHIESTO — SONDAGGIO",
      "Fornisci il testo introduttivo/domanda destinato al post e riporta separatamente le opzioni native. Non incorporare le opzioni nel testo del post come se fossero hashtag o una lista da pubblicare."
    );
  } else {
    lines.push(
      "",
      "9. OUTPUT RICHIESTO — POST ORDINARIO",
      "Produci una sola versione finale, pronta da copiare su X. Non aggiungere titoli, spiegazioni, virgolette o commenti fuori dal copy."
    );
  }

  lines.push(
    "",
    "10. VINCOLI TECNICI E DI AFFIDABILITÀ",
    "Limite massimo: 280 caratteri X per il testo pubblicabile, inclusi spazi, punteggiatura, emoji e hashtag. Mira normalmente a 220–260 caratteri senza allungare artificialmente il testo.",
    "Conta il testo completo esattamente come verrà pubblicato. Se supera 280 caratteri, riscrivilo: non troncarlo. Non dichiarare un conteggio esatto se non puoi verificarlo con un conteggio compatibile con X.",
    "Non inventare fatti, trend, popolarità, reazioni del pubblico, attribuzioni, consenso, età o diritti di utilizzo. Distingui i fatti forniti dalle interpretazioni editoriali.",
    "Prima della pubblicazione, l'autore deve verificare che le persone ritratte siano adulte, che produzione e distribuzione siano consensuali e che fonte, diritti e autorizzazioni siano adeguati. Queste verifiche non sono certificate da questa scheda.",
    "Se un dato essenziale manca o il materiale presenta un rischio evidente, segnala il problema e non colmare il vuoto con supposizioni.",
    "",
    "CONSEGNA",
    "Restituisci il copy pronto per X. Aggiungi una nota soltanto se esiste un problema concreto di coerenza, pertinenza degli hashtag o verifica editoriale."
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
