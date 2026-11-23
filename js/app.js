async function loadData() {
  const [taxonomy, hashtags, subjects] = await Promise.all([
    fetch("data/taxonomy.json").then(r => r.json()),
    fetch("data/hashtags.json").then(r => r.json()),
    fetch("data/subjects.json").then(r => r.json())
  ]);

  const pillarSelect = document.querySelector("#pillar");
  pillarSelect.innerHTML = '<option value="">Seleziona un pilastro</option>';
  taxonomy.pillars.forEach(p => {
    const option = document.createElement("option");
    option.value = p.id;
    option.textContent = p.name;
    pillarSelect.appendChild(option);
  });

  document.querySelector("#status").textContent =
    `Archivi caricati: ${taxonomy.pillars.length} pilastri, ${hashtags.length} hashtag, ${subjects.length} protagonisti.`;

  document.querySelector("#preview").addEventListener("click", () => {
    const description = document.querySelector("#description").value.trim();
    if (!description) {
      document.querySelector("#status").textContent = "Inserisci prima una descrizione del contenuto.";
      return;
    }
    document.querySelector("#status").textContent =
      "Scheda acquisita. La generazione AI verrà collegata in una fase successiva.";
  });
}

loadData().catch(error => {
  console.error(error);
  document.querySelector("#status").textContent =
    "Errore nel caricamento degli archivi. Controlla che i file JSON siano presenti nella cartella data.";
});
