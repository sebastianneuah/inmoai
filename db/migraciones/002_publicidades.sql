-- Sistema propio de publicidades y espacios promocionales.
-- Abraham controla qué campaña aparece, dónde, cuándo y a qué hora.

CREATE TABLE IF NOT EXISTS publicidades (
  id            SERIAL PRIMARY KEY,
  -- Nombre interno: solo lo ve el admin
  nombre        TEXT NOT NULL,
  titulo        TEXT NOT NULL DEFAULT '',
  subtitulo     TEXT NOT NULL DEFAULT '',
  imagen_url    TEXT,
  video_url     TEXT,                            -- reservado para fase 2
  cta           TEXT NOT NULL DEFAULT 'Pedir ahora',

  -- 'internal' = promoción de Abraham · 'external' = campaña paga de terceros
  -- (las externas se muestran rotuladas como "Publicidad")
  tipo          TEXT NOT NULL DEFAULT 'internal' CHECK (tipo IN ('internal', 'external')),
  anunciante    TEXT NOT NULL DEFAULT '',

  -- Dónde se muestra
  slot          TEXT NOT NULL CHECK (slot IN (
                  'home_hero', 'home_medio', 'entre_categorias',
                  'carrito', 'confirmacion', 'beneficios')),
  -- A dónde lleva: un producto, una categoría o un link externo
  producto_id   INTEGER REFERENCES productos(id) ON DELETE SET NULL,
  categoria_id  INTEGER REFERENCES categorias(id) ON DELETE SET NULL,
  destino_url   TEXT,

  -- Programación (todo en hora de Buenos Aires)
  desde         DATE,
  hasta         DATE,
  -- Días de la semana en que corre (0=domingo … 6=sábado). Vacío = todos.
  dias          INTEGER[] NOT NULL DEFAULT '{}',
  hora_desde    TEXT,                            -- "11:00"
  hora_hasta    TEXT,                            -- "15:30"

  activo        BOOLEAN NOT NULL DEFAULT TRUE,
  -- Mayor prioridad se muestra primero. Las propias mandan sobre las externas.
  prioridad     INTEGER NOT NULL DEFAULT 0,
  orden         INTEGER NOT NULL DEFAULT 0,

  creada_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_publicidades_slot ON publicidades(slot, activo);

-- Métricas: una fila por impresión, clic o conversión.
CREATE TABLE IF NOT EXISTS ad_eventos (
  id            BIGSERIAL PRIMARY KEY,
  publicidad_id INTEGER NOT NULL REFERENCES publicidades(id) ON DELETE CASCADE,
  slot          TEXT NOT NULL,
  evento        TEXT NOT NULL CHECK (evento IN ('impression', 'click', 'conversion')),
  -- Monto del pedido cuando el evento es una conversión
  monto         INTEGER,
  creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ad_eventos_pub ON ad_eventos(publicidad_id, evento);
