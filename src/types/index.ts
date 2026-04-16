// src/types/index.ts
// Tipos exactos del esquema Supabase actual (v4)

export type RolUsuario = 'administrador'|'coordinador_digeex'|'director'|'tecnico'|'enlace_institucional'|'estudiante'
export type EstadoInscripcion = 'en_curso'|'completada'|'retirada'|'suspendida'|'finalizada'
export type EstadoLibro = 'en_progreso'|'listo_validar'|'validado'|'exportado'
export type EstadoDocumento = 'pendiente'|'en_revision'|'aprobado'|'rechazado'
export type GeneroTipo = 'masculino'|'femenino'|'otro'
export type VersionLibro = 'viejo'|'nuevo'
export type VersionEnlace = 'viejo'|'nuevo'|'general'
export type EstadoGrupo = 'abierto'|'cerrado'|'exportado'
export type TipoEscala = 'libro'|'area'|'examen'|'etapa'
export type RespuestaActitud = 'TA'|'PA'|'NA_ND'|'PD'|'TD'

// ── Core ────────────────────────────────────────────────────
export interface Usuario {
  id: string; correo: string; rol: RolUsuario; activo: boolean
  primer_ingreso: boolean; intentos_fallidos: number
  bloqueado_hasta: string|null; ultimo_acceso: string|null; creado_en: string
}
export interface Etapa {
  id: number; codigo: string; nombre: string
  nivel: 'PRIMARIA'|'BASICO'|'BACHILLERATO'; orden: number; activo: boolean
}
export interface Area { id: number; codigo: string; nombre: string; activo: boolean }
export interface Municipio { id: number; nombre: string; departamento: string; activo: boolean }
export interface Seccion { id: number; codigo: string; descripcion: string|null }
export interface Modalidad { id: number; nombre: string; descripcion: string|null }
export interface TipoDiscapacidad { id: number; codigo: string; nombre: string; descripcion: string|null }

// ── Infraestructura ────────────────────────────────────────
export interface Institucion {
  id: string; nombre: string; tipo: string|null; municipio_id: number|null
  direccion: string|null; telefono: string|null; correo: string|null; activo: boolean
}
export interface Sede {
  id: string; nombre: string; municipio_id: number; direccion: string|null
  telefono: string|null; horario: string|null; institucion_id: string|null; activo: boolean
}

// ── Personal ───────────────────────────────────────────────
export interface Tecnico {
  id: string; usuario_id: string; primer_nombre: string; segundo_nombre: string|null
  primer_apellido: string; segundo_apellido: string|null; cui: string
  telefono: string|null; especialidad: string|null; codigo_tecnico: string|null; activo: boolean
}
export interface Director {
  id: string; usuario_id: string; primer_nombre: string; primer_apellido: string
  segundo_apellido: string|null; cui: string|null; telefono: string|null; sede_id: string|null; activo: boolean
}
export interface EnlaceInstitucional {
  id: string; usuario_id: string; primer_nombre: string; primer_apellido: string
  cui: string|null; telefono: string|null; institucion_id: string; cargo: string|null; activo: boolean
}

// ── Libros y curricular ────────────────────────────────────
export interface Libro {
  id: string; etapa_id: number; nombre: string; numero: 1|2
  version: VersionLibro; descripcion: string|null; total_tareas: number|null; activo: boolean
  etapa?: Etapa
}
export interface TareaCatalogo {
  id: string; libro_id: string; area_id: number; numero_tarea: number
  nombre: string; paginas: string|null; puntos_max: number; activo: boolean; area?: Area
}
export interface ExamenCatalogo {
  id: string; libro_id: string; area_id: number; nombre: string; puntos_max: number; activo: boolean; area?: Area
}

// ── Estudiantes e inscripciones ────────────────────────────
export interface Estudiante {
  id: string; usuario_id: string; codigo_estudiante: string
  primer_nombre: string; segundo_nombre: string|null
  primer_apellido: string; segundo_apellido: string|null; apellido_casada: string|null
  cui: string|null; cui_pendiente: boolean; fecha_nacimiento: string|null
  genero: GeneroTipo|null; telefono: string; correo: string|null; correo_classroom: string|null
  municipio_id: number|null; discapacidad_id: number|null; conflicto_ley: boolean
  becado_por: string|null; activo: boolean
  discapacidad?: TipoDiscapacidad; municipio?: Municipio
}
export interface Inscripcion {
  id: string; estudiante_id: string; etapa_id: number; tecnico_id: string; sede_id: string
  institucion_id: string|null; modalidad_id: number|null; seccion_id: number|null
  ciclo_escolar: number; fecha_inscripcion: string; repite_etapa: boolean
  estado: EstadoInscripcion; estado_classroom: string|null; codigo_sireex: string|null
  version_libro: VersionLibro; tiene_ajuste_discapacidad: boolean
  observaciones: string|null; creado_en: string
  estudiante?: Estudiante; etapa?: Etapa; tecnico?: Tecnico; sede?: Sede
  modalidad?: Modalidad; seccion?: Seccion; institucion?: Institucion
}

// ── Notas ──────────────────────────────────────────────────
export interface NotaTarea {
  id: string; inscripcion_id: string; tarea_id: string; nota: number
  con_ajuste: boolean; ajuste_id: string|null; registrado_en: string
}
export interface NotaExamen {
  id: string; inscripcion_id: string; examen_id: string
  nota_original: number; puntos_obtenidos: number; registrado_en: string
}
export interface ResumenLibro {
  id: string; inscripcion_id: string; libro_id: string
  tareas_completadas: number; tareas_total: number; puntos_tareas: number; puntos_tareas_max: number
  zona: number|null; nota_final: number|null; promovido: boolean|null
  estado: EstadoLibro; tiene_ajuste: boolean; libro?: Libro
}
export interface ResumenEtapa {
  id: string; inscripcion_id: string
  nota_libro_1: number|null; nota_libro_2: number|null; nota_final_etapa: number|null
  calificacion_cualitativa: string|null; promovido: boolean|null
  validado_digeex: boolean; exportado_sireex: boolean
}

// ── Permisos dinámicos (v4) ────────────────────────────────
export interface PermisoGlobal {
  id: string; permiso: string; descripcion: string|null; activo: boolean
  actualizado_por: string|null; actualizado_en: string; creado_en: string
}
export interface AutorizacionDirector {
  id: string; director_id: string; enlace_id: string; permiso: string
  activo: boolean; fecha_inicio: string; fecha_fin: string|null
  autorizado_por_admin: string|null; admin_confirmado_en: string|null
  observaciones: string|null; creado_en: string; actualizado_en: string
  director?: Director; enlace?: EnlaceInstitucional
  puede_ejecutar?: boolean
}
export interface HistorialPermiso {
  id: number; tipo_evento: string; permiso: string|null
  director_id: string|null; enlace_id: string|null; usuario_actor: string|null
  detalle: Record<string,unknown>|null; ip_address: string|null; creado_en: string
}

// ── Visibilidad coordinador (v4) ───────────────────────────
export interface VisibilidadInstitucion {
  id: string; institucion_id: string; visible_para_coordinador: boolean
  ocultar_enlace: boolean; razon_ocultamiento: string|null
  configurado_por: string|null; configurado_en: string
}

// ── Recursos y establecimiento ─────────────────────────────
export interface RecursoApoyo {
  id: string; titulo: string; descripcion: string|null; url: string
  categoria_id: number|null; etapa_id: number|null; area_id: number|null; libro_id: string|null
  tipo_contenido: string|null; duracion_minutos: number|null; es_publico: boolean
  activo: boolean; destacado: boolean; orden: number
  categoria?: { nombre: string; icono: string|null; color: string|null }
  etapa?: Etapa; area?: Area
}
export interface InfoEstablecimiento {
  id: 1; nombre_completo: string; nombre_corto: string|null
  director_nombre: string|null; director_titulo: string|null
  telefono: string|null; whatsapp: string|null; correo: string|null
  facebook: string|null; sitio_web: string|null; horario_atencion: string|null
  logo_url: string|null; logo_mineduc_url: string|null; logo_digeex_url: string|null
  logo_establecimiento_url: string|null; departamento: string|null
  municipio: string|null; direccion: string|null
}
export interface SliderImagen {
  id: number; titulo: string|null; url_imagen: string; url_enlace: string|null; orden: number; activo: boolean
}

// ── Ajustes discapacidad ───────────────────────────────────
export interface AjusteDiscapacidad {
  id: string; inscripcion_id: string; area_id: number|null; libro_id: string|null
  tipo_ajuste_id: number|null; tareas_total_ajustado: number|null
  puntos_max_ajustado: number|null; porcentaje_examen_ajustado: number|null
  descripcion_ajuste: string; activo: boolean; creado_en: string
  tipo_ajuste?: { nombre: string; descripcion: string|null }; area?: Area; libro?: Libro
}

// ── Grupos SIREEX ──────────────────────────────────────────
export interface GrupoSireex {
  id: string; codigo: string; nombre: string|null; tecnico_id: string
  etapa_id: number; sede_id: string; ciclo_escolar: number; estado: EstadoGrupo
  fecha_apertura: string; fecha_cierre: string|null; observaciones: string|null
  tecnico?: Tecnico; etapa?: Etapa; sede?: Sede
  _count?: { estudiantes: number }
}

// ── Session payload ────────────────────────────────────────
export interface SessionPayload {
  sub: string; correo: string; rol: RolUsuario; activo: boolean; iat: number; exp: number
}

// ── Helpers ────────────────────────────────────────────────
export const ROL_LABELS: Record<RolUsuario,string> = {
  administrador:'Administrador', coordinador_digeex:'Coordinador DIGEEX',
  director:'Director', tecnico:'Técnico PRONEA',
  enlace_institucional:'Enlace Institucional', estudiante:'Estudiante',
}
export const ETAPAS_LISTA = [
  {id:1,nombre:'1era Etapa Primaria',nivel:'PRIMARIA'},
  {id:2,nombre:'2da Etapa Primaria',nivel:'PRIMARIA'},
  {id:3,nombre:'1era Etapa Básico',nivel:'BASICO'},
  {id:4,nombre:'2da Etapa Básico',nivel:'BASICO'},
  {id:5,nombre:'4to Bachillerato',nivel:'BACHILLERATO'},
  {id:6,nombre:'5to Bachillerato',nivel:'BACHILLERATO'},
]
export const MUNICIPIOS_SAC = [
  {id:1,nombre:'Antigua Guatemala'},{id:2,nombre:'Ciudad Vieja'},{id:3,nombre:'Jocotenango'},
  {id:4,nombre:'Magdalena Milpas Altas'},{id:5,nombre:'Pastores'},{id:6,nombre:'San Juan Alotenango'},
  {id:7,nombre:'San Lucas Sacatepéquez'},{id:8,nombre:'San Miguel Dueñas'},
  {id:9,nombre:'Santa María de Jesús'},{id:10,nombre:'Santiago Sacatepéquez'},{id:11,nombre:'Sumpango'},
]
export const PERMISOS_SISTEMA = [
  'ingresar_notas_enlace','ver_documentos_enlace','inscribir_estudiantes_enlace',
  'exportar_datos_enlace','gestionar_sesiones_enlace',
] as const
export type PermisoSistema = typeof PERMISOS_SISTEMA[number]
