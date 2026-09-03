export interface PullRequestChatTargets {
  projects: { id: string }[]
  workspaces: { id: string; projectId: string; available: boolean; isolated: boolean }[]
}

/** Only skip the chooser when the destination is unambiguous. */
export function defaultPullRequestChatTarget(targets: PullRequestChatTargets): string | null {
  const workspaces = targets.workspaces.filter(workspace => workspace.available && workspace.isolated)
  if (workspaces.length === 1) return `workspace:${workspaces[0]!.id}`
  if (workspaces.length === 0 && targets.projects.length === 1) return `project:${targets.projects[0]!.id}`
  return null
}
