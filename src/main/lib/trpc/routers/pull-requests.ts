import { z } from "zod"
import { getDatabase, projects } from "../../db"
import {
  getPullRequestDetail,
  listPullRequests,
} from "../../git/github/pull-requests"
import { publicProcedure, router } from "../index"

export const pullRequestsRouter = router({
  list: publicProcedure
    .input(
      z
        .object({
          refreshToken: z.number().int().nonnegative().optional(),
        })
        .optional(),
    )
    .query(async ({ input }) => {
      const db = getDatabase()
      const configuredProjects = db
        .select({
          gitProvider: projects.gitProvider,
          gitOwner: projects.gitOwner,
          gitRepo: projects.gitRepo,
        })
        .from(projects)
        .all()

      return listPullRequests(
        configuredProjects.flatMap((project) =>
          project.gitProvider === "github" && project.gitOwner && project.gitRepo
            ? [{ owner: project.gitOwner, repository: project.gitRepo }]
            : [],
        ),
        Boolean(input?.refreshToken),
      )
    }),

  detail: publicProcedure
    .input(
      z.object({
        owner: z.string().trim().min(1),
        repository: z.string().trim().min(1),
        number: z.number().int().positive(),
      }),
    )
    .query(({ input }) =>
      getPullRequestDetail(
        { owner: input.owner, repository: input.repository },
        input.number,
      ),
    ),
})
