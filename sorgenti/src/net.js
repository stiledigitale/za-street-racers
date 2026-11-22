/* ============================================================
   ZA STREET RACERS · NET
   Multiplayer online come Tactical Racing Simulator: canali Supabase Realtime
   (presence = chi c'è, broadcast = messaggi), nessun server da mantenere.
   Con ?net=local nell'indirizzo la rete è simulata tra le schede dello stesso browser (per le prove).
   ============================================================ */
const NET = (function () {
  const SB_URL = 'https://skqmwnoewpqflpfaiuzj.supabase.co', SB_KEY = 'sb_publishable_jKb4CFJlNv0nJJHC27WA-A_nH0c3xho';
  const LOCAL = /[?&]net=local/.test(location.search);
  const myId = Math.random().toString(36).slice(2, 10);
  let sb = null;
  function loadScript(src) {
    return new Promise((res, rej) => { if (window.supabase) return res(); const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = rej; document.head.appendChild(s); });
  }
  async function channel(name) {
    const hs = {}; let peersFn = null;
    const emit = (ev, d) => (hs[ev] || []).forEach(f => { try { f(d); } catch (e) { console.error(e); } });
    const api = { id: myId, on: (ev, f) => { (hs[ev] = hs[ev] || []).push(f); }, onPeers: f => { peersFn = f; } };
    if (LOCAL) {
      const bc = new BroadcastChannel('zsr-' + name), seen = {}; let mine = null;
      const list = () => Object.values(seen).map(x => x.s).concat(mine ? [mine] : []);
      const tick = () => {
        if (mine) bc.postMessage({ t: '_p', id: myId, s: mine });
        const now = Date.now(); let ch = false;
        for (const id in seen) if (now - seen[id].at > 3500) { delete seen[id]; ch = true; }
        if (ch && peersFn) peersFn(list());
      };
      bc.onmessage = e => {
        const m = e.data;
        if (m.t === '_p') { const nw = !seen[m.id] || JSON.stringify(seen[m.id].s) !== JSON.stringify(m.s); seen[m.id] = { s: m.s, at: Date.now() }; if (nw && peersFn) peersFn(list()); }
        else if (m.t === '_bye') { delete seen[m.id]; peersFn && peersFn(list()); }
        else emit(m.t, m.d);
      };
      const iv = setInterval(tick, 1000);
      return Object.assign(api, {
        send: (ev, d) => bc.postMessage({ t: ev, d: d }),
        track: s => { mine = s; tick(); peersFn && peersFn(list()); },
        close: () => { clearInterval(iv); bc.postMessage({ t: '_bye', id: myId }); bc.close(); }
      });
    }
    await loadScript('lib/supabase.js');
    if (!sb) sb = window.supabase.createClient(SB_URL, SB_KEY, { auth: { persistSession: false } });
    const ch = sb.channel('zsr-' + name, { config: { broadcast: { self: false }, presence: { key: myId } } });
    ch.on('broadcast', { event: 'm' }, ({ payload }) => emit(payload.t, payload.d));
    const list = () => Object.values(ch.presenceState()).map(a => a[0]).filter(Boolean);
    ch.on('presence', { event: 'sync' }, () => peersFn && peersFn(list()));
    const st = await new Promise(res => { ch.subscribe(s => { if (['SUBSCRIBED', 'CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(s)) res(s); }); setTimeout(() => res('TIMED_OUT'), 10000); });
    if (st !== 'SUBSCRIBED') { sb.removeChannel(ch); throw new Error(st); }
    return Object.assign(api, {
      send: (ev, d) => ch.send({ type: 'broadcast', event: 'm', payload: { t: ev, d: d } }),
      track: s => ch.track(s),
      close: () => { try { ch.untrack(); } catch (e) { } sb.removeChannel(ch); }
    });
  }
  return { channel, myId, LOCAL };
})();
