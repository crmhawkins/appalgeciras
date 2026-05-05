export interface Usuario {
  id: number;
  nombre?: string;
  email: string;
  telefono?: string;
  dni?: string;
}

export interface LoginResponse {
  token: string;
  usuario: Usuario;
}

export interface Grada {
  id: number;
  nombre: string;
  imagen?: string;
  descripcion?: string;
}

export interface Sector {
  id: number;
  nombre: string;
  capacidad: number;
  precio: number;
  gradaId: number;
  activo: boolean;
  asientosDisponibles?: number;
  imagen?: string;
}

export type EstadoAsiento = 'disponible' | 'ocupado' | 'liberado';

export interface Asiento {
  id: number;
  numero: string | number;
  fila: string | number;
  estado: EstadoAsiento;
  sectorId: number;
}

export interface Partido {
  id: number;
  equipoLocal: string;
  equipoVisitante: string;
  escudoLocal?: string;
  escudoVisitante?: string;
  fecha: string;
  hora?: string;
  marcador?: string | null;
}

export interface Abono {
  id: number;
  nombre: string;
  apellidos: string;
  email: string;
  asientoId: number;
  precio: number;
  activo: boolean;
  fechaInicio: string;
  fechaFin: string;
  codigoAcceso?: string;
}

export interface ClasificacionItem {
  id: number;
  posicion: number;
  equipo: string;
  escudo?: string;
  pj: number;
  gf: number;
  gc: number;
  puntos: number;
}

export type RootStackParamList = {
  Auth: { screen?: keyof AuthStackParamList } | undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: { afterAuthScreen?: string } | undefined;
  Register: { afterAuthScreen?: string } | undefined;
};

export type AbonosStackParamList = {
  Gradas: undefined;
  Sectores: { gradaId: number; gradaNombre: string };
  Asientos: { sectorId: number; sectorNombre: string; precio: number };
  Checkout: {
    sectorId: number;
    sectorNombre: string;
    asientoId: number;
    fila: string | number;
    numero: string | number;
    precio: number;
  };
};

export type MainTabParamList = {
  InicioTab: undefined;
  NoticiasTab: undefined;
  PlantillaTab: undefined;
  AbonosTab: undefined;
  FanZoneTab: undefined;
  TiendaTab: undefined;
  PerfilTab: undefined;
};
