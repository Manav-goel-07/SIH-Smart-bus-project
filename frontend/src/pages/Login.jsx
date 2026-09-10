import { useState } from 'react'
import { ArrowRight, BusFront, CheckCircle2, Eye, LockKeyhole, Mail, ShieldCheck, UserRound } from 'lucide-react'
import { useAuth } from '../auth/AuthProvider'

export default function Login({ initialMode = 'signin' }) {
  const { signIn, signUp, configured } = useAuth()
  const [mode, setMode] = useState(initialMode)
  const [form, setForm] = useState({ email: '', password: '', fullName: '', role: 'driver', busId: '' })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }))
  const demoCredentials = [
    { role: 'Authority', email: 'goel.manav07@gmail.com', password: 'Manav123', icon: ShieldCheck },
    { role: 'Driver', email: 'manav.goel.ug25@nsut.ac.in', password: 'abc@123', icon: BusFront },
    { role: 'Passenger', email: 'aadi.pers258@gmail.com', password: 'abc@123', icon: UserRound },
  ]
  const useDemoCredentials = (credentials) => {
    update('email', credentials.email)
    update('password', credentials.password)
    setError('')
    setMessage(`${credentials.role} demo credentials loaded.`)
  }
  const submit = async (event) => { event.preventDefault(); setBusy(true); setError(''); setMessage(''); const result = mode === 'signin' ? await signIn(form.email, form.password) : await signUp(form); if (result.error) setError(result.error.message); else if (mode === 'signup' && !result.data?.session) setMessage('Check your email to confirm the account, then sign in.'); setBusy(false) }
  return <main className="auth-screen"><div className="auth-backdrop" /><section className="auth-card"><div className="auth-brand"><span className="auth-logo"><img src="/sih-logo.png" alt="SIH logo" /></span><div><strong>UrbanEye</strong><span>City intelligence network</span></div></div><div className="auth-intro"><div className="eyebrow">Secure operations access</div><h1>{mode === 'signin' ? 'Welcome back.' : 'Create access.'}</h1><p>{mode === 'signin' ? 'Sign in to your city intelligence workspace.' : 'Provision a driver, rider or authority workspace.'}</p></div>{mode === 'signin' && <div className="demo-access"><div className="demo-access-head"><span>Demo access</span><small>Click a profile to fill the form</small></div><div className="demo-access-list">{demoCredentials.map((credentials) => { const Icon = credentials.icon; return <button type="button" className="demo-access-item" key={credentials.role} onClick={() => useDemoCredentials(credentials)}><Icon size={15} /><span><strong>{credentials.role}</strong><small>{credentials.email}</small></span><b>{credentials.password}</b></button> })}</div></div>}{!configured && <div className="auth-warning"><ShieldCheck size={16} /> Add Supabase credentials to `frontend/.env` before signing in.</div>}{error && <div className="auth-error">{error}</div>}{message && <div className="auth-success"><CheckCircle2 size={16} />{message}</div>}<form onSubmit={submit}>{mode === 'signup' && <><label>Full name<div className="auth-input"><UserRound size={16} /><input value={form.fullName} onChange={(e) => update('fullName', e.target.value)} required placeholder="Aarav Sharma" /></div></label><div className="role-choice"><button type="button" className={form.role === 'driver' ? 'selected' : ''} onClick={() => update('role', 'driver')}><BusFront size={16} /><span>Bus driver<small>Upload field footage</small></span></button><button type="button" className={form.role === 'user' ? 'selected' : ''} onClick={() => update('role', 'user')}><UserRound size={16} /><span>Passenger<small>Track buses and ETA</small></span></button><button type="button" className={form.role === 'admin' ? 'selected' : ''} onClick={() => update('role', 'admin')}><ShieldCheck size={16} /><span>Authority<small>Monitor city operations</small></span></button></div>{form.role === 'driver' && <label>Bus ID<div className="auth-input"><BusFront size={16} /><input value={form.busId} onChange={(e) => update('busId', e.target.value)} required placeholder="BUS_106" /></div></label>}</>}<label>Email<div className="auth-input"><Mail size={16} /><input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required placeholder="you@urbangrid.gov" /></div></label><label>Password<div className="auth-input"><LockKeyhole size={16} /><input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} required minLength={6} placeholder="••••••••" /></div></label><button className="auth-submit" disabled={busy || !configured}>{busy ? 'Connecting…' : mode === 'signin' ? 'Enter workspace' : 'Create workspace'}<ArrowRight size={16} /></button></form><button className="auth-switch" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMessage('') }}>{mode === 'signin' ? 'Need an account? Create one' : 'Already have access? Sign in'}</button></section><div className="auth-footer"><Eye size={13} /> Intelligence from the moving city</div></main>
}
