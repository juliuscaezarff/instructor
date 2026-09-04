import { TRPCError } from "@trpc/server"
import { z } from "zod"
import { getDatabase, projects } from "../../db"
import {
  approvePullRequest,
  createPullRequestComment,
  getCurrentGitHubUser,
  getPullRequestActivity,
  getPullRequestDetail,
  getPullRequestFileDiff,
  getPullRequestFiles,
  listPullRequests,
  MAX_COMMENT_BODY_CHARS,
  MAX_REVIEW_BODY_CHARS,
  PullRequestCommentError,
  PullRequestReviewError,
  requestChangesOnPullRequest,
  type GitHubAvailabilityIssue,
} from "../../git/github/pull-requests"
import { publicProcedure, router } from "../index"
import { getPullRequestWorkspaceTargets, preparePullRequestWorkspace } from "../../git/github/pull-request-workspaces"

function mutationErrorCode(issue: GitHubAvailabilityIssue): "PRECONDITION_FAILED" | "UNAUTHORIZED" | "FORBIDDEN" | "INTERNAL_SERVER_ERROR" {
  if (issue === "gh_not_found") return "PRECONDITION_FAILED"
  if (issue === "gh_not_authenticated") return "UNAUTHORIZED"
  if (issue === "gh_permission_denied") return "FORBIDDEN"
  return "INTERNAL_SERVER_ERROR"
}

const workspaceIdentity = z.object({
  owner: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9-]*$/),
  repository: z.string().regex(/^[a-zA-Z0-9_.-]+$/).refine(value => value !== "." && value !== ".."),
  number: z.number().int().positive(),
})

export const pullRequestsRouter = router({
  currentUser: publicProcedure.query(async () => ({ login: await getCurrentGitHubUser() })),
  workspaceTargets: publicProcedure.input(workspaceIdentity).query(({ input }) => getPullRequestWorkspaceTargets(input)),
  prepareWorkspace: publicProcedure.input(workspaceIdentity.extend({
    projectId: z.string().min(1), workspaceId: z.string().optional(),
    action: z.enum(["open", "analyze", "fix"]),
  })).mutation(({ input }) => preparePullRequestWorkspace(input)),
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
        refreshToken: z.number().int().nonnegative().optional(),
      }),
    )
    .query(({ input }) =>
      getPullRequestDetail(
        { owner: input.owner, repository: input.repository },
        input.number,
        Boolean(input.refreshToken),
      ),
    ),

  files: publicProcedure
    .input(
      z.object({
        owner: z.string().trim().min(1),
        repository: z.string().trim().min(1),
        number: z.number().int().positive(),
        refreshToken: z.number().int().nonnegative().optional(),
      }),
    )
    .query(({ input }) =>
      getPullRequestFiles(
        { owner: input.owner, repository: input.repository },
        input.number,
        Boolean(input.refreshToken),
      ),
    ),

  activity: publicProcedure
    .input(
      z.object({
        owner: z.string().trim().min(1),
        repository: z.string().trim().min(1),
        number: z.number().int().positive(),
        refreshToken: z.number().int().nonnegative().optional(),
      }),
    )
    .query(({ input }) =>
      getPullRequestActivity(
        { owner: input.owner, repository: input.repository },
        input.number,
        Boolean(input.refreshToken),
      ),
    ),

  fileDiff: publicProcedure
    .input(
      z.object({
        owner: z.string().trim().min(1),
        repository: z.string().trim().min(1),
        number: z.number().int().positive(),
        fileIndex: z.number().int().min(0).max(299),
        path: z.string().trim().min(1).max(4096),
        refreshToken: z.number().int().nonnegative().optional(),
      }),
    )
    .query(({ input }) =>
      getPullRequestFileDiff(
        { owner: input.owner, repository: input.repository },
        input.number,
        input.fileIndex,
        input.path,
        Boolean(input.refreshToken),
      ),
    ),

  comment: publicProcedure
    .input(
      z.object({
        owner: z.string().trim().min(1),
        repository: z.string().trim().min(1),
        number: z.number().int().positive(),
        body: z
          .string()
          .max(MAX_COMMENT_BODY_CHARS, `Comment is too long. Limit is ${MAX_COMMENT_BODY_CHARS} characters.`)
          .refine((value) => value.trim().length > 0, "Comment cannot be empty."),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        return await createPullRequestComment(
          { owner: input.owner, repository: input.repository },
          input.number,
          input.body,
        )
      } catch (error) {
        if (error instanceof PullRequestCommentError) {
          throw new TRPCError({
            code: mutationErrorCode(error.issue),
            message: error.message,
          })
        }
        throw error
      }
    }),

  approve: publicProcedure
    .input(
      z.object({
        owner: z.string().trim().min(1),
        repository: z.string().trim().min(1),
        number: z.number().int().positive(),
        body: z
          .string()
          .max(MAX_REVIEW_BODY_CHARS, `Comment is too long. Limit is ${MAX_REVIEW_BODY_CHARS} characters.`)
          .optional(),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        await approvePullRequest(
          { owner: input.owner, repository: input.repository },
          input.number,
          input.body,
        )
        return { success: true } as const
      } catch (error) {
        if (error instanceof PullRequestReviewError) {
          throw new TRPCError({
            code: mutationErrorCode(error.issue),
            message: error.message,
          })
        }
        throw error
      }
    }),

  requestChanges: publicProcedure
    .input(
      z.object({
        owner: z.string().trim().min(1),
        repository: z.string().trim().min(1),
        number: z.number().int().positive(),
        body: z
          .string()
          .max(MAX_REVIEW_BODY_CHARS, `Comment is too long. Limit is ${MAX_REVIEW_BODY_CHARS} characters.`)
          .refine((value) => value.trim().length > 0, "A justification is required to request changes."),
      }),
    )
    .mutation(async ({ input }) => {
      try {
        await requestChangesOnPullRequest(
          { owner: input.owner, repository: input.repository },
          input.number,
          input.body,
        )
        return { success: true } as const
      } catch (error) {
        if (error instanceof PullRequestReviewError) {
          throw new TRPCError({
            code: mutationErrorCode(error.issue),
            message: error.message,
          })
        }
        throw error
      }
    }),
})
