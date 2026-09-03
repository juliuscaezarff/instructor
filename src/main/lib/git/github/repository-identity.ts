import { z } from "zod"
import { execWithShellEnv } from "../shell-env"

const repositorySchema = z.object({
  id: z.number().int().positive(),
  full_name: z.string().regex(/^[a-zA-Z0-9-]+\/[a-zA-Z0-9_.-]+$/),
})

export interface GitHubRepositoryIdentity {
  id: number
  owner: string
  repository: string
}

export function parseGitHubRemote(remote: string): { owner: string; repository: string } | null {
  const match = remote.trim().match(/^(?:https:\/\/github\.com\/|git@github\.com:|ssh:\/\/git@github\.com\/)([a-zA-Z0-9-]+)\/([a-zA-Z0-9_.-]+)\/?$/i)
  if (!match) return null
  return { owner: match[1]!, repository: match[2]!.replace(/\.git$/i, "") }
}

/** gh follows GitHub redirects; compare repository IDs, never guess from names. */
export async function resolveGitHubRepository(
  repository: { owner: string; repository: string },
  execute = execWithShellEnv,
): Promise<GitHubRepositoryIdentity> {
  const { stdout } = await execute("gh", [
    "api", "--hostname", "github.com",
    `repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.repository)}`,
  ], { timeout: 30_000, maxBuffer: 2 * 1024 * 1024 })
  const result = repositorySchema.parse(JSON.parse(stdout))
  const [owner, name] = result.full_name.split("/")
  return { id: result.id, owner: owner!, repository: name! }
}
