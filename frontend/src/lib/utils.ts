import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatDate(date: Date | string): string {
  const d = new Date(date)
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatSentiment(sentiment: number): {
  label: string
  color: string
  bgColor: string
} {
  if (sentiment > 0.1) {
    return {
      label: 'Positive',
      color: 'text-success-600',
      bgColor: 'bg-success-100',
    }
  } else if (sentiment < -0.1) {
    return {
      label: 'Negative',
      color: 'text-error-600',
      bgColor: 'bg-error-100',
    }
  } else {
    return {
      label: 'Neutral',
      color: 'text-gray-600',
      bgColor: 'bg-gray-100',
    }
  }
}

export function formatCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    health: 'Health & Healthcare',
    infrastructure: 'Infrastructure & Transportation',
    safety: 'Safety & Security',
    other: 'Other',
  }
  return categoryMap[category] || category
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength).trim() + '...'
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout
  return (...args: Parameters<T>) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}