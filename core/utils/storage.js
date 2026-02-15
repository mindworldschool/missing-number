/**
 * Local storage utilities
 */

const STORAGE_KEYS = {
  SETTINGS: 'mws_settings',
  LANGUAGE: 'mws_lang',
  RESULTS: 'mws_results'
};

class Storage {
  loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Failed to load settings:', error);
      return null;
    }
  }

  saveSettings(settings) {
    try {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  }

  loadLanguage(defaultLang = 'ua') {
    try {
      return localStorage.getItem(STORAGE_KEYS.LANGUAGE) || defaultLang;
    } catch (error) {
      console.error('Failed to load language:', error);
      return defaultLang;
    }
  }

  saveLanguage(language) {
    try {
      localStorage.setItem(STORAGE_KEYS.LANGUAGE, language);
    } catch (error) {
      console.error('Failed to save language:', error);
    }
  }

  loadResults() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.RESULTS);
      return saved ? JSON.parse(saved) : null;
    } catch (error) {
      console.error('Failed to load results:', error);
      return null;
    }
  }

  saveResults(results) {
    try {
      localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(results));
    } catch (error) {
      console.error('Failed to save results:', error);
    }
  }

  clear() {
    try {
      Object.values(STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
    } catch (error) {
      console.error('Failed to clear storage:', error);
    }
  }
}

export const storage = new Storage();
