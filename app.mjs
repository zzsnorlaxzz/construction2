import {TASKS,execute,validatePlan} from './engine.mjs';
const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg';
const names={line:'직선 그리기',point:'시작점 잡기',measure:'컴퍼스로 재기',given_arc:'주어진 각에 기준 호 그리기',circle:'원 그리기',intersect:'교점 정하기',ray:'반직선 그리기',segment:'두 점 잇기',question:'확인 질문'};
let key='sas',plan=null,result=null,index=-1,timer=null,controller=null,serial=0,code='',record={};
const memory={},storageKey=k=>'construction2-gemini-v1:'+k;
function persist(){memory[key]=record;try{localStorage.setItem(storageKey(key),JSON.stringify(record));$('saved').textContent='이 기기에 저장됨';}catch{$('saved').textContent='이 화면에 임시 보관';$('storage-note').firstChild.textContent='브라우저 저장을 사용할 수 없습니다. 활동 기록을 내려받아 보관하세요. ';}}
function read(k){try{return JSON.parse(localStorage.getItem(storageKey(k)))||{};}catch{return memory[k]||{};}}
function pause(){if(timer)clearInterval(timer);timer=null;$('play').textContent=index<0?'해석 확인 후 연속 실행':'연속 실행';}
function invalidate(){pause();controller?.abort();controller=null;serial++;plan=null;result=null;index=-1;setButtons();$('summary').textContent='내 설명을 해석한 뒤 중심·반지름·순서를 확인하세요.';$('model').textContent='';$('plan').replaceChildren();const li=document.createElement('li');li.className='placeholder';li.textContent='아직 해석한 명령이 없습니다.';$('plan').append(li);draw();status('작도 명령을 입력한 뒤 Gemini로 해석해 보세요.');$('analyze').disabled=false;$('analyze').textContent='Gemini로 내 설명 해석하기 ↗';}
function status(message,type=''){ $('result').textContent=message;$('result').dataset.type=type;}
function setButtons(){for(const id of ['step','play','reset'])$(id).disabled=!result;}
function chooseTask(){key=$('task').value;record=read(key);$('prompt').value=record.prompt||'';$('evidence').value=record.evidence||'';$('revision').value=record.revision||'';const t=TASKS[key];$('task-title').textContent=t.title;$('rule').textContent=t.rule;$('conditions').textContent=t.description;$('question').textContent=t.question;$('count').textContent=$('prompt').value.length+' / 6000';invalidate();givens();history();}
for(const [k,t] of Object.entries(TASKS)){const o=document.createElement('option');o.value=k;o.textContent=t.title;$('task').append(o);}$('task').value=key;$('task').onchange=chooseTask;
for(const id of ['prompt','evidence','revision'])$(id).addEventListener('input',()=>{record[id]=$(id).value;if(id==='prompt'){invalidate();$('count').textContent=$('prompt').value.length+' / 6000';}persist();});
function shape(tag,attrs,parent,text){const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);if(text!==undefined)e.textContent=text;parent.append(e);return e;}
function givens(){
  $('givens').replaceChildren();const t=TASKS[key];
  for(const [label,value] of Object.entries(t.lengths)){const div=document.createElement('div');div.className='given';const svg=shape('svg',{viewBox:'0 0 180 70'},div);const len=20*value;shape('line',{x1:(180-len)/2,y1:32,x2:(180+len)/2,y2:32,stroke:'#6054cf','stroke-width':3},svg);for(const x of [(180-len)/2,(180+len)/2])shape('circle',{cx:x,cy:32,r:3,fill:'#6054cf'},svg);const sm=document.createElement('small');sm.textContent=label+' = '+value+'cm';div.append(sm);$('givens').append(div);}
  for(const [label,value] of Object.entries(t.angles)){const div=document.createElement('div');div.className='given';const svg=shape('svg',{viewBox:'0 0 180 70'},div),r=value*Math.PI/180;shape('path',{d:`M 130 57 L 50 57 L ${50+72*Math.cos(r)} ${57-72*Math.sin(r)}`,stroke:'#6054cf','stroke-width':2.5,fill:'none'},svg);shape('path',{d:`M 70 57 A 20 20 0 0 0 ${50+20*Math.cos(r)} ${57-20*Math.sin(r)}`,stroke:'#8f86dc',fill:'none'},svg);const sm=document.createElement('small');sm.textContent='∠'+label+' = '+value+'°';div.append(sm);$('givens').append(div);}
}
function draw(){
  const svg=$('geometry');svg.replaceChildren();const s=index>=0?result?.steps[index]?.state:null;$('empty').hidden=!!s;$('progress').textContent=s?`${index+1} / ${result.steps.length}단계`:'아직 실행하지 않았어요';if(!s)return;
  let xs=[0,6],ys=[0,4];for(const p of Object.values(s.points)){xs.push(p.x);ys.push(p.y);}for(const o of Object.values(s.objects))if(o.type==='circle'){xs.push(o.p.x-o.r,o.p.x+o.r);ys.push(o.p.y-o.r,o.p.y+o.r);}
  const xmin=Math.min(...xs)-1,xmax=Math.max(...xs)+1,ymin=Math.min(...ys)-1,ymax=Math.max(...ys)+1,W=xmax-xmin,H=ymax-ymin,stroke=W/350,font=W/48;
  svg.setAttribute('viewBox',`${xmin} ${-ymax} ${W} ${H}`);shape('title',{},svg,'학생 명령을 순서대로 계산한 작도 결과');
  for(const [id,o] of Object.entries(s.objects)){
    if(o.type==='circle'){shape('circle',{cx:o.p.x,cy:-o.p.y,r:o.r,fill:'none',stroke:'#a99ee0','stroke-width':stroke,'stroke-dasharray':`${stroke*4} ${stroke*3}`},svg);continue;}
    const d=Math.hypot(o.d.x,o.d.y),v={x:o.d.x/d,y:o.d.y/d},extent=Math.hypot(W,H)*2,start=o.type==='ray'?0:-extent;
    shape('line',{x1:o.p.x+start*v.x,y1:-o.p.y-start*v.y,x2:o.p.x+extent*v.x,y2:-o.p.y-extent*v.y,stroke:o.type==='ray'?'#7c89b4':'#bac2d4','stroke-width':stroke},svg);
    if(o.type==='line')shape('text',{x:xmin+.2,y:-o.p.y+font*1.5,fill:'#7f8aa5','font-size':font},svg,id);
  }
  for(const e of s.segments)shape('line',{x1:e.p.x,y1:-e.p.y,x2:e.q.x,y2:-e.q.y,stroke:'#4d42c9','stroke-width':stroke*2.5,'stroke-linecap':'round'},svg);
  for(const [id,p] of Object.entries(s.points)){shape('circle',{cx:p.x,cy:-p.y,r:stroke*2.6,fill:'#4235b6'},svg);shape('text',{x:p.x+font*.35,y:-p.y-font*.5,fill:'#26314d','font-size':font,'font-weight':700},svg,id);}
  // Display measured reference chords on the given-angle panel, never as workspace points.
  givens();for(const arc of s.arcs){const div=document.createElement('div');div.className='given';const sm=document.createElement('small');sm.textContent=`∠${arc.angle} 기준 호: ${arc.a}, ${arc.b} · ${arc.radius}`;div.append(sm);$('givens').append(div);}
}
function describe(o){
  switch(o.kind){case'line':return`직선 ${o.id}`;case'point':return`${o.a} 위에 점 ${o.id}`;case'measure':return`길이 ${o.radius} 재기`;case'given_arc':return`∠${o.angle}의 기준 호 → ${o.a}, ${o.b} (폭 ${o.radius})`;case'circle':return`${o.id}: 중심 ${o.a}, 반지름 ${o.radius}`;case'intersect':return`${o.a} ∩ ${o.b} → ${o.id}${o.id2?', '+o.id2:''} · ${{upper:'위쪽',lower:'아래쪽',left:'왼쪽',right:'오른쪽',both:'두 교점',unspecified:'선택 미정'}[o.choice]||'선택 미정'}`;case'ray':return`${o.a}에서 ${o.b}를 지나는 반직선 ${o.id}`;case'segment':return`${o.a}와 ${o.b} 잇기`;default:return o.message||'설명을 확인해 주세요.';}
}
function renderPlan(){ $('plan').replaceChildren();plan.operations.forEach((o,i)=>{const li=document.createElement('li');if(o.kind==='question')li.className='warning';const b=document.createElement('b');b.textContent=`${i+1}. ${names[o.kind]}`;const text=document.createElement('div');text.textContent=describe(o);const source=document.createElement('small');source.textContent='내 원문: '+o.source;li.append(b,text,source);$('plan').append(li);});}
function showStep(){draw();const step=result.steps[index];[...$('plan').children].forEach((li,i)=>li.classList.toggle('active',i===index));const li=$('plan').children[index];li?.scrollIntoView({block:'nearest',behavior:'smooth'});if(index===result.steps.length-1){pause();status(result.assessment.message,result.assessment.type);}else status(step.note,step.type);}
function next(){if(!result)return;if(index>=result.steps.length-1){pause();return;}index++;showStep();}
$('step').onclick=()=>{pause();next();};$('play').onclick=()=>{if(timer){pause();return;}if(!result)return;if(index>=result.steps.length-1)index=-1;next();if(index<result.steps.length-1){$('play').textContent='일시정지';timer=setInterval(next,1050);}};
$('reset').onclick=()=>{pause();index=-1;draw();[...$('plan').children].forEach(li=>li.classList.remove('active'));status('해석을 다시 확인한 뒤 실행하세요.');};
$('analyze').onclick=async()=>{
  const prompt=$('prompt').value.trim();if(!prompt){status('먼저 자신의 작도 설명을 작성해 주세요.','clarify');$('prompt').focus();return;}
  invalidate();const requestId=serial,taskKey=key;controller=new AbortController();$('analyze').disabled=true;$('analyze').textContent='Gemini가 설명을 읽고 있어요…';status('자연어를 해석하고 있습니다. 입력하지 않은 과정을 보충하지 않도록 요청합니다.');
  try{
    const res=await fetch('/api/interpret',{method:'POST',headers:{'Content-Type':'application/json','x-classroom-code':code},body:JSON.stringify({taskKey,prompt}),signal:controller.signal});const data=await res.json();if(requestId!==serial)return;
    if(!res.ok){if(res.status===401)$('access').showModal();throw new Error(data.error||'서버 연결을 확인해 주세요.');}
    plan=validatePlan(data.plan,prompt);result=execute(key,plan.operations);$('summary').textContent=plan.summary;$('model').textContent=data.model;renderPlan();setButtons();
    const snapshot={time:new Date().toISOString(),prompt,model:data.model,plan,assessment:result.assessment};record.first??=snapshot;record.attempts=[...(record.attempts||[]),snapshot].slice(-8);record.prompt=$('prompt').value;persist();history();status('Gemini가 해석한 명령을 확인하세요. 내 의도와 같으면 한 단계씩 또는 연속으로 실행하세요.');
  }catch(e){if(e.name!=='AbortError'&&requestId===serial)status(e.message||'연결에 실패했습니다.','clarify');}
  finally{if(requestId===serial){controller=null;$('analyze').disabled=false;$('analyze').textContent='Gemini로 내 설명 해석하기 ↗';}}
};
function history(){const el=$('history-content');el.replaceChildren();const attempts=record.attempts||[];let list=record.first?[record.first,...attempts.filter(x=>x.time!==record.first.time)]:[];if(!list.length){el.textContent='처음 Gemini로 분석한 설명부터 기록됩니다. 현재 입력 내용은 별도로 저장됩니다.';return;}list.forEach((x,i)=>{const article=document.createElement('article'),b=document.createElement('b'),pre=document.createElement('pre'),small=document.createElement('div');b.textContent=i===0?'최초 설명':`${i}번째 수정`;pre.textContent=x.prompt;small.textContent=new Date(x.time).toLocaleString('ko-KR')+' · '+x.model;article.append(b,small,pre);el.append(article);});}
$('export').onclick=()=>{const text=['작도 실험실 활동 기록',TASKS[key].title,TASKS[key].description,'','현재 설명',$('prompt').value,'','나의 판단과 수학적 근거',$('evidence').value,'','AI 해석 확인 / 수정 이유',$('revision').value,'','분석 기록',JSON.stringify({first:record.first,attempts:record.attempts},null,2)].join('\n');const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=`작도실험실_${key}_${new Date().toISOString().slice(0,10)}.txt`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('clear-record').onclick=()=>{if(!confirm('이 과제의 입력 내용과 분석 기록을 지울까요? 필요한 기록은 먼저 내려받으세요.'))return;record={};memory[key]={};try{localStorage.removeItem(storageKey(key));}catch{}chooseTask();};
$('settings').onclick=()=>$('access').showModal();$('save-code').onclick=()=>{code=$('class-code').value;$('class-code').value='';};
const base='눈금 없는 자로 직선 l을 긋고 그 위에 점 B를 잡는다.\n';
const bc='컴퍼스로 a의 길이를 잰다. B를 중심으로 반지름 a인 원 k1을 그린다. k1과 l의 오른쪽 교점을 C라고 한다.\n';
const angleB='주어진 각 B의 꼭짓점을 중심으로 원을 그려 두 변과의 교점을 M, N이라고 한다. 그 반지름을 유지하여 점 B를 중심으로 원 k0을 그린다. k0과 l의 오른쪽 교점을 P라고 한다.\n컴퍼스로 MN의 길이를 잰다. P를 중심으로 반지름 MN인 원 kQ를 그린다. kQ와 k0의 위쪽 교점을 Q라고 한다. 반직선 BQ를 그린다.\n';
const examples={segment:'눈금 없는 자로 직선 l을 긋는다. 그 위에 점 P를 잡는다.\n컴퍼스로 AB의 길이를 잰다. P를 중심으로 반지름 AB인 원 k1을 그린다. k1과 l의 오른쪽 교점을 Q라고 한다. P와 Q를 잇는다.',angle:base+angleB,sss:base+bc+'컴퍼스로 c의 길이를 재고 B 중심 반지름 c인 원 k2를 그린다.\n컴퍼스로 b의 길이를 재고 C 중심 반지름 b인 원 k3을 그린다.\nk2와 k3의 위쪽 교점을 A로 정하고 A, B, C를 잇는다.',sas:base+bc+angleB+'컴퍼스로 c의 길이를 재고 B 중심 반지름 c인 원 k2를 그린다. k2와 반직선 BQ의 교점을 A라고 한다. A, B, C를 잇는다.',asa:base+bc+angleB+'주어진 각 C의 꼭짓점을 중심으로 원을 그려 두 변과의 교점을 E, F라고 한다. 그 반지름을 유지하여 C 중심 원 kC를 그린다. kC와 l의 왼쪽 교점을 R로 정한다.\n컴퍼스로 EF의 길이를 재고 R 중심 반지름 EF인 원 kS를 그린다. kS와 kC의 위쪽 교점을 S로 정하고 반직선 CS를 그린다.\n두 반직선 BQ, CS의 교점을 A로 정하고 A, B, C를 잇는다.',inequality:base+bc+'컴퍼스로 c의 길이를 재고 B 중심 반지름 c인 원 k2를 그린다.\n컴퍼스로 b의 길이를 재고 C 중심 반지름 b인 원 k3을 그린다.\nk2와 k3의 위쪽 교점을 A로 정한다.',ssa:base+angleB+'컴퍼스로 c의 길이를 재고 B 중심 반지름 c인 원 k1을 그린다. k1과 반직선 BQ의 교점을 A로 정한다.\n컴퍼스로 b의 길이를 재고 A 중심 반지름 b인 원 k2를 그린다.\nk2와 l의 두 교점을 C1, C2로 정한다.\nA와 B, A와 C1, B와 C1을 잇고 A와 C2, B와 C2도 잇는다.'};
$('example').onclick=()=>{$('example-text').textContent=examples[key];$('example-dialog').showModal();};$('close-example').onclick=()=>$('example-dialog').close();
chooseTask();
try{const res=await fetch('/api/status');if(!res.ok)throw new Error();const data=await res.json();$('connection').textContent=data.configured?'Gemini 연결 설정됨':'Gemini 키 설정 필요';$('connection').className=data.configured?'online':'';$('server-info').textContent=data.configured?`서버 모델: ${data.model}${data.codeRequired?' · 수업 코드 필요':''}`:'교사가 서버의 .env에 GEMINI_API_KEY를 설정해야 합니다.';}catch{$('connection').textContent='서버로 접속해 주세요';$('server-info').textContent='HTML 파일만 열거나 GitHub Pages로 접속하면 Gemini 호출 서버를 사용할 수 없습니다. 서버 주소로 접속하세요.';}
