const STORAGE_KEY='meuFinanceiro.v1';
const categories={salary:{label:'Salário',icon:'↓'},home:{label:'Moradia',icon:'⌂'},food:{label:'Alimentação',icon:'◇'},transport:{label:'Transporte',icon:'↗'},health:{label:'Saúde',icon:'✚'},leisure:{label:'Lazer',icon:'✳'},other:{label:'Outros',icon:'·'}};
const money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value||0);
const dateLabel=value=>new Intl.DateTimeFormat('pt-BR',{day:'2-digit',month:'short'}).format(new Date(`${value}T12:00:00`)).replace('.','');
const todayISO=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const monthKey=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
const emptyState=()=>({transactions:[],bills:[],plan:{salary:0,percent:10,saved:0},name:''});
let state=emptyState(),visibleMonth=new Date(new Date().getFullYear(),new Date().getMonth(),1),hidden=false,client=null,currentUser=null;
const $=selector=>document.querySelector(selector);
function setupMessage(message){$('#authScreen').hidden=false;$('#authMessage').textContent=message;$('.app-shell').hidden=true}
function toast(msg){const el=$('#toast');el.textContent=msg;el.classList.add('visible');setTimeout(()=>el.classList.remove('visible'),2600)}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmt(value){return hidden?'••••••':money(value)}
function monthlyBills(month=visibleMonth){return state.bills.filter(b=>{const due=new Date(`${b.dueDate}T12:00:00`),offset=(month.getFullYear()-due.getFullYear())*12+month.getMonth()-due.getMonth();return offset>=0&&(b.remaining>=600||offset<b.remaining)})}
function setSignedIn(user){currentUser=user;$('#authScreen').hidden=true;$('.app-shell').hidden=false;$('#accountEmail').textContent=user.email||'Conta Google';const metadata=user.user_metadata||{};state.name=metadata.preferred_name||metadata.full_name||metadata.name||user.email?.split('@')[0]||'você';loadCloudData()}
async function loadCloudData(){try{
 const [transactions,bills,plan]=await Promise.all([
  client.from('transactions').select('*').order('date',{ascending:false}),
  client.from('bills').select('*').order('due_date',{ascending:true}),
  client.from('savings_plans').select('*').maybeSingle()
 ]);
 for(const result of [transactions,bills,plan])if(result.error)throw result.error;
 state.transactions=(transactions.data||[]).map(t=>({id:t.id,description:t.description,amount:Number(t.amount),type:t.type,category:t.category,date:t.date}));
 state.bills=(bills.data||[]).map(b=>({id:b.id,name:b.name,amount:Number(b.amount),dueDate:b.due_date,remaining:b.remaining,icon:b.icon}));
 if(plan.data)state.plan={salary:Number(plan.data.salary),percent:plan.data.percent,saved:Number(plan.data.saved)};else state.plan={salary:0,percent:10,saved:0};
 if(!state.transactions.length&&!state.bills.length&&!plan.data&&await offerLegacyImport())return loadCloudData();
 render();
 }catch(error){console.error(error);toast('Não foi possível carregar seus dados. Confira a configuração do banco.')}
}
async function offerLegacyImport(){
 let old;try{old=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')}catch{return false}
 if(!old||(!old.transactions?.length&&!old.bills?.length&&!old.plan?.salary&&!old.plan?.saved))return false;
 const marker=`meuFinanceiro.imported.${currentUser.id}`;if(localStorage.getItem(marker))return false;
 localStorage.setItem(marker,'offered');
 const count=(old.transactions?.length||0)+(old.bills?.length||0)+(old.plan?.salary||old.plan?.saved?1:0);
 if(!window.confirm(`Encontrei dados antigos salvos neste navegador (${old.transactions?.length||0} lançamentos, ${old.bills?.length||0} faturas${old.plan?.salary||old.plan?.saved?' e sua meta':''}). Quer importar uma cópia para a conta Google ${currentUser.email||'conectada'}? Nada será apagado deste dispositivo.`))return false;
 try{
  const transactions=(old.transactions||[]).map(({id,...t})=>({...t,user_id:currentUser.id}));
  const bills=(old.bills||[]).map(({id,dueDate,...b})=>({...b,due_date:dueDate,user_id:currentUser.id}));
  if(transactions.length){const result=await client.from('transactions').insert(transactions);if(result.error)throw result.error}
  if(bills.length){const result=await client.from('bills').insert(bills);if(result.error)throw result.error}
  if(old.plan?.salary||old.plan?.saved||old.plan?.percent){const result=await client.from('savings_plans').upsert({user_id:currentUser.id,salary:Number(old.plan.salary)||0,percent:Number(old.plan.percent)||0,saved:Number(old.plan.saved)||0},{onConflict:'user_id'});if(result.error)throw result.error}
  localStorage.setItem(marker,'done');toast(`${count} itens importados. A cópia antiga continua neste dispositivo.`);return true;
 }catch(error){localStorage.removeItem(marker);console.error(error);toast('A importação não foi concluída. Seus dados antigos continuam neste dispositivo.');return false}
}
async function persist(operation){try{const result=await operation();if(result?.error)throw result.error;await loadCloudData();return true}catch(error){console.error(error);toast('Não foi possível salvar. Seus dados continuam seguros; tente novamente.');return false}}
function render(){
 const month=monthKey(visibleMonth),items=state.transactions.filter(t=>t.date.slice(0,7)===month),salary=state.plan.salary||0,otherIncome=items.filter(t=>t.type==='income'&&(!salary||t.category!=='salary')).reduce((n,t)=>n+t.amount,0),income=salary+otherIncome,otherExpenses=items.filter(t=>t.type==='expense').reduce((n,t)=>n+t.amount,0),accountTotal=monthlyBills().reduce((n,b)=>n+b.amount,0),expenses=otherExpenses+accountTotal,balance=income-expenses;
 $('#today').textContent=new Intl.DateTimeFormat('pt-BR',{weekday:'short',day:'numeric',month:'short',year:'numeric'}).format(new Date());$('#monthLabel').textContent=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric'}).format(visibleMonth);
 $('#balance').textContent=fmt(balance);$('#incomeTotal').textContent=fmt(income);$('#expenseTotal').textContent=fmt(expenses);$('#monthlyNote').textContent=income||expenses?(balance>=0?'Dentro do planejado':'Contas acima da renda'):'Defina seu salário';
 $('#greetingName').textContent=state.name||'você';$('.avatar').textContent=(state.name||'M').charAt(0).toUpperCase();$('.mobile-profile').textContent=(state.name||'M').charAt(0).toUpperCase();
 const target=(state.plan.salary||0)*(state.plan.percent||0)/100,progress=target?Math.min(100,Math.round((state.plan.saved||0)/target*100)):0;
 $('#goalValue').textContent=fmt(target);$('#goalDetail').textContent=state.plan.salary?`${state.plan.percent}% do seu salário de ${fmt(state.plan.salary)}`:'Defina seu salário e sua meta mensal';$('#savedLabel').textContent=`${fmt(state.plan.saved||0)} guardados`;$('#progressPercent').textContent=`${progress}%`;$('#donutPercent').textContent=`${progress}%`;$('#savingsProgress').style.width=`${progress}%`;$('#savingsDonut').style.background=`conic-gradient(#8bce9a ${progress}%,#eef2ee ${progress}% 100%)`;
 $('#suggestion').lastElementChild.textContent=target?(progress>=100?'Meta do mês alcançada. Que conquista!':`Faltam ${fmt(Math.max(0,target-(state.plan.saved||0)))} para a meta deste mês.`):'Um pequeno passo por mês faz diferença.';
 renderBills();renderTransactions(items);$('#privacyButton').textContent=hidden?'⊘':'◉';
}
function renderBills(){const list=$('#billList'),empty=$('#emptyBills'),bills=[...state.bills].sort((a,b)=>a.dueDate.localeCompare(b.dueDate)).slice(0,3),committed=monthlyBills().reduce((n,b)=>n+b.amount,0);list.innerHTML='';empty.classList.toggle('visible',!bills.length);list.hidden=!bills.length;for(const b of bills){const row=document.createElement('div');row.className='bill-item';const recurring=b.remaining>=600;row.innerHTML=`<span class="bill-icon">${esc(b.icon)}</span><span class="bill-info"><strong>${esc(b.name)}</strong><span>Vence ${dateLabel(b.dueDate)} · ${recurring?'Conta recorrente':`${b.remaining} ${b.remaining===1?'parcela':'parcelas'} restantes`}</span></span><span class="bill-amount"><strong class="sensitive">${fmt(b.amount)}<small>/mês</small></strong><span class="sensitive">${recurring?'Mensal, sem prazo':`Faltam ${fmt(b.amount*b.remaining)} no total`}</span></span><button class="bill-delete" aria-label="Remover conta" title="Remover conta">×</button>`;row.querySelector('.bill-delete').addEventListener('click',()=>persist(()=>client.from('bills').delete().eq('id',b.id)).then(ok=>ok&&toast('Conta removida.')));list.appendChild(row)}$('#billsFooterText').textContent=bills.length?`${fmt(committed)} previstos em contas neste mês`:'Suas contas organizadas, sem surpresas.'}
function renderTransactions(items){const filter=$('#categoryFilter').value,rows=$('#transactionRows'),empty=$('#emptyTransactions');rows.innerHTML='';const filtered=items.filter(t=>filter==='all'||t.category===filter).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,8);empty.hidden=filtered.length>0;for(const t of filtered){const cat=categories[t.category]||categories.other,tr=document.createElement('tr');tr.innerHTML=`<td>${esc(t.description)}</td><td><span class="category-cell"><span class="category-badge">${cat.icon}</span>${cat.label}</span></td><td>${dateLabel(t.date)}</td><td class="sensitive ${t.type==='income'?'value-income':'value-expense'}">${t.type==='income'?'+':'−'} ${fmt(t.amount)}</td><td><button class="row-delete" aria-label="Remover lançamento" title="Remover">×</button></td>`;tr.querySelector('.row-delete').addEventListener('click',()=>persist(()=>client.from('transactions').delete().eq('id',t.id)).then(ok=>ok&&toast('Lançamento removido.')));rows.appendChild(tr)}}
function openDialog(id){$(`#${id}`).showModal()}
function bindForms(){
 $('#googleLogin').onclick=async()=>{const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:window.location.origin+window.location.pathname}});if(error)$('#authMessage').textContent=error.message};
 $('#signOut').onclick=async()=>{await client.auth.signOut();state=emptyState();$('#authScreen').hidden=false;$('.app-shell').hidden=true};
 $('#addTransaction').onclick=()=>{$('#transactionForm').reset();$('[name="date"]').value=todayISO();openDialog('transactionDialog')};$('#emptyAddTransaction').onclick=()=>$('#addTransaction').click();
 $('#transactionForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget);const item={user_id:currentUser.id,description:f.get('description').trim(),amount:Number(f.get('amount')),type:f.get('type'),category:f.get('category'),date:f.get('date')};if(await persist(()=>client.from('transactions').insert(item))){e.currentTarget.closest('dialog').close();toast('Lançamento salvo.')}});
 const recurringToggle=$('#billForm').elements.recurring,remainingInput=$('#billForm').elements.remaining;
 $('#addBill').onclick=()=>{$('#billForm').reset();recurringToggle.checked=false;remainingInput.disabled=false;$('[name="dueDate"]').value=todayISO();openDialog('billDialog')};$('#emptyAddBill').onclick=()=>$('#addBill').click();
 recurringToggle.addEventListener('change',()=>{remainingInput.disabled=recurringToggle.checked;if(recurringToggle.checked)remainingInput.value=600;else if(Number(remainingInput.value)===600)remainingInput.value=''});
 $('#billForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget),bill={user_id:currentUser.id,name:f.get('name').trim(),amount:Number(f.get('amount')),due_date:f.get('dueDate'),remaining:recurringToggle.checked?600:Number(f.get('remaining')),icon:f.get('icon')};if(await persist(()=>client.from('bills').insert(bill))){e.currentTarget.closest('dialog').close();toast('Conta adicionada ao cálculo mensal.')}});
 $('#editPlan').onclick=()=>{const f=$('#planForm');f.elements.salary.value=state.plan.salary?state.plan.salary/2:'';f.elements.percent.value=state.plan.percent||10;f.elements.saved.value=state.plan.saved||'';$('#monthlyEstimate').textContent=`Salário mensal estimado: ${money(state.plan.salary||0)}`;openDialog('planDialog')};
 $('#planForm').elements.salary.addEventListener('input',e=>{$('#monthlyEstimate').textContent=`Salário mensal estimado: ${money(Number(e.target.value||0)*2)}`});
 $('#planForm').addEventListener('submit',async e=>{e.preventDefault();const f=new FormData(e.currentTarget),plan={user_id:currentUser.id,salary:(Number(f.get('salary'))||0)*2,percent:Number(f.get('percent'))||0,saved:Number(f.get('saved'))||0};if(await persist(()=>client.from('savings_plans').upsert(plan,{onConflict:'user_id'}))){e.currentTarget.closest('dialog').close();toast('Salário, contas e meta atualizados.') }});
 $('#profileButton').onclick=()=>{$('#profileForm').elements.name.value=state.name||'';openDialog('profileDialog')};$('.mobile-profile').onclick=()=>$('#profileButton').click();
 $('#profileForm').addEventListener('submit',async e=>{e.preventDefault();const name=new FormData(e.currentTarget).get('name').trim(),{error}=await client.auth.updateUser({data:{preferred_name:name}});if(error){toast('Não foi possível atualizar seu nome.');return}state.name=name;e.currentTarget.closest('dialog').close();render();toast('Seu espaço foi atualizado.')});
 document.querySelectorAll('.cancel-dialog,.dialog-close').forEach(b=>b.addEventListener('click',()=>b.closest('dialog').close()));document.querySelectorAll('dialog').forEach(d=>d.addEventListener('click',e=>{if(e.target===d)d.close()}));
 $('#prevMonth').onclick=()=>{visibleMonth.setMonth(visibleMonth.getMonth()-1);render()};$('#nextMonth').onclick=()=>{visibleMonth.setMonth(visibleMonth.getMonth()+1);render()};$('#privacyButton').onclick=()=>{hidden=!hidden;render()};$('#categoryFilter').onchange=()=>renderTransactions(state.transactions.filter(t=>t.date.slice(0,7)===monthKey(visibleMonth)));$('#viewAll').onclick=()=>toast('Exibindo os lançamentos mais recentes deste mês.');
}
async function start(){
 const config=window.APP_CONFIG||{};
 if(!config.supabaseUrl||!config.supabaseAnonKey||!window.supabase?.createClient){setupMessage('A configuração do banco ainda não foi concluída.');$('#googleLogin').disabled=true;return}
 client=window.supabase.createClient(config.supabaseUrl,config.supabaseAnonKey);bindForms();
 const {data:{session},error}=await client.auth.getSession();if(error){setupMessage('Não foi possível iniciar a sessão.');return}if(session)setSignedIn(session.user);else{
  try{const response=await fetch(`${config.supabaseUrl}/auth/v1/settings`,{headers:{apikey:config.supabaseAnonKey}}),settings=await response.json();if(!response.ok||!settings.external?.google){setupMessage('O projeto está conectado. Para liberar o acesso, ative o provedor Google no painel do Supabase.');$('#googleLogin').disabled=true}else setupMessage('')}
  catch{setupMessage('Não consegui verificar a configuração do projeto. Confira sua conexão com a internet.');$('#googleLogin').disabled=true}
 }
 client.auth.onAuthStateChange((_event,newSession)=>{if(newSession)setSignedIn(newSession.user);else{currentUser=null;state=emptyState();$('#authScreen').hidden=false;$('.app-shell').hidden=true}});
}
start();
