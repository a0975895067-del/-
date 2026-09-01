(() => {
  const $ = selector => document.querySelector(selector);
  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[character]);
  let attempts = [];
  let current = null;
  let finalized = false;

  function reset() {
    attempts = [];
    current = null;
    finalized = false;
    $('#extendedReport')?.remove();
    $('#printReport')?.remove();
  }

  function ensureCurrent() {
    const tag = $('#tag')?.textContent.split('｜') || [];
    if (!current || current.question !== $('#question')?.textContent) {
      current = {
        question: $('#question')?.textContent || '',
        grade: tag[0] || '',
        unit: tag[1] || '',
        level: tag[2] || '',
        wrong: 0,
        hint: false,
      };
    }
    return current;
  }

  function recommendation(mastery) {
    if (mastery < 50) return '回到基礎例題，先口說已知條件與第一步；再重做本次錯題。';
    if (mastery < 80) return '重做使用提示或曾答錯的題目，再練習同單元的中等題。';
    return '可以進入跨單元與會考素養題，並試著說明每一步使用的理由。';
  }

  function summarize() {
    if (finalized || !attempts.length) return;
    finalized = true;
    const firstCorrect = attempts.filter(item => item.wrong === 0).length;
    const mastered = attempts.filter(item => item.wrong === 0 && !item.hint).length;
    const firstRate = Math.round(firstCorrect / attempts.length * 100);
    const mastery = Math.round(mastered / attempts.length * 100);
    const referenceBand = mastery >= 80 ? '觀念穩定' : mastery >= 50 ? '逐步建立中' : '需要優先複習';
    const units = {};
    for (const item of attempts) {
      const summary = units[item.unit] || (units[item.unit] = { count: 0, mastered: 0, wrong: 0, hints: 0 });
      summary.count += 1;
      summary.mastered += item.wrong === 0 && !item.hint ? 1 : 0;
      summary.wrong += item.wrong;
      summary.hints += item.hint ? 1 : 0;
    }
    const report = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      totalQuestions: attempts.length,
      correctAnswers: firstCorrect,
      firstRate,
      mastery,
      referenceBand,
      recommendation: recommendation(mastery),
      units,
      attempts: attempts.map(item => ({ ...item })),
    };
    window.MathLatestReport = report;

    let box = $('#extendedReport');
    if (!box) {
      box = document.createElement('div');
      box.id = 'extendedReport';
      box.className = 'diagnosis';
      $('#diagnosis')?.insertAdjacentElement('afterend', box);
    }
    const unitRows = Object.entries(units).map(([name, summary]) => {
      const value = Math.round(summary.mastered / summary.count * 100);
      return `${escapeHtml(name)}：${value}%（錯誤嘗試 ${summary.wrong} 次、提示 ${summary.hints} 次）`;
    }).join('<br>');
    box.innerHTML = `<strong>進階學習診斷</strong><br>`
      + `總題數：${attempts.length} 題<br>`
      + `首次作答正確：${firstCorrect} 題<br>`
      + `無提示內容掌握度：${mastery}%<br>`
      + `學習狀態：${referenceBand}<br>`
      + `<strong>各單元：</strong><br>${unitRows}<br>`
      + `<strong>建議：</strong>${escapeHtml(report.recommendation)}`;
  }

  function addText(parent, tagName, text) {
    const element = document.createElement(tagName);
    element.textContent = text;
    parent.append(element);
    return element;
  }

  function buildPrintReport(report) {
    $('#printReport')?.remove();
    const page = document.createElement('article');
    page.id = 'printReport';
    page.className = 'print-report';
    addText(page, 'h1', '數學學習分析報告');
    addText(page, 'p', `產生時間：${new Date(report.createdAt).toLocaleString('zh-TW')}`);
    addText(page, 'h2', '整體表現');
    addText(page, 'p', `總題數：${report.totalQuestions} 題｜首次作答正確：${report.correctAnswers} 題｜無提示掌握度：${report.mastery}%`);
    addText(page, 'p', `學習狀態：${report.referenceBand}`);
    addText(page, 'p', `後續建議：${report.recommendation}`);
    const note = addText(page, 'p', '本結果只用於安排後續複習，不排名，也不換算成考試分數。');
    note.className = 'print-note';

    addText(page, 'h2', '各單元掌握度');
    const table = document.createElement('table');
    const header = document.createElement('tr');
    for (const title of ['單元', '掌握度', '錯誤嘗試', '提示']) addText(header, 'th', title);
    table.append(header);
    for (const [name, summary] of Object.entries(report.units)) {
      const row = document.createElement('tr');
      addText(row, 'td', name);
      addText(row, 'td', `${Math.round(summary.mastered / summary.count * 100)}%`);
      addText(row, 'td', String(summary.wrong));
      addText(row, 'td', String(summary.hints));
      table.append(row);
    }
    page.append(table);

    const wrongItems = report.attempts.filter(item => item.wrong > 0).slice(0, 5);
    if (wrongItems.length) {
      addText(page, 'h2', '本次錯題回顧');
      const list = document.createElement('ol');
      for (const item of wrongItems) addText(list, 'li', `${item.unit}：${item.question}`);
      page.append(list);
    }
    document.body.append(page);
    return page;
  }

  function printReport() {
    const report = window.MathLatestReport;
    if (!report) return;
    buildPrintReport(report);
    window.print();
  }

  function addButtons() {
    if ($('#downloadReport')) return;
    const download = document.createElement('button');
    download.id = 'downloadReport';
    download.className = 'primary';
    download.type = 'button';
    download.textContent = '列印／另存自己的 PDF 報告';
    download.addEventListener('click', printReport);
    $('#restart')?.insertAdjacentElement('beforebegin', download);
  }

  document.addEventListener('click', event => {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.id === 'start') reset();
    if (target.id === 'hint') ensureCurrent().hint = true;
    if (target.closest('#answers')) {
      const item = ensureCurrent();
      setTimeout(() => {
        if (target.classList.contains('bad')) item.wrong += 1;
        if (target.classList.contains('good') && !attempts.includes(item)) attempts.push({ ...item });
      }, 0);
    }
    if (target.id === 'next') {
      setTimeout(() => {
        if (!$('#coach')?.classList.contains('hidden')) {
          summarize();
          addButtons();
        }
      }, 0);
    }
  });
})();
