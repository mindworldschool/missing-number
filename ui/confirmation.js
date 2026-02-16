/**
 * Confirmation screen
 */

import { createScreenShell, createButton, createStepIndicator } from './helper.js';

export function renderConfirmation(container, { t, state, navigate }) {
  const { section, body, heading, paragraph } = createScreenShell({
    title: t('confirmation.title'),
    description: t('confirmation.description'),
    className: 'confirmation-screen'
  });

  const indicator = createStepIndicator('confirmation', t);
  section.insertBefore(indicator, section.firstChild);

  // Configuration list
  const config = document.createElement('dl');
  config.className = 'confirmation-list';

  const settings = state.settings;

  // Digits - исправляем [object Object]
  const digitsOptions = t('settings.digitsOptions');
  const digitOption = Array.isArray(digitsOptions)
    ? digitsOptions.find(opt => opt.value === settings.digits)
    : null;
  const digitsText = digitOption ? digitOption.label : settings.digits;
  addConfigItem(config, t('confirmation.list.digits'), digitsText);

  // Examples count
  const examplesText = settings.examples?.infinite
    ? t('confirmation.counter.infinity')
    : String(settings.examples?.count || 0);
  addConfigItem(config, t('confirmation.list.examples'), examplesText);

  // Operations для уравнений
  if (settings.operations) {
    const operations = Object.keys(settings.operations)
      .filter(op => settings.operations[op])
      .map(op => t(`settings.operations.${op}`))
      .join(', ');
    if (operations) {
      addConfigItem(config, t('settings.operationsLabel'), operations);
    }
  }

  // Unknown position
  if (settings.unknownPosition) {
    addConfigItem(
      config,
      t('settings.unknownPositionLabel'),
      t(`settings.unknownPosition.${settings.unknownPosition}`)
    );
  }

  // Actions count
  if (settings.actions) {
    const actionsText = settings.actions.infinite
      ? t('confirmation.counter.infinity')
      : String(settings.actions.count || 1);
    addConfigItem(config, t('settings.actions.label'), actionsText);
  }

  body.appendChild(config);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'form__actions';

  const backButton = createButton({
    label: t('buttons.back'),
    onClick: () => navigate('settings'),
    variant: 'secondary'
  });

  const startButton = createButton({
    label: t('buttons.start'),
    onClick: () => navigate('game'),
    variant: 'primary'
  });

  actions.append(backButton, startButton);
  body.appendChild(actions);

  container.appendChild(section);
}

function addConfigItem(container, label, value) {
  const dt = document.createElement('dt');
  dt.className = 'confirmation-list__label';
  dt.textContent = label;

  const dd = document.createElement('dd');
  dd.className = 'confirmation-list__value';
  dd.textContent = value;

  container.append(dt, dd);
}
