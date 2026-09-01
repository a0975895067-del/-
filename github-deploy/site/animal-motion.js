(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const between = (min, max) => min + Math.random() * (max - min);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const facing = direction => direction > 0 ? -1 : 1;
  const motionFacing = (el, direction) => el.classList.contains('head-led') ? (direction > 0 ? 1 : -1) : facing(direction);

  function limits(el, flying = false) {
    const margin = 10;
    const width = Math.max(120, innerWidth - el.offsetWidth - margin);
    const height = Math.max(120, innerHeight - el.offsetHeight - margin);
    return flying
      ? { minX: margin, maxX: width, minY: 35, maxY: Math.max(90, height * .62) }
      : { minX: margin, maxX: width, y: Math.max(70, height - between(8, 34)) };
  }

  async function play(el, frames, options) {
    const animation = el.animate(frames, { fill: 'forwards', ...options });
    try { await animation.finished; } catch (_) { return; }
    const last = frames[frames.length - 1];
    Object.keys(last).forEach(key => {
      if (!['offset', 'easing', 'composite'].includes(key)) el.style[key] = last[key];
    });
    animation.cancel();
  }

  function prepare(el) {
    el.style.animation = 'none';
    el.style.left = '0';
    el.style.right = 'auto';
    el.style.top = '0';
    el.style.bottom = 'auto';
    el.style.transformOrigin = '50% 82%';
  }

  async function fly(el, mode = 'glide') {
    prepare(el);
    let area = limits(el, true);
    let x = between(area.minX, area.maxX), y = between(area.minY, area.maxY);
    el.style.transform = `translate3d(${x}px,${y}px,0)`;
    while (el.isConnected) {
      area = limits(el, true);
      let tx = between(area.minX, area.maxX), ty = between(area.minY, area.maxY);
      if (Math.abs(tx - x) < innerWidth * .18) tx = clamp(x + (Math.random() < .5 ? -1 : 1) * between(innerWidth * .22, innerWidth * .48), area.minX, area.maxX);
      const dir = tx >= x ? 1 : -1, sx = motionFacing(el, dir);
      const mx = (x + tx) / 2 + between(-70, 70);
      const my = clamp((y + ty) / 2 + between(-75, 75), area.minY, area.maxY);
      const duration = mode === 'flutter' ? between(2600, 5200) : between(4200, 7600);
      await play(el, [
        { transform: `translate3d(${x}px,${y}px,0) scaleX(${sx}) translateY(0)`, offset: 0 },
        { transform: `translate3d(${(x+mx)/2}px,${(y+my)/2}px,0) scaleX(${sx}) translateY(-4px)`, offset: .26 },
        { transform: `translate3d(${mx}px,${my}px,0) scaleX(${sx}) translateY(2px)`, offset: .54 },
        { transform: `translate3d(${(mx+tx)/2}px,${(my+ty)/2}px,0) scaleX(${sx}) translateY(-3px)`, offset: .78 },
        { transform: `translate3d(${tx}px,${ty}px,0) scaleX(${sx}) translateY(0)`, offset: 1 }
      ], { duration, easing: mode === 'flutter' ? 'ease-in-out' : 'cubic-bezier(.35,.05,.25,1)' });
      x = tx; y = ty;
      await wait(between(mode === 'flutter' ? 250 : 700, mode === 'flutter' ? 1200 : 2300));
    }
  }

  async function hop(el, kind) {
    prepare(el);
    let area = limits(el), x = between(area.minX, area.maxX), dir = Math.random() < .5 ? 1 : -1;
    let y = area.y;
    el.style.transform = `translate3d(${x}px,${y}px,0) scaleX(${motionFacing(el, dir)})`;
    while (el.isConnected) {
      area = limits(el); y = area.y;
      if (x > area.maxX - 90) dir = -1;
      if (x < area.minX + 90) dir = 1;
      const distance = kind === 'frog' ? between(48, 88) : between(65, 130);
      const tx = clamp(x + dir * distance, area.minX, area.maxX);
      const height = kind === 'frog' ? between(14, 26) : between(10, 20);
      const sx = motionFacing(el, dir);
      const hindLeg = kind === 'frog' ? el.querySelector('.cute-frog-hind-leg') : null;
      const frogBody = kind === 'frog' ? el.querySelector('.cute-frog-body') : null;
      const frogSprite = kind === 'frog' ? el.querySelector('.frog-sprite') : null;
      if (hindLeg && frogBody) {
        await Promise.all([
          play(hindLeg, [
            { transform: 'rotate(-8deg) scaleX(1)' },
            { transform: 'rotate(24deg) scaleX(.68) translateX(4px)' }
          ], { duration: 420, easing: 'ease-in' }),
          play(frogBody, [
            { transform: 'translateY(0) scaleY(1)' },
            { transform: 'translateY(3px) scaleY(.88)' }
          ], { duration: 420, easing: 'ease-in' })
        ]);
      } else if (frogSprite) {
        await play(frogSprite, [
          { transform: 'scale(1,1) translateY(0)' },
          { transform: 'scale(.96,.86) translateY(3px)' }
        ], { duration: 420, easing: 'ease-in' });
      }
      const jump = play(el, [
        { transform: `translate3d(${x}px,${y}px,0) scaleX(${sx}) scaleY(.9)`, offset: 0 },
        { transform: `translate3d(${x + (tx-x)*.22}px,${y-height*.7}px,0) scaleX(${sx}) scaleY(1.08)`, offset: .25 },
        { transform: `translate3d(${x + (tx-x)*.55}px,${y-height}px,0) scaleX(${sx}) scaleY(1)`, offset: .5 },
        { transform: `translate3d(${x + (tx-x)*.84}px,${y-height*.45}px,0) scaleX(${sx}) scaleY(.96)`, offset: .78 },
        { transform: `translate3d(${tx}px,${y}px,0) scaleX(${sx}) scaleY(.9)`, offset: 1 }
      ], { duration: between(900, 1450), easing: 'cubic-bezier(.25,.1,.3,1)' });
      if (hindLeg) {
        await Promise.all([jump, play(hindLeg, [
          { transform: 'rotate(24deg) scaleX(.68) translateX(4px)', offset: 0 },
          { transform: 'rotate(-25deg) scaleX(1.2)', offset: .28 },
          { transform: 'rotate(-10deg) scaleX(1)', offset: .72 },
          { transform: 'rotate(-8deg) scaleX(1)', offset: 1 }
        ], { duration: 1100, easing: 'ease-out' })]);
        if (frogBody) frogBody.style.transform = 'translateY(0) scaleY(1)';
      } else if (frogSprite) {
        await Promise.all([jump, play(frogSprite, [
          { transform: 'scale(.96,.86) translateY(3px)', offset: 0 },
          { transform: 'scale(1.04,1.02) translateY(-1px)', offset: .3 },
          { transform: 'scale(1,1) translateY(0)', offset: 1 }
        ], { duration: 1100, easing: 'ease-out' })]);
      } else await jump;
      x = tx;
      await wait(between(kind === 'frog' ? 1200 : 700, kind === 'frog' ? 3400 : 2400));
      if (Math.random() < .18) dir *= -1;
    }
  }

  async function birdFly(el) {
    prepare(el);
    let area = limits(el, true);
    let x = between(area.minX, area.maxX), y = between(area.minY, area.maxY * .72);
    el.style.transform = `translate3d(${x}px,${y}px,0)`;
    while (el.isConnected) {
      area = limits(el, true);
      let dir = Math.random() < .5 ? -1 : 1;
      if (x < area.minX + 120) dir = 1;
      if (x > area.maxX - 120) dir = -1;
      const distance = between(75, Math.min(260, innerWidth * .34));
      const tx = clamp(x + dir * distance, area.minX, area.maxX);
      const ty = clamp(y + between(-95, 90), area.minY, area.maxY);
      const sx = motionFacing(el, dir);
      const lift = clamp(Math.min(y, ty) - between(18, 55), area.minY, area.maxY);
      const duration = between(1700, 3600);
      await play(el, [
        { transform: `translate3d(${x}px,${y}px,0) scaleX(${sx}) scaleY(.94)`, offset: 0 },
        { transform: `translate3d(${x+(tx-x)*.16}px,${lift+12}px,0) scaleX(${sx}) scaleY(1.08)`, offset: .16 },
        { transform: `translate3d(${x+(tx-x)*.34}px,${lift}px,0) scaleX(${sx}) scaleY(.94)`, offset: .31 },
        { transform: `translate3d(${x+(tx-x)*.56}px,${(lift+ty)/2-5}px,0) scaleX(${sx}) scaleY(1.05)`, offset: .5 },
        { transform: `translate3d(${x+(tx-x)*.78}px,${(lift+ty)/2+4}px,0) scaleX(${sx}) scaleY(.98)`, offset: .72 },
        { transform: `translate3d(${tx}px,${ty}px,0) scaleX(${sx}) scaleY(1)`, offset: 1 }
      ], { duration, easing: 'cubic-bezier(.22,.62,.35,1)' });
      x = tx; y = ty;
      await wait(between(900, 3600));
      if (Math.random() < .3) {
        await play(el, [
          { transform: `translate3d(${x}px,${y}px,0) scaleX(${sx}) translateY(0)` },
          { transform: `translate3d(${x}px,${y}px,0) scaleX(${sx}) translateY(-3px)` },
          { transform: `translate3d(${x}px,${y}px,0) scaleX(${sx}) translateY(0)` }
        ], { duration: between(500, 900), easing: 'ease-in-out' });
      }
    }
  }

  async function butterflyFly(el) {
    prepare(el);
    el.classList.add('svg-butterfly');
    el.innerHTML = `<svg class="butterfly-svg" viewBox="0 0 44 52" role="img" aria-label="蝴蝶">
      <g class="wing wing-left"><path d="M20 19C12 5 1 7 3 21c1 8 9 12 17 8Z" fill="#ef6f91"/><path d="M19 28C9 25 4 33 9 41 15 45 20 38 21 31Z" fill="#f7a7ba"/></g>
      <g class="wing wing-right"><path d="M24 19C32 5 43 7 41 21c-1 8-9 12-17 8Z" fill="#ef6f91"/><path d="M25 28c10-3 15 5 10 13-6 4-11-3-12-10Z" fill="#f7a7ba"/></g>
      <path d="M18 9Q13 2 10 4M26 9Q31 2 34 4" fill="none" stroke="#553b46" stroke-width="1.8" stroke-linecap="round"/>
      <circle cx="22" cy="11" r="4" fill="#553b46"/><path d="M22 14c-4 7-3 20 0 28 3-8 4-21 0-28Z" fill="#684750"/>
    </svg>`;
    let area = limits(el, true);
    let x = between(area.minX, area.maxX), y = between(area.minY, area.maxY);
    el.style.transform = `translate3d(${x}px,${y}px,0)`;
    while (el.isConnected) {
      area = limits(el, true);
      let tx = between(area.minX, area.maxX), ty = between(area.minY, area.maxY);
      if (Math.hypot(tx - x, ty - y) < 100) tx = clamp(tx + (Math.random() < .5 ? -150 : 150), area.minX, area.maxX);
      const mx = clamp((x + tx) / 2 + between(-65, 65), area.minX, area.maxX);
      const my = clamp((y + ty) / 2 + between(-70, 70), area.minY, area.maxY);
      const angle1 = Math.atan2(my - y, mx - x) * 180 / Math.PI + 90;
      const angle2 = Math.atan2(ty - my, tx - mx) * 180 / Math.PI + 90;
      await play(el, [
        { transform: `translate3d(${x}px,${y}px,0) rotate(${angle1}deg)`, offset: 0 },
        { transform: `translate3d(${mx}px,${my}px,0) rotate(${angle2}deg)`, offset: .52 },
        { transform: `translate3d(${tx}px,${ty}px,0) rotate(${angle2}deg)`, offset: 1 }
      ], { duration: between(2400, 4800), easing: 'cubic-bezier(.35,.08,.28,1)' });
      x = tx; y = ty;
      await wait(between(350, 1400));
    }
  }

  async function groundBird(el) {
    const rules = document.querySelector('#setup ol');
    if (rules) {
      const perch = document.createElement('div');
      perch.className = 'rule-bird-perch';
      perch.setAttribute('aria-hidden', 'true');
      rules.insertAdjacentElement('afterend', perch);
      perch.appendChild(el);
      el.classList.add('rule-bird');
      el.style.cssText = '';
      el.style.transformOrigin = '50% 88%';
      el.innerHTML = `<svg class="red-bird-svg" viewBox="0 0 68 48" role="img" aria-label="紅色小鳥啄食"><path d="M17 29 3 20l5 15-5 8 19-7Z" fill="#b84545"/><ellipse cx="31" cy="30" rx="20" ry="13" fill="#d95858"/><path d="M24 29q9-9 18 0-9 10-18 0Z" fill="#ee8580"/><g class="bird-head"><circle cx="47" cy="20" r="11" fill="#d95858"/><circle cx="51" cy="17" r="1.8" fill="#252027"/><path d="M57 20 67 24l-10 3Z" fill="#e7a13a"/></g><g fill="none" stroke="#6d4a3e" stroke-width="2" stroke-linecap="round"><path d="M27 40v6m0 0-4 2m4-2 4 2M39 40v6m0 0-4 2m4-2 4 2"/></g></svg>`;
      (async () => {
        await wait(120);
        let x = between(4, Math.max(8, perch.clientWidth - 38));
        let dir = Math.random() < .5 ? 1 : -1;
        const birdFacing = direction => direction > 0 ? 1 : -1;
        const head = el.querySelector('.bird-head');
        const baseY = 3;
        el.style.transform = `translate3d(${x}px,${baseY}px,0) scaleX(${birdFacing(dir)})`;
        while (el.isConnected) {
          const maxX = Math.max(8, perch.clientWidth - 38);
          if (x > maxX - 28) dir = -1;
          if (x < 28) dir = 1;
          const tx = clamp(x + dir * between(14, 38), 4, maxX);
          const sx = birdFacing(dir);
          await play(el, [
            { transform: `translate3d(${x}px,${baseY}px,0) scaleX(${sx}) rotate(-2deg)`, offset: 0 },
            { transform: `translate3d(${x+(tx-x)*.25}px,${baseY-3}px,0) scaleX(${sx}) rotate(3deg)`, offset: .25 },
            { transform: `translate3d(${x+(tx-x)*.5}px,${baseY}px,0) scaleX(${sx}) rotate(-2deg)`, offset: .5 },
            { transform: `translate3d(${x+(tx-x)*.75}px,${baseY-3}px,0) scaleX(${sx}) rotate(3deg)`, offset: .75 },
            { transform: `translate3d(${tx}px,${baseY}px,0) scaleX(${sx}) rotate(0deg)`, offset: 1 }
          ], { duration: between(1300, 2300), easing: 'ease-in-out' });
          x = tx;
          await wait(between(350, 900));
          const pecks = Math.floor(between(1, 4));
          for (let i = 0; i < pecks; i++) {
            el.style.transform = `translate3d(${x}px,${baseY}px,0) scaleX(${sx})`;
            await play(head, [
              { transform: 'rotate(0deg) translateY(0)' },
              { transform: 'rotate(43deg) translateY(2px)' },
              { transform: 'rotate(0deg) translateY(0)' }
            ], { duration: between(430, 650), easing: 'ease-in-out' });
            await wait(between(160, 430));
          }
          await wait(between(700, 1900));
          if (Math.random() < .2) dir *= -1;
        }
      })();
      return;
    }
    prepare(el);
    el.style.transformOrigin = '50% 90%';
    let area = limits(el), x = between(area.minX, area.maxX), y = area.y;
    let dir = Math.random() < .5 ? 1 : -1;
    el.style.transform = `translate3d(${x}px,${y}px,0) scaleX(${motionFacing(el, dir)})`;
    while (el.isConnected) {
      area = limits(el);
      if (x > area.maxX - 85) dir = -1;
      if (x < area.minX + 85) dir = 1;
      if (Math.random() < .12) {
        const tx = clamp(x + dir * between(90, 220), area.minX, area.maxX);
        const lift = between(28, 52), sx = facing(dir);
        await play(el, [
          { transform: `translate3d(${x}px,${y}px,0) scaleX(${sx})`, offset: 0 },
          { transform: `translate3d(${x+(tx-x)*.2}px,${y-lift*.72}px,0) scaleX(${sx}) scaleY(1.07)`, offset: .22 },
          { transform: `translate3d(${x+(tx-x)*.52}px,${y-lift}px,0) scaleX(${sx}) scaleY(.95)`, offset: .5 },
          { transform: `translate3d(${x+(tx-x)*.8}px,${y-lift*.55}px,0) scaleX(${sx}) scaleY(1.06)`, offset: .76 },
          { transform: `translate3d(${tx}px,${y}px,0) scaleX(${sx})`, offset: 1 }
        ], { duration: between(1700, 2900), easing: 'cubic-bezier(.25,.1,.3,1)' });
        x = tx;
        await wait(between(900, 2100));
      } else {
        const tx = clamp(x + dir * between(20, 58), area.minX, area.maxX), sx = facing(dir);
        await play(el, [
          { transform: `translate3d(${x}px,${y}px,0) scaleX(${sx}) rotate(-3deg)`, offset: 0 },
          { transform: `translate3d(${x+(tx-x)*.25}px,${y-between(3,7)}px,0) scaleX(${sx}) rotate(3deg)`, offset: .25 },
          { transform: `translate3d(${x+(tx-x)*.5}px,${y}px,0) scaleX(${sx}) rotate(-3deg)`, offset: .5 },
          { transform: `translate3d(${x+(tx-x)*.75}px,${y-between(3,7)}px,0) scaleX(${sx}) rotate(3deg)`, offset: .75 },
          { transform: `translate3d(${tx}px,${y}px,0) scaleX(${sx}) rotate(0deg)`, offset: 1 }
        ], { duration: between(1700, 3000), easing: 'ease-in-out' });
        x = tx;
        await wait(between(350, 1000));
        const peck = dir > 0 ? 19 : -19;
        const pecks = Math.floor(between(1, 4));
        for (let i = 0; i < pecks; i++) {
          await play(el, [
            { transform: `translate3d(${x}px,${y}px,0) scaleX(${sx}) rotate(0deg)` },
            { transform: `translate3d(${x}px,${y+5}px,0) scaleX(${sx}) rotate(${peck}deg)` },
            { transform: `translate3d(${x}px,${y}px,0) scaleX(${sx}) rotate(0deg)` }
          ], { duration: between(420, 680), easing: 'ease-in-out' });
          await wait(between(180, 520));
        }
        await wait(between(1000, 3100));
        if (Math.random() < .22) dir *= -1;
      }
    }
  }

  async function gentleWingedFly(el, kind) {
    prepare(el);
    const orientedArt = kind === 'butterfly' || kind === 'ladybug';
    const headForwardArt = orientedArt || kind === 'cicada';
    if (orientedArt) {
    el.classList.add(kind === 'butterfly' ? 'svg-butterfly' : 'svg-ladybug');
    el.style.transformOrigin = kind === 'ladybug' ? '50% 18%' : '50% 50%';
    el.innerHTML = kind === 'butterfly'
      ? `<svg class="butterfly-svg" viewBox="0 0 44 52" role="img" aria-label="蝴蝶"><g class="wing wing-left"><path d="M20 19C12 5 1 7 3 21c1 8 9 12 17 8Z" fill="#ef6f91"/><path d="M19 28C9 25 4 33 9 41 15 45 20 38 21 31Z" fill="#f7a7ba"/></g><g class="wing wing-right"><path d="M24 19C32 5 43 7 41 21c-1 8-9 12-17 8Z" fill="#ef6f91"/><path d="M25 28c10-3 15 5 10 13-6 4-11-3-12-10Z" fill="#f7a7ba"/></g><path d="M18 9Q13 2 10 4M26 9Q31 2 34 4" fill="none" stroke="#553b46" stroke-width="1.8" stroke-linecap="round"/><circle cx="22" cy="11" r="4" fill="#553b46"/><path d="M22 14c-4 7-3 20 0 28 3-8 4-21 0-28Z" fill="#684750"/></svg>`
      : `<svg class="ladybug-svg" viewBox="0 0 64 64" role="img" aria-label="紅色七星瓢蟲"><g fill="none" stroke="#252027" stroke-width="2.3" stroke-linecap="round"><path d="M19 28 8 22M17 37 5 37M20 47 10 55M45 28l11-6M47 37h12M44 47l10 8"/><path d="M27 11Q20 2 15 7M37 11Q44 2 49 7"/></g><g class="bug-flight-wing bug-flight-left"><ellipse cx="21" cy="34" rx="13" ry="23" fill="#dff7f4" fill-opacity=".78" stroke="#8fc9c4" stroke-width="1.2"/></g><g class="bug-flight-wing bug-flight-right"><ellipse cx="43" cy="34" rx="13" ry="23" fill="#dff7f4" fill-opacity=".78" stroke="#8fc9c4" stroke-width="1.2"/></g><ellipse cx="32" cy="39" rx="23" ry="22" fill="#d93636" stroke="#3b2529" stroke-width="2.4"/><path d="M32 18v42" stroke="#3b2529" stroke-width="2.5"/><circle cx="22" cy="30" r="3.6" fill="#282227"/><circle cx="18" cy="42" r="3.6" fill="#282227"/><circle cx="26" cy="51" r="3.4" fill="#282227"/><circle cx="42" cy="30" r="3.6" fill="#282227"/><circle cx="46" cy="42" r="3.6" fill="#282227"/><circle cx="38" cy="51" r="3.4" fill="#282227"/><path d="M20 20Q32 7 44 20" fill="#282227" stroke="#282227" stroke-width="4"/><circle cx="27" cy="15" r="1.5" fill="#f5f1e8"/><circle cx="37" cy="15" r="1.5" fill="#f5f1e8"/></svg>`;
    } else if (!el.classList.contains('internal-wing-animal')) {
      el.classList.add('gentle-emoji-fly');
      el.style.transformOrigin = '50% 45%';
      const glyph = el.textContent.trim();
      el.innerHTML = `<span class="emoji-glyph">${glyph}</span><span class="motion-wing wing-a"></span><span class="motion-wing wing-b"></span>`;
    }
    const pose = (px, py, angle) => headForwardArt
      ? `translate3d(${px}px,${py}px,0) rotate(${angle + 90}deg)`
      : `translate3d(${px}px,${py}px,0) scaleX(${motionFacing(el, Math.cos(angle * Math.PI / 180))})`;
    let area = limits(el, true);
    let x = between(area.minX, area.maxX), y = between(area.minY, area.maxY), heading = between(-170, 170);
    el.style.transform = pose(x, y, heading);
    while (el.isConnected) {
      area = limits(el, true);
      let turn = between(-48, 48);
      let nextHeading = heading + turn;
      const distance = between(70, 155);
      let tx = x + Math.cos(nextHeading * Math.PI / 180) * distance;
      let ty = y + Math.sin(nextHeading * Math.PI / 180) * distance;
      if (tx < area.minX || tx > area.maxX) nextHeading = 180 - nextHeading;
      if (ty < area.minY || ty > area.maxY) nextHeading = -nextHeading;
      while (nextHeading - heading > 180) nextHeading -= 360;
      while (nextHeading - heading < -180) nextHeading += 360;
      tx = clamp(x + Math.cos(nextHeading * Math.PI / 180) * distance, area.minX, area.maxX);
      ty = clamp(y + Math.sin(nextHeading * Math.PI / 180) * distance, area.minY, area.maxY);
      const midHeading = heading + (nextHeading - heading) * .52;
      const mx = x + (tx - x) * .48 + Math.cos((midHeading + 90) * Math.PI / 180) * between(-18, 18);
      const my = y + (ty - y) * .48 + Math.sin((midHeading + 90) * Math.PI / 180) * between(-18, 18);
      if (!orientedArt) el.classList.add('is-flying');
      await play(el, [
        { transform: pose(x, y, heading), offset: 0 },
        { transform: pose(mx, my, midHeading), offset: .52 },
        { transform: pose(tx, ty, nextHeading), offset: 1 }
      ], { duration: between(kind === 'butterfly' ? 5200 : 4600, kind === 'butterfly' ? 8200 : 7200), easing: 'cubic-bezier(.37,.05,.22,1)' });
      if (!orientedArt) el.classList.remove('is-flying');
      x = tx; y = ty; heading = nextHeading;
      await wait(between(650, 1900));
    }
  }

  async function boundaryWingFly(el) {
    prepare(el);
    el.classList.add('boundary-wing-fly');
    if (!el.classList.contains('internal-wing-animal')) {
      const glyph = el.textContent.trim();
      el.innerHTML = `<span class="emoji-glyph">${glyph}</span>`;
    }
    let area = limits(el, true), dir = Math.random() < .5 ? 1 : -1;
    let x = between(area.minX + 40, area.maxX - 40), y = between(area.minY, area.maxY);
    el.style.transform = `translate3d(${x}px,${y}px,0) scaleX(${facing(dir)})`;
    while (el.isConnected) {
      area = limits(el, true);
      const edge = dir > 0 ? area.maxX : area.minX;
      const distance = Math.min(Math.abs(edge - x), between(70, 145));
      const tx = x + dir * distance;
      const ty = clamp(y + between(-42, 42), area.minY, area.maxY);
      const sx = facing(dir);
      el.classList.add('is-flying');
      await play(el, [
        { transform: `translate3d(${x}px,${y}px,0) scaleX(${sx}) translateY(0)`, offset: 0 },
        { transform: `translate3d(${x+(tx-x)*.48}px,${(y+ty)/2-8}px,0) scaleX(${sx}) translateY(-2px)`, offset: .5 },
        { transform: `translate3d(${tx}px,${ty}px,0) scaleX(${sx}) translateY(0)`, offset: 1 }
      ], { duration: between(3000, 5200), easing: 'cubic-bezier(.3,.08,.25,1)' });
      el.classList.remove('is-flying');
      x = tx; y = ty;
      const atEdge = Math.abs(edge - x) < 2;
      await wait(between(atEdge ? 1200 : 550, atEdge ? 2600 : 1500));
      if (atEdge) {
        await play(el.querySelector('.emoji-glyph'), [
          { transform: 'rotateY(0deg)' },
          { transform: 'rotateY(90deg)' },
          { transform: 'rotateY(0deg)' }
        ], { duration: 650, easing: 'ease-in-out' });
        dir *= -1;
      }
    }
  }

  async function ground(el, mode) {
    prepare(el);
    let area = limits(el), x = between(area.minX, area.maxX), dir = Math.random() < .5 ? 1 : -1, y = area.y;
    el.style.transform = `translate3d(${x}px,${y}px,0) scaleX(${facing(dir)})`;
    const settings = {
      squirrel: [35, 85, 650, 1250, 900, 2600, 4],
      trot: [70, 165, 1700, 3300, 500, 1800, 4],
      waddle: [45, 105, 2100, 3900, 900, 2600, 5],
      crawl: [22, 65, 4200, 7600, 1800, 4700, 1],
      walk: [55, 125, 2600, 4800, 900, 2900, 3]
    }[mode];
    while (el.isConnected) {
      area = limits(el); y = area.y;
      if (x > area.maxX - 80) dir = -1;
      if (x < area.minX + 80) dir = 1;
      const tx = clamp(x + dir * between(settings[0], settings[1]), area.minX, area.maxX);
      const sx = motionFacing(el, dir), bob = settings[6];
      await play(el, [
        { transform: `translate3d(${x}px,${y}px,0) scaleX(${sx}) rotate(-2deg)`, offset: 0 },
        { transform: `translate3d(${x+(tx-x)*.25}px,${y-bob}px,0) scaleX(${sx}) rotate(2deg)`, offset: .25 },
        { transform: `translate3d(${x+(tx-x)*.5}px,${y}px,0) scaleX(${sx}) rotate(-2deg)`, offset: .5 },
        { transform: `translate3d(${x+(tx-x)*.75}px,${y-bob}px,0) scaleX(${sx}) rotate(2deg)`, offset: .75 },
        { transform: `translate3d(${tx}px,${y}px,0) scaleX(${sx}) rotate(0deg)`, offset: 1 }
      ], { duration: between(settings[2], settings[3]), easing: mode === 'squirrel' ? 'ease-out' : 'ease-in-out' });
      x = tx;
      await wait(between(settings[4], settings[5]));
      if (Math.random() < (mode === 'squirrel' ? .28 : .12)) dir *= -1;
    }
  }

  async function winterSpeciesWalk(el, species) {
    prepare(el);
    const sprite = el.querySelector('img');
    const profiles = {
      penguin: { distance: [18, 46], duration: [1500, 2400], pause: [700, 1900], edge: 55, groundLift: 22 },
      wolf: { distance: [85, 175], duration: [1350, 2300], pause: [650, 1700], edge: 90, groundLift: 24 },
      bear: { distance: [42, 92], duration: [2900, 4400], pause: [1200, 3000], edge: 95, groundLift: 14 }
    };
    const p = profiles[species];
    let area = limits(el), x = between(area.minX, area.maxX), y = area.y - p.groundLift;
    let dir = Math.random() < .5 ? 1 : -1;
    el.style.transform = `translate3d(${x}px,${y}px,0) scaleX(${motionFacing(el, dir)})`;
    while (el.isConnected) {
      area = limits(el);
      if (x > area.maxX - p.edge) dir = -1;
      if (x < area.minX + p.edge) dir = 1;
      const tx = clamp(x + dir * between(p.distance[0], p.distance[1]), area.minX, area.maxX);
      const sx = motionFacing(el, dir), duration = between(p.duration[0], p.duration[1]);
      let route, bodyFrames;
      if (species === 'penguin') {
        route = [
          { transform: `translate3d(${x}px,${y}px,0) scaleX(${sx})`, offset: 0 },
          { transform: `translate3d(${x+(tx-x)*.25}px,${y-1}px,0) scaleX(${sx})`, offset: .25 },
          { transform: `translate3d(${x+(tx-x)*.5}px,${y}px,0) scaleX(${sx})`, offset: .5 },
          { transform: `translate3d(${x+(tx-x)*.75}px,${y-1}px,0) scaleX(${sx})`, offset: .75 },
          { transform: `translate3d(${tx}px,${y}px,0) scaleX(${sx})`, offset: 1 }
        ];
        bodyFrames = [
          { transform: 'rotate(-5deg) translateY(0)', offset: 0 },
          { transform: 'rotate(5deg) translateY(-1px)', offset: .25 },
          { transform: 'rotate(-5deg) translateY(0)', offset: .5 },
          { transform: 'rotate(5deg) translateY(-1px)', offset: .75 },
          { transform: 'rotate(0deg) translateY(0)', offset: 1 }
        ];
      } else if (species === 'wolf') {
        route = [
          { transform: `translate3d(${x}px,${y}px,0) scaleX(${sx})`, offset: 0 },
          { transform: `translate3d(${x+(tx-x)*.24}px,${y-2}px,0) scaleX(${sx})`, offset: .24 },
          { transform: `translate3d(${x+(tx-x)*.5}px,${y}px,0) scaleX(${sx})`, offset: .5 },
          { transform: `translate3d(${x+(tx-x)*.76}px,${y-2}px,0) scaleX(${sx})`, offset: .76 },
          { transform: `translate3d(${tx}px,${y}px,0) scaleX(${sx})`, offset: 1 }
        ];
        bodyFrames = [
          { transform: 'translateY(0) rotate(-1deg) scaleX(1)', offset: 0 },
          { transform: 'translateY(-2px) rotate(1deg) scaleX(1.015)', offset: .24 },
          { transform: 'translateY(0) rotate(-1deg) scaleX(.99)', offset: .5 },
          { transform: 'translateY(-2px) rotate(1deg) scaleX(1.015)', offset: .76 },
          { transform: 'translateY(0) rotate(0deg) scaleX(1)', offset: 1 }
        ];
      } else {
        route = [
          { transform: `translate3d(${x}px,${y}px,0) scaleX(${sx})`, offset: 0 },
          { transform: `translate3d(${x+(tx-x)*.28}px,${y-1}px,0) scaleX(${sx})`, offset: .28 },
          { transform: `translate3d(${x+(tx-x)*.56}px,${y}px,0) scaleX(${sx})`, offset: .56 },
          { transform: `translate3d(${x+(tx-x)*.8}px,${y-1}px,0) scaleX(${sx})`, offset: .8 },
          { transform: `translate3d(${tx}px,${y}px,0) scaleX(${sx})`, offset: 1 }
        ];
        bodyFrames = [
          { transform: 'translateY(0) rotate(-.6deg)', offset: 0 },
          { transform: 'translateY(-1px) rotate(.6deg)', offset: .28 },
          { transform: 'translateY(0) rotate(-.5deg)', offset: .56 },
          { transform: 'translateY(-1px) rotate(.5deg)', offset: .8 },
          { transform: 'translateY(0) rotate(0deg)', offset: 1 }
        ];
      }
      el.classList.add('is-species-walking', `is-${species}-walking`);
      await Promise.all([
        play(el, route, { duration, easing: species === 'wolf' ? 'cubic-bezier(.28,.12,.32,1)' : 'ease-in-out' }),
        sprite ? play(sprite, bodyFrames, { duration, easing: 'ease-in-out' }) : Promise.resolve()
      ]);
      el.classList.remove('is-species-walking', `is-${species}-walking`);
      x = tx;
      await wait(between(p.pause[0], p.pause[1]));
      if (Math.random() < (species === 'wolf' ? .18 : .1)) dir *= -1;
    }
  }

  async function squirrelInstinct(el) {
    prepare(el);
    const body = el.querySelector('.runner-body');
    let area = limits(el), x = between(area.minX, area.maxX), y = area.y;
    let dir = Math.random() < .5 ? 1 : -1;
    el.style.transform = `translate3d(${x}px,${y}px,0) scaleX(${motionFacing(el, dir)})`;
    while (el.isConnected) {
      area = limits(el); y = area.y;
      if (x > area.maxX - 70) dir = -1;
      if (x < area.minX + 70) dir = 1;
      const burstSteps = Math.floor(between(2, 5));
      for (let step = 0; step < burstSteps && el.isConnected; step++) {
        const tx = clamp(x + dir * between(24, 58), area.minX, area.maxX);
        const sx = motionFacing(el, dir);
        const bodyMotion = body ? play(body, [
          { transform: 'translateY(1px) rotate(-5deg) scaleX(1.02)', offset: 0 },
          { transform: 'translateY(-3px) rotate(4deg) scaleX(.96)', offset: .45 },
          { transform: 'translateY(0) rotate(0deg) scaleX(1)', offset: 1 }
        ], { duration: between(430, 720), easing: 'cubic-bezier(.2,.65,.35,1)' }) : Promise.resolve();
        await Promise.all([play(el, [
          { transform: `translate3d(${x}px,${y}px,0) scaleX(${sx})`, offset: 0 },
          { transform: `translate3d(${x+(tx-x)*.48}px,${y-3}px,0) scaleX(${sx})`, offset: .48 },
          { transform: `translate3d(${tx}px,${y}px,0) scaleX(${sx})`, offset: 1 }
        ], { duration: between(430, 720), easing: 'cubic-bezier(.24,.68,.34,1)' }), bodyMotion]);
        x = tx;
        await wait(between(90, 260));
      }
      if (body) await play(body, [
        { transform: 'rotate(0deg)' },
        { transform: 'rotate(-7deg)' },
        { transform: 'rotate(5deg)' },
        { transform: 'rotate(0deg)' }
      ], { duration: between(700, 1100), easing: 'ease-in-out' });
      await wait(between(1100, 3600));
      if (Math.random() < .42) dir *= -1;
    }
  }

  async function deerInstinct(el) {
    prepare(el);
    const body = el.querySelector('.runner-body');
    let area = limits(el), x = between(area.minX, area.maxX), y = area.y;
    let dir = Math.random() < .5 ? 1 : -1;
    el.style.transform = `translate3d(${x}px,${y}px,0) scaleX(${motionFacing(el, dir)})`;
    while (el.isConnected) {
      area = limits(el); y = area.y;
      if (x > area.maxX - 95) dir = -1;
      if (x < area.minX + 95) dir = 1;
      const trotting = Math.random() < .32;
      const tx = clamp(x + dir * between(trotting ? 125 : 65, trotting ? 230 : 145), area.minX, area.maxX);
      const sx = motionFacing(el, dir), lift = trotting ? 4 : 2;
      const duration = between(trotting ? 1800 : 2800, trotting ? 2800 : 4700);
      const bodyMotion = body ? play(body, [
        { transform: 'translateY(0) rotate(-1deg)', offset: 0 },
        { transform: `translateY(-${lift}px) rotate(1deg)`, offset: .24 },
        { transform: 'translateY(0) rotate(-1deg)', offset: .5 },
        { transform: `translateY(-${lift}px) rotate(1deg)`, offset: .76 },
        { transform: 'translateY(0) rotate(0deg)', offset: 1 }
      ], { duration, easing: 'ease-in-out' }) : Promise.resolve();
      el.classList.add('is-deer-moving', trotting ? 'is-deer-trotting' : 'is-deer-walking');
      await Promise.all([play(el, [
        { transform: `translate3d(${x}px,${y}px,0) scaleX(${sx})`, offset: 0 },
        { transform: `translate3d(${x+(tx-x)*.2}px,${y-lift}px,0) scaleX(${sx})`, offset: .2 },
        { transform: `translate3d(${x+(tx-x)*.48}px,${y}px,0) scaleX(${sx})`, offset: .48 },
        { transform: `translate3d(${x+(tx-x)*.75}px,${y-lift}px,0) scaleX(${sx})`, offset: .75 },
        { transform: `translate3d(${tx}px,${y}px,0) scaleX(${sx})`, offset: 1 }
      ], { duration, easing: trotting ? 'cubic-bezier(.25,.12,.3,1)' : 'ease-in-out' }), bodyMotion]);
      el.classList.remove('is-deer-moving', 'is-deer-trotting', 'is-deer-walking');
      x = tx;
      await wait(between(1200, 3300));
      if (Math.random() < .16) dir *= -1;
    }
  }

  const frog = document.querySelector('.summer-frog');
  if (frog) {
    frog.classList.add('frog-image-sprite', 'head-led');
    frog.innerHTML = `<img class="frog-sprite" src="assets/cute-green-frog-v1.png" alt="可愛的側面綠色小青蛙">`;
  }
  const duck = document.querySelector('.summer-duck');
  if (duck) {
    duck.classList.add('head-led', 'internal-wing-animal', 'cute-emoji-animal');
    duck.classList.remove('full-duck');
    duck.innerHTML = `<span class="emoji-glyph" role="img" aria-label="黃色小鴨">🐤</span>`;
  }
  const summerBird = document.querySelector('.summer-bird');
  if (summerBird) {
    summerBird.classList.add('head-led', 'internal-wing-animal', 'cute-emoji-animal');
    summerBird.classList.remove('full-summer-bird');
    summerBird.innerHTML = `<span class="emoji-glyph" role="img" aria-label="紅色小鳥">🐦</span>`;
  }
  document.querySelectorAll('.autumn-owl').forEach(owl => {
    owl.classList.add('head-led', 'internal-wing-animal', 'full-autumn-owl');
    owl.innerHTML = `<svg class="autumn-owl-svg" viewBox="0 0 72 58" role="img" aria-label="可愛秋季貓頭鷹"><path class="owl-wing-left" d="M25 27Q8 22 5 39q9 11 24 3Z" fill="#b97a45"/><path class="owl-wing-right" d="M47 27q17-5 20 12-9 11-24 3Z" fill="#b97a45"/><ellipse cx="36" cy="34" rx="22" ry="20" fill="#c98a52"/><path d="M20 20 25 5l10 12M52 20 47 5 37 17" fill="#a8673e"/><circle cx="27" cy="24" r="9" fill="#f5dfb0"/><circle cx="45" cy="24" r="9" fill="#f5dfb0"/><circle cx="28" cy="24" r="3" fill="#302823"/><circle cx="44" cy="24" r="3" fill="#302823"/><path d="M32 31h8l-4 6Z" fill="#e2a537"/><path d="M26 51v5m20-5v5" stroke="#79513a" stroke-width="3" stroke-linecap="round"/></svg>`;
  });
  document.querySelectorAll('.winter-owl').forEach(owl => {
    owl.classList.add('head-led', 'internal-wing-animal', 'full-autumn-owl', 'full-winter-owl');
    owl.innerHTML = `<svg class="autumn-owl-svg winter-owl-svg" viewBox="0 0 72 58" role="img" aria-label="白色冬季貓頭鷹"><path class="owl-wing-left" d="M25 27Q8 22 5 39q9 11 24 3Z" fill="#e8f1f7" stroke="#a8becd" stroke-width="1.2"/><path class="owl-wing-right" d="M47 27q17-5 20 12-9 11-24 3Z" fill="#e8f1f7" stroke="#a8becd" stroke-width="1.2"/><ellipse cx="36" cy="34" rx="22" ry="20" fill="#f7fbfd" stroke="#b5c8d4" stroke-width="1.2"/><path d="M20 20 25 5l10 12M52 20 47 5 37 17" fill="#dce9f1"/><circle cx="27" cy="24" r="9" fill="#dceaf2"/><circle cx="45" cy="24" r="9" fill="#dceaf2"/><circle cx="28" cy="24" r="3" fill="#34434d"/><circle cx="44" cy="24" r="3" fill="#34434d"/><path d="M32 31h8l-4 6Z" fill="#d7a63e"/><path d="M26 51v5m20-5v5" stroke="#8298a7" stroke-width="3" stroke-linecap="round"/></svg>`;
  });
  const autumnFox = document.querySelector('.autumn-fox');
  if (autumnFox) {
    autumnFox.classList.add('head-led', 'full-autumn-fox');
    autumnFox.innerHTML = `<svg class="autumn-fox-svg" viewBox="0 0 96 52" role="img" aria-label="完整可愛小狐狸"><path d="M25 34Q5 47 3 23q15-3 29 9Z" fill="#dc7b35"/><path d="M19 36Q7 39 7 28q11 0 18 6Z" fill="#fff1db"/><ellipse cx="52" cy="34" rx="27" ry="13" fill="#e8873e"/><g class="fox-head"><path d="M68 19 71 4l10 12M86 19 91 6l4 16" fill="#d86f31"/><circle cx="80" cy="24" r="16" fill="#ed9149"/><path d="M79 25q8 0 15 8-8 10-19 5Z" fill="#fff1db"/><circle cx="84" cy="21" r="2" fill="#2d2725"/><circle cx="95" cy="33" r="2.5" fill="#2d2725"/></g><g class="fox-legs" fill="none" stroke="#a9532b" stroke-width="5" stroke-linecap="round"><path class="fox-leg-a" d="M41 42v8"/><path class="fox-leg-b" d="M57 42v8"/><path class="fox-leg-c" d="M69 40v9"/></g></svg>`;
  }
  const autumnDeer = document.querySelector('.autumn-deer');
  if (autumnDeer) {
    autumnDeer.classList.add('foot-led-runner', 'cute-deer');
    autumnDeer.classList.remove('head-led');
    autumnDeer.classList.remove('full-autumn-deer');
    autumnDeer.innerHTML = `<span class="runner-body" role="img" aria-label="可愛馴鹿">🦌</span><span class="runner-feet"><i></i><i></i></span>`;
  }
  const winterDeer = document.querySelector('.winter-deer');
  if (winterDeer) {
    winterDeer.classList.add('foot-led-runner', 'cute-deer');
    winterDeer.classList.remove('head-led', 'full-autumn-deer');
    winterDeer.innerHTML = `<span class="runner-body" role="img" aria-label="冬季可愛馴鹿">🦌</span><span class="runner-feet"><i></i><i></i></span>`;
  }
  const winterPenguin = document.querySelector('.winter-penguin');
  if (winterPenguin) {
    winterPenguin.classList.add('head-led', 'full-winter-penguin');
    winterPenguin.innerHTML = `<img class="winter-penguin-sprite" src="assets/winter-penguin-cute-v2.png" alt="可愛完整全身企鵝"><span class="animal-feet penguin-feet" aria-hidden="true"><i></i><i></i></span>`;
  }
  const winterWolf = document.querySelector('.winter-fox');
  if (winterWolf) {
    winterWolf.classList.add('head-led', 'full-winter-wolf');
    winterWolf.innerHTML = `<img class="winter-wolf-sprite" src="assets/winter-arctic-wolf-cute-v2.png" alt="可愛完整全身白色北極狼"><span class="animal-feet quadruped-feet wolf-feet" aria-hidden="true"><i></i><i></i><i></i><i></i></span>`;
  }
  const winterPolarBear = document.querySelector('.winter-polarbear');
  if (winterPolarBear) {
    winterPolarBear.classList.add('head-led', 'full-winter-polarbear');
    winterPolarBear.innerHTML = `<img class="winter-polarbear-sprite" src="assets/winter-polar-bear-cute-v2.png" alt="可愛完整全身北極熊"><span class="animal-feet quadruped-feet bear-feet" aria-hidden="true"><i></i><i></i><i></i><i></i></span>`;
  }
  document.querySelectorAll('.autumn-squirrel,.autumn-hedgehog').forEach(el => {
    const glyph = el.textContent.trim();
    el.classList.add('foot-led-runner');
    el.innerHTML = `<span class="runner-body">${glyph}</span><span class="runner-feet"><i></i><i></i></span>`;
  });
  const cicada = document.querySelector('.summer-dragonfly');
  if (cicada) {
    cicada.classList.add('head-led');
  }

  document.querySelectorAll('.spring-bee').forEach(el => fly(el, 'flutter'));
  document.querySelectorAll('.spring-butterfly').forEach(el => gentleWingedFly(el, 'butterfly'));
  document.querySelectorAll('.spring-ladybug').forEach(el => gentleWingedFly(el, 'ladybug'));
  document.querySelectorAll('.summer-dragonfly').forEach(el => gentleWingedFly(el, 'cicada'));
  document.querySelectorAll('.spring-bird').forEach(el => groundBird(el));
  document.querySelectorAll('.summer-bird').forEach(el => boundaryWingFly(el));
  document.querySelectorAll('.autumn-owl').forEach(el => gentleWingedFly(el, 'cicada'));
  document.querySelectorAll('.winter-owl').forEach(el => gentleWingedFly(el, 'cicada'));
  document.querySelectorAll('.spring-rabbit').forEach(el => hop(el, 'rabbit'));
  document.querySelectorAll('.summer-frog').forEach(el => hop(el, 'frog'));
  document.querySelectorAll('.autumn-squirrel').forEach(el => squirrelInstinct(el));
  document.querySelectorAll('.autumn-deer').forEach(el => ground(el, 'squirrel'));
  document.querySelectorAll('.autumn-hedgehog').forEach(el => ground(el, 'squirrel'));
  document.querySelectorAll('.autumn-fox').forEach(el => ground(el, 'squirrel'));
  document.querySelectorAll('.winter-fox').forEach(el => winterSpeciesWalk(el, 'wolf'));
  document.querySelectorAll('.winter-deer').forEach(el => ground(el, 'squirrel'));
  document.querySelectorAll('.winter-polarbear').forEach(el => winterSpeciesWalk(el, 'bear'));
  document.querySelectorAll('.summer-duck').forEach(el => boundaryWingFly(el));
  document.querySelectorAll('.winter-penguin').forEach(el => winterSpeciesWalk(el, 'penguin'));
  document.querySelectorAll('.summer-turtle').forEach(el => ground(el, 'crawl'));
})();
