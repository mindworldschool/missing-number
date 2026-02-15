/**
 * Modern state management with reactivity
 */

import { storage } from './utils/storage.js';
import { DEFAULTS } from './utils/constants.js';

// Internal state
let currentState = {
  route: DEFAULTS.ROUTE,
  language: DEFAULTS.LANGUAGE,
  settings: {
    digits: "1",
    combineLevels: false,
    actions: { count: 1, infinite: false },
    examples: { count: 2, infinite: false },
    toggles: {
      fractions: false,
      round: false,
      positive: false,
      negative: false
    },
    operations: {
      addition: true,
      subtraction: true,
      multiplication: false,
      division: false
    },
    actionsCount: 2,
    unknownPosition: 'random'
  },
  results: {
    success: 0,
    total: 0,
    wrongExamples: []
  },
  retryMode: {
    enabled: false,
    examples: []
  },
  lastSettings: null
};

// Subscribers
const subscribers = {
  state: new Set(),
  route: new Set(),
  settings: new Set()
};

/**
 * Get current state
 */
export function getState() {
  return currentState;
}

/**
 * Set state
 * @param {Object} partial - partial state to merge
 * @param {boolean} persist - whether to persist to storage
 */
export function setState(partial, persist = false) {
  const prevState = { ...currentState };
  currentState = { ...currentState, ...partial };

  // Persist if needed
  if (persist) {
    if (partial.settings) {
      storage.saveSettings(partial.settings);
    }
    if (partial.language) {
      storage.saveLanguage(partial.language);
    }
    if (partial.results) {
      storage.saveResults(partial.results);
    }
  }

  // Notify subscribers
  notifySubscribers(prevState, currentState);
}

/**
 * Set route
 */
export function setRoute(route) {
  const prevRoute = currentState.route;
  currentState.route = route;

  if (prevRoute !== route) {
    subscribers.route.forEach(callback => callback(route, prevRoute));
  }
}

/**
 * Set language preference
 */
export function setLanguagePreference(language) {
  setState({ language }, true);
}

/**
 * Update settings
 */
export function updateSettings(partial) {
  const newSettings = {
    ...currentState.settings,
    ...partial
  };
  setState({ settings: newSettings }, true);

  subscribers.settings.forEach(callback => callback(newSettings, partial));
}

/**
 * Set results
 */
export function setResults(results) {
  setState({ results }, true);
}

/**
 * Reset results
 */
export function resetResults() {
  const emptyResults = {
    success: 0,
    total: 0,
    wrongExamples: []
  };
  setState({ results: emptyResults }, true);
}

/**
 * Subscribe to state changes
 */
export function subscribeToState(callback) {
  subscribers.state.add(callback);
  return () => subscribers.state.delete(callback);
}

/**
 * Subscribe to route changes
 */
export function subscribeToRoute(callback) {
  subscribers.route.add(callback);
  return () => subscribers.route.delete(callback);
}

/**
 * Subscribe to settings changes
 */
export function subscribeToSettings(callback) {
  subscribers.settings.add(callback);
  return () => subscribers.settings.delete(callback);
}

/**
 * Notify all state subscribers
 */
function notifySubscribers(prevState, newState) {
  subscribers.state.forEach(callback => {
    try {
      callback(newState, prevState);
    } catch (error) {
      console.error('Error in state subscriber:', error);
    }
  });
}
