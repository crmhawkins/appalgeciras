export interface JugadorBase {
  id?: number;
  nombre: string;
  apellidos?: string;
  dorsal?: number;
  posicion?: string;
  foto?: string;
  sofascoreId?: number;
}

export function fotoUrl(jugador: JugadorBase): string | null {
  if (jugador.foto) return jugador.foto;
  if (jugador.dorsal && jugador.dorsal >= 1 && jugador.dorsal <= 25) {
    return `https://backend-algeciras.hawkins.es/acf/2025/10/${jugador.dorsal}.png`;
  }
  if (jugador.sofascoreId) return `https://api.sofascore.app/api/v1/player/${jugador.sofascoreId}/image`;
  return null;
}

export function nombreCompleto(jugador: JugadorBase): string {
  return jugador.apellidos ? `${jugador.nombre} ${jugador.apellidos}` : jugador.nombre;
}
