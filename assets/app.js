(() => {
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // Safe Plausible wrapper
  function track(eventName, props = {}) {
    try {
      if (typeof window.plausible === "function") {
        window.plausible(eventName, { props });
      }
    } catch (_) {}
  }

  function closeAllHelp(exceptId = null) {
    $$(".help").forEach(panel => {
      if (exceptId && panel.id === exceptId) return;
      if (!panel.hidden) {
        panel.hidden = true;
      }
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

    // accordion behavior: only one open
    closeAllHelp();

    if (!isOpen) {
      panel.hidden = false;
      button.setAttribute("aria-expanded", "true");
      track("Help Opened", {
        qid: button.closest(".q")?.dataset.qid || "",
        helpId: targetId
      });
    } else {
      // If it was open, it is already closed by closeAllHelp()
      track("Help Closed", {
        qid: button.closest(".q")?.dataset.qid || "",
        helpId: targetId
      });
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

  function evalRuleExact(rule) {
    // "q1:third"
    const [qName, expected] = rule.split(":");
    const actual = getRadioValue(qName);
    return actual === expected;
  }

  function evalRuleAny(ruleAny) {
    // "q5:date|q5:period"
    const parts = ruleAny.split("|").map(s => s.trim()).filter(Boolean);
    return parts.some(evalRuleExact);
  }

  function updateConditionalQuestions() {
    const dependentBlocks = $$(".q[data-show-when], .q[data-show-when-any]");

    dependentBlocks.forEach(block => {
      const prevHidden = block.classList.contains("is-hidden");
      let show = true;

      if (block.dataset.showWhen) show = evalRuleExact(block.dataset.showWhen);
      if (block.dataset.showWhenAny) show = evalRuleAny(block.dataset.showWhenAny);

      block.classList.toggle("is-hidden", !show);

      const nowHidden = block.classList.contains("is-hidden");

      // Track show/hide transitions
      if (prevHidden && !nowHidden) {
        track("Question Shown", { qid: block.dataset.qid || "" });
      }
      if (!prevHidden && nowHidden) {
        track("Question Hidden", { qid: block.dataset.qid || "" });
      }

      // If hidden: close its help and clear radios inside (keeps state clean)
      if (nowHidden) {
        const help = $(".help", block);
        if (help) help.hidden = true;
        const helpBtn = $(".helpbtn", block);
        if (helpBtn) helpBtn.setAttribute("aria-expanded", "false");

        $$('input[type="radio"]', block).forEach(r => {
          if (r.checked) {
            r.checked = false;
          }
        });
      }
    });
  }

  function wireConditionalsAndAnswers() {
    document.addEventListener("change", (e) => {
      const t = e.target;
      if (!t || !t.matches('input[type="radio"]')) return;

      const qBlock = t.closest(".q");
      const qid = qBlock?.dataset.qid || "";
      const name = t.getAttribute("name") || "";
      const value = t.value || "";

      track("Answer Selected", { qid, name, value });

      // Update dependent visibility after any selection
      updateConditionalQuestions();
    });

    // initial state
    updateConditionalQuestions();
  }

  // init
  wireHelp();
  wireConditionalsAndAnswers();

  // Optional: track pageview context (Plausible already tracks pageviews automatically)
  track("Questionnaire Loaded", {
    path: location.pathname || "",
    lang: document.documentElement.lang || ""
  });
})();
