// src/components/project/TabFinance.tsx
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/index'

// ── Types ────────────────────────────────────────────────────
interface Project {
  id: string
  sponsor_type: string
  currency?: string
}
interface Budget {
  id: string
  total_amount: number
  expense_budget: number
  currency: string
  notes: string | null
}
interface Quotation {
  id: string
  number: string
  description: string | null
  amount: number
  currency: string
  issue_date: string
  valid_until: string | null
  status: string
  notes: string | null
}
interface Invoice {
  id: string
  quotation_id: string | null
  number: string
  description: string | null
  amount: number
  currency: string
  issue_date: string
  due_date: string | null
  paid_date: string | null
  status: string
  notes: string | null
}
interface Expense {
  id: string
  category: string
  description: string
  amount: number
  currency: string
  expense_date: string
  vendor: string | null
  notes: string | null
  registered_by: { full_name: string } | null
}

// ── Label maps ───────────────────────────────────────────────
const EXPENSE_CATEGORY_LABELS: Record<string,string> = {
  RRHH:'Recursos Humanos', REACTIVOS:'Reactivos',
  EXAMENES:'Exámenes / Procedimientos', EQUIPAMIENTO:'Equipamiento',
  OVERHEAD:'Overhead / Administración', OTROS:'Otros',
}
const EXPENSE_CATEGORY_STYLE: Record<string,{bg:string;color:string}> = {
  RRHH:        {bg:'#E6F1FB',color:'#0C447C'},
  REACTIVOS:   {bg:'#E1F5EE',color:'#085041'},
  EXAMENES:    {bg:'#EEEDFE',color:'#26215C'},
  EQUIPAMIENTO:{bg:'#FAEEDA',color:'#633806'},
  OVERHEAD:    {bg:'#F1EFE8',color:'#444441'},
  OTROS:       {bg:'#F1EFE8',color:'#9C9A92'},
}
const QUOTATION_STATUS_LABELS: Record<string,string> = {
  DRAFT:'Borrador', SENT:'Enviada', ACCEPTED:'Aceptada',
  REJECTED:'Rechazada', EXPIRED:'Vencida',
}
const INVOICE_STATUS_LABELS: Record<string,string> = {
  PENDING:'Pendiente', SENT:'Enviada', PAID:'Pagada',
  OVERDUE:'Vencida', CANCELLED:'Cancelada',
}
const QUOTATION_STATUS_STYLE: Record<string,{bg:string;color:string}> = {
  DRAFT:    {bg:'#F1EFE8',color:'#444441'}, SENT:{bg:'#E6F1FB',color:'#0C447C'},
  ACCEPTED: {bg:'#E1F5EE',color:'#085041'}, REJECTED:{bg:'#FCEBEB',color:'#791F1F'},
  EXPIRED:  {bg:'#FAEEDA',color:'#633806'},
}
const INVOICE_STATUS_STYLE: Record<string,{bg:string;color:string}> = {
  PENDING:   {bg:'#FAEEDA',color:'#633806'}, SENT:{bg:'#E6F1FB',color:'#0C447C'},
  PAID:      {bg:'#E1F5EE',color:'#085041'}, OVERDUE:{bg:'#FCEBEB',color:'#791F1F'},
  CANCELLED: {bg:'#F1EFE8',color:'#444441'},
}

// ── Helpers ──────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CL',{day:'2-digit',month:'2-digit',year:'numeric'})
}
function formatAmount(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString('es-CL',{minimumFractionDigits:2,maximumFractionDigits:2})}`
}
function daysUntil(iso: string) {
  return Math.round((new Date(iso).getTime()-Date.now())/86400000)
}

const inp: React.CSSProperties = {
  width:'100%', padding:'7px 10px', border:'0.5px solid #D3D1C7',
  borderRadius:8, fontSize:13, background:'#F8F7F4',
  color:'#3D3D3A', fontFamily:'inherit', outline:'none',
}
const cardStyle: React.CSSProperties = {
  background:'#fff', border:'0.5px solid #E8E6DE',
  borderRadius:10, overflow:'hidden', marginBottom:12,
}

// ── Metric card ───────────────────────────────────────────────
function MetricCard({ label, value, sub, color='#3D3D3A', alert=false }: {
  label:string; value:string; sub?:string; color?:string; alert?:boolean
}) {
  return (
    <div style={{ background:alert?'#FCEBEB':'#F8F7F4', border:`0.5px solid ${alert?'#F7C1C1':'#E8E6DE'}`, borderRadius:9, padding:'11px 14px', textAlign:'center' }}>
      <div style={{ fontSize:10, color:'#9C9A92', marginBottom:4 }}>{label}</div>
      <div style={{ fontSize:14, fontWeight:600, color }}>{value}</div>
      {sub && <div style={{ fontSize:10, color:'#9C9A92', marginTop:3 }}>{sub}</div>}
    </div>
  )
}

// ── Progress bar ──────────────────────────────────────────────
function ProgressBar({ label, value, max, color='#185FA5' }: { label:string; value:number; max:number; color?:string }) {
  const pct = max > 0 ? Math.min(Math.round(value/max*100), 100) : 0
  const overBudget = max > 0 && value > max
  return (
    <div style={{ marginBottom:10 }}>
      <div style={{ display:'flex', justifyContent:'space-between', fontSize:11, marginBottom:4 }}>
        <span style={{ color:'#73726C' }}>{label}</span>
        <span style={{ fontWeight:500, color:overBudget?'#A32D2D':color }}>{pct}%{overBudget?' ⚠ Sobre presupuesto':''}</span>
      </div>
      <div style={{ height:7, background:'#F1EFE8', borderRadius:4, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${pct}%`, background:overBudget?'#A32D2D':pct>80?'#EF9F27':color, borderRadius:4, transition:'width .4s' }} />
      </div>
    </div>
  )
}

// ── BUDGET SECTION ────────────────────────────────────────────
function BudgetSection({
  projectId, project, quotations, invoices, expenses, budget, onBudgetUpdated
}: {
  projectId:string; project:Project; quotations:Quotation[]; invoices:Invoice[]; expenses:Expense[];
  budget:Budget|null; onBudgetUpdated:()=>void
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState({
    total_amount:   String(budget?.total_amount ?? ''),
    expense_budget: String(budget?.expense_budget ?? ''),
    currency:       budget?.currency ?? 'USD',
    notes:          budget?.notes ?? '',
  })
  const [saving, setSaving] = useState(false)

  const isExternal = project.sponsor_type === 'EXTERNAL'
  const currency   = budget?.currency ?? 'USD'

  // ── Computed values ──
  // Ingresos (proyectos externos)
  const quotedTotal   = quotations.filter(q=>q.status==='ACCEPTED').reduce((s,q)=>s+q.amount,0)
  const invoicedTotal = invoices.filter(i=>i.status!=='CANCELLED').reduce((s,i)=>s+i.amount,0)
  const collectedTotal= invoices.filter(i=>i.status==='PAID').reduce((s,i)=>s+i.amount,0)
  const pendingToInvoice = quotedTotal - invoicedTotal
  const pendingToCollect = invoicedTotal - collectedTotal

  // Gastos
  const totalExpenses = expenses.reduce((s,e)=>s+e.amount,0)
  const expenseBudget = budget?.expense_budget ?? 0

  // Saldo disponible
  // Externo: lo cobrado - lo gastado
  // Interno: presupuesto asignado - gastos
  const available = isExternal
    ? collectedTotal - totalExpenses
    : (budget?.total_amount ?? 0) - totalExpenses

  const save = async () => {
    setSaving(true)
    const payload = {
      project_id:     projectId,
      total_amount:   parseFloat(form.total_amount)||0,
      expense_budget: parseFloat(form.expense_budget)||0,
      currency:       form.currency,
      notes:          form.notes||null,
      updated_at:     new Date().toISOString(),
    }
    if (budget) {
      await supabase.from('project_budgets').update(payload).eq('id', budget.id)
    } else {
      await supabase.from('project_budgets').insert(payload)
    }
    setSaving(false)
    setEditing(false)
    onBudgetUpdated()
  }

  return (
    <div style={cardStyle}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 16px', borderBottom:'0.5px solid #E8E6DE' }}>
        <div style={{ fontSize:13, fontWeight:500, color:'#73726C', display:'flex', alignItems:'center', gap:6 }}>
          <i className="ti ti-chart-pie" style={{ color:'#185FA5', fontSize:15 }} />
          Ejecución presupuestaria
          <span style={{ fontSize:11, background:isExternal?'#E1F5EE':'#E6F1FB', color:isExternal?'#085041':'#0C447C', padding:'1px 8px', borderRadius:20, fontWeight:500 }}>
            {isExternal?'Proyecto externo':'Proyecto interno'}
          </span>
        </div>
        {!editing && (
          <button onClick={()=>setEditing(true)} style={{ background:'none', border:'0.5px solid #D3D1C7', borderRadius:6, padding:'3px 10px', fontSize:11, cursor:'pointer', color:'#73726C' }}>
            <i className="ti ti-edit" style={{ fontSize:12, marginRight:4 }} />{budget?'Editar':'Configurar'}
          </button>
        )}
      </div>

      {editing ? (
        <div style={{ padding:16 }}>
          <div style={{ background:'#E6F1FB', border:'0.5px solid #B5D4F4', borderRadius:8, padding:'9px 12px', fontSize:12, color:'#0C447C', marginBottom:14 }}>
            <i className="ti ti-info-circle" style={{ fontSize:13, marginRight:5 }} />
            {isExternal
              ? 'Proyecto externo: define el presupuesto de gastos permitido. Los ingresos se calculan automáticamente desde las cotizaciones aceptadas.'
              : 'Proyecto interno: define el presupuesto total asignado. El disponible se calcula como presupuesto − gastos ejecutados.'}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 100px', gap:12, marginBottom:12 }}>
            {isExternal ? (
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Presupuesto de gastos permitido</label>
                <input style={inp} type="number" min="0" step="0.01" value={form.expense_budget}
                  onChange={e=>setForm(f=>({...f,expense_budget:e.target.value}))} placeholder="0.00" />
                <div style={{ fontSize:10, color:'#9C9A92', marginTop:3 }}>Máximo que puede gastarse en RRHH, reactivos, etc.</div>
              </div>
            ) : (
              <>
                <div>
                  <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Presupuesto total asignado</label>
                  <input style={inp} type="number" min="0" step="0.01" value={form.total_amount}
                    onChange={e=>setForm(f=>({...f,total_amount:e.target.value}))} placeholder="0.00" />
                </div>
                <div>
                  <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Presupuesto de gastos</label>
                  <input style={inp} type="number" min="0" step="0.01" value={form.expense_budget}
                    onChange={e=>setForm(f=>({...f,expense_budget:e.target.value}))} placeholder="0.00" />
                </div>
              </>
            )}
            <div>
              <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Moneda</label>
              <select style={inp} value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))}>
                <option value="USD">USD</option>
                <option value="CLP">CLP</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom:12 }}>
            <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Notas</label>
            <textarea style={{ ...inp, minHeight:48, resize:'vertical' }} value={form.notes}
              onChange={e=>setForm(f=>({...f,notes:e.target.value}))} placeholder="Observaciones sobre el presupuesto..." />
          </div>
          <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
            <button onClick={()=>setEditing(false)} style={{ background:'none', border:'0.5px solid #D3D1C7', color:'#73726C', padding:'6px 14px', borderRadius:7, fontSize:12, cursor:'pointer' }}>Cancelar</button>
            <button onClick={save} disabled={saving} style={{ background:saving?'#9C9A92':'#185FA5', color:'#fff', border:'none', padding:'6px 16px', borderRadius:7, fontSize:12, fontWeight:500, cursor:'pointer' }}>
              {saving?'Guardando...':'Guardar presupuesto'}
            </button>
          </div>
        </div>
      ) : !budget ? (
        <div style={{ padding:24, textAlign:'center', fontSize:13, color:'#9C9A92' }}>
          Sin presupuesto configurado.
          <button onClick={()=>setEditing(true)} style={{ background:'none', border:'none', color:'#185FA5', cursor:'pointer', fontSize:13, textDecoration:'underline', marginLeft:6 }}>Configurar ahora</button>
        </div>
      ) : (
        <div style={{ padding:16 }}>
          {/* Métricas según tipo */}
          {isExternal ? (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
                <MetricCard label="Cotizado (aceptado)"  value={formatAmount(quotedTotal,currency)}    color="#0F6E56" />
                <MetricCard label="Facturado"            value={formatAmount(invoicedTotal,currency)}  color="#185FA5" />
                <MetricCard label="Cobrado / Pagado"     value={formatAmount(collectedTotal,currency)} color="#0F6E56" />
                <MetricCard label="Por facturar"         value={formatAmount(pendingToInvoice,currency)} color={pendingToInvoice>0?'#854F0B':'#9C9A92'} />
                <MetricCard label="Por cobrar"           value={formatAmount(pendingToCollect,currency)} color={pendingToCollect>0?'#854F0B':'#9C9A92'} />
                <MetricCard label="Saldo disponible"     value={formatAmount(available,currency)}      color={available<0?'#A32D2D':'#0F6E56'} alert={available<0}
                  sub="Cobrado − Gastos ejecutados" />
              </div>
              <div style={{ borderTop:'0.5px solid #E8E6DE', paddingTop:14 }}>
                <div style={{ fontSize:11, fontWeight:500, color:'#9C9A92', textTransform:'uppercase', letterSpacing:'0.04em', marginBottom:10 }}>Control de gastos</div>
                {expenseBudget>0 ? (
                  <ProgressBar label={`Gastos ejecutados vs presupuesto de gastos (${formatAmount(expenseBudget,currency)})`}
                    value={totalExpenses} max={expenseBudget} color="#185FA5" />
                ) : (
                  <div style={{ fontSize:12, color:'#9C9A92' }}>
                    Sin presupuesto de gastos configurado.
                    <button onClick={()=>setEditing(true)} style={{ background:'none', border:'none', color:'#185FA5', cursor:'pointer', fontSize:12, textDecoration:'underline', marginLeft:4 }}>Configurar</button>
                  </div>
                )}
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:10 }}>
                  <MetricCard label="Gastos ejecutados"    value={formatAmount(totalExpenses,currency)}            color={expenseBudget>0&&totalExpenses>expenseBudget?'#A32D2D':'#3D3D3A'} />
                  <MetricCard label="Presupuesto de gastos" value={expenseBudget>0?formatAmount(expenseBudget,currency):'No configurado'} color="#3D3D3A" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
                <MetricCard label="Presupuesto asignado" value={formatAmount(budget.total_amount,currency)}  color="#3D3D3A" />
                <MetricCard label="Gastos ejecutados"    value={formatAmount(totalExpenses,currency)}        color={totalExpenses>expenseBudget&&expenseBudget>0?'#A32D2D':'#185FA5'} />
                <MetricCard label="Saldo disponible"     value={formatAmount(available,currency)}            color={available<0?'#A32D2D':'#0F6E56'} alert={available<0}
                  sub="Presupuesto − Gastos" />
              </div>
              {budget.total_amount>0 && (
                <ProgressBar label={`Ejecución: gastos vs presupuesto total (${formatAmount(budget.total_amount,currency)})`}
                  value={totalExpenses} max={budget.total_amount} color="#185FA5" />
              )}
              {expenseBudget>0 && expenseBudget!==budget.total_amount && (
                <ProgressBar label={`Gastos vs presupuesto de gastos (${formatAmount(expenseBudget,currency)})`}
                  value={totalExpenses} max={expenseBudget} color="#0F6E56" />
              )}
            </>
          )}
          {budget.notes && <div style={{ marginTop:12, fontSize:12, color:'#9C9A92', borderTop:'0.5px solid #E8E6DE', paddingTop:10 }}>{budget.notes}</div>}
        </div>
      )}
    </div>
  )
}

// ── EXPENSES SECTION ──────────────────────────────────────────
function ExpensesSection({ projectId, expenses, onUpdate }: { projectId:string; expenses:Expense[]; onUpdate:()=>void }) {
  const { user }  = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ category:'RRHH', description:'', amount:'', currency:'USD', expense_date:new Date().toISOString().split('T')[0], vendor:'', notes:'' })
  const [saving, setSaving] = useState(false)

  const byCategory = expenses.reduce((acc,e) => {
    acc[e.category] = (acc[e.category]??0) + e.amount
    return acc
  }, {} as Record<string,number>)

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.description || !form.amount) return
    setSaving(true)
    await supabase.from('project_expenses').insert({
      project_id:    projectId,
      category:      form.category,
      description:   form.description,
      amount:        parseFloat(form.amount),
      currency:      form.currency,
      expense_date:  form.expense_date,
      vendor:        form.vendor||null,
      notes:         form.notes||null,
      registered_by: user?.id,
    })
    setSaving(false)
    setShowForm(false)
    setForm({ category:'RRHH', description:'', amount:'', currency:'USD', expense_date:new Date().toISOString().split('T')[0], vendor:'', notes:'' })
    onUpdate()
  }

  return (
    <div style={cardStyle}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 16px', borderBottom:'0.5px solid #E8E6DE' }}>
        <div style={{ fontSize:13, fontWeight:500, color:'#73726C', display:'flex', alignItems:'center', gap:6 }}>
          <i className="ti ti-coin" style={{ color:'#185FA5', fontSize:15 }} />Gastos del proyecto
        </div>
        <button onClick={()=>setShowForm(s=>!s)} style={{ background:'#185FA5', color:'#fff', border:'none', borderRadius:6, padding:'4px 12px', fontSize:11, cursor:'pointer', fontWeight:500, display:'flex', alignItems:'center', gap:4 }}>
          <i className="ti ti-plus" style={{ fontSize:12 }} />Registrar gasto
        </button>
      </div>

      {showForm && (
        <div style={{ padding:16, background:'#F8F7F4', borderBottom:'0.5px solid #E8E6DE' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Categoría *</label>
                <select style={inp} value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                  {Object.entries(EXPENSE_CATEGORY_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Fecha *</label>
                <input style={inp} type="date" value={form.expense_date} onChange={e=>setForm(f=>({...f,expense_date:e.target.value}))} />
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Descripción *</label>
                <input style={inp} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Ej: Pago honorarios Dr. Martínez — Marzo 2024" required />
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Monto *</label>
                <input style={inp} type="number" min="0" step="0.01" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="0.00" required />
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Moneda</label>
                <select style={inp} value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))}>
                  <option value="USD">USD</option><option value="CLP">CLP</option><option value="EUR">EUR</option>
                </select>
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Proveedor / Receptor</label>
                <input style={inp} value={form.vendor} onChange={e=>setForm(f=>({...f,vendor:e.target.value}))} placeholder="Ej: Clínica Las Condes, Proveedor Reactivos S.A." />
              </div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button type="button" onClick={()=>setShowForm(false)} style={{ background:'none', border:'0.5px solid #D3D1C7', color:'#73726C', padding:'6px 14px', borderRadius:7, fontSize:12, cursor:'pointer' }}>Cancelar</button>
              <button type="submit" disabled={saving} style={{ background:saving?'#9C9A92':'#185FA5', color:'#fff', border:'none', padding:'6px 16px', borderRadius:7, fontSize:12, fontWeight:500, cursor:'pointer' }}>
                {saving?'Guardando...':'Registrar gasto'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* resumen por categoría */}
      {Object.keys(byCategory).length>0 && (
        <div style={{ padding:'12px 16px', borderBottom:'0.5px solid #E8E6DE', display:'flex', gap:8, flexWrap:'wrap' }}>
          {Object.entries(byCategory).sort((a,b)=>b[1]-a[1]).map(([cat,amt])=>{
            const cs = EXPENSE_CATEGORY_STYLE[cat]??{bg:'#F1EFE8',color:'#444441'}
            return (
              <span key={cat} style={{ ...cs, fontSize:11, padding:'3px 10px', borderRadius:20, fontWeight:500 }}>
                {EXPENSE_CATEGORY_LABELS[cat]??cat}: {amt.toLocaleString('es-CL')}
              </span>
            )
          })}
        </div>
      )}

      {/* lista */}
      <div>
        {expenses.length===0 ? (
          <div style={{ padding:24, textAlign:'center', fontSize:13, color:'#9C9A92' }}>Sin gastos registrados.</div>
        ) : expenses.map((e,i)=>{
          const cs = EXPENSE_CATEGORY_STYLE[e.category]??{bg:'#F1EFE8',color:'#444441'}
          return (
            <div key={e.id} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'11px 16px', borderBottom:i<expenses.length-1?'0.5px solid #E8E6DE':'none' }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:4, flexWrap:'wrap' }}>
                  <span style={{ ...cs, fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>{EXPENSE_CATEGORY_LABELS[e.category]}</span>
                  <span style={{ fontSize:12, fontWeight:500, color:'#3D3D3A' }}>{e.description}</span>
                </div>
                <div style={{ fontSize:11, color:'#9C9A92' }}>
                  {formatDate(e.expense_date)}
                  {e.vendor && ` · ${e.vendor}`}
                  {e.registered_by && ` · Registrado por: ${(e.registered_by as any).full_name}`}
                </div>
              </div>
              <div style={{ fontSize:13, fontWeight:600, color:'#3D3D3A', flexShrink:0 }}>
                {formatAmount(e.amount, e.currency)}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── QUOTATIONS SECTION ────────────────────────────────────────
function QuotationsSection({ projectId, quotations, onUpdate }: { projectId:string; quotations:Quotation[]; onUpdate:()=>void }) {
  const { user }  = useAuth()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ number:'', description:'', amount:'', currency:'USD', issue_date:new Date().toISOString().split('T')[0], valid_until:'', notes:'' })
  const [saving, setSaving]     = useState(false)
  const [updatingId, setUpdatingId] = useState<string|null>(null)

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.number||!form.amount) return
    setSaving(true)
    await supabase.from('quotations').insert({
      project_id: projectId, number:form.number, description:form.description||null,
      amount:parseFloat(form.amount), currency:form.currency, issue_date:form.issue_date,
      valid_until:form.valid_until||null, notes:form.notes||null, created_by:user?.id, status:'DRAFT',
    })
    setSaving(false)
    setShowForm(false)
    setForm({ number:'', description:'', amount:'', currency:'USD', issue_date:new Date().toISOString().split('T')[0], valid_until:'', notes:'' })
    onUpdate()
  }

  const updateStatus = async (id:string, status:string) => {
    setUpdatingId(id)
    await supabase.from('quotations').update({ status }).eq('id', id)
    setUpdatingId(null)
    onUpdate()
  }

  return (
    <div style={cardStyle}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 16px', borderBottom:'0.5px solid #E8E6DE' }}>
        <div style={{ fontSize:13, fontWeight:500, color:'#73726C', display:'flex', alignItems:'center', gap:6 }}>
          <i className="ti ti-file-invoice" style={{ color:'#185FA5', fontSize:15 }} />
          Cotizaciones al cliente
          <span style={{ fontSize:11, background:'#E1F5EE', color:'#085041', padding:'1px 7px', borderRadius:20 }}>
            {quotations.filter(q=>q.status==='ACCEPTED').length} aceptada{quotations.filter(q=>q.status==='ACCEPTED').length!==1?'s':''}
          </span>
        </div>
        <button onClick={()=>setShowForm(s=>!s)} style={{ background:'#185FA5', color:'#fff', border:'none', borderRadius:6, padding:'4px 12px', fontSize:11, cursor:'pointer', fontWeight:500, display:'flex', alignItems:'center', gap:4 }}>
          <i className="ti ti-plus" style={{ fontSize:12 }} />Nueva cotización
        </button>
      </div>

      {showForm && (
        <div style={{ padding:16, background:'#F8F7F4', borderBottom:'0.5px solid #E8E6DE' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>N° Cotización *</label>
                <input style={inp} value={form.number} onChange={e=>setForm(f=>({...f,number:e.target.value}))} placeholder="COT-2024-001" required />
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Monto *</label>
                <input style={inp} type="number" min="0" step="0.01" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="0.00" required />
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Moneda</label>
                <select style={inp} value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))}>
                  <option value="USD">USD</option><option value="CLP">CLP</option><option value="EUR">EUR</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Fecha emisión</label>
                <input style={inp} type="date" value={form.issue_date} onChange={e=>setForm(f=>({...f,issue_date:e.target.value}))} />
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Válida hasta</label>
                <input style={inp} type="date" value={form.valid_until} onChange={e=>setForm(f=>({...f,valid_until:e.target.value}))} />
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Descripción servicios</label>
                <input style={inp} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Gestión estudio fase III, n=50 pacientes" />
              </div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button type="button" onClick={()=>setShowForm(false)} style={{ background:'none', border:'0.5px solid #D3D1C7', color:'#73726C', padding:'6px 14px', borderRadius:7, fontSize:12, cursor:'pointer' }}>Cancelar</button>
              <button type="submit" disabled={saving} style={{ background:saving?'#9C9A92':'#185FA5', color:'#fff', border:'none', padding:'6px 16px', borderRadius:7, fontSize:12, fontWeight:500, cursor:'pointer' }}>
                {saving?'Guardando...':'Crear cotización'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div>
        {quotations.length===0 ? (
          <div style={{ padding:24, textAlign:'center', fontSize:13, color:'#9C9A92' }}>Sin cotizaciones registradas.</div>
        ) : quotations.map((q,i)=>{
          const qs = QUOTATION_STATUS_STYLE[q.status]??{bg:'#F1EFE8',color:'#444441'}
          return (
            <div key={q.id} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 16px', borderBottom:i<quotations.length-1?'0.5px solid #E8E6DE':'none' }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5, flexWrap:'wrap' }}>
                  <span style={{ fontSize:13, fontWeight:500, color:'#3D3D3A' }}>{q.number}</span>
                  <span style={{ ...qs, fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>{QUOTATION_STATUS_LABELS[q.status]}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:'#185FA5' }}>{formatAmount(q.amount,q.currency)}</span>
                </div>
                {q.description && <div style={{ fontSize:12, color:'#3D3D3A', marginBottom:3 }}>{q.description}</div>}
                <div style={{ fontSize:11, color:'#9C9A92' }}>
                  Emitida: {formatDate(q.issue_date)}
                  {q.valid_until && ` · Válida hasta: ${formatDate(q.valid_until)}`}
                </div>
              </div>
              <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                {q.status==='DRAFT' && (
                  <button onClick={()=>updateStatus(q.id,'SENT')} disabled={updatingId===q.id}
                    style={{ fontSize:11, padding:'4px 10px', background:'#E6F1FB', color:'#0C447C', border:'0.5px solid #B5D4F4', borderRadius:6, cursor:'pointer', fontWeight:500 }}>
                    Marcar enviada
                  </button>
                )}
                {q.status==='SENT' && (
                  <>
                    <button onClick={()=>updateStatus(q.id,'ACCEPTED')} disabled={updatingId===q.id}
                      style={{ fontSize:11, padding:'4px 10px', background:'#E1F5EE', color:'#085041', border:'0.5px solid #9FE1CB', borderRadius:6, cursor:'pointer', fontWeight:500 }}>
                      Aceptada
                    </button>
                    <button onClick={()=>updateStatus(q.id,'REJECTED')} disabled={updatingId===q.id}
                      style={{ fontSize:11, padding:'4px 10px', background:'#FCEBEB', color:'#791F1F', border:'0.5px solid #F7C1C1', borderRadius:6, cursor:'pointer', fontWeight:500 }}>
                      Rechazada
                    </button>
                  </>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── INVOICES SECTION ──────────────────────────────────────────
function InvoicesSection({ projectId, invoices, quotations, onUpdate }: { projectId:string; invoices:Invoice[]; quotations:Quotation[]; onUpdate:()=>void }) {
  const { user }  = useAuth()
  const [showForm, setShowForm]     = useState(false)
  const [updatingId, setUpdatingId] = useState<string|null>(null)
  const [form, setForm] = useState({ number:'', description:'', amount:'', currency:'USD', quotation_id:'', issue_date:new Date().toISOString().split('T')[0], due_date:'', notes:'' })
  const [saving, setSaving] = useState(false)

  const acceptedQuots = quotations.filter(q=>q.status==='ACCEPTED')

  const handleQuotChange = (qid:string) => {
    const q = acceptedQuots.find(q=>q.id===qid)
    if (q) setForm(f=>({...f,quotation_id:qid,amount:String(q.amount),currency:q.currency,description:q.description??''}))
    else setForm(f=>({...f,quotation_id:qid}))
  }

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    if (!form.number||!form.amount) return
    setSaving(true)
    await supabase.from('invoices').insert({
      project_id:form.number?projectId:projectId, quotation_id:form.quotation_id||null,
      number:form.number, description:form.description||null, amount:parseFloat(form.amount),
      currency:form.currency, issue_date:form.issue_date, due_date:form.due_date||null,
      notes:form.notes||null, created_by:user?.id, status:'PENDING',
    })
    setSaving(false)
    setShowForm(false)
    setForm({ number:'', description:'', amount:'', currency:'USD', quotation_id:'', issue_date:new Date().toISOString().split('T')[0], due_date:'', notes:'' })
    onUpdate()
  }

  const updateStatus = async (id:string, status:string) => {
    setUpdatingId(id)
    const payload: any = { status }
    if (status==='PAID') payload.paid_date = new Date().toISOString().split('T')[0]
    await supabase.from('invoices').update(payload).eq('id', id)
    setUpdatingId(null)
    onUpdate()
  }

  const overdueCount = invoices.filter(i=>i.status==='OVERDUE').length

  return (
    <div style={cardStyle}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 16px', borderBottom:'0.5px solid #E8E6DE' }}>
        <div style={{ fontSize:13, fontWeight:500, color:'#73726C', display:'flex', alignItems:'center', gap:6 }}>
          <i className="ti ti-receipt" style={{ color:'#185FA5', fontSize:15 }} />
          Facturas emitidas
          {overdueCount>0 && (
            <span style={{ fontSize:11, background:'#FCEBEB', color:'#791F1F', padding:'1px 7px', borderRadius:20, fontWeight:500 }}>
              {overdueCount} vencida{overdueCount>1?'s':''}
            </span>
          )}
        </div>
        <button onClick={()=>setShowForm(s=>!s)} style={{ background:'#185FA5', color:'#fff', border:'none', borderRadius:6, padding:'4px 12px', fontSize:11, cursor:'pointer', fontWeight:500, display:'flex', alignItems:'center', gap:4 }}>
          <i className="ti ti-plus" style={{ fontSize:12 }} />Emitir factura
        </button>
      </div>

      {showForm && (
        <div style={{ padding:16, background:'#F8F7F4', borderBottom:'0.5px solid #E8E6DE' }}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Cotización aceptada asociada (opcional)</label>
              <select style={inp} value={form.quotation_id} onChange={e=>handleQuotChange(e.target.value)}>
                <option value="">Sin cotización asociada</option>
                {acceptedQuots.map(q=><option key={q.id} value={q.id}>{q.number} — {formatAmount(q.amount,q.currency)}</option>)}
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>N° Factura *</label>
                <input style={inp} value={form.number} onChange={e=>setForm(f=>({...f,number:e.target.value}))} placeholder="FAC-2024-001" required />
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Monto *</label>
                <input style={inp} type="number" min="0" step="0.01" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="0.00" required />
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Moneda</label>
                <select style={inp} value={form.currency} onChange={e=>setForm(f=>({...f,currency:e.target.value}))}>
                  <option value="USD">USD</option><option value="CLP">CLP</option><option value="EUR">EUR</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Fecha emisión</label>
                <input style={inp} type="date" value={form.issue_date} onChange={e=>setForm(f=>({...f,issue_date:e.target.value}))} />
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Fecha de pago esperada</label>
                <input style={inp} type="date" value={form.due_date} onChange={e=>setForm(f=>({...f,due_date:e.target.value}))} />
              </div>
              <div style={{ gridColumn:'span 2' }}>
                <label style={{ fontSize:11, color:'#9C9A92', fontWeight:500, display:'block', marginBottom:4 }}>Descripción servicios</label>
                <input style={inp} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Descripción de los servicios facturados" />
              </div>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
              <button type="button" onClick={()=>setShowForm(false)} style={{ background:'none', border:'0.5px solid #D3D1C7', color:'#73726C', padding:'6px 14px', borderRadius:7, fontSize:12, cursor:'pointer' }}>Cancelar</button>
              <button type="submit" disabled={saving} style={{ background:saving?'#9C9A92':'#185FA5', color:'#fff', border:'none', padding:'6px 16px', borderRadius:7, fontSize:12, fontWeight:500, cursor:'pointer' }}>
                {saving?'Guardando...':'Emitir factura'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div>
        {invoices.length===0 ? (
          <div style={{ padding:24, textAlign:'center', fontSize:13, color:'#9C9A92' }}>Sin facturas emitidas.</div>
        ) : invoices.map((inv,i)=>{
          const is = INVOICE_STATUS_STYLE[inv.status]??{bg:'#F1EFE8',color:'#444441'}
          const daysLeft = inv.due_date?daysUntil(inv.due_date):null
          const isOverdue = inv.status==='OVERDUE'
          return (
            <div key={inv.id} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 16px', borderBottom:i<invoices.length-1?'0.5px solid #E8E6DE':'none', background:isOverdue?'rgba(162,45,45,0.02)':'' }}>
              <div style={{ flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5, flexWrap:'wrap' }}>
                  <span style={{ fontSize:13, fontWeight:500, color:'#3D3D3A' }}>{inv.number}</span>
                  <span style={{ ...is, fontSize:11, padding:'2px 8px', borderRadius:20, fontWeight:500 }}>{INVOICE_STATUS_LABELS[inv.status]}</span>
                  <span style={{ fontSize:13, fontWeight:600, color:isOverdue?'#A32D2D':'#185FA5' }}>{formatAmount(inv.amount,inv.currency)}</span>
                  {daysLeft!==null && !['PAID','CANCELLED'].includes(inv.status) && (
                    <span style={{ fontSize:11, color:daysLeft<0?'#A32D2D':daysLeft<=7?'#854F0B':'#9C9A92', fontWeight:daysLeft<0?600:400 }}>
                      {daysLeft<0?`Vencida hace ${Math.abs(daysLeft)}d`:daysLeft===0?'Vence hoy':`Vence en ${daysLeft}d`}
                    </span>
                  )}
                </div>
                {inv.description && <div style={{ fontSize:12, color:'#3D3D3A', marginBottom:3 }}>{inv.description}</div>}
                <div style={{ fontSize:11, color:'#9C9A92' }}>
                  Emitida: {formatDate(inv.issue_date)}
                  {inv.due_date&&` · Pago esperado: ${formatDate(inv.due_date)}`}
                  {inv.paid_date&&` · Pagada: ${formatDate(inv.paid_date)}`}
                </div>
              </div>
              {['PENDING','SENT','OVERDUE'].includes(inv.status) && (
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  {inv.status==='PENDING' && (
                    <button onClick={()=>updateStatus(inv.id,'SENT')} disabled={updatingId===inv.id}
                      style={{ fontSize:11, padding:'4px 10px', background:'#E6F1FB', color:'#0C447C', border:'0.5px solid #B5D4F4', borderRadius:6, cursor:'pointer', fontWeight:500 }}>
                      Marcar enviada
                    </button>
                  )}
                  <button onClick={()=>updateStatus(inv.id,'PAID')} disabled={updatingId===inv.id}
                    style={{ fontSize:11, padding:'4px 10px', background:'#E1F5EE', color:'#085041', border:'0.5px solid #9FE1CB', borderRadius:6, cursor:'pointer', fontWeight:500 }}>
                    Registrar pago
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── MAIN TAB ─────────────────────────────────────────────────
export default function TabFinance({ projectId, project }: { projectId: string; project: { sponsor_type: string } }) {
  const { user }  = useAuth()
  const [budget, setBudget]         = useState<Budget|null>(null)
  const [quotations, setQuotations] = useState<Quotation[]>([])
  const [invoices, setInvoices]     = useState<Invoice[]>([])
  const [expenses, setExpenses]     = useState<Expense[]>([])
  const [loading, setLoading]       = useState(true)

  const isExternal = project.sponsor_type === 'EXTERNAL'
  const canEdit    = ['FINANCE','ADMIN','PM_CRIO'].includes(user?.role??'')

  if (!canEdit) {
    return (
      <div style={{ background:'#fff', border:'0.5px solid #E8E6DE', borderRadius:10, padding:48, textAlign:'center' }}>
        <i className="ti ti-lock" style={{ fontSize:28, color:'#D3D1C7', display:'block', marginBottom:10 }} />
        <div style={{ fontSize:14, fontWeight:500, color:'#9C9A92', marginBottom:4 }}>Acceso restringido</div>
        <div style={{ fontSize:12, color:'#B4B2A9' }}>La información financiera es visible solo para Finanzas, Administrador y PM/CRIO.</div>
      </div>
    )
  }

  const load = useCallback(async () => {
    setLoading(true)
    const [{ data: bData }, { data: qData }, { data: iData }, { data: eData }] = await Promise.all([
      supabase.from('project_budgets').select('*').eq('project_id', projectId).single(),
      supabase.from('quotations').select('*').eq('project_id', projectId).order('issue_date', { ascending: false }),
      supabase.from('invoices').select('*').eq('project_id', projectId).order('issue_date', { ascending: false }),
      supabase.from('project_expenses').select('*, registered_by:users(full_name)').eq('project_id', projectId).order('expense_date', { ascending: false }),
    ])
    setBudget(bData as Budget ?? null)
    setQuotations((qData??[]) as Quotation[])
    setInvoices((iData??[]) as Invoice[])
    setExpenses((eData??[]) as Expense[])
    setLoading(false)
  }, [projectId])

  useEffect(() => { load() }, [load])

  // auto-marcar facturas vencidas
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    invoices.filter(i=>i.status==='SENT'&&i.due_date&&i.due_date<today).forEach(i=>{
      supabase.from('invoices').update({ status:'OVERDUE' }).eq('id', i.id).then(()=>load())
    })
  }, [invoices])

  if (loading) return <div style={{ padding:32, textAlign:'center', fontSize:13, color:'#9C9A92' }}>Cargando finanzas...</div>

  return (
    <div>
      <BudgetSection
        projectId={projectId} project={project as Project}
        quotations={quotations} invoices={invoices} expenses={expenses}
        budget={budget} onBudgetUpdated={load}
      />
      <ExpensesSection projectId={projectId} expenses={expenses} onUpdate={load} />
      {isExternal && (
        <>
          <QuotationsSection projectId={projectId} quotations={quotations} onUpdate={load} />
          <InvoicesSection projectId={projectId} invoices={invoices} quotations={quotations} onUpdate={load} />
        </>
      )}
    </div>
  )
}
