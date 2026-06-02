export type Tier = 'aficionado' | 'abonado' | 'abonado_vip' | 'peñista';

export interface CustomerInfo {
  tier?: Tier;
  tierLabel?: string;
  attendanceRate?: number;
  isSocio?: boolean;
  socioNumber?: string | number;
  [k: string]: any;
}

export interface Usuario {
  id: number;
  nombre?: string;
  name?: string;
  email: string;
  telefono?: string;
  dni?: string;
  direccion?: string;
  profileImage?: string | null;
  isSocio?: boolean;
  socioNumber?: string | number | null;
  customer?: CustomerInfo;
  matchdayToday?: boolean;
}

export type UsuarioConTier = Usuario;

export interface CompraItem {
  id?: number;
  nombre?: string;
  descripcion?: string;
  cantidad?: number;
  precio?: number;
  total?: number;
  imagen?: string;
}

export interface Compra {
  id: number;
  reference?: string;
  referencia?: string;
  total: number;
  status?: string;
  estado?: string;
  created_at?: string;
  fecha?: string;
  items?: CompraItem[];
  [k: string]: any;
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
  codigoAbonado?: string; // FIX-16
}

export interface EstadioInfo {
  nombre?: string;
  direccion?: string;
  capacidad?: number;
  fundacion?: string;
  latitud?: number;
  longitud?: number;
}

export interface Entrada {
  id: number;
  token?: string;
  qrCode?: string;
  codigoAcceso?: string;
  qr_image_path?: string;   // ruta relativa en storage/qr
  qr_url?: string;          // URL completa al PNG (preferida si backend la añade)
  precio: number;
  estado: 'pendiente' | 'valida' | 'usada' | 'cancelada';
  tipo?: string;
  metodoPago?: string;
  usuarioId: number;
  partidoId?: number;
  asientoId?: number;
  createdAt?: string;
  Partido?: {
    id?: number;
    matchday?: number | string;
    equipoLocal: string;
    equipoVisitante: string;
    fecha: string;
    hora?: string;
  };
  Asiento?: {
    numero: string | number;
    fila: string | number;
    Sector?: { nombre: string };
  };
}

export interface ClasificacionItem {
  id: number;
  posicion: number;
  equipo: string;
  escudo?: string;
  pj: number;
  g?: number;
  e?: number;
  d?: number;
  gf: number;
  gc: number;
  puntos: number;
}

export type RootStackParamList = {
  Auth: { screen?: keyof AuthStackParamList } | undefined;
  Main: undefined;
};

export type AuthStackParamList = {
  Login: { afterAuthScreen?: string; prefilledEmail?: string } | undefined;
  Register: { afterAuthScreen?: string } | undefined;
  RecuperarPassword: { prefilledEmail?: string } | undefined;
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

export interface Noticia {
  id: number;
  titulo: string;
  slug: string;
  extracto?: string;
  contenido?: string;
  imagen?: string;
  categoria: 'fichaje' | 'lesion' | 'comunicado' | 'partido' | 'galeria' | 'evento' | 'otro';
  fecha: string;
  activo: boolean;
  destacado: boolean;
}

export type CuentaStackParamList = {
  MiCuentaHome: undefined;
  Perfil: undefined;
  MisAbonosCuenta: undefined;
  MisEntradasCuenta: undefined;
  MisCompras: undefined;
  MisComprasDetalle: { id: number };
  Beneficios: undefined;
  Actividad: undefined;
  Notificaciones: undefined;
  Carnet: undefined;
};

export type MainTabParamList = {
  InicioTab: undefined;
  AbonosTab: undefined;
  FanZoneTab: undefined;
  PerfilTab: undefined;
  MasTab: undefined;
  // kept for stack navigation references
  NoticiasTab: undefined;
  PlantillaTab: undefined;
  TiendaTab: undefined;
  SociosTab: undefined;
};
