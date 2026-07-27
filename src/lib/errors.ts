/** Extrae un mensaje legible de un error de Supabase/JS, sea o no instancia de Error. */
export function getErrorMessage(err: unknown, fallback = 'Ocurrió un error inesperado'): string {
  if (err instanceof Error) return err.message
  if (typeof err === 'object' && err !== null && 'message' in err) {
    const msg = (err as { message?: unknown }).message
    if (typeof msg === 'string' && msg) return msg
  }
  return fallback
}
