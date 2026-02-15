/**
 * Results screen
 */

import { createScreenShell, createButton, createStepIndicator } from './helper.js';

export function renderResults(container, { t, state, navigate }) {
  const { section, body } = createScreenShell({
    title: t('results.title'),
    description: t('results.description'),
    className: 'results-screen'
  });

  const indicator = createStepIndicator('results', t);
  section.insertBefore(indicator, section.firstChild);

  const results = state.results || { success: 0, total: 0, wrongExamples: [] };

  // Stats
  const stats = document.createElement('div');
  stats.className = 'results-stats';

  const successRate = results.total > 0
    ? Math.round((results.success / results.total) * 100)
    : 0;

  stats.innerHTML = `
    <div class="results-stat results-stat--success">
      <div class="results-stat__value">${results.success}</div>
      <div class="results-stat__label">${t('results.success')}</div>
    </div>
    <div class="results-stat results-stat--total">
      <div class="results-stat__value">${successRate}%</div>
      <div class="results-stat__label">Accuracy</div>
    </div>
    <div class="results-stat results-stat--errors">
      <div class="results-stat__value">${results.total - results.success}</div>
      <div class="results-stat__label">${t('results.mistakes')}</div>
    </div>
  `;

  body.appendChild(stats);

  // Actions
  const actions = document.createElement('div');
  actions.className = 'form__actions';

  const newButton = createButton({
    label: t('results.cta'),
    onClick: () => navigate('settings'),
    variant: 'primary'
  });

  actions.appendChild(newButton);

  // Retry button if there are errors
  if (results.wrongExamples && results.wrongExamples.length > 0) {
    const retryButton = createButton({
      label: t('results.retryErrors'),
      onClick: () => {
        state.retryMode = {
          enabled: true,
          examples: results.wrongExamples
        };
        navigate('game');
      },
      variant: 'secondary'
    });
    actions.appendChild(retryButton);
  }

  body.appendChild(actions);
  container.appendChild(section);
}
