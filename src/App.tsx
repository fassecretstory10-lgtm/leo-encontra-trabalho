import { useMemo, useState } from 'react'
import {
  Activity, ArrowDownRight, ArrowRight, ArrowUpRight, Bell, Bookmark, BriefcaseBusiness,
  Building2, CalendarDays, Check, ChevronDown, CircleHelp, Clock3, Command, Compass,
  FileText, Filter, Globe2, LayoutDashboard, Lightbulb, MapPin, Menu, Search, Settings2,
  Sparkles, Target, TrendingUp, Users, X
} from 'lucide-react'

type Job = { id:number; role:string; company:string; location:string; mode:string; salary:string; fit:number; category:string; age:string; tag:string }
const jobs: Job[] = [
  { id:1, role:'Junior Brand & Communications Specialist', company:'Northstar Studio', location:'Lisboa, Portugal', mode:'Híbrido', salary:'€21k–€24k', fit:94, category:'Brand & Comms', age:'Hoje', tag:'Novo' },
  { id:2, role:'Content & Social Media Executive', company:'Good Things Collective', location:'Porto, Portugal', mode:'Remoto', salary:'Não divulgado', fit:91, category:'Content', age:'Há 4 h', tag:'Novo' },
  { id:3, role:'AI Creative Production Assistant', company:'Studio Future', location:'Remote · Europe', mode:'Remoto', salary:'€25k–€29k', fit:89, category:'AI Creative', age:'Ontem', tag:'AI Creative' },
]
const nav = [
  { label:'WORKSPACE', items:[['Overview','Overview',LayoutDashboard],['Daily Radar','Daily Radar',Compass],['Job Library','Job Library',BriefcaseBusiness],['AI Creative','AI Creative',Sparkles],['Hidden Opportunities','Hidden Opportunities',Lightbulb]] },
  { label:'CAREER', items:[['Markets','Markets',Globe2],['Companies','Companies',Building2],['Applications','Applications',Target],['Career Insights','Career Insights',TrendingUp],['CV & Documents','CV & Documents',FileText]] },
]
const pageCopy: Record<string,{eyebrow:string;title:string;description:string}> = {
  Overview:{eyebrow:'TERÇA-FEIRA, 11 NOVEMBRO 2026',title:'O próximo passo começa aqui.',description:'O teu espaço para descobrir oportunidades, encontrar empresas e construir o próximo capítulo da tua carreira.'},
  'Daily Radar':{eyebrow:'RADAR DE OPORTUNIDADES',title:'Vagas que merecem a tua atenção.',description:'Descoberta diária, organizada pelos mercados e áreas que fazem sentido para ti.'},
  'Job Library':{eyebrow:'A TUA BASE DE OPORTUNIDADES',title:'Tudo o que encontraste. Num só lugar.',description:'Uma biblioteca cumulativa para guardar, comparar e acompanhar oportunidades.'},
  'AI Creative':{eyebrow:'FRONTEIRA CRIATIVA',title:'Onde a criatividade encontra a tecnologia.',description:'Funções em AI creative, generative content, vídeo, experiências digitais e novos formatos.'},
  'Hidden Opportunities':{eyebrow:'PARA ALÉM DOS ANÚNCIOS',title:'Oportunidades que ainda não chegaram aos portais.',description:'Estúdios, agências independentes, produtoras e empresas para abordar diretamente.'},
  Markets:{eyebrow:'INTELIGÊNCIA DE MERCADO',title:'Escolhe onde pode acontecer.',description:'Acompanha oportunidades por país, cidade e modelo de trabalho.'},
  Companies:{eyebrow:'MAPA DE EMPREGADORES',title:'Empresas para ter no radar.',description:'Organizações relevantes, equipas, páginas de carreira e oportunidades.'},
  Applications:{eyebrow:'O TEU PIPELINE',title:'Cada candidatura, com um próximo passo.',description:'Organiza o processo desde a descoberta até à entrevista e follow-up.'},
  'Career Insights':{eyebrow:'SINAIS & TENDÊNCIAS',title:'Uma visão mais clara da tua procura.',description:'Percebe onde estão as oportunidades e como está a evoluir o teu pipeline.'},
  'CV & Documents':{eyebrow:'O TEU KIT DE CANDIDATURA',title:'As ferramentas para dar o próximo passo.',description:'CVs, cartas, portfolio e documentos preparados para cada oportunidade.'},
  Settings:{eyebrow:'PREFERÊNCIAS',title:'O radar deve trabalhar à tua medida.',description:'Critérios de pesquisa, mercados, alertas e integrações.'},
}
function App(){
  const [active,setActive] = useState('Overview')
  const [query,setQuery] = useState('')
  const [filter,setFilter] = useState('Todas')
  const [saved,setSaved] = useState<number[]>([])
  const [mobileOpen,setMobileOpen] = useState(false)
  const [notice,setNotice] = useState('')
  const filtered = useMemo(()=>jobs.filter(j=>(filter==='Todas'||j.category===filter)&&`${j.role} ${j.company} ${j.location}`.toLowerCase().includes(query.toLowerCase())),[filter,query])
  const copy = pageCopy[active] || pageCopy.Overview
  const choose = (name:string)=>{setActive(name);setMobileOpen(false)}
  const save = (id:number)=>{setSaved(s=>s.includes(id)?s.filter(x=>x!==id):[...s,id]);setNotice(saved.includes(id)?'Oportunidade removida dos guardados.':'Oportunidade guardada na tua biblioteca.');setTimeout(()=>setNotice(''),2600)}
  return <div className="app-shell">
    <aside className={`sidebar ${mobileOpen?'sidebar-open':''}`}>
      <div className="brand"><div className="brand-mark">le<span>o.</span></div><div><strong>LEO ENCONTRA</strong><small>TRABALHO!</small></div><button className="mobile-close icon-btn" onClick={()=>setMobileOpen(false)}><X size={18}/></button></div>
      <button className="profile-switch"><div className="avatar">LP</div><span><b>Leonardo Paiva</b><small>Personal workspace</small></span><ChevronDown size={15}/></button>
      <div className="nav-groups">{nav.map(group=><div className="nav-group" key={group.label}><p>{group.label}</p>{group.items.map(([label,key,Icon])=><button key={String(key)} className={`nav-link ${active===key?'active':''}`} onClick={()=>choose(String(key))}><Icon size={17}/><span>{String(label)}</span>{key==='Daily Radar'&&<i className="nav-count">8</i>}</button>)}</div>)}</div>
      <div className="sidebar-bottom"><div className="radar-status"><span className="status-dot"/><div><b>Radar preparado</b><small>Integrações em configuração</small></div></div><button className={`nav-link ${active==='Settings'?'active':''}`} onClick={()=>choose('Settings')}><Settings2 size={17}/> Settings</button><div className="sidebar-foot">FEITO PARA O TEU PRÓXIMO PASSO <span>✳</span></div></div>
    </aside>
    {mobileOpen&&<button className="mobile-scrim" onClick={()=>setMobileOpen(false)} aria-label="Fechar menu"/>}
    <main className="main-area">
      <header className="topbar"><div className="top-left"><button className="mobile-menu icon-btn" onClick={()=>setMobileOpen(true)}><Menu size={19}/></button><div className="breadcrumb">Workspace <span>/</span> <b>{active}</b></div></div><div className="top-actions"><div className="search-global"><Search size={16}/><input placeholder="Pesquisar oportunidades..." value={query} onChange={e=>setQuery(e.target.value)}/><kbd>⌘ K</kbd></div><button className="icon-btn notification" onClick={()=>setNotice('Ainda não existem notificações.')}><Bell size={18}/><i/></button><div className="top-avatar">LP</div></div></header>
      <div className="page-content">
        <section className="welcome-row"><div><div className="eyebrow"><span/> {copy.eyebrow}</div><h1>{copy.title}</h1><p className="page-description">{copy.description}</p></div><button className="date-chip"><CalendarDays size={15}/> 11 Nov, 2026 <ChevronDown size={14}/></button></section>
        {active==='Overview'||active==='Daily Radar'?<>
          <section className="hero-panel"><div className="hero-copy"><div className="hero-label"><Sparkles size={14}/> CAREER COMMAND CENTRE</div><h2>Não procures apenas<br/><em>um trabalho. Encontra o teu.</em></h2><p>O teu percurso, as tuas regras. Vamos encontrar oportunidades que combinam com aquilo que sabes fazer e com aquilo que queres explorar.</p><button className="primary-btn" onClick={()=>choose('Daily Radar')}>Explorar oportunidades <ArrowRight size={16}/></button></div><div className="hero-art"><div className="orbit orbit-one"/><div className="orbit orbit-two"/><div className="orbit-core"><Command size={30}/></div><div className="orbit-node node-a"><Sparkles size={16}/></div><div className="orbit-node node-b"><Target size={16}/></div><div className="orbit-node node-c"><BriefcaseBusiness size={16}/></div><div className="orbit-caption">YOUR NEXT<br/>CHAPTER</div></div><div className="hero-index">01 <span>/ 04</span></div></section>
          <section className="metrics-grid"><Metric icon={<Compass/>} label="Novas oportunidades" value="08" note="descobertas hoje" trend="+3 esta semana" tone="violet"/><Metric icon={<Bookmark/>} label="Guardadas" value={String(saved.length).padStart(2,'0')} note="na tua biblioteca" trend="A acompanhar" tone="blue"/><Metric icon={<SendIcon/>} label="Candidaturas" value="00" note="no teu pipeline" trend="Pronto a começar" tone="orange"/><Metric icon={<Users/>} label="Entrevistas" value="00" note="em processo" trend="O próximo passo" tone="green"/></section>
        </>:<section className="section-intro"><div className="intro-icon"><Compass size={22}/></div><div><b>{active}</b><p>Esta área faz parte da estrutura do Career Radar. Estamos a construir as funcionalidades por fases, mantendo a arquitetura final.</p></div><span className="phase-pill">A CONSTRUIR</span></section>}
        <section className="content-grid"><div className="jobs-panel"><div className="panel-heading"><div><div className="eyebrow">MATCHES RECENTES <span className="live-dot"/></div><h3>{active==='Job Library'?'A tua biblioteca': 'Oportunidades em destaque'}</h3></div><button className="text-link" onClick={()=>choose('Daily Radar')}>Ver todas <ArrowRight size={15}/></button></div><div className="filter-row"><div className="filter-tabs">{['Todas','Brand & Comms','Content','AI Creative'].map(f=><button key={f} className={filter===f?'selected':''} onClick={()=>setFilter(f)}>{f}</button>)}</div><button className="filter-btn" onClick={()=>setNotice('Filtros avançados estarão disponíveis na próxima fase.')}><Filter size={15}/> Filtros</button></div><div className="job-list">{filtered.map(job=><article className="job-row" key={job.id}><div className={`company-logo logo-${job.id}`}>{job.company.split(' ').map(w=>w[0]).slice(0,2).join('')}</div><div className="job-main"><div className="job-title-line"><h4>{job.role}</h4>{job.tag==='Novo'&&<span className="new-tag">NOVO</span>}</div><div className="company-name">{job.company}</div><div className="job-meta"><span><MapPin size={13}/>{job.location}</span><span><BriefcaseBusiness size={13}/>{job.mode}</span><span><Clock3 size={13}/>{job.age}</span></div></div><div className="job-right"><div className="fit-score"><b>{job.fit}%</b><small>FIT</small></div><strong>{job.salary}</strong><small>{job.category}</small></div><button className={`save-btn ${saved.includes(job.id)?'is-saved':''}`} onClick={()=>save(job.id)} aria-label="Guardar oportunidade"><Bookmark size={17} fill={saved.includes(job.id)?'currentColor':'none'}/></button></article>)}
          {filtered.length===0&&<div className="empty-state"><Search size={22}/><b>Não encontrámos resultados.</b><span>Experimenta outra pesquisa ou categoria.</span></div>}
          <div className="demo-note"><span>i</span> Dados ilustrativos de demonstração. As vagas reais só serão apresentadas após ligar as fontes de pesquisa e verificação.</div></div></div>
          <aside className="right-column"><div className="side-card profile-card"><div className="side-card-head"><span>O TEU PERFIL</span><button onClick={()=>choose('Settings')}>Editar <ArrowUpRight size={13}/></button></div><div className="profile-score"><div className="score-ring"><b>92</b><small>/100</small></div><div><b>Perfil bem definido</b><p>Os teus critérios estão prontos para orientar a pesquisa.</p></div></div><div className="profile-tags"><span>Marketing</span><span>Comunicação</span><span>AI Creative</span><span>Content</span></div><div className="profile-foot"><Check size={14}/> Preferências principais configuradas</div></div>
            <div className="side-card focus-card"><div className="side-card-head"><span>FOCO DE PESQUISA</span><Globe2 size={16}/></div><div className="focus-item"><div className="flag">🇵🇹</div><div><b>Portugal</b><small>Lisboa · Porto · Coimbra · Braga</small></div><span className="focus-priority">PRIORITÁRIO</span></div><div className="focus-item"><div className="flag">🇳🇱</div><div><b>Países Baixos</b><small>English-friendly roles</small></div></div><div className="focus-item"><div className="flag">🇨🇭</div><div><b>Suíça</b><small>Zurich · Geneva · Basel · Lausanne</small></div></div><div className="focus-item"><div className="flag">🇦🇪</div><div><b>Dubai / UAE</b><small>Marketing · Media · Creative</small></div></div></div>
            <div className="side-card next-card"><div className="side-card-head"><span>PRÓXIMO PASSO</span><Activity size={16}/></div><div className="next-step"><div className="step-icon"><FileText size={17}/></div><div><b>Adicionar os teus CVs</b><p>Vamos usá-los como referência para avaliar cada oportunidade.</p><button onClick={()=>choose('CV & Documents')}>Abrir documentos <ArrowRight size={13}/></button></div></div></div>
          </aside></section>
        <footer className="page-footer"><span>LEO ENCONTRA TRABALHO! <b>✳</b></span><span>UM BOM PRÓXIMO PASSO MUDA TUDO.</span><span>PHASE 01 · FOUNDATION</span></footer>
      </div>
    </main>
    {notice&&<div className="toast"><Check size={16}/>{notice}<button onClick={()=>setNotice('')}><X size={14}/></button></div>}
  </div>
}
function Metric({icon,label,value,note,trend,tone}:{icon:React.ReactNode;label:string;value:string;note:string;trend:string;tone:string}){return <div className="metric-card"><div className={`metric-icon ${tone}`}>{icon}</div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-note">{note}</div><div className="metric-trend"><ArrowUpRight size={13}/>{trend}</div></div>}
function SendIcon(){return <ArrowDownRight/>}
export default App
