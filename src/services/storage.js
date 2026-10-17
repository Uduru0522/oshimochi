export function createStorage(namespace) {
  function getNamespacedKey(key) {
    return `${namespace}.${key}`;
  }

  return {
    get(key, fallbackValue = null) {
      try {
        return localStorage.getItem(getNamespacedKey(key)) ?? fallbackValue;
      } catch {
        return fallbackValue;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(getNamespacedKey(key), value);
      } catch {
        // Storage can be unavailable in restricted browser contexts.
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(getNamespacedKey(key));
      } catch {
        // Storage can be unavailable in restricted browser contexts.
      }
    }
  };
}
