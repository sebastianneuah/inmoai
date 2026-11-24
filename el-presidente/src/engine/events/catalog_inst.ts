// Acontecimientos institucionales: finanzas, patrocinadores, socios, hinchas, seguridad,
// infraestructura, prensa, crisis inesperadas y situaciones personales.
import { registerEvents, scaleMoney as sm, type Ctx, type EventDef } from './engine';
import { clamp } from '../util';
import { squad } from '../queries';
import { estimateRevenue } from '../valuation';
import { book } from '../economy';
import { addNews } from '../news';

const rev = (c: Ctx) => (c.club ? estimateRevenue(c.s, c.club) : 1_000_000);
const lowCash = (c: Ctx) => !!c.club && c.cash < rev(c) * 0.03;
const incident = (c: Ctx) => { c.s.flags.lastIncidentAbs = c.abs; };

const FINANZAS: EventDef[] = [
  {
    id: 'fin_tesorero_alerta', cat: 'finanzas', title: 'El tesorero enciende las alarmas', urg: 'urgente', sev: 4, cd: 10,
    text: '{char} te advierte que con la caja actual no alcanza para pagar los sueldos del mes próximo. "Presidente, hay que tomar medidas ya".',
    bind: { char: 'tesorero' }, when: (c) => lowCash(c), w: 4,
    opts: [
      { label: 'Pedir un adelanto de derechos de TV', out: 'La asociación adelantó fondos a cambio de un descuento futuro.', fx: { cash: (c) => rev(c) * 0.06, cat: 'tv', ind: { asociacion: -2 }, op: { assoc: -3 }, later: [{ w: [10, 20], fx: 'apply', params: { cash: 0, ind: { estabilidad: -3 }, news: 'La AAF descuenta el adelanto de TV a {club}', tone: 'neg' } }] } },
      { label: 'Aporte personal del presidente', out: 'Pusiste dinero de tu bolsillo.', req: (c) => c.s.president.wealth > rev(c) * 0.04, reqText: 'Patrimonio personal insuficiente', fx: { wealth: (c) => -rev(c) * 0.04, cash: (c) => rev(c) * 0.04, cat: 'aportes', ind: { socios: 4, comision: 3, integridad: 1 }, op: { char: 6 } } },
      { label: 'Vender un activo inmobiliario menor', out: 'Se vendió un terreno lindero.', fx: { cash: (c) => rev(c) * 0.05, cat: 'ventas', ind: { socios: -4, hinchas: -1 } } },
      { label: 'Postergar pagos a proveedores', auto: true, out: 'Se patea el problema.', fx: { fn: (c) => { c.club!.fin.payables += Math.round(rev(c) * 0.03); }, ind: { estabilidad: -3, empleados: -2 }, op: { char: -4 } } },
    ],
  },
  {
    id: 'fin_inversor_sad', cat: 'finanzas', title: 'Un fondo quiere invertir en el club', urg: 'importante', sev: 4, cd: 60,
    text: '{char} representa a un fondo internacional que ofrece {amount} a cambio de gerenciar el fútbol profesional durante diez años. Los socios históricos lo consideran una privatización encubierta.',
    bind: { char: 'empresario' }, amount: (c) => rev(c) * 0.6, when: (c) => (c.club?.division ?? 3) <= 2, w: 1.2,
    opts: [
      { label: 'Aceptar el gerenciamiento', out: 'Llega una inyección enorme de capital.', fx: { cash: (c) => c.amount, cat: 'aportes', ind: { socios: -15, hinchas: -6, estabilidad: 12, comision: -5, patrocinadores: 5 }, op: { char: 15, opposition: -10 }, flag: { gerenciado: true }, news: '{club} acepta un gerenciamiento: polémica entre los socios', tone: 'neg', later: [{ w: [30, 60], fx: 'investorReturn', p: 0.7 }] } },
      { label: 'Llevarlo a una asamblea de socios', out: 'Convocaste a asamblea.', fx: {}, risk: { p: 0.45, text: 'La asamblea aprobó un acuerdo parcial: llega la mitad del dinero sin ceder el control.', fx: { cash: (c) => c.amount * 0.4, cat: 'aportes', ind: { socios: 3, estabilidad: 5 } } } },
      { label: 'Rechazar: el club es de los socios', auto: true, out: 'Los socios te ovacionan.', fx: { ind: { socios: 6, hinchas: 3 }, op: { char: -8 } } },
    ],
  },
  {
    id: 'fin_inversor_exige', cat: 'finanzas', title: 'El fondo inversor exige resultados', chain: true, urg: 'importante', sev: 4,
    text: '{char} te recuerda que el fondo espera recuperar su inversión. Exige vender a las dos mejores figuras o recortar un 15% del presupuesto.',
    bind: { char: 'empresario' },
    opts: [
      { label: 'Recortar el presupuesto', out: 'Se recortan gastos.', fx: { ind: { jugadores: -4, empleados: -5, estabilidad: 4 }, flag: { recorte: true } } },
      { label: 'Romper el acuerdo y pagar la cláusula', out: 'Recuperaste el control a un alto precio.', fx: { cash: (c) => -rev(c) * 0.3, cat: 'indemnizaciones', ind: { socios: 8, estabilidad: -8 }, op: { char: -20 } } },
      { label: 'Ganar tiempo', auto: true, out: 'El fondo se impacienta.', fx: { op: { char: -8 }, ind: { estabilidad: -2 } } },
    ],
  },
  {
    id: 'fin_aumento_cuota', cat: 'finanzas', title: 'El tesorero propone aumentar la cuota', urg: 'informativo', sev: 2, cd: 25,
    text: '{char} sostiene que la inflación licuó la cuota social y propone un aumento del 20%. Recaudaría más, pero algunos socios podrían dejar de pagar.',
    bind: { char: 'tesorero' }, w: 1.5,
    opts: [
      { label: 'Aumentar 20%', out: 'Aumento aplicado.', fx: { fn: (c) => { c.s.economy.feeMult = Math.round((c.s.economy.feeMult * 1.2) * 100) / 100; }, ind: { socios: -5, estabilidad: 3 }, op: { char: 5 } } },
      { label: 'Aumentar 8% con beneficios', out: 'Aumento moderado con descuentos en la tienda.', fx: { fn: (c) => { c.s.economy.feeMult = Math.round((c.s.economy.feeMult * 1.08) * 100) / 100; }, ind: { socios: -1, estabilidad: 1 } } },
      { label: 'Congelar cuotas', auto: true, out: 'Las cuotas se mantienen.', fx: { ind: { socios: 3, estabilidad: -1 }, op: { char: -3 } } },
      { label: 'Prometer congelamiento por un año', out: 'Lo anunciaste en redes.', fx: { ind: { socios: 5 }, promise: { key: 'cuota', text: 'Congelar la cuota social por un año', weeks: 40, weight: 1 }, fn: (c) => { c.s.promises[c.s.promises.length - 1].target = c.s.economy.feeMult; } } },
    ],
  },
  {
    id: 'fin_proveedores', cat: 'finanzas', title: 'Proveedores reclaman deudas', urg: 'importante', sev: 3, cd: 14,
    text: 'Una empresa de seguridad y la concesionaria del catering reclaman {amount} adeudados. Amenazan con cortar el servicio antes del próximo partido de local.',
    amount: (c) => Math.max(sm(c, 120_000), c.club!.fin.payables * 0.5), when: (c) => (c.club?.fin.payables ?? 0) > 0 || lowCash(c), w: 2,
    opts: [
      { label: 'Pagar todo', out: 'Deuda saldada.', req: (c) => c.cash > c.amount, reqText: 'Caja insuficiente', fx: { cash: (c) => -c.amount, cat: 'servicios', fn: (c) => { c.club!.fin.payables = Math.max(0, c.club!.fin.payables - c.amount); }, ind: { estabilidad: 2, empleados: 1 } } },
      { label: 'Plan de pagos', auto: true, out: 'Aceptaron cobrar en cuotas con intereses.', fx: { cash: (c) => -c.amount * 0.25, cat: 'servicios', fn: (c) => { c.club!.fin.payables = Math.max(0, c.club!.fin.payables - c.amount * 0.25) + c.amount * 0.1; } } },
      { label: 'Cambiar de proveedores', out: 'Contrataste a otras empresas.', fx: { ind: { empleados: -2 } }, risk: { p: 0.35, text: 'Los proveedores iniciaron acciones judiciales.', fx: { ind: { riesgo: 4, periodistas: -2 } } } },
    ],
  },
  {
    id: 'fin_inspeccion_fiscal', cat: 'finanzas', title: 'Inspección de la agencia tributaria', urg: 'importante', sev: 4, cd: 40,
    text: 'La agencia tributaria inicia una inspección sobre los pagos a jugadores e intermediarios de las últimas temporadas. Podría haber una multa de hasta {amount}.',
    amount: (c) => sm(c, 900_000), when: (c) => c.ind.riesgo > 30 || c.rng.chance(0.3), w: 1.2,
    opts: [
      { label: 'Colaborar con total transparencia', out: 'Abriste los libros.', fx: { ind: { integridad: 4 } }, risk: { p: (c) => c.ind.riesgo / 120, text: 'Encontraron irregularidades de gestiones anteriores y la multa fue de {amount}.', fx: { cash: (c) => -c.amount, cat: 'multas', ind: { riesgo: 3 } } } },
      { label: 'Contratar un estudio contable de primer nivel', out: 'Un estudio prestigioso se hace cargo.', fx: { cash: (c) => -c.amount * 0.15, cat: 'servicios', ind: { riesgo: -5 } } },
      { label: 'Activar contactos políticos', out: 'Llamaste a quien había que llamar.', fx: { ind: { riesgo: 6, influencia: -2, integridad: -4 }, later: [{ w: [10, 30], fx: 'investigationCheck', params: { reason: 'presunto tráfico de influencias', extra: 0.1 } }] } },
      { label: 'Esperar los resultados', auto: true, out: 'La inspección sigue su curso.', fx: {}, risk: { p: 0.4, text: 'La multa fue de {amount}.', fx: { cash: (c) => -c.amount * 0.6, cat: 'multas' } } },
    ],
  },
  {
    id: 'fin_terceros_pases', cat: 'finanzas', title: 'Ofrecen comprar porcentajes de pases', urg: 'informativo', sev: 2, cd: 30,
    text: '{char} ofrece {amount} por el 30% de los derechos económicos de tres juveniles. Es dinero rápido, pero cuando se vendan el club cobrará mucho menos.',
    bind: { char: 'empresario' }, amount: (c) => sm(c, 900_000), w: 1.3,
    opts: [
      { label: 'Aceptar', out: 'Ingresa dinero a la caja.', fx: { cash: (c) => c.amount, cat: 'ventas', ind: { estabilidad: 3, socios: -2, integridad: -2 }, op: { char: 8 }, fn: (c) => { for (const p of squad(c.s, c.club!.id).filter((x) => x.age <= 21).slice(0, 3)) c.s.flags[`thirdParty_${p.id}`] = 0.3; } } },
      { label: 'Ofrecer sólo un 15%', out: 'Contraoferta enviada.', fx: { op: { char: -1 } }, risk: { p: 0.5, text: 'Aceptaron por la mitad del dinero.', fx: { cash: (c) => c.amount * 0.5, cat: 'ventas' } } },
      { label: 'Rechazar', auto: true, out: 'Los juveniles son del club.', fx: { ind: { socios: 2 }, op: { char: -3 } } },
    ],
  },
  {
    id: 'fin_banco_refinancia', cat: 'finanzas', title: 'El banco ofrece refinanciar la deuda', urg: 'informativo', sev: 2, cd: 30,
    text: 'Un banco ofrece unificar todas las deudas del club a una tasa menor a cambio de garantías sobre los ingresos de TV.',
    when: (c) => c.s.loans.length > 0, w: 1.5,
    opts: [
      { label: 'Aceptar y unificar', out: 'Deuda refinanciada.', fx: { fn: (c) => { for (const l of c.s.loans) { l.rate = Math.max(0.07, l.rate - 0.03); l.weeksLeft += 30; l.payment = (l.balance * (1 + l.rate)) / l.weeksLeft; } }, ind: { estabilidad: 4, asociacion: -1 } } },
      { label: 'Negociar mejores condiciones', out: 'Pediste más.', fx: {}, risk: { p: 0.4, text: 'Conseguiste una tasa todavía menor.', fx: { fn: (c) => { for (const l of c.s.loans) l.rate = Math.max(0.06, l.rate - 0.05); }, ind: { estabilidad: 5 } } } },
      { label: 'Mantener las condiciones actuales', auto: true, out: 'Nada cambia.', fx: {} },
    ],
  },
];

const PATROCINIO: EventDef[] = [
  {
    id: 'spo_apuestas_mega', cat: 'patrocinadores', title: 'Una casa de apuestas ofrece una fortuna', urg: 'importante', sev: 3, cd: 40,
    text: '{company} ofrece {amount} por año para ser sponsor principal durante tres temporadas. Duplica cualquier otra oferta, pero agrupaciones de socios ya anticipan protestas.',
    bind: { company: 'controversial' }, amount: (c) => sm(c, 3_000_000), w: 1.3,
    opts: [
      { label: 'Firmar', out: 'Llega el dinero, llegan las críticas.', fx: { fn: (c) => { const old = c.s.sponsors.find((x) => x.slot === 'principal'); if (old) c.s.sponsors = c.s.sponsors.filter((x) => x !== old); c.s.sponsors.push({ id: `sc_${c.abs}_${c.company!.id}`, companyId: c.company!.id, slot: 'principal', annual: c.amount, until: c.s.season + 2, bonus: c.amount * 0.1, penalty: c.amount * 0.4, signedSeason: c.s.season }); return old ? 'Se rescindió el acuerdo anterior.' : undefined; }, ind: { socios: -7, integridad: -5, estabilidad: 5, periodistas: -2 }, news: '{company} desembarca como sponsor de {club}', tone: 'neu' } },
      { label: 'Aceptar con cláusula de responsabilidad social', out: 'Firmaste por menos dinero, con campañas de juego responsable.', fx: { fn: (c) => { if (c.s.sponsors.some((x) => x.slot === 'principal')) return 'El espacio principal estaba ocupado: el acuerdo quedó como regional.'; c.s.sponsors.push({ id: `sc_${c.abs}_${c.company!.id}`, companyId: c.company!.id, slot: 'principal', annual: c.amount * 0.75, until: c.s.season + 2, bonus: 0, penalty: c.amount * 0.2, signedSeason: c.s.season }); }, ind: { socios: -3, integridad: -1, estabilidad: 3 } } },
      { label: 'Rechazar', auto: true, out: 'Rechazaste la oferta.', fx: { ind: { integridad: 3, socios: 2 } } },
    ],
  },
  {
    id: 'spo_amenaza_irse', cat: 'patrocinadores', title: '{company} amenaza con irse', urg: 'importante', sev: 3, cd: 20,
    text: '{company} está disconforme con la imagen del club y los resultados. Pide una compensación de visibilidad o rescindirá el acuerdo.',
    bind: { company: 'sponsor_current' }, when: (c) => c.ind.patrocinadores < 50 || c.ind.prestigio < 40, w: 2,
    opts: [
      { label: 'Ofrecer más visibilidad y activaciones', out: 'Se comprometió más presencia de marca.', fx: { ind: { patrocinadores: 6, hinchas: -1 }, cash: (c) => -sm(c, 50_000), cat: 'otros' } },
      { label: 'Bajar el precio del contrato 15%', out: 'Se renegoció a la baja.', fx: { fn: (c) => { const sc = c.s.sponsors.find((x) => x.companyId === c.company!.id); if (sc) sc.annual = Math.round(sc.annual * 0.85); }, ind: { patrocinadores: 4, estabilidad: -1 } } },
      { label: 'Que se vaya', auto: true, out: 'El patrocinador rescindió.', fx: { fn: (c) => { const sc = c.s.sponsors.find((x) => x.companyId === c.company!.id); if (sc) { book(c.s, 'patrocinio', sc.penalty * 0.5); c.s.sponsors = c.s.sponsors.filter((x) => x !== sc); } }, ind: { patrocinadores: -4, estabilidad: -3 } } },
    ],
  },
  {
    id: 'spo_cambio_camiseta', cat: 'patrocinadores', title: '{company} quiere cambiar los colores de la camiseta alternativa', urg: 'informativo', sev: 2, cd: 30,
    text: '{company} propone una camiseta alternativa con los colores de su marca y ofrece {amount} extra. Los tradicionalistas consideran que es una falta de respeto a la historia.',
    bind: { company: 'sponsor_current' }, amount: (c) => sm(c, 250_000), w: 1.2,
    opts: [
      { label: 'Aceptar', out: 'Nueva camiseta alternativa.', fx: { cash: (c) => c.amount, cat: 'patrocinio', ind: { hinchas: -4, socios: -2, patrocinadores: 4 } } },
      { label: 'Consultar a los socios en una encuesta', out: 'Encuesta abierta.', fx: { ind: { socios: 2 } }, risk: { p: 0.5, text: 'Los socios aprobaron un diseño intermedio y el patrocinador pagó igual.', fx: { cash: (c) => c.amount * 0.7, cat: 'patrocinio' } } },
      { label: 'Rechazar: los colores no se negocian', auto: true, out: 'Los hinchas lo celebran.', fx: { ind: { hinchas: 4, patrocinadores: -3 } } },
    ],
  },
  {
    id: 'spo_escandalo_empresa', cat: 'patrocinadores', title: 'Tu sponsor, envuelto en un escándalo', urg: 'importante', sev: 3, cd: 30,
    text: 'Una investigación periodística vincula a {company} con un caso de evasión millonaria. Los medios preguntan si el club mantendrá su camiseta.',
    bind: { company: 'sponsor_current' }, w: 1,
    opts: [
      { label: 'Rescindir inmediatamente', out: 'Rompiste el vínculo.', fx: { fn: (c) => { c.s.sponsors = c.s.sponsors.filter((x) => x.companyId !== c.company!.id); }, ind: { integridad: 5, estabilidad: -4, periodistas: 3 } } },
      { label: 'Esperar a la Justicia', auto: true, out: 'Sostenés el contrato.', fx: { ind: { integridad: -3, periodistas: -2 } } },
      { label: 'Respaldar a la empresa', out: 'Defendiste al sponsor.', fx: { ind: { integridad: -6, patrocinadores: 4, riesgo: 3 } } },
    ],
  },
  {
    id: 'spo_naming', cat: 'patrocinadores', title: 'Ofrecen comprar el nombre del estadio', urg: 'importante', sev: 3, cd: 50,
    text: '{company} ofrece {amount} anuales por cinco años para rebautizar {stadium}. Para muchos hinchas, el nombre del estadio es sagrado.',
    bind: { company: 'any' }, amount: (c) => sm(c, 1_400_000), when: (c) => !c.s.sponsors.some((x) => x.slot === 'naming') && (c.club?.division ?? 3) <= 2, w: 1,
    opts: [
      { label: 'Vender el nombre', out: 'El estadio tendrá nombre comercial.', fx: { fn: (c) => { c.s.sponsors.push({ id: `sc_n_${c.abs}`, companyId: c.company!.id, slot: 'naming', annual: c.amount, until: c.s.season + 4, bonus: 0, penalty: c.amount * 0.5, signedSeason: c.s.season }); }, ind: { hinchas: -8, socios: -5, estabilidad: 6 } } },
      { label: 'Ofrecer un "nombre compartido"', out: 'Nombre histórico + marca.', fx: { fn: (c) => { c.s.sponsors.push({ id: `sc_n_${c.abs}`, companyId: c.company!.id, slot: 'naming', annual: c.amount * 0.6, until: c.s.season + 4, bonus: 0, penalty: c.amount * 0.3, signedSeason: c.s.season }); }, ind: { hinchas: -3, estabilidad: 3 } } },
      { label: 'Rechazar', auto: true, out: 'El nombre no se vende.', fx: { ind: { hinchas: 4, socios: 2 } } },
    ],
  },
  {
    id: 'spo_favor_indebido', cat: 'patrocinadores', title: '{company} pide un favor especial', urg: 'importante', sev: 3, cd: 30,
    text: 'El gerente de {company} sugiere que renovará el contrato si el club contrata a una empresa vinculada a él para las obras del estadio, sin licitación.',
    bind: { company: 'sponsor_current' }, w: 1,
    opts: [
      { label: 'Aceptar el arreglo', out: 'El sponsor renueva y suma dinero.', fx: { cash: (c) => sm(c, 400_000), cat: 'patrocinio', ind: { integridad: -6, riesgo: 8, patrocinadores: 6 }, later: [{ w: [15, 45], fx: 'investigationCheck', params: { reason: 'contrataciones sin licitación' } }] } },
      { label: 'Exigir licitación pública', auto: true, out: 'Licitación abierta.', fx: { ind: { integridad: 4, patrocinadores: -3 } } },
      { label: 'Denunciar el intento', out: 'Hiciste pública la presión.', fx: { ind: { integridad: 7, periodistas: 4, patrocinadores: -8 }, fn: (c) => { c.s.sponsors = c.s.sponsors.filter((x) => x.companyId !== c.company!.id); } } },
    ],
  },
];

const SOCIOS: EventDef[] = [
  {
    id: 'soc_asamblea_extraordinaria', cat: 'socios', title: 'Piden una asamblea extraordinaria', urg: 'importante', sev: 4, cd: 30,
    text: 'Más de mil socios firmaron un petitorio encabezado por {char} para convocar una asamblea extraordinaria y "revisar la gestión". La oposición se frota las manos.',
    bind: { char: 'opositor' }, when: (c) => c.ind.socios < 42, w: 3,
    opts: [
      { label: 'Convocarla y dar la cara', out: 'Fuiste a la asamblea.', fx: { ind: { integridad: 3 } }, risk: { p: (c) => 0.25 + (50 - c.ind.socios) / 100, text: 'La asamblea votó un pedido de informes y una auditoría externa.', fx: { ind: { socios: -2, comision: -3, riesgo: 3 } } } },
      { label: 'Presentar un balance y un plan de gestión', out: 'Presentaste números y proyectos.', fx: { ind: { socios: 4, comision: 2 }, fn: (c) => { c.s.flags.balancePublishedAbs = c.abs; } } },
      { label: 'Rechazar por cuestiones formales', auto: true, out: 'La comisión rechazó el pedido.', fx: { ind: { socios: -6, gobernabilidad: -3 }, op: { char: -10 }, later: [{ w: [4, 10], fx: 'revenge', params: { news: '{char} denuncia autoritarismo en {club}' } }] } },
    ],
  },
  {
    id: 'soc_transparencia', cat: 'socios', title: 'Los socios exigen transparencia', urg: 'informativo', sev: 2, cd: 20,
    text: 'Una agrupación de socios exige publicar los contratos de jugadores y los honorarios de representantes. {char} dice que "el que nada hace, nada teme".',
    bind: { char: 'lider_socios' }, w: 1.8,
    opts: [
      { label: 'Publicar todo en la web del club', out: 'Política de transparencia total.', fx: { ind: { integridad: 6, socios: 4, representantes: -5 }, fn: (c) => { c.s.flags.balancePublishedAbs = c.abs; } } },
      { label: 'Publicar un resumen', auto: true, out: 'Información parcial.', fx: { ind: { integridad: 2, socios: 1 } } },
      { label: 'Negarse por confidencialidad', out: 'Los contratos no se publican.', fx: { ind: { integridad: -3, socios: -3, representantes: 3 } } },
    ],
  },
  {
    id: 'soc_padron', cat: 'socios', title: 'Afiliaciones masivas sospechosas', urg: 'importante', sev: 3, cd: 40,
    text: 'Se detectó la afiliación de 2.000 socios en una semana, pagados por un mismo grupo. {char} asegura que "es militancia genuina". Las elecciones no están lejos.',
    bind: { char: 'vicepresidente' }, when: (c) => !!c.club && c.club.nextElection - c.s.season <= 1, w: 2,
    opts: [
      { label: 'Aceptarlos: son votos propios', out: 'Los nuevos socios entran al padrón.', fx: { ind: { integridad: -6, riesgo: 5 }, flag: { padronInflado: true }, op: { char: 6 } } },
      { label: 'Auditar el padrón', auto: true, out: 'Se revisará cada afiliación.', fx: { ind: { integridad: 4, socios: 2 }, op: { char: -6 } } },
      { label: 'Denunciarlo públicamente', out: 'La denuncia sacude la campaña.', fx: { ind: { integridad: 6, periodistas: 2 }, op: { char: -15 }, mem: 'Lo expusiste por las afiliaciones' } },
    ],
  },
  {
    id: 'soc_obras_reclamo', cat: 'socios', title: 'Los socios reclaman obras', urg: 'informativo', sev: 2, cd: 25,
    text: 'Los socios se quejan del estado de la sede social: vestuarios rotos, pileta cerrada y goteras. Piden un plan de obras.',
    when: (c) => (c.club?.facilities.social ?? 5) <= 3, w: 1.8,
    opts: [
      { label: 'Prometer obras para este año', out: 'Lo anunciaste.', fx: { ind: { socios: 5 }, promise: { key: 'obra', text: 'Iniciar obras en el club este año', weeks: 25, weight: 1 } } },
      { label: 'Reparaciones urgentes inmediatas', out: 'Se arreglan lo más urgente.', fx: { cash: (c) => -sm(c, 150_000), cat: 'mantenimiento', ind: { socios: 3, empleados: 1 } } },
      { label: 'Explicar que no hay presupuesto', auto: true, out: 'Los socios no quedan conformes.', fx: { ind: { socios: -3 } } },
    ],
  },
  {
    id: 'soc_venta_figura_protesta', cat: 'socios', title: 'Movilización contra la venta de figuras', urg: 'importante', sev: 3, cd: 20,
    text: 'Cientos de socios se movilizan a la sede con carteles: "El club no es un supermercado". Exigen que no se vendan más figuras.',
    when: (c) => Number(c.s.flags.lastStarSaleAbs ?? -99) >= c.abs - 3, w: 6,
    opts: [
      { label: 'Prometer que no se venden más figuras esta temporada', out: 'Asumiste el compromiso.', fx: { ind: { socios: 5, hinchas: 4 }, promise: { key: 'no_vender_figura', text: 'No vender más figuras esta temporada', weeks: 20, weight: 1.2 } } },
      { label: 'Explicar las razones económicas', auto: true, out: 'Explicaste los números.', fx: { ind: { socios: -1, integridad: 1 } } },
      { label: 'Ignorar la protesta', out: 'La protesta crece en redes.', fx: { ind: { socios: -5, hinchas: -4 } } },
    ],
  },
];

const HINCHAS: EventDef[] = [
  {
    id: 'hin_precio_entradas', cat: 'hinchas', title: 'Reclamo por el precio de las entradas', urg: 'informativo', sev: 2, cd: 15,
    text: 'Los hinchas inundan las redes con el hashtag #EntradasImpagables. Comparan los precios con los de otros clubes y piden una rebaja.',
    when: (c) => c.s.economy.ticketMult > 1.05, w: 3,
    opts: [
      { label: 'Bajar precios 15%', out: 'Precios rebajados.', fx: { fn: (c) => { c.s.economy.ticketMult = Math.max(0.5, Math.round(c.s.economy.ticketMult * 0.85 * 100) / 100); }, ind: { hinchas: 5 } } },
      { label: 'Entradas populares para menores y jubilados', out: 'Se crea un cupo popular.', fx: { ind: { hinchas: 3, socios: 1 } } },
      { label: 'Mantener: el club necesita recaudar', auto: true, out: 'Los precios no cambian.', fx: { ind: { hinchas: -4 } } },
    ],
  },
  {
    id: 'hin_campana_digital', cat: 'hinchas', title: 'Campaña viral contra la dirigencia', urg: 'importante', sev: 3, cd: 18,
    text: 'Un video que se burla de tu gestión supera el millón de reproducciones. Los hinchas digitales, cada vez más influyentes, piden respuestas.',
    when: (c) => c.ind.hinchas < 45, w: 2,
    opts: [
      { label: 'Responder con humor', out: 'Tu respuesta se volvió viral.', fx: {}, risk: { p: 0.55, text: 'Te ganaste a parte del público digital.', fx: { ind: { hinchas: 5, periodistas: 2 } } } },
      { label: 'Contratar una agencia de comunicación', out: 'Profesionalizaste la comunicación.', fx: { cash: (c) => -sm(c, 80_000), cat: 'servicios', ind: { hinchas: 3, periodistas: 2 } } },
      { label: 'Ignorar', auto: true, out: 'El tema se apaga solo... o no.', fx: { ind: { hinchas: -2 } } },
    ],
  },
  {
    id: 'hin_banderazo', cat: 'hinchas', title: 'Banderazo de apoyo', urg: 'informativo', sev: 1, cd: 25,
    text: 'Miles de hinchas organizan un banderazo para alentar al equipo antes de enfrentar a {next}. Piden que el club abra el estadio.',
    when: (c) => c.ind.hinchas >= 55, w: 1.5,
    opts: [
      { label: 'Abrir el estadio', out: 'Fiesta en las tribunas.', fx: { cash: (c) => -sm(c, 30_000), cat: 'seguridad', ind: { hinchas: 4, jugadores: 3 }, morale: 4 } },
      { label: 'Saludo del plantel en la puerta', auto: true, out: 'Los jugadores saludaron a la gente.', fx: { ind: { hinchas: 2 }, morale: 2 } },
      { label: 'No autorizar por seguridad', out: 'No se abre el estadio.', fx: { ind: { hinchas: -3 } } },
    ],
  },
  {
    id: 'hin_pena_reconocimiento', cat: 'hinchas', title: 'La peña más grande pide reconocimiento', urg: 'informativo', sev: 1, cd: 30,
    text: '{char}, referente de la peña más grande del país, pide que el club la reconozca oficialmente y le ceda un espacio en la sede.',
    bind: { char: 'referente_hinchas' }, w: 1.2,
    opts: [
      { label: 'Reconocerla oficialmente', out: 'Peña reconocida.', fx: { ind: { hinchas: 3, socios: 2 }, op: { char: 10 } } },
      { label: 'Reconocerla sin ceder espacios', auto: true, out: 'Reconocimiento simbólico.', fx: { ind: { hinchas: 1 }, op: { char: 3 } } },
      { label: 'No', out: 'La peña se siente ninguneada.', fx: { ind: { hinchas: -2 }, op: { char: -8 } } },
    ],
  },
];

const SEGURIDAD: EventDef[] = [
  {
    id: 'seg_barra_entradas', cat: 'seguridad', title: 'La barra exige entradas', urg: 'urgente', sev: 4, cd: 10,
    text: '{char} exige 600 entradas gratis por partido y micros para los viajes. "Siempre fue así, presidente". Si no hay acuerdo, advierte, "puede haber problemas".',
    bind: { char: 'lider_barra' }, w: 2.5,
    opts: [
      { label: 'Ceder las entradas', out: 'Hay paz... por ahora.', fx: { ind: { barra: 8, integridad: -5, riesgo: 6, hinchas: -1 }, op: { char: 12 }, mem: 'Le diste entradas', cash: (c) => -sm(c, 60_000), cat: 'entradas', later: [{ w: [10, 30], ev: 'seg_barra_extorsion', p: 0.45 }] } },
      { label: 'Negociar la mitad', out: 'Acuerdo parcial.', fx: { ind: { barra: 2, integridad: -2, riesgo: 2 }, op: { char: 3 } } },
      { label: 'Negarse y reforzar la seguridad', out: 'Te plantaste.', fx: { ind: { barra: -12, integridad: 5, periodistas: 3 }, op: { char: -20 }, cash: (c) => -sm(c, 80_000), cat: 'seguridad', mem: 'Le negaste las entradas', later: [{ w: [1, 6], ev: 'seg_incidentes', p: 0.55 }] } },
      { label: 'Denunciar la extorsión ante la Justicia', auto: false, out: 'Presentaste una denuncia penal.', fx: { ind: { barra: -20, integridad: 9, periodistas: 5, socios: 3 }, op: { char: -40 }, mem: 'Lo denunciaste ante la Justicia', later: [{ w: [1, 4], ev: 'seg_amenaza_personal', p: 0.5 }] } },
      { label: 'Delegar en el vicepresidente', auto: true, out: 'El vicepresidente negoció en silencio.', fx: { ind: { barra: 3, riesgo: 3 }, op: { vice: 2 } } },
    ],
  },
  {
    id: 'seg_barra_extorsion', cat: 'seguridad', title: 'La barra pide más', chain: true, urg: 'urgente', sev: 4,
    text: '{char} vuelve a la carga: ahora quiere manejar los estacionamientos del estadio y un "aporte" mensual. Recuerda que ya le cediste antes.',
    bind: { char: 'lider_barra' },
    opts: [
      { label: 'Ceder', out: 'La barra crece en poder.', fx: { ind: { barra: 6, integridad: -8, riesgo: 10 }, cash: (c) => -sm(c, 100_000), cat: 'otros', later: [{ w: [10, 25], fx: 'investigationCheck', params: { reason: 'vínculos con la barra', extra: 0.15 } }] } },
      { label: 'Cortar todos los beneficios', out: 'Ruptura total.', fx: { ind: { barra: -25, integridad: 6 }, op: { char: -30 }, later: [{ w: [1, 4], ev: 'seg_incidentes', p: 0.7 }] } },
      { label: 'Ganar tiempo', auto: true, out: 'Postergaste la respuesta.', fx: { ind: { barra: -3 } } },
    ],
  },
  {
    id: 'seg_incidentes', cat: 'seguridad', title: 'Incidentes en el estadio', urg: 'urgente', sev: 4, cd: 8,
    text: 'Hubo enfrentamientos en la tribuna durante el partido. La policía detuvo a varios hinchas y la asociación abrió un expediente. Los medios muestran imágenes de violencia.',
    when: (c) => c.ind.barra < 30 || c.rng.chance(0.25), w: 1.4,
    opts: [
      { label: 'Identificar y sancionar a los violentos', out: 'Derecho de admisión para los responsables.', fx: { fn: incident, ind: { integridad: 4, barra: -6, periodistas: 2 }, op: { barra: -10 }, later: [{ w: [1, 3], fx: 'sanction', p: 0.5, params: { fine: 0, reason: 'incidentes en el estadio (sanción reducida por colaboración)' } }] } },
      { label: 'Minimizar lo sucedido', auto: true, out: 'Hablaste de "hechos aislados".', fx: { fn: incident, ind: { integridad: -3, periodistas: -3 }, later: [{ w: [1, 3], fx: 'sanction', params: { reason: 'incidentes en el estadio', points: 0, ind: { hinchas: -2 } } }] } },
      { label: 'Jugar a puertas cerradas voluntariamente', out: 'El próximo partido será sin público.', fx: { fn: incident, ind: { integridad: 5, hinchas: -4 }, cash: (c) => -sm(c, 200_000), cat: 'entradas' } },
    ],
  },
  {
    id: 'seg_amenaza_personal', cat: 'seguridad', title: 'Amenazas contra tu familia', chain: true, urg: 'urgente', sev: 5, pos: ['any'],
    text: 'Aparecieron pintadas con amenazas frente a tu casa. Todo apunta al entorno de la barra que denunciaste. Tu familia está asustada.',
    opts: [
      { label: 'Custodia privada y seguir adelante', out: 'Contrataste custodia personal.', fx: { wealth: -150_000, ind: { integridad: 3, socios: 4, periodistas: 3 } } },
      { label: 'Hacerlo público', auto: true, out: 'La sociedad se solidariza.', fx: { ind: { socios: 6, periodistas: 5, repNacional: 3 } } },
      { label: 'Buscar un acuerdo discreto', out: 'Mandaste a negociar una tregua.', fx: { ind: { integridad: -6, riesgo: 6, barra: 10 } } },
    ],
  },
  {
    id: 'seg_clausura', cat: 'seguridad', title: 'Riesgo de clausura del estadio', urg: 'importante', sev: 3, cd: 40,
    text: 'Una inspección municipal detectó fallas graves en una tribuna. Sin obras por {amount}, el estadio podría ser clausurado parcialmente.',
    amount: (c) => sm(c, 500_000), when: (c) => (c.club?.facilities.estadio ?? 5) <= 3, w: 1.2,
    opts: [
      { label: 'Hacer las obras de inmediato', out: 'Obras de seguridad realizadas.', req: (c) => c.cash > c.amount, reqText: 'Caja insuficiente', fx: { cash: (c) => -c.amount, cat: 'obras', ind: { integridad: 3, socios: 2 } } },
      { label: 'Pedir una prórroga al intendente', out: 'Llamaste al intendente.', fx: { ind: { influencia: -1 } }, risk: { p: 0.4, text: 'No hubo prórroga: se clausuró una tribuna por cuatro semanas.', fx: { cash: (c) => -sm(c, 250_000), cat: 'entradas', ind: { hinchas: -4 } } } },
      { label: 'Clausura voluntaria de la tribuna', auto: true, out: 'Se cerró la tribuna afectada.', fx: { fn: (c) => { c.club!.stadium.capacity = Math.round(c.club!.stadium.capacity * 0.9); }, ind: { hinchas: -3 } } },
    ],
  },
];

const INFRA: EventDef[] = [
  {
    id: 'inf_sobrecosto', cat: 'infraestructura', title: 'Sobrecostos en la obra', urg: 'importante', sev: 3, cd: 12,
    text: 'La constructora informa que la obra en curso necesita {amount} adicionales por aumento de materiales. Sin ese dinero, se paraliza.',
    amount: (c) => (c.s.projects[0]?.cost ?? 0) * 0.2, when: (c) => c.s.projects.length > 0, w: 2.5,
    opts: [
      { label: 'Pagar el sobrecosto', out: 'La obra sigue en marcha.', req: (c) => c.cash > c.amount, reqText: 'Caja insuficiente', fx: { cash: (c) => -c.amount, cat: 'obras', ind: { estabilidad: -2 } } },
      { label: 'Renegociar con la constructora', out: 'Negociaste.', fx: {}, risk: { p: 0.5, text: 'Sin acuerdo: la obra se demora ocho semanas.', fx: { fn: (c) => { if (c.s.projects[0]) { c.s.projects[0].weeksLeft += 8; c.s.projects[0].delayed = true; } }, ind: { socios: -2 } } } },
      { label: 'Paralizar la obra temporalmente', auto: true, out: 'La obra queda en pausa.', fx: { fn: (c) => { if (c.s.projects[0]) { c.s.projects[0].weeksLeft += 12; c.s.projects[0].delayed = true; } }, ind: { socios: -4 } } },
    ],
  },
  {
    id: 'inf_proveedor_quiebra', cat: 'infraestructura', title: 'Quebró un proveedor de la obra', urg: 'importante', sev: 3, cd: 30,
    text: 'La empresa que proveía estructuras metálicas quebró. Hay que contratar a otra urgente o aceptar una demora.',
    when: (c) => c.s.projects.length > 0, w: 1.2,
    opts: [
      { label: 'Contratar a la más cara pero confiable', out: 'Se reemplazó al proveedor.', fx: { cash: (c) => -(c.s.projects[0]?.cost ?? 0) * 0.08, cat: 'obras' } },
      { label: 'Contratación directa a un conocido', out: 'Contrataste rápido y sin licitar.', fx: { ind: { integridad: -3, riesgo: 4 } } },
      { label: 'Aceptar la demora', auto: true, out: 'La obra se atrasa.', fx: { fn: (c) => { if (c.s.projects[0]) c.s.projects[0].weeksLeft += 6; } } },
    ],
  },
  {
    id: 'inf_financiacion_estadio', cat: 'infraestructura', title: 'Ofrecen financiar un estadio nuevo', urg: 'importante', sev: 4, cd: 80,
    text: '{char} propone construir un estadio moderno a cambio de explotar comercialmente el predio actual durante 30 años. El club no pondría dinero.',
    bind: { char: 'empresario' }, when: (c) => (c.club?.facilities.estadio ?? 5) <= 3 && (c.club?.division ?? 3) <= 2, w: 0.8,
    opts: [
      { label: 'Aceptar el proyecto', out: 'Comienza el proyecto del nuevo estadio.', fx: { fn: (c) => { c.club!.facilities.estadio = Math.min(5, c.club!.facilities.estadio + 2); c.club!.stadium.capacity = Math.round(c.club!.stadium.capacity * 1.3); }, ind: { socios: -6, hinchas: 5, integridad: -3, repNacional: 4 }, op: { char: 15 }, news: '{club} tendrá estadio nuevo: polémica por la cesión del predio', tone: 'neu' } },
      { label: 'Negociar una cesión por 15 años', out: 'Contrapropuesta enviada.', fx: { op: { char: -2 } }, risk: { p: 0.45, text: 'Aceptó: el estadio se amplía con un acuerdo más corto.', fx: { fn: (c) => { c.club!.facilities.estadio = Math.min(5, c.club!.facilities.estadio + 1); c.club!.stadium.capacity = Math.round(c.club!.stadium.capacity * 1.15); }, ind: { socios: 2, repNacional: 2 } } } },
      { label: 'Rechazar', auto: true, out: 'El predio sigue siendo del club.', fx: { ind: { socios: 3 } } },
    ],
  },
  {
    id: 'inf_vecinos', cat: 'infraestructura', title: 'Los vecinos se oponen a la obra', urg: 'informativo', sev: 2, cd: 30,
    text: 'Una asociación vecinal presentó un amparo contra la obra del club por ruidos y tránsito. El intendente pide "consenso".',
    when: (c) => c.s.projects.length > 0, w: 1.2,
    opts: [
      { label: 'Compensaciones al barrio', out: 'El club financia mejoras barriales.', fx: { cash: (c) => -sm(c, 100_000), cat: 'obras', ind: { repNacional: 2, influencia: 1 } } },
      { label: 'Litigar', auto: true, out: 'El tema se judicializa.', fx: { fn: (c) => { if (c.s.projects[0]) c.s.projects[0].weeksLeft += 4; } } },
      { label: 'Usar contactos políticos', out: 'Se destrabó en dos días.', fx: { ind: { integridad: -2, influencia: -2 } } },
    ],
  },
];

const PRENSA: EventDef[] = [
  {
    id: 'pre_entrevista', cat: 'prensa', title: '{char} pide una entrevista', urg: 'informativo', sev: 2, cd: 6,
    text: '{char} ({chartitle}) quiere una entrevista exclusiva sobre la actualidad del club, que está {position} en {division}. ¿Qué tono elegís?',
    bind: { char: 'periodista' }, w: 3, pos: ['club', 'asociacion', 'confederacion', 'fifa'],
    opts: [
      { label: 'Optimista: "Vamos por todo"', out: 'Titular grande y expectativas altas.', fx: { ind: { hinchas: 3, socios: 2 }, op: { char: 3 }, later: [{ w: [8, 12], fx: 'apply', p: 0.5, params: { ind: { periodistas: -2 }, news: 'Le recuerdan a {president} su promesa de "ir por todo"', tone: 'neg' } }] } },
      { label: 'Autocrítico y transparente', out: 'Entrevista elogiada por su honestidad.', fx: { ind: { integridad: 2, periodistas: 2 }, op: { char: 6 } } },
      { label: 'Atacar a la oposición', out: 'Encendiste la interna.', fx: { ind: { socios: -1, gobernabilidad: -1 }, op: { char: 2, opposition: -10 } } },
      { label: 'Declinar la entrevista', auto: true, out: 'No hubo nota.', fx: { op: { char: -4 } } },
    ],
  },
  {
    id: 'pre_rumor_falso', cat: 'prensa', title: 'Rumor falso en los medios', urg: 'importante', sev: 3, cd: 14,
    text: '{char} publicó que el club tiene una deuda oculta millonaria y que "el presidente lo esconde". La noticia es falsa, pero se viraliza.',
    bind: { char: 'periodista' }, w: 1.8,
    opts: [
      { label: 'Desmentir con documentación', out: 'Publicaste los balances.', fx: { ind: { integridad: 3, periodistas: 1 }, op: { char: -4 }, fn: (c) => { c.s.flags.balancePublishedAbs = c.abs; } } },
      { label: 'Iniciar acciones legales', out: 'Demandaste al periodista.', fx: { ind: { periodistas: -4, socios: 1 }, op: { char: -25, journalists: -3 }, mem: 'Lo demandaste' } },
      { label: 'No responder', auto: true, out: 'El rumor se instala.', fx: { ind: { socios: -3, patrocinadores: -2 } } },
    ],
  },
  {
    id: 'pre_filtracion_chats', cat: 'prensa', title: 'Se filtraron chats de la comisión', urg: 'urgente', sev: 4, cd: 30,
    text: 'Un portal publicó chats internos donde un dirigente cercano a vos, {char}, habla de "arreglar" a periodistas. Los medios piden tu renuncia o explicaciones.',
    bind: { char: 'vocal' }, when: (c) => c.ind.integridad < 60, w: 1.2,
    opts: [
      { label: 'Pedirle la renuncia a {char}', out: 'El dirigente renunció.', fx: { ind: { integridad: 4, comision: -3 }, op: { char: -30 }, fn: (c) => { c.char!.active = false; } } },
      { label: 'Defenderlo: "Están sacados de contexto"', out: 'Lo sostuviste.', fx: { ind: { integridad: -5, periodistas: -5 }, op: { char: 15 } } },
      { label: 'Conferencia de prensa y pedido de disculpas', auto: true, out: 'Pediste disculpas públicas.', fx: { ind: { periodistas: 2, integridad: 1, comision: -1 } } },
    ],
  },
  {
    id: 'pre_investigacion', cat: 'prensa', title: 'Un periodista investiga tu gestión', urg: 'importante', sev: 4, cd: 25,
    text: '{char} está preparando una investigación sobre comisiones en transferencias del club. Te pide una entrevista para dar tu versión.',
    bind: { char: 'periodista' }, when: (c) => c.ind.riesgo > 35, w: 2.5, pos: ['club', 'asociacion'],
    opts: [
      { label: 'Dar la entrevista y mostrar documentos', out: 'Diste tu versión.', fx: { op: { char: 6 }, ind: { integridad: 2 } }, risk: { p: (c) => c.ind.riesgo / 140, text: 'La investigación igual expone irregularidades.', fx: { ind: { periodistas: -4, integridad: -4, riesgo: 5 }, later: [{ w: [3, 10], fx: 'investigationCheck', params: { reason: 'comisiones irregulares en transferencias' } }] } } },
      { label: 'Ofrecerle publicidad del club a su medio', out: 'Ofreciste pauta publicitaria.', fx: { cash: (c) => -sm(c, 80_000), cat: 'otros', ind: { integridad: -5, riesgo: 6 }, op: { char: 5 } }, risk: { p: 0.35, text: 'El periodista publicó que intentaste comprarlo.', fx: { ind: { periodistas: -8, integridad: -6, repNacional: -4 } } } },
      { label: 'Negarte', auto: true, out: 'La nota sale sin tu versión.', fx: { ind: { periodistas: -3, socios: -2, riesgo: 2 } } },
    ],
  },
  {
    id: 'pre_conferencia_derrota', cat: 'prensa', title: 'Conferencia tras la derrota', urg: 'informativo', sev: 2, cd: 8,
    text: 'Después de la derrota, los periodistas esperan tu palabra. Las preguntas apuntan al entrenador {coach}, al mercado y a tu continuidad.',
    bind: { coach: 'own' }, when: (c) => c.club!.form[c.club!.form.length - 1] === 'P', w: 2,
    opts: [
      { label: 'Respaldar al entrenador', out: 'Ratificaste al DT.', fx: { op: { coach: 6 }, ind: { dt: 3 } } },
      { label: 'Pedir paciencia a los hinchas', auto: true, out: 'Mensaje de calma.', fx: { ind: { hinchas: 1 } } },
      { label: 'Criticar al plantel', out: 'Apuntaste a los jugadores.', fx: { morale: -6, ind: { jugadores: -5, hinchas: 2 } } },
    ],
  },
];

const CRISIS: EventDef[] = [
  {
    id: 'cri_devaluacion', cat: 'crisis', title: 'Devaluación brusca del peso', urg: 'urgente', sev: 4, cd: 60, pos: ['club', 'asociacion'],
    text: 'El peso se devaluó un 40% de un día para otro. Los contratos en dólares se encarecen y los ingresos locales pierden valor. El tesorero pide medidas urgentes.',
    w: 0.6,
    opts: [
      { label: 'Declarar la emergencia económica', out: 'Emergencia declarada: recorte del 10% en salarios.', fx: { fn: (c) => { c.s.economy.emergency = true; c.s.economy.emergencyAbs = c.abs; }, ind: { jugadores: -6, empleados: -5, estabilidad: 4, socios: -2 } } },
      { label: 'Vender jugadores para generar dólares', out: 'Se pondrá en venta a tres jugadores.', fx: { fn: (c) => { for (const p of [...squad(c.s, c.club?.id ?? '')].sort((a, b) => b.value - a.value).slice(1, 4)) p.listed = true; }, ind: { hinchas: -3, estabilidad: 2 } } },
      { label: 'Absorber el impacto', auto: true, out: 'El club absorbe la pérdida.', fx: { cash: (c) => -rev(c) * 0.06, cat: 'otros', ind: { estabilidad: -6 } } },
    ],
  },
  {
    id: 'cri_huelga_futbolistas', cat: 'crisis', title: 'Paro nacional de futbolistas', urg: 'importante', sev: 3, cd: 80, pos: ['club', 'asociacion'],
    text: 'El sindicato de futbolistas anuncia un paro por deudas salariales en varios clubes. Pide que los clubes cumplidores se pronuncien.',
    w: 0.5,
    opts: [
      { label: 'Apoyar el reclamo de los jugadores', out: 'Te solidarizaste con el gremio.', fx: { ind: { jugadores: 6, presidentes: -4, asociacion: -3 } } },
      { label: 'Respaldar a la asociación', auto: true, out: 'Te alineaste con la AAF.', fx: { ind: { asociacion: 4, jugadores: -3 }, op: { assoc: 5 } } },
      { label: 'Mediar entre las partes', out: 'Te ofreciste como mediador.', fx: { ind: { influencia: 4, repNacional: 2 } } },
    ],
  },
  {
    id: 'cri_temporal', cat: 'crisis', title: 'Un temporal destrozó parte de las instalaciones', urg: 'importante', sev: 3, cd: 80,
    text: 'Un temporal voló parte del techo de una tribuna y anegó el predio de entrenamiento. Los daños se estiman en {amount}. El seguro cubre una parte.',
    amount: (c) => sm(c, 700_000), w: 0.5,
    opts: [
      { label: 'Reparar todo de inmediato', out: 'Reparación completa.', fx: { cash: (c) => -c.amount * 0.6, cat: 'mantenimiento', ind: { socios: 2 } } },
      { label: 'Campaña solidaria de socios', out: 'Los socios ayudan a reconstruir.', fx: { cash: (c) => -c.amount * 0.2, cat: 'mantenimiento', ind: { socios: 4, hinchas: 3 } } },
      { label: 'Reparar lo mínimo', auto: true, out: 'Reparaciones parciales.', fx: { cash: (c) => -c.amount * 0.25, cat: 'mantenimiento', fn: (c) => { c.club!.facilities.entrenamiento = Math.max(1, c.club!.facilities.entrenamiento - 1); } } },
    ],
  },
  {
    id: 'cri_gremial', cat: 'crisis', title: 'Paro de empleados del club', urg: 'urgente', sev: 4, cd: 20,
    text: 'El gremio de empleados de clubes declaró un paro: reclaman salarios atrasados y aumento. Sin personal no hay partido de local.',
    when: (c) => c.ind.empleados < 35 || (c.club?.fin.wageArrears ?? 0) >= 1, w: 3,
    opts: [
      { label: 'Aceptar el aumento', out: 'Acuerdo salarial firmado.', fx: { fn: (c) => { c.s.economy.staffCost = Math.round((c.s.economy.staffCost ?? 1) * 1.08 * 100) / 100; }, ind: { empleados: 12, estabilidad: -3 } } },
      { label: 'Pagar atrasados sin aumento', auto: true, out: 'Se pagaron deudas, sin aumento.', fx: { cash: (c) => -sm(c, 150_000), cat: 'sueldos_empleados', ind: { empleados: 5 } } },
      { label: 'Descontar los días de paro', out: 'Endureciste la posición.', fx: { ind: { empleados: -10, gobernabilidad: -3, estabilidad: 1 } } },
    ],
  },
];

const PERSONAL: EventDef[] = [
  {
    id: 'per_negocio', cat: 'personal', title: 'Una oportunidad de negocio personal', urg: 'informativo', sev: 2, cd: 30, pos: ['any'],
    text: '{char} te ofrece invertir {amount} de tu patrimonio en un desarrollo inmobiliario. "Es una oportunidad única", asegura. Algunos dicen que busca acercarse al club.',
    bind: { char: 'empresario' }, amount: () => 500_000, when: (c) => c.s.president.wealth > 600_000, w: 1.3,
    opts: [
      { label: 'Invertir', out: 'Invertiste en el proyecto.', fx: { wealth: (c) => -c.amount, op: { char: 6 }, fn: (c) => { c.s.scheduled.push({ at: c.abs + c.rng.int(20, 50), kind: 'effect', id: 'personalReturn', b: { amount: c.amount }, p: 0.6 }); } } },
      { label: 'Invertir la mitad', out: 'Inversión moderada.', fx: { wealth: (c) => -c.amount / 2, fn: (c) => { c.s.scheduled.push({ at: c.abs + c.rng.int(20, 50), kind: 'effect', id: 'personalReturn', b: { amount: c.amount / 2 }, p: 0.6 }); } } },
      { label: 'Rechazar', auto: true, out: 'Preferís no mezclar.', fx: { ind: { integridad: 1 } } },
    ],
  },
  {
    id: 'per_salud', cat: 'personal', title: 'Un susto de salud', urg: 'importante', sev: 3, cd: 80, pos: ['any'],
    text: 'Después de semanas de estrés, terminaste en una guardia con un pico de presión. Los médicos te recomiendan bajar el ritmo.',
    when: (c) => c.s.president.age > 50 || c.ind.gobernabilidad < 40, w: 0.6,
    opts: [
      { label: 'Tomarte dos semanas y delegar', out: 'El vicepresidente quedó a cargo.', fx: { op: { vice: 6 }, ind: { gobernabilidad: -3 }, fn: (c) => { c.s.president.health = clamp(c.s.president.health + 15); } } },
      { label: 'Seguir como si nada', auto: true, out: 'Seguís a full.', fx: { fn: (c) => { c.s.president.health = clamp(c.s.president.health - 10); } } },
      { label: 'Contratar un gerente general', out: 'Profesionalizaste la gestión diaria.', fx: { cash: (c) => -sm(c, 120_000), cat: 'sueldos_empleados', ind: { empleados: 3, estabilidad: 1 }, fn: (c) => { c.s.president.health = clamp(c.s.president.health + 8); } } },
    ],
  },
  {
    id: 'per_candidatura_politica', cat: 'personal', title: 'Te ofrecen una candidatura política', urg: 'informativo', sev: 2, cd: 80, pos: ['any'],
    text: '{char} te ofrece ser candidato a diputado por su partido. "Con tu imagen, ganamos seguro". Aceptar te daría influencia, pero muchos socios lo verían como usar el club.',
    bind: { char: 'politico' }, when: (c) => c.ind.repNacional > 50, w: 0.8,
    opts: [
      { label: 'Aceptar', out: 'Sos candidato.', fx: { ind: { influencia: 10, socios: -8, integridad: -3, periodistas: -3 }, op: { char: 15 } } },
      { label: 'Rechazar con elegancia', auto: true, out: 'Tu foco es el fútbol.', fx: { ind: { socios: 3 }, op: { char: -2 } } },
      { label: 'Acordar apoyo mutuo sin candidatura', out: 'Pacto discreto.', fx: { ind: { influencia: 4, riesgo: 2 }, op: { char: 8 } } },
    ],
  },
  {
    id: 'per_demanda', cat: 'personal', title: 'Te demandan personalmente', urg: 'importante', sev: 3, cd: 60, pos: ['any'],
    text: 'Un exempleado del club te demanda por despido injustificado y daño moral. Reclama {amount} de tu patrimonio personal.',
    amount: () => 180_000, w: 0.8,
    opts: [
      { label: 'Llegar a un acuerdo', out: 'Pagaste un acuerdo confidencial.', fx: { wealth: (c) => -c.amount * 0.5 } },
      { label: 'Ir a juicio', auto: true, out: 'El caso irá a juicio.', fx: {}, risk: { p: 0.4, text: 'Perdiste el juicio y pagaste el total con costas.', fx: { wealth: (c) => -c.amount * 1.3, ind: { periodistas: -2 } } } },
      { label: 'Que lo pague el club', out: 'El club asume el costo.', fx: { cash: (c) => -c.amount, cat: 'indemnizaciones', ind: { integridad: -4, comision: -3 } } },
    ],
  },
];

registerEvents([...FINANZAS, ...PATROCINIO, ...SOCIOS, ...HINCHAS, ...SEGURIDAD, ...INFRA, ...PRENSA, ...CRISIS, ...PERSONAL]);

import { registerLater } from './engine';
registerLater({
  personalReturn: (c) => {
    const gain = Math.round(c.amount * c.rng.float(1.2, 2.2));
    c.s.president.wealth += gain;
    addNews(c.s, `${c.s.president.name} ${c.s.president.surname} multiplica su patrimonio con un negocio inmobiliario`, 'neu', 'personal', true);
    return `Tu inversión personal rindió: recuperaste ${Math.round(gain / 1000)} mil dólares.`;
  },
});
export const INST_COUNT = FINANZAS.length + PATROCINIO.length + SOCIOS.length + HINCHAS.length + SEGURIDAD.length + INFRA.length + PRENSA.length + CRISIS.length + PERSONAL.length;
