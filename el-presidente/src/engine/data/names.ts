// Generadores de nombres ficticios por región.
import type { RNG } from '../rng';

const AR_FIRST = ['Juan', 'Martín', 'Lucas', 'Matías', 'Nicolás', 'Facundo', 'Agustín', 'Santiago', 'Tomás', 'Franco', 'Gonzalo', 'Leandro', 'Ezequiel', 'Maximiliano', 'Lautaro', 'Julián', 'Bruno', 'Thiago', 'Valentín', 'Joaquín', 'Ramiro', 'Emiliano', 'Cristian', 'Diego', 'Pablo', 'Sebastián', 'Hernán', 'Gastón', 'Mauro', 'Nahuel', 'Iván', 'Enzo', 'Alexis', 'Rodrigo', 'Federico', 'Marcos', 'Damián', 'Germán', 'Claudio', 'Walter', 'Alan', 'Kevin', 'Brian', 'Exequiel', 'Ignacio', 'Lisandro', 'Benjamín', 'Mateo', 'Gianluca', 'Fabricio'];
const AR_LAST = ['González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Díaz', 'Pérez', 'Gómez', 'Sánchez', 'Romero', 'Sosa', 'Álvarez', 'Torres', 'Ruiz', 'Ramírez', 'Flores', 'Acosta', 'Benítez', 'Medina', 'Herrera', 'Aguirre', 'Suárez', 'Giménez', 'Molina', 'Castro', 'Ortiz', 'Silva', 'Núñez', 'Luna', 'Juárez', 'Cabrera', 'Ríos', 'Ferreyra', 'Godoy', 'Morales', 'Domínguez', 'Moreno', 'Peralta', 'Vega', 'Carrizo', 'Quiroga', 'Ledesma', 'Ojeda', 'Paz', 'Coria', 'Villalba', 'Bustos', 'Correa', 'Figueroa', 'Cáceres', 'Barrios', 'Arias', 'Maidana', 'Zárate', 'Vázquez', 'Insaurralde', 'Bianchi', 'Lombardi', 'Rossi', 'Mancuso', 'Galván', 'Ponce', 'Toledo', 'Brizuela', 'Olmedo', 'Palacios', 'Leiva', 'Mansilla', 'Escobar', 'Funes'];
const BR_FIRST = ['João', 'Pedro', 'Gabriel', 'Lucas', 'Mateus', 'Rafael', 'Gustavo', 'Felipe', 'Thiago', 'Bruno', 'Vinícius', 'Rodrygo', 'Endrick', 'Igor', 'Caio', 'Diego', 'André', 'Marcos', 'Everton', 'Wesley'];
const BR_LAST = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Ferreira', 'Almeida', 'Carvalho', 'Ribeiro', 'Lima', 'Araújo', 'Gomes', 'Martins', 'Barbosa', 'Rocha', 'Moura', 'Nascimento', 'Teixeira', 'Batista'];
const EU_FIRST = ['Luca', 'Marco', 'Jan', 'Lukas', 'Thomas', 'Pierre', 'Antoine', 'Hugo', 'James', 'Oliver', 'Harry', 'Jack', 'Pablo', 'Sergio', 'Álvaro', 'Rui', 'João', 'Kevin', 'Niklas', 'Federico', 'Giorgio', 'Mathis', 'Kylian', 'Ruben', 'Bernardo', 'Diogo', 'Leon', 'Florian', 'Daniel', 'Iker'];
const EU_LAST = ['Müller', 'Schmidt', 'Rossi', 'Bianchi', 'Ricci', 'Dubois', 'Martin', 'Bernard', 'Smith', 'Jones', 'Taylor', 'Brown', 'García', 'Martín', 'Navarro', 'Pereira', 'Costa', 'Fischer', 'Weber', 'Conti', 'Moretti', 'Lefèvre', 'Girard', 'Walker', 'Wright', 'Hughes', 'Ortega', 'Morales', 'Santos', 'Hoffmann'];
const AS_FIRST = ['Salem', 'Fahad', 'Abdullah', 'Mohammed', 'Yasser', 'Saud', 'Nawaf', 'Hassan', 'Ali', 'Omar'];
const AS_LAST = ['Al-Dawsari', 'Al-Shehri', 'Al-Faraj', 'Al-Owais', 'Kanno', 'Al-Ghannam', 'Al-Buraikan', 'Al-Amri', 'Al-Tambakti', 'Al-Malki'];
const MX_FIRST = ['Hirving', 'Edson', 'Raúl', 'Santiago', 'César', 'Luis', 'Orbelín', 'Alexis', 'Jesús', 'Carlos', 'Diego', 'Erick'];
const MX_LAST = ['Lozano', 'Álvarez', 'Jiménez', 'Giménez', 'Montes', 'Chávez', 'Pineda', 'Vega', 'Gallardo', 'Rodríguez', 'Lainez', 'Gutiérrez'];
const US_FIRST = ['Christian', 'Weston', 'Tyler', 'Gio', 'Brenden', 'Josh', 'Ricardo', 'Folarin', 'Tim', 'Matt'];
const US_LAST = ['Adams', 'McKennie', 'Reyna', 'Aaronson', 'Sargent', 'Robinson', 'Pepi', 'Turner', 'Miller', 'Carter'];

const JK_FIRST = ['Takumi', 'Kaoru', 'Daichi', 'Ritsu', 'Wataru', 'Min-jae', 'Heung-min', 'Kang-in', 'Hee-chan', 'Ao'];
const JK_LAST = ['Tanaka', 'Mitoma', 'Kubo', 'Endo', 'Doan', 'Kim', 'Lee', 'Park', 'Hwang', 'Son'];
const AF_FIRST = ['Achraf', 'Sadio', 'Victor', 'Mohamed', 'André', 'Thomas', 'Ismaïla', 'Hakim', 'Yassine', 'Kalidou'];
const AF_LAST = ['Hakimi', 'Mané', 'Osimhen', 'Salah', 'Onana', 'Partey', 'Sarr', 'Ziyech', 'Bounou', 'Koulibaly'];

export type NameRegion = 'AR' | 'BR' | 'EU' | 'AS' | 'MX' | 'US' | 'LA' | 'JK' | 'AF';

export function regionOf(nat: string): NameRegion {
  if (nat === 'BRA') return 'BR';
  if (['ESP', 'ENG', 'ITA', 'GER', 'FRA', 'POR', 'NED', 'BEL', 'CRO', 'SUI', 'DEN', 'AUT', 'TUR', 'SRB', 'POL', 'SWE', 'AUS', 'NZL', 'CAN'].includes(nat)) return 'EU';
  if (['KSA', 'QAT', 'IRN', 'UZB'].includes(nat)) return 'AS';
  if (['JPN', 'KOR'].includes(nat)) return 'JK';
  if (['MAR', 'SEN', 'NGA', 'EGY', 'CMR', 'GHA', 'CIV', 'TUN'].includes(nat)) return 'AF';
  if (nat === 'MEX') return 'MX';
  if (nat === 'USA') return 'US';
  if (nat === 'ARG') return 'AR';
  return 'LA';
}

export function personName(rng: RNG, nat = 'ARG'): string {
  const reg = regionOf(nat);
  switch (reg) {
    case 'BR':
      return `${rng.pick(BR_FIRST)} ${rng.pick(BR_LAST)}`;
    case 'EU':
      return `${rng.pick(EU_FIRST)} ${rng.pick(EU_LAST)}`;
    case 'AS':
      return `${rng.pick(AS_FIRST)} ${rng.pick(AS_LAST)}`;
    case 'MX':
      return `${rng.pick(MX_FIRST)} ${rng.pick(MX_LAST)}`;
    case 'US':
      return `${rng.pick(US_FIRST)} ${rng.pick(US_LAST)}`;
    case 'JK':
      return `${rng.pick(JK_FIRST)} ${rng.pick(JK_LAST)}`;
    case 'AF':
      return `${rng.pick(AF_FIRST)} ${rng.pick(AF_LAST)}`;
    default:
      return `${rng.pick(AR_FIRST)} ${rng.pick(AR_LAST)}`;
  }
}

export function surname(rng: RNG) {
  return rng.pick(AR_LAST);
}

export const NATIONALITIES: { code: string; name: string }[] = [
  { code: 'ARG', name: 'Argentina' }, { code: 'URU', name: 'Uruguay' }, { code: 'CHI', name: 'Chile' }, { code: 'COL', name: 'Colombia' },
  { code: 'BRA', name: 'Brasil' }, { code: 'PAR', name: 'Paraguay' }, { code: 'MEX', name: 'México' }, { code: 'USA', name: 'Estados Unidos' },
  { code: 'ESP', name: 'España' }, { code: 'ITA', name: 'Italia' }, { code: 'ENG', name: 'Inglaterra' }, { code: 'GER', name: 'Alemania' },
  { code: 'FRA', name: 'Francia' }, { code: 'POR', name: 'Portugal' }, { code: 'KSA', name: 'Arabia Saudita' },
];
