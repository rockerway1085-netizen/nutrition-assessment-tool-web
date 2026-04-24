const STORAGE_KEY = "pg-sga-nutrition-assessment-history-figma-design";

const sections = [
  {
    id: "weight",
    title: "过去 2 周内体重变化情况",
    shortTitle: "体重变化",
    type: "single",
    helper: "单选，体重下降≥5% 对总分影响最大。",
    options: [
      { label: "没有体重下降或增加", score: 0 },
      { label: "体重下降小于 5%", score: 1 },
      { label: "体重下降≥5%", score: 6 },
    ],
  },
  {
    id: "intake",
    title: "过去 2 周内饮食摄入变化情况",
    shortTitle: "饮食摄入",
    type: "single",
    helper: "按主要饮食形态选择，不叠加计分。",
    options: [
      { label: "正常饮食", score: 0 },
      { label: "稍减少但仍以普通食物为主", score: 1 },
      { label: "显著减少，主要吃软食/半流质", score: 2 },
      { label: "几乎只吃流食", score: 3 },
    ],
  },
  {
    id: "symptoms",
    title: "过去 2 周内是否存在以下症状",
    shortTitle: "症状影响",
    type: "multi",
    max: 5,
    helper: "请先查看以下症状；如果都没有，请选择最后一项。否则选择最重要的症状，最多 5 项。",
    options: [
      { label: "恶心", score: 1 },
      { label: "呕吐", score: 1 },
      { label: "腹泻", score: 1 },
      { label: "便秘", score: 1 },
      { label: "口干", score: 1 },
      { label: "口腔/咽喉疼痛", score: 1 },
      { label: "吞咽困难", score: 1 },
      { label: "味觉改变", score: 1 },
      { label: "早饱感（吃几口就觉得饱胀，不能继续进食）", score: 1 },
      { label: "胃胀/腹胀", score: 1 },
      { label: "疼痛", score: 1 },
      { label: "食欲极差", score: 1 },
      { label: "其它", score: 1, other: true },
      { label: "以上症状我都没有", score: 0, none: true },
    ],
  },
  {
    id: "activity",
    title: "当前活动能力",
    shortTitle: "活动能力",
    type: "single",
    helper: "选择最接近日常活动状态的一项。",
    options: [
      { label: "正常工作/日常活动", score: 0 },
      { label: "能自理但不能工作或做家务", score: 1 },
      { label: "白天卧床时间 >50%，需他人协助", score: 2 },
      { label: "完全卧床", score: 3 },
    ],
  },
];

const els = {
  app: document.querySelector(".figma-app"),
  form: document.querySelector("#questionnaire"),
  stage: document.querySelector("#assessmentStage"),
  date: document.querySelector("#assessmentDate"),
  person: document.querySelector("#personName"),
  score: document.querySelector("#scoreValue"),
  badge: document.querySelector("#riskBadge"),
  mobileCompletion: document.querySelector("#mobileCompletion"),
  desktopCompletion: document.querySelector("#desktopCompletion"),
  desktopSymptoms: document.querySelector("#desktopSymptoms"),
  completionHint: document.querySelector("#completionHint"),
  advice: document.querySelector("#riskAdvice"),
  ring: document.querySelector(".score-ring"),
  breakdown: document.querySelector("#scoreBreakdown"),
  reportText: document.querySelector("#reportText"),
  viewResult: document.querySelector("#viewResultBtn"),
  save: document.querySelector("#saveBtn"),
  edit: document.querySelector("#editBtn"),
  print: document.querySelector("#printBtn"),
  export: document.querySelector("#exportBtn"),
  reset: document.querySelector("#resetBtn"),
  historyText: document.querySelector("#historyText"),
};

let hasViewedResult = false;

function today() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function getRisk(score) {
  if (score >= 9) {
    return {
      key: "high",
      label: "高风险",
      preview: "高风险预览",
      advice: "您已存在重度营养不良风险，请尽快寻求专业营养支持治疗。",
    };
  }
  if (score >= 3) {
    return {
      key: "medium",
      label: "中风险",
      preview: "中风险预览",
      advice:
        "您存在轻度营养不良风险，请及时调整饮食量及结构，定期进行营养评估。如为慢病患者请及时与医生沟通是否需要给予营养治疗。",
    };
  }
  return {
    key: "low",
    label: "低风险",
    preview: "低风险预览",
    advice: "目前无明显营养不良风险，请保持均衡饮食习惯。",
  };
}

function optionId(sectionId, index) {
  return `${sectionId}-${index}`;
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveHistory(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function selectedInputs(section) {
  return [...document.querySelectorAll(`input[name="${section.id}"]:checked`)];
}

function calculate() {
  const scores = Object.fromEntries(sections.map((section) => [section.id, 0]));
  const selections = {};

  sections.forEach((section) => {
    if (section.type === "single") {
      const checked = selectedInputs(section)[0];
      if (checked) {
        scores[section.id] = Number(checked.value);
        selections[section.id] = checked.dataset.label;
      }
      return;
    }

    const checked = selectedInputs(section);
    const none = checked.find((input) => input.dataset.none === "true");
    const capped = none ? [none] : checked.slice(0, section.max);
    scores[section.id] = capped.reduce((sum, input) => sum + Number(input.value), 0);
    selections[section.id] = capped.map((input) => input.dataset.label);
  });

  const total = Object.values(scores).reduce((sum, value) => sum + value, 0);
  return { total, scores, selections, risk: getRisk(total) };
}

function completedSectionCount(scores) {
  return sections.filter((section) => {
    if (section.type === "multi") return selectedInputs(section).length > 0;
    return selectedInputs(section).length > 0;
  }).length;
}

function missingSectionNames(scores) {
  return sections
    .filter((section) => {
      if (section.type === "multi") return selectedInputs(section).length === 0;
      return selectedInputs(section).length === 0;
    })
    .map((section) => section.shortTitle);
}

function renderQuestions() {
  const template = document.querySelector("#questionTemplate");
  const fragment = document.createDocumentFragment();

  sections.forEach((section, sectionIndex) => {
    const card = template.content.firstElementChild.cloneNode(true);
    card.dataset.section = section.id;
    card.querySelector(".question-index").textContent = sectionIndex + 1;
    card.querySelector("h3").textContent = section.title;
    card.querySelector(".question-head p").textContent = section.helper;
    const symptomCount = card.querySelector(".symptom-count");
    symptomCount.id = `${section.id}-count`;
    symptomCount.textContent = section.type === "multi" ? "已选 0/5" : "";

    const options = card.querySelector(".options");
    section.options.forEach((option, index) => {
      const id = optionId(section.id, index);
      const label = document.createElement("label");
      label.className = "option";
      label.setAttribute("for", id);
      label.innerHTML = `
        <input
          id="${id}"
          type="${section.type === "multi" ? "checkbox" : "radio"}"
          name="${section.id}"
          value="${option.score}"
          data-label="${option.label}"
          data-none="${option.none ? "true" : "false"}"
        />
        <span>${option.label}</span>
        <strong class="score-pill">${option.score}分</strong>
      `;

      if (option.other) {
        const input = document.createElement("input");
        input.className = "other-input";
        input.type = "text";
        input.placeholder = "请注明";
        input.id = `${section.id}-other-text`;
        label.appendChild(input);
      }

      options.appendChild(label);
    });

    fragment.appendChild(card);
  });

  els.form.appendChild(fragment);
}

function syncSymptomLimit() {
  const section = sections.find((item) => item.id === "symptoms");
  const inputs = [...document.querySelectorAll('input[name="symptoms"]')];
  const checked = inputs.filter((input) => input.checked);
  const noneInput = inputs.find((input) => input.dataset.none === "true");
  const noneChecked = Boolean(noneInput && noneInput.checked);
  const symptomChecked = checked.filter((input) => input.dataset.none !== "true");
  const atLimit = symptomChecked.length >= section.max;

  inputs.forEach((input) => {
    if (input.dataset.none === "true") {
      input.disabled = symptomChecked.length > 0;
      return;
    }
    input.disabled = noneChecked || (atLimit && !input.checked);
  });

  const countText = noneChecked ? "无症状" : `已选 ${symptomChecked.length}/${section.max}`;
  document.querySelector("#symptoms-count").textContent = countText;
  return noneChecked ? 0 : symptomChecked.length;
}

function buildReport(result) {
  const name = els.person.value.trim() || "匿名患者";
  const date = els.date.value || today();
  const hasNoSymptoms =
    Array.isArray(result.selections.symptoms) && result.selections.symptoms.includes("以上症状我都没有");
  const symptoms = hasNoSymptoms
    ? "未选择影响进食的主要症状。"
    : Array.isArray(result.selections.symptoms) && result.selections.symptoms.length
    ? `主要症状：${result.selections.symptoms.join("、")}。`
    : "未选择主要症状。";
  return `${date} ${name}自评总分 ${result.total}/17，评估为${result.risk.label}。${symptoms}${result.risk.advice}`;
}

function updateResult() {
  const symptomCount = syncSymptomLimit();
  const result = calculate();
  const history = getHistory();
  const completed = completedSectionCount(result.scores);
  const missing = missingSectionNames(result.scores);

  document.body.classList.remove("risk-low", "risk-medium", "risk-high");
  document.body.classList.add(`risk-${result.risk.key}`);

  els.score.textContent = result.total;
  els.mobileCompletion.textContent = `${completed}/4`;
  els.desktopCompletion.textContent = `${completed}/4`;
  els.desktopSymptoms.textContent = `${symptomCount}/5`;
  els.badge.textContent = result.risk.label;
  els.advice.textContent = result.risk.advice;
  els.ring.style.setProperty("--progress", Math.round((result.total / 17) * 100));
  els.reportText.textContent = buildReport(result);
  els.historyText.textContent = `本机记录 ${history.length} 条 · 症状 ${symptomCount}/5`;
  els.completionHint.textContent = missing.length ? `还差：${missing.join("、")}` : "已完成，可以查看结果";
  els.viewResult.disabled = missing.length > 0;
  els.breakdown.innerHTML = sections
    .map(
      (section) => `
        <div class="breakdown-row">
          <span>${section.shortTitle}</span>
          <strong>${result.scores[section.id]}分</strong>
        </div>
      `,
    )
    .join("");
  return result;
}

function showResult() {
  const result = updateResult();
  const missing = missingSectionNames(result.scores);
  if (missing.length) return;
  hasViewedResult = true;
  els.app.classList.add("show-result");
  document.querySelector(".result-dock").scrollIntoView({ behavior: "smooth", block: "start" });
}

function showQuestionnaire() {
  hasViewedResult = false;
  els.app.classList.remove("show-result");
  document.querySelector(".flow-heading").scrollIntoView({ behavior: "smooth", block: "start" });
}

function saveCurrentResult() {
  const result = updateResult();
  const item = {
    date: els.date.value || today(),
    person: els.person.value.trim() || "匿名患者",
    score: result.total,
    risk: result.risk.label,
    selections: result.selections,
    report: buildReport(result),
    savedAt: new Date().toISOString(),
  };
  const history = [item, ...getHistory()].slice(0, 30);
  saveHistory(history);
  hasViewedResult = true;
  els.app.classList.add("show-result");
  updateResult();
}

function exportHistory() {
  const payload = {
    source: "营养自评量表.xlsx",
    designSource: "Figma file toW0pJXwoaEaku7TnLkp16",
    scoring: "体重 0/1/6；饮食 0/1/2/3；症状最多 5 项每项 1 分；活动 0/1/2/3；总分最高 17。",
    history: getHistory(),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `营养评估记录-${today()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function resetForm() {
  els.form.reset();
  els.person.value = "";
  els.date.value = today();
  document.querySelectorAll("input:disabled").forEach((input) => {
    input.disabled = false;
  });
  hasViewedResult = false;
  els.app.classList.remove("show-result");
  updateResult();
}

function bindEvents() {
  els.form.addEventListener("change", () => {
    if (hasViewedResult) showQuestionnaire();
    updateResult();
  });
  els.form.addEventListener("input", updateResult);
  els.person.addEventListener("input", updateResult);
  els.date.addEventListener("change", updateResult);
  els.viewResult.addEventListener("click", showResult);
  els.save.addEventListener("click", saveCurrentResult);
  els.edit.addEventListener("click", showQuestionnaire);
  els.print.addEventListener("click", () => window.print());
  els.export.addEventListener("click", exportHistory);
  els.reset.addEventListener("click", resetForm);
}

renderQuestions();
els.date.value = today();
bindEvents();
updateResult();
