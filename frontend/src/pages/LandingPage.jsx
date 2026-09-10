import { useEffect, useState } from 'react'
import { ArrowRight, ChevronRight, CircleUserRound, Menu, Play, ShieldCheck, Sparkles, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

const orbitItems = ['LIVE FLEET', 'ROAD SAFETY', 'CITY INTELLIGENCE']

export default function LandingPage() {
  const navigate = useNavigate()
  const [intro, setIntro] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setIntro(false), 3200)
    return () => window.clearTimeout(timer)
  }, [])

  const enter = (path) => navigate(path)

  return <main className={`landing-page ${intro ? 'landing-intro-active' : 'landing-ready'}`}>
    <section className="landing-intro" aria-label="Loading UrbanEye">
      <div className="landing-intro-grid" />
      <div className="landing-intro-aura" />
      <div className="landing-intro-orbit orbit-one" />
      <div className="landing-intro-orbit orbit-two" />
      <div className="landing-intro-core">
        <img src="/urbaneye-hero.png" alt="UrbanEye" />
        <div className="landing-intro-kicker"><span /> SYSTEM INITIALIZING <span /></div>
      </div>
      <div className="landing-intro-footer"><span>URBANEYE / 01</span><span>SAFER ROADS · SMARTER CITIES</span><span>ONLINE</span></div>
    </section>

    <section className="landing-home">
      <nav className="landing-nav">
        <button className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} aria-label="UrbanEye home"><span className="landing-brand-mark"><img src="/urbaneye-hero.png" alt="" /></span><span>Urban<span>Eye</span></span></button>
        <div className={`landing-nav-links ${menuOpen ? 'open' : ''}`}>
          <a href="#network" onClick={() => setMenuOpen(false)}>Network</a>
          <a href="#intelligence" onClick={() => setMenuOpen(false)}>Intelligence</a>
          <a href="#platform" onClick={() => setMenuOpen(false)}>Platform</a>
          <button className="landing-mobile-close" onClick={() => setMenuOpen(false)} aria-label="Close menu"><X size={18} /></button>
        </div>
        <div className="landing-nav-actions"><button className="landing-login" onClick={() => enter('/login')}><CircleUserRound size={16} /> Sign in</button><button className="landing-join" onClick={() => enter('/signup')}>Get access <ArrowRight size={15} /></button></div>
        <button className="landing-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu size={20} /></button>
      </nav>

      <div className="landing-hero" id="network">
        <div className="landing-hero-copy">
          <div className="landing-status"><span /> URBAN OPERATIONS NETWORK <b>LIVE</b></div>
          <h1>The city is<br /><em>in motion.</em></h1>
          <p>UrbanEye turns every moving bus, road signal and roadside camera into a clearer view of the city.</p>
          <div className="landing-hero-actions"><button className="landing-primary" onClick={() => enter('/signup')}>Enter the network <ArrowRight size={17} /></button><button className="landing-story" onClick={() => document.getElementById('intelligence')?.scrollIntoView({ behavior: 'smooth' })}><span><Play size={13} fill="currentColor" /></span> See how it works</button></div>
          <div className="landing-trust"><ShieldCheck size={15} /><span>Built for operators, drivers and the people moving through the city.</span></div>
        </div>
        <div className="landing-hero-art"><div className="landing-art-glow" /><div className="landing-art-frame"><img src="/urbaneye-hero.png" alt="UrbanEye smart city network" /><div className="landing-art-scan" /><span className="art-corner corner-tl" /><span className="art-corner corner-br" /></div><div className="landing-orbit-label label-top"><i /> SENSOR NETWORK <strong>04,821</strong></div><div className="landing-orbit-label label-right"><i /> BUS STREAM <strong>LIVE</strong></div><div className="landing-orbit-label label-bottom"><i /> CITY COVERAGE <strong>98.4%</strong></div></div>
      </div>

      <div className="landing-marquee" aria-hidden="true"><div>{[...orbitItems, ...orbitItems].map((item, index) => <span key={`${item}-${index}`}>{item} <b>✦</b></span>)}</div></div>

      <section className="landing-intelligence" id="intelligence"><div className="landing-section-heading"><span>01 / ONE CITY, ONE SIGNAL</span><h2>Clarity for every<br /><em>moving part.</em></h2></div><div className="landing-feature-grid"><article><span className="feature-number">01</span><Sparkles size={20} /><h3>See the live picture</h3><p>Fleet locations, incidents and road conditions meet in one operational view.</p></article><article><span className="feature-number">02</span><ChevronRight size={20} /><h3>Move before the moment</h3><p>Give teams the signal they need to respond faster and keep routes flowing.</p></article><article><span className="feature-number">03</span><ShieldCheck size={20} /><h3>Make every trip safer</h3><p>Turn street-level intelligence into calmer roads and more confident journeys.</p></article></div></section>

      <section className="landing-platform" id="platform"><div><div className="landing-status"><span /> READY WHEN YOU ARE</div><h2>Welcome to the<br /><em>operating layer.</em></h2></div><button className="landing-primary" onClick={() => enter('/signup')}>Create your workspace <ArrowRight size={17} /></button></section>
      <footer className="landing-footer"><span>© 2026 UrbanEye</span><span>Delhi · India</span><span>Safer roads. Smarter cities.</span></footer>
    </section>
  </main>
}
