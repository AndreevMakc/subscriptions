export const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  return `sub_${Math.random().toString(36).slice(2, 10)}`
}
