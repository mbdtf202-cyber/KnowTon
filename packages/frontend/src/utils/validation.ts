// Validate Ethereum address
export function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

// Validate IPFS CID
export function isValidIPFSCID(cid: string): boolean {
  return /^Qm[1-9A-HJ-NP-Za-km-z]{44,}$/.test(cid) || /^bafy[a-z0-9]{50,}$/.test(cid)
}

// Validate email
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

// Validate URL
export function isValidURL(url: string): boolean {
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

// Validate file type
export function isValidFileType(file: File, allowedTypes: string[]): boolean {
  return allowedTypes.some(type => {
    if (type.endsWith('/*')) {
      return file.type.startsWith(type.slice(0, -2))
    }
    return file.type === type
  })
}

// Validate file size
export function isValidFileSize(file: File, maxSize: number): boolean {
  return file.size <= maxSize
}

// Validate royalty percentage
export function isValidRoyalty(percentage: number): boolean {
  return percentage >= 0 && percentage <= 30
}

// Validate token amount
export function isValidTokenAmount(amount: string): boolean {
  return /^\d+(\.\d+)?$/.test(amount) && parseFloat(amount) > 0
}

// Validate required field
export function validateRequired(value: string, fieldName: string): string | null {
  if (!value || value.trim().length === 0) {
    return `${fieldName}不能为空`
  }
  return null
}

// Validate max length
export function validateMaxLength(value: string, maxLength: number, fieldName: string): string | null {
  if (value.length > maxLength) {
    return `${fieldName}不能超过 ${maxLength} 个字符`
  }
  return null
}

// Validate min length
export function validateMinLength(value: string, minLength: number, fieldName: string): string | null {
  if (value.length < minLength) {
    return `${fieldName}至少需要 ${minLength} 个字符`
  }
  return null
}

// Validate positive number
export function validatePositiveNumber(value: string, fieldName: string): string | null {
  if (!value || value.trim().length === 0) {
    return `${fieldName}不能为空`
  }
  
  const num = parseFloat(value)
  if (isNaN(num)) {
    return `${fieldName}必须是有效的数字`
  }
  
  if (num <= 0) {
    return `${fieldName}必须大于 0`
  }
  
  return null
}
