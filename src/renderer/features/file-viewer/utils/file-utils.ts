/**
 * Get file name from path
 */
export function getFileName(filePath: string): string {
  const parts = filePath.split(/[\\/]/)
  return parts[parts.length - 1] || filePath
}

export function isAbsoluteFilePath(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, "/")
  return normalized.startsWith("/") || /^[A-Za-z]:\//.test(normalized)
}

export function resolveFilePath(projectPath: string, filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/")
  return isAbsoluteFilePath(normalized)
    ? normalized
    : `${projectPath.replace(/\\/g, "/").replace(/\/$/, "")}/${normalized}`
}

export function relativeFilePath(projectPath: string, filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/")
  const project = projectPath.replace(/\\/g, "/").replace(/\/$/, "")
  const windows = /^[A-Za-z]:\//.test(project) || project.startsWith("//")
  const pathKey = windows ? normalized.toLowerCase() : normalized
  const projectKey = windows ? project.toLowerCase() : project
  if (pathKey === projectKey) return ""
  return pathKey.startsWith(projectKey + "/")
    ? normalized.slice(project.length + 1)
    : normalized
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

/**
 * Get file extension from path
 */
export function getFileExtension(filePath: string): string {
  const parts = filePath.split(".")
  return parts.length > 1 ? `.${parts[parts.length - 1].toLowerCase()}` : ""
}
