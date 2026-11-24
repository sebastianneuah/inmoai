// Selecciones nacionales, confederaciones, empresas patrocinadoras y personalidades del presidente.
import type { PersonalityId, Indicators } from '../types';

// [código, nombre, confederación, fuerza]
export const NATIONS: [string, string, string, number][] = [
  ['ARG', 'Argentina', 'CSF', 85], ['BRA', 'Brasil', 'CSF', 85], ['URU', 'Uruguay', 'CSF', 80], ['COL', 'Colombia', 'CSF', 79],
  ['ECU', 'Ecuador', 'CSF', 77], ['PAR', 'Paraguay', 'CSF', 75], ['CHI', 'Chile', 'CSF', 73], ['PER', 'Perú', 'CSF', 71],
  ['VEN', 'Venezuela', 'CSF', 71], ['BOL', 'Bolivia', 'CSF', 66],
  ['MEX', 'México', 'NCF', 76], ['USA', 'Estados Unidos', 'NCF', 76], ['CAN', 'Canadá', 'NCF', 74], ['CRC', 'Costa Rica', 'NCF', 70],
  ['PAN', 'Panamá', 'NCF', 69], ['JAM', 'Jamaica', 'NCF', 67],
  ['FRA', 'Francia', 'EUF', 88], ['ESP', 'España', 'EUF', 88], ['ENG', 'Inglaterra', 'EUF', 86], ['POR', 'Portugal', 'EUF', 85],
  ['GER', 'Alemania', 'EUF', 84], ['NED', 'Países Bajos', 'EUF', 83], ['ITA', 'Italia', 'EUF', 82], ['BEL', 'Bélgica', 'EUF', 81],
  ['CRO', 'Croacia', 'EUF', 80], ['SUI', 'Suiza', 'EUF', 78], ['DEN', 'Dinamarca', 'EUF', 78], ['AUT', 'Austria', 'EUF', 77],
  ['TUR', 'Turquía', 'EUF', 76], ['SRB', 'Serbia', 'EUF', 75], ['POL', 'Polonia', 'EUF', 75], ['SWE', 'Suecia', 'EUF', 75],
  ['MAR', 'Marruecos', 'AFC', 80], ['SEN', 'Senegal', 'AFC', 77], ['NGA', 'Nigeria', 'AFC', 75], ['EGY', 'Egipto', 'AFC', 74],
  ['CMR', 'Camerún', 'AFC', 73], ['GHA', 'Ghana', 'AFC', 72], ['CIV', 'Costa de Marfil', 'AFC', 75], ['TUN', 'Túnez', 'AFC', 71],
  ['JPN', 'Japón', 'ASF', 78], ['KOR', 'Corea del Sur', 'ASF', 75], ['IRN', 'Irán', 'ASF', 73], ['AUS', 'Australia', 'ASF', 73],
  ['KSA', 'Arabia Saudita', 'ASF', 70], ['QAT', 'Catar', 'ASF', 68], ['UZB', 'Uzbekistán', 'ASF', 69],
  ['NZL', 'Nueva Zelanda', 'OCF', 64],
];

export const CONFEDS: Record<string, { name: string; short: string; members: number }> = {
  CSF: { name: 'Confederación Sudamericana de Fútbol', short: 'CSF', members: 10 },
  NCF: { name: 'Confederación Norte, Centroamericana y del Caribe', short: 'NCF', members: 35 },
  EUF: { name: 'Unión Europea de Federaciones', short: 'UEF', members: 55 },
  AFC: { name: 'Confederación Africana', short: 'CAF', members: 54 },
  ASF: { name: 'Confederación Asiática', short: 'CAS', members: 47 },
  OCF: { name: 'Confederación de Oceanía', short: 'COC', members: 11 },
};

// Empresas ficticias: [nombre, sector, capacidad(0-100), reputación, sensibilidad a escándalos, controversia, exigencia]
export const COMPANIES: [string, string, number, number, number, number, string][] = [
  ['Banco Austral', 'Banca', 70, 70, 70, 10, 'Exige estabilidad financiera y buena imagen.'],
  ['Banco del Litoral', 'Banca', 45, 65, 60, 5, 'Prefiere clubes con raíz regional.'],
  ['Pampa Telecom', 'Telecomunicaciones', 75, 60, 50, 15, 'Pide contenido digital exclusivo.'],
  ['Andina Air', 'Aerolínea', 65, 65, 65, 10, 'Bonificación por clasificar a copas internacionales.'],
  ['Cervecería Río Negro', 'Bebidas', 60, 55, 40, 25, 'Quiere exclusividad en el estadio.'],
  ['Yerba Gaucha', 'Alimentos', 35, 75, 55, 0, 'Valora la identidad y la tradición.'],
  ['ApuestaYa', 'Apuestas online', 85, 25, 20, 80, 'Paga mucho, pero los socios lo rechazan.'],
  ['GolBet Internacional', 'Apuestas online', 90, 20, 15, 85, 'Exige activaciones agresivas en redes.'],
  ['CriptoPampa', 'Criptomonedas', 80, 30, 25, 70, 'Paga parte en tokens propios: alto riesgo.'],
  ['Petrolera del Sur', 'Energía', 80, 45, 60, 40, 'Busca influencia política.'],
  ['Minera Cordillera', 'Minería', 70, 35, 55, 55, 'Genera rechazo ambientalista.'],
  ['Autos Patagonia', 'Automotriz', 60, 65, 60, 10, 'Bonificación por títulos.'],
  ['Supermercados Estrella', 'Retail', 55, 60, 50, 10, 'Promociones para socios.'],
  ['Lácteos La Serena', 'Alimentos', 40, 80, 70, 0, 'Muy sensible a escándalos.'],
  ['Kronos Sport', 'Indumentaria', 75, 70, 50, 10, 'Contrato de indumentaria con regalías.'],
  ['Atlas Athletic', 'Indumentaria', 90, 75, 60, 5, 'Sólo viste clubes con proyección internacional.'],
  ['Puma del Plata', 'Indumentaria', 50, 65, 40, 5, 'Indumentaria nacional con buenas regalías.'],
  ['Vértice Seguros', 'Seguros', 55, 60, 65, 5, 'Contrato conservador y estable.'],
  ['Constructora Horizonte', 'Construcción', 65, 40, 45, 45, 'Quiere participar en las obras del club.'],
  ['MercadoNet', 'Tecnología', 85, 70, 55, 10, 'Exige presencia digital y datos de hinchas.'],
  ['Gulf Horizon Holdings', 'Fondo soberano', 98, 40, 30, 60, 'Fondos ilimitados, sospechas de lavado de imagen.'],
  ['NovaEnergía Verde', 'Energía renovable', 50, 85, 75, 0, 'Mejora la reputación institucional.'],
  ['Farmacias Sur', 'Salud', 40, 70, 60, 0, 'Apoya divisiones juveniles.'],
  ['Hotel Imperial Group', 'Turismo', 55, 55, 50, 15, 'Paquetes para hinchas en copas.'],
  ['Transportes Unidos', 'Logística', 45, 50, 40, 20, 'Pide descuentos en viajes del plantel.'],
  ['Medios del Plata', 'Medios', 60, 50, 45, 30, 'Quiere exclusividad de entrevistas.'],
];

export interface PersonalityDef {
  id: PersonalityId;
  name: string;
  desc: string;
  strengths: string[];
  weaknesses: string[];
  wealth: number; // patrimonio personal inicial
  clubCashBonus: number; // aporte inicial a la caja del club
  ind: Partial<Indicators>;
  contacts: string;
  perks: string[]; // claves de bonificaciones permanentes
}

export const PERSONALITIES: PersonalityDef[] = [
  { id: 'empresario', name: 'Empresario', desc: 'Dueño de un grupo de empresas medianas. Ve el club como una organización que debe ser rentable.', strengths: ['Mejores contratos de patrocinio (+15%)', 'Confianza de empresarios y bancos'], weaknesses: ['Los hinchas desconfían de su pasión', 'La barra lo ve como un blanco'], wealth: 6_000_000, clubCashBonus: 300_000, ind: { patrocinadores: 65, hinchas: 42, estabilidad: 55, socios: 48 }, contacts: 'Empresarios y bancos', perks: ['sponsor_plus', 'loan_rate'] },
  { id: 'historico', name: 'Dirigente histórico', desc: 'Lleva treinta años en la política del club y conoce todos los pasillos de la asociación.', strengths: ['Gran apoyo de la comisión directiva', 'Contactos en la asociación nacional'], weaknesses: ['Lo asocian a la "vieja política"', 'Los socios jóvenes piden renovación'], wealth: 1_500_000, clubCashBonus: 0, ind: { comision: 68, asociacion: 62, presidentes: 60, influencia: 45, periodistas: 45, socios: 50 }, contacts: 'Dirigentes y asociación', perks: ['politics_plus'] },
  { id: 'exjugador', name: 'Exjugador', desc: 'Ídolo del club en los noventa. Los jugadores lo respetan y los hinchas lo adoran.', strengths: ['Respeto del plantel y del cuerpo técnico', 'Popularidad entre los hinchas'], weaknesses: ['Inexperiencia administrativa', 'Desconfianza de los bancos'], wealth: 2_500_000, clubCashBonus: 0, ind: { jugadores: 70, dt: 62, hinchas: 66, socios: 58, estabilidad: 42, patrocinadores: 45 }, contacts: 'Jugadores, entrenadores y representantes', perks: ['players_plus'] },
  { id: 'politico', name: 'Político', desc: 'Exconcejal con aspiraciones mayores. Usa el club como plataforma y sabe negociar.', strengths: ['Influencia política alta', 'Contactos con el gobierno local'], weaknesses: ['Riesgo de investigación más alto', 'Periodistas atentos a cada paso'], wealth: 2_000_000, clubCashBonus: 0, ind: { influencia: 55, asociacion: 55, periodistas: 40, riesgo: 22, integridad: 52 }, contacts: 'Gobierno, intendencias y sindicatos', perks: ['politics_plus', 'gov_contacts'] },
  { id: 'millonario', name: 'Inversor millonario', desc: 'Hizo fortuna en el exterior y quiere un club ganador cueste lo que cueste.', strengths: ['Enorme patrimonio personal', 'Puede capitalizar al club'], weaknesses: ['Los socios temen la privatización', 'Comisión directiva recelosa'], wealth: 40_000_000, clubCashBonus: 2_000_000, ind: { socios: 44, comision: 45, patrocinadores: 60, repInternacional: 40 }, contacts: 'Fondos de inversión internacionales', perks: ['rich'] },
  { id: 'representante', name: 'Representante de jugadores', desc: 'Exagente FIFA con una cartera enorme de futbolistas. Sabe cómo funciona el mercado.', strengths: ['Mejores precios en el mercado de pases', 'Gran relación con representantes'], weaknesses: ['Sospechas de conflicto de intereses', 'Integridad cuestionada'], wealth: 5_000_000, clubCashBonus: 0, ind: { representantes: 75, integridad: 45, riesgo: 25, periodistas: 42 }, contacts: 'Representantes y clubes del exterior', perks: ['market_plus'] },
  { id: 'hincha', name: 'Hincha convertido en presidente', desc: 'Socio vitalicio que ganó las elecciones con una agrupación nueva y sin aparato.', strengths: ['Apoyo enorme de socios e hinchas', 'Imagen de honestidad'], weaknesses: ['Pocos contactos políticos', 'Patrimonio limitado'], wealth: 300_000, clubCashBonus: 0, ind: { socios: 70, hinchas: 72, integridad: 68, influencia: 20, asociacion: 40, presidentes: 40 }, contacts: 'Agrupaciones de socios', perks: ['fans_plus'] },
  { id: 'administrador', name: 'Administrador profesional', desc: 'Gerente formado en gestión deportiva en el exterior. Ordena números y procesos.', strengths: ['Gastos operativos menores (−10%)', 'Estabilidad financiera'], weaknesses: ['Frialdad con los hinchas', 'Poco carisma político'], wealth: 1_200_000, clubCashBonus: 0, ind: { estabilidad: 60, empleados: 62, integridad: 62, hinchas: 45, influencia: 28 }, contacts: 'Auditores, bancos y consultoras', perks: ['cost_minus'] },
];

export const DIFFICULTIES = {
  facil: { name: 'Fácil', cash: 1.6, events: 0.85, luck: 1.08, desc: 'Más caja inicial, rivales menos agresivos.' },
  normal: { name: 'Normal', cash: 1, events: 1, luck: 1, desc: 'Experiencia equilibrada.' },
  dificil: { name: 'Difícil', cash: 0.7, events: 1.15, luck: 0.95, desc: 'Caja ajustada, crisis más frecuentes.' },
  leyenda: { name: 'Leyenda', cash: 0.45, events: 1.3, luck: 0.9, desc: 'Deudas heredadas y oposición feroz.' },
} as const;
