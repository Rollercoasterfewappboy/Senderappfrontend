import { describe, it, expect } from 'vitest'
import { formatCurrencyInput, unformatCurrencyInput } from '../utils/formatters'

describe('formatters', () => {
  it('unformatCurrencyInput removes commas and returns string', () => {
    expect(unformatCurrencyInput('40,000.00')).toBe('40000.00')
    expect(unformatCurrencyInput(null)).toBe('')
  })

  it('formatCurrencyInput formats numbers with two decimals', () => {
    expect(formatCurrencyInput('40000')).toBe('40,000.00')
    expect(formatCurrencyInput('0')).toBe('')
    expect(formatCurrencyInput('1234.5')).toBe('1,234.50')
  })
})