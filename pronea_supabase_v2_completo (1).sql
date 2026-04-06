-- ============================================================
-- SISTEMA DE GESTIÓN EDUCATIVA PRONEA SACATEPÉQUEZ
-- Script COMPLETO v2.0 — Abril 2026
-- Incluye datos de:
--   • Manual del sistema (v1)
--   • ENLACE_DE_EVALUACIONES.xlsx
--   • Control_de_estudiantes_inscritos_en_PRONEA.xlsx
--   • Instrumento_de_evaluación_con_estudiantes_con_alguna_discapacidad.xlsx
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- SECCIÓN 1: CONFIGURACIÓN DEL SISTEMA
-- ============================================================
CREATE TABLE configuracion (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  parametro       VARCHAR(100) NOT NULL UNIQUE,
  valor           VARCHAR(500) NOT NULL,
  descripcion     TEXT,
  actualizado_en  TIMESTAMPTZ DEFAULT NOW(),
  actualizado_por UUID  -- FK a usuarios (se añade luego)
);

INSERT INTO configuracion (parametro, valor, descripcion) VALUES
  ('PORCENTAJE_TAREAS',        '60',         'Ponderación de tareas en promedio final (%)'),
  ('PORCENTAJE_EXAMENES',      '40',         'Ponderación de exámenes en promedio final (%)'),
  ('NOTA_MINIMA_PROMOCION',    '60',         'Porcentaje mínimo para ser promovido'),
  ('PUNTOS_MAX_TAREA',         '5',          'Puntos máximos por tarea individual'),
  ('PUNTOS_MAX_EXAMEN',        '20',         'Puntos máximos por examen por área'),
  ('DIAS_VIGENCIA_SESION',     '7',          'Días de vigencia de una sesión activa'),
  ('INTENTOS_LOGIN',           '3',          'Intentos máximos de login antes de bloqueo'),
  ('MINUTOS_BLOQUEO_LOGIN',    '15',         'Minutos de bloqueo tras intentos fallidos'),
  ('FECHA_INICIO_CICLO',       '2026-01-15', 'Fecha de inicio del ciclo escolar'),
  ('FECHA_FIN_CICLO',          '2026-10-30', 'Fecha de fin del ciclo escolar'),
  ('PESO_LIBRO_1',             '50',         'Ponderación del Libro 1 en nota de etapa (%)'),
  ('PESO_LIBRO_2',             '50',         'Ponderación del Libro 2 en nota de etapa (%)');


-- ============================================================
-- SECCIÓN 2: CATÁLOGOS BASE
-- ============================================================

-- 2.1 Municipios
CREATE TABLE municipios (
  id           SERIAL PRIMARY KEY,
  nombre       VARCHAR(100) NOT NULL UNIQUE,
  departamento VARCHAR(100) NOT NULL DEFAULT 'Sacatepéquez',
  activo       BOOLEAN DEFAULT TRUE
);

INSERT INTO municipios (nombre) VALUES
  ('Antigua Guatemala'), ('Ciudad Vieja'), ('Jocotenango'),
  ('Magdalena Milpas Altas'), ('Pastores'), ('San Juan Alotenango'),
  ('San Lucas Sacatepéquez'), ('San Miguel Dueñas'), ('Santa María de Jesús'),
  ('Santiago Sacatepéquez'), ('Sumpango'), ('San Antonio Aguas Calientes'),
  ('San Bartolomé Milpas Altas'), ('Santa Catarina Barahona'),
  ('Santa Lucía Milpas Altas'), ('Santo Domingo Xenacoj');

-- 2.2 Etapas educativas
CREATE TABLE etapas (
  id          SERIAL PRIMARY KEY,
  codigo      VARCHAR(20)  NOT NULL UNIQUE,
  nombre      VARCHAR(100) NOT NULL,
  descripcion TEXT,
  nivel       VARCHAR(50)  NOT NULL,  -- 'PRIMARIA' | 'BASICO' | 'BACHILLERATO'
  orden       SMALLINT     NOT NULL,
  activo      BOOLEAN DEFAULT TRUE
);

INSERT INTO etapas (codigo, nombre, descripcion, nivel, orden) VALUES
  ('1ERA_PRIMARIA',    '1era Etapa Primaria',  'Primero, segundo y tercero primaria',  'PRIMARIA',     1),
  ('2DA_PRIMARIA',     '2da Etapa Primaria',   'Cuarto, quinto y sexto primaria',      'PRIMARIA',     2),
  ('1ERA_BASICO',      '1era Etapa Básico',    'Primero y segundo básico',             'BASICO',       3),
  ('2DA_BASICO',       '2da Etapa Básico',     'Tercero básico',                       'BASICO',       4),
  ('4TO_BACHILLERATO', '4to Bachillerato',     'Cuarto bachillerato',                  'BACHILLERATO', 5),
  ('5TO_BACHILLERATO', '5to Bachillerato',     'Quinto bachillerato',                  'BACHILLERATO', 6);

-- 2.3 Áreas curriculares
CREATE TABLE areas (
  id          SERIAL PRIMARY KEY,
  codigo      VARCHAR(30)  NOT NULL UNIQUE,
  nombre      VARCHAR(100) NOT NULL,
  descripcion TEXT,
  activo      BOOLEAN DEFAULT TRUE
);

INSERT INTO areas (codigo, nombre, descripcion) VALUES
  ('MATEMATICA',    'Matemática',                 'Área de matemática'),
  ('COMUNICACION',  'Comunicación y Lenguaje',    'Área de comunicación y lenguaje'),
  ('CIENCIAS_NAT',  'Ciencias Naturales',         'Área de ciencias naturales'),
  ('CIENCIAS_SOC',  'Ciencias Sociales',          'Área de ciencias sociales'),
  ('PRODUCTIVIDAD', 'Productividad y Desarrollo', 'Para primaria y básico'),
  ('GESTION',       'Gestión de Proyectos',       'Para 4to Bachillerato'),
  ('EMPRENDIMIENTO','Emprendimiento',             'Para 5to Bachillerato');

-- 2.4 Etapa–Áreas
CREATE TABLE etapa_areas (
  id       SERIAL PRIMARY KEY,
  etapa_id INTEGER NOT NULL REFERENCES etapas(id),
  area_id  INTEGER NOT NULL REFERENCES areas(id),
  UNIQUE(etapa_id, area_id)
);

INSERT INTO etapa_areas (etapa_id, area_id)
SELECT e.id, a.id FROM etapas e, areas a
WHERE e.codigo IN ('1ERA_PRIMARIA','2DA_PRIMARIA','1ERA_BASICO','2DA_BASICO')
  AND a.codigo IN ('MATEMATICA','COMUNICACION','CIENCIAS_NAT','CIENCIAS_SOC','PRODUCTIVIDAD');

INSERT INTO etapa_areas (etapa_id, area_id)
SELECT e.id, a.id FROM etapas e, areas a
WHERE e.codigo = '4TO_BACHILLERATO'
  AND a.codigo IN ('MATEMATICA','COMUNICACION','CIENCIAS_NAT','CIENCIAS_SOC','GESTION');

INSERT INTO etapa_areas (etapa_id, area_id)
SELECT e.id, a.id FROM etapas e, areas a
WHERE e.codigo = '5TO_BACHILLERATO'
  AND a.codigo IN ('MATEMATICA','COMUNICACION','CIENCIAS_NAT','CIENCIAS_SOC','EMPRENDIMIENTO');

-- 2.5 Acuerdos ministeriales
CREATE TABLE acuerdos_ministeriales (
  id             SERIAL PRIMARY KEY,
  numero         VARCHAR(50) NOT NULL UNIQUE,
  descripcion    TEXT        NOT NULL,
  vigencia_desde DATE,
  vigencia_hasta DATE,
  activo         BOOLEAN DEFAULT TRUE
);

INSERT INTO acuerdos_ministeriales (numero, descripcion, vigencia_desde, vigencia_hasta) VALUES
  ('MINEDUC 1234-2025', 'Normas de Evaluación para Educación Alternativa',  '2025-01-01', '2028-12-31'),
  ('MINEDUC 5678-2025', 'Currículo Nacional Base - Modalidad Alternativa',  '2025-01-01', '2028-12-31'),
  ('DIGEEX 9012-2026',  'Lineamientos para el registro de notas en SIREEX', '2026-01-01', '2026-12-31');

-- 2.6 Avisos del sistema (panel informativo login)
CREATE TABLE avisos (
  id           SERIAL PRIMARY KEY,
  mensaje      TEXT        NOT NULL,
  fecha_inicio DATE        NOT NULL,
  fecha_fin    DATE,
  activo       BOOLEAN DEFAULT TRUE,
  creado_en    TIMESTAMPTZ DEFAULT NOW()
);

-- 2.7 Tipos de discapacidad (catálogo ampliado desde instrumento)
CREATE TABLE tipos_discapacidad (
  id          SERIAL PRIMARY KEY,
  codigo      VARCHAR(50)  NOT NULL UNIQUE,
  nombre      VARCHAR(150) NOT NULL,
  descripcion TEXT,                   -- descripción pedagógica de la sección (campo "Variables")
  activo      BOOLEAN DEFAULT TRUE
);

INSERT INTO tipos_discapacidad (codigo, nombre, descripcion) VALUES
  ('NINGUNA',          'Ninguna',                                    NULL),
  ('INTELECTUAL_LEVE', 'Intelectual Leve',
   'En adultos, existe alteración del pensamiento abstracto, la función ejecutiva y de la memoria a corto plazo, así como del uso funcional de las aptitudes académicas.'),
  ('INTELECTUAL_MODERADA', 'Intelectual Moderada',
   'En adultos, el desarrollo de las aptitudes académicas está típicamente en nivel elemental y se necesita ayuda para todas las habilidades académicas, en el trabajo y en la vida personal.'),
  ('INTELECTUAL_GRAVE', 'Intelectual Grave',
   'El individuo tiene generalmente poca comprensión del lenguaje escrito o de los conceptos que implican números, cantidades, tiempo y dinero.'),
  ('INTELECTUAL_PROFUNDA', 'Intelectual Profunda',
   'Nivel más severo de discapacidad intelectual; requiere apoyo constante en todas las áreas.'),
  ('TEA',              'Trastorno del Espectro Autista',
   'Desafíos importantes en expresión verbal, comprensión y comunicación; aún más vulnerables ante pruebas estandarizadas.'),
  ('VISUAL',           'Visual',
   'Necesita apoyo para aprender el nuevo código de lectura y escritura a través del Braille.'),
  ('BAJA_VISION',      'Baja Visión',
   'La escritura en texto o digital debe contener letras de tamaño considerable.'),
  ('AUDITIVA',         'Auditiva',
   'Se debe trabajar la comunicación a través de lenguas de señas.'),
  ('PERDIDA_AUDITIVA_LEVE', 'Pérdida Auditiva Leve',
   'El docente debe comunicarse con tono de voz elevado o solicitar al estudiante usar audífonos específicos.'),
  ('FISICA_MOTORA',    'Física o Motora',
   'Limitaciones en movilidad, uso de extremidades o control motor que afectan la participación.'),
  ('MENTAL',           'Mental',             NULL),
  ('MULTIPLE',         'Múltiple',           'Combinación de dos o más tipos de discapacidad.'),
  ('GENTE_PEQUENA',    'Gente Pequeña',      NULL),
  ('PROBLEMAS_APRENDIZAJE', 'Problemas de Aprendizaje', NULL),
  ('PENDIENTE',        'Pendiente de diagnóstico', NULL);

-- 2.8 Secciones de clase (catálogo desde instrumento)
CREATE TABLE secciones (
  id          SERIAL PRIMARY KEY,
  codigo      VARCHAR(10) NOT NULL UNIQUE,  -- AA, AB, A, A1, A2, A3, A4, A5, B, C, etc.
  descripcion TEXT,
  activo      BOOLEAN DEFAULT TRUE
);

INSERT INTO secciones (codigo, descripcion) VALUES
  ('AA',  'Discapacidad Intelectual Profunda'),
  ('AB',  'Discapacidad Intelectual Profunda'),
  ('A',   'Discapacidad Intelectual Profunda'),
  ('A1',  'Discapacidad Intelectual Grave'),
  ('A2',  'Discapacidad Intelectual Moderada'),
  ('A3',  'Discapacidad Intelectual Leve (sin leer/escribir)'),
  ('A4',  'Trastorno del Espectro Autista'),
  ('A5',  'Discapacidad Intelectual Leve (puede leer/escribir)'),
  ('A6',  'Estudiantes convencionales'),
  ('B',   'Estudiantes convencionales'),
  ('C',   'Discapacidad Visual (Braille)'),
  ('C1',  'Discapacidad Visual (Baja Visión)'),
  ('D',   'Discapacidad Auditiva'),
  ('D1',  'Discapacidad Auditiva Leve');

-- 2.9 Modalidades de estudio
CREATE TABLE modalidades (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(150) NOT NULL UNIQUE,
  descripcion TEXT
);

INSERT INTO modalidades (nombre, descripcion) VALUES
  ('Semipresencial', 'Apoyo en dudas en la sede y tareas por WhatsApp'),
  ('A distancia',    'Solo revisión por WhatsApp sin apoyo de dudas en la sede'),
  ('En línea',       'Totalmente virtual');


-- ============================================================
-- SECCIÓN 3: USUARIOS Y ROLES
-- ============================================================

CREATE TYPE rol_usuario AS ENUM (
  'administrador', 'coordinador_digeex', 'director',
  'tecnico', 'enlace_institucional', 'estudiante'
);

CREATE TABLE usuarios (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  correo                    VARCHAR(255) NOT NULL UNIQUE,
  contrasena_hash           TEXT         NOT NULL,
  rol                       rol_usuario  NOT NULL,
  activo                    BOOLEAN      DEFAULT TRUE,
  primer_ingreso            BOOLEAN      DEFAULT TRUE,
  intentos_fallidos         SMALLINT     DEFAULT 0,
  bloqueado_hasta           TIMESTAMPTZ,
  ultimo_acceso             TIMESTAMPTZ,
  token_sesion              TEXT,
  token_expira_en           TIMESTAMPTZ,
  token_recuperacion        TEXT,
  token_recuperacion_expira TIMESTAMPTZ,
  creado_en                 TIMESTAMPTZ  DEFAULT NOW(),
  actualizado_en            TIMESTAMPTZ  DEFAULT NOW()
);

-- FK diferida
ALTER TABLE configuracion ADD CONSTRAINT fk_config_usuario
  FOREIGN KEY (actualizado_por) REFERENCES usuarios(id);


-- ============================================================
-- SECCIÓN 4: INSTITUCIONES Y SEDES
-- ============================================================

CREATE TABLE instituciones (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre       VARCHAR(200) NOT NULL,
  tipo         VARCHAR(100),
  municipio_id INTEGER REFERENCES municipios(id),
  direccion    TEXT,
  telefono     VARCHAR(20),
  correo       VARCHAR(255),
  activo       BOOLEAN DEFAULT TRUE,
  creado_en    TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE sedes (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre         VARCHAR(200) NOT NULL,
  municipio_id   INTEGER NOT NULL REFERENCES municipios(id),
  direccion      TEXT,
  telefono       VARCHAR(20),
  horario        VARCHAR(150),
  institucion_id UUID REFERENCES instituciones(id),
  activo         BOOLEAN DEFAULT TRUE,
  creado_en      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- SECCIÓN 5: TÉCNICOS, DIRECTORES Y ENLACES
-- ============================================================

CREATE TABLE tecnicos (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id       UUID NOT NULL UNIQUE REFERENCES usuarios(id),
  primer_nombre    VARCHAR(100) NOT NULL,
  segundo_nombre   VARCHAR(100),
  primer_apellido  VARCHAR(100) NOT NULL,
  segundo_apellido VARCHAR(100),
  cui              VARCHAR(13)  NOT NULL UNIQUE,
  fecha_nacimiento DATE,
  telefono         VARCHAR(20),
  especialidad     VARCHAR(150),
  fecha_inicio     DATE,
  codigo_tecnico   VARCHAR(20) UNIQUE,
  activo           BOOLEAN DEFAULT TRUE,
  creado_en        TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en   TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE tecnico_sedes (
  id          SERIAL PRIMARY KEY,
  tecnico_id  UUID NOT NULL REFERENCES tecnicos(id),
  sede_id     UUID NOT NULL REFERENCES sedes(id),
  es_principal BOOLEAN DEFAULT FALSE,
  activo      BOOLEAN DEFAULT TRUE,
  asignado_en TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tecnico_id, sede_id)
);

CREATE TABLE tecnico_instituciones (
  id             SERIAL PRIMARY KEY,
  tecnico_id     UUID NOT NULL REFERENCES tecnicos(id),
  institucion_id UUID NOT NULL REFERENCES instituciones(id),
  activo         BOOLEAN DEFAULT TRUE,
  asignado_en    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tecnico_id, institucion_id)
);

CREATE TABLE directores (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id       UUID NOT NULL UNIQUE REFERENCES usuarios(id),
  primer_nombre    VARCHAR(100) NOT NULL,
  segundo_nombre   VARCHAR(100),
  primer_apellido  VARCHAR(100) NOT NULL,
  segundo_apellido VARCHAR(100),
  cui              VARCHAR(13) UNIQUE,
  telefono         VARCHAR(20),
  sede_id          UUID REFERENCES sedes(id),
  activo           BOOLEAN DEFAULT TRUE,
  creado_en        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE enlaces_institucionales (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id       UUID NOT NULL UNIQUE REFERENCES usuarios(id),
  primer_nombre    VARCHAR(100) NOT NULL,
  segundo_nombre   VARCHAR(100),
  primer_apellido  VARCHAR(100) NOT NULL,
  segundo_apellido VARCHAR(100),
  cui              VARCHAR(13) UNIQUE,
  telefono         VARCHAR(20),
  institucion_id   UUID NOT NULL REFERENCES instituciones(id),
  cargo            VARCHAR(100),
  activo           BOOLEAN DEFAULT TRUE,
  creado_en        TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- SECCIÓN 6: VOLUNTARIOS Y PRACTICANTES (NUEVO desde instrumento)
-- ============================================================
-- Personas de apoyo en sesiones de educación inclusiva:
-- practicantes universitarios, psicólogos, docentes voluntarios, etc.

CREATE TYPE estado_voluntario AS ENUM ('activo', 'inactivo');

CREATE TABLE voluntarios (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre_completo  VARCHAR(200) NOT NULL,
  especialidad     VARCHAR(150),      -- Psicología, Docente, Bachillerato PRONEA, etc.
  telefono         VARCHAR(20),
  correo           VARCHAR(255),
  direccion        TEXT,
  municipio_id     INTEGER REFERENCES municipios(id),
  departamento     VARCHAR(100),
  universidad      VARCHAR(200),      -- institución de procedencia
  tipo             VARCHAR(50),       -- 'Voluntario' | 'Practicante' | 'Profesional'
  estado           estado_voluntario DEFAULT 'activo',
  fecha_inicio     DATE,
  fecha_fin        DATE,
  cursos           TEXT[],            -- cursos o materias que apoya (array)
  observaciones    TEXT,
  creado_en        TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE voluntarios IS 'Voluntarios, practicantes universitarios y profesionales de apoyo en sesiones de educación inclusiva.';

-- Vinculación voluntario ↔ técnico (quién los supervisó en el instrumento)
CREATE TABLE voluntario_tecnicos (
  id          SERIAL PRIMARY KEY,
  voluntario_id UUID NOT NULL REFERENCES voluntarios(id),
  tecnico_id    UUID NOT NULL REFERENCES tecnicos(id),
  ciclo_escolar SMALLINT NOT NULL,
  activo        BOOLEAN DEFAULT TRUE,
  UNIQUE(voluntario_id, tecnico_id, ciclo_escolar)
);


-- ============================================================
-- SECCIÓN 7: ESTRUCTURA CURRICULAR
-- ============================================================

CREATE TABLE libros (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etapa_id     INTEGER NOT NULL REFERENCES etapas(id),
  nombre       VARCHAR(200) NOT NULL,
  numero       SMALLINT NOT NULL,   -- 1 o 2
  descripcion  TEXT,
  total_tareas INTEGER,
  activo       BOOLEAN DEFAULT TRUE,
  creado_en    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(etapa_id, numero)
);

CREATE TABLE tareas_catalogo (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  libro_id     UUID    NOT NULL REFERENCES libros(id),
  area_id      INTEGER NOT NULL REFERENCES areas(id),
  numero_tarea SMALLINT NOT NULL,
  nombre       VARCHAR(255) NOT NULL,
  paginas      VARCHAR(50),
  puntos_max   NUMERIC(4,1) DEFAULT 5,
  activo       BOOLEAN DEFAULT TRUE,
  UNIQUE(libro_id, numero_tarea)
);

CREATE TABLE examenes_catalogo (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  libro_id   UUID    NOT NULL REFERENCES libros(id),
  area_id    INTEGER NOT NULL REFERENCES areas(id),
  nombre     VARCHAR(255) NOT NULL,
  puntos_max NUMERIC(5,2) DEFAULT 20,
  activo     BOOLEAN DEFAULT TRUE,
  UNIQUE(libro_id, area_id)
);

-- ============================================================
-- SECCIÓN 8: ENLACES DE EVALUACIONES TOMI/CLASSROOM (NUEVO)
-- ============================================================
-- Derivado del archivo ENLACE_DE_EVALUACIONES.xlsx
-- Almacena los códigos/URL de acceso a clases digitales por etapa, libro y área.

CREATE TYPE version_enlace AS ENUM ('viejo', 'nuevo', 'general');

CREATE TABLE enlaces_evaluaciones (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  etapa_id      INTEGER NOT NULL REFERENCES etapas(id),
  libro_id      UUID REFERENCES libros(id),             -- NULL = aplica a toda la etapa
  area_id       INTEGER NOT NULL REFERENCES areas(id),
  version       version_enlace DEFAULT 'general',       -- 'viejo' | 'nuevo' | 'general'
  url           TEXT NOT NULL,                          -- URL completa de la clase
  mensaje_completo TEXT,                                -- texto con "Únete a mi clase..."
  codigo_acceso VARCHAR(20),                            -- código corto ej. 439937
  plataforma    VARCHAR(100) DEFAULT 'Tomi Digital',    -- Tomi Digital, Google Classroom, etc.
  fecha_inicio  DATE,
  fecha_cierre  DATE,
  estado        VARCHAR(50),                            -- 'Actualizado', 'Cerrado', etc.
  activo        BOOLEAN DEFAULT TRUE,
  creado_en     TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE enlaces_evaluaciones IS
  'URLs de acceso a clases digitales (Tomi Digital, Classroom) por etapa, libro y área. '
  'Permite enviar el enlace por WhatsApp directamente desde el sistema.';


-- ============================================================
-- SECCIÓN 9: ENLACES EXTERNOS GENERALES (Ampliado)
-- ============================================================
-- Antes solo contemplaba evaluaciones MINEDUC.
-- Ahora incluye: formularios, páginas web, recursos, documentos PDF, etc.

CREATE TABLE categorias_enlace (
  id     SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE,  -- 'Evaluaciones MINEDUC','Formularios','Recursos','PDF','WhatsApp','Otro'
  icono  VARCHAR(50)                    -- nombre de ícono para el frontend
);

INSERT INTO categorias_enlace (nombre, icono) VALUES
  ('Evaluaciones MINEDUC',    'clipboard-check'),
  ('Formularios Institucionales', 'file-text'),
  ('Recursos Educativos',     'book-open'),
  ('Documentos PDF',          'file-pdf'),
  ('Clases Digitales',        'monitor'),
  ('WhatsApp / Grupos',       'message-circle'),
  ('Páginas Web',             'globe'),
  ('Redes Sociales',          'share-2'),
  ('Otro',                    'link');

CREATE TABLE enlaces_externos (
  id              SERIAL PRIMARY KEY,
  titulo          VARCHAR(200) NOT NULL,
  descripcion     TEXT,
  url             TEXT NOT NULL,
  categoria_id    INTEGER REFERENCES categorias_enlace(id),
  fecha_limite    DATE,
  -- Visibilidad: puede apuntar a etapa, libro, sede o ser global
  etapa_id        INTEGER REFERENCES etapas(id),     -- NULL = todas las etapas
  libro_id        UUID    REFERENCES libros(id),     -- NULL = todos los libros
  sede_id         UUID    REFERENCES sedes(id),      -- NULL = todas las sedes
  -- Metadatos extra
  plataforma      VARCHAR(100),                      -- 'DIGEDUCA', 'MINEDUC', etc.
  requiere_login  BOOLEAN DEFAULT FALSE,
  activo          BOOLEAN DEFAULT TRUE,
  orden           SMALLINT DEFAULT 0,
  creado_por      UUID REFERENCES usuarios(id),
  creado_en       TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en  TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE enlaces_externos IS
  'Repositorio centralizado de todos los enlaces del sistema: '
  'evaluaciones MINEDUC, formularios, recursos, PDFs, WhatsApp, páginas web, etc.';


-- ============================================================
-- SECCIÓN 10: ESTUDIANTES E INSCRIPCIONES
-- ============================================================

CREATE TYPE genero_tipo AS ENUM ('masculino', 'femenino', 'otro');

CREATE TABLE estudiantes (
  id                       UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  usuario_id               UUID NOT NULL UNIQUE REFERENCES usuarios(id),
  codigo_estudiante         VARCHAR(20) NOT NULL UNIQUE,  -- ej. EST-2026-0042 o C508BJP
  codigo_sireex            VARCHAR(30),                   -- código SIREEX (ej. 5657-2025)
  primer_nombre            VARCHAR(100) NOT NULL,
  segundo_nombre           VARCHAR(100),
  primer_apellido          VARCHAR(100) NOT NULL,
  segundo_apellido         VARCHAR(100),
  apellido_casada          VARCHAR(100),                  -- nuevo: apellido de casada
  cui                      VARCHAR(13)  UNIQUE,           -- puede estar pendiente ('No tengo')
  cui_pendiente            BOOLEAN DEFAULT FALSE,         -- TRUE si aún no tiene CUI
  fecha_nacimiento         DATE,
  genero                   genero_tipo,
  nacionalidad             VARCHAR(100) DEFAULT 'Guatemalteca',

  -- Contacto
  telefono                 VARCHAR(20)  NOT NULL,
  telefono_alternativo     VARCHAR(20),
  correo                   VARCHAR(255),
  correo_alternativo       VARCHAR(255),
  correo_classroom         VARCHAR(255),                  -- correo para plataformas educativas

  -- Dirección
  direccion                TEXT,
  colonia_barrio           VARCHAR(200),
  municipio_id             INTEGER REFERENCES municipios(id),
  departamento             VARCHAR(100) DEFAULT 'Sacatepéquez',
  codigo_postal            VARCHAR(10),

  -- Datos específicos
  discapacidad_id          INTEGER REFERENCES tipos_discapacidad(id),
  discapacidad_detalle     TEXT,                           -- observaciones adicionales sobre la discapacidad
  conflicto_ley            BOOLEAN DEFAULT FALSE,          -- nuevo: "Conflicto con la Ley"
  becado_por               VARCHAR(200),                   -- nuevo: institución becante (MINEDUC, etc.)
  establecimiento_anterior VARCHAR(255),
  anio_estudios_anteriores SMALLINT,

  activo                   BOOLEAN DEFAULT TRUE,
  creado_en                TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TYPE estado_inscripcion AS ENUM (
  'en_curso', 'completada', 'retirada', 'suspendida', 'finalizada'
);

CREATE TABLE inscripciones (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estudiante_id     UUID     NOT NULL REFERENCES estudiantes(id),
  etapa_id          INTEGER  NOT NULL REFERENCES etapas(id),
  tecnico_id        UUID     NOT NULL REFERENCES tecnicos(id),
  sede_id           UUID     NOT NULL REFERENCES sedes(id),
  institucion_id    UUID     REFERENCES instituciones(id),
  modalidad_id      INTEGER  REFERENCES modalidades(id),    -- nuevo: semipresencial/a distancia
  seccion_id        INTEGER  REFERENCES secciones(id),      -- nuevo: sección A, B, A3, etc.
  ciclo_escolar     SMALLINT NOT NULL,
  fecha_inscripcion DATE     NOT NULL DEFAULT CURRENT_DATE,
  repite_etapa      BOOLEAN  DEFAULT FALSE,
  estado            estado_inscripcion DEFAULT 'en_curso',
  estado_classroom  VARCHAR(100),                           -- nuevo: 'Ya tengo acceso', 'No tengo acceso'
  codigo_sireex     VARCHAR(30),                            -- código SIREEX de esta inscripción
  tecnico_sireex_id UUID REFERENCES tecnicos(id),          -- técnico que inscribió en SIREEX
  fecha_cierre      DATE,
  observaciones     TEXT,
  creado_por        UUID REFERENCES usuarios(id),
  creado_en         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(estudiante_id, etapa_id, ciclo_escolar)
);


-- ============================================================
-- SECCIÓN 11: COMPETENCIAS DIGITALES (NUEVO)
-- ============================================================
-- Derivado de la hoja "Competencias digitales" y "Respuestas de formulario 5"
-- Registro de estudiantes en cursos digitales complementarios

CREATE TABLE cursos_digitales (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(200) NOT NULL UNIQUE,   -- ej. 'Fundamentos de computación'
  descripcion TEXT,
  activo      BOOLEAN DEFAULT TRUE,
  creado_en   TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO cursos_digitales (nombre) VALUES
  ('Fundamentos de computación'),
  ('Documentos profesionales con Word'),
  ('Diseño publicitario con Canva'),
  ('Proyecto de emprendimiento digital'),
  ('Comunicación digital profesional');

CREATE TABLE inscripciones_digitales (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estudiante_id       UUID NOT NULL REFERENCES estudiantes(id),
  curso_id            INTEGER NOT NULL REFERENCES cursos_digitales(id),
  tecnico_id          UUID REFERENCES tecnicos(id),
  sede_id             UUID REFERENCES sedes(id),
  ciclo_escolar       SMALLINT NOT NULL,
  fecha_inscripcion   TIMESTAMPTZ DEFAULT NOW(),
  estado_classroom    VARCHAR(100),   -- 'Ya tengo acceso', 'No tengo acceso', NULL
  ingresado_whatsapp  BOOLEAN,        -- ¿fue agregado al grupo de WhatsApp?
  seccion             VARCHAR(10),    -- 'A' o 'B'
  activo              BOOLEAN DEFAULT TRUE,
  UNIQUE(estudiante_id, curso_id, ciclo_escolar)
);

COMMENT ON TABLE inscripciones_digitales IS
  'Registro de participación en cursos de competencias digitales (Tomi, Classroom, etc.).';


-- ============================================================
-- SECCIÓN 12: NOTAS
-- ============================================================

CREATE TABLE notas_tareas (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inscripcion_id UUID    NOT NULL REFERENCES inscripciones(id),
  tarea_id       UUID    NOT NULL REFERENCES tareas_catalogo(id),
  nota           NUMERIC(3,1) NOT NULL CHECK (nota >= 0 AND nota <= 5),
  registrado_por UUID    NOT NULL REFERENCES usuarios(id),
  registrado_en  TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(inscripcion_id, tarea_id)
);

CREATE TABLE notas_examenes (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inscripcion_id   UUID    NOT NULL REFERENCES inscripciones(id),
  examen_id        UUID    NOT NULL REFERENCES examenes_catalogo(id),
  nota_original    NUMERIC(5,2) NOT NULL CHECK (nota_original >= 0 AND nota_original <= 100),
  puntos_obtenidos NUMERIC(5,2) GENERATED ALWAYS AS (nota_original * 20 / 100) STORED,
  registrado_por   UUID    NOT NULL REFERENCES usuarios(id),
  registrado_en    TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(inscripcion_id, examen_id)
);


-- ============================================================
-- SECCIÓN 13: PROMEDIOS POR LIBRO Y ETAPA
-- ============================================================

CREATE TYPE estado_libro AS ENUM (
  'en_progreso', 'listo_validar', 'validado', 'exportado'
);

CREATE TABLE resumen_libro (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inscripcion_id       UUID NOT NULL REFERENCES inscripciones(id),
  libro_id             UUID NOT NULL REFERENCES libros(id),
  tareas_completadas   INTEGER DEFAULT 0,
  tareas_total         INTEGER DEFAULT 0,
  puntos_tareas        NUMERIC(8,2) DEFAULT 0,
  puntos_tareas_max    NUMERIC(8,2) DEFAULT 0,
  zona                 NUMERIC(6,2),
  promedio_examen      NUMERIC(6,2),
  nota_examen_final    NUMERIC(6,2),
  nota_final           NUMERIC(6,2),
  calificacion_cualitativa VARCHAR(30),
  promovido            BOOLEAN,
  estado               estado_libro DEFAULT 'en_progreso',
  actualizado_en       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(inscripcion_id, libro_id)
);

CREATE TABLE resumen_etapa (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inscripcion_id       UUID NOT NULL UNIQUE REFERENCES inscripciones(id),
  nota_libro_1         NUMERIC(6,2),
  nota_libro_2         NUMERIC(6,2),
  nota_final_etapa     NUMERIC(6,2),
  calificacion_cualitativa VARCHAR(30),
  promovido            BOOLEAN,
  validado_digeex      BOOLEAN DEFAULT FALSE,
  validado_por         UUID REFERENCES usuarios(id),
  validado_en          TIMESTAMPTZ,
  exportado_sireex     BOOLEAN DEFAULT FALSE,
  exportado_en         TIMESTAMPTZ,
  actualizado_en       TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- SECCIÓN 14: INSTRUMENTOS DE EVALUACIÓN DE DISCAPACIDAD (NUEVO)
-- ============================================================
-- Derivado del archivo Instrumento_de_evaluación_...xlsx
-- Registra la evaluación formal de discapacidad de cada estudiante.

-- 14.1 Criterios de evaluación por tipo de discapacidad
CREATE TABLE criterios_discapacidad (
  id                  SERIAL PRIMARY KEY,
  tipo_discapacidad_id INTEGER NOT NULL REFERENCES tipos_discapacidad(id),
  grupo               VARCHAR(10) NOT NULL,    -- 'A', 'B', 'C', 'D'
  numero              SMALLINT    NOT NULL,
  descripcion         TEXT        NOT NULL,
  es_indispensable    BOOLEAN DEFAULT TRUE,    -- si debe marcarse o no es indispensable
  minimo_requerido    SMALLINT,                -- mínimo de criterios del grupo a marcar
  activo              BOOLEAN DEFAULT TRUE,
  UNIQUE(tipo_discapacidad_id, grupo, numero)
);

COMMENT ON TABLE criterios_discapacidad IS
  'Criterios de los instrumentos de evaluación de discapacidad (motora, intelectual, TEA, auditiva, visual). '
  'Editables por el administrador.';

-- 14.2 Resultado de evaluación de discapacidad por estudiante
CREATE TABLE evaluaciones_discapacidad (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estudiante_id        UUID    NOT NULL REFERENCES estudiantes(id),
  tipo_discapacidad_id INTEGER NOT NULL REFERENCES tipos_discapacidad(id),
  evaluado_por         UUID    NOT NULL REFERENCES tecnicos(id),
  ciclo_escolar        SMALLINT NOT NULL,
  fecha_evaluacion     DATE    NOT NULL DEFAULT CURRENT_DATE,
  confirmado           BOOLEAN,              -- SI/NO del "Confirmar"
  comentarios          TEXT,
  creado_en            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(estudiante_id, tipo_discapacidad_id, ciclo_escolar)
);

-- 14.3 Detalle de criterios marcados en la evaluación
CREATE TABLE evaluacion_criterios (
  id              SERIAL PRIMARY KEY,
  evaluacion_id   UUID    NOT NULL REFERENCES evaluaciones_discapacidad(id),
  criterio_id     INTEGER NOT NULL REFERENCES criterios_discapacidad(id),
  marcado         BOOLEAN NOT NULL DEFAULT FALSE,
  UNIQUE(evaluacion_id, criterio_id)
);


-- ============================================================
-- SECCIÓN 15: PLANIFICACIÓN DOCENTE — EDUCACIÓN INCLUSIVA (NUEVO)
-- ============================================================
-- Derivado de las hojas BASE-PLAN, Planificación docente, Base de datos Planificación

-- 15.1 Objetivos anuales del programa de inclusión
CREATE TABLE objetivos_inclusion (
  id                   SERIAL PRIMARY KEY,
  ciclo_escolar        SMALLINT NOT NULL,
  objetivo_general     TEXT     NOT NULL,
  objetivo_especifico1 TEXT,
  objetivo_especifico2 TEXT,
  objetivo_especifico3 TEXT,
  objetivo_especifico4 TEXT,
  creado_en            TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO objetivos_inclusion (ciclo_escolar, objetivo_general, objetivo_especifico1, objetivo_especifico2, objetivo_especifico3)
VALUES (2026,
  'Promover el desarrollo integral y la participación activa de jóvenes y adultos con discapacidad mediante una educación inclusiva centrada en sus fortalezas, que fomente la autonomía, la autodeterminación y su plena inserción social y comunitaria.',
  'Fortalecer la capacidad de autodeterminación y comunicación funcional para que cada estudiante pueda expresar preferencias, necesidades y tomar decisiones informadas sobre su proceso de aprendizaje y vida cotidiana.',
  'Desarrollar habilidades de autonomía e independencia mediante la aplicación práctica de conocimientos académicos en situaciones reales y simuladas de la vida diaria y comunitaria.',
  'Fomentar la participación ciudadana activa y la inserción social, facilitando que los estudiantes identifiquen, analicen y propongan soluciones a situaciones relevantes de su entorno.');

-- 15.2 Sesiones de tutoría (planificación de clase)
CREATE TABLE sesiones_tutoria (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tecnico_id            UUID     NOT NULL REFERENCES tecnicos(id),
  tecnico_cotutor_id    UUID     REFERENCES tecnicos(id),         -- segundo técnico
  sede_id               UUID     REFERENCES sedes(id),
  ciclo_escolar         SMALLINT NOT NULL,
  fecha_sesion          DATE     NOT NULL,
  hora_inicio           TIME,
  hora_fin              TIME,
  fecha_revision        DATE,                                     -- fecha de revisión de planificación

  -- Encabezado pedagógico
  objetivo_id           INTEGER  REFERENCES objetivos_inclusion(id),
  competencia           TEXT,
  indicador_logro_1     TEXT,
  indicador_logro_2     TEXT,
  indicador_logro_3     TEXT,
  indicador_logro_4     TEXT,

  -- Evaluación de la jornada
  jornada_resultado     VARCHAR(20),                              -- 'EXITOSA' | 'BUENA' | 'REGULAR'
  observaciones         TEXT,
  creado_en             TIMESTAMPTZ DEFAULT NOW(),
  actualizado_en        TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE sesiones_tutoria IS
  'Registro de planificación y ejecución de sesiones de educación inclusiva. '
  'Una sesión puede tener varios bloques horarios (actividades).';

-- 15.3 Actividades dentro de cada sesión (bloques horarios)
CREATE TABLE sesion_actividades (
  id             SERIAL PRIMARY KEY,
  sesion_id      UUID    NOT NULL REFERENCES sesiones_tutoria(id),
  orden          SMALLINT NOT NULL,
  hora_inicio    TIME,
  hora_fin       TIME,
  area_id        INTEGER REFERENCES areas(id),
  contenido      TEXT,
  actividad      TEXT,
  recursos       TEXT,
  es_receso      BOOLEAN DEFAULT FALSE
);

-- 15.4 Estudiantes atendidos en cada sesión
CREATE TABLE sesion_estudiantes (
  id            SERIAL PRIMARY KEY,
  sesion_id     UUID    NOT NULL REFERENCES sesiones_tutoria(id),
  estudiante_id UUID    NOT NULL REFERENCES estudiantes(id),
  UNIQUE(sesion_id, estudiante_id)
);

-- 15.5 Voluntarios/practicantes participantes en cada sesión
CREATE TABLE sesion_voluntarios (
  id            SERIAL PRIMARY KEY,
  sesion_id     UUID NOT NULL REFERENCES sesiones_tutoria(id),
  voluntario_id UUID NOT NULL REFERENCES voluntarios(id),
  funcion       VARCHAR(100),   -- 'Practicante', 'Docente', 'Voluntario', etc.
  UNIQUE(sesion_id, voluntario_id)
);

-- 15.6 Áreas trabajadas en la planificación conjunta (Base de datos Planificación)
CREATE TABLE sesion_areas_planificacion (
  id                  SERIAL PRIMARY KEY,
  sesion_id           UUID    NOT NULL REFERENCES sesiones_tutoria(id),
  area_id             INTEGER NOT NULL REFERENCES areas(id),
  competencia         TEXT,
  contenido           TEXT,
  metodologia         TEXT,
  tareas_priorizadas  TEXT,
  recursos            TEXT,
  resultados_esperados TEXT,
  UNIQUE(sesion_id, area_id)
);


-- ============================================================
-- SECCIÓN 16: DIARIO DE CLASES (NUEVO — hoja "Diario de clases")
-- ============================================================

CREATE TABLE diario_clases (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estudiante_id    UUID NOT NULL REFERENCES estudiantes(id),
  sesion_id        UUID REFERENCES sesiones_tutoria(id),
  fecha            DATE NOT NULL,
  que_aprendi      TEXT,
  que_gusto_mas    TEXT,
  lo_mas_dificil   TEXT,
  como_lo_haria_diferente TEXT,
  dudas            TEXT,
  creado_en        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SECCIÓN 17: DIARIO DEL TRABAJO — TÉCNICO (NUEVO)
-- ============================================================

CREATE TABLE diario_trabajo (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sesion_id                 UUID NOT NULL REFERENCES sesiones_tutoria(id),
  tecnico_id                UUID NOT NULL REFERENCES tecnicos(id),
  voluntario_id             UUID REFERENCES voluntarios(id),
  estudiantes_atendidos     SMALLINT,
  material_didactico        TEXT,
  jornada_resultado         VARCHAR(20),     -- 'EXITOSA' | 'BUENA' | 'REGULAR'

  -- Campos formativos abordados
  lenguaje_terapia          BOOLEAN DEFAULT FALSE,
  saberes_cientifico        BOOLEAN DEFAULT FALSE,
  etica_naturaleza_sociedad BOOLEAN DEFAULT FALSE,
  terapia_ocupacional       BOOLEAN DEFAULT FALSE,

  -- Organización del grupo
  organizacion_grupal       BOOLEAN DEFAULT FALSE,
  organizacion_individual   BOOLEAN DEFAULT FALSE,
  organizacion_pares        BOOLEAN DEFAULT FALSE,
  organizacion_equipo       BOOLEAN DEFAULT FALSE,

  -- En relación a lo planeado
  tiempo_suficiente         BOOLEAN,
  actividades_accesibles    BOOLEAN,
  material_adecuado         BOOLEAN,
  trabajo_fuera_salon       BOOLEAN,

  -- Reflexión del practicante/voluntario
  intervencion_adecuada     BOOLEAN,
  desarrollo_social         BOOLEAN,
  vocabulario_adecuado      BOOLEAN,
  resultados_esperados      BOOLEAN,

  -- Manifestación de los estudiantes
  involucramiento           VARCHAR(20),     -- 'Todos' | 'Algunos' | 'Muy pocos'
  se_interesaron            BOOLEAN,
  actitud_jornada           VARCHAR(30),     -- 'Participativa' | 'Buena' | 'Regular' | 'Sin interés'
  hubo_interrupciones       BOOLEAN,

  -- Narrativa
  factores_avance_obstaculizacion TEXT,
  que_mejorar_proxima_clase       TEXT,
  estudiantes_inquietos           TEXT,
  estudiantes_participativos      TEXT,
  estudiantes_avances_significativos TEXT,

  creado_en   TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- SECCIÓN 18: ESCALA DE ACTITUDES (NUEVO)
-- ============================================================

CREATE TABLE escala_actitudes_items (
  id          SERIAL PRIMARY KEY,
  numero      SMALLINT NOT NULL,
  indicador   TEXT     NOT NULL,
  activo      BOOLEAN DEFAULT TRUE
);

INSERT INTO escala_actitudes_items (numero, indicador) VALUES
  (1,  'Comparto mis materiales con los compañeros que no los tienen.'),
  (2,  'Me gusta ayudar a mis compañeros en las actividades que no entienden.'),
  (3,  'Creo que uno debe ayudar solamente a sus amigos.'),
  (4,  'Me disgusta ayudar a los compañeros que no entienden las actividades.'),
  (5,  'Puedo organizar actividades para integrar a los compañeros que están solos.'),
  (6,  'Me gusta trabajar en equipo.'),
  (7,  'Puedo organizar las actividades del equipo cuando me lo piden.'),
  (8,  'Me alegro cuando mis compañeros mejoran.'),
  (9,  'Me molesta compartir mis materiales con compañeros que no los tienen.'),
  (10, 'Puedo escuchar con atención las opiniones de mis compañeros.'),
  (11, 'Me burlo de mis compañeros cuando se equivocan.'),
  (12, 'Me molesta escuchar las opiniones de mis compañeros.'),
  (13, 'Respeto las opiniones de mis compañeros aunque no esté de acuerdo con ellas.'),
  (14, 'Creo que es mejor formar equipos con mis amigos.'),
  (15, 'Puedo formar equipo con todos mis compañeros.');

CREATE TYPE respuesta_actitud AS ENUM ('TA','PA','NA_ND','PD','TD');
-- TA=Totalmente de acuerdo, PA=Parcialmente de acuerdo,
-- NA_ND=Ni de acuerdo ni en desacuerdo, PD=Parcialmente en desacuerdo, TD=Totalmente en desacuerdo

CREATE TABLE escala_actitudes_respuestas (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estudiante_id UUID    NOT NULL REFERENCES estudiantes(id),
  sesion_id     UUID    REFERENCES sesiones_tutoria(id),
  fecha         DATE    NOT NULL DEFAULT CURRENT_DATE,
  creado_en     TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE escala_actitudes_detalle (
  id              SERIAL PRIMARY KEY,
  respuesta_id    UUID     NOT NULL REFERENCES escala_actitudes_respuestas(id),
  item_id         INTEGER  NOT NULL REFERENCES escala_actitudes_items(id),
  respuesta       respuesta_actitud NOT NULL,
  UNIQUE(respuesta_id, item_id)
);


-- ============================================================
-- SECCIÓN 19: ESCALAS DE CALIFICACIÓN (documentos generados)
-- ============================================================

CREATE TABLE escalas_calificacion (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  inscripcion_id UUID NOT NULL REFERENCES inscripciones(id),
  libro_id       UUID NOT NULL REFERENCES libros(id),
  numero_escala  VARCHAR(30) UNIQUE,
  generada_por   UUID NOT NULL REFERENCES usuarios(id),
  generada_en    TIMESTAMPTZ DEFAULT NOW(),
  url_pdf        TEXT,
  firmada        BOOLEAN DEFAULT FALSE,
  fecha_firma    DATE,
  observaciones  TEXT
);


-- ============================================================
-- SECCIÓN 20: DOCUMENTOS DEL ESTUDIANTE (Google Drive)
-- ============================================================

CREATE TABLE tipos_documento (
  id              SERIAL PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL,
  formato         VARCHAR(50),
  tamano_max_mb   SMALLINT DEFAULT 5,
  obligatorio     BOOLEAN DEFAULT TRUE,
  activo          BOOLEAN DEFAULT TRUE
);

INSERT INTO tipos_documento (nombre, formato, tamano_max_mb, obligatorio) VALUES
  ('DPI (ambos lados)',                  'PDF',     5, TRUE),
  ('Certificado de nacimiento',          'PDF',     5, TRUE),
  ('Constancia de estudios anteriores',  'PDF',     5, FALSE),
  ('Fotografía reciente',                'JPG/PNG', 2, TRUE),
  ('Certificado médico (discapacidad)',  'PDF',     5, FALSE);

CREATE TYPE estado_documento AS ENUM ('pendiente','en_revision','aprobado','rechazado');

CREATE TABLE documentos_estudiante (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estudiante_id     UUID    NOT NULL REFERENCES estudiantes(id),
  tipo_documento_id INTEGER NOT NULL REFERENCES tipos_documento(id),
  url_google_drive  TEXT    NOT NULL,
  estado            estado_documento DEFAULT 'en_revision',
  revisado_por      UUID REFERENCES usuarios(id),
  revisado_en       TIMESTAMPTZ,
  motivo_rechazo    TEXT,
  subido_en         TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(estudiante_id, tipo_documento_id)
);

-- Documentos PDF del instrumento (hoja DOCUMENTOS PDF)
CREATE TABLE documentos_pdf_institucionales (
  id              SERIAL PRIMARY KEY,
  tipo            VARCHAR(200) NOT NULL,   -- ej. 'Planificación del mes de Julio'
  url             TEXT         NOT NULL,
  descripcion     TEXT,
  tecnico_id      UUID REFERENCES tecnicos(id),
  ciclo_escolar   SMALLINT,
  fecha_documento DATE,
  activo          BOOLEAN DEFAULT TRUE,
  creado_en       TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE documentos_pdf_institucionales IS
  'Repositorio de documentos PDF institucionales (planificaciones, reportes, actas) '
  'accesibles vía SharePoint, Google Drive u otros repositorios.';


-- ============================================================
-- SECCIÓN 21: AUDITORÍA
-- ============================================================

CREATE TABLE auditoria (
  id               BIGSERIAL PRIMARY KEY,
  usuario_id       UUID REFERENCES usuarios(id),
  accion           VARCHAR(100) NOT NULL,
  tabla_afectada   VARCHAR(100),
  registro_id      TEXT,
  datos_anteriores JSONB,
  datos_nuevos     JSONB,
  ip_address       VARCHAR(50),
  user_agent       TEXT,
  creado_en        TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- SECCIÓN 22: ÍNDICES
-- ============================================================

-- Estudiantes
CREATE INDEX idx_est_cui             ON estudiantes(cui);
CREATE INDEX idx_est_codigo          ON estudiantes(codigo_estudiante);
CREATE INDEX idx_est_nombre          ON estudiantes(primer_apellido, primer_nombre);
CREATE INDEX idx_est_discapacidad    ON estudiantes(discapacidad_id);

-- Inscripciones
CREATE INDEX idx_insc_tecnico        ON inscripciones(tecnico_id);
CREATE INDEX idx_insc_sede           ON inscripciones(sede_id);
CREATE INDEX idx_insc_ciclo          ON inscripciones(ciclo_escolar);
CREATE INDEX idx_insc_estado         ON inscripciones(estado);
CREATE INDEX idx_insc_etapa          ON inscripciones(etapa_id);

-- Inscripciones digitales
CREATE INDEX idx_insc_dig_estudiante ON inscripciones_digitales(estudiante_id);
CREATE INDEX idx_insc_dig_ciclo      ON inscripciones_digitales(ciclo_escolar);

-- Notas
CREATE INDEX idx_nt_insc             ON notas_tareas(inscripcion_id);
CREATE INDEX idx_ne_insc             ON notas_examenes(inscripcion_id);

-- Sesiones
CREATE INDEX idx_ses_tecnico         ON sesiones_tutoria(tecnico_id);
CREATE INDEX idx_ses_fecha           ON sesiones_tutoria(fecha_sesion);
CREATE INDEX idx_ses_ciclo           ON sesiones_tutoria(ciclo_escolar);

-- Evaluaciones discapacidad
CREATE INDEX idx_evd_estudiante      ON evaluaciones_discapacidad(estudiante_id);
CREATE INDEX idx_evd_tipo            ON evaluaciones_discapacidad(tipo_discapacidad_id);

-- Enlaces
CREATE INDEX idx_ee_etapa            ON enlaces_externos(etapa_id);
CREATE INDEX idx_ee_categoria        ON enlaces_externos(categoria_id);
CREATE INDEX idx_ee_activo           ON enlaces_externos(activo);
CREATE INDEX idx_eeval_etapa         ON enlaces_evaluaciones(etapa_id);
CREATE INDEX idx_eeval_area          ON enlaces_evaluaciones(area_id);

-- Auditoría
CREATE INDEX idx_aud_usuario         ON auditoria(usuario_id);
CREATE INDEX idx_aud_fecha           ON auditoria(creado_en);
CREATE INDEX idx_aud_accion          ON auditoria(accion);


-- ============================================================
-- SECCIÓN 23: ROW LEVEL SECURITY (activar en tablas sensibles)
-- ============================================================

ALTER TABLE estudiantes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscripciones            ENABLE ROW LEVEL SECURITY;
ALTER TABLE inscripciones_digitales  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_tareas             ENABLE ROW LEVEL SECURITY;
ALTER TABLE notas_examenes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumen_libro            ENABLE ROW LEVEL SECURITY;
ALTER TABLE resumen_etapa            ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos_estudiante    ENABLE ROW LEVEL SECURITY;
ALTER TABLE evaluaciones_discapacidad ENABLE ROW LEVEL SECURITY;
ALTER TABLE diario_clases            ENABLE ROW LEVEL SECURITY;
ALTER TABLE diario_trabajo           ENABLE ROW LEVEL SECURITY;

-- NOTA: Definir políticas RLS específicas desde la aplicación usando
-- el claim "rol" del JWT de Supabase Auth. Ejemplo:
--
-- CREATE POLICY "tecnico_solo_sus_estudiantes"
--   ON inscripciones FOR SELECT
--   USING (tecnico_id = auth.uid()::uuid);
--
-- CREATE POLICY "estudiante_solo_sus_datos"
--   ON notas_tareas FOR SELECT
--   USING (
--     inscripcion_id IN (
--       SELECT id FROM inscripciones
--       WHERE estudiante_id IN (
--         SELECT id FROM estudiantes WHERE usuario_id = auth.uid()
--       )
--     )
--   );


-- ============================================================
-- FIN DEL SCRIPT v2.0
-- ============================================================
