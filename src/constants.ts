export const ESCUDO_URL = 'https://backend-algeciras.hawkins.es/acf/2025/01/escudoAlgeSvg.png';
export const TEMPORADA = '2025/2026';
export const TEMPORADA_CORTA = '25/26';
export const COMPETICION = 'Primera RFEF · Grupo 2';
export const ESTADIO = 'Estadio Municipal El Mirador';
export const CLUB_NOMBRE = 'Algeciras C.F.';

export interface Sponsor {
  name: string;
  url: string;
  dark: boolean;
}

export interface SponsorGroup {
  label: string;
  items: Sponsor[];
}

// URLs se actualizan tras subir logos a WP media library
export const SPONSORS_DESTACADOS: Sponsor[] = [
  { name: 'Ayuntamiento de Algeciras', url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Ayuntamiento_de_Algeciras.png', dark: false },
  { name: 'Capelli Sport',             url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Capelli_Sport.png',             dark: true  },
  { name: 'Hawkins IA Marketing',      url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Hawkins_IA_Marketing.png',      dark: true  },
];

export const SPONSORS_PATROCINADORES: Sponsor[] = [
  { name: 'Suitex',            url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Suitex.png',            dark: false },
  { name: 'San Benedetto',     url: 'https://backend-algeciras.hawkins.es/acf/sponsors/San_Benedetto.png',     dark: false },
  { name: 'Living Home',       url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Living_Home.png',       dark: false },
  { name: 'Tacho',             url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Tacho.png',             dark: false },
  { name: 'Obramat',           url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Obramat.png',           dark: false },
  { name: 'Alompe',            url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Alompe.png',            dark: false },
  { name: 'Inmoclaves',        url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Inmoclaves.png',        dark: false },
  { name: 'Bezabala',          url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Bezabala.png',          dark: false },
  { name: 'Eurogruas',         url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Eurogruas.png',         dark: false },
  { name: 'Algesur',           url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Algesur.png',           dark: false },
  { name: 'Adecco',            url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Adecco.png',            dark: false },
  { name: 'Inamet',            url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Inamet.png',            dark: false },
  { name: 'Solera Motor',      url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Solera_Motor.png',      dark: false },
  { name: 'Cocinas Arya',      url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Cocinas_Arya.png',      dark: false },
  { name: 'Coordinadora CETM', url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Coordinadora_CETM.png', dark: false },
  { name: 'Smartlou',          url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Smartlou.png',          dark: false },
  { name: 'Permotor Algeciras',url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Permotor_Algeciras.png',dark: false },
  { name: 'Algeciras al Minuto',url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Algeciras_al_Minuto.png',dark: false },
  { name: 'Omoda Jaecoo',      url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Omoda_Jaecoo.png',      dark: true  },
];

export const SPONSORS_PROVEEDORES: Sponsor[] = [
  { name: 'Grupo Mainsur',    url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Grupo_Mainsur_Constructora.png', dark: false },
  { name: 'AB Centro Gráfico',url: 'https://backend-algeciras.hawkins.es/acf/sponsors/AB_Centro_Grafico.png',          dark: false },
  { name: 'Quirónsalud',      url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Quironsalud.png',                dark: false },
  { name: 'Nacex',            url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Nacex.png',                      dark: false },
  { name: 'Christian Ortiz',  url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Christian_Ortiz.png',            dark: false },
  { name: 'Datono',           url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Datono.png',                     dark: false },
  { name: 'Coplaga',          url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Coplaga.png',                    dark: false },
  { name: 'Sur Frutas',       url: 'https://backend-algeciras.hawkins.es/acf/sponsors/Sur_Frutas.png',                 dark: false },
];

// Legacy — mantener compatibilidad si la API devuelve lista plana
export const SPONSORS: Sponsor[] = [...SPONSORS_DESTACADOS, ...SPONSORS_PATROCINADORES, ...SPONSORS_PROVEEDORES];
