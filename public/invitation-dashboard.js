(()=>{
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const wait=()=>{const bridge=window.MathAdminBridge,user=bridge?.getUser();if(!user)return setTimeout(wait,200);if(user.role!=='developer')return;mount(bridge)};
  async function mount(bridge){
    const tabs=document.querySelector('#tabs'),panel=document.querySelector('#invitationAdmin');if(!tabs||!panel||document.querySelector('[data-invitation-tab]'))return;
    const classes=(await bridge.api('/api/classes')).classes;
    const button=document.createElement('button');button.type='button';button.dataset.invitationTab='1';button.textContent='一次性啟用碼';tabs.appendChild(button);
    button.onclick=()=>{document.querySelectorAll('#tabs button').forEach(item=>item.classList.toggle('active',item===button));document.querySelectorAll('.panel').forEach(item=>item.classList.toggle('active',item===panel))};
    panel.innerHTML=`<h2>產生一次性啟用碼</h2><p>啟用碼只顯示一次，請當面或透過校內安全管道交給學生或教師。</p><form id="invitationForm" class="form-grid"><label>身分<select id="inviteRole"><option value="student">學生</option><option value="teacher">教師</option></select></label><label>班級<select id="inviteClass">${classes.map(row=>`<option value="${esc(row.id)}">${esc(row.code)} 班</option>`).join('')}</select></label><label>教師信箱（學生可留空）<input id="inviteEmail" type="email" maxlength="254"></label><label>產生數量<input id="inviteCount" type="number" min="1" max="40" value="1"></label><label>有效天數<input id="inviteDays" type="number" min="1" max="30" value="7"></label><button class="primary full" type="submit">產生啟用碼</button></form><div id="generatedCodes"></div>`;
    const role=document.querySelector('#inviteRole'),classField=document.querySelector('#inviteClass');role.onchange=()=>{classField.disabled=role.value==='teacher'};
    document.querySelector('#invitationForm').onsubmit=async event=>{event.preventDefault();try{const result=await bridge.api('/api/invitations',{method:'POST',body:JSON.stringify({role:role.value,classId:role.value==='student'?classField.value:null,email:document.querySelector('#inviteEmail').value,count:Number(document.querySelector('#inviteCount').value),expiresInDays:Number(document.querySelector('#inviteDays').value)})});document.querySelector('#generatedCodes').innerHTML=`<article class="item"><h3>請立即安全保存</h3><p>有效期限：${esc(new Date(result.expiresAt).toLocaleString())}</p><p class="generated-code-list">${result.codes.map(code=>`<strong>${esc(code)}</strong>`).join('<br>')}</p><small>離開此畫面後，後台不會再次顯示完整啟用碼。</small></article>`}catch(error){alert(error.message)}};
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',wait):wait();
})();
