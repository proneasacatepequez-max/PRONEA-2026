'use client'
// src/components/ui/index.tsx
import { cn } from '@/lib/utils'
import { useState } from 'react'

// ── Badge ──────────────────────────────────────────────────
type BV = 'green'|'red'|'yellow'|'blue'|'orange'|'gray'|'purple'
export function Badge({ children, v='gray', className }: { children:React.ReactNode; v?:BV; className?:string }) {
  const m:Record<BV,string> = { green:'badge-green',red:'badge-red',yellow:'badge-yellow',blue:'badge-blue',orange:'badge-orange',gray:'badge-gray',purple:'badge-purple' }
  return <span className={cn('badge', m[v], className)}>{children}</span>
}
export function BadgeVersion({ v }: { v:'nuevo'|'viejo' }) {
  return <span className={cn('badge', v==='nuevo'?'badge-blue':'badge-orange')}>{v==='nuevo'?'📗 Nuevo':'📙 Viejo'}</span>
}
export function BadgeEstado({ e }: { e:string }) {
  const m:Record<string,BV> = { en_curso:'green',completada:'blue',retirada:'red',suspendida:'yellow',finalizada:'gray',abierto:'green',cerrado:'yellow',exportado:'blue',activo:'green',inactivo:'red',pendiente:'yellow',aprobado:'green',rechazado:'red',en_revision:'blue' }
  const l:Record<string,string> = { en_curso:'En curso',completada:'Completada',retirada:'Retirada',suspendida:'Suspendida',finalizada:'Finalizada',abierto:'Abierto',cerrado:'Cerrado',exportado:'Exportado',activo:'Activo',inactivo:'Inactivo',pendiente:'Pendiente',aprobado:'Aprobado',rechazado:'Rechazado',en_revision:'En revisión' }
  return <Badge v={m[e]??'gray'}>{l[e]??e}</Badge>
}
export function BadgePermiso({ puede, pendiente }: { puede:boolean; pendiente?:boolean }) {
  if (pendiente) return <span className="perm-pending">⏳ Pendiente confirmación</span>
  return puede ? <span className="perm-on">✅ Autorizado</span> : <span className="perm-off">🚫 Sin permiso</span>
}

// ── Stat Card ──────────────────────────────────────────────
export function StatCard({ icon, value, label, change, up, color='blue' }:
  { icon:string; value:string|number; label:string; change?:string; up?:boolean; color?:'blue'|'green'|'yellow'|'red' }) {
  return (
    <div className={`sc ${color}`}>
      <div className="text-3xl mb-1">{icon}</div>
      <div className="text-3xl font-extrabold text-gray-800 leading-none">{value}</div>
      <div className="text-sm text-gray-500 font-semibold mt-1">{label}</div>
      {change && <div className={cn('text-xs font-bold mt-1', up?'text-green-600':'text-red-600')}>{up?'↑':'↓'} {change}</div>}
    </div>
  )
}

// ── Modal ──────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, footer, size='md' }:
  { open:boolean; onClose:()=>void; title:string; children:React.ReactNode; footer?:React.ReactNode; size?:'sm'|'md'|'lg'|'xl' }) {
  if (!open) return null
  const w = { sm:'max-w-sm', md:'max-w-lg', lg:'max-w-2xl', xl:'max-w-4xl' }
  return (
    <div className="mo" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className={cn('mb', w[size])}>
        <div className="mh">
          <h3 className="text-base font-extrabold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none w-8 h-8 flex items-center justify-center">×</button>
        </div>
        <div className="mbd">{children}</div>
        {footer && <div className="mf">{footer}</div>}
      </div>
    </div>
  )
}

// ── Form helpers ───────────────────────────────────────────
export function FormGroup({ label, required, children, hint, className }:
  { label:string; required?:boolean; children:React.ReactNode; hint?:string; className?:string }) {
  return (
    <div className={cn('fg', className)}>
      <label className="lbl">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      {children}
      {hint && <p className="text-[11px] text-gray-400 mt-1">{hint}</p>}
    </div>
  )
}
export function Input(p: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...p} className={cn('inp', p.className)}/>
}
export function Select(p: React.SelectHTMLAttributes<HTMLSelectElement> & { children:React.ReactNode }) {
  return <select {...p} className={cn('inp', p.className)}/>
}
export function Textarea(p: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...p} rows={p.rows??3} className={cn('inp', p.className)}/>
}

// ── Version selector ───────────────────────────────────────
export function SelectorVersion({ value, onChange, disabled }:
  { value:'nuevo'|'viejo'; onChange:(v:'nuevo'|'viejo')=>void; disabled?:boolean }) {
  return (
    <div className="flex gap-2">
      {(['nuevo','viejo'] as const).map(v => (
        <button key={v} type="button" disabled={disabled}
          onClick={() => onChange(v)}
          className={cn('flex-1 flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-all',
            value===v ? (v==='nuevo'?'border-blue-500 bg-blue-50':'border-orange-500 bg-orange-50') : 'border-gray-200 hover:border-gray-300')}>
          <span className="text-xl">{v==='nuevo'?'📗':'📙'}</span>
          <div className="text-left">
            <div className={cn('text-sm font-bold', v==='nuevo'?'text-blue-700':'text-orange-700')}>Libro {v==='nuevo'?'Nuevo':'Viejo'}</div>
            <div className="text-xs text-gray-400">{v==='nuevo'?'Versión actualizada':'En transición'}</div>
          </div>
        </button>
      ))}
    </div>
  )
}

// ── Tabs ───────────────────────────────────────────────────
export function Tabs({ tabs, active, onChange }:
  { tabs:{id:string;label:string}[]; active:string; onChange:(id:string)=>void }) {
  return (
    <div className="tabs">
      {tabs.map(t => (
        <div key={t.id} className={cn('tab', active===t.id&&'act')} onClick={() => onChange(t.id)}>{t.label}</div>
      ))}
    </div>
  )
}

// ── Alert ──────────────────────────────────────────────────
export function Alert({ type='info', children }:{ type?:'info'|'success'|'warning'|'error'; children:React.ReactNode }) {
  const m = { info:'al-i', success:'al-s', warning:'al-w', error:'al-e' }
  return <div className={cn('alert', m[type])}>{children}</div>
}

// ── Spinner ────────────────────────────────────────────────
export function Spinner() {
  return <div className="flex items-center justify-center py-12"><div className="w-8 h-8 border-2 border-pronea border-t-transparent rounded-full animate-spin"/></div>
}

// ── Empty ──────────────────────────────────────────────────
export function Empty({ icon='📭', msg }:{ icon?:string; msg:string }) {
  return <div className="flex flex-col items-center py-14 text-gray-400"><div className="text-5xl mb-3">{icon}</div><div className="text-sm font-semibold">{msg}</div></div>
}

// ── Loading Button ─────────────────────────────────────────
export function LoadingBtn({ loading, children, className, ...p }:
  React.ButtonHTMLAttributes<HTMLButtonElement>&{loading?:boolean}) {
  return (
    <button {...p} disabled={loading||p.disabled} className={cn('btn', className)}>
      {loading && <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin"/>}
      {children}
    </button>
  )
}

// ── Steps ──────────────────────────────────────────────────
export function Steps({ steps, current }:{ steps:string[]; current:number }) {
  return (
    <div className="flex items-center gap-2 mb-5">
      {steps.map((s, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={cn('step-dot', i<current?'done':i===current?'cur':'todo')}>{i<current?'✓':i+1}</div>
          <span className={cn('text-sm font-bold hidden sm:block', i===current?'text-pronea':i<current?'text-green-600':'text-gray-400')}>{s}</span>
          {i<steps.length-1 && <div className="w-6 h-px bg-gray-200"/>}
        </div>
      ))}
    </div>
  )
}

// ── Confirm dialog ─────────────────────────────────────────
export function Confirm({ open, title, msg, onOk, onCancel, danger=false }:
  { open:boolean; title:string; msg:string; onOk:()=>void; onCancel:()=>void; danger?:boolean }) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm"
      footer={<><button className="btn btn-g btn-sm" onClick={onCancel}>Cancelar</button><button className={cn('btn btn-sm', danger?'btn-d':'btn-p')} onClick={onOk}>Confirmar</button></>}>
      <p className="text-sm text-gray-600">{msg}</p>
    </Modal>
  )
}

// ── Nota Input ─────────────────────────────────────────────
export function NotaInput({ value, max=5, onSave, disabled }:
  { value:number|null; max?:number; onSave:(n:number)=>void; disabled?:boolean }) {
  const [v, setV] = useState(value?.toString() ?? '')
  const num = parseFloat(v)
  const valid = !isNaN(num) && num >= 0 && num <= max
  return (
    <input type="number" min={0} max={max} step={0.5} value={v}
      onChange={e => setV(e.target.value)} disabled={disabled}
      onBlur={() => { if (valid && num !== value) onSave(num) }}
      onKeyDown={e => { if (e.key==='Enter' && valid && num!==value) onSave(num) }}
      className={cn('w-16 px-2 py-1.5 border-2 rounded-lg text-sm font-bold text-center outline-none transition-all',
        value===null?'border-gray-200':'border-green-400 bg-green-50')}/>
  )
}

// ── Toggle switch ──────────────────────────────────────────
export function Toggle({ checked, onChange, label }:{ checked:boolean; onChange:(v:boolean)=>void; label?:string }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <div className={cn('relative w-10 h-5 rounded-full transition-colors', checked?'bg-pronea':'bg-gray-300')}
        onClick={() => onChange(!checked)}>
        <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform', checked?'translate-x-5':'translate-x-0.5')}/>
      </div>
      {label && <span className="text-sm font-semibold text-gray-600">{label}</span>}
    </label>
  )
}
