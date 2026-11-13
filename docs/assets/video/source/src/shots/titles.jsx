// Title chapters. open/echo are carried by the persistent rail (src/shots/rail.jsx); this file holds
// the "own" command card and the closing logo assembly.
import React from 'react';
import {Split, reveal} from '../kit/text.jsx';
import {shot, onRender} from '../engine.js';
import {showShot, q} from './common.jsx';

export const Empty = () => null;

// README "Try in 60 Seconds" (README.md#L74), verbatim.
const CMD = ['docker run -d \\', '  --name axoxe \\', '  -p 6277:6277 \\', '  -v /opt/axoxe/data:/app/data \\', '  -e JWT_SECRET \\', '  axoxe:local'];
export function OwnView() {
  return <div className="cmd-card">
    <div className="cmd-head"><i /><i /><i /><span>server</span></div>
    <pre className="cmd-body">{CMD.map((l, i) => <div key={i} className="cmd-line" data-line={i}><span className="cmd-typed" /></div>)}</pre>
  </div>;
}
export function buildOwn(tl) {
  const s = shot('own');
  showShot(tl, 'own');
  const card = q('own', '.cmd-card');
  tl.fromTo(card, {opacity: 0, y: 40}, {opacity: 1, y: 0, duration: 0.7, ease: 'expo.out', immediateRender: false}, s.start + 0.8);
  tl.set(card, {opacity: 0}, 0);
  const TYPE_AT = 1.25, CPS = 52, MARK_AT = 3.75;
  const total = CMD.join('\n');
  onRender('own', local => {
    const n = local < TYPE_AT ? 0 : Math.min(total.length, Math.floor((local - TYPE_AT) * CPS));
    let left = n;
    CMD.forEach((line, i) => {
      const el = card.querySelector(`[data-line="${i}"] .cmd-typed`);
      const shown = line.slice(0, Math.max(0, Math.min(line.length, left)));
      left -= line.length + 1;
      const marked = local >= MARK_AT && line.includes('/app/data');
      const html = marked ? shown.replace('/app/data', '<mark>/app/data</mark>') : shown.replace(/</g, '&lt;');
      if (el.innerHTML !== html) el.innerHTML = html;
    });
  });
}

// Use the shared brand asset so future exports follow the approved lettering.
export function CloseView() {
  return <div className="close-stage">
    <img className="logo" src="/axoxe-wordmark.svg" alt="Axoxe" />
    <div className="close-copy">
      <div className="close-line"><Split text="Where moments stay." /></div>
      <div className="close-meta">Open source · Self-hosted · axoxe.com</div>
    </div>
  </div>;
}
export function buildClose(tl) {
  const s = shot('close');
  showShot(tl, 'close');
  tl.to('#rail .film-dot', {opacity: 0, duration: 0.5}, s.start + 0.1);
  tl.set('#rail .film-dot', {opacity: 1}, 0);
  tl.fromTo(q('close', '.logo'), {opacity: 0, y: 24}, {opacity: 1, y: 0, duration: 0.8, ease: 'expo.out', immediateRender: false}, s.start + 0.5);
  tl.set(q('close', '.logo'), {opacity: 0}, 0);
  reveal(tl, q('close', '.close-line'), s.start + 2.9, {stagger: 0.03});
  tl.fromTo(q('close', '.close-meta'), {opacity: 0, y: 14}, {opacity: 1, y: 0, duration: 0.6, ease: 'expo.out', immediateRender: false}, s.start + 3.6);
  tl.set(q('close', '.close-meta'), {opacity: 0}, 0);
}
