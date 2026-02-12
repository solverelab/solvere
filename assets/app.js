/* assets/app.js
 * Solvere Lab — Laen (MVP)
 * I + II tasuta, III tasuta v0 (hiljem tasuline eskalatsioon)
 * Question form: Teie. UI: ET.
 */

(function () {
  // -----------------------------
  // Plausible helper
  // -----------------------------
  function track(eventName, props = {}) {
    try {
      if (typeof window.plausible === "function") {
        window.plausible(eventName, { props });
      }
    } catch (_) {}
  }

  // -----------------------------
  // Storage
  // -----------------------------
  const STORAGE_KEY = "sl_loan_mvp_v1";

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (_) {
      return null;
    }
  }

  function saveState(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) {}
  }

  function clearState() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (_) {}
  }

  // -----------------------------
  // Data: Questions (0–4 + aegumine)
  // -----------------------------
  const QUESTIONS = [
    // 0 — Õigusliku aluse tüüp
    {
      id: "Q1",
      filter: 0,
      phase: 1,
      text: "Kuidas raha liikus?",
      help:
        "See aitab kirjeldada, kas raha anti otse teisele inimesele või tasuti tema kohustus kolmandale isikule.",
      options: [
        { v: "direct", t: "Andsin raha otse teisele inimesele (pangaülekanne või sularaha)" },
        { v: "third", t: "Maksin tema eest kolmandale isikule (nt remont, üür, arve, trahv)" },
      ],
      next: (a) => (a.Q1 === "third" ? "Q2" : "Q3"),
    },
    {
      id: "Q2",
      filter: 0,
      phase: 1,
      text: "Kas enne maksmist oli arusaam, et ta maksab selle summa Teile tagasi?",
      help:
        "See eristab, kas makse oli tagastatavaks mõeldud või mitte. Vastus “ei” suunab olukorra sageli mujale kui laen.",
      options: [
        { v: "yes", t: "Jah" },
        { v: "no", t: "Ei" },
        { v: "unsure", t: "Ei ole kindel" },
      ],
      next: (a) => (a.Q2 === "no" ? "STOP_THIRD_NO_REPAY" : "Q3"),
    },

    // 1 — Tagastamiskokkuleppe tuvastatavus
    {
      id: "Q3",
      filter: 1,
      phase: 1,
      text: "Kas Teie vahel oli kokkulepe, et see summa tuleb tagasi maksta?",
      help:
        "Oluline on tagastamise arusaam. Ainult suuline kokkulepe ei välista laenu, kuid muudab tõendamise keerulisemaks.",
      options: [
        { v: "clear", t: "Jah, selgelt" },
        { v: "verbal", t: "Jah, kuid ainult suuliselt / jutu sees" },
        { v: "unsure", t: "Ei ole kindel" },
      ],
      next: () => "Q4",
    },
    {
      id: "Q4",
      filter: 1,
      phase: 1,
      text: "Kas tagastamise kokkulepe on kuskil kirjas või jälgitav?",
      help:
        "Kirjalik jälg muudab sageli vaidluse fookust: kas vaieldakse detailide või kokkuleppe olemasolu üle.",
      options: [
        { v: "doc", t: "Kirjalik leping / võlakiri" },
        { v: "msgs", t: "Sõnumid / e-kirjad" },
        { v: "oral", t: "Ainult suuline kokkulepe" },
        { v: "lost", t: "Ei tea / ei ole alles" },
      ],
      next: (a) => {
        if (a.Q3 === "unsure" && (a.Q4 === "oral" || a.Q4 === "lost")) return "STOP_QUAL_UNCLEAR";
        return "Q5";
      },
    },

    // 2 — Ajaline raam (sissenõutavus)
    {
      id: "Q5",
      filter: 2,
      phase: 1,
      text: "Kas lepiti kokku, millal raha tuleb tagasi maksta?",
      help:
        "See kirjeldab tagasimakse ajalist kuju: kuupäev, ajavahemik või ebaselge aeg.",
      options: [
        { v: "date", t: "Jah, konkreetne kuupäev" },
        { v: "period", t: "Jah, teatud aja jooksul" },
        { v: "none", t: "Ei, tähtaega ei olnud" },
        { v: "unsure", t: "Ei ole kindel" },
      ],
      next: (a) => (a.Q5 === "date" || a.Q5 === "period" ? "Q6" : "Q6A"),
    },
    {
      id: "Q6",
      filter: 2,
      phase: 1,
      text: "Kas see tähtaeg on möödas?",
      help: "Kui tähtaeg ei ole möödas, ei ole tagasimakse aeg veel saabunud.",
      options: [
        { v: "yes", t: "Jah" },
        { v: "no", t: "Ei" },
      ],
      next: (a) => (a.Q6 === "no" ? "STOP_NOT_DUE_YET" : "A1"),
    },
    {
      id: "Q6A",
      filter: 2,
      phase: 1,
      text: "Kas olete teisele poolele selgelt öelnud, et soovite raha tagasi?",
      help:
        "Kui tähtaega ei olnud või see jäi ebaselgeks, muutub oluliseks selge tagasinõudmise olemasolu.",
      options: [
        { v: "yes", t: "Jah" },
        { v: "no", t: "Ei" },
        { v: "unsure", t: "Ei ole kindel" },
      ],
      next: (a) => (a.Q6A === "no" ? "STOP_NO_DEMAND" : "A1"),
    },

    // Aegumine (avaneb ainult sissenõutavuse järel)
    {
      id: "A1",
      filter: 2,
      phase: 2,
      text: "Kas tagasimakse nõue muutus Teie hinnangul sissenõutavaks rohkem kui 3 aastat tagasi?",
      help:
        "Tehingust tulenev nõue aegub üldjuhul 3 aastaga alates sissenõutavaks muutumisest. Kohus arvestab aegumist üksnes juhul, kui teine pool sellele tugineb.",
      options: [
        { v: "yes", t: "Jah" },
        { v: "no", t: "Ei" },
        { v: "unsure", t: "Ei ole kindel" },
      ],
      next: (a) => (a.A1 === "no" ? "Q7" : "A2"),
    },
    {
      id: "A2",
      filter: 2,
      phase: 2,
      text: "Kas vahepeal toimus midagi, mis võis aegumise kulgemist mõjutada?",
      help:
        "Mõned sündmused võivad aegumise arvestust mõjutada. Täpne arvestus sõltub ajajoone faktidest.",
      options: [
        { v: "court", t: "Teie esitasite hagi või avalduse kohtusse" },
        { v: "arb", t: "Teie algatasite vahekohtumenetluse" },
        { v: "extra", t: "Poolte vahel lepiti kokku täiendavas maksetähtajas" },
        { v: "none", t: "Ei ole teada selliseid asjaolusid" },
      ],
      multi: true,
      next: () => "Q7",
    },

    // 3 — Täitmine (tagasimakse)
    {
      id: "Q7",
      filter: 3,
      phase: 2,
      text: "Kas raha on tagasi makstud?",
      help:
        "Kui raha on täielikult tagasi makstud, ei saa põhisumma osas nõuet olla. Kui vaidlus jätkub, võib see puudutada muid teemasid.",
      options: [
        { v: "full", t: "Jah, täielikult" },
        { v: "partial", t: "Jah, osaliselt" },
        { v: "no", t: "Ei, üldse mitte" },
        { v: "unsure", t: "Ei ole kindel" },
      ],
      next: (a) => (a.Q7 === "full" ? "STOP_FULL_REPAID" : "Q8"),
    },
    {
      id: "Q8",
      filter: 3,
      phase: 2,
      text: "Kas Teil on ülevaade, kui suur summa on veel tasumata?",
      help:
        "Kui arvestus on ebamäärane, vaidlus keskendub sageli sellele, millised rahaliikumised olid tagasimaksed ja millised olid midagi muud.",
      options: [
        { v: "exact", t: "Jah, tean täpselt" },
        { v: "rough", t: "Umbes tean" },
        { v: "no", t: "Ei tea" },
      ],
      next: () => "Q9",
      showIf: (a) => a.Q7 === "partial" || a.Q7 === "unsure",
    },
    {
      id: "Q9",
      filter: 3,
      phase: 2,
      text: "Kas teine pool ütleb, et ta on raha tagasi maksnud?",
      help:
        "Kui teine pool väidab tasumist, muutub vaidluse keskseks küsimuseks tagasimakse tuvastamine ja arvestus.",
      options: [
        { v: "yes", t: "Jah" },
        { v: "no", t: "Ei" },
        { v: "dontknow", t: "Ei tea" },
      ],
      next: (a) => (a.Q9 === "yes" ? "Q10" : "Q11"),
    },
    {
      id: "Q10",
      filter: 3,
      phase: 2,
      text: "Kas Teil on teada, kas tal on tagasimakse kohta tõend?",
      help:
        "Tõend võib olla pangaülekanne, kviitung, sõnum või muu info, mis seob väite konkreetse maksega.",
      options: [
        { v: "yes", t: "Jah" },
        { v: "no", t: "Ei" },
        { v: "dontknow", t: "Ei tea" },
      ],
      next: () => "Q11",
      showIf: (a) => a.Q9 === "yes",
    },

    // 4 — Kõrvalnõuded
    {
      id: "Q11",
      filter: 4,
      phase: 2,
      text: "Kas Teil oli kokkulepe intressi kohta (tasu raha kasutamise eest)?",
      help:
        "See kirjeldab, kas lisaks põhisummale oli kokku lepitud tasu raha kasutamise eest.",
      options: [
        { v: "yes", t: "Jah" },
        { v: "no", t: "Ei" },
        { v: "dontknow", t: "Ei tea" },
      ],
      next: () => "Q12",
    },
    {
      id: "Q12",
      filter: 4,
      phase: 2,
      text: "Kui tagasimakse hilines, kas arutelus oli juttu lisasummast hilinemise eest?",
      help:
        "Sõnastuses kasutatakse vahel erinevaid termineid (intress, viivis, lisaraha). Siin on oluline kirjeldada, millest tegelikult räägiti.",
      options: [
        { v: "viivis", t: "Jah, viivisest / hilinemise tasust" },
        { v: "intress_after", t: "Jah, intressist ka pärast tähtaega" },
        { v: "principal_only", t: "Ei, ainult põhisummast" },
        { v: "dontknow", t: "Ei tea" },
      ],
      next: () => "END",
    },
  ];

  const STOP_TEXTS = {
    STOP_THIRD_NO_REPAY:
      "Kirjelduse põhjal ei seostu olukord tagastamise arusaamaga. Sellisel juhul võib vaidluse keskmes olla muu suhe kui laen (näiteks kulude katmine või muu kokkulepe).",
    STOP_QUAL_UNCLEAR:
      "Kirjelduse põhjal on tagastamise arusaam ja selle sisu ebaselge ning kirjalik jälg puudub. Vaidluse keskne teema võib olla see, kas tagastamiskokkulepe üldse oli ja mis tingimustel.",
    STOP_NOT_DUE_YET:
      "Kirjelduse põhjal ei ole kokkulepitud tagasimakse aeg veel saabunud.",
    STOP_NO_DEMAND:
      "Kirjelduse põhjal ei ole tagasimakse soov teisele poolele selgelt väljendatud. Tähtajatu või ebaselge tähtajaga olukorras võib see olla määrav.",
    STOP_FULL_REPAID:
      "Kirjelduse põhjal on põhisumma tagasi makstud. Kui vaidlus on siiski olemas, võib see puudutada muid teemasid (näiteks lisasummad või kokkuleppe sisu).",
  };

  // -----------------------------
  // Risk Engine (backend-only, user sees qualitative)
  // -----------------------------
  const BRANCH_ORDER = ["aegumine", "kvalifikatsioon", "sissenoutavus", "taitmine", "korvalnouded"];

  const RISK_TEXTS = {
    R1: {
      title: "Tagastamiskokkulepe on ebaselge",
      why: "Kui ei ole selge, et raha tuli tagasi maksta, võib vaidlus keskenduda sellele, kas laen üldse oli.",
      example: "Näiteks kui kasutati väljendeid nagu “vaatame hiljem” või “kui saad”.",
      consequence: "Vaidlus võib keskenduda kokkuleppe olemasolule, mitte tagastamata summale.",
      steps: [
        "Koondage kirjalikud jäljed (sõnumid, e-kirjad), kus räägitakse tagastamisest.",
        "Koostage lühike ajajoon: raha liikumine ja hilisemad arutelud tagastamise üle.",
        "Kui suhtlus jätkub, hoidke sõnastus neutraalne ja faktipõhine."
      ]
    },
    R2: {
      title: "Kirjalik jälg puudub või ei ole alles",
      why: "Kui kokkulepet ei ole võimalik väljastpoolt näha, võib vaidlus tugineda rohkem mälule ja sündmuste kirjeldamisele.",
      example: "Näiteks kui sõnumid on kustutatud või kontod vahetunud.",
      consequence: "Vaidlus võib muutuda detailseks sündmuste kirjeldamise vaidluseks.",
      steps: [
        "Otsige välja olemasolevad kaudsed jäljed (maksete selgitused, varasemad vestlused, tunnistajad).",
        "Koostage lihtne arvestus: summa, kuupäev, selgitus, vastus.",
        "Vältige oletusi; eristage faktid ja hinnangud."
      ]
    },
    R4: {
      title: "Tähtaeg on ebaselge",
      why: "Kui tähtaeg ei ole selge, võib vaidlus keskenduda sellele, millal pidi tagasimakse toimuma.",
      example: "Näiteks “varsti” või “kui saad” ilma ajaraamita.",
      consequence: "Rikkumise hindamine võib muutuda vaieldavaks.",
      steps: [
        "Koondage kirjalikud viited ajale või perioodile, millest räägiti.",
        "Kui tähtaega ei olnud, selgitage, kas ja millal esitasite tagasinõudmise.",
        "Koostage ajajoon sündmuste järjekorrast."
      ]
    },
    R5: {
      title: "Tagasinõudmine ei ole selgelt väljendatud",
      why: "Kui tähtaega ei olnud, võib tagasinõudmise selgus olla võtmetähtsusega.",
      example: "Kaudsed vihjed ei ole sama, mis selge soov raha tagasi saada.",
      consequence: "Vaidlus võib keskenduda sellele, kas nõue oli juba esitatav.",
      steps: [
        "Koondage, kas ja kuidas tagasinõudmine esitati (sõnum, e-kiri).",
        "Hoidke edasine suhtlus neutraalne ja konkreetne.",
        "Koostage ajajoon: millal tagasimakse muutus aktiivseks teemaks."
      ]
    },
    R7: {
      title: "Arvestus või tagasimaksed on ebaselged",
      why: "Kui on osamakseid või segaseid liikumisi, tekib vaidlus sageli arvestuse üle.",
      example: "Mitmed väiksed ülekanded eri selgitustega.",
      consequence: "Vaidlus võib keskenduda sellele, millised maksed olid tagasimaksed.",
      steps: [
        "Koostage lihtne tabel: kuupäev, summa, selgitus, kas see on tagasimakse.",
        "Eraldage muud tehingud tagasimaksetest.",
        "Hoidke üks selge jääksumma, mida arvestate põhinõudena."
      ]
    },
    R10: {
      title: "Lisasummade teema on ebaselge",
      why: "Kui lisasummade (intress, hilinemise tasu) sisu ei ole selge, võib vaidlus liikuda terminite ja arvestuse peale.",
      example: "Sõnu “intress” ja “viivis” kasutatakse eri tähenduses.",
      consequence: "Lisasummad võivad muuta vaidluse fookust ja arvestust.",
      steps: [
        "Kirjeldage, millest tegelikult räägiti (protsent, summa, ajavahemik).",
        "Hoidke põhinõue ja lisasummad eraldi.",
        "Vajadusel jätke lisasummad esialgu kõrvale ja keskenduge põhisummale."
      ]
    },
    R11: {
      title: "Võimalik aegumise risk",
      why: "Kui sissenõutavaks muutumisest võib olla möödunud üle 3 aasta, võib teine pool vaidluses aegumisele tugineda.",
      example: "Kui tagasimakse tähtaeg oli ammu ja vahepeal ei toimunud vaidlust mõjutavaid samme.",
      consequence: "Vaidlus võib keskenduda aegumisele, mitte põhinõude sisule.",
      steps: [
        "Koostage ajajoon: millal nõue muutus sissenõutavaks (tähtaeg või selge tagasinõudmine).",
        "Kontrollige, kas vahepeal oli kohtusse pöördumist või täiendava tähtaja kokkulepet.",
        "Kui aegumine on tõenäoline, vajab ajajoone täpsustamine kõige rohkem tähelepanu."
      ]
    },
    R12: {
      title: "Aegumise arvestus võib olla keerukam",
      why: "On viiteid asjaoludele, mis võivad aegumise arvestust mõjutada. Täpne ajajoon võib olla määrava tähtsusega.",
      example: "Näiteks kohtusse pöördumine või täiendava tähtaja kokkulepe.",
      consequence: "Aegumise küsimus võib vajada detailset ajajoone kontrolli.",
      steps: [
        "Koostage ajajoon: tähtaeg, tagasinõudmine, võimalikud menetlused, täiendavad tähtajad.",
        "Koondage tõendid, mis seovad need sündmused konkreetsete kuupäevadega.",
        "Hoidke selgelt eraldi: põhinõue ja aegumisega seotud sündmused."
      ]
    },
    R13: {
      title: "Aegumise risk on ebaselge",
      why: "Kui ei ole kindel, millal nõue muutus sissenõutavaks, ei saa aegumise riski usaldusväärselt hinnata.",
      example: "Tähtaeg jäi ebaselgeks ja tagasinõudmist ei ole võimalik ajastada.",
      consequence: "Ajalisus võib muutuda vaidluse keskseks küsimuseks.",
      steps: [
        "Koondage viited tähtajale või selgele tagasinõudmisele (sõnumid, e-kirjad).",
        "Koostage sündmuste järjekord, isegi kui kuupäevad on ligikaudsed.",
        "Kui võimalik, täpsustage vähemalt üks ankur: tähtaeg või tagasinõudmise hetk."
      ]
    }
  };

  function collectRisks(a) {
    const risks = [];

    // kvalifikatsioon
    if (a.Q3 === "unsure") risks.push({ id: "R1", branch: "kvalifikatsioon", weight: 4, priority: 2 });
    if (a.Q4 === "oral" || a.Q4 === "lost") risks.push({ id: "R2", branch: "kvalifikatsioon", weight: 3, priority: 2 });

    // sissenõutavus
    if (a.Q5 === "unsure") risks.push({ id: "R4", branch: "sissenoutavus", weight: 3, priority: 2 });
    if ((a.Q5 === "none" || a.Q5 === "unsure") && (a.Q6A === "no" || a.Q6A === "unsure")) {
      risks.push({ id: "R5", branch: "sissenoutavus", weight: 3, priority: 2 });
    }

    // täitmine/arvestus
    if (a.Q7 === "partial" || a.Q7 === "unsure") {
      if (a.Q8 === "no" || a.Q8 === "rough") risks.push({ id: "R7", branch: "taitmine", weight: 2, priority: 1 });
    }

    // kõrvalnõuded
    if (a.Q12 === "intress_after" || a.Q12 === "dontknow") risks.push({ id: "R10", branch: "korvalnouded", weight: 1, priority: 1 });

    // aegumine (priority 3)
    if (a.A1 === "yes") {
      const a2 = Array.isArray(a.A2) ? a.A2 : [];
      const hasAffect = a2.includes("court") || a2.includes("arb") || a2.includes("extra");
      const hasNone = a2.includes("none");
      if (hasNone || a2.length === 0) risks.push({ id: "R11", branch: "aegumine", weight: 4, priority: 3 });
      if (hasAffect) risks.push({ id: "R12", branch: "aegumine", weight: 3, priority: 3 });
    }
    if (a.A1 === "unsure") risks.push({ id: "R13", branch: "aegumine", weight: 2, priority: 3 });

    return risks;
  }

  function pickTopRisk(risks) {
    if (!risks.length) return null;
    return risks
      .slice()
      .sort((x, y) => {
        if (y.priority !== x.priority) return y.priority - x.priority; // aegumine ette
        if (y.weight !== x.weight) return y.weight - x.weight;
        return BRANCH_ORDER.indexOf(x.branch) - BRANCH_ORDER.indexOf(y.branch);
      })[0];
  }

  function computeStrengths(a) {
    const s = [];
    if (a.Q4 === "doc") s.push("Tagastamise kokkulepe on kirjalik (leping / võlakiri).");
    if (a.Q4 === "msgs") s.push("Tagastamise arusaam on sõnumites või e-kirjades jälgitav.");
    if (a.Q6 === "yes") s.push("Kokkulepitud tähtaeg on möödas.");
    if (a.Q6A === "yes") s.push("Tagasinõudmine on selgelt väljendatud.");
    // max 2
    return s.slice(0, 2);
  }

  function buildTimeline(a) {
    const items = [];
    // 0
    if (a.Q1 === "direct") {
      items.push({ title: "Raha anti otse teisele poolele", sub: "Ülekanne või sularaha." });
    }
    if (a.Q1 === "third") {
      items.push({ title: "Tasuti kolmandale isikule teise poole eest", sub: "Näiteks arve, remont, üür või muu kohustus." });
      if (a.Q2 === "yes") items.push({ title: "Tagastamise arusaam oli enne maksmist olemas", sub: "Kirjelduse järgi oli eesmärk, et summa makstakse tagasi." });
      if (a.Q2 === "no") items.push({ title: "Tagastamise arusaam ei eristu", sub: "Olukord võib kuuluda teise aluse alla." });
      if (a.Q2 === "unsure") items.push({ title: "Tagastamise arusaam on ebaselge", sub: "Poolte arusaam ei pruugi olla üheselt sõnastatud." });
    }

    // 1
    if (a.Q3 === "clear") items.push({ title: "Tagastamiskokkulepe: selge", sub: "Kirjelduse järgi lepiti tagastamises kokku." });
    if (a.Q3 === "verbal") items.push({ title: "Tagastamiskokkulepe: suuline", sub: "Kokkulepe oli jutu sees, kirjalik jälg võib puududa." });
    if (a.Q3 === "unsure") items.push({ title: "Tagastamiskokkulepe: ebaselge", sub: "Vaidlus võib keskenduda sellele, kas kokkulepe oli." });

    if (a.Q4 === "doc") items.push({ title: "Kirjalik jälg: leping / võlakiri", sub: "Kokkulepe on dokumenteeritud." });
    if (a.Q4 === "msgs") items.push({ title: "Kirjalik jälg: sõnumid / e-kirjad", sub: "Kokkuleppe sisu on jälgitav suhtlusest." });
    if (a.Q4 === "oral") items.push({ title: "Kirjalik jälg puudub", sub: "Kokkulepe on ainult suuline." });
    if (a.Q4 === "lost") items.push({ title: "Kirjalik jälg ei ole alles", sub: "Võimalik, et oli, kuid ei ole kättesaadav." });

    // 2
    if (a.Q5 === "date" || a.Q5 === "period") {
      items.push({ title: "Tähtaeg oli kokku lepitud", sub: a.Q6 === "yes" ? "Tähtaeg on möödas." : "Tähtaeg ei ole möödas." });
    } else {
      items.push({ title: "Tähtaeg puudus või jäi ebaselgeks", sub: a.Q6A === "yes" ? "Tagasinõudmine on väljendatud." : "Tagasinõudmine ei eristu selgelt." });
    }

    // aegumine
    if (a.A1 === "yes") {
      const a2 = Array.isArray(a.A2) ? a.A2 : [];
      if (a2.includes("none") || a2.length === 0) {
        items.push({ title: "Aegumine: võimalik risk", sub: "Sissenõutavusest võib olla möödunud üle 3 aasta." });
      } else {
        items.push({ title: "Aegumine: võib vajada täpsustamist", sub: "On viiteid asjaoludele, mis võivad arvestust mõjutada." });
      }
    }
    if (a.A1 === "unsure") items.push({ title: "Aegumine: ebaselge", sub: "Sissenõutavuse ajastus ei ole kindel." });
    if (a.A1 === "no") items.push({ title: "Aegumine: risk ei eristu", sub: "Kirjelduse järgi ei ole 3-aasta piir tõenäoliselt ületatud." });

    // 3
    if (a.Q7 === "full") items.push({ title: "Tagasimakse: täielik", sub: "Põhisumma on tagasi makstud." });
    if (a.Q7 === "partial") items.push({ title: "Tagasimakse: osaline", sub: "Põhinõue on jääksumma." });
    if (a.Q7 === "no") items.push({ title: "Tagasimakse: puudub", sub: "Kirjelduse järgi ei ole tagasi makstud." });
    if (a.Q7 === "unsure") items.push({ title: "Tagasimakse: ebaselge", sub: "Arvestus vajab täpsustamist." });

    // 4
    if (a.Q11 === "yes") items.push({ title: "Intress: oli arutelu/kokkulepe", sub: "Lisaks põhisummale räägiti raha kasutamise tasust." });
    if (a.Q11 === "no") items.push({ title: "Intress: ei olnud kokku lepitud", sub: "Fookus on põhisummal." });
    if (a.Q12 === "viivis") items.push({ title: "Hiline lisasumma: viivis/hilinemise tasu", sub: "Räägiti hilinemisega seotud lisasummast." });
    if (a.Q12 === "intress_after") items.push({ title: "Hiline lisasumma: intress pärast tähtaega", sub: "Sõnastus võib vajada täpsustamist." });

    return items;
  }

  function qualitativeLevel(a) {
    // Lepingu tuvastatavus
    let qual = "Mõõdukas";
    if (a.Q3 === "clear" && (a.Q4 === "doc" || a.Q4 === "msgs")) qual = "Tugev";
    if (a.Q3 === "unsure" && (a.Q4 === "oral" || a.Q4 === "lost")) qual = "Nõrk";

    // Sissenõutavus
    let due = "Vajab täpsustamist";
    if ((a.Q5 === "date" || a.Q5 === "period") && a.Q6 === "yes") due = "Selge";
    if ((a.Q5 === "date" || a.Q5 === "period") && a.Q6 === "no") due = "Puudub";
    if ((a.Q5 === "none" || a.Q5 === "unsure") && a.Q6A === "yes") due = "Selge";
    if ((a.Q5 === "none" || a.Q5 === "unsure") && (a.Q6A === "no")) due = "Puudub";

    // Tagasimakse küsimus
    let rep = "Ebaselge";
    if (a.Q7 === "no") rep = "Selge";
    if (a.Q7 === "partial") rep = "Osaline";
    if (a.Q7 === "full") rep = "Selge";

    return { qual, due, rep };
  }

  // -----------------------------
  // UI wiring
  // -----------------------------
  const el = (id) => document.getElementById(id);
  const qaPanel = el("qaPanel");
  const qa = el("qa");
  const stopPanel = el("stopPanel");
  const stopText = el("stopText");
  const summaryPanel = el("summaryPanel");
  const summaryBlocks = el("summaryBlocks");
  const timelineEl = el("timeline");
  const phase3Panel = el("phase3Panel");
  const phase3Content = el("phase3Content");

  const btnNext = el("btnNext");
  const btnBack = el("btnBack");
  const btnReset = el("btnReset");
  const btnReset2 = el("btnReset2");
  const btnReset3 = el("btnReset3");
  const btnReset4 = el("btnReset4");
  const btnShowSummaryAfterStop = el("btnShowSummaryAfterStop");

  const btnOpenPhase3 = el("btnOpenPhase3");
  const btnBackToSummary = el("btnBackToSummary");
  const btnToggleTimeline = el("btnToggleTimeline");

  const btnCopy = el("btnCopy");
  const btnInterest = el("btnInterest");

  const progressBar = el("progressBar");
  const phaseLabel = el("phaseLabel");
  const stepLabel = el("stepLabel");

  // -----------------------------
  // State
  // -----------------------------
  const initial = {
    currentId: "Q1",
    history: [],
    answers: {},
    stopped: null,
  };

  let state = loadState() || initial;

  // Track entry
  track("mvp_open", { page: "loan" });

  function resetAll() {
    state = JSON.parse(JSON.stringify(initial));
    clearState();
    showQA();
    render();
    track("reset", { page: "loan" });
  }

  function showStop(stopId) {
    state.stopped = stopId;
    saveState(state);
    qaPanel.classList.add("hidden");
    summaryPanel.classList.add("hidden");
    phase3Panel.classList.add("hidden");
    stopPanel.classList.remove("hidden");
    stopText.textContent = STOP_TEXTS[stopId] || "Analüüs peatus.";
    track("stop", { stopId });
  }

  function showQA() {
    stopPanel.classList.add("hidden");
    summaryPanel.classList.add("hidden");
    phase3Panel.classList.add("hidden");
    qaPanel.classList.remove("hidden");
  }

  function showSummary() {
    stopPanel.classList.add("hidden");
    qaPanel.classList.add("hidden");
    phase3Panel.classList.add("hidden");
    summaryPanel.classList.remove("hidden");
    track("phase2_complete", { page: "loan" });
  }

  function showPhase3() {
    stopPanel.classList.add("hidden");
    qaPanel.classList.add("hidden");
    summaryPanel.classList.add("hidden");
    phase3Panel.classList.remove("hidden");
    track("phase3_open", { page: "loan" });
  }

  function getQuestionById(id) {
    return QUESTIONS.find((q) => q.id === id) || null;
  }

  function isVisibleQuestion(q, answers) {
    if (typeof q.showIf === "function") return !!q.showIf(answers);
    return true;
  }

  function currentQuestion() {
    let q = getQuestionById(state.currentId);
    // if current is hidden by condition, skip forward safely
    if (q && !isVisibleQuestion(q, state.answers)) {
      // move to next based on current answers
      const nid = q.next ? q.next(state.answers) : "END";
      state.currentId = nid;
      saveState(state);
      q = getQuestionById(state.currentId);
    }
    return q;
  }

  function setProgress(q) {
    // crude progress: based on position in QUESTIONS + stops
    const idx = QUESTIONS.findIndex((x) => x.id === (q ? q.id : "END"));
    const total = QUESTIONS.length;
    const pct = Math.max(0, Math.min(100, Math.round(((idx + 1) / total) * 100)));
    progressBar.style.width = pct + "%";

    // phase label
    const p = q ? q.phase : 2;
    phaseLabel.textContent = p === 1 ? "I faas" : "II faas";
    stepLabel.textContent = q ? `Samm ${idx + 1}` : "Valmis";
  }

  function renderQuestion(q) {
    qa.innerHTML = "";

    const wrap = document.createElement("div");
    wrap.className = "q";

    const title = document.createElement("p");
    title.className = "q-title";
    title.textContent = q.text;

    const help = document.createElement("p");
    help.className = "q-help";
    help.textContent = q.help || "";

    wrap.appendChild(title);
    wrap.appendChild(help);

    const opts = document.createElement("div");
    opts.className = "opts";

    const saved = state.answers[q.id];

    q.options.forEach((opt) => {
      const row = document.createElement("label");
      row.className = "opt";
      const input = document.createElement("input");
      input.type = q.multi ? "checkbox" : "radio";
      input.name = q.id;

      if (q.multi) {
        const arr = Array.isArray(saved) ? saved : [];
        input.checked = arr.includes(opt.v);
      } else {
        input.checked = saved === opt.v;
      }

      input.addEventListener("change", () => {
        if (q.multi) {
          let arr = Array.isArray(state.answers[q.id]) ? [...state.answers[q.id]] : [];
          if (input.checked) {
            if (!arr.includes(opt.v)) arr.push(opt.v);
            // if "none" selected, remove others
            if (opt.v === "none") arr = ["none"];
            else arr = arr.filter((x) => x !== "none");
          } else {
            arr = arr.filter((x) => x !== opt.v);
          }
          state.answers[q.id] = arr;
        } else {
          state.answers[q.id] = opt.v;
        }
        saveState(state);
      });

      const text = document.createElement("div");
      text.textContent = opt.t;

      row.appendChild(input);
      row.appendChild(text);
      opts.appendChild(row);
    });

    wrap.appendChild(opts);
    qa.appendChild(wrap);

    // UI toggles
    btnBack.disabled = state.history.length === 0;
  }

  function validateCurrent(q) {
    const v = state.answers[q.id];
    if (q.multi) return Array.isArray(v) && v.length > 0;
    return !!v;
  }

  function goNext() {
    const q = currentQuestion();
    if (!q) return;

    if (!validateCurrent(q)) {
      alert("Palun valige üks vastus.");
      return;
    }

    // record phase completion events at boundaries
    if (q.id === "Q4") track("phase1_checkpoint", { at: "Q4" });

    // history
    state.history.push(q.id);

    // compute next
    const nid = q.next ? q.next(state.answers) : "END";

    // handle STOP
    if (typeof nid === "string" && nid.startsWith("STOP_")) {
      saveState(state);
      showStop(nid);
      return;
    }

    // end
    if (nid === "END") {
      state.currentId = nid;
      saveState(state);
      // show summary (II faas kokkuvõte)
      showSummary();
      renderSummary();
      return;
    }

    state.currentId = nid;
    saveState(state);

    // phase transitions tracking
    const nextQ = getQuestionById(nid);
    if (nextQ && nextQ.phase === 2) track("phase2_start", { from: q.id });

    render();
  }

  function goBack() {
    if (!state.history.length) return;
    const prev = state.history.pop();
    state.currentId = prev;
    saveState(state);
    render();
  }

  function renderSummary() {
    const a = state.answers;
    const ql = qualitativeLevel(a);
    const risks = collectRisks(a);
    const top = pickTopRisk(risks);
    const strengths = computeStrengths(a);
    const tl = buildTimeline(a);

    // blocks
    summaryBlocks.innerHTML = "";

    const blocks = [
      { title: "Laenusuhe on", value: ql.qual, tone: ql.qual === "Tugev" ? "good" : (ql.qual === "Nõrk" ? "bad" : "warn") },
      { title: "Nõue on", value: ql.due, tone: ql.due === "Selge" ? "good" : (ql.due === "Puudub" ? "bad" : "warn") },
      { title: "Tagasimakse küsimus", value: ql.rep, tone: ql.rep === "Selge" ? "good" : "warn" },
      { title: "Kõige kriitilisem riskipunkt", value: top ? (RISK_TEXTS[top.id]?.title || top.id) : "Ei eristu", tone: top ? "warn" : "good" },
    ];

    blocks.forEach((b) => {
      const div = document.createElement("div");
      div.className = "block";
      const h = document.createElement("h3");
      h.textContent = b.title;
      const v = document.createElement("div");
      v.className = "kpi " + b.tone;
      v.textContent = b.value;
      div.appendChild(h);
      div.appendChild(v);
      summaryBlocks.appendChild(div);
    });

    // timeline
    timelineEl.innerHTML = "";
    tl.forEach((item) => {
      const row = document.createElement("div");
      row.className = "tl-item";
      const t = document.createElement("div");
      t.className = "tl-title";
      t.textContent = item.title;
      const s = document.createElement("div");
      s.className = "tl-sub";
      s.textContent = item.sub;
      row.appendChild(t);
      row.appendChild(s);
      timelineEl.appendChild(row);
    });

    // store computed for phase3
    state._computed = { risks, top, strengths, tl, ql };
    saveState(state);

    track("summary_view", {
      topRisk: top ? top.id : "none",
      qual: ql.qual,
      due: ql.due,
      rep: ql.rep,
    });
  }

  function renderPhase3() {
    const computed = state._computed || {};
    const top = computed.top || null;
    const strengths = computed.strengths || [];
    const tl = computed.tl || [];
    const ql = computed.ql || qualitativeLevel(state.answers);

    const riskId = top ? top.id : null;
    const txt = riskId ? RISK_TEXTS[riskId] : null;

    const container = document.createElement("div");
    container.className = "grid";

    // quick header line
    const head = document.createElement("div");
    head.className = "block";
    head.innerHTML = `
      <h3>Praeguse info põhjal</h3>
      <div class="muted small">
        Laenusuhe: <b>${escapeHtml(ql.qual)}</b><br/>
        Nõue: <b>${escapeHtml(ql.due)}</b><br/>
        Tagasimakse: <b>${escapeHtml(ql.rep)}</b>
      </div>
    `;
    container.appendChild(head);

    // top risk
    const risk = document.createElement("div");
    risk.className = "block";
    if (txt) {
      risk.innerHTML = `
        <h3>Kõige kriitilisem riskipunkt</h3>
        <div class="kpi warn">${escapeHtml(txt.title)}</div>
        <div class="muted small" style="margin-top:8px"><b>Miks see loeb:</b> ${escapeHtml(txt.why)}</div>
        <div class="muted small" style="margin-top:6px"><b>Näide:</b> ${escapeHtml(txt.example)}</div>
      `;
    } else {
      risk.innerHTML = `
        <h3>Kõige kriitilisem riskipunkt</h3>
        <div class="kpi good">Ei eristu</div>
      `;
    }
    container.appendChild(risk);

    // strengths
    const st = document.createElement("div");
    st.className = "block";
    st.innerHTML = `<h3>Mis on juba tugev</h3>`;
    if (strengths.length) {
      const ul = document.createElement("ul");
      ul.className = "muted small";
      strengths.forEach((s) => {
        const li = document.createElement("li");
        li.textContent = s;
        ul.appendChild(li);
      });
      st.appendChild(ul);
    } else {
      const p = document.createElement("div");
      p.className = "muted small";
      p.textContent =
        "Praegu ei eristu tugevaid kirjalikke ankrupunkte. See ei tähenda, et nõue puudub, kuid suurendab ebakindlust.";
      st.appendChild(p);
    }
    container.appendChild(st);

    // next steps + consequence
    const ns = document.createElement("div");
    ns.className = "block";
    ns.innerHTML = `<h3>Kolm mõistlikku järgmist sammu</h3>`;
    const steps = txt ? txt.steps : [
      "Koondage olemasolevad kirjalikud tõendid ühte kohta.",
      "Koostage ajajoon: raha liikumine, tähtajad, tagasinõudmine ja maksed.",
      "Hoidke edasine suhtlus neutraalne ja faktipõhine."
    ];
    const ul2 = document.createElement("ol");
    ul2.className = "muted small";
    steps.slice(0, 3).forEach((s) => {
      const li = document.createElement("li");
      li.textContent = s;
      ul2.appendChild(li);
    });
    ns.appendChild(ul2);

    const cons = document.createElement("div");
    cons.className = "muted small";
    cons.style.marginTop = "10px";
    cons.innerHTML = `<b>Kui see risk jääb lahendamata:</b> ${escapeHtml(txt ? txt.consequence : "Vaidlus võib liikuda detailidesse ja ebakindlus püsib.")}`;
    ns.appendChild(cons);

    container.appendChild(ns);

    // timeline snippet (collapsed feel)
    const tlb = document.createElement("div");
    tlb.className = "block";
    tlb.innerHTML = `<h3>Ajajoon</h3>`;
    const tlp = document.createElement("div");
    tlp.className = "muted small";
    tlp.textContent = "Kuva ajajoon II faasi kokkuvõttes, kui soovite vastuseid kontrollida sündmuste järjekorra järgi.";
    tlb.appendChild(tlp);
    container.appendChild(tlb);

    phase3Content.innerHTML = "";
    phase3Content.appendChild(container);

    // store last rendered summary text for copy
    state._phase3Text = buildCopyText(ql, riskId, txt, strengths);
    saveState(state);

    track("phase3_view", { topRisk: riskId || "none" });
  }

  function buildCopyText(ql, riskId, txt, strengths) {
    const lines = [];
    lines.push("Solvere Lab — Laen (III faas, kiiranalüüs)");
    lines.push("");
    lines.push(`Laenusuhe: ${ql.qual}`);
    lines.push(`Nõue: ${ql.due}`);
    lines.push(`Tagasimakse: ${ql.rep}`);
    lines.push("");
    if (txt) {
      lines.push("Kõige kriitilisem riskipunkt:");
      lines.push(`- ${txt.title}`);
      lines.push(`Miks see loeb: ${txt.why}`);
      lines.push(`Näide: ${txt.example}`);
      lines.push("");
      lines.push("Kolm mõistlikku järgmist sammu:");
      txt.steps.slice(0, 3).forEach((s, i) => lines.push(`${i + 1}. ${s}`));
      lines.push("");
      lines.push(`Kui see risk jääb lahendamata: ${txt.consequence}`);
    } else {
      lines.push("Kõige kriitilisem riskipunkt: ei eristu");
    }
    lines.push("");
    if (strengths.length) {
      lines.push("Mis on juba tugev:");
      strengths.forEach((s) => lines.push(`- ${s}`));
    }
    return lines.join("\n");
  }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function render() {
    // STOP persisted?
    if (state.stopped) {
      showStop(state.stopped);
      return;
    }

    const q = currentQuestion();

    // END state shows summary
    if (!q || state.currentId === "END") {
      showSummary();
      renderSummary();
      return;
    }

    showQA();
    setProgress(q);
    renderQuestion(q);

    // phase start tracking
    if (q.id === "Q1") track("phase1_start", { page: "loan" });
  }

  // -----------------------------
  // Events / buttons
  // -----------------------------
  btnNext.addEventListener("click", () => {
    const q = currentQuestion();
    if (!q) return;
    track("answer_next", { qid: q.id });
    goNext();
  });

  btnBack.addEventListener("click", () => {
    track("answer_back", { to: state.history[state.history.length - 1] || "none" });
    goBack();
  });

  [btnReset, btnReset2, btnReset3, btnReset4].forEach((b) => b.addEventListener("click", resetAll));

  btnShowSummaryAfterStop.addEventListener("click", () => {
    // allow summary view even if stopped (for curiosity)
    showSummary();
    renderSummary();
  });

  btnOpenPhase3.addEventListener("click", () => {
    showPhase3();
    renderPhase3();
  });

  btnBackToSummary.addEventListener("click", () => {
    summaryPanel.classList.remove("hidden");
    phase3Panel.classList.add("hidden");
    track("phase3_back_to_summary", {});
  });

  btnToggleTimeline.addEventListener("click", () => {
    const hidden = timelineEl.classList.contains("hidden");
    timelineEl.classList.toggle("hidden");
    btnToggleTimeline.textContent = hidden ? "Peida ajajoon" : "Kuva ajajoon";
    track("timeline_toggle", { open: hidden ? "yes" : "no" });
  });

  btnCopy.addEventListener("click", async () => {
    const text = state._phase3Text || "";
    try {
      await navigator.clipboard.writeText(text);
      alert("Kokkuvõte kopeeritud.");
      track("phase3_copy", { ok: "yes" });
    } catch (_) {
      // fallback
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
        alert("Kokkuvõte kopeeritud.");
        track("phase3_copy", { ok: "yes_fallback" });
      } catch (e) {
        alert("Kopeerimine ei õnnestunud.");
        track("phase3_copy", { ok: "no" });
      }
    }
  });

  btnInterest.addEventListener("click", () => {
    const top = state._computed?.top?.id || "none";
    track("phase3_interest_click", { topRisk: top });
    alert("Tänan! Huvi on märgitud.");
  });

  // -----------------------------
  // Initial render
  // -----------------------------
  render();
})();
