(() => {
  const $ = (selector) => document.querySelector(selector),
    esc = (value) =>
      String(value ?? '').replace(
        /[&<>"']/g,
        (char) =>
          ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
          })[char],
      );
  let csrfToken = '',
    user = null,
    reportView = { search: '', role: 'all', classCode: 'all' },
    state = {
      classes: [],
      assignments: [],
      reports: [],
      applications: [],
      teachers: [],
      users: [],
      students: {},
    };
  const base = () => String(window.MATH_API_BASE || '').replace(/\/$/, '');
  async function api(path, options = {}) {
    const response = await fetch(base() + path, {
      credentials: 'include',
      ...options,
      headers: {
        ...(options.body ? { 'content-type': 'application/json' } : {}),
        ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        ...(options.headers || {}),
      },
    });
    let data = {};
    try {
      data = await response.json();
    } catch {}
    if (!response.ok) throw new Error(data.error || '系統暫時無法處理。');
    return data;
  }
  const isDeveloper = () => user?.role === 'developer';
  window.MathAdminBridge = { api, getUser: () => user };
  async function load() {
    const core = await Promise.all([
      api('/api/classes'),
      api('/api/assignments'),
      api('/api/reports'),
    ]);
    state.classes = core[0].classes;
    state.assignments = core[1].assignments;
    state.reports = core[2].reports;
    if (isDeveloper()) {
      const extra = await Promise.all([
        api('/api/applications'),
        api('/api/teachers'),
        api('/api/users'),
      ]);
      state.applications = extra[0].applications;
      state.teachers = extra[1].teachers;
      state.users = extra[2].users;
    }
    state.students = {};
    await Promise.all(
      state.classes.map(async (cls) => {
        try {
          state.students[cls.id] = (
            await api(`/api/classes/${encodeURIComponent(cls.id)}/students`)
          ).students;
        } catch {
          state.students[cls.id] = [];
        }
      }),
    );
  }
  function setupTabs() {
    const items = [
      ['overview', '總覽'],
      ...(isDeveloper()
        ? [
            ['applications', '使用申請'],
            ['accounts', '帳號管理'],
          ]
        : []),
      ['classes', isDeveloper() ? '班級與教師' : '我的班級'],
      ['assignments', '作業派發'],
      ['analytics', '單元分析'],
      ['reports', '個別報告'],
    ];
    $('#tabs').innerHTML = items
      .map(
        (item, index) =>
          `<button type="button" data-tab="${item[0]}" class="${index ? '' : 'active'}">${item[1]}</button>`,
      )
      .join('');
    document
      .querySelectorAll('.panel')
      .forEach((panel) => panel.classList.remove('active'));
    $('#' + items[0][0]).classList.add('active');
    document.querySelectorAll('[data-tab]').forEach(
      (button) =>
        (button.onclick = () => {
          document
            .querySelectorAll('[data-tab]')
            .forEach((item) =>
              item.classList.toggle('active', item === button),
            );
          document
            .querySelectorAll('.panel')
            .forEach((panel) =>
              panel.classList.toggle('active', panel.id === button.dataset.tab),
            );
        }),
    );
  }
  function overview() {
    const students = new Set(
      Object.values(state.students)
        .flat()
        .map((row) => row.id),
    );
    $('#overview').innerHTML =
      `<h2>資料總覽</h2><div class="grid"><div class="metric"><span>可查看班級</span><strong>${state.classes.length}</strong></div><div class="metric"><span>學生人數</span><strong>${students.size}</strong></div><div class="metric"><span>測驗報告</span><strong>${state.reports.length}</strong></div><div class="metric"><span>已派作業</span><strong>${state.assignments.filter((row) => row.status === 'active').length}</strong></div>${isDeveloper() ? `<div class="metric"><span>待審申請</span><strong>${state.applications.filter((row) => row.status === 'pending').length}</strong></div>` : ''}</div>`;
  }
  function applications() {
    if (!isDeveloper()) return;
    $('#applications').innerHTML =
      `<h2>網站使用權限申請</h2><p>申請狀態為「待開發者核可」。開發者核准後，申請者可直接使用申請時設定的信箱與密碼登入，不需要驗證碼或第一次啟用碼。舊核准帳號若顯示「需補設密碼」，請申請者用原信箱重新送出補設密碼申請。</p>${
        state.applications.length
          ? state.applications
              .map((row) => {
                const lmStudent =
                  /^s(113|114|115)(0[1-9]|1\d|20)(0[1-9]|[12]\d|3\d|40)@lmjh\.tp\.edu\.tw$/i.test(
                    row.email,
                  ) && row.identity === '學生';
                const readiness =
                  row.status === 'approved'
                    ? row.accountReady
                      ? '已可登入'
                      : '需補設密碼'
                    : row.hasPendingPassword
                      ? '已安全設定密碼'
                      : '缺少密碼';
                return `<article class="item"><div class="item-head"><div><h3>${esc(row.email)}</h3><p>身分：${esc(row.identity)}<br>單位：${esc(row.workplace)}<br>申請說明：${esc(row.job_title)}</p><small>${esc(new Date(row.requested_at).toLocaleString())}</small></div><span class="badge">${row.status === 'pending' ? '待開發者核可' : esc(row.status)}｜${readiness}</span></div>${row.status === 'pending' ? `<div class="button-row"><button class="approve" data-review="${esc(row.id)}" data-role="${lmStudent ? 'student' : 'approved_user'}">${lmStudent ? '核准學生帳號' : '核准一般申請'}</button><button class="approve" data-review="${esc(row.id)}" data-role="teacher">核准教師</button><button class="danger" data-reject="${esc(row.id)}">拒絕</button></div>` : ''}</article>`;
              })
              .join('')
          : '<p>目前沒有申請。</p>'
      }`;
    document
      .querySelectorAll('[data-review]')
      .forEach(
        (button) =>
          (button.onclick = () =>
            review(button.dataset.review, 'approve', button.dataset.role)),
      );
    document
      .querySelectorAll('[data-reject]')
      .forEach(
        (button) =>
          (button.onclick = () =>
            review(button.dataset.reject, 'reject', 'approved_user')),
      );
  }
  async function review(id, action, role) {
    try {
      await api(`/api/applications/${encodeURIComponent(id)}/${action}`, {
        method: 'POST',
        body: JSON.stringify({ role }),
      });
      await refresh();
    } catch (error) {
      alert(error.message);
    }
  }
  function accounts() {
    if (!isDeveloper()) return;
    const roleName = {
      student: '學生',
      teacher: '教師',
      approved_user: '一般核准使用者',
    }, classOptions = (row) => `<option value="">未分班</option>${state.classes.map((cls) => `<option value="${esc(cls.id)}" ${String(row.classIds || '').split(',').includes(String(cls.id)) ? 'selected' : ''}>${esc(cls.code)} 班（${cls.grade}年級）</option>`).join('')}`;
    $('#accounts').innerHTML =
      `<h2>帳號、角色與分班管理</h2><p>只有開發者可更正信箱、變更角色與分班。儲存後該使用者會登出，必須以更正後的信箱重新登入；既有測驗報告會保留在同一帳號下。</p>${state.users.map((row) => `<article class="item"><div class="item-head"><div><h3>${esc(row.email)}</h3><p>目前角色：${esc(roleName[row.role] || row.role)}｜班級：${esc(row.classCodes || '未分班')}｜狀態：${esc(row.status)}</p></div></div><form class="form-grid account-editor" data-account-editor="${esc(row.id)}"><label>更正電子郵件<input name="email" type="email" maxlength="254" required value="${esc(row.email)}"></label><label>角色<select name="role"><option value="student" ${row.role === 'student' ? 'selected' : ''}>學生</option><option value="teacher" ${row.role === 'teacher' ? 'selected' : ''}>教師</option><option value="approved_user" ${row.role === 'approved_user' ? 'selected' : ''}>一般核准使用者</option></select></label><label>學生分班<select name="classId" ${row.role === 'student' ? '' : 'disabled'}>${classOptions(row)}</select></label><div class="button-row"><button class="primary" type="submit">儲存信箱、角色與分班</button><button class="danger" type="button" data-delete-account="${esc(row.id)}" data-account-email="${esc(row.email)}">永久刪除帳號</button></div></form></article>`).join('') || '<p>目前沒有可管理的學生、教師或一般使用者帳號。</p>'}`;
    document.querySelectorAll('[data-account-editor]').forEach((form) => {
      const role = form.elements.role, classField = form.elements.classId;
      role.onchange = () => { classField.disabled = role.value !== 'student'; };
      form.onsubmit = async (event) => {
        event.preventDefault();
        if (!confirm('確定儲存這個帳號的信箱、角色與分班嗎？')) return;
        try {
          await api(`/api/users/${encodeURIComponent(form.dataset.accountEditor)}`, { method: 'PATCH', body: JSON.stringify({ email: form.elements.email.value, role: role.value, classId: role.value === 'student' ? classField.value : '' }) });
          await refresh(); alert('帳號資料已更新；該使用者需以目前信箱重新登入。');
        } catch (error) { alert(error.message); }
      };
    });
    document.querySelectorAll('[data-delete-account]').forEach(
      (button) =>
        (button.onclick = async () => {
          const email = button.dataset.accountEmail;
          const typed = prompt(
            `此操作無法復原，並會刪除相關個人資料與學生報告。\n\n請完整輸入要刪除的信箱以確認：\n${email}`,
          );
          if (typed !== email)
            return typed === null
              ? undefined
              : alert('輸入的信箱不相符，未執行刪除。');
          if (!confirm(`最後確認：永久刪除 ${email}？`)) return;
          try {
            await api(
              `/api/users/${encodeURIComponent(button.dataset.deleteAccount)}`,
              { method: 'DELETE' },
            );
            await refresh();
            alert('帳號與相關個人資料已永久刪除。');
          } catch (error) {
            alert(error.message);
          }
        }),
    );
  }
  function classes() {
    const teacherOptions = state.teachers
      .map(
        (row) => `<option value="${esc(row.email)}">${esc(row.email)}</option>`,
      )
      .join('');
    $('#classes').innerHTML =
      `<h2>${isDeveloper() ? '班級與教師指派' : '我的班級名單'}</h2>${state.classes.map((cls) => `<article class="item"><div class="item-head"><div><h3>${esc(cls.code)} 班</h3><p>${cls.grade} 年級｜教師：${esc(cls.teacher_email || user.email || '尚未指派')}</p></div><span class="badge">${(state.students[cls.id] || []).length} 人</span></div>${isDeveloper() ? `<div class="form-grid"><label>指派已核准教師<select data-teacher-select="${esc(cls.id)}"><option value="">請選擇</option>${teacherOptions}</select></label><div><button class="primary" type="button" data-assign-teacher="${esc(cls.id)}">儲存指派</button></div></div>` : ''}<details><summary>查看學生名單</summary><table><tr><th>座號</th><th>學生信箱</th></tr>${(state.students[cls.id] || []).map((student) => `<tr><td>${student.seat_number ?? ''}</td><td>${esc(student.email)}</td></tr>`).join('') || '<tr><td colspan="2">尚無學生</td></tr>'}</table></details></article>`).join('') || '<p>目前沒有可查看班級。</p>'}`;
    document.querySelectorAll('[data-assign-teacher]').forEach(
      (button) =>
        (button.onclick = async () => {
          const select = document.querySelector(
            `[data-teacher-select="${CSS.escape(button.dataset.assignTeacher)}"]`,
          );
          if (!select?.value) return;
          try {
            await api(
              `/api/classes/${encodeURIComponent(button.dataset.assignTeacher)}/teacher`,
              {
                method: 'PATCH',
                body: JSON.stringify({ teacherEmail: select.value }),
              },
            );
            await refresh();
          } catch (error) {
            alert(error.message);
          }
        }),
    );
  }
  function studentMoves() {
    if (!isDeveloper()) return;
    const rows = state.classes.flatMap((source) =>
      (state.students[source.id] || []).map((student) => ({ source, student })),
    );
    const panel = document.createElement('section');
    panel.className = 'item';
    panel.innerHTML = `<h3>移動學生班級</h3><p>只有開發者可操作；系統只允許移至相同年級，並會留下稽核紀錄。</p>${
      rows
        .map(
          ({ source, student }) =>
            `<div class="form-grid"><label>${esc(student.email)}（目前 ${esc(source.code)} 班）<select data-student-target="${esc(student.id)}">${state.classes
              .filter(
                (target) =>
                  Number(target.grade) === Number(source.grade) &&
                  target.id !== source.id,
              )
              .map(
                (target) =>
                  `<option value="${esc(target.id)}">移至 ${esc(target.code)} 班</option>`,
              )
              .join(
                '',
              )}</select></label><div><button type="button" data-move-student="${esc(student.id)}">確認移動</button></div></div>`,
        )
        .join('') || '<p>目前沒有學生資料。</p>'
    }`;
    $('#classes').appendChild(panel);
    panel.querySelectorAll('[data-move-student]').forEach(
      (button) =>
        (button.onclick = async () => {
          const select = panel.querySelector(
            `[data-student-target="${CSS.escape(button.dataset.moveStudent)}"]`,
          );
          if (!select?.value) return alert('沒有可移入的同年級班級。');
          if (!confirm('確定要移動這位學生嗎？')) return;
          try {
            await api(
              `/api/students/${encodeURIComponent(button.dataset.moveStudent)}/class`,
              {
                method: 'PATCH',
                body: JSON.stringify({ classId: select.value }),
              },
            );
            await refresh();
          } catch (error) {
            alert(error.message);
          }
        }),
    );
  }
  function customClassCreator() {
    if (!isDeveloper()) return;
    const panel = document.createElement('section');
    panel.className = 'item';
    panel.innerHTML =
      '<h3>新增自訂學習班級</h3><p>適用於重考生、自學生、跨校學生及先修生。請依實際練習內容選擇年級程度。</p><form id="customClassForm" class="form-grid"><label>班級名稱<input id="customClassCode" required maxlength="40" placeholder="例如：九年級重考複習班"></label><label>課程程度<select id="customClassGrade"><option value="7">七年級</option><option value="8">八年級</option><option value="9">九年級</option></select></label><button class="primary full" type="submit">建立空白班級</button></form>';
    $('#classes').prepend(panel);
    $('#customClassForm').onsubmit = async (event) => {
      event.preventDefault();
      try {
        await api('/api/classes', {
          method: 'POST',
          body: JSON.stringify({
            code: $('#customClassCode').value,
            grade: Number($('#customClassGrade').value),
          }),
        });
        await refresh();
      } catch (error) {
        alert(error.message);
      }
    };
  }
  function assignments() {
    const classOptions = state.classes
        .map(
          (cls) =>
            `<option value="${esc(cls.id)}">${esc(cls.code)} 班（${cls.grade}年級）</option>`,
        )
        .join(''),
      curricula = window.MathRemediation?.curricula || {};
    $('#assignments').innerHTML =
      `<h2>派發題目或功課</h2><p>可安排先備知識診斷、本單元加強、先備＋本單元兩份練習，或錯題再練。選擇後會顯示派題理由，送出前仍可調整難度與題數。</p><form id="assignmentForm" class="form-grid"><label>作業名稱<input id="assignmentTitle" required maxlength="120" placeholder="例如：畢氏定理課前暖身"></label><label>班級<select id="assignmentClass" required>${classOptions}</select></label><label>作業目的<select id="assignmentMode"><option value="target">本單元加強</option><option value="prerequisite">先備知識診斷</option><option value="mixed">先備＋本單元綜合（派兩份）</option><option value="wrong">錯題再練</option></select></label><label>目標單元<select id="assignmentUnit" required></select></label><label>難度<select id="assignmentLevel"><option value="easy">易</option><option value="medium">中</option><option value="hard">難</option></select></label><label>題數<select id="assignmentCount"><option>10</option><option>15</option><option>20</option></select></label><label>期限<input id="assignmentDue" type="date"></label><aside id="assignmentSuggestion" class="assignment-suggestion full" aria-live="polite"></aside><button class="primary full" type="submit">確認並派發作業</button></form>${state.assignments.map((row) => `<article class="item"><div class="item-head"><div><h3>${esc(row.title)}</h3><p>${row.grade}年級｜${esc(row.unit)}｜${esc(row.level)}｜${row.question_count}題</p></div><span class="badge">${esc(row.status)}</span></div>${row.status === 'active' ? `<div class="button-row"><button class="danger" data-archive="${esc(row.id)}">停止派發</button></div>` : ''}</article>`).join('')}`;
    const classSelect = $('#assignmentClass'),
      unitSelect = $('#assignmentUnit'),
      modeSelect = $('#assignmentMode'),
      levelSelect = $('#assignmentLevel'),
      countSelect = $('#assignmentCount'),
      currentClass = () =>
        state.classes.find((cls) => String(cls.id) === classSelect.value),
      syncUnits = () => {
        const grade = Number(currentClass()?.grade || 7),
          units = curricula[grade] || [];
        unitSelect.innerHTML = units
          .map((unit) => `<option value="${esc(unit)}">${esc(unit)}</option>`)
          .join('');
        syncSuggestion();
      },
      syncSuggestion = () => {
        const grade = Number(currentClass()?.grade || 7),
          unit = unitSelect.value,
          prior =
            window.MathRemediation?.prerequisiteUnit?.(grade, unit) || unit,
          mode = modeSelect.value,
          names = {
            target: '本單元加強',
            prerequisite: '先備知識診斷',
            mixed: '先備＋本單元綜合',
            wrong: '錯題再練',
          };
        if (mode === 'prerequisite') {
          levelSelect.value = 'easy';
          countSelect.value = '10';
        } else if (mode === 'mixed') {
          levelSelect.value = 'medium';
          countSelect.value = '10';
        } else if (mode === 'wrong') {
          levelSelect.value = 'medium';
          countSelect.value = '10';
        }
        $('#assignmentSuggestion').innerHTML =
          `<strong>${names[mode]}</strong><br>${mode === 'prerequisite' ? `先練「${esc(prior)}」，確認進入「${esc(unit)}」前需要的基礎。` : mode === 'mixed' ? prior === unit ? `「${esc(unit)}」本身就是此年級的基礎入口，系統只會派一份由易到中的練習，避免重複作業。` : `系統會分別派出「${esc(prior)}」與「${esc(unit)}」兩份作業，避免一張作業同時混入不同單元。` : mode === 'wrong' ? `使用「${esc(unit)}」的新題再次檢查觀念；不重送學生剛才看過的原題。` : `針對「${esc(unit)}」由目前選定難度繼續練習。`}`;
      };
    classSelect.onchange = syncUnits;
    unitSelect.onchange = syncSuggestion;
    modeSelect.onchange = syncSuggestion;
    syncUnits();
    $('#assignmentForm').onsubmit = async (event) => {
      event.preventDefault();
      const cls = currentClass(),
        grade = Number(cls?.grade || 7),
        target = unitSelect.value,
        prior =
          window.MathRemediation?.prerequisiteUnit?.(grade, target) || target,
        mode = modeSelect.value,
        title = $('#assignmentTitle').value,
        common = {
          classId: classSelect.value,
          level: levelSelect.value,
          questionCount: Number(countSelect.value),
          dueAt: $('#assignmentDue').value || null,
        },
        jobs =
          mode === 'mixed' && prior !== target
            ? [
                {
                  ...common,
                  title: `${title}｜先備`,
                  unit: prior,
                  level: 'easy',
                },
                { ...common, title: `${title}｜本單元`, unit: target },
              ]
            : [
                {
                  ...common,
                  title: `${title}${mode === 'wrong' ? '｜錯題再練' : mode === 'mixed' ? '｜基礎與本單元' : ''}`,
                  unit: mode === 'prerequisite' ? prior : target,
                },
              ];
      try {
        for (const payload of jobs)
          await api('/api/assignments', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
        await refresh();
      } catch (error) {
        alert(error.message);
      }
    };
    document.querySelectorAll('[data-archive]').forEach(
      (button) =>
        (button.onclick = async () => {
          try {
            await api(
              `/api/assignments/${encodeURIComponent(button.dataset.archive)}`,
              { method: 'PATCH', body: JSON.stringify({ status: 'archived' }) },
            );
            await refresh();
          } catch (error) {
            alert(error.message);
          }
        }),
    );
  }
  function analytics() {
    const units = {},
      questions = {},
      cohorts = {},
      learners = new Set(),
      pct = (part, total) => (total ? Math.round((part / total) * 100) : 0),
      levelName = {
        easy: '易',
        medium: '中',
        hard: '難',
        易: '易',
        中: '中',
        難: '難',
      };
    state.reports.forEach((report) => {
      learners.add(report.student_id);
      const roleLabel = ({ student: '學生', teacher: '教師', approved_user: '一般核准使用者' })[report.student_role] || report.student_role || '未標示角色',
        classLabel = report.class_codes || '未分班',
        cohortKey = `${roleLabel}|${classLabel}`,
        cohort = cohorts[cohortKey] || (cohorts[cohortKey] = { roleLabel, classLabel, reports: 0, attempts: 0, needs: 0, learners: new Set() });
      cohort.reports++;
      cohort.learners.add(report.student_id);
      (report.attempts || []).forEach((attempt) => {
        const grade = Number(report.grade) || '',
          unit = String(attempt.unit || '未標示單元'),
          question = String(attempt.question || '未保留題目內容')
            .replace(/\s+/g, ' ')
            .trim(),
          level = levelName[attempt.level] || attempt.level || '未標示',
          wrong = Math.max(0, Number(attempt.wrong || 0)),
          hint = Boolean(attempt.hint),
          needs = wrong > 0 || hint,
          unitKey = `${grade}|${unit}`,
          questionKey = `${grade}|${unit}|${level}|${question}`,
          unitRow =
            units[unitKey] ||
            (units[unitKey] = {
              grade,
              unit,
              count: 0,
              clean: 0,
              mistaken: 0,
              needs: 0,
              wrong: 0,
              hints: 0,
              students: new Set(),
            }),
          questionRow =
            questions[questionKey] ||
            (questions[questionKey] = {
              grade,
              unit,
              level,
              question,
              count: 0,
              clean: 0,
              mistaken: 0,
              needs: 0,
              wrong: 0,
              hints: 0,
              students: new Set(),
            });
        cohort.attempts++;
        cohort.needs += needs ? 1 : 0;
        for (const row of [unitRow, questionRow]) {
          row.count++;
          row.clean += wrong === 0 && !hint ? 1 : 0;
          row.mistaken += wrong > 0 ? 1 : 0;
          row.needs += needs ? 1 : 0;
          row.wrong += wrong;
          row.hints += hint ? 1 : 0;
          row.students.add(report.student_id);
        }
      });
    });
    const unitRows = Object.values(units).sort(
        (a, b) => b.needs / b.count - a.needs / a.count || b.count - a.count,
      ),
      questionRows = Object.values(questions).sort(
        (a, b) =>
          b.needs / b.count - a.needs / a.count ||
          b.wrong - a.wrong ||
          b.count - a.count,
      ),
      cohortRows = Object.values(cohorts).sort((a, b) => b.needs / Math.max(1, b.attempts) - a.needs / Math.max(1, a.attempts) || b.reports - a.reports),
      totalAnswers = questionRows.reduce((sum, row) => sum + row.count, 0),
      totalNeeds = questionRows.reduce((sum, row) => sum + row.needs, 0),
      priority = (row) => {
        const rate = pct(row.needs, row.count);
        return rate >= 70
          ? '<span class="risk high">優先加強</span>'
          : rate >= 40
            ? '<span class="risk medium">持續觀察</span>'
            : '<span class="risk low">目前穩定</span>';
      };
    $('#analytics').innerHTML =
      `<div class="item-head"><div><h2>${isDeveloper() ? '全站題目統整分析' : '班級題目統整分析'}</h2><p>${isDeveloper() ? '開發者統計會納入所有角色、所有班級與未分班使用者的全部報告。' : '依目前教師可查看的班級報告統計。'}「需加強」表示該次作答曾答錯或使用提示，不以考試分數排名。</p></div><button id="refreshAnalytics" type="button">重新整理分析</button></div><div class="grid analytics-metrics"><div class="metric"><span>納入報告</span><strong>${state.reports.length}</strong></div><div class="metric"><span>作答使用者</span><strong>${learners.size}</strong></div><div class="metric"><span>累計作答題次</span><strong>${totalAnswers}</strong></div><div class="metric"><span>需回顧題次</span><strong>${totalNeeds}</strong><small>${pct(totalNeeds, totalAnswers)}%</small></div></div>${isDeveloper() ? `<details class="analysis-block" open><summary>角色與分班歸類統計</summary><table><tr><th>角色</th><th>班級狀態</th><th>使用者數</th><th>報告數</th><th>作答題次</th><th>需加強題次</th><th>需加強率</th></tr>${cohortRows.map((row) => `<tr><td>${esc(row.roleLabel)}</td><td>${esc(row.classLabel)}</td><td>${row.learners.size}</td><td>${row.reports}</td><td>${row.attempts}</td><td>${row.needs}</td><td>${pct(row.needs, row.attempts)}%</td></tr>`).join('') || '<tr><td colspan="7">尚無可統計資料。</td></tr>'}</table></details>` : ''}<details class="analysis-block" open><summary>單元統整（由需加強率排序）</summary><table><tr><th>年級</th><th>單元</th><th>學生數</th><th>作答題次</th><th>一次答對率</th><th>需加強率</th><th>錯誤嘗試</th><th>提示</th><th>教學判讀</th></tr>${unitRows.map((row) => `<tr><td>${row.grade}</td><td class="wrap-cell">${esc(row.unit)}</td><td>${row.students.size}</td><td>${row.count}</td><td>${pct(row.clean, row.count)}%</td><td>${pct(row.needs, row.count)}%</td><td>${row.wrong}</td><td>${row.hints}</td><td>${priority(row)}</td></tr>`).join('') || '<tr><td colspan="9">尚無可統計的作答資料。</td></tr>'}</table></details><details class="analysis-block" open><summary>逐題統整（最需要回顧的題目優先）</summary><p class="analysis-note">相同年級、單元、難度及題目文字會合併計算；新完成的測驗會同時保留易、中、難標示。</p><table><tr><th>年級</th><th>單元</th><th>難度</th><th>題目</th><th>學生數</th><th>出現次數</th><th>一次答對率</th><th>曾答錯率</th><th>提示率</th><th>教學判讀</th></tr>${
        questionRows
          .slice(0, 300)
          .map(
            (row) =>
              `<tr><td>${row.grade}</td><td class="wrap-cell">${esc(row.unit)}</td><td>${esc(row.level)}</td><td class="question-cell">${esc(row.question)}</td><td>${row.students.size}</td><td>${row.count}</td><td>${pct(row.clean, row.count)}%</td><td>${pct(row.mistaken, row.count)}%</td><td>${pct(row.hints, row.count)}%</td><td>${priority(row)}</td></tr>`,
          )
          .join('') || '<tr><td colspan="10">尚無可統計的逐題資料。</td></tr>'
      }</table>${questionRows.length > 300 ? `<p class="analysis-note">目前先顯示最需加強的 300 組題目，共 ${questionRows.length} 組。</p>` : ''}</details>`;
    $('#refreshAnalytics').onclick = refresh;
  }
  function reports() {
    const reportRoleName = { student: '學生', teacher: '教師', approved_user: '一般核准使用者' },
      studentById = new Map(
        Object.values(state.students)
          .flat()
          .map((row) => [row.id, row]),
      ),
      reported = new Set(state.reports.map((row) => row.student_id)),
      learners = isDeveloper() ? state.users : [],
      waiting = learners.filter((row) => !reported.has(row.id)),
      unassignedReports = state.reports.filter((row) => !row.class_codes).length,
      approvedUserReports = state.reports.filter((row) => row.student_role === 'approved_user').length,
      roleOptions = [...new Set([
        'student',
        'teacher',
        'approved_user',
        ...state.users.map((row) => row.role || 'unmarked'),
        ...state.reports.map((row) => row.student_role || 'unmarked'),
      ])],
      classOptions = [...new Set([
        ...state.classes.map((row) => row.code),
        ...state.users.flatMap((row) => String(row.classCodes || '').split(',').map((value) => value.trim()).filter(Boolean)),
        ...state.reports.flatMap((row) => String(row.class_codes || '').split(',').map((value) => value.trim()).filter(Boolean)),
        'unassigned',
      ])],
      roleCoverage = roleOptions.map((role) => ({
        role,
        accounts: state.users.filter((row) => (row.role || 'unmarked') === role).length,
        reports: state.reports.filter((row) => (row.student_role || 'unmarked') === role).length,
      })),
      classCoverage = classOptions.map((classCode) => {
        const accountRows = state.users.filter((row) => {
            const codes = String(row.classCodes || '').split(',').map((value) => value.trim()).filter(Boolean);
            return classCode === 'unassigned' ? codes.length === 0 : codes.includes(classCode);
          }),
          reportRows = state.reports.filter((row) => {
            const codes = String(row.class_codes || '').split(',').map((value) => value.trim()).filter(Boolean);
            return classCode === 'unassigned' ? codes.length === 0 : codes.includes(classCode);
          });
        return {
          classCode,
          accounts: accountRows.length,
          reports: reportRows.length,
          roles: [...new Set(accountRows.map((row) => reportRoleName[row.role] || row.role))].join('、') || '尚無帳號',
        };
      }),
      visibleReports = state.reports.filter((report) => {
        const email = report.student_email || studentById.get(report.student_id)?.email || '',
          role = report.student_role || 'unmarked',
          classCode = report.class_codes || 'unassigned',
          search = reportView.search.trim().toLowerCase();
        return (reportView.role === 'all' || reportView.role === role) &&
          (reportView.classCode === 'all' || reportView.classCode === classCode) &&
          (!search || `${email} ${report.student_id}`.toLowerCase().includes(search));
      }),
      seconds = (value) => {
        const total = Math.max(0, Math.round(Number(value || 0) / 1000));
        return total < 60
          ? `${total} 秒`
          : `${Math.floor(total / 60)} 分 ${total % 60} 秒`;
      },
      attemptDetails = (attempt, index) => {
        const timeline = Array.isArray(attempt.timeline)
            ? attempt.timeline
            : [],
          options = Array.isArray(attempt.options) ? attempt.options : [];
        return `<details class="question-process"><summary>第 ${Number(attempt.index || index + 1)} 題｜${esc(attempt.unit || '未標示單元')}｜${esc(attempt.level || '未標示難度')}</summary><div class="question-process-body"><h4>題目</h4><p class="process-question">${esc(attempt.question || '舊版報告未保留題目文字')}</p>${options.length ? `<h4>當時的選項</h4><ol class="option-list" type="A">${options.map((option) => `<li>${esc(option)}</li>`).join('')}</ol>` : ''}<h4>作答歷程</h4>${timeline.length ? `<ol class="answer-timeline">${timeline.map((step) => `<li><span class="answer-state ${step.correct ? 'correct' : 'wrong'}">${step.correct ? '答對' : '答錯'}</span><strong>${esc(step.selectedOption || `選項 ${Number(step.selectedIndex) + 1}`)}</strong><small>題目出現後 ${seconds(step.elapsedMs)}</small></li>`).join('')}</ol><p><strong>最後正確答案：</strong>${esc(attempt.correctOption || timeline.find((step) => step.correct)?.selectedOption || '未記錄')}</p><p><strong>本題總作答時間：</strong>${seconds(attempt.durationMs)}</p><p><strong>提示：</strong>${attempt.hint ? `有使用（題目出現後 ${seconds(attempt.hintAtMs)}）` : '未使用'}${attempt.hintText ? `｜${esc(attempt.hintText)}` : ''}</p><p><strong>查看原因：</strong>${attempt.explanationViewed ? `有查看（題目出現後 ${seconds(attempt.explanationAtMs)}）` : '未查看'}</p>` : `<p class="legacy-note">這是功能更新前建立的舊報告，當時尚未記錄每次點選、選項與作答時間；仍可查看原有的錯誤次數與提示紀錄。</p><p>錯誤嘗試：${Number(attempt.wrong || 0)} 次｜${attempt.hint ? '曾使用提示' : '未使用提示'}</p>`}</div></details>`;
      };
    const conceptDetails = (attempt) => {
      if (!(Number(attempt.wrong || 0) > 0 || attempt.hint)) return '';
      const analysis = window.MathRemediation?.analyze?.(attempt);
      if (!analysis) return '';
      return `<section class="concept-analysis"><h4>觀念分析與下一步</h4>${analysis.wrongChoices.length ? `<p><strong>學生曾選錯：</strong>${analysis.wrongChoices.map(esc).join('、')}</p>` : ''}<p><strong>可能的學習卡點：</strong>${esc(analysis.misconception)}</p><p><strong>建議先確認：</strong>${esc(analysis.prerequisites)}</p><p><strong>建議練習單元：</strong>${esc(analysis.suggestedUnit)}</p><p><strong>建議題型：</strong>${analysis.suggestedQuestions.map(esc).join('、')}</p><small>${esc(analysis.caution)}</small></section>`;
    };
    $('#reports').innerHTML =
      `<div class="item-head"><div><h2>${isDeveloper() ? '全體使用者完整檢測報告' : '我的班級測驗報告'}</h2><p>已收到 ${state.reports.length} 份報告。${isDeveloper() ? `所有角色及未分班報告都會顯示，報告不會因尚未分班而隱藏；其中未分班 ${unassignedReports} 份、一般核准使用者 ${approvedUserReports} 份。沒有完成測驗或尚未成功上傳者，也會在涵蓋狀態中標示「尚無報告」。` : ''}展開報告即可逐題查看題目、選項、點選順序、答對／答錯、提示、原因與作答時間。</p></div><button id="refreshReports" type="button">重新整理報告</button></div>${isDeveloper() ? `<div class="report-filters" aria-label="報告歸類篩選"><label>搜尋信箱或識別碼<input id="reportSearch" value="${esc(reportView.search)}" placeholder="輸入關鍵字"></label><label>角色<select id="reportRole"><option value="all">全部角色</option>${roleOptions.map((value) => `<option value="${esc(value)}" ${reportView.role === value ? 'selected' : ''}>${esc(reportRoleName[value] || (value === 'unmarked' ? '未標示角色' : value))}</option>`).join('')}</select></label><label>分班<select id="reportClass"><option value="all">全部班級</option>${classOptions.map((value) => `<option value="${esc(value)}" ${reportView.classCode === value ? 'selected' : ''}>${esc(value === 'unassigned' ? '未分班' : value)}</option>`).join('')}</select></label><div class="filter-result"><strong>${visibleReports.length}</strong><span>份符合條件</span></div></div><details class="analysis-block coverage-block" open><summary>所有角色與班級的報告涵蓋狀態</summary><div class="coverage-tables"><table><caption>角色涵蓋</caption><tr><th>角色</th><th>帳號數</th><th>報告數</th><th>狀態</th></tr>${roleCoverage.map((row) => `<tr><td>${esc(reportRoleName[row.role] || (row.role === 'unmarked' ? '未標示角色' : row.role))}</td><td>${row.accounts}</td><td>${row.reports}</td><td>${row.reports ? '已有報告' : '尚無報告'}</td></tr>`).join('')}</table><table><caption>班級涵蓋</caption><tr><th>班級</th><th>帳號數</th><th>報告數</th><th>角色／狀態</th></tr>${classCoverage.map((row) => `<tr><td>${esc(row.classCode === 'unassigned' ? '未分班' : row.classCode)}</td><td>${row.accounts}</td><td>${row.reports}</td><td>${esc(row.roles)}｜${row.reports ? '已有報告' : '尚無報告'}</td></tr>`).join('')}</table></div></details>` : ''}${isDeveloper() && waiting.length ? `<details class="item"><summary>${waiting.length} 位使用者尚無報告</summary><p>以下帳號尚無已完成並成功上傳的測驗報告：</p><ul>${waiting.map((row) => `<li>${esc(row.email)}｜${esc(reportRoleName[row.role] || row.role)}${row.classCodes ? `｜${esc(row.classCodes)} 班` : '｜未分班'}</li>`).join('')}</ul></details>` : ''}${
        visibleReports
          .map((report) => {
            const student = studentById.get(report.student_id),
              email =
                report.student_email ||
                student?.email ||
                `學生識別碼 ${String(report.student_id).slice(0, 10)}…`,
              classInfo =
                report.class_codes || student?.classCodes || '尚未分班';
            const reportRole = reportRoleName[report.student_role || student?.role] || report.student_role || student?.role || (isDeveloper() ? '未標示角色' : '學生');
            return `<article class="item report-item"><div class="item-head"><div><h3>${esc(email)}</h3><p>角色：${esc(reportRole)}｜分班：${esc(classInfo)}｜${report.grade}年級｜總題數 ${report.total_questions}｜首次答對 ${report.first_correct}｜提示 ${report.hints_used}</p><small>${esc(new Date(report.created_at).toLocaleString())}</small></div>${isDeveloper() && state.users.some((row) => row.id === report.student_id) ? `<button type="button" class="manage-account" data-manage-account="${esc(report.student_id)}">修正此人的信箱、角色或分班</button>` : ''}</div><details><summary>查看完整測驗與逐題作答歷程</summary><table><tr><th>單元</th><th>題數</th><th>錯誤</th><th>提示</th></tr>${Object.entries(
              report.unitSummary || {},
            )
              .map(
                ([name, value]) =>
                  `<tr><td>${esc(name)}</td><td>${Number(value.count || 0)}</td><td>${Number(value.wrong || 0)}</td><td>${Number(value.hints || 0)}</td></tr>`,
              )
              .join(
                '',
              )}</table>${(report.attempts || []).map((attempt, index) => attemptDetails(attempt, index) + conceptDetails(attempt)).join('')}</details></article>`;
          })
          .join('') || `<p>目前篩選的「${esc(reportView.role === 'all' ? '全部角色' : reportRoleName[reportView.role] || reportView.role)}／${esc(reportView.classCode === 'all' ? '全部班級' : reportView.classCode === 'unassigned' ? '未分班' : reportView.classCode)}」尚無已完成並成功上傳的報告。</p>`
      }`;
    $('#refreshReports').onclick = refresh;
    if (isDeveloper()) {
      const applyFilter = () => {
        reportView = { search: $('#reportSearch').value, role: $('#reportRole').value, classCode: $('#reportClass').value };
        reports();
      };
      $('#reportSearch').onchange = applyFilter;
      $('#reportSearch').onkeydown = (event) => { if (event.key === 'Enter') applyFilter(); };
      $('#reportRole').onchange = applyFilter;
      $('#reportClass').onchange = applyFilter;
      document.querySelectorAll('[data-manage-account]').forEach((button) => {
        button.onclick = () => {
          document.querySelector('[data-tab="accounts"]')?.click();
          const editor = document.querySelector(`[data-account-editor="${CSS.escape(button.dataset.manageAccount)}"]`);
          editor?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          editor?.classList.add('account-highlight');
          setTimeout(() => editor?.classList.remove('account-highlight'), 2200);
        };
      });
    }
  }
  function render() {
    setupTabs();
    overview();
    applications();
    accounts();
    classes();
    customClassCreator();
    studentMoves();
    assignments();
    analytics();
    reports();
  }
  async function refresh() {
    await load();
    render();
  }
  async function init() {
    try {
      user = (await api('/api/me')).user;
      if (!['teacher', 'developer'].includes(user.role))
        throw new Error('此帳號沒有教師或開發者權限。');
      csrfToken = (await api('/api/auth/csrf')).csrfToken;
      $('#who').textContent =
        `${user.email}（${isDeveloper() ? '開發者' : '學校教師'}）`;
      $('#dashTitle').textContent = isDeveloper()
        ? '開發者全校管理中心'
        : '教師班級管理中心';
      await load();
      $('#loading').classList.add('hidden');
      $('#app').classList.remove('hidden');
      render();
    } catch (error) {
      $('#loading').classList.add('hidden');
      $('#denied').classList.remove('hidden');
      $('#deniedMessage').textContent = error.message;
    }
  }
  document.readyState === 'loading'
    ? document.addEventListener('DOMContentLoaded', init)
    : init();
})();
