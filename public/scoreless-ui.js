document.addEventListener('DOMContentLoaded',()=>{
 const slogan=document.querySelector('.eyebrow');
 if(slogan){slogan.innerHTML='<span>無論身在何處，都能用自己的步調認識數學；</span><span>帶著好奇心，輕鬆發現每一種可能。</span>';slogan.style.cssText='max-width:720px;margin:12px auto;font-size:1.28rem;font-weight:800;line-height:1.7;letter-spacing:.06em';}
 const intro=document.querySelector('.hero .intro');
 if(intro){intro.innerHTML='<span>像在戶外野餐一樣，找個舒服的位置，依照自己的步調慢慢讀、慢慢想。</span><span>這裡沒有趕路與比較，只有陪你安心探索的數學時光。</span>';intro.style.cssText='max-width:680px;margin:14px auto;font-size:1.16rem;font-weight:700;line-height:1.9';}
 document.querySelectorAll('.hero .eyebrow span,.hero .intro span').forEach((line,index)=>line.style.cssText=`display:block;width:100%;text-align:justify;text-align-last:center;text-justify:inter-character;${index%2?'margin-top:.18em':''}`);
 const gradeNotes=document.querySelectorAll('.grade-choices small');
 if(gradeNotes[1])gradeNotes[1].textContent='第三、四冊數學';
 if(gradeNotes[2])gradeNotes[2].textContent='第五、六冊數學';
 const rules=document.querySelector('#setup ol');
 if(rules)rules.innerHTML='<li>每題先選答案，再看結果。</li><li>畫面只呈現總題數與目前答對題數，不計分、不排名。</li><li>答錯時可看提示與原因，再重新整理想法。</li><li>完成後可向 AI 助手提問，並查看具體的個人學習建議。</li>';
 const result=document.querySelector('#score');
 if(result)result.textContent='目前答對 0 題';
});
