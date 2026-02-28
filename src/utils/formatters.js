export function unformatCurrencyInput(value) {
  if (value == null) return ''
  return value.toString().replace(/,/g, '')
}

export function formatCurrencyInput(value) {
  const num = Number(unformatCurrencyInput(value) || 0)
  return num ? num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : ''
}
