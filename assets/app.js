(() => {
  const state = {
    lang: "et",
  };

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function setLang(lang) {
    state.lang = lang;
    $$(".langbtn").forEach(btn => btn.classList.toggle("is-active", btn.dataset.lang === lang));
    $$("[data-lang]").forEach(el => {
      const isMatch = el.dataset.lang === lang;
      // Only toggle elements that are language variants inside help blocks or content.
      // If you later add non-language data-lang attributes, scope this selector.
      if (el.classList.contains("help-et") || el.classList.contains("help-ru") || el.closest(".help")) {
        el.hidden = !isMatch;
      }
    });
  }

  function closeAllHelp(exceptId = null) {
    $$(".help").forEach(panel => {
      if (exceptId && panel.id === exceptId) return;
      panel.hidden = true;
    });
    $$(".helpbtn").forEach(btn => {
      const targetId = btn.dataset.helpTarget;
      if (exceptId && targetId === exceptId) return;
      btn.setAttribute("aria-expanded", "false");
    });
  }

  function toggleHelp(button) {
    const targetId = button.dataset.helpTarget;
    const panel = document.getElementById(targetId);
    if (!panel) return;

    const isOpen = !panel.hidden;
    closeAllHelp(); // accordion behavior: one open at a time

    if (!isOpen) {
      // open
      panel.hidden = false;
      button.setAttribute("aria-expanded", "true");

      // ensure language variant visible
      const et = $(`.help-et[data-lang="et"]`, panel);
      const ru = $(`.help-ru[data-lang="ru"]`, panel);
      if (et) et.hidden = state.lang !== "et";
      if (ru) ru.hidden = state.lang !== "ru";
    }
  }

  function wireHelp() {
    $$(".helpbtn").forEach(btn => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleHelp(btn);
      });
    });

    // Close on outside click
    document.addEventListener("click", (e) => {
      // if click is inside an open help panel or on a help button, ignore (help button stops propagation anyway)
      const inHelp = e.target.closest(".help");
      if (!inHelp) closeAllHelp();
    });

    // Close on ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAllHelp();
    });
  }

  function getRadioValue(name) {
    const checked = document.querySelector(`input[name="${name}"]:checked`);
    return checked ? checked.value : null;
  }

  function evalVisibilityRule(rule) {
    // rule format: "q1:third"
    const [qName, expected] = rule.split(":");
    const actual = getRadioValue(qName);
    return actual === expected;
  }

  function updateConditionalQuestions() {
    $$(".q[data-show-when]").forEach(block => {
      const rule = block.dataset.showWhen;
      const show = evalVisibilityRule(rule);
      block.classList.toggle("is-hidden", !show);

      // if hidden, also close help inside and clear answers inside (optional: here we clear)
      if (!show) {
        // close help panel if open
        const help = $(".help", block);
        if (help) help.hidden = true;
        const helpBtn = $(".helpbtn", block);
        if (helpBtn) helpBtn.setAttribute("aria-expanded", "false");

        // clear radios inside hidden block
        $$('input[type="radio"]', block).forEach(r => (r.checked = false));
      }
    });
  }

  function wireConditionals() {
    // listen to any radio change to update rules
    document.addEventListener("change", (e) => {
      const t = e.target;
      if (t && t.matches('input[type="radio"]')) {
        updateConditionalQuestions();
      }
    });

    // initial state
    updateConditionalQuestions();
  }

  function wireLangSwitch() {
    const etBtn = $('.langbtn[data-lang="et"]');
    const ruBtn = $('.langbtn[data-lang="ru"]');
    if (etBtn) etBtn.addEventListener("click", () => setLang("et"));
    if (ruBtn) ruBtn.addEventListener("click", () => setLang("ru"));
    setLang("et");
  }

  // init
  wireHelp();
  wireConditionals();
  wireLangSwitch();
})();
