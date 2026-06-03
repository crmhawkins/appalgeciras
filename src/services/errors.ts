/**
 * Convierte cualquier error de axios/fetch a un mensaje legible para el usuario.
 *
 * Reglas:
 *  - Sin red / ERR_NETWORK / Network Error  -> "Sin conexión a internet…"
 *  - Timeout (ECONNABORTED, axios timeout)   -> "Servidor tarda demasiado…"
 *  - 401/403                                  -> Texto del backend o "Sesión caducada"
 *  - 422 (validación)                         -> Primer error del array `errors`
 *  - 5xx                                      -> "Algo salió mal en el servidor…"
 *  - Resto                                    -> Texto del backend si llega, si no fallback
 *
 * NUNCA muestra al usuario "Request failed with status code 500" ni similar.
 */
export function humanizeError(error: any, context?: 'login' | 'register' | 'recover' | 'checkout' | 'lookup'): string {
  // Caso 0: no es un error real
  if (!error) return 'Algo salió mal. Vuelve a intentarlo.';

  // Sin red (axios v1 → e.code === 'ERR_NETWORK'; RN a veces 'Network Error')
  const msg = String(error?.message || '');
  if (
    error?.code === 'ERR_NETWORK' ||
    msg.toLowerCase().includes('network') ||
    msg.toLowerCase().includes('failed to fetch')
  ) {
    return 'Sin conexión a internet. Comprueba tu wifi o datos móviles.';
  }

  // Timeout
  if (error?.code === 'ECONNABORTED' || msg.toLowerCase().includes('timeout')) {
    return 'El servidor tarda demasiado en responder. Vuelve a intentarlo.';
  }

  const status = error?.response?.status as number | undefined;
  const data   = error?.response?.data;

  // 422 — validación. Backend Laravel devuelve { message, errors:{campo:[…]} }
  if (status === 422) {
    if (data?.errors && typeof data.errors === 'object') {
      const first = (Object.values(data.errors) as any[]).flat()[0];
      if (first) return String(first);
    }
    return data?.message || 'Revisa los datos introducidos.';
  }

  // 401
  if (status === 401) {
    if (context === 'login') return 'Email o contraseña incorrectos.';
    return 'Tu sesión ha caducado. Vuelve a entrar.';
  }

  // 403
  if (status === 403) {
    return data?.message || 'No tienes permiso para hacer esta acción.';
  }

  // 404
  if (status === 404) {
    if (context === 'lookup') return 'No encontramos tus datos en nuestros registros.';
    return data?.message || 'No encontramos lo que buscas.';
  }

  // 409 — conflicto típico (entrada ya usada, etc.)
  if (status === 409) {
    return data?.message || 'Ya está hecho o hay un conflicto.';
  }

  // 5xx — servidor
  if (status && status >= 500) {
    return 'Algo salió mal en el servidor. Vuelve a intentarlo en unos segundos. Si persiste avísanos.';
  }

  // Otros 4xx con mensaje
  if (data?.message) return String(data.message);
  if (data?.msg)     return String(data.msg);

  // Último recurso (NO mostrar "Request failed…")
  return 'No pudimos completar la acción. Vuelve a intentarlo.';
}
