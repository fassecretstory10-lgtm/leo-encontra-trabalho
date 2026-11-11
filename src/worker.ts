type Env = { DB:any; ASSETS:{fetch:(request:Request)=>Promise<Response>}; JOB_BOARDS?:string }
type Board={provider:'greenhouse'|'lever'|'ashby'|'smartrecruiters'|'workable';slug:string;company:string}
const response=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store'}})
const boards=(s?:string):Board[]=>{try{return s?JSON.parse(s):[]}catch{return[]}}
const clean=(s:string)=>s.replace(/<[^>]*>/g,' ').replace(/&amp;/g,'&').replace(/&nbsp;/g,' ').replace(/\s+/g,' ').trim()
async function fetchBoard(b:Board){
 const base=encodeURIComponent(b.slug);let list:any[]=[]
 if(b.provider==='greenhouse'){const x=await fetch('https://boards-api.greenhouse.io/v1/boards/'+base+'/jobs?content=true');if(!x.ok)throw Error('Greenhouse '+x.status);list=(await x.json() as any).jobs||[]}
 if(b.provider==='lever'){const x=await fetch('https://api.lever.co/v0/postings/'+base+'?mode=json');if(!x.ok)throw Error('Lever '+x.status);list=await x.json() as any[]}
 if(b.provider==='ashby'){const x=await fetch('https://api.ashbyhq.com/posting-api/job-board/'+base+'?includeCompensation=true');if(!x.ok)throw Error('Ashby '+x.status);list=(await x.json() as any).jobs||[]}
 if(b.provider==='smartrecruiters'){const x=await fetch('https://api.smartrecruiters.com/v1/companies/'+base+'/postings?limit=100&offset=0');if(!x.ok)throw Error('SmartRecruiters '+x.status);list=(await x.json() as any).content||[]}
 if(b.provider==='workable'){const x=await fetch('https://apply.workable.com/api/v1/widget/accounts/'+base+'?details=true');if(!x.ok)throw Error('Workable '+x.status);list=(await x.json() as any).jobs||[]}
 const now=new Date().toISOString()
 return list.map((j:any)=>{
  const id=String(j.id||j.requisitionId||j.hostedUrl||j.url||'')
  const title=j.title||j.name||j.jobTitle||''
  const location=typeof j.location==='string'?j.location:j.location?.name||j.location?.city||j.categories?.location||''
  const description=clean(j.content||j.descriptionPlain||j.description||j.jobDescription||'')
  const url=j.absolute_url||j.hostedUrl||j.applyUrl||j.url||j.jobUrl||''
  const published=j.first_published||j.createdAt||j.created_at||j.updated_at||j.publishedAt||null
  const salary=j.compensationTierSummary||j.compensation||j.salary||''
  return{id:b.provider+':'+b.slug+':'+id,source:b.provider+':'+b.slug,source_id:id,title,company:b.company,location,work_mode:j.workplaceType||j.workplace_type||'Não indicado',salary:typeof salary==='string'?salary:JSON.stringify(salary||''),description,url,posted_at:published?new Date(published).toISOString():null,apply_url:url,language:j.language||'',first_seen:now,last_seen:now}
 }).filter((j:any)=>j.title&&j.url)
}
async function sync(env:Env){
 const list=boards(env.JOB_BOARDS),errors:string[]=[];let saved=0
 for(const b of list){try{const jobs=await fetchBoard(b);for(const j of jobs){await env.DB.prepare('INSERT INTO jobs (id,source,source_id,title,company,location,work_mode,salary,description,url,posted_at,apply_url,language,first_seen,last_seen,is_open) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1) ON CONFLICT(id) DO UPDATE SET title=excluded.title,location=excluded.location,work_mode=excluded.work_mode,salary=excluded.salary,description=excluded.description,url=excluded.url,posted_at=excluded.posted_at,apply_url=excluded.apply_url,language=excluded.language,last_seen=excluded.last_seen,is_open=1').bind(j.id,j.source,j.source_id,j.title,j.company,j.location,j.work_mode,j.salary,j.description,j.url,j.posted_at,j.apply_url,j.language,j.first_seen,j.last_seen).run();saved++}}catch(e){errors.push(b.company+': '+String(e))}}
 await env.DB.prepare('INSERT INTO sync_runs(ran_at,source_count,job_count,error_count,errors) VALUES(?,?,?,?,?)').bind(new Date().toISOString(),list.length,saved,errors.length,errors.join('\n').slice(0,4000)).run()
 return{ok:errors.length===0,boards:list.length,upserted:saved,errors}
}
export default{
 async fetch(req:Request,env:Env){
  const u=new URL(req.url)
  if(u.pathname==='/api/health')return response({ok:true,configuredBoards:boards(env.JOB_BOARDS).length})
  if(u.pathname==='/api/jobs'&&req.method==='GET'){const q=(u.searchParams.get('q')||'').trim(),days=Math.min(365,Math.max(1,Number(u.searchParams.get('days')||15)));const r=await env.DB.prepare("SELECT * FROM jobs WHERE is_open=1 AND datetime(first_seen)>=datetime('now',?) AND (?='' OR lower(title||' '||company||' '||location||' '||description) LIKE '%'||lower(?)||'%') ORDER BY COALESCE(posted_at,first_seen) DESC LIMIT 1000").bind('-'+days+' days',q,q).all();return response({jobs:r.results||[]})}
  if(u.pathname==='/api/sync'&&req.method==='POST')return response(await sync(env))
  if(env.ASSETS)return env.ASSETS.fetch(req)\n  return response({error:'Not found'},404)
 },
 async scheduled(_c:any,env:Env,ctx:any){ctx.waitUntil(sync(env))}
}
