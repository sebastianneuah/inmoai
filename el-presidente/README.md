# EL PRESIDENTE — Football Power Simulator

> *El fútbol también se juega en los despachos.*

Simulador web narrativo, deportivo, económico y político. Asumís la presidencia de un club de fútbol argentino ficticio y construís una carrera que puede llevarte al Comité Ejecutivo de la asociación, a la presidencia de la AAF, de la Confederación Sudamericana y de la Federación Internacional. No dirigís tácticas: gestionás dinero, relaciones, decisiones y poder.

## Cómo ejecutarlo

```bash
cd el-presidente
npm install
npm run dev        # servidor de desarrollo
npm run build      # build de producción en dist/ (estático, se puede servir desde cualquier hosting)
npm test           # simulaciones headless de varias temporadas + pruebas de carrera
```

## Qué incluye esta versión

- **Universo argentino completo**: 52 clubes ficticios en tres divisiones (Liga Profesional 18, Primera Nacional 18, Torneo Federal 16) con ascensos y descensos, Copa Argentina, Copa Continental (con clubes de Brasil, Uruguay, Chile y Colombia), Mundial de Clubes, eliminatorias, Copa de las Américas y Copa del Mundo. 38 clubes extranjeros de 13 países actúan como rivales, compradores y vendedores.
- **Motor de partidos** automático (plantel, entrenador, moral, lesiones, cansancio, localía, racha, estabilidad institucional, presión ambiental y aleatoriedad) con modo instantáneo y narración en vivo acelerable.
- **20 indicadores dinámicos** que afectan realmente la simulación (rendimiento, ingresos, elecciones, sanciones, destituciones).
- **Motor de acontecimientos** basado en datos: 131 acontecimientos base con 3 a 5 opciones, requisitos, probabilidades, urgencia, gravedad, consecuencias inmediatas, ocultas y diferidas, cadenas narrativas y variables dinámicas.
- **Personajes con memoria**: dirigentes, entrenadores, representantes, periodistas, barras y políticos recuerdan lo que hiciste.
- **Economía completa**: estado de resultados, flujo de caja, balance, préstamos, refinanciación, obras, patrocinadores, emergencia económica, atrasos salariales, inhibiciones e intervención. Patrimonio personal separado del club.
- **Mercado de pases** con negociación de pase y salario, renovaciones, préstamos, libres, sondeo de compradores y operaciones de la IA (incluida la fuga de talento al exterior).
- **Política**: asambleas con propuestas votadas por los presidentes, bloques, alianzas, favores, capital político, elecciones de club, AAF, CSF y FIF con encuestas y acciones de campaña.
- **Selección nacional** gestionable al presidir la AAF.
- **Legado y biografía** al final de la carrera; historial de carreras.
- **Guardado automático** después de cada decisión y partido (almacenamiento local comprimido), múltiples partidas, exportar/importar.

## Arquitectura

```
src/engine/            motor (TypeScript puro, sin dependencias de UI)
  types.ts             estado serializable del juego
  rng.ts               aleatoriedad controlada (semilla reproducible)
  worldgen.ts          generación del universo
  competitions.ts      calendarios, ligas, copas, ascensos
  match.ts             simulación de partidos
  economy.ts           motor económico
  market.ts            mercado de pases (usuario + IA)
  coaches.ts           entrenadores
  sponsors.ts          patrocinadores
  relations.ts         indicadores y relaciones
  politics.ts          motor político y electoral, progresión de carrera
  nationalteam.ts      selección nacional
  events/              motor de acontecimientos + catálogo de datos
  season.ts            cierre y apertura de temporada
  game.ts              orquestador (avance semanal, simulación)
  save.ts              repositorio de guardado (interfaz lista para una base de datos)
src/ui/                interfaz React
```

El guardado usa la interfaz `SaveRepository`: reemplazar `LocalSaveRepository` por una implementación remota permite sumar cuentas de usuario sin tocar el motor.
