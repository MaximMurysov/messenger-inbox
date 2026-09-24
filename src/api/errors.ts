/** 401/403 — учётные данные неверны или инстанс их больше не принимает. */
export function isAuthError(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('status' in error)) {
    return false
  }
  return error.status === 401 || error.status === 403
}
