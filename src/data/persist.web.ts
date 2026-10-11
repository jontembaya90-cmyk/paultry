/** Web previews keep the farm in the browser's local storage. */
export const persist = {
  get: (key: string) => (typeof localStorage === 'undefined' ? null : localStorage.getItem(key)),
  set: (key: string, value: string) => {
    if (typeof localStorage !== 'undefined') localStorage.setItem(key, value);
  },
};
