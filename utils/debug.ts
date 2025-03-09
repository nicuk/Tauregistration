type ErrorInfo = {
  message: string
  stack?: string
  fileName?: string
  lineNumber?: number
}

export const logError = (error: Error, additionalInfo?: Record<string, unknown>): void => {
  const errorInfo: ErrorInfo = {
    message: error.message,
    stack: error.stack,
  }

  if (error.stack) {
    const stackLines = error.stack.split("\n")
    const callerLine = stackLines[1] // The second line usually contains the caller info
    const match = callerLine.match(/$$(.*):\d+:\d+$$/)
    if (match) {
      errorInfo.fileName = match[1]
      const lineMatch = callerLine.match(/:(\d+):/)
      if (lineMatch) {
        errorInfo.lineNumber = Number.parseInt(lineMatch[1], 10)
      }
    }
  }

  console.error("Error occurred:", {
    ...errorInfo,
    ...additionalInfo,
  })

  // Here you can add code to send this error to your server or a third-party error tracking service
  // For example:
  // sendErrorToServer(errorInfo, additionalInfo)
}

export const wrapWithErrorHandler = <T extends (...args: any[]) => any>(
  func: T,
  context: string,
): ((...funcArgs: Parameters<T>) => ReturnType<T>) => {
  return (...args: Parameters<T>): ReturnType<T> => {
    try {
      return func(...args)
    } catch (error) {
      logError(error as Error, { context, args })
      throw error
    }
  }
}

