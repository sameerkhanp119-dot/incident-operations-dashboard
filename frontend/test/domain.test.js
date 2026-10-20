import test from 'node:test';
import assert from 'node:assert/strict';
import {seedIncidents,queryIncidents,transition,summarize} from '../src/domain.js';
test('combined search and pagination preserve total and stable order',()=>{
  const rows=seedIncidents(1700000000000);
  assert.equal(queryIncidents(rows,{q:'  PAYMENT  '}).total,1);
  const a=queryIncidents(rows,{size:5}),b=queryIncidents(rows,{page:1,size:5});
  assert.equal(a.total,12); assert.equal(new Set([...a.items,...b.items].map(i=>i.id)).size,10);
  assert.equal(queryIncidents(rows,{severity:'HIGH',status:'OPEN'}).total,2);
  assert.equal(queryIncidents(rows,{q:'no such incident'}).total,0);
});
test('transition records audit without mutating original',()=>{
  const current=seedIncidents()[1]; const changed=transition(current,{status:'INVESTIGATING',version:0,note:' Checking '},'operator');
  assert.equal(changed.version,1); assert.equal(changed.history[0].note,'Checking'); assert.equal(current.status,'OPEN');
});
test('authorization, stale versions and invalid transitions are rejected',()=>{
  const row=seedIncidents()[1], change={status:'INVESTIGATING',version:0,note:'Checking'};
  assert.throws(()=>transition(row,change,'viewer'),/read-only/);
  assert.throws(()=>transition(row,{...change,version:2},'operator'),/changed/);
  assert.throws(()=>transition(row,{...change,status:'RESOLVED'},'operator'),/next/);
  assert.throws(()=>transition(row,{...change,note:' '},'operator'),/note/);
});
test('summary counts active critical incidents and resolved incidents separately',()=>{
  assert.deepEqual(summarize(seedIncidents()),{active:10,critical:1,monitoring:3,resolved:2});
});
