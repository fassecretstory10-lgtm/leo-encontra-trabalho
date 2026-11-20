type Env={DB:any;ASSETS:{fetch:(r:Request)=>Promise<Response>};JOB_BOARDS?:string;SERPAPI_KEY?:string}
type Board={provider:'greenhouse'|'lever'|'ashby'|'smartrecruiters'|'workable';slug:string;company:string}
const out=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})
const csvEsc=(v:unknown)=>{const s=String(v??'');return /[;"\n\r]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s}
const csv=(keys:string[],head:string[],rows:Record<string,unknown>[],file:string)=>new Response('\ufeff'+head.join(';')+'\n'+rows.map(r=>keys.map(k=>csvEsc(r[k])).join(';')).join('\n'),{headers:{'content-type':'text/csv; charset=utf-8','content-disposition':'attachment; filename="'+file+'"'}})
const boards=(s?:string):Board[]=>{try{return s?JSON.parse(s):[]}catch{return[]}}
const clean=(s:string)=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim()
async function json(url:string){const r=await fetch(url,{headers:{accept:'application/json','user-agent':'LeoJobs/1.0'}});if(!r.ok)throw Error('HTTP '+r.status+' '+url);return r.json() as Promise<any>}
function upsertStmt(env:Env,j:any){return env.DB.prepare('INSERT INTO jobs(id,source,source_id,title,company,location,work_mode,salary,description,url,posted_at,apply_url,language,first_seen,last_seen,is_open) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET title=excluded.title,location=excluded.location,work_mode=excluded.work_mode,salary=excluded.salary,description=excluded.description,url=excluded.url,posted_at=excluded.posted_at,apply_url=excluded.apply_url,language=excluded.language,last_seen=excluded.last_seen,is_open=1').bind(j.id,j.source,j.source_id,j.title,j.company,j.location,j.work_mode,j.salary,j.description,j.url,j.posted_at,j.apply_url,j.language,j.first_seen,j.last_seen)}
async function upsert(env:Env,j:any){await upsertStmt(env,j).run()}
// db.batch() conta como uma única query no limite de subrequests por invocação (D1 limits)
async function upsertMany(env:Env,items:any[]){for(let i=0;i<items.length;i+=100)await env.DB.batch(items.slice(i,i+100).map((j:any)=>upsertStmt(env,j)));return items.length}
async function fetchBoard(b:Board){let rows:any[]=[];const slug=encodeURIComponent(b.slug)
 if(b.provider==='greenhouse')rows=(await json('https://boards-api.greenhouse.io/v1/boards/'+slug+'/jobs?content=true')).jobs||[]
 if(b.provider==='lever')rows=await json('https://api.lever.co/v0/postings/'+slug+'?mode=json')
 if(b.provider==='ashby')rows=(await json('https://api.ashbyhq.com/posting-api/job-board/'+slug+'?includeCompensation=true')).jobs||[]
 if(b.provider==='smartrecruiters')rows=(await json('https://api.smartrecruiters.com/v1/companies/'+slug+'/postings?limit=100&offset=0')).content||[]
 if(b.provider==='workable')rows=(await json('https://apply.workable.com/api/v1/widget/accounts/'+slug+'?details=true')).jobs||[]
 const now=new Date().toISOString()
 return rows.map((r:any)=>{const id=String(r.id||r.requisitionId||r.hostedUrl||r.url||'');const url=r.absolute_url||r.hostedUrl||r.applyUrl||r.url||r.jobUrl||(r.ref?'https://jobs.smartrecruiters.com/'+(typeof r.company==='string'?r.company:b.company)+'/'+r.id:'');const published=r.first_published||r.createdAt||r.created_at||r.updated_at||r.publishedAt||null;const salary=r.compensationTierSummary||r.compensation||r.salary||'';return{id:b.provider+':'+b.slug+':'+id,source:b.provider+':'+b.slug,source_id:id,title:r.title||r.name||r.jobTitle||r.text||'',company:b.company,location:typeof r.location==='string'?r.location:r.location?.name||r.location?.city||r.categories?.location||'',work_mode:r.workplaceType||r.workplace_type||'Não indicado',salary:typeof salary==='string'?salary:JSON.stringify(salary||''),description:clean(r.content||r.descriptionPlain||r.description||r.jobDescription||''),url,posted_at:published?new Date(published).toISOString():null,apply_url:url,language:(typeof r.language==='string'?r.language:r.language?.code)||'',first_seen:now,last_seen:now}}).filter((j:any)=>j.title&&j.url)
}
async function feedDue(env:Env,source:string,minutes:number){const row=await env.DB.prepare('SELECT last_run FROM source_sync WHERE source=?').bind(source).first();return !row?.last_run||Date.now()-new Date(row.last_run).getTime()>=minutes*60000}
async function markFeed(env:Env,source:string){await env.DB.prepare('INSERT INTO source_sync(source,last_run) VALUES(?,?) ON CONFLICT(source) DO UPDATE SET last_run=excluded.last_run').bind(source,new Date().toISOString()).run()}
async function googleJobs(env:Env){
 const places=['Lisbon, Portugal','Coimbra, Portugal','Porto, Portugal','Netherlands','Switzerland','Denmark','Dubai, United Arab Emirates'];let count=0
 for(const place of places){const p=new URLSearchParams({engine:'google_jobs',q:'junior marketing communications content social media branding employer branding creative AI',location:place,api_key:env.SERPAPI_KEY!,hl:'en'});const d=await json('https://serpapi.com/search.json?'+p.toString());for(const r of d.jobs_results||[]){const id=String(r.job_id||r.share_link||r.title+'-'+r.company_name);const apply=r.apply_options?.[0]?.link||r.share_link||'';if(!apply)continue;const now=new Date().toISOString();await upsert(env,{id:'googlejobs:'+id,source:'Google Jobs',source_id:id,title:r.title||'',company:r.company_name||'',location:r.location||place,work_mode:r.detected_extensions?.work_from_home?'Remoto':'Não indicado',salary:r.detected_extensions?.salary||'Não divulgado',description:clean(r.description||''),url:apply,posted_at:null,apply_url:apply,language:'',first_seen:now,last_seen:now});count++}}
 return count
}
async function sync(env:Env){
 const errors:string[]=[];let saved=0;const configured=boards(env.JOB_BOARDS);const started=new Date().toISOString();const exact:string[]=[]
 for(const b of configured){const src=b.provider+':'+b.slug;try{saved+=await upsertMany(env,await fetchBoard(b));if(b.provider==='greenhouse'||b.provider==='lever'||b.provider==='ashby')exact.push(src)}catch(e){errors.push(b.company+': '+String(e))}}
 if(exact.length)await env.DB.prepare('UPDATE jobs SET is_open=0 WHERE is_open=1 AND last_seen<? AND source IN ('+exact.map(()=>'?').join(',')+')').bind(started,...exact).run()
 if(await feedDue(env,'jobicy',60)){try{const d=await json('https://jobicy.com/api/jobs?count=200&geo=europe');const now=new Date().toISOString();const rows=(d.jobs||[]).map((r:any)=>{const id=String(r.id);const url=r.url||r.jobUrl||'';const date=r.pubDate||r.publishedAt||r.date||null;const salary=[r.salaryMin,r.salaryMax,r.salaryCurrency].filter(Boolean).join(' ');return{id:'jobicy:'+id,source:'Jobicy',source_id:id,title:r.jobTitle||r.title||'',company:r.companyName||r.company||'',location:r.jobGeo||r.location||'Remote · Europe',work_mode:(typeof r.jobType==='string'?r.jobType:r.jobType?.name)||'Remoto',salary:salary||'Não divulgado',description:clean(r.jobDescription||r.description||''),url,posted_at:date?new Date(date).toISOString():null,apply_url:url,language:'',first_seen:now,last_seen:now}});saved+=await upsertMany(env,rows);await markFeed(env,'jobicy')}catch(e){errors.push('Jobicy: '+String(e))}}
 if(await feedDue(env,'remotive',360)){try{const d=await json('https://remotive.com/api/remote-jobs?limit=500');const now=new Date().toISOString();const rows=(d.jobs||[]).map((r:any)=>{const eligible=String(r.candidate_required_location||'').toLowerCase();if(eligible&&!/(worldwide|anywhere|europe|european|emea|portugal|remote anywhere|global)/.test(eligible))return null;const id=String(r.id);const url=r.url||'';return{id:'remotive:'+id,source:'Remotive',source_id:id,title:r.title||'',company:r.company_name||'',location:r.candidate_required_location||'Remote',work_mode:'Remoto',salary:r.salary||'Não divulgado',description:clean(r.description||''),url,posted_at:r.publication_date?new Date(r.publication_date).toISOString():null,apply_url:url,language:'',first_seen:now,last_seen:now}}).filter(Boolean);saved+=await upsertMany(env,rows);await markFeed(env,'remotive')}catch(e){errors.push('Remotive: '+String(e))}}
 if(env.SERPAPI_KEY&&new Intl.DateTimeFormat('en-GB',{timeZone:'Europe/Lisbon',hour:'2-digit',hour12:false}).format(new Date())==='09'&&await feedDue(env,'google_jobs',1440)){try{const n=await googleJobs(env);saved+=n;await markFeed(env,'google_jobs')}catch(e){errors.push('Google Jobs: '+String(e))}}
 await env.DB.prepare('INSERT INTO sync_runs(ran_at,source_count,job_count,error_count,errors) VALUES(?,?,?,?,?)').bind(new Date().toISOString(),configured.length+2,saved,errors.length,errors.join('\n').slice(0,4000)).run()
 return{ok:errors.length===0,companyBoards:configured.length,publicFeeds:['Jobicy (máx. 1/h)','Remotive (máx. 4/dia)'],upserted:saved,errors}
}
export default{
 async fetch(req:Request,env:Env){const u=new URL(req.url)
  if(u.pathname==='/api/health')return out({ok:true,configuredCompanyBoards:boards(env.JOB_BOARDS).length,publicFeeds:['Jobicy','Remotive'],googleJobsEnabled:!!env.SERPAPI_KEY})
  if(u.pathname==='/api/jobs'&&req.method==='GET'){
   const sp=u.searchParams,q=(sp.get('q')||'').trim(),days=sp.get('days')||'15',light=sp.get('light')==='1'
   const where:string[]=[],vb:(string|number|null)[]=[]
   if(days!=='all'){where.push("datetime(COALESCE(j.posted_at,j.first_seen))>=datetime('now',?)");vb.push('-'+Math.min(365,Math.max(1,Number(days)))+' days')}
   where.push("(?='' OR lower(j.title||' '||j.company||' '||j.location||' '||j.description) LIKE '%'||lower(?)||'%')");vb.push(q,q)
   const lg=(e:string,ts:string[])=>'('+ts.map(t=>e+" LIKE '%"+t+"%'").join(' OR ')+')'
   const cat=sp.get('category')||''
   const CATS:{[k:string]:string[]}={marketing:['marketing','communication','comunica','brand','campaign','growth marketing'],content:['content','social media','copywrit','editorial','community','creator'],eb:['employer brand','internal communication','employee communication','people communication','comunicação interna','comunicación interna'],ai:['ai ','ai,','ai.','ai-','ai)','ai(','artificial intelligence','generative','creative technolog','creative producer','prompt'],media:['advertis','public relations','media','entertainment','production','broadcast','audiovisual'],crm:['crm','email marketing','lifecycle','marketing automation','digital marketing','seo']}
   if(cat&&CATS[cat])where.push(lg("lower(j.title||' '||j.description)",CATS[cat]))
   if(cat==='outros')where.push('NOT ('+Object.values(CATS).map(ts=>lg("lower(j.title||' '||j.description)",ts)).join(' OR ')+')')
   const COUNTRY:{[k:string]:string[]}={portugal:['portugal','lisboa','lisbon','porto','coimbra','braga','aveiro','leiria','setúbal','setubal','faro','madeira','açores','azores'],netherlands:['netherlands','nederland','amsterdam','rotterdam','utrecht','eindhoven'],switzerland:['switzerland','schweiz','suisse','zurich','zürich','geneva','basel','lausanne'],denmark:['denmark','danmark','copenhagen','københavn','aarhus'],uae:['dubai','united arab emirates','uae'],germany:['germany','deutschland','berlin','munich','münchen','hamburg','frankfurt','stuttgart','köln','cologne'],uk:['united kingdom','london','manchester','england','scotland','edinburgh','birmingham','leeds','wales']}
   const country=sp.get('country')||''
   if(country&&COUNTRY[country])where.push(lg("lower(j.location||' '||j.work_mode)",COUNTRY[country]))
   if(country==='remote_intl')where.push("lower(j.location||' '||j.work_mode) LIKE '%remote%'")
   if(country==='outros')where.push('NOT ('+Object.values(COUNTRY).map(ts=>lg("lower(j.location||' '||j.work_mode)",ts)).join(' OR ')+')')
   const modality=sp.get('modality')||''
   const remote=lg("lower(j.work_mode||' '||j.location)",['remot'])
   if(modality==='remote')where.push(remote)
   if(modality==='hybrid')where.push(lg("lower(j.work_mode||' '||j.location)",['hybrid','híbrid']))
   if(modality==='presencial')where.push('NOT '+remote+' AND NOT '+lg("lower(j.work_mode||' '||j.location)",['hybrid','híbrid']))
   const SEN:{[k:string]:string[]}={intern:['internship','intern ','estágio','estagio','trainee','graduate','stagiaire'],junior:['junior','jr.','jr ','entry level','entry-level'],mid:['mid-level','mid level','intermediate','médio']}
   const sen=sp.get('seniority')||''
   if(sen&&SEN[sen])where.push(lg('lower(j.title)',SEN[sen]))
   const CON:{[k:string]:string[]}={fulltime:['full-time','full time','fulltime','permanent','permanente','tempo integral'],parttime:['part-time','part time','parttime','meio período','tempo parcial'],temp:['contract','freelance','temporary','temporário','fixed-term','fixed term','independente']}
   const con=sp.get('contract')||''
   if(con&&CON[con])where.push(lg("lower(j.title||' '||j.work_mode)",CON[con]))
   const lang=sp.get('language')||''
   if(lang==='outro')where.push("(j.language<>'' AND j.language NOT LIKE 'pt%' AND j.language NOT LIKE 'en%' AND j.language NOT LIKE 'es%' AND j.language NOT LIKE 'fr%' AND j.language NOT LIKE 'de%')")
   else if(lang)where.push('j.language LIKE ?'),vb.push(lang+'%')
   const source=sp.get('source')||''
   if(source)where.push('j.source=?'),vb.push(source)
   const state=sp.get('state')||'all'
   if(state==='active')where.push('j.is_open=1')
   if(state==='archived')where.push('j.is_open=0')
   if(sp.get('saved')==='1')where.push('s.job_id IS NOT NULL')
   if(sp.get('app')==='1')where.push('a.job_id IS NOT NULL')
   const sel=light?'j.id,j.source,j.source_id,j.title,j.company,j.location,j.work_mode,j.salary,j.url,j.posted_at,j.apply_url,j.language,j.first_seen,j.last_seen,j.is_open':'j.*'
   const r=await env.DB.prepare("SELECT "+sel+",CASE WHEN s.job_id IS NULL THEN 0 ELSE 1 END AS saved, a.status AS application_status, a.method AS application_method, a.updated_at AS application_updated_at FROM jobs j LEFT JOIN saved_jobs s ON s.job_id=j.id LEFT JOIN applications a ON a.job_id=j.id"+(where.length?' WHERE '+where.join(' AND '):'')+" ORDER BY COALESCE(j.posted_at,j.first_seen) DESC LIMIT 2000").bind(...vb).all();
   const last=await env.DB.prepare('SELECT ran_at,job_count,error_count FROM sync_runs ORDER BY id DESC LIMIT 1').first();
   return out({jobs:r.results||[],lastSync:last||null,period:days});
  }
  if(u.pathname==='/api/job'&&req.method==='GET'){const j=await env.DB.prepare('SELECT * FROM jobs WHERE id=?').bind(u.searchParams.get('id')||'').first();if(!j)return out({error:'Vaga não encontrada'},404);const extra=await env.DB.prepare('SELECT CASE WHEN s.job_id IS NULL THEN 0 ELSE 1 END AS saved FROM jobs j LEFT JOIN saved_jobs s ON s.job_id=j.id WHERE j.id=?').bind(j.id).first();return out({job:{...j,saved:extra?.saved??0}})}
  if(u.pathname==='/api/dashboard'&&req.method==='GET'){
   const lg=(e:string,ts:string[])=>ts.map(t=>e+" LIKE '%"+t+"%'").join(' OR ')
   const T="lower(title||' '||description)",L="lower(location||' '||work_mode)"
   const CATS:{[k:string]:string[]}={marketing:['marketing','communication','comunica','brand','campaign','growth marketing'],content:['content','social media','copywrit','editorial','community','creator'],eb:['employer brand','internal communication','employee communication','people communication','comunicação interna','comunicación interna'],ai:['ai ','ai,','ai.','ai-','ai)','ai(','artificial intelligence','generative','creative technolog','creative producer','prompt'],media:['advertis','public relations','media','entertainment','production','broadcast','audiovisual'],crm:['crm','email marketing','lifecycle','marketing automation','digital marketing','seo']}
   const COUNTRY:{[k:string]:string[]}={portugal:['portugal','lisboa','lisbon','porto','coimbra','braga','aveiro','leiria','setúbal','setubal','faro','madeira','açores','azores'],netherlands:['netherlands','nederland','amsterdam','rotterdam','utrecht','eindhoven'],switzerland:['switzerland','schweiz','suisse','zurich','zürich','geneva','basel','lausanne'],denmark:['denmark','danmark','copenhagen','københavn','aarhus'],uae:['dubai','united arab emirates','uae'],germany:['germany','deutschland','berlin','munich','münchen','hamburg','frankfurt','stuttgart','köln','cologne'],uk:['united kingdom','london','manchester','england','scotland','edinburgh','birmingham','leeds','wales']}
   const jobs=await env.DB.prepare("SELECT COUNT(*) total, SUM(CASE WHEN datetime(COALESCE(posted_at,first_seen))>=datetime('now','-15 days') THEN 1 ELSE 0 END) recent15, SUM(CASE WHEN is_open=1 THEN 1 ELSE 0 END) open, SUM(CASE WHEN first_seen>=datetime('now','-2 days') THEN 1 ELSE 0 END) fresh, COUNT(DISTINCT company) companies FROM jobs").first()
   const bySource=await env.DB.prepare('SELECT source,COUNT(*) n FROM jobs GROUP BY source ORDER BY n DESC').all()
   const byDay=await env.DB.prepare("SELECT date(COALESCE(posted_at,first_seen)) d,COUNT(*) n FROM jobs WHERE COALESCE(posted_at,first_seen)>=datetime('now','-14 days') GROUP BY d ORDER BY d").all()
   const countrySum=Object.entries(COUNTRY).map(([k,ts])=>`SUM(CASE WHEN ${lg(L,ts)} THEN 1 ELSE 0 END) ${k}`).join(',')
   const remote=lg(L,['remot'])
   const byCountry=await env.DB.prepare(`SELECT ${countrySum}, SUM(CASE WHEN ${remote} AND NOT (${Object.values(COUNTRY).map(ts=>lg(L,ts)).join(' OR ')}) THEN 1 ELSE 0 END) remote_intl, COUNT(*) others_ref FROM jobs`).first()
   const catSum=Object.entries(CATS).map(([k,ts])=>`SUM(CASE WHEN ${lg(T,ts)} THEN 1 ELSE 0 END) ${k}`).join(',')
   const byCategory=await env.DB.prepare(`SELECT ${catSum}, COUNT(*) FROM jobs`).first()
   const totals=await env.DB.prepare("SELECT COUNT(*) total, SUM(CASE WHEN status IN ('applied','confirmation','analyzing','interview','test','rejected','offer') THEN 1 ELSE 0 END) submitted, SUM(CASE WHEN status IN ('confirmation','analyzing','interview','test','offer') THEN 1 ELSE 0 END) responses, SUM(CASE WHEN status='interview' THEN 1 ELSE 0 END) interviews, SUM(CASE WHEN status='test' THEN 1 ELSE 0 END) tests, SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) rejected, SUM(CASE WHEN status='offer' THEN 1 ELSE 0 END) offers, SUM(CASE WHEN status IN ('interested','preparing','draft_ready','applied','confirmation','analyzing') THEN 1 ELSE 0 END) pending FROM applications").first()
   const byStatus=await env.DB.prepare('SELECT status,COUNT(*) n FROM applications GROUP BY status').all()
   return out({jobs:jobs||{},bySource:bySource.results||[],byDay:byDay.results||[],byCountry:byCountry||{},byCategory:byCategory||{},totals:totals||{},byStatus:byStatus.results||[]})
  }
  if(u.pathname==='/api/export/jobs.csv'&&req.method==='GET'){
   const rows=await env.DB.prepare('SELECT id,source,source_id,title,company,location,work_mode,salary,language,posted_at,first_seen,last_seen,is_open,url FROM jobs ORDER BY first_seen DESC').all()
   return csv(['id','source','source_id','title','company','location','work_mode','salary','language','posted_at','first_seen','last_seen','is_open','url'],['id','fonte','source_id','cargo','empresa','localizacao','modalidade','salario','idioma','data_publicacao','primeira_deteccao','ultima_deteccao','ativo','url'],rows.results||[],'leo-jobs-oportunidades.csv')
  }
  if(u.pathname==='/api/export/applications.csv'&&req.method==='GET'){
   const rows=await env.DB.prepare("SELECT a.id,a.job_id,j.title,j.company,j.url,a.status,a.method,a.created_at,a.updated_at,a.applied_at,a.followup_at,a.next_action,a.cv_version,a.notes FROM applications a JOIN jobs j ON j.id=a.job_id ORDER BY a.updated_at DESC").all()
   return csv(['id','job_id','title','company','url','status','method','created_at','updated_at','applied_at','followup_at','next_action','cv_version','notes'],['id','job_id','cargo','empresa','url','estado','canal','registada_em','atualizada_em','submetida_em','followup_previsto','proxima_acao','cv','notas'],rows.results||[],'leo-jobs-candidaturas.csv')
  }
  if(u.pathname==='/api/export/events.csv'&&req.method==='GET'){
   const rows=await env.DB.prepare("SELECT e.id,e.application_id,j.title,j.company,e.old_status,e.new_status,e.changed_at,e.note FROM application_events e LEFT JOIN applications a ON a.id=e.application_id LEFT JOIN jobs j ON j.id=a.job_id ORDER BY e.id DESC").all()
   return csv(['id','application_id','title','company','old_status','new_status','changed_at','note'],['id','candidatura_id','cargo','empresa','estado_anterior','estado_novo','data','nota'],rows.results||[],'leo-jobs-historico.csv')
  }
  if(u.pathname==='/api/saved'&&req.method==='POST'){
   const body=await req.json() as any;if(!body.job_id)return out({error:'job_id obrigatório'},400);
   if(body.saved){await env.DB.prepare('INSERT OR IGNORE INTO saved_jobs(job_id,saved_at) VALUES(?,?)').bind(String(body.job_id),new Date().toISOString()).run();}
   else await env.DB.prepare('DELETE FROM saved_jobs WHERE job_id=?').bind(String(body.job_id)).run();
   return out({ok:true,saved:!!body.saved});
  }
  if(u.pathname==='/api/applications'&&req.method==='GET'){
   const r=await env.DB.prepare("SELECT a.*,j.title,j.company,j.location,j.url,j.source,j.posted_at FROM applications a JOIN jobs j ON j.id=a.job_id ORDER BY a.updated_at DESC").all();
   return out({applications:r.results||[]});
  }
  if(u.pathname==='/api/applications'&&req.method==='POST'){
   const b=await req.json() as any;if(!b.job_id)return out({error:'job_id obrigatório'},400);
   const exists=await env.DB.prepare('SELECT id FROM jobs WHERE id=?').bind(String(b.job_id)).first();if(!exists)return out({error:'Vaga não encontrada'},404);
   const now=new Date().toISOString(),id=crypto.randomUUID(),status=String(b.status||'interested');
   const allowed=['interested','preparing','draft_ready','applied','confirmation','analyzing','interview','test','rejected','offer','withdrawn','closed'];
   if(!allowed.includes(status))return out({error:'Estado inválido'},400);
   await env.DB.prepare('INSERT INTO applications(id,job_id,status,method,updated_at,notes,cover_letter,cv_version,created_at,followup_at,next_action) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(job_id) DO UPDATE SET status=excluded.status,method=excluded.method,updated_at=excluded.updated_at,notes=excluded.notes,cover_letter=excluded.cover_letter,followup_at=excluded.followup_at,next_action=excluded.next_action').bind(id,String(b.job_id),status,String(b.method||'unknown'),now,String(b.notes||''),String(b.cover_letter||''),String(b.cv_version||''),now,String(b.followup_at||''),String(b.next_action||'')).run();
   const app=await env.DB.prepare('SELECT * FROM applications WHERE job_id=?').bind(String(b.job_id)).first();
   await env.DB.prepare('INSERT INTO application_events(application_id,new_status,changed_at,note) VALUES(?,?,?,?)').bind(app.id,status,now,'Registo inicial').run();
   return out({application:app},201);
  }
  if(u.pathname.startsWith('/api/applications/')&&req.method==='PATCH'){
   const id=decodeURIComponent(u.pathname.split('/').pop()||''),b=await req.json() as any;
   const current=await env.DB.prepare('SELECT * FROM applications WHERE id=?').bind(id).first();if(!current)return out({error:'Candidatura não encontrada'},404);
   const allowed=['interested','preparing','draft_ready','applied','confirmation','interview','test','rejected','offer','withdrawn'],status=String(b.status||current.status);
   if(!allowed.includes(status))return out({error:'Estado inválido'},400);
   const now=new Date().toISOString();
   await env.DB.prepare('UPDATE applications SET status=?,updated_at=?,applied_at=CASE WHEN ? IN (\'applied\',\'confirmation\',\'interview\',\'test\',\'rejected\',\'offer\') THEN COALESCE(applied_at,?) ELSE applied_at END,notes=COALESCE(?,notes),cover_letter=COALESCE(?,cover_letter),followup_at=COALESCE(?,followup_at),next_action=COALESCE(?,next_action) WHERE id=?').bind(status,now,status,now,b.notes??null,b.cover_letter??null,b.followup_at??null,b.next_action??null,id).run();
   if(status!==current.status)await env.DB.prepare('INSERT INTO application_events(application_id,old_status,new_status,changed_at,note) VALUES(?,?,?,?,?)').bind(id,current.status,status,now,String(b.note||'')).run();
   return out({application:await env.DB.prepare('SELECT * FROM applications WHERE id=?').bind(id).first()});
  }
  if(u.pathname==='/api/stats'&&req.method==='GET'){
   const totals=await env.DB.prepare('SELECT COUNT(*) total, SUM(CASE WHEN status IN (\'applied\',\'confirmation\',\'interview\',\'test\',\'rejected\',\'offer\') THEN 1 ELSE 0 END) submitted, SUM(CASE WHEN status IN (\'confirmation\',\'interview\',\'test\',\'offer\') THEN 1 ELSE 0 END) responses, SUM(CASE WHEN status=\'interview\' THEN 1 ELSE 0 END) interviews, SUM(CASE WHEN status=\'rejected\' THEN 1 ELSE 0 END) rejected, SUM(CASE WHEN status=\'offer\' THEN 1 ELSE 0 END) offers, SUM(CASE WHEN status IN (\'interested\',\'preparing\',\'draft_ready\',\'applied\',\'confirmation\') THEN 1 ELSE 0 END) pending FROM applications').first();
   const monthly=await env.DB.prepare("SELECT substr(created_at,1,7) month,COUNT(*) total FROM applications GROUP BY substr(created_at,1,7) ORDER BY month DESC LIMIT 12").all();
   return out({totals:totals||{},monthly:monthly.results||[]});
  }
  if(u.pathname==='/api/sync'&&req.method==='POST'){const recent=await env.DB.prepare("SELECT ran_at FROM sync_runs ORDER BY id DESC LIMIT 1").first();if(recent?.ran_at&&Date.now()-new Date(recent.ran_at).getTime()<10*60000)return out({error:'A sincronização foi executada há menos de 10 minutos.'},429);return out(await sync(env))}
  return env.ASSETS.fetch(req)
 },
 async scheduled(_c:any,env:Env,ctx:any){ctx.waitUntil(sync(env))}
}
