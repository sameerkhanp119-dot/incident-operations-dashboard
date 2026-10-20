import React, {useEffect, useRef, useState} from 'react';
import {createRoot} from 'react-dom/client';
import {seedIncidents, queryIncidents, transition, summarize, states, label} from './domain.js';
import './style.css';

const repo='https://github.com/sameerkhanp119-dot/incident-operations-dashboard';
const age=iso=>{const m=Math.max(1,Math.floor((Date.now()-Date.parse(iso))/60000));return m<60?`${m}m ago`:`${Math.floor(m/60)}h ago`;};
function App(){
  const [rows,setRows]=useState(seedIncidents),[role,setRole]=useState('operator'),[mode,setMode]=useState('demo');
  const [q,setQ]=useState(''),[status,setStatus]=useState(''),[severity,setSeverity]=useState(''),[page,setPage]=useState(0);
  const [result,setResult]=useState({items:[],total:0}),[summary,setSummary]=useState(summarize(rows));
  const [selected,setSelected]=useState(null),[note,setNote]=useState(''),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [loading,setLoading]=useState(false),[saving,setSaving]=useState(false),[login,setLogin]=useState(false);
  const [username,setUsername]=useState('operator'),[password,setPassword]=useState(''),[session,setSession]=useState(null);
  const dialog=useRef(null),lastTrigger=useRef(null),requestId=useRef(0),auth=useRef('');
  async function request(path,options={}){
    const response=await fetch(`/api${path}`,{...options,headers:{Authorization:auth.current,...(session?{[session.csrfHeader]:session.csrfToken}:{}),...options.headers}});
    if(!response.ok)throw new Error(response.status===409?'This incident changed. Close and reopen it before retrying.':response.status===401?'Sign-in failed. Check your local API credentials.':`API request failed (${response.status}).`);
    return response.json();
  }
  useEffect(()=>{
    const id=++requestId.current;setError('');
    if(mode==='demo'){setResult(queryIncidents(rows,{q,status,severity,page}));setSummary(summarize(rows));setLoading(false);return;}
    const controller=new AbortController();setLoading(true);
    const params=new URLSearchParams({q,page:String(page),size:'5'});if(status)params.set('status',status);if(severity)params.set('severity',severity);
    Promise.all([request(`/incidents?${params}`,{signal:controller.signal}),request('/summary',{signal:controller.signal})])
      .then(([r,s])=>{if(requestId.current===id){setResult(r);setSummary(s);}})
      .catch(e=>{if(e.name!=='AbortError' && requestId.current===id)setError(e.message);})
      .finally(()=>{if(requestId.current===id)setLoading(false);});
    return()=>controller.abort();
  },[q,status,severity,page,rows,mode,session]);
  useEffect(()=>{if(selected && dialog.current){dialog.current.showModal();}},[selected?.id]);
  function filter(set,value){set(value);setPage(0);}
  async function open(incident,event){
    lastTrigger.current=event.currentTarget;setNote('');setError('');
    try{setSelected(mode==='demo'?incident:await request(`/incidents/${incident.id}`));}catch(e){setError(e.message);}
  }
  function close(){dialog.current?.close();setSelected(null);setNote('');lastTrigger.current?.focus();}
  async function save(e){
    e.preventDefault();setSaving(true);setError('');
    const change={status:states[states.indexOf(selected.status)+1],version:selected.version,note};
    try{
      const updated=mode==='demo'?transition(selected,change,role):await request(`/incidents/${selected.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(change)});
      setRows(current=>current.map(i=>i.id===updated.id?updated:i));setSelected(updated);setNote('');setNotice(`${updated.id} moved to ${label(updated.status)}.`);
    }catch(e){setError(e.message);}finally{setSaving(false);}
  }
  async function connect(e){
    e.preventDefault();setError('');setLoading(true);auth.current=`Basic ${btoa(`${username}:${password}`)}`;
    try{const s=await request('/session');setSession(s);setRole(s.operator?'operator':'viewer');setMode('api');setLogin(false);setPage(0);setNotice(`Connected as ${s.user}.`);}
    catch(e){auth.current='';setError(e.message);}finally{setLoading(false);setPassword('');}
  }
  function reset(){auth.current='';setSession(null);setMode('demo');setRows(seedIncidents());setPage(0);setNotice('Demo data reset.');setError('');}
  const next=selected?states[states.indexOf(selected.status)+1]:null;
  return <div className="shell">
    <aside className="sidebar"><a className="brand" href="#main"><span className="brand-mark">s.</span>signal desk<span className="edition">OPERATIONS</span></a>
      <div className="workspace"><span className="workspace-icon">S</span><div>Sandbox workspace<small>Portfolio environment</small></div></div>
      <div className="nav-caption">WORKSPACE</div><a className="nav-item active" href="#main"><span>▦</span>Incident queue<span className="nav-count">{summary.active}</span></a>
      <a className="nav-item" href={`${repo}/blob/main/docs/architecture.md`} target="_blank" rel="noreferrer"><span>◇</span>Architecture ↗</a>
      <a className="nav-item" href={`${repo}/actions`} target="_blank" rel="noreferrer"><span>✓</span>Tests &amp; builds ↗</a>
      <div className="sidebar-bottom"><div className="demo-indicator"><i/> {mode==='demo'?'Browser demo':'Local API connected'}</div><p>Synthetic incidents.<br/>Real engineering decisions.</p><a href="https://sameerkhanpathan.com">← Sameer’s portfolio</a></div>
    </aside>
    <main id="main" className="main"><header className="topbar"><span>Workspace <b>/</b> Operations</span><div className="identity"><span className="avatar">SK</span><div>Sameer Khan Pathan<small>Engineering portfolio</small></div></div></header>
      <div className="content"><div className="environment"><span className="env-label">{mode==='demo'?'INTERACTIVE DEMO':'LOCAL SPRING BOOT API'}</span><span>{mode==='demo'?'In-memory simulation · resets on reload':'Authenticated API · in-memory server store'}</span><button onClick={reset}>Reset demo ↻</button></div>
      <div className="page-heading"><div><div className="eyebrow">RELIABILITY WORKBENCH</div><h1>Keep the signal.<br className="mobile-break"/> Resolve the noise.</h1><p>A clear view of what needs attention, who owns it, and what happens next.</p></div><button className="secondary" onClick={()=>{setLogin(!login);setError('');}}>{mode==='api'?'API connection':'Connect local API'} <span>↗</span></button></div>
      {login && <form className="connection" onSubmit={connect}><div><h2>Connect to your local backend</h2><p>Start Spring Boot and Vite locally. This public preview has no hosted API.</p></div><label>User<select value={username} onChange={e=>setUsername(e.target.value)}><option>operator</option><option>viewer</option></select></label><label>Password<input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/></label><button className="primary" disabled={loading}>Connect</button></form>}
      <div className="metrics"><Metric title="Active incidents" value={summary.active} detail="Across all services"/><Metric title="Critical priority" value={summary.critical} detail="Needs immediate attention" tone="critical"/><Metric title="In monitoring" value={summary.monitoring} detail="Watching the recovery"/><Metric title="Resolved" value={summary.resolved} detail="In this sample dataset"/></div>
      <div className="queue"><div className="queue-heading"><div><h2>Incident queue <span>{result.total}</span></h2><p>Prioritize, investigate and track recovery.</p></div><label className="role-control">{mode==='demo'?'Demo role':'API role'}<select value={role} disabled={mode==='api'} onChange={e=>{setRole(e.target.value);setNotice(`Demo role: ${e.target.value}`);}}><option value="operator">Operator</option><option value="viewer">Viewer · read only</option></select></label></div>
        <div className="filters"><label className="search"><span aria-hidden="true">⌕</span><input type="search" placeholder="Search incidents, services, owners…" aria-label="Search incidents" value={q} onChange={e=>filter(setQ,e.target.value)}/></label><label className="filter-label">Status<select value={status} onChange={e=>filter(setStatus,e.target.value)}><option value="">All statuses</option>{states.map(s=><option key={s} value={s}>{label(s)}</option>)}</select></label><label className="filter-label">Priority<select value={severity} onChange={e=>filter(setSeverity,e.target.value)}><option value="">All priorities</option>{['CRITICAL','HIGH','MEDIUM','LOW'].map(s=><option key={s} value={s}>{label(s)}</option>)}</select></label></div>
        <div role="status" className="sr-only">{loading?'Loading incidents':`${result.total} matching incidents`}. {notice}</div>
        {error && <div className="error" role="alert">{error}</div>}
        <div className="table-wrap" aria-busy={loading}><table><caption className="sr-only">Incidents with priority, status, owner and creation time</caption><thead><tr><th scope="col">Incident / service</th><th scope="col">Priority</th><th scope="col">Status</th><th scope="col">Owner</th><th scope="col">Opened</th></tr></thead><tbody>{!loading && result.items.map(i=><tr key={i.id}><td><button className="incident-link" onClick={e=>open(i,e)}><span className="incident-id">{i.id}</span><strong>{i.title}</strong></button><span className="service">{i.service}</span></td><td><span className={`priority ${i.severity.toLowerCase()}`}><i/>{label(i.severity)}</span></td><td><span className={`status ${i.status.toLowerCase()}`}><i/>{label(i.status)}</span></td><td><div className="owner"><span>{i.owner.split(' ').map(s=>s[0]).join('')}</span>{i.owner}</div></td><td className="opened">{age(i.createdAt)}</td></tr>)}</tbody></table>{loading && <div className="empty">Loading incidents…</div>}{!loading && !result.items.length && <div className="empty"><h3>No incidents match these filters.</h3><p>Try a different search or clear the filters.</p><button className="secondary" onClick={()=>{setQ('');setStatus('');setSeverity('');setPage(0);}}>Clear filters</button></div>}</div>
        <div className="pagination"><span>{result.total?`${page*5+1}–${Math.min((page+1)*5,result.total)} of ${result.total}`:'0 incidents'}</span><div><button className="secondary" disabled={page===0 || loading} onClick={()=>setPage(p=>p-1)}>← Previous</button><span>Page {page+1}</span><button className="secondary" disabled={(page+1)*5>=result.total || loading} onClick={()=>setPage(p=>p+1)}>Next →</button></div></div>
      </div>
      <div className="principles"><span className="principle-icon">↳</span><div><h3>Every change leaves a trail.</h3><p>Open an incident to move it through investigation, monitoring and resolution. Version checks reject stale updates; operator actions add an audit entry.</p></div><a href={`${repo}/blob/main/docs/architecture.md`} target="_blank" rel="noreferrer">Explore the design ↗</a></div>
      <footer><span>Designed &amp; built by <a href="https://sameerkhanpathan.com">Sameer Khan Pathan</a></span><a href={repo}>View source ↗</a><span>React · Spring Boot · Java 17</span></footer></div>
    </main>
    <dialog ref={dialog} onCancel={e=>{e.preventDefault();close();}} aria-labelledby="incident-title">{selected && <><div className="dialog-top"><span className="incident-id">{selected.id} / VERSION {selected.version}</span><button className="close" onClick={close} aria-label="Close incident">×</button></div><h2 id="incident-title">{selected.title}</h2><p>{selected.service} · {selected.owner}</p><div className="dialog-tags"><span className={`priority ${selected.severity.toLowerCase()}`}><i/>{label(selected.severity)}</span><span className={`status ${selected.status.toLowerCase()}`}>{label(selected.status)}</span></div>
      <ol className="lifecycle">{states.map(s=><li className={states.indexOf(s)<=states.indexOf(selected.status)?'complete':''} key={s}>{label(s)}</li>)}</ol>
      {role==='viewer'?<div className="readonly">Viewer access is read-only. {mode==='demo'?'Close this panel and choose Operator to try a status update.':''}</div>:next?<form onSubmit={save}><label className="note-label" htmlFor="note">Investigation note <span>Required</span></label><textarea id="note" value={note} onChange={e=>setNote(e.target.value)} placeholder="What changed? What did you verify?" maxLength={500} required rows={3}/><div className="form-bottom"><span>{note.length}/500</span><button className="primary" disabled={saving || !note.trim()}>Move to {label(next)} →</button></div></form>:<div className="readonly">This incident is resolved. Its audit history remains available below.</div>}
      {error && <div className="error" role="alert">{error}</div>}<h3 className="audit-heading">Activity history <span>{selected.history.length}</span></h3>{selected.history.length?<ol className="audit">{selected.history.toReversed().map((a,i)=><li key={i}><strong>{label(a.from)} → {label(a.to)}</strong><p>{a.note}</p><small>{a.actor} · {new Date(a.at).toLocaleTimeString()}</small></li>)}</ol>:<p className="muted">No status changes recorded in this session.</p>}</>}</dialog>
  </div>;
}
function Metric({title,value,detail,tone=''}){return <article className={`metric ${tone}`}><span>{title}</span><strong>{String(value).padStart(2,'0')}</strong><small>{detail}</small></article>;}
createRoot(document.getElementById('root')).render(<App/>);
