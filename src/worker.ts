type Env={DB:any;ASSETS:{fetch:(r:Request)=>Promise<Response>};JOB_BOARDS?:string}
type Board={provider:'greenhouse'|'lever'|'ashby'|'smartrecruiters'|'workable';slug:string;company:string}
const out=(x:unknown,status=200)=>new Response(JSON.stringify(x),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})
const boards=(s?:string):Board[]=>{try{return s?JSON.parse(s):[]}catch{return[]}}
const clean=(s:string)=>String(s||'').replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim()
async function json(url:string){const r=await fetch(url,{headers:{accept:'application/json','user-agent':'LeoJobs/1.0'}});if(!r.ok)throw Error('HTTP '+r.status+' '+url);return r.json() as Promise<any>}
async function upsert(env:Env,j:any){await env.DB.prepare('INSERT INTO jobs(id,source,source_id,title,company,location,work_mode,salary,description,url,posted_at,apply_url,language,first_seen,last_seen,is_open) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET title=excluded.title,location=excluded.location,work_mode=excluded.work_mode,salary=excluded.salary,description=excluded.description,url=excluded.url,posted_at=excluded.posted_at,apply_url=excluded.apply_url,language=excluded.language,last_seen=excluded.last_seen,is_open=1').bind(j.id,j.source,j.source_id,j.title,j.company,j.location,j.work_mode,j.salary,j.description,j.url,j.posted_at,j.apply_url,j.language,j.first_seen,j.last_seen).run()}
async function fetchBoard(b:Board){let rows:any[]=[];const slug=encodeURIComponent(b.slug)
 if(b.provider==='greenhouse')rows=(await json('https://boards-api.greenhouse.io/v1/boards/'+slug+'/jobs?content=true')).jobs||[]
 if(b.provider==='lever')rows=await json('https://api.lever.co/v0/postings/'+slug+'?mode=json')
 if(b.provider==='ashby')rows=(await json('https://api.ashbyhq.com/posting-api/job-board/'+slug+'?includeCompensation=true')).jobs||[]
 if(b.provider==='smartrecruiters')rows=(await json('https://api.smartrecruiters.com/v1/companies/'+slug+'/postings?limit=100&offset=0')).content||[]
 if(b.provider==='workable')rows=(await json('https://apply.workable.com/api/v1/widget/accounts/'+slug+'?details=true')).jobs||[]
 const now=new Date().toISOString()
 return rows.map((r:any)=>{const id=String(r.id||r.requisitionId||r.hostedUrl||r.url||'');const url=r.absolute_url||r.hostedUrl||r.applyUrl||r.url||r.jobUrl||'';const published=r.first_published||r.createdAt||r.created_at||r.updated_at||r.publishedAt||null;const salary=r.compensationTierSummary||r.compensation||r.salary||'';return{id:b.provider+':'+b.slug+':'+id,source:b.provider+':'+b.slug,source_id:id,title:r.title||r.name||r.jobTitle||'',company:b.company,location:typeof r.location==='string'?r.location:r.location?.name||r.location?.city||r.categories?.location||'',work_mode:r.workplaceType||r.workplace_type||'Não indicado',salary:typeof salary==='string'?salary:JSON.stringify(salary||''),description:clean(r.content||r.descriptionPlain||r.description||r.jobDescription||''),url,posted_at:published?new Date(published).toISOString():null,apply_url:url,language:r.language||'',first_seen:now,last_seen:now}}).filter((j:any)=>j.title&&j.url)
}
async function feedDue(env:Env,source:string,minutes:number){const row=await env.DB.prepare('SELECT last_run FROM source_sync WHERE source=?').bind(source).first();return !row?.last_run||Date.now()-new Date(row.last_run).getTime()>=minutes*60000}
async function markFeed(env:Env,source:string){await env.DB.prepare('INSERT INTO source_sync(source,last_run) VALUES(?,?) ON CONFLICT(source) DO UPDATE SET last_run=excluded.last_run').bind(source,new Date().toISOString()).run()}
async function sync(env:Env){
 const errors:string[]=[];let saved=0;const configured=boards(env.JOB_BOARDS)
 for(const b of configured){try{for(const j of await fetchBoard(b)){await upsert(env,j);saved++}}catch(e){errors.push(b.company+': '+String(e))}}
 if(await feedDue(env,'jobicy',60)){try{const d=await json('https://jobicy.com/api/jobs?count=200&geo=europe');for(const r of d.jobs||[]){const id=String(r.id);const url=r.url||r.jobUrl||'';const now=new Date().toISOString();const date=r.pubDate||r.publishedAt||r.date||null;const salary=[r.salaryMin,r.salaryMax,r.salaryCurrency].filter(Boolean).join(' ');await upsert(env,{id:'jobicy:'+id,source:'Jobicy',source_id:id,title:r.jobTitle||r.title||'',company:r.companyName||r.company||'',location:r.jobGeo||r.location||'Remote · Europe',work_mode:r.jobType||'Remoto',salary:salary||'Não divulgado',description:clean(r.jobDescription||r.description||''),url,posted_at:date?new Date(date).toISOString():null,apply_url:url,language:'',first_seen:now,last_seen:now});saved++}await markFeed(env,'jobicy')}catch(e){errors.push('Jobicy: '+String(e))}}
 if(await feedDue(env,'remotive',360)){try{const d=await json('https://remotive.com/api/remote-jobs?limit=500');for(const r of d.jobs||[]){const id=String(r.id);const url=r.url||'';const now=new Date().toISOString();await upsert(env,{id:'remotive:'+id,source:'Remotive',source_id:id,title:r.title||'',company:r.company_name||'',location:r.candidate_required_location||'Remote',work_mode:'Remoto',salary:r.salary||'Não divulgado',description:clean(r.description||''),url,posted_at:r.publication_date?new Date(r.publication_date).toISOString():null,apply_url:url,language:'',first_seen:now,last_seen:now});saved++}await markFeed(env,'remotive')}catch(e){errors.push('Remotive: '+String(e))}}
 await env.DB.prepare('INSERT INTO sync_runs(ran_at,source_count,job_count,error_count,errors) VALUES(?,?,?,?,?)').bind(new Date().toISOString(),configured.length+2,saved,errors.length,errors.join('\n').slice(0,4000)).run()
 return{ok:errors.length===0,companyBoards:configured.length,publicFeeds:['Jobicy (máx. 1/h)','Remotive (máx. 4/dia)'],upserted:saved,errors}
}
export default{
 async fetch(req:Request,env:Env){const u=new URL(req.url)
  if(u.pathname==='/api/health')return out({ok:true,configuredCompanyBoards:boards(env.JOB_BOARDS).length,publicFeeds:['Jobicy','Remotive']})
  if(u.pathname==='/api/jobs'&&req.method==='GET'){const q=(u.searchParams.get('q')||'').trim(),days=Math.min(365,Math.max(1,Number(u.searchParams.get('days')||15)));const r=await env.DB.prepare("SELECT * FROM jobs WHERE is_open=1 AND datetime(COALESCE(posted_at,first_seen))>=datetime('now',?) AND (?='' OR lower(title||' '||company||' '||location||' '||description) LIKE '%'||lower(?)||'%') ORDER BY COALESCE(posted_at,first_seen) DESC LIMIT 1000").bind('-'+days+' days',q,q).all();const last=await env.DB.prepare('SELECT ran_at,job_count,error_count FROM sync_runs ORDER BY id DESC LIMIT 1').first();return out({jobs:r.results||[],lastSync:last||null})}
  if(u.pathname==='/api/sync'&&req.method==='POST')return out(await sync(env))
  return env.ASSETS.fetch(req)
 },
 async scheduled(_c:any,env:Env,ctx:any){ctx.waitUntil(sync(env))}
}
