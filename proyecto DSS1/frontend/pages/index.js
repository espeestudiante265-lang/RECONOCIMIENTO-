// frontend/pages/index.js
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";

export default function HomeInfo() {
  const router = useRouter();
  const [session, setSession] = useState({ active: false, role: null, user: null });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currentSection, setCurrentSection] = useState("que-es");
  const observerRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const token = localStorage.getItem("token");
    const role  = localStorage.getItem("role");
    const user  = localStorage.getItem("username") || null;
    if (token && role) setSession({ active: true, role, user });
  }, []);

  // Navbar: sombra al hacer scroll + sección activa
  useEffect(() => {
    if (typeof window === "undefined") return;

    const onScroll = () => setScrolled(window.scrollY > 6);
    window.addEventListener("scroll", onScroll);
    onScroll();

    const sections = ["que-es", "funciones", "como-empezar", "faq"]
      .map(id => document.getElementById(id))
      .filter(Boolean);

    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) setCurrentSection(e.target.id);
      });
    }, { rootMargin: "-40% 0px -50% 0px", threshold: 0.01 });

    sections.forEach(s => io.observe(s));
    return () => {
      window.removeEventListener("scroll", onScroll);
      io.disconnect();
    };
  }, []);

  // Reveal on scroll (ya lo tenías, lo mantenemos)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const els = document.querySelectorAll(".reveal");
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) { els.forEach(el => el.classList.add("reveal-visible")); return; }
    observerRef.current = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add("reveal-visible")),
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => observerRef.current.observe(el));
    return () => observerRef.current && observerRef.current.disconnect();
  }, []);

  const goLogin = () => router.push("/login");
  const goRegister = () => router.push("/register");

  // Navegación ancla y cerrar menú móvil
  const anchorClick = (e, href) => {
    e.preventDefault();
    setMobileOpen(false);
    document.querySelector(href)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-black text-text relative">
      {/* Fondo sutil */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 blur-3xl"
        style={{
          background:
            "radial-gradient(60rem 30rem at 20% -10%, rgba(80,140,255,0.15), transparent 60%), radial-gradient(50rem 30rem at 90% 10%, rgba(0,255,200,0.08), transparent 60%)",
        }}
      />

      {/* HEADER */}
      <header className={`sticky top-0 z-40 border-b border-gray-700/40 transition-all ${scrolled ? "bg-black/70 backdrop-blur shadow-[0_8px_24px_-12px_rgba(0,0,0,.6)]" : "bg-black/40 backdrop-blur supports-[backdrop-filter]:bg-black/30"}`}>
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            className="flex items-center gap-2 group select-none"
            onClick={(e)=>anchorClick(e, "#que-es")}
            aria-label="Ir al inicio"
          >
            <Logo />
            <span className="font-heading text-xl tracking-tight group-hover:opacity-90 transition-opacity">
              Evaluation
            </span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6 text-subtext">
            <a href="#que-es" onClick={(e)=>anchorClick(e,"#que-es")}
               className={`nav-link ${currentSection==="que-es" ? "active" : ""}`}>¿Qué es?</a>
            <a href="#funciones" onClick={(e)=>anchorClick(e,"#funciones")}
               className={`nav-link ${currentSection==="funciones" ? "active" : ""}`}>Funciones</a>
            <a href="#como-empezar" onClick={(e)=>anchorClick(e,"#como-empezar")}
               className={`nav-link ${currentSection==="como-empezar" ? "active" : ""}`}>Guía</a>
            <a href="#faq" onClick={(e)=>anchorClick(e,"#faq")}
               className={`nav-link ${currentSection==="faq" ? "active" : ""}`}>FAQ</a>
          </nav>

          {/* Acciones / sesión */}
          <div className="hidden md:flex items-center gap-3">
            {session.active ? (
              <span className="text-sm text-subtext">
                Sesión{session.user ? `: ${session.user}` : ""} — <b>{session.role}</b>
              </span>
            ) : (
              <>
                <button onClick={goLogin} className="px-4 py-2 rounded-xl bg-primary text-white hover:opacity-90 active:scale-[0.98] transition">
                  Iniciar sesión
                </button>
                <button onClick={goRegister} className="px-4 py-2 rounded-xl border-2 border-secondary text-secondary hover:bg-secondary hover:text-white active:scale-[0.98] transition">
                  Registrarse
                </button>
              </>
            )}
          </div>

          {/* Botón móvil */}
          <button
            className="md:hidden inline-flex items-center justify-center w-10 h-10 rounded-xl border border-gray-700/50 text-subtext hover:text-white hover:border-gray-500 transition"
            onClick={()=>setMobileOpen(v=>!v)}
            aria-label="Abrir menú"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8">
              {mobileOpen ? (
                <path d="M6 6l12 12M6 18L18 6" strokeLinecap="round"/>
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round"/>
              )}
            </svg>
          </button>
        </div>

        {/* Menú móvil */}
        {mobileOpen && (
          <div className="md:hidden px-4 pb-4 animate-in">
            <div className="rounded-2xl border border-gray-700/50 bg-black/60 backdrop-blur p-3 space-y-1">
              {[
                {href:"#que-es", label:"¿Qué es?"},
                {href:"#funciones", label:"Funciones"},
                {href:"#como-empezar", label:"Guía"},
                {href:"#faq", label:"FAQ"},
              ].map(({href,label})=>(
                <a
                  key={href}
                  href={href}
                  onClick={(e)=>anchorClick(e, href)}
                  className={`block px-3 py-2 rounded-lg text-subtext hover:text-white hover:bg-white/5 transition ${currentSection===href.replace("#","")?"bg-white/5 text-white":""}`}
                >
                  {label}
                </a>
              ))}
              <div className="h-px bg-gray-800 my-2" />
              {session.active ? (
                <span className="block px-3 py-2 text-sm text-subtext">
                  Sesión{session.user ? `: ${session.user}` : ""} — <b>{session.role}</b>
                </span>
              ) : (
                <div className="grid grid-cols-2 gap-2 px-1">
                  <button onClick={goLogin} className="px-3 py-2 rounded-lg bg-primary text-white hover:opacity-90 transition">Entrar</button>
                  <button onClick={goRegister} className="px-3 py-2 rounded-lg border border-secondary text-secondary hover:bg-secondary hover:text-white transition">Registro</button>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* --- CONTENIDO (igual que lo tenías, acortado aquí para foco en navbar/footer) --- */}
      {/* Hero */}
      <section id="que-es" className="px-4 relative z-10">
        <div className="max-w-6xl mx-auto text-center py-16 sm:py-24">
          <h1 className="text-4xl sm:text-6xl font-heading leading-tight reveal">Evaluación + Monitoreo de Atención en un solo lugar</h1>
          <p className="mt-4 text-subtext max-w-2xl mx-auto reveal">
            <span className="text-primary font-medium">Evaluation</span> integra procesos de evaluación académica con el seguimiento de la atención...
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 reveal">
            <button onClick={()=>router.push('/register')} className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary text-white font-medium hover:opacity-90 active:scale-[0.98] transition relative overflow-hidden shine">
              Crear cuenta
            </button>
            <button onClick={()=>router.push('/login')} className="w-full sm:w-auto px-6 py-3 rounded-xl border-2 border-secondary text-secondary font-medium hover:bg-secondary hover:text-white active:scale-[0.98] transition">
              Ya tengo cuenta
            </button>
          </div>
        </div>
      </section>

      {/* Funciones / Beneficios */}
      <section id="funciones" className="px-4 py-14 border-t border-gray-800 relative z-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-heading text-center reveal">¿Qué puedes hacer con Evaluation?</h2>
          <p className="text-subtext text-center mt-2 max-w-2xl mx-auto reveal">Estas son algunas de las funciones clave pensadas para cada rol.</p>

          <div className="mt-10 grid md:grid-cols-3 gap-6">
            <div className="feature-card reveal"><div className="flex items-center justify-between"><h3 className="text-xl font-semibold">Evaluaciones flexibles</h3><IconClipboard /></div><p className="text-subtext mt-2">Crea, asigna y califica...</p><ul className="text-sm mt-4 space-y-2 text-subtext"><li className="li-dot">Cuestionarios rápidos y exámenes</li><li className="li-dot">Retroalimentación inmediata</li><li className="li-dot">Exportación de resultados</li></ul></div>
            <div className="feature-card reveal delay-1"><div className="flex items-center justify-between"><h3 className="text-xl font-semibold">Monitoreo de atención</h3><IconPulse /></div><p className="text-subtext mt-2">Visualiza métricas...</p><ul className="text-sm mt-4 space-y-2 text-subtext"><li className="li-dot">Indicadores por clase y por estudiante</li><li className="li-dot">Tendencias en el tiempo</li><li className="li-dot">Alertas configurables</li></ul></div>
            <div className="feature-card reveal delay-2"><div className="flex items-center justify-between"><h3 className="text-xl font-semibold">Reportes y roles</h3><IconUsers /></div><p className="text-subtext mt-2">Paneles personalizados...</p><ul className="text-sm mt-4 space-y-2 text-subtext"><li className="li-dot">Estudiante: progreso y tareas</li><li className="li-dot">Profesor: calificaciones y métricas</li><li className="li-dot">Admin: usuarios y seguridad</li></ul></div>
          </div>

          <div className="mt-10 grid md:grid-cols-3 gap-4">
            <RoleCard title="Entrar como Estudiante" desc="Revisa tus evaluaciones y tu progreso." href="/login" />
            <RoleCard title="Entrar como Profesor" desc="Gestiona cursos, evalúa y mira métricas." href="/login" />
            <RoleCard title="Entrar como Administrador" desc="Administra usuarios, permisos y seguridad." href="/login" />
          </div>
        </div>
      </section>

      {/* Cómo empezar */}
      <section id="como-empezar" className="px-4 py-14 border-t border-gray-800 relative z-10">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl sm:text-4xl font-heading text-center reveal">Cómo empezar en 3 pasos</h2>
          <p className="text-subtext text-center mt-2 max-w-2xl mx-auto reveal">Sigue estos pasos y estarás listo en minutos.</p>
          <div className="mt-10 grid md:grid-cols-3 gap-6">
            <Step number="1" title="Crea tu cuenta" text="Regístrate eligiendo tu rol..." action={{ label: 'Registrarse', onClick: () => router.push('/register') }} />
            <Step number="2" title="Inicia sesión" text="Accede con tu usuario..." action={{ label: 'Iniciar sesión', onClick: () => router.push('/login') }} />
            <Step number="3" title="Explora tu panel" text="Serás redirigido automáticamente a /dashboard/<rol>..." />
          </div>
          <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-3 reveal">
            <button onClick={()=>router.push('/register')} className="w-full sm:w-auto px-6 py-3 rounded-xl bg-primary text-white font-medium hover:opacity-90 active:scale-[0.98] transition relative overflow-hidden shine">Comenzar ahora</button>
            <Link href="#faq" className="w-full sm:w-auto text-center px-6 py-3 rounded-xl border border-gray-700 text-subtext hover:text-white hover:border-primary active:scale-[0.98] transition">Ver preguntas frecuentes</Link>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="px-4 py-14 border-t border-gray-800 relative z-10">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-heading reveal">Preguntas frecuentes</h2>
        </div>
        <div className="max-w-4xl mx-auto mt-6 space-y-6">
          <FaqItem q="¿Necesito permisos especiales para ser Administrador?" a="Sí. Solo un superusuario..." />
          <FaqItem q="¿Qué base de datos usa el backend?" a="MySQL por defecto..." />
          <FaqItem q="¿Cómo se protege la API?" a="JWT (SimpleJWT) en DRF..." />
        </div>
      </section>

      {/* FOOTER mejorado */}
      <footer className="relative z-10 border-t border-gray-800">
        {/* Gradiente superior */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Marca */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-3">
                <Logo />
                <span className="font-heading text-lg">Evaluation</span>
              </div>
              <p className="text-subtext text-sm">Evaluación y monitoreo de atención en un solo lugar.</p>
              <div className="flex gap-3 mt-4">
                <SocialIcon label="X/Twitter" href="#" path="M18 2h-3L8 13l-3 9 7-11 6-9z" />
                <SocialIcon label="GitHub" href="#" path="M12 2C7 2 3 6 3 11c0 4 2.6 7.4 6.2 8.6.4.1.6-.2.6-.4v-1.5c-2.5.6-3-1.1-3-1.1-.4-1-1-1.2-1-1.2-.8-.6.1-.6.1-.6.9.1 1.4 1 1.4 1 .8 1.4 2.1 1 2.6.8.1-.6.3-1 .5-1.2-2-.2-4.2-1-4.2-4.6 0-1 .4-1.9 1-2.6-.1-.3-.5-1.3.1-2.7 0 0 .8-.3 2.7 1 .8-.2 1.6-.3 2.4-.3s1.6.1 2.4.3c1.9-1.3 2.7-1 2.7-1 .6 1.4.2 2.4.1 2.7.6.7 1 1.6 1 2.6 0 3.6-2.2 4.4-4.2 4.6.3.2.6.7.6 1.5v2.2c0 .2.2.5.6.4C18.4 18.4 21 15 21 11 21 6 17 2 12 2z" />
                <SocialIcon label="LinkedIn" href="#" path="M4 3a2 2 0 100 4 2 2 0 000-4zM3 8h2v13H3zM9 8h2v2h.1c.3-.6 1.1-1.3 2.4-1.3 2.6 0 3.1 1.7 3.1 4V21h-2v-6c0-1.4 0-3.1-1.9-3.1s-2.1 1.5-2.1 3v6H9V8z" />
              </div>
            </div>

            {/* Enlaces rápidos */}
            <div>
              <h4 className="text-sm uppercase tracking-widest text-gray-400">Navegación</h4>
              <ul className="mt-3 space-y-2 text-subtext">
                {[
                  { href:"#que-es", label:"¿Qué es?" },
                  { href:"#funciones", label:"Funciones" },
                  { href:"#como-empezar", label:"Guía" },
                  { href:"#faq", label:"FAQ" },
                ].map(i=>(
                  <li key={i.href}>
                    <a href={i.href} onClick={(e)=>anchorClick(e,i.href)} className="footer-link">{i.label}</a>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recursos (placeholders) */}
            <div>
              <h4 className="text-sm uppercase tracking-widest text-gray-400">Recursos</h4>
              <ul className="mt-3 space-y-2 text-subtext">
                <li><a className="footer-link" href="#">Documentación</a></li>
                <li><a className="footer-link" href="#">Soporte</a></li>
                <li><a className="footer-link" href="#">Estado</a></li>
              </ul>
            </div>

            {/* Boletín (no backend, solo UI) */}
            <div>
              <h4 className="text-sm uppercase tracking-widest text-gray-400">Novedades</h4>
              <p className="text-subtext text-sm mt-2">Suscríbete para recibir actualizaciones (solo UI de ejemplo).</p>
              <div className="mt-3 flex gap-2">
                <input className="flex-1 bg-transparent border border-gray-700 rounded-xl px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary placeholder:text-gray-500" placeholder="tu@email.com" />
                <button className="px-4 py-2 rounded-xl bg-primary text-white hover:opacity-90 active:scale-[0.98] transition">Enviar</button>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-subtext text-sm">© {new Date().getFullYear()} Evaluation. Todos los derechos reservados.</p>
            <div className="text-subtext flex items-center gap-4">
              <a href="#que-es" onClick={(e)=>anchorClick(e,"#que-es")} className="footer-link">Inicio</a>
              <a href="#funciones" onClick={(e)=>anchorClick(e,"#funciones")} className="footer-link">Funciones</a>
              <a href="#como-empezar" onClick={(e)=>anchorClick(e,"#como-empezar")} className="footer-link">Guía</a>
              <a href="#faq" onClick={(e)=>anchorClick(e,"#faq")} className="footer-link">FAQ</a>
            </div>
          </div>
        </div>

        {/* Botón volver arriba */}
        <button
          onClick={(e)=>anchorClick(e,"#que-es")}
          className="fixed bottom-5 right-5 p-3 rounded-full border border-gray-700/60 bg-black/60 backdrop-blur text-subtext hover:text-white hover:border-primary hover:shadow-[0_0_0_3px_rgba(99,102,241,.15)] active:scale-95 transition"
          aria-label="Volver al inicio"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 5l7 7M12 5L5 12" strokeLinecap="round"/><path d="M12 5v14" strokeLinecap="round"/>
          </svg>
        </button>
      </footer>

      {/* ESTILOS */}
      <style jsx global>{`
        html { scroll-behavior: smooth; }
        .reveal { opacity: 0; transform: translateY(14px); transition: opacity .7s ease, transform .7s ease; }
        .reveal-visible { opacity: 1; transform: translateY(0); }
        .delay-1 { transition-delay: .12s; } .delay-2 { transition-delay: .24s; }

        /* Navbar links: underline animado + activo */
        .nav-link {
          position: relative; padding-bottom: 2px;
          color: var(--tw-prose-body, rgba(209,213,219,.8));
          transition: color .2s ease;
        }
        .nav-link:hover { color: #fff; }
        .nav-link::after {
          content: ""; position: absolute; left: 0; bottom: -4px; height: 2px; width: 100%;
          background: linear-gradient(90deg, rgba(99,102,241,.0), rgba(99,102,241,1), rgba(99,102,241,.0));
          transform: scaleX(0); transform-origin: 0 50%; transition: transform .25s ease;
        }
        .nav-link:hover::after { transform: scaleX(1); }
        .nav-link.active { color: #fff; }
        .nav-link.active::after { transform: scaleX(1); }

        /* Cards */
        .feature-card {
          padding: 1.5rem; border-radius: 1rem;
          background: linear-gradient(to bottom, rgba(31,31,31,.9), rgba(10,10,10,.95));
          border: 1px solid rgba(75,85,99,.4);
          transition: transform .35s ease, box-shadow .35s ease, border-color .35s ease;
        }
        .feature-card:hover { transform: translateY(-4px) scale(1.01); box-shadow: 0 10px 30px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.02); border-color: rgba(99,102,241,.6); }

        /* Bullet nicer */
        .li-dot { position: relative; padding-left: 1rem; }
        .li-dot::before { content: ""; position: absolute; left: 0; top: .55rem; width: .4rem; height: .4rem; border-radius: 9999px; background: currentColor; opacity: .5; }

        /* Shine en botones principales */
        .shine::after {
          content: ""; position: absolute; inset: 0; pointer-events: none;
          background: linear-gradient(110deg, transparent 0%, rgba(255,255,255,.25) 20%, transparent 40%);
          transform: translateX(-140%); transition: transform .8s ease;
        }
        .shine:hover::after { transform: translateX(140%); }

        /* Footer links */
        .footer-link { position: relative; }
        .footer-link::after {
          content: ""; position: absolute; left: 0; bottom: -2px; height: 1px; width: 100%;
          background: currentColor; transform: scaleX(0); transform-origin: 0 50%; transition: transform .25s ease, opacity .25s ease; opacity: .6;
        }
        .footer-link:hover::after { transform: scaleX(1); opacity: 1; }

        /* Animación entrada móvil */
        .animate-in { animation: in .18s ease both; }
        @keyframes in { from { opacity: 0; transform: translateY(-6px);} to { opacity: 1; transform: translateY(0);} }

        @media (prefers-reduced-motion: reduce) {
          .reveal, .feature-card, .shine::after { transition: none !important; transform: none !important; }
          .animate-in { animation: none !important; }
        }
      `}</style>
    </div>
  );
}

/* ---------- Subcomponentes (sin cambios de contenido) ---------- */

function RoleCard({ title, desc, href }) {
  return (
    <div className="rounded-2xl border border-gray-700/40 bg-black/30 p-6 flex flex-col reveal">
      <h3 className="font-heading text-xl">{title}</h3>
      <p className="mt-2 text-subtext flex-1">{desc}</p>
      <Link href={href} className="mt-4 inline-block px-4 py-2 rounded-xl border border-secondary text-secondary hover:bg-secondary hover:text-white active:scale-[0.98] transition text-sm text-center">
        Entrar
      </Link>
    </div>
  );
}

function Step({ number, title, text, action }) {
  return (
    <div className="p-6 rounded-2xl bg-black/30 border border-gray-700/40 reveal">
      <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
        {number}
      </div>
      <h3 className="mt-3 font-heading text-xl">{title}</h3>
      <p className="mt-1 text-subtext">{text}</p>
      {action && (
        <button onClick={action.onClick} className="mt-4 px-4 py-2 rounded-xl bg-primary text-white text-sm hover:opacity-90 active:scale-[0.98] transition">
          {action.label}
        </button>
      )}
    </div>
  );
}

function FaqItem({ q, a }) {
  return (
    <details className="group border border-gray-700/40 rounded-xl p-4 bg-black/20 reveal">
      <summary className="cursor-pointer font-medium list-none flex items-center justify-between select-none">
        <span>{q}</span>
        <span className="text-gray-400 group-open:rotate-180 transition">▼</span>
      </summary>
      <p className="mt-3 text-subtext">{a}</p>
    </details>
  );
}

function Logo() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5c-7.168 0-9.72 5.568-9.72 6.478 0 .91 2.552 6.478 9.72 6.478s9.72-5.568 9.72-6.478c0-.91-2.552-6.478-9.72-6.478z" />
      <circle cx="12" cy="12" r="3.2" />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <rect x="6" y="4" width="12" height="16" rx="2" />
      <path d="M9 4h6v3H9zM8 10h8M8 14h8M8 18h6" />
    </svg>
  );
}
function IconPulse() {
  return (
    <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="M3 12h3l2-5 4 10 2-5h5" />
    </svg>
  );
}
function IconUsers() {
  return (
    <svg className="w-6 h-6 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden="true">
      <path d="M16 14a4 4 0 10-8 0" />
      <circle cx="12" cy="8" r="3" />
      <path d="M20 16a4 4 0 00-7-2" />
      <path d="M4 16a4 4 0 017-2" />
    </svg>
  );
}

/* Icono social genérico SVG con glow al hover */
function SocialIcon({ href="#", label="social", path }) {
  return (
    <a href={href} aria-label={label}
       className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-gray-700/60 text-subtext hover:text-white hover:border-primary transition relative overflow-hidden group">
      <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden="true">
        <path d={path} />
      </svg>
      <span className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition"
            style={{boxShadow:"0 0 24px 6px rgba(99,102,241,.25) inset"}}/>
    </a>
  );
}
