import { trpc } from "../trpc"

interface ProjectIconData {
  id: string
  iconPath?: string | null
  updatedAt?: string | Date | null
  gitOwner?: string | null
  gitProvider?: string | null
}

interface UseProjectIconResult {
  /** URL to use as img src — a data URL for local icons or a GitHub avatar URL. */
  src: string | null
  isLoading: boolean
  hasError: boolean
}

/**
 * Resolves a project's icon without exposing a local file URL to the renderer.
 * Local files are read by the main process because the renderer CSP blocks file://.
 */
export function useProjectIcon(project: ProjectIconData | null | undefined): UseProjectIconResult {
  const hasLocalIcon = Boolean(project?.iconPath)
  const { data, isLoading, isError } = trpc.files.readBinaryFile.useQuery(
    {
      filePath: project?.iconPath ?? "",
      // Replacing an icon can preserve its path, so the project timestamp is
      // part of the query key to ensure the new image is loaded.
      version: String(project?.updatedAt ?? ""),
    },
    {
      enabled: hasLocalIcon,
      staleTime: Infinity,
    },
  )

  if (hasLocalIcon) {
    return {
      src: data?.ok ? `data:${data.mimeType};base64,${data.data}` : null,
      isLoading,
      hasError: isError || Boolean(data && !data.ok),
    }
  }

  if (project?.gitOwner && project.gitProvider === "github") {
    return {
      src: `https://github.com/${project.gitOwner}.png?size=64`,
      isLoading: false,
      hasError: false,
    }
  }

  return { src: null, isLoading: false, hasError: false }
}
