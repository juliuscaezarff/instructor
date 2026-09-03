import { z } from "zod"
import { execWithShellEnv } from "../shell-env"
import type { PullRequestIdentity } from "../../../../shared/pull-request-agent-context"
import { parseGitHubRemote, resolveGitHubRepository } from "./repository-identity"

const refSchema = z.object({ sha: z.string().regex(/^[a-f0-9]{40}$/i), ref: z.string().min(1) })
export const pullRequestHeadSchema = z.object({
  number: z.number().int().positive(),
  title: z.string(), body: z.string().nullable(),
  head: refSchema,
  base: refSchema.extend({ repo: z.object({ id: z.number().int().positive(), full_name: z.string() }) }),
})

export async function fetchPullRequestHead(pr: PullRequestIdentity, execute = execWithShellEnv) {
  const { stdout } = await execute("gh", [
    "api", "--hostname", "github.com", `repos/${pr.owner}/${pr.repository}/pulls/${pr.number}`,
  ], { timeout: 30_000, maxBuffer: 2 * 1024 * 1024 })
  const head = pullRequestHeadSchema.parse(JSON.parse(stdout))
  const repository = await resolveGitHubRepository(pr, execute)
  if (head.number !== pr.number || head.base.repo.id !== repository.id) {
    throw new Error("This PR belongs to a different GitHub repository. Refresh and select the correct project.")
  }
  return head
}

export function githubRemoteMatches(remote: string, pr: PullRequestIdentity): boolean {
  const match = remote.trim().match(/^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([^/]+)\/([^/]+?)\/?$/i)
  return Boolean(match && `${match[1]}/${match[2]!.replace(/\.git$/i, "")}`.toLowerCase() === `${pr.owner}/${pr.repository}`.toLowerCase())
}

export async function fetchVerifiedPullRequestCommit(projectPath: string, pr: PullRequestIdentity & { repositoryId?: number }, sha: string, execute = execWithShellEnv) {
  const run = (args: string[]) => execute("git", ["-C", projectPath, ...args], { timeout: 120_000, maxBuffer: 1024 * 1024 })
  const remote = await run(["remote", "get-url", "origin"])
  const remoteRepository = parseGitHubRemote(remote.stdout)
  if (!remoteRepository) throw new Error("The project's origin is not a supported GitHub repository. Check the project remote.")
  const expectedId = pr.repositoryId ?? (await resolveGitHubRepository(pr, execute)).id
  const actualRepository = await resolveGitHubRepository(remoteRepository, execute)
  if (actualRepository.id !== expectedId) throw new Error("The project's origin does not match this GitHub repository. Check the project remote.")
  // GitHub exposes fork heads through the base repository's pull ref. No fork URL or branch is executed.
  const ref = `refs/instructor/pull/${pr.number}/head`
  await run(["fetch", "--no-tags", "--no-recurse-submodules", "origin", `+refs/pull/${pr.number}/head:${ref}`])
  const fetched = (await run(["rev-parse", "--verify", `${ref}^{commit}`])).stdout.trim()
  if (fetched !== sha) throw new Error("The PR changed while fetching. Refresh and try again.")
  return fetched
}
