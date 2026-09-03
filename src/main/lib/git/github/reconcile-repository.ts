import type { PullRequestIdentity } from "../../../../shared/pull-request-agent-context"
import { pullRequestKeyFromUrl } from "../../../../shared/pull-request-agent-context"
import { resolveGitHubRepository } from "./repository-identity"

interface ProjectIdentity {
  id: string
  gitProvider: string | null
  gitOwner: string | null
  gitRepo: string | null
}

/** Builds an atomic metadata update, using only aliases verified by GitHub. */
export async function reconcileRepositoryAliases(
  pr: PullRequestIdentity,
  projects: ProjectIdentity[],
  chats: { id: string; prUrl: string | null }[],
  resolveRepository = resolveGitHubRepository,
) {
  const canonical = await resolveRepository(pr)
  const canonicalName = `${canonical.owner}/${canonical.repository}`
  const aliases = new Set([`${pr.owner}/${pr.repository}`.toLowerCase(), canonicalName.toLowerCase()])
  const matchedProjects: ProjectIdentity[] = []
  const resolutions = new Map<string, ReturnType<typeof resolveRepository>>()
  resolutions.set(`${pr.owner}/${pr.repository}`.toLowerCase(), Promise.resolve(canonical))
  resolutions.set(canonicalName.toLowerCase(), Promise.resolve(canonical))
  const configured = projects.filter(project => project.gitProvider === "github" && project.gitOwner && project.gitRepo)
  // Avoid spawning one gh process for every project simultaneously.
  for (let offset = 0; offset < configured.length; offset += 4) {
    await Promise.all(configured.slice(offset, offset + 4).map(async project => {
      const name = `${project.gitOwner}/${project.gitRepo}`.toLowerCase()
      let request = resolutions.get(name)
      if (!request) {
        request = resolveRepository({ owner: project.gitOwner!, repository: project.gitRepo! })
        resolutions.set(name, request)
      }
      try {
        const resolved = await request
        if (resolved.id !== canonical.id) return
        aliases.add(name)
        matchedProjects.push(project)
      } catch {
        // An unrelated inaccessible repository must not block this PR.
      }
    }))
  }
  const projectUpdates = matchedProjects.filter(project =>
    project.gitOwner !== canonical.owner || project.gitRepo !== canonical.repository)
  const chatUpdates = chats.flatMap(chat => {
    const key = pullRequestKeyFromUrl(chat.prUrl)
    if (!key) return []
    const [name, number] = key.split("#")
    if (!aliases.has(name!)) return []
    const url = `https://github.com/${canonicalName}/pull/${number}`
    return url === chat.prUrl ? [] : [{ id: chat.id, previousUrl: chat.prUrl!, url }]
  })
  return { canonical: { owner: canonical.owner, repository: canonical.repository, number: pr.number }, projectUpdates, chatUpdates }
}
