// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
export const cn = (...i: ClassValue[]) => twMerge(clsx(i))
export const nombreCompleto = (o:{primer_nombre:string;segundo_nombre?:string|null;primer_apellido:string;segundo_apellido?:string|null}) =>
  [o.primer_nombre,o.segundo_nombre,o.primer_apellido,o.segundo_apellido].filter(Boolean).join(' ')
export const fechaHoy = () => new Date().toLocaleDateString('es-GT',{weekday:'long',year:'numeric',month:'long',day:'numeric'})
export const fmtFecha = (iso:string) => new Date(iso).toLocaleDateString('es-GT',{year:'numeric',month:'long',day:'numeric'})
export const fmtCorta = (iso:string) => new Date(iso).toLocaleDateString('es-GT',{year:'2-digit',month:'2-digit',day:'2-digit'})
export const calcPuntosExamen = (n:number) => Math.round(n*20/100*100)/100
