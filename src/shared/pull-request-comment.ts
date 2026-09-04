export const MAX_COMMENT_BODY_CHARS = 60_000

export function isCommentBodyEmpty(body: string): boolean {
  return body.trim().length === 0
}
