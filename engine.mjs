// AI translates language only. This module owns geometric state and validation.
export const TASKS = {
  segment: {title:'같은 길이의 선분 옮기기',rule:'선분',lengths:{AB:4},angles:{},anchor:'P',goal:'PQ',description:'주어진 AB와 길이가 같은 PQ를 작도하세요.',question:'컴퍼스의 벌어진 폭을 유지해야 하는 이유는 무엇인가요?'},
  angle: {title:'같은 크기의 각 옮기기',rule:'각',lengths:{},angles:{B:50},anchor:'B',description:'주어진 50°인 각을 B에 옮기세요. 각도기는 사용하지 않습니다.',question:'두 기준 원의 반지름과 현의 길이를 각각 같게 하는 이유는 무엇인가요?'},
  sss: {title:'세 변으로 삼각형 작도',rule:'SSS',lengths:{a:6,b:4.5,c:5},angles:{},anchor:'B',description:'a=BC=6cm, b=CA=4.5cm, c=AB=5cm',question:'밑변 위·아래의 교점으로 만든 두 삼각형은 왜 합동인가요?'},
  sas: {title:'두 변과 끼인각으로 작도',rule:'SAS',lengths:{a:6,c:5},angles:{B:50},anchor:'B',description:'a=BC=6cm, c=AB=5cm, 끼인각 ∠B=50°',question:'작도 순서를 바꾸어도 같은 삼각형이 결정되는 이유는 무엇인가요?'},
  asa: {title:'한 변과 양 끝 각으로 작도',rule:'ASA',lengths:{a:6},angles:{B:50,C:65},anchor:'B',description:'a=BC=6cm, ∠B=50°, ∠C=65°',question:'점 C의 위치가 정해지기 전에 C에서 각을 옮길 수 있을까요?'},
  inequality: {title:'만들 수 없는 삼각형',rule:'존재 조건',lengths:{a:6,b:3,c:2},angles:{},anchor:'B',description:'a=BC=6cm, b=CA=3cm, c=AB=2cm',question:'교점이 생기지 않는 까닭을 세 변의 길이로 설명하세요.'},
  ssa: {title:'두 삼각형이 생기는 조건',rule:'SSA 반례',lengths:{c:5,b:3},angles:{B:30},anchor:'B',description:'c=AB=5cm, b=AC=3cm, ∠B=30° — 끼인각이 아닌 각',question:'두 교점으로 만든 삼각형이 서로 합동인지 대응변을 비교해 설명하세요.'}
};
export const KINDS=['line','point','measure','given_arc','circle','intersect','ray','segment','question'];
export const PLAN_SCHEMA={type:'object',properties:{summary:{type:'string'},operations:{type:'array',items:{type:'object',properties:{kind:{type:'string',enum:KINDS},source:{type:'string'},id:{type:'string'},a:{type:'string'},b:{type:'string'},radius:{type:'string'},choice:{type:'string',enum:['upper','lower','left','right','both','unspecified']},id2:{type:'string'},angle:{type:'string'},message:{type:'string'}},required:['kind','source']}}},required:['summary','operations']};
export function validatePlan(plan,prompt){
  if(!plan||typeof plan.summary!=='string'||plan.summary.length>2000||!Array.isArray(plan.operations)||!plan.operations.length||plan.operations.length>100)throw new Error('AI 응답 형식이 올바르지 않습니다. 다시 분석해 주세요.');
  const allowed=new Set(['kind','source','id','a','b','radius','choice','id2','angle','message']);
  const norm=s=>s.replace(/\s+/g,'');
  for(const o of plan.operations){
    if(!o||!KINDS.includes(o.kind)||typeof o.source!=='string'||!o.source.trim()||!norm(prompt).includes(norm(o.source)))throw new Error('AI가 입력에 없는 근거를 만들었습니다. 다시 분석해 주세요.');
    for(const [k,v] of Object.entries(o))if(!allowed.has(k)||typeof v!=='string'||v.length>1500)throw new Error('지원하지 않는 AI 명령입니다.');
    for(const key of ['id','a','b','id2'])if(o[key]&&!/^[A-Za-z][A-Za-z0-9_]{0,15}$/.test(o[key]))throw new Error('점·도형 이름은 영문과 숫자로 지정해 주세요.');
  }
  return plan;
}
const EPS=1e-7;
const distance=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y);
const cross=(a,b)=>a.x*b.y-a.y*b.x;
const minus=(a,b)=>({x:a.x-b.x,y:a.y-b.y});
export function intersections(a,b){
  if(a.type==='circle'&&b.type!=='circle')return intersections(b,a);
  if(a.type!=='circle'&&b.type!=='circle'){
    const v=minus(b.p,a.p),d=cross(a.d,b.d);if(Math.abs(d)<EPS)return [];
    const t=cross(v,b.d)/d,u=cross(v,a.d)/d;
    if((a.type==='ray'&&t<-EPS)||(b.type==='ray'&&u<-EPS))return [];
    return [{x:a.p.x+t*a.d.x,y:a.p.y+t*a.d.y}];
  }
  if(a.type!=='circle'){
    const v=minus(a.p,b.p),A=a.d.x*a.d.x+a.d.y*a.d.y,B=2*(v.x*a.d.x+v.y*a.d.y),C=v.x*v.x+v.y*v.y-b.r*b.r,D=B*B-4*A*C;
    if(D<-EPS)return [];
    return [...new Set([(-B-Math.sqrt(Math.max(0,D)))/(2*A),(-B+Math.sqrt(Math.max(0,D)))/(2*A)])].filter(t=>a.type!=='ray'||t>=-EPS).map(t=>({x:a.p.x+t*a.d.x,y:a.p.y+t*a.d.y}));
  }
  const d=distance(a.p,b.p);if(d<EPS||d>a.r+b.r+EPS||d<Math.abs(a.r-b.r)-EPS)return [];
  const x=(a.r*a.r-b.r*b.r+d*d)/(2*d),h=Math.sqrt(Math.max(0,a.r*a.r-x*x)),v={x:(b.p.x-a.p.x)/d,y:(b.p.y-a.p.y)/d},p={x:a.p.x+x*v.x,y:a.p.y+x*v.y};
  return h<EPS?[p]:[{x:p.x-h*v.y,y:p.y+h*v.x},{x:p.x+h*v.y,y:p.y-h*v.x}];
}
const empty=()=>({points:{},objects:{},refs:{},measured:[],arcs:[],segments:[]});
class Stop extends Error {constructor(type,message){super(message);this.type=type;}}
const stop=(type,message)=>{throw new Stop(type,message);};
export function execute(taskKey,operations){
  const task=TASKS[taskKey];if(!task)throw new Error('없는 과제');
  let state=empty();state.refs={...task.lengths};const steps=[];
  for(const op of operations){
    const next=structuredClone(state);
    const point=id=>next.points[id]||stop('error',`점 ${id||'?'}가 아직 없습니다. 먼저 그 점을 정해 주세요.`);
    const object=id=>next.objects[id]||stop('error',`도형 ${id||'?'}가 아직 없습니다. 먼저 그려 주세요.`);
    const fresh=id=>{if(!id||next.points[id]||next.objects[id])stop('clarify',`${id||'새 도형'}의 이름을 명확하게, 기존 이름과 다르게 지정해 주세요.`);};
    const length=ref=>{
      if(Object.hasOwn(next.refs,ref))return next.refs[ref];
      if(/^[A-Z]{2}$/.test(ref)&&next.points[ref[0]]&&next.points[ref[1]])return distance(point(ref[0]),point(ref[1]));
      if(/^\d+(\.\d+)?(cm)?$/.test(ref||''))return Number(ref.replace('cm',''));
      return stop('error',`길이 ${ref||'?'}가 아직 정해지지 않았습니다.`);
    };
    let note='실행했습니다.',type='ok';
    try{
      switch(op.kind){
        case 'line':fresh(op.id);next.objects[op.id]={type:'line',p:{x:0,y:0},d:{x:1,y:0}};note=`기준 직선 ${op.id}을 그렸습니다. 방향은 화면 배치를 위한 선택입니다.`;break;
        case 'point':{
          fresh(op.id);const l=object(op.a);if(l.type!=='line')stop('clarify','시작점은 기준 직선 위에 잡아 주세요.');
          if(op.id!==task.anchor)stop('clarify',`시작점은 ${task.anchor}입니다. ${op.id}의 위치를 정하는 조건이나 교점을 설명해 주세요.`);
          next.points[op.id]={...l.p};note=`직선 ${op.a} 위에 시작점 ${op.id}를 잡았습니다.`;break;}
        case 'measure':{const r=length(op.radius);if(!(r>EPS))stop('error','길이는 0보다 커야 합니다.');if(!next.measured.includes(op.radius))next.measured.push(op.radius);note=`컴퍼스로 ${op.radius}의 길이를 재었습니다.`;break;}
        case 'given_arc':{
          if(!Object.hasOwn(task.angles,op.angle))stop('error','이 과제에 주어지지 않은 각입니다.');
          if(!op.a||!op.b||op.a===op.b||!op.radius)stop('clarify','주어진 각의 두 변과 원이 만나는 두 점과 기준 반지름 이름을 지정해 주세요.');
          if(next.arcs.some(a=>a.a===op.a||a.b===op.a||a.a===op.b||a.b===op.b)||Object.hasOwn(next.refs,op.radius))stop('clarify','기준 호와 반지름에 새 이름을 사용해 주세요.');
          const r=1.2,theta=task.angles[op.angle]*Math.PI/180;
          next.refs[op.radius]=r;next.refs[op.a+op.b]=next.refs[op.b+op.a]=2*r*Math.sin(theta/2);next.measured.push(op.radius);
          next.arcs.push({angle:op.angle,a:op.a,b:op.b,radius:op.radius});note=`주어진 ∠${op.angle}에 기준 호를 그리고 ${op.a}, ${op.b}를 정했습니다. ${op.radius}는 임의로 정한 컴퍼스 폭입니다.`;break;}
        case 'circle':{
          fresh(op.id);const p=point(op.a),r=length(op.radius);if(!(r>EPS&&r<=100))stop('error','반지름은 0보다 크고 100cm 이하여야 합니다.');
          // Numerical radii are retained exactly; they are never changed to the expected given.
          if(!/^\d/.test(op.radius||'')&&!next.measured.includes(op.radius))stop('error',`${op.radius}를 먼저 컴퍼스로 재어 주세요. 측정 과정을 자동 보충하지 않습니다.`);
          next.objects[op.id]={type:'circle',p:{...p},r,center:op.a,radius:op.radius};note=`${op.a} 중심, 반지름 ${op.radius}인 원 ${op.id}을 그렸습니다.`;break;}
        case 'intersect':{
          fresh(op.id);const a=object(op.a),b=object(op.b),pts=intersections(a,b);
          if(!pts.length)stop('impossible',`실제로 계산한 결과 ${op.a}와 ${op.b}는 만나지 않습니다. 중심 사이 거리와 반지름을 확인하세요.`);
          if(pts.length>1&&(!op.choice||op.choice==='unspecified'))stop('clarify',`교점이 ${pts.length}개입니다. 위·아래 또는 왼쪽·오른쪽 중 어느 교점인지 정해 주세요. 두 교점을 모두 찾을 수도 있습니다.`);
          const sorted=[...pts].sort((p,q)=>['upper','lower'].includes(op.choice)?q.y-p.y:p.x-q.x);
          if(op.choice==='both'&&pts.length>1){fresh(op.id2);if(op.id2===op.id)stop('clarify','두 교점에는 서로 다른 이름이 필요합니다.');next.points[op.id]=sorted[0];next.points[op.id2]=sorted[1];note=`교점 ${op.id}, ${op.id2} 두 개를 찾았습니다. 두 삼각형의 합동 여부는 별도로 판단해야 합니다.`;}
          else{next.points[op.id]=['lower','right'].includes(op.choice)?sorted.at(-1):sorted[0];note=`교점 ${op.id}를 정했습니다.${pts.length>1?' 다른 교점도 존재합니다.':''}`;}break;}
        case 'ray':{fresh(op.id);const p=point(op.a),q=point(op.b);if(distance(p,q)<EPS)stop('error','서로 다른 두 점이 필요합니다.');next.objects[op.id]={type:'ray',p:{...p},d:minus(q,p),from:op.a,through:op.b};note=`${op.a}에서 ${op.b}를 지나는 반직선 ${op.id}을 그렸습니다.`;break;}
        case 'segment':{const p=point(op.a),q=point(op.b);if(distance(p,q)<EPS)stop('error','서로 다른 두 점이 필요합니다.');next.segments.push({a:op.a,b:op.b,p:{...p},q:{...q}});note=`${op.a}와 ${op.b}를 이었습니다.`;break;}
        case 'question':stop('clarify',op.message||'작도 위치나 조건을 더 구체적으로 적어 주세요.');break;
        default:stop('clarify','지원하는 작도 명령으로 해석하지 못했습니다.');
      }
      state=next;
    }catch(e){if(!(e instanceof Stop))throw e;type=e.type;note=e.message;}
    steps.push({operation:op,type,note,state:structuredClone(state)});
    if(type!=='ok')break;
  }
  return {steps,state,assessment:assess(taskKey,state,steps)};
}
function angle(p,v,q){const a=minus(p,v),b=minus(q,v);return Math.acos(Math.max(-1,Math.min(1,(a.x*b.x+a.y*b.y)/(Math.hypot(a.x,a.y)*Math.hypot(b.x,b.y)))))*180/Math.PI;}
function assess(key,s,steps){
  const t=TASKS[key],p=s.points,last=steps.at(-1);
  if(last&&last.type!=='ok')return {type:last.type,message:last.note};
  if(key==='segment')return p.P&&p.Q&&s.segments.some(e=>[e.a,e.b].sort().join('')==='PQ')?{type:Math.abs(distance(p.P,p.Q)-t.lengths.AB)<EPS?'complete':'error',message:Math.abs(distance(p.P,p.Q)-t.lengths.AB)<EPS?'PQ와 AB의 길이가 같습니다. 왜 같아지는지 설명해 보세요.':'PQ의 길이가 주어진 AB와 다릅니다. 반지름을 확인하세요.'}:{type:'incomplete',message:'실행한 부분까지 표시했습니다. P, Q를 정하고 선분 PQ를 연결해 주세요.'};
  if(key==='ssa'&&p.A&&p.B&&p.C1&&p.C2){
    const valid=[p.C1,p.C2].every(c=>Math.abs(distance(p.A,p.B)-5)<1e-4&&Math.abs(distance(p.A,c)-3)<1e-4&&Math.abs(angle(p.A,p.B,c)-30)<1e-4);
    const connected=['C1','C2'].every(c=>[['A','B'],['A',c],['B',c]].every(([a,b])=>s.segments.some(e=>[e.a,e.b].sort().join(',')===[a,b].sort().join(','))));
    if(valid&&connected)return {type:'complete',message:`두 삼각형은 모두 주어진 조건을 만족합니다. BC₁≈${distance(p.B,p.C1).toFixed(2)}cm, BC₂≈${distance(p.B,p.C2).toFixed(2)}cm로 서로 달라 두 삼각형은 합동이 아닙니다. SSA만으로 합동을 보장할 수 없습니다.`};
  }
  if(key==='angle'){
    const rays=Object.values(s.objects).filter(o=>o.type==='ray'&&o.from==='B');const base=Object.values(s.objects).find(o=>o.type==='line');
    if(p.B&&base&&rays.length){const r=rays.at(-1),value=angle({x:p.B.x+base.d.x,y:p.B.y+base.d.y},p.B,{x:r.p.x+r.d.x,y:r.p.y+r.d.y});return {type:Math.abs(value-t.angles.B)<1e-4?'complete':'error',message:Math.abs(value-t.angles.B)<1e-4?'옮긴 각의 크기가 주어진 각과 같습니다. 같은 기준 반지름과 현을 사용했는지 설명하세요.':'옮긴 각의 크기가 주어진 각과 다릅니다.'};}
  }
  if(p.A&&p.B&&p.C){
    const values={a:distance(p.B,p.C),b:distance(p.C,p.A),c:distance(p.A,p.B)};
    if(Math.abs(cross(minus(p.A,p.B),minus(p.C,p.B)))<EPS)return {type:'error',message:'세 점이 한 직선 위에 있어 삼각형이 아닙니다.'};
    const correct=Object.entries(t.lengths).every(([k,v])=>Math.abs(values[k]-v)<1e-4)&&Object.entries(t.angles).every(([k,v])=>Math.abs((k==='B'?angle(p.A,p.B,p.C):angle(p.A,p.C,p.B))-v)<1e-4);
    const connected=[['A','B'],['A','C'],['B','C']].every(([a,b])=>s.segments.some(e=>(e.a===a&&e.b===b)||(e.a===b&&e.b===a))||Object.values(s.objects).some(o=>o.type==='ray'&&((o.from===a&&o.through===b)||(o.from===b&&o.through===a))));
    if(!correct)return {type:'error',message:'그려진 삼각형이 주어진 길이·각 조건과 일치하지 않습니다. 입력한 조건을 확인하세요.'};
    if(connected)return {type:'complete',message:key==='ssa'?'이 삼각형은 주어진 조건을 만족합니다. 다른 교점으로 만든 삼각형도 비교해야 합동 여부를 판단할 수 있습니다.':`${t.rule} 조건을 만족하는 삼각형입니다. 대응변·대응각을 근거로 합동인 이유를 설명하세요.`};
  }
  return {type:'incomplete',message:'입력한 부분까지 실행했습니다. 필요한 교점·연결 과정이 남아 있습니다.'};
}
