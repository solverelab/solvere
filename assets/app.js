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
      if (!panel.hidden) panel.hidden = true;
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

    // accordion behavior
    closeAllHelp();

    if (!isOpen) {
      panel.hidden = false;
      button.setAttribute("aria-expanded", "true");
      track("Help Opened", {
        qid: button.closest(".q")?.dataset.qid || "",
        helpId: targetId
      });
    } else {
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

      if (prevHidden && !nowHidden) {
        track("Question Shown", { qid: block.dataset.qid || "" });
      }
      if (!prevHidden && nowHidden) {
        track("Question Hidden", { qid: block.dataset.qid || "" });
      }

      // If hidden: close help + clear radios inside
      if (nowHidden) {
        const help = $(".help", block);
        if (help) help.hidden = true;
        const helpBtn = $(".helpbtn", block);
        if (helpBtn) helpBtn.setAttribute("aria-expanded", "false");

        $$('input[type="radio"]', block).forEach(r => {
          if (r.checked) r.checked = false;
        });
      }
    });
  }

  // --- STOP LOGIC ----------------------------------------------------------

  function getStopMessages() {
    const lang = (document.documentElement.lang || "").toLowerCase();
    const isRU = lang.startsWith("ru");

    if (isRU) {
      return {
        A: "По описанию это больше похоже на ситуацию без понимания «вернуть». В таком случае спор обычно смещается к тому, как стороны понимали оплату: помощь, общий расход, подарок или иная договорённость.",
        B: "По ответам содержание договорённости о возврате описывается неясно и не прослеживается в сообщениях/документах. В таких ситуациях спор часто концентрируется на том, была ли договорённость о возврате и как именно её понимать.",
        C: "По ответам согласованный срок возврата ещё не прошёл. В этом случае обсуждение обычно касается условий и понимания сторон, а не факта «просрочки».",
        D: "По ответам при отсутствии/неясности срока не видно, что тема возврата была отдельно и однозначно обозначена. Тогда спор часто концентрируется на том, как и когда стороны начали обсуждать возврат.",
        E: "По ответам основная сумма возвращена полностью. Если разногласия остаются, они обычно касаются деталей: что именно считалось возвратом, были ли дополнительные суммы и как стороны это понимали."
      };
    }

    // ET
    return {
      A: "Vastuste põhjal kirjeldub olukord pigem sellisena, kus tagastamise arusaam ei olnud osa kokkuleppest. Sellisel juhul liigub vaidluse fookus sageli sellele, kuidas pooled makset mõistsid: abi, ühine kulu, kink või muu kokkulepe.",
      B: "Vastuste põhjal on tagastamise kokkuleppe sisu ebaselge ja see ei ole sõnumitest/dokumendist jälgitav. Sellistes olukordades koondub vaidlus sageli sellele, kas tagastamiskokkulepe oli ja kuidas seda mõista.",
      C: "Vastuste põhjal ei ole kokkulepitud tagasimakse aeg veel möödas. Sel juhul on arutelu fookus tavaliselt pigem kokkuleppe sisul ja poolte arusaamadel, mitte “hilinemisel”.",
      D: "Vastuste põhjal ei ole tähtaja puudumisel/ebaselgusel näha, et tagasimakse teema oleks olnud eraldi ja üheselt sõnastatud. Sellisel juhul koondub vaidlus sageli sellele, kuidas ja millal tagasimakse teema poolte vahel tekkis.",
      E: "Vastuste põhjal on põhisumma tagasi makstud. Kui erimeelsus siiski püsib, puudutab see sageli detaile: mida loeti tagasimakseks, kas arutati lisasummasid ja kuidas pooled seda mõistsid."
    };
  }

  function computeStop() {
    const q1 = getRadioValue("q1");
    const q2 = getRadioValue("q2");
    const q3 = getRadioValue("q3");
    const q4 = getRadioValue("q4");
    const q5 = getRadioValue("q5");
    const q6 = getRadioValue("q6");
    const q6a = getRadioValue("q6a");
    const q7 = getRadioValue("q7");

    // Priority order (first match wins)
    // A) paid third party + no return understanding
    if (q1 === "third" && q2 === "no") return "A";

    // B) return agreement unsure + only oral or missing trace
    if (q3 === "unsure" && (q4 === "oral" || q4 === "missing")) return "B";

    // C) fixed date/period + deadline not passed
    if ((q5 === "date" || q5 === "period") && q6 === "no") return "C";

    // D) no/unclear deadline + return request not clearly stated
    if ((q5 === "none" || q5 === "unsure") && q6a === "no") return "D";

    // E) fully repaid
    if (q7 === "full") return "E";

    return null;
  }

  let lastStopKey = null;

  function updateStopUI() {
    const stopCard = $("#stopcard");
    const stopText = $("#stopText");
    if (!stopCard || !stopText) return;

    const messages = getStopMessages();
    const key = computeStop();

    if (!key) {
      // hide
      if (!stopCard.classList.contains("is-hidden")) {
        stopCard.classList.add("is-hidden");
        stopText.textContent = "";
        if (lastStopKey) track("Stop Cleared", { stopKey: lastStopKey });
      }
      lastStopKey = null;
      return;
    }

    // show / update
    stopText.textContent = messages[key] || "";
    stopCard.classList.remove("is-hidden");

    if (key !== lastStopKey) {
      track("Stop Shown", { stopKey: key });
      lastStopKey = key;
    }
  }

  // --- ANSWERS + CONDITIONALS ---------------------------------------------

  function wireConditionalsAndAnswers() {
    document.addEventListener("change", (e) => {
      const t = e.target;
      if (!t || !t.matches('input[type="radio"]')) return;

      const qBlock = t.closest(".q");
      const qid = qBlock?.dataset.qid || "";
      const name = t.getAttribute("name") || "";
      const value = t.value || "";

      track("Answer Selected", { qid, name, value });

      updateConditionalQuestions();
      updateStopUI();
    });

    updateConditionalQuestions();
    updateStopUI();
  }

  // init
  wireHelp();
  wireConditionalsAndAnswers();

  // Page context event (Plausible already does pageviews automatically)
  track("Questionnaire Loaded", {
    path: location.pathname || "",
    lang: document.documentElement.lang || ""
  });
})();
