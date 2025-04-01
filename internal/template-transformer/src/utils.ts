export function deepMerge(target: any, source: any): any {
  if (typeof target !== 'object' || typeof source !== 'object') return source;

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object') {
      target[key] = deepMerge(target[key] ?? {}, source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}
