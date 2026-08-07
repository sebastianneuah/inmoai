-- Esquema inicial de Abraham Pedidos V2.
-- Postgres estándar: funciona igual en Neon, Supabase o cualquier DATABASE_URL.

CREATE TABLE IF NOT EXISTS categorias (
  id          SERIAL PRIMARY KEY,
  nombre      TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  descripcion TEXT NOT NULL DEFAULT '',
  imagen_url  TEXT,
  activa      BOOLEAN NOT NULL DEFAULT TRUE,
  orden       INTEGER NOT NULL DEFAULT 0,
  creada_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS productos (
  id           SERIAL PRIMARY KEY,
  categoria_id INTEGER NOT NULL REFERENCES categorias(id),
  nombre       TEXT NOT NULL,
  slug         TEXT NOT NULL UNIQUE,
  descripcion_corta TEXT NOT NULL DEFAULT '',
  descripcion_larga TEXT NOT NULL DEFAULT '',
  precio       INTEGER NOT NULL CHECK (precio >= 0),
  imagen_url   TEXT,
  activo       BOOLEAN NOT NULL DEFAULT TRUE,   -- FALSE = oculto de la carta
  disponible   BOOLEAN NOT NULL DEFAULT TRUE,   -- FALSE = "Agotado por hoy"
  destacado    BOOLEAN NOT NULL DEFAULT FALSE,  -- aparece en "Los más pedidos"
  orden        INTEGER NOT NULL DEFAULT 0,
  etiquetas    TEXT[] NOT NULL DEFAULT '{}',    -- vegetariano, picante, crudo, panizado, sin-queso, solo-mediodia…
  creado_en    TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria_id);

-- Grupos de modificadores ("¿Querés sacarle algo?", "Preparación"…)
CREATE TABLE IF NOT EXISTS grupos_modificadores (
  id          SERIAL PRIMARY KEY,
  nombre      TEXT NOT NULL,
  minimo      INTEGER NOT NULL DEFAULT 0,      -- 0 = opcional
  maximo      INTEGER NOT NULL DEFAULT 1,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  orden       INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS opciones_modificador (
  id          SERIAL PRIMARY KEY,
  grupo_id    INTEGER NOT NULL REFERENCES grupos_modificadores(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  precio_extra INTEGER NOT NULL DEFAULT 0 CHECK (precio_extra >= 0),
  activa      BOOLEAN NOT NULL DEFAULT TRUE,
  orden       INTEGER NOT NULL DEFAULT 0
);

-- Qué grupos aplican a qué productos
CREATE TABLE IF NOT EXISTS producto_modificadores (
  producto_id INTEGER NOT NULL REFERENCES productos(id) ON DELETE CASCADE,
  grupo_id    INTEGER NOT NULL REFERENCES grupos_modificadores(id) ON DELETE CASCADE,
  PRIMARY KEY (producto_id, grupo_id)
);

-- Salsas, palitos y otros acompañamientos del paso "¿Con qué acompañamos tu pedido?"
CREATE TABLE IF NOT EXISTS acompanamientos (
  id          SERIAL PRIMARY KEY,
  nombre      TEXT NOT NULL,
  tipo        TEXT NOT NULL DEFAULT 'salsa' CHECK (tipo IN ('salsa', 'palitos', 'otro')),
  precio      INTEGER NOT NULL DEFAULT 0 CHECK (precio >= 0),
  maximo      INTEGER NOT NULL DEFAULT 6,
  activo      BOOLEAN NOT NULL DEFAULT TRUE,
  mostrar_en_checkout BOOLEAN NOT NULL DEFAULT TRUE,
  imagen_url  TEXT,
  orden       INTEGER NOT NULL DEFAULT 0
);

-- Pedidos confirmados (respaldo local + panel de pedidos del día)
CREATE TABLE IF NOT EXISTS pedidos (
  id          SERIAL PRIMARY KEY,
  numero      TEXT NOT NULL UNIQUE,
  estado      TEXT NOT NULL DEFAULT 'nuevo'
              CHECK (estado IN ('nuevo','confirmado','preparando','listo','enviado','entregado','cancelado')),
  modo_entrega TEXT NOT NULL,
  total       INTEGER NOT NULL,
  cliente_nombre TEXT NOT NULL,
  cliente_telefono TEXT NOT NULL,
  detalle     JSONB NOT NULL,                  -- PedidoConfirmado completo (ítems, salsas, palitos, pago…)
  fallo_inyeccion BOOLEAN NOT NULL DEFAULT FALSE,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pedidos_creado ON pedidos(creado_en DESC);

-- Configuración editable desde el admin (lo sensible sigue en variables de entorno)
CREATE TABLE IF NOT EXISTS configuracion (
  clave       TEXT PRIMARY KEY,
  valor       JSONB NOT NULL,
  actualizada_en TIMESTAMPTZ NOT NULL DEFAULT now()
);
