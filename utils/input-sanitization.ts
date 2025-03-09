import DOMPurify from "dompurify"

export function sanitizeInput(input: string): string {
  // Use DOMPurify to sanitize the input
  return DOMPurify.sanitize(input)
}

