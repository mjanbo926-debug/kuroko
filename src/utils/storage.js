export const storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(`massage_${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch {
      return defaultValue;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(`massage_${key}`, JSON.stringify(value));
    } catch (e) {
      console.error('Storage error:', e);
    }
  },
  remove(key) {
    localStorage.removeItem(`massage_${key}`);
  },
};

export const authStorage = {
  getPassword() {
    return localStorage.getItem('massage_password');
  },
  setPassword(password) {
    localStorage.setItem('massage_password', password);
  },
  hasPassword() {
    return !!localStorage.getItem('massage_password');
  },
};
