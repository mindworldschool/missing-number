/**
 * UI helper functions
 */

export function createScreenShell({ title, description, className }) {
  const section = document.createElement('section');
  section.className = `screen ${className || ''}`;

  const header = document.createElement('div');
  header.className = 'screen__header';

  const heading = document.createElement('h2');
  heading.className = 'screen__title';
  heading.textContent = title;

  const paragraph = document.createElement('p');
  paragraph.className = 'screen__description';
  paragraph.textContent = description;

  header.append(heading, paragraph);

  const body = document.createElement('div');
  body.className = 'screen__body';

  section.append(header, body);

  return { section, header, heading, paragraph, body };
}

export function createButton({ label, onClick, className = '', type = 'button', variant = 'primary' }) {
  const button = document.createElement('button');
  button.type = type;
  button.className = `btn btn--${variant} ${className}`;
  button.textContent = label;

  if (onClick) {
    button.addEventListener('click', onClick);
  }

  return button;
}

export function createStepIndicator(currentStep, t) {
  const steps = ['settings', 'confirmation', 'game', 'results'];
  const nav = document.createElement('nav');
  nav.className = 'step-indicator';
  nav.setAttribute('aria-label', 'Progress');

  const list = document.createElement('ol');
  list.className = 'step-indicator__list';

  steps.forEach((step, index) => {
    const item = document.createElement('li');
    item.className = 'step-indicator__item';

    if (step === currentStep) {
      item.classList.add('step-indicator__item--active');
    } else if (steps.indexOf(currentStep) > index) {
      item.classList.add('step-indicator__item--completed');
    }

    const span = document.createElement('span');
    span.className = 'step-indicator__label';
    span.textContent = t(`header.steps.${step}`);

    item.appendChild(span);
    list.appendChild(item);
  });

  nav.appendChild(list);
  return nav;
}
