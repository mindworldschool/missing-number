import { createScreenShell, createButton, createStepIndicator } from "./helper.js";
import { state } from "../core/state.js";

function createFormRow(labelText) {
  const row = document.createElement("div");
  row.className = "settings-grid__row";

  const label = document.createElement("span");
  label.className = "settings-grid__label";
  label.textContent = labelText;

  const control = document.createElement("div");
  control.className = "settings-grid__control";

  row.append(label, control);

  return { row, control, label };
}

function createSelect(options, value, onChange) {
  const select = document.createElement("select");

  const currentValue = value || "none";

  options.forEach((option) => {
    const opt = document.createElement("option");
    opt.value = option.value;
    opt.textContent = option.label;
    if (option.value === currentValue) opt.selected = true;
    select.appendChild(opt);
  });

  if (![...select.options].some(o => o.selected)) {
    select.value = "none";
  }

  select.addEventListener("change", () => onChange(select.value));
  return select;
}

function createCheckbox(labelText, checked, onChange, className = "settings-checkbox") {
  const label = document.createElement("label");
  label.className = className;

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => {
    onChange(input.checked);
    label.classList.toggle("is-active", input.checked);
  });

  const text = document.createElement("span");
  text.textContent = labelText;

  label.append(input, text);
  label.classList.toggle("is-active", checked);
  return label;
}

function createCounter({ count, infinite, infinityLabel, onUpdate }) {
  let finiteValue = count || 1;

  const wrapper = document.createElement("div");
  wrapper.className = "counter";

  const minus = document.createElement("button");
  minus.type = "button";
  minus.className = "counter__btn";
  minus.textContent = "−";

  const input = document.createElement("input");
  input.type = "number";
  input.className = "counter__input";
  input.min = "1";
  input.value = String(count ?? finiteValue);
  input.disabled = infinite;
  if (infinite) {
    input.value = "";
    input.placeholder = infinityLabel;
  }

  const plus = document.createElement("button");
  plus.type = "button";
  plus.className = "counter__btn";
  plus.textContent = "+";

  const infinityWrap = document.createElement("label");
  infinityWrap.className = "counter__infinity";
  const infinityInput = document.createElement("input");
  infinityInput.type = "checkbox";
  infinityInput.checked = infinite;
  const infinityText = document.createElement("span");
  infinityText.textContent = infinityLabel;
  infinityWrap.append(infinityInput, infinityText);

  function emit(countValue, infiniteValue) {
    const nextCount = Math.max(1, Number.isNaN(Number(countValue)) ? 1 : Number(countValue));
    if (!infiniteValue) finiteValue = nextCount;
    onUpdate({ count: nextCount, infinite: infiniteValue });
  }

  minus.addEventListener("click", () => {
    if (infinityInput.checked) return;
    const next = Math.max(1, (parseInt(input.value, 10) || finiteValue) - 1);
    input.value = String(next);
    emit(next, false);
  });

  plus.addEventListener("click", () => {
    if (infinityInput.checked) return;
    const next = (parseInt(input.value, 10) || finiteValue) + 1;
    input.value = String(next);
    emit(next, false);
  });

  input.addEventListener("change", () => {
    const value = Math.max(1, parseInt(input.value, 10) || finiteValue);
    input.value = String(value);
    emit(value, false);
  });

  infinityInput.addEventListener("change", () => {
    const isInfinite = infinityInput.checked;
    input.disabled = isInfinite;
    if (isInfinite) {
      input.value = "";
      input.placeholder = infinityLabel;
    } else {
      input.value = String(finiteValue);
      input.placeholder = "";
    }
    emit(finiteValue, isInfinite);
  });

  wrapper.append(minus, input, plus, infinityWrap);
  return wrapper;
}

function createSection(title) {
  const section = document.createElement("section");
  section.className = "settings-section";

  const heading = document.createElement("h3");
  heading.className = "settings-section__title";
  heading.textContent = title;

  section.appendChild(heading);
  return section;
}

export function renderSettings(container, { t, state, updateSettings, navigate }) {
  const { section, body, heading, paragraph } = createScreenShell({
    title: t("settings.title"),
    description: t("settings.description"),
    className: "settings-screen"
  });

  const indicator = createStepIndicator("settings", t);
  section.insertBefore(indicator, section.firstChild);

  heading.textContent = t("settings.title");
  paragraph.textContent = t("settings.description");

  const settingsState = state.settings || {
    digits: "1",
    combineLevels: false,
    actions: { count: 2, infinite: false },
    examples: { count: 10, infinite: false },
    toggles: {},
    operations: { addition: true, subtraction: true, multiplication: false, division: false },
    actionsCount: 2,
    unknownPosition: 'random'
  };

  const form = document.createElement("form");
  form.className = "form settings-form";

  const baseGrid = document.createElement("div");
  baseGrid.className = "settings-grid";

  const digitsRow = createFormRow(t("settings.digitsLabel"));
  digitsRow.control.appendChild(
    createSelect(t("settings.digitsOptions"), settingsState.digits, (value) => {
      updateSettings({ digits: value });
    })
  );
  baseGrid.appendChild(digitsRow.row);

  const combineRow = createFormRow(t("settings.combineLabel"));
  combineRow.control.appendChild(
    createCheckbox("", settingsState.combineLevels, (checked) => {
      updateSettings({ combineLevels: checked });
    }, "settings-checkbox settings-checkbox--switch")
  );
  baseGrid.appendChild(combineRow.row);

  const actionsRow = createFormRow(t("settings.actions.label"));
  actionsRow.control.appendChild(
    createCounter({
      count: settingsState.actions.count,
      infinite: settingsState.actions.infinite,
      infinityLabel: t("settings.actions.infinityLabel"),
      onUpdate: ({ count, infinite }) => {
        const current = state.settings.actions;
        updateSettings({ actions: { ...current, count, infinite } });
      }
    })
  );
  baseGrid.appendChild(actionsRow.row);

  const examplesRow = createFormRow(t("settings.examples.label"));
  examplesRow.control.appendChild(
    createCounter({
      count: settingsState.examples.count,
      infinite: settingsState.examples.infinite,
      infinityLabel: t("settings.examples.infinityLabel"),
      onUpdate: ({ count, infinite }) => {
        const current = state.settings.examples;
        updateSettings({ examples: { ...current, count, infinite } });
      }
    })
  );
  baseGrid.appendChild(examplesRow.row);

  form.appendChild(baseGrid);

  // Расширенные параметры
  const advancedSection = createSection(t("settings.advancedLabel"));
  const toggleList = document.createElement("div");
  toggleList.className = "toggle-list";

  const toggleTranslations = t("settings.toggles");
  const exclusiveToggleEls = {}; // holds label elements for 'positive' and 'negative'

  Object.entries(toggleTranslations).forEach(([key, label]) => {
    let decimalsRow = null;

    const toggle = createCheckbox(label, Boolean(settingsState.toggles[key]), (checked) => {
      updateSettings({
        toggles: { ...state.settings.toggles, [key]: checked }
      });
      if (key === 'fractions' && decimalsRow) {
        decimalsRow.style.display = checked ? 'flex' : 'none';
      }
      // Mutual exclusion: positive ↔ negative
      if (key === 'positive' || key === 'negative') {
        const otherKey = key === 'positive' ? 'negative' : 'positive';
        const otherEl = exclusiveToggleEls[otherKey];
        if (otherEl) {
          const otherInput = otherEl.querySelector('input[type="checkbox"]');
          if (checked) {
            otherInput.disabled = true;
            otherEl.classList.add('is-disabled');
          } else {
            otherInput.disabled = false;
            otherEl.classList.remove('is-disabled');
          }
        }
      }
    }, "toggle-pill");

    if (key === 'positive' || key === 'negative') {
      exclusiveToggleEls[key] = toggle;
    }

    toggleList.appendChild(toggle);

    if (key === 'fractions') {
      decimalsRow = document.createElement('div');
      decimalsRow.style.cssText = 'display:' + (settingsState.toggles.fractions ? 'flex' : 'none') + '; align-items:center; gap:10px; padding:6px 0 6px 4px;';

      const decimalsLabel = document.createElement('span');
      decimalsLabel.textContent = t('settings.fractionDecimalsLabel');
      decimalsLabel.style.cssText = 'font-size:14px; color:#7d733a; white-space:nowrap;';
      decimalsRow.appendChild(decimalsLabel);

      [1, 2].forEach(n => {
        const btn = document.createElement('label');
        btn.className = 'toggle-pill' + (((settingsState.fractionDecimals || 1) === n) ? ' is-active' : '');
        btn.style.cssText = 'font-size:14px; padding:4px 14px; cursor:pointer;';

        const radio = document.createElement('input');
        radio.type = 'radio';
        radio.name = 'fractionDecimals';
        radio.value = String(n);
        radio.checked = (settingsState.fractionDecimals || 1) === n;
        radio.style.display = 'none';

        radio.addEventListener('change', () => {
          updateSettings({ fractionDecimals: n });
          decimalsRow.querySelectorAll('label').forEach(l => l.classList.remove('is-active'));
          btn.classList.add('is-active');
        });

        const text = document.createElement('span');
        text.textContent = String(n);

        btn.append(radio, text);
        decimalsRow.appendChild(btn);
      });

      toggleList.appendChild(decimalsRow);
    }
  });
  advancedSection.appendChild(toggleList);

  // Initial mutual-exclusion state on page render
  if (settingsState.toggles.positive && exclusiveToggleEls.negative) {
    const el = exclusiveToggleEls.negative;
    el.querySelector('input[type="checkbox"]').disabled = true;
    el.classList.add('is-disabled');
  }
  if (settingsState.toggles.negative && exclusiveToggleEls.positive) {
    const el = exclusiveToggleEls.positive;
    el.querySelector('input[type="checkbox"]').disabled = true;
    el.classList.add('is-disabled');
  }

  form.appendChild(advancedSection);

  // Секция "Операции" для уравнений
  const operationsSection = createSection(t("settings.operationsLabel"));
  const operationsList = document.createElement("div");
  operationsList.className = "toggle-list";

  ['addition', 'subtraction', 'multiplication', 'division'].forEach(op => {
    const toggle = createCheckbox(
      t(`settings.operations.${op}`),
      settingsState.operations?.[op] ?? false,
      (checked) => {
        updateSettings({
          operations: { ...state.settings.operations, [op]: checked }
        });
      },
      "toggle-pill"
    );
    operationsList.appendChild(toggle);
  });

  operationsSection.appendChild(operationsList);
  form.appendChild(operationsSection);

  // Секция "Позиция неизвестного" для уравнений
  const unknownPositionSection = createSection(t("settings.unknownPositionLabel"));
  const positionList = document.createElement("div");
  positionList.className = "toggle-list";

  ['first', 'second', 'random'].forEach(pos => {
    const isSelected = (settingsState.unknownPosition || 'random') === pos;
    const toggle = createCheckbox(
      t(`settings.unknownPosition.${pos}`),
      isSelected,
      (checked) => {
        if (checked) {
          updateSettings({ unknownPosition: pos });
          // Обновляем UI: снимаем выделение с других опций
          positionList.querySelectorAll('input[type="checkbox"]').forEach((input, idx) => {
            if (idx !== ['first', 'second', 'random'].indexOf(pos)) {
              input.checked = false;
              input.closest('label')?.classList.remove('is-active');
            }
          });
        }
      },
      "toggle-pill"
    );
    positionList.appendChild(toggle);
  });

  unknownPositionSection.appendChild(positionList);
  form.appendChild(unknownPositionSection);

  // Секция "Лимит времени на пример"
  const timeLimitSection = createSection(t("settings.timeLimitLabel"));
  const timeLimitOptions = t("settings.timeLimitOptions");
  timeLimitSection.appendChild(
    createSelect(
      Array.isArray(timeLimitOptions) ? timeLimitOptions : [],
      settingsState.timeLimit || 'none',
      (value) => {
        updateSettings({ timeLimit: value });
      }
    )
  );
  form.appendChild(timeLimitSection);

  const actions = document.createElement("div");
  actions.className = "form__actions";
  const submitButton = createButton({
    label: t("settings.submit"),
    onClick: () => form.requestSubmit()
  });
  actions.appendChild(submitButton);

  form.appendChild(actions);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    navigate("confirmation");
  });

  body.appendChild(form);
  container.appendChild(section);
}
