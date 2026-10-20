export const states = ['OPEN', 'INVESTIGATING', 'MONITORING', 'RESOLVED'];
export const label = value => value.toLowerCase().replaceAll('_', ' ').replace(/^./, c => c.toUpperCase());
const seeds = [
  ['Checkout latency above threshold','Checkout API','CRITICAL','INVESTIGATING','Maya Chen'],
  ['Payment webhook retry backlog','Payments','HIGH','OPEN','Alex Rivera'],
  ['Catalog index refresh delayed','Search','MEDIUM','MONITORING','Sam Taylor'],
  ['Elevated order consumer lag','Order stream','HIGH','INVESTIGATING','Jordan Lee'],
  ['Token refresh error spike','Identity','HIGH','OPEN','Maya Chen'],
  ['Export job exceeded time budget','Analytics','LOW','OPEN','Alex Rivera'],
  ['Inventory cache miss increase','Inventory','MEDIUM','MONITORING','Sam Taylor'],
  ['Notification provider recovery','Notifications','LOW','RESOLVED','Jordan Lee'],
  ['Search response regression','Search','MEDIUM','OPEN','Sam Taylor'],
  ['Order reconciliation mismatch','Orders','HIGH','MONITORING','Alex Rivera'],
  ['Delayed reporting snapshot','Analytics','LOW','RESOLVED','Maya Chen'],
  ['Inventory sync retry burst','Inventory','MEDIUM','OPEN','Jordan Lee']
];
export function seedIncidents(now = Date.now()) {
  return seeds.map((s,i) => ({id:`INC-${1042-i}`,title:s[0],service:s[1],severity:s[2],status:s[3],owner:s[4],
    createdAt:new Date(now-720000-i*1440000).toISOString(),version:0,history:[]}));
}
export function queryIncidents(rows, {q='',status='',severity='',page=0,size=5}={}) {
  if (!Number.isInteger(page) || page<0 || !Number.isInteger(size) || size<1 || size>50) throw new Error('Invalid pagination');
  const query=q.trim().toLowerCase();
  const filtered=rows.filter(i=>(!status || i.status===status) && (!severity || i.severity===severity) &&
    `${i.id} ${i.title} ${i.service} ${i.owner}`.toLowerCase().includes(query))
    .sort((a,b)=> b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id));
  return {items:filtered.slice(page*size,(page+1)*size),total:filtered.length,page,size};
}
export function transition(current, {status,version,note}, role, now=new Date().toISOString()) {
  if (role!=='operator') throw new Error('Viewer access is read-only');
  if (current.version!==version) throw new Error('Incident changed; refresh before retrying');
  if (current.status==='RESOLVED' || states[states.indexOf(current.status)+1]!==status) throw new Error('Only the next lifecycle state is allowed');
  if (!note?.trim() || note.length>500) throw new Error('A note of 1–500 characters is required');
  return {...current,status,version:version+1,history:[...current.history,{actor:'demo.operator',from:current.status,to:status,note:note.trim(),at:now}]};
}
export function summarize(rows) {
  return {active:rows.filter(i=>i.status!=='RESOLVED').length,
    critical:rows.filter(i=>i.status!=='RESOLVED' && i.severity==='CRITICAL').length,
    monitoring:rows.filter(i=>i.status==='MONITORING').length,resolved:rows.filter(i=>i.status==='RESOLVED').length};
}
