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

export const SPONSORS: Sponsor[] = [
  { name: 'Capelli Sport', url: 'https://backend-algeciras.hawkins.es/acf/2021/11/Capelli-Sport_Logo_White-scaled.png', dark: true },
  { name: 'Quirónsalud', url: 'https://backend-algeciras.hawkins.es/acf/2021/11/20-quironsalud.svg', dark: false },
  { name: 'Hawkins', url: 'https://backend-algeciras.hawkins.es/acf/2021/11/DISENOS-2025-HAWKINS--e1741864702878.png', dark: true },
  { name: 'Smartlou', url: 'https://backend-algeciras.hawkins.es/acf/2021/11/smartlou-white0.png', dark: true },
  { name: 'Ewytyploof', url: 'https://backend-algeciras.hawkins.es/acf/2021/11/Logo-Ewytyploof-en-blanco.-solo-un-color.png', dark: true },
  { name: 'Galleta', url: 'https://backend-algeciras.hawkins.es/acf/2021/11/GALLETA-BLANCA.png', dark: true },
];
