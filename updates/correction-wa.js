// ==== WidFactory compat + readiness hooks (o que o correction-wa.js fazia) ====
(function(){
  function applyWF(WF){
    if (!WF) return false;
    var f = WF.createWid || WF.createWidFromWid || WF.createWidFromString;
    if (!f) return false;
    if (typeof WF.toUserWid         !== 'function') WF.toUserWid         = f;
    if (typeof WF.toUserWidOrThrow  !== 'function') WF.toUserWidOrThrow  = f;
    if (typeof WF.toWid             !== 'function') WF.toWid             = f;
    return true;
  }
  function findWF(){
    var w = (window.WPP && WPP.whatsapp) || null;
    if (!w) return null;
    return w.WidFactory || w.widFactory || (w.WidFactory && w.WidFactory.default) || null;
  }
  function run(){ return applyWF(findWF()); }

  // tenta agora; se não der, registra para quando o WPP ficar pronto
  if (run()) return;
  try {
    if (window.WPP && WPP.webpack && typeof WPP.webpack.onReady === 'function') {
      WPP.webpack.onReady(function(){ try{ run(); }catch(e){} });
    }
  } catch(e){}
  try {
    if (window.WPP && typeof WPP.on === 'function') {
      WPP.on('conn.main_ready', function(){ try{ run(); }catch(e){} });
    }
  } catch(e){}
})();


// helpers-wa.js (clean)
(function () {
  if (window.__wpp_helpers_v1) return;
  window.__wpp_helpers_v1 = true;

  // =================== utils ===================
  function toSer(x){
    if (!x) return '';
    if (x._serialized) return x._serialized;
    if (x.id && x.id._serialized) return x.id._serialized;
    if (x.wid && x.wid._serialized) return x.wid._serialized;
    if (x.user && x.user._serialized) return x.user._serialized;
    if (typeof x === 'string') return x;
    return String(x||'');
  }
  function norm(j){
    if (!j) return '';
    j = String(toSer(j)||'').toLowerCase();
    j = j.replace('@s.whatsapp.net','@c.us').replace('@whatsapp.net','@c.us');
    const at = j.indexOf('@'), colon = j.indexOf(':');
    if (colon > -1 && (at === -1 || colon < at)) j = j.slice(0, colon) + (at > -1 ? j.slice(at) : '');
    return j;
  }
  function arrFromModels(m){
    try{ if (m && typeof m.getModelsArray === 'function') return m.getModelsArray()||[]; }catch(e){}
    try{ if (m && m.models && m.models.length){ const a=[]; for (let i=0;i<m.models.length;i++) a.push(m.models[i]); return a; } }catch(e){}
    try{ if (m && m._models && m._models.length){ const b=[]; for (let j=0;j<m._models.length;j++) b.push(m._models[j]); return b; } }catch(e){}
    return [];
  }
  function getChatsAny(){
    const ww = (window.WPP && WPP.whatsapp) ? WPP.whatsapp : null;
    try{ if (window.WPP && WPP.chat && typeof WPP.chat.list === 'function') return {mode:'WPP.chat.list', chatsPromise: WPP.chat.list()}; }catch(e){}
    let arr = [];
    try{ const a=arrFromModels(ww && ww.ChatStore);    if (a.length) arr=arr.concat(a); }catch(e){}
    try{ const b=arrFromModels(ww && ww.ContactStore); if (b.length) arr=arr.concat(b); }catch(e){}
    const seen={}, out=[];
    for (let i=0;i<arr.length;i++){
      const c=arr[i], id=norm(c && (c.id||c));
      if (!id) continue;
      if (!seen[id]){ seen[id]=1; out.push(c); }
    }
    return {mode:'Store(Chat+Contact)', chats: out};
  }
  function getContactsAny(){
    const ww = (window.WPP && WPP.whatsapp) ? WPP.whatsapp : null;
    try{ if (window.WPP && WPP.contact && typeof WPP.contact.list === 'function') return {mode:'WPP.contact.list', contactsPromise: WPP.contact.list()}; }catch(e){}
    const arr = arrFromModels(ww && ww.ContactStore);
    return {mode:'Store.ContactStore', contacts: arr||[]};
  }
  function getChatLabelsArray(c){
    try{ if (c && c.labels && Array.isArray(c.labels.models)) return c.labels.models; }catch(e){}
    try{ if (c && Array.isArray(c.labels)) return c.labels; }catch(e){}
    try{ if (c && c.__x_labels && c.__x_labels.models) return c.__x_labels.models; }catch(e){}
    try{
      if (c && c.labelsIndex && typeof c.labelsIndex === 'object'){
        const arr=[], li=c.labelsIndex;
        for (const lid in li){ if (li.hasOwnProperty(lid) && li[lid]) arr.push({id:lid}); }
        return arr;
      }
    }catch(e){}
    return [];
  }
  function buildLabelMap(cb){
    const map = {};
    try{
      if (window.WPP && WPP.labels && typeof WPP.labels.getAllLabels === 'function'){
        const p = WPP.labels.getAllLabels();
        if (p && typeof p.then === 'function'){
          p.then(function(all){
            if (Array.isArray(all)){
              for (let i=0;i<all.length;i++){
                const l=all[i];
                const id = String((l && (l.id||l.lid||l.labelId||l._serialized)) || l || '').trim();
                const nm = String((l && (l.name||l.title||l.label)) || '').trim();
                if (id) map[id]=nm;
              }
            }
            finish();
          }).catch(function(){ finish(); });
          return;
        }
      }
    }catch(e){}
    finish();
    function finish(){
      try{
        const ww = (window.WPP && WPP.whatsapp) ? WPP.whatsapp : null;
        const LS = ww && ww.LabelStore;
        const arr = arrFromModels(LS);
        for (let k=0;k<arr.length;k++){
          const l2=arr[k];
          const id2 = String((l2 && (l2.id||l2.lid||l2.labelId||l2._serialized)) || l2 || '').trim();
          const nm2 = String((l2 && (l2.name||l2.title||l2.label)) || '').trim();
          if (id2 && !map[id2]) map[id2]=nm2;
        }
      }catch(e){}
      try{ cb(map); }catch(e){}
    }
  }
  function getMyId(){
    const cands = [];
    try{ cands.push(toSer(WPP && WPP.conn && WPP.conn.wid)); }catch(e){}
    try{ cands.push(toSer(WPP && WPP.conn && WPP.conn.user && WPP.conn.user.id)); }catch(e){}
    try{ cands.push(toSer(WPP && WPP.whatsapp && WPP.whatsapp.Conn && WPP.whatsapp.Conn.wid)); }catch(e){}
    for (let i=0;i<cands.length;i++){ const s=norm(cands[i]); if (s) return s; }
    return '';
  }

  // mime / jid helpers
  const __mimeFromExt = (fn='') => {
    const e = (fn || '').toLowerCase().split('.').pop() || '';
    const map = {
      jpg:'image/jpeg', jpeg:'image/jpeg', png:'image/png', webp:'image/webp', gif:'image/gif',
      mp4:'video/mp4', mov:'video/quicktime', m4v:'video/x-m4v', webm:'video/webm',
      mp3:'audio/mpeg', m4a:'audio/mp4',
      ogg:'audio/ogg; codecs=opus',  // <-- altere aqui
      oga:'audio/ogg; codecs=opus',  // <-- altere aqui
      opus:'audio/ogg; codecs=opus', // <-- altere aqui
      weba:'audio/webm', wav:'audio/wav',
      pdf:'application/pdf',
      doc:'application/msword', docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      xls:'application/vnd.ms-excel', xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      txt:'text/plain'
    };
    return map[e] || 'application/octet-stream';
  };
  
  const __ensureJid = (s) => {
    if (!s) return '';
    s = String(s).trim().toLowerCase();
    if (s.endsWith('@g.us') || s.endsWith('@c.us')) return s;
    if (/^\d+$/.test(s)) return s + '@c.us';
    return s;
  };

  async function __ensureDataUrl(src, fallbackMime) {
    if (!src) return null;
    if (/^data:/i.test(src))   return src;          // já é data URL
    if (/^https?:\/\//i.test(src)) return src;      // deixe o WA baixar direto
    if (/^blob:/i.test(src)) {                       // converte blob -> data:
      const res = await fetch(src);
      const blob = await res.blob();
      const buf  = await blob.arrayBuffer();
      const b64  = btoa(String.fromCharCode(...new Uint8Array(buf)));
      return `data:${blob.type || fallbackMime || 'application/octet-stream'};base64,${b64}`;
    }
    // base64 cru sem prefixo
    return `data:${fallbackMime || 'application/octet-stream'};base64,${src}`;
  }

  // =================== labels / lists ===================
  window.__wppChatsByLabel = function(labelName, showConsole){
    const wanted = String(labelName||'').trim().toLowerCase();
    window.__wpp_chats_by_labels = '[]';
    buildLabelMap(function(id2name){
      const got = getChatsAny();
      function process(chats){
        const out=[];
        for (let i=0;i<(chats||[]).length;i++){
          const c=chats[i];
          const id=norm(c && (c.id||c)); if (!id) continue;
          const suf=id.slice(-5); if (suf!=='@c.us' && suf!=='@g.us') continue;
          const labs=getChatLabelsArray(c);
          let match=false; const labelsOut=[];
          for (let k=0;k<labs.length;k++){
            const l=labs[k];
            const lid=String((l && (l.id||l.lid||l.labelId)) || l || '').trim();
            const nm=String((l && (l.name||l.title)) || (id2name[lid]||'')).trim();
            if (nm) labelsOut.push(nm);
            if (!match && nm && nm.toLowerCase()===wanted) match=true;
          }
          if (!match) continue;
          let groupName='', name='';
          try{ groupName=(c.groupMetadata&&c.groupMetadata.subject) || (c.__x_groupMetadata&&c.__x_groupMetadata.subject) || c.name || ''; }catch(e){}
          try{ name=c.formattedName || (c.contact&&c.contact.name) || groupName || ''; }catch(e){}
          out.push({ id:id, name:name, labels: labelsOut.join(', ') });
        }
        if (showConsole){ try{ console.table(out.slice(0,100)); }catch(e){ console.log(out); } console.log('Total:', out.length); }
        window.__wpp_chats_by_labels = JSON.stringify(out);
      }
      if (got.chatsPromise && typeof got.chatsPromise.then==='function'){
        got.chatsPromise.then(process).catch(function(e){ window.__wpp_chats_by_labels = JSON.stringify({__err:String(e&&e.message||e)}); if (showConsole) console.error(e); });
      }else{
        process(got.chats||[]);
      }
    });
  };

  window.__wppGetGroupParticipants = function(gid, showConsole){
    window.__wpp_gp = '[]';
    const J = (p) => ({
      id: toSer(p && (p.id||p.wid||p.user)),
      name: (p && p.contact && (p.contact.name||p.contact.pushname)) || p.displayName || p.name || '',
      isAdmin: !!(p && (p.isAdmin || String(p.admin).toLowerCase()==='admin' || String(p.admin).toLowerCase()==='superadmin')),
      isSuperAdmin: !!(p && (p.isSuperAdmin || String(p.admin).toLowerCase()==='superadmin'))
    });
    try{
      if (window.WPP && WPP.group && typeof WPP.group.getParticipants === 'function'){
        WPP.group.getParticipants(gid).then(function(arr){
          arr = arr || [];
          const rows = [];
          for (let i=0;i<arr.length;i++) rows.push(J(arr[i]));
          if (showConsole){ try{ console.table(rows.slice(0,100)); }catch(e){ console.log(rows); } console.log('Total:', rows.length); }
          window.__wpp_gp = JSON.stringify(rows);
        }).catch(function(e){
          window.__wpp_gp = JSON.stringify({ __err: String(e&&e.message||e) });
          if (showConsole) console.error(e);
        });
        return;
      }
    }catch(e){}

    try{
      const ww = (WPP && WPP.whatsapp) || {};
      const GS = ww.GroupMetadataStore, CS = ww.ChatStore;
      let meta = null;
      try{ meta = GS && GS.find && GS.find(gid); }catch(e){}
      if (!meta){
        try{
          const chat = CS && (CS.get && CS.get(gid));
          meta = chat && (chat.groupMetadata || chat.__x_groupMetadata);
        }catch(e){}
      }
      const parts = (meta && meta.participants) || [];
      const rows2 = [];
      for (let j=0;j<parts.length;j++) rows2.push(J(parts[j]));
      if (showConsole){ try{ console.table(rows2.slice(0,100)); }catch(e){ console.log(rows2); } console.log('Total:', rows2.length); }
      window.__wpp_gp = JSON.stringify(rows2);
    }catch(e){
      window.__wpp_gp = JSON.stringify({ __err: String(e&&e.message||e) });
      if (showConsole) console.error(e);
    }
  };

  window.__wppGetGroupsWithRoles = function(showConsole){
    window.__wpp_groups_roles = '[]';
    const myId = (window.__wpp_myid || window.__wppFixMyId?.() || '') || '';
    const toSer2 = x => (x && (x._serialized || x.id?._serialized || x.wid?._serialized || x.user?._serialized)) || (typeof x === 'string' ? x : '') || '';
    const norm2  = j => {
      if (!j) return '';
      j = String(toSer2(j) || j).toLowerCase()
            .replace('@s.whatsapp.net','@c.us')
            .replace('@whatsapp.net','@c.us');
      const at = j.indexOf('@'), colon = j.indexOf(':');
      if (colon > -1 && (at === -1 || colon < at)) j = j.slice(0, colon) + (at > -1 ? j.slice(at) : '');
      return j;
    };
    const isAdminsOnly = (meta,g) => {
      try{
        if (meta?.announce || meta?.announcement || meta?.onlyAdmins ||
            meta?.announcementGroup || meta?.announcements ||
            meta?.isAnnounce || meta?.isAnnouncementGroup ||
            g?.announce || g?.announcement || g?.onlyAdmins) return true;
        const v = (meta?.groupSendPermissions || meta?.sendMessagesPermissions ||
                   meta?.sendPermission || g?.groupSendPermissions ||
                   g?.sendMessagesPermissions || g?.sendPermission);
        if (typeof v === 'string' && v.toLowerCase().includes('admin')) return true;
        if (meta?.restrictMessages === true) return true;
        return false;
      }catch(e){ return false; }
    };

    (async () => {
      try {
        const chats = await (WPP?.chat?.list?.() || Promise.resolve([]));
        const groups = (chats||[]).filter(c => norm2(c?.id).endsWith('@g.us'));
        const rows = [];
        for (const g of groups) {
          const gid  = norm2(g?.id);
          const name = g?.contact?.name || g?.formattedTitle || g?.name || '';
          let iAmParticipant = false, iAmAdmin = false;
          try { iAmParticipant = !!(await WPP?.group?.iAmMember?.(gid)); } catch {}
          try { iAmAdmin       = !!(await WPP?.group?.iAmAdmin?.(gid));  } catch {}

          let meta = g?.groupMetadata || g?.__x_groupMetadata;
          if (!meta && WPP?.group?.getGroupMetadata) { try { meta = await WPP.group.getGroupMetadata(gid); } catch {} }
          if (!meta) {
            try {
              const ww = (WPP && WPP.whatsapp) || {};
              const GS = ww.GroupMetadataStore, CS = ww.ChatStore;
              meta = GS?.find?.(gid) || CS?.get?.(gid)?.groupMetadata || CS?.get?.(gid)?.__x_groupMetadata || null;
            } catch {}
          }

          let participants = [];
          if (Array.isArray(meta?.participants)) participants = meta.participants;
          else if (WPP?.group?.getParticipants) { try { participants = await WPP.group.getParticipants(gid); } catch {} }

          let iAmSuperAdmin = false;
          try {
            const owner = norm2(meta?.owner || meta?.creator);
            if (owner && myId && owner.split('@')[0] === myId.split('@')[0]) iAmSuperAdmin = true;
          } catch {}
          if (!iAmSuperAdmin && myId && Array.isArray(participants)) {
            const me = participants.find(p => {
              const pid = norm2((p && (p.id||p.wid||p.user)) || p);
              return pid && pid.split('@')[0] === myId.split('@')[0];
            });
            if (me) {
              const a = String(me.admin || '').toLowerCase();
              if (a==='admin' || a==='superadmin') iAmAdmin = true;
              if (a==='superadmin' || me.isSuperAdmin) iAmSuperAdmin = true;
              iAmParticipant = true;
            }
          }

          const adminsOnly = isAdminsOnly(meta, g);
          const canSend = !!(iAmParticipant && (!adminsOnly || iAmAdmin || iAmSuperAdmin));
          const participantsCount = Array.isArray(participants) ? participants.length : (meta?.participants?.length || 0);
          rows.push({ gid, name, iAmParticipant, iAmAdmin, iAmSuperAdmin, participantsCount: participantsCount|0, canSend });
        }
        if (showConsole) { try { console.table(rows.slice(0,100)); } catch { console.log(rows); } console.log('Total grupos:', rows.length); }
        window.__wpp_groups_roles = JSON.stringify(rows);
      } catch (e) {
        window.__wpp_groups_roles = JSON.stringify({ __err: (e && e.message) || String(e) });
        if (showConsole) console.error(e);
      }
    })();
  };

 // Lista enxuta de grupos: [{ gid, name }]
  window.__wppGetGroupsShort = function (showConsole) {
    window.__wpp_groups_short = '[]';

    const toSer = x =>
      (x && (x._serialized || x.id?._serialized || x.wid?._serialized || x.user?._serialized)) ||
      (typeof x === 'string' ? x : '') || '';

    const norm = j => {
      if (!j) return '';
      j = String(toSer(j) || j).toLowerCase()
        .replace('@s.whatsapp.net','@c.us')
        .replace('@whatsapp.net','@c.us');
      const at = j.indexOf('@'), colon = j.indexOf(':');
      if (colon > -1 && (at === -1 || colon < at)) j = j.slice(0, colon) + (at > -1 ? j.slice(at) : '');
      return j;
    };

    (async () => {
      try {
        let chats = [];
        try { chats = await (WPP?.chat?.list?.() || Promise.resolve([])); } catch {}
        let groups = (chats || []).filter(c => norm(c?.id).endsWith('@g.us'));

        // fallback por Store
        if (!groups.length) {
          try {
            const w  = (WPP && WPP.whatsapp) || {};
            const CS = w.ChatStore;
            const arr = (CS?.getModelsArray?.() || CS?.models || CS?._models || []);
            groups = (arr || []).filter(c => norm(c?.id).endsWith('@g.us'));
          } catch {}
        }

        const rows = [];
        for (const g of (groups || [])) {
          const gid  = norm(g?.id);
          const name = g?.contact?.name || g?.formattedTitle || g?.name || g?.__x_name || '';
          if (gid) rows.push({ gid, name });
        }

        if (showConsole) { try { console.table(rows.slice(0,100)); } catch { console.log(rows); } }
        window.__wpp_groups_short = JSON.stringify(rows);
      } catch (e) {
        window.__wpp_groups_short = JSON.stringify({ __err: (e && e.message) || String(e) });
        if (showConsole) console.error(e);
      }
    })();
  };

  window.__wppGetContactsWithLabels = function(showConsole){
    window.__wpp_contacts = '[]';
    buildLabelMap(function(id2name){
      const gotChats = getChatsAny();
      function mapChats(chats){
        const labelsByJid = {};
        for (let i=0;i<(chats||[]).length;i++){
          const ch=chats[i], jid=norm(ch && (ch.id||ch));
          if (!jid) continue;
          const labs=getChatLabelsArray(ch);
          const names=[];
          for (let k=0;k<labs.length;k++){
            const l=labs[k];
            const lid=String((l && (l.id||l.lid||l.labelId)) || l || '').trim();
            const nm=String((l && (l.name||l.title)) || (id2name[lid]||'')).trim();
            if (nm) names.push(nm);
          }
          labelsByJid[jid] = names.join(', ');
        }
        const gotC = getContactsAny();
        function processContacts(contacts){
          const rows=[];
          for (let j=0;j<(contacts||[]).length;j++){
            const c=contacts[j];
            const id=norm(c && (c.id||c));
            if (!id || id.slice(-5)!=='@c.us') continue;
            let name=''; try{ name=(c.contact&&c.contact.name) || c.formattedName || c.pushname || c.name || ''; }catch(e){}
            rows.push({ id:id, name:name, labels: labelsByJid[id] || '' });
          }
          if (showConsole){ try{ console.table(rows.slice(0,100)); }catch(e){ console.log(rows); } console.log('Total contatos:', rows.length); }
          window.__wpp_contacts = JSON.stringify(rows);
        }
        if (gotC.contactsPromise && typeof gotC.contactsPromise.then==='function'){
          gotC.contactsPromise.then(processContacts).catch(function(e){ window.__wpp_contacts = JSON.stringify({__err:String(e&&e.message||e)}); if (showConsole) console.error(e); });
        }else{
          processContacts(gotC.contacts||[]);
        }
      }
      if (gotChats.chatsPromise && typeof gotChats.chatsPromise.then==='function'){
        gotChats.chatsPromise.then(mapChats).catch(function(e){ window.__wpp_contacts = JSON.stringify({__err:String(e&&e.message||e)}); if (showConsole) console.error(e); });
      }else{
        mapChats(gotChats.chats||[]);
      }
    });
  };

  window.__wppGetChatsWithLabels = function(showConsole){
    window.__wpp_chats = '[]';
    buildLabelMap(function(id2name){
      const got = getChatsAny();
      function process(chats){
        const rows=[];
        for (let i=0;i<(chats||[]).length;i++){
          const c=chats[i];
          const id=norm(c && (c.id||c));
          if (!id || id.slice(-5)!=='@c.us') continue;
          let name=''; try{ name=c.formattedName || (c.contact&&c.contact.name) || c.name || ''; }catch(e){}
          const labs=getChatLabelsArray(c), names=[];
          for (let k=0;k<labs.length;k++){
            const l=labs[k]; const lid=String((l&&(l.id||l.lid||l.labelId))||l||'').trim();
            const nm=String((l&&(l.name||l.title))||(id2name[lid]||'')).trim();
            if (nm) names.push(nm);
          }
          rows.push({ id:id, name:name, labels:names.join(', ') });
        }
        if (showConsole){ try{ console.table(rows.slice(0,100)); }catch(e){ console.log(rows); } console.log('Total chats (contatos):', rows.length); }
        window.__wpp_chats = JSON.stringify(rows);
      }
      if (got.chatsPromise && typeof got.chatsPromise.then==='function'){
        got.chatsPromise.then(process).catch(function(e){ window.__wpp_chats = JSON.stringify({__err:String(e&&e.message||e)}); if (showConsole) console.error(e); });
      }else{
        process(got.chats||[]);
      }
    });
  };

  window.__wppGetContacts = function(showConsole){
    window.__wpp_contacts = '[]';
    const got = getContactsAny();
    function process(contacts){
      const rows=[];
      for (let i=0;i<(contacts||[]).length;i++){
        const c=contacts[i];
        const id=norm(c && (c.id||c));
        if (!id || id.slice(-5)!=='@c.us') continue;
        let name=''; try{ name=(c.contact&&c.contact.name) || c.formattedName || c.pushname || c.name || ''; }catch(e){}
        rows.push({ id:id, name:name });
      }
      if (showConsole){ try{ console.table(rows.slice(0,100)); }catch(e){ console.log(rows); } console.log('Total contatos:', rows.length); }
      window.__wpp_contacts = JSON.stringify(rows);
    }
    if (got.contactsPromise && typeof got.contactsPromise.then==='function'){
      got.contactsPromise.then(process).catch(function(e){ window.__wpp_contacts = JSON.stringify({__err:String(e&&e.message||e)}); if (showConsole) console.error(e); });
    }else{
      process(got.contacts||[]);
    }
  };

  window.__wppGetAllLabelsWithCounts = function(showConsole){
    window.__wpp_labels = '[]';
    buildLabelMap(function(id2name){
      const order=[]; for (const lid in id2name){ if (id2name.hasOwnProperty(lid)) order.push(lid); }
      const counts={}; for (let i=0;i<order.length;i++) counts[order[i]]=0;

      const got = getChatsAny();
      function process(chats){
        for (let i=0;i<(chats||[]).length;i++){
          const c=chats[i], labs=getChatLabelsArray(c);
          for (let k=0;k<labs.length;k++){
            const l=labs[k]; const lid=String((l&&(l.id||l.lid||l.labelId))||l||'').trim();
            if (counts.hasOwnProperty(lid)) counts[lid] += 1;
          }
        }
        const rows=[];
        for (let j=0;j<order.length;j++){
          const id=order[j]; rows.push({ id:id, name:id2name[id]||'', count: counts[id]||0 });
        }
        if (showConsole){ try{ console.table(rows.slice(0,100)); }catch(e){ console.log(rows); } console.log('Total etiquetas:', rows.length); }
        window.__wpp_labels = JSON.stringify(rows);
      }
      if (got.chatsPromise && typeof got.chatsPromise.then==='function'){
        got.chatsPromise.then(process).catch(function(e){ window.__wpp_labels = JSON.stringify({__err:String(e&&e.message||e)}); if (showConsole) console.error(e); });
      }else{
        process(got.chats||[]);
      }
    });
  };

  // =================== group permission check ===================
  window.__wppCanISendToGroup = async function(gid, debug=false){
    const toStr = x => (x && (x._serialized || x.id?._serialized || x.wid?._serialized || x.user?._serialized)) || (typeof x==='string'?x:'') || '';
    const normG = j => {
      j = String(toStr(j)||'').trim().toLowerCase();
      if (!j.includes('@')) j += '@g.us';
      return j.replace('@c.us','@g.us').replace('@s.whatsapp.net','@g.us');
    };
    gid = normG(gid);

    try { await WPP.group.ensureGroupAndParticipants(gid); } catch {}
    const w = WPP?.whatsapp;
    const chat = w?.ChatStore?.get?.(gid) || null;

    let meta = chat?.groupMetadata || chat?.__x_groupMetadata || null;
    if (!meta && WPP?.group?.getGroupMetadata) { try { meta = await WPP.group.getGroupMetadata(gid); } catch {} }
    if (!meta) { try { meta = w?.GroupMetadataStore?.find?.(gid) || w?.GroupMetadataStore?.get?.(gid) || null; } catch {} }

    const adminsOnly = !!(
      meta?.announce || meta?.announcement || meta?.onlyAdmins || meta?.restrictMessages ||
      meta?.announcementGroup || meta?.announcements || meta?.isAnnounce || meta?.isAnnouncementGroup ||
      chat?.announce || chat?.announcement || chat?.onlyAdmins ||
      (typeof meta?.groupSendPermissions === 'string' && meta.groupSendPermissions.toLowerCase().includes('admin')) ||
      (typeof meta?.sendMessagesPermissions === 'string' && meta.sendMessagesPermissions.toLowerCase().includes('admin')) ||
      (typeof meta?.sendPermission === 'string' && meta.sendPermission.toLowerCase().includes('admin'))
    );

    let member=false, admin=false;
    try { member = !!(await WPP.group.iAmMember(gid)); } catch {}
    try { admin  = !!(await WPP.group.iAmAdmin(gid));  } catch {}

    let canWriteByChat = null;
    try {
      canWriteByChat = (typeof chat?.canSendMessage === 'function' ? !!chat.canSendMessage() : null);
      if (canWriteByChat === null && typeof chat?.canWrite === 'function') canWriteByChat = !!chat.canWrite();
      if (canWriteByChat === null && typeof chat?.isSendAllowed === 'function') canWriteByChat = !!chat.isSendAllowed();
      if (canWriteByChat === null && typeof chat?.isWritable === 'function') canWriteByChat = !!chat.isWritable();
      if (canWriteByChat === null && typeof chat?.hasWritePermission === 'function') canWriteByChat = !!chat.hasWritePermission();
      if (canWriteByChat === null && typeof chat?.composeSettings === 'function') canWriteByChat = !!chat.composeSettings()?.canSend;
      if (canWriteByChat === null && typeof chat?.getComposeSettings === 'function') canWriteByChat = !!chat.getComposeSettings()?.canSend;
      if (canWriteByChat === null && typeof chat?.isReadOnly !== 'undefined') canWriteByChat = !chat.isReadOnly;
      if (canWriteByChat === null && typeof chat?.__x_isReadOnly !== 'undefined') canWriteByChat = !chat.__x_isReadOnly;
      if (canWriteByChat === null && typeof chat?.__x_isGroupAnnounce !== 'undefined') canWriteByChat = !chat.__x_isGroupAnnounce;
    } catch {}

    const byPolicy = member && (!adminsOnly || admin);
    const canSend  = !!(byPolicy && (canWriteByChat !== false));

    if (debug) {
      const row = {
        gid,
        name: chat?.formattedTitle || chat?.contact?.name || chat?.name || '',
        adminsOnly, member, admin, canWriteByChat,
        isReadOnly: chat?.isReadOnly ?? chat?.__x_isReadOnly ?? null,
        isGroupAnnounce: chat?.__x_isGroupAnnounce ?? null,
        canSend
      };
      try { console.table([row]); } catch { console.log(row); }
    }
    return canSend;
  };

  // Envia texto com menções e garante compatibilidade de destaque
  window.__wppSendTextWithMentions = async (groupJid, text, mentionJids) => {
    const ensure = (s)=> {
      s = String(s||'').trim().toLowerCase();
      if (/@(c|g)\.us$/.test(s)) return s;
      if (/^\d+$/.test(s)) return s + '@c.us';
      return s;
    };
    const gid  = ensure(groupJid);
    const jids = (mentionJids||[]).map(ensure).filter(Boolean);

    // Se o texto não contém @<numero> de algum jid, adiciona no final
    let t = String(text||'');
    for (const j of jids) {
      const num = j.split('@')[0];
      if (!t.includes('@'+num)) t += (t.endsWith(' ')?'':' ') + '@' + num;
    }

    return await WPP.chat.sendTextMessage(gid, t, { mentions: jids });
  };

  // =================== open / check number ===================
  window.__wppOpen = async (jidOrNumber, debug = false) => {
    const jid = __ensureJid(jidOrNumber);
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const w   = WPP?.whatsapp || {};

    const F = (w.WidFactory || w.widFactory || w.WidFactory?.default) || {};
    const toWid =
      F.toWid || F.toUserWid || F.createWid || F.createWidFromWid || F.createWidFromString ||
      w.WidFactory?.createWid || w.widFactory?.createWid || null;
    const wid = toWid ? toWid(jid) : jid;

    const used = []; let okSoft = false;
    try { if (jid.endsWith('@g.us')) { await WPP.group.ensureGroupAndParticipants(jid); used.push('ensureGroupAndParticipants'); } } catch {}

    try { if (WPP?.chat?.openChatBottom)     { used.push('WPP.chat.openChatBottom');     await WPP.chat.openChatBottom(jid);     okSoft = true; } } catch {}
    try { if (WPP?.chat?.openChatFromUnread) { used.push('WPP.chat.openChatFromUnread'); await WPP.chat.openChatFromUnread(jid); okSoft = true; } } catch {}
    try { if (WPP?.chat?.openChat)           { used.push('WPP.chat.openChat');           await WPP.chat.openChat(jid);           okSoft = true; } } catch {}

    try { if (w.Cmd?.openChatAt)             { used.push('Cmd.openChatAt');             await w.Cmd.openChatAt(wid);            okSoft = true; } } catch {}
    try { if (w.Cmd?.openChat)               { used.push('Cmd.openChat');               await w.Cmd.openChat(wid);              okSoft = true; } } catch {}
    try { if (w.Router?.openChat)            { used.push('Router.openChat');            await w.Router.openChat(wid);           okSoft = true; } } catch {}

    await sleep(60);
    try {
      let chat = w.ChatStore?.get?.(wid) || w.ChatStore?.find?.(wid) || null;
      try { if (!chat && w.ChatStore?.getOrCreate) chat = w.ChatStore.getOrCreate(wid); } catch {}
      if (chat?.select) { chat.select(); used.push('chat.select()'); okSoft = true; }
    } catch {}

    await sleep(60);
    let active = null;
    try { active = w.ChatStore?.getActive?.() || w.ChatStore?.getActiveChat?.() || w.ChatStore?.active || null; } catch {}
    const toSer3 = (x) => (x?._serialized || x?.id?._serialized || x?.id || x?.user || String(x)||'').toLowerCase();
    const activeId = toSer3(active);
    const jidKey   = String(jid).split('@')[0].toLowerCase();
    const ok = (activeId.includes(jidKey)) || okSoft;
    if (debug) console.log('[__wppOpen]', { jid, wid, used, activeId, ok });
    return !!ok;
  };

    
  // =================== send: text + media ===================
  window.__wppSendText = async (jidOrNumber, text, opts) => {
    const jid = __ensureJid(jidOrNumber);
    const fn = WPP?.chat?.sendTextMessage || WPP?.chat?.sendMessage;
    if (!fn) throw new Error('sendTextMessage indisponível');
    return await fn(jid, String(text||''), opts||{});
  };

  window.__wppSendMedia = async ({jid: jidOrNumber, file, filename, caption, forceMime, ptt, type}) => {
    const jid = __ensureJid(jidOrNumber);
    const sendFile = WPP?.chat?.sendFileMessage;
    if (!sendFile) throw new Error('sendFileMessage indisponível');

    let src = file;
    if (typeof file === 'string' && !/^https?:\/\//i.test(file) && !/^data:/i.test(file)) {
      const mime = forceMime || __mimeFromExt(filename||'');
      src = `data:${mime};base64,${file}`;
    }

    const options = {};
    if (filename) options.filename = filename;
    if (caption)  options.caption  = caption;
    if (type)     options.type     = type;
    if (ptt === true) {
      options.ptt     = true;
      options.isPtt   = true;
      options.type    = 'audio';
      options.waveform = true;
    }

    return await sendFile(jid, src, options);
  };

  // açúcares
  window.__wppSendImageUrl    = (jid, url, caption, filename)               => __wppSendMedia({jid, file:url, filename:filename||null, caption});
  window.__wppSendImageB64    = (jid, b64, caption, filename='image.jpg')   => __wppSendMedia({jid, file:b64, filename, caption, forceMime:__mimeFromExt(filename)});
  window.__wppSendVideoUrl    = (jid, url, caption, filename)               => __wppSendMedia({jid, file:url, filename:filename||null, caption});
  window.__wppSendVideoB64    = (jid, b64, caption, filename='video.mp4')   => __wppSendMedia({jid, file:b64, filename, caption, forceMime:__mimeFromExt(filename)});
  window.__wppSendAudioUrl    = (jid, url, ptt=false, filename)             => __wppSendMedia({jid, file:url, filename:filename||null, ptt});
  window.__wppSendAudioB64    = (jid, b64, ptt=false, filename='audio.ogg') => __wppSendMedia({jid, file:b64, filename, forceMime:__mimeFromExt(filename), ptt});
  window.__wppSendDocumentUrl = (jid, url, filename)                        => __wppSendMedia({jid, file:url, filename:filename||null});
  window.__wppSendDocumentB64 = (jid, b64, filename='file.pdf')             => __wppSendMedia({jid, file:b64, filename, forceMime:__mimeFromExt(filename)});

  window.__wppSendVideoNote = async (jidOrNumber, fileOrUrl, filename='note.mp4', mimeHint) => {
    const jid = __ensureJid(jidOrNumber);
    const sendFile = WPP?.chat?.sendFileMessage;
    if (!sendFile) throw new Error('sendFileMessage indisponível');
  
    const guessed = mimeHint || __mimeFromExt(filename || 'note.mp4');
    const src = await __ensureDataUrl(fileOrUrl, guessed);
  
    // Caminho “oficial” (quando existe)
    if (typeof WPP?.chat?.sendVideoMessage === 'function') {
      try {
        return await WPP.chat.sendVideoMessage(jid, src, {
          ptv: true, videoNote: true, filename
        });
      } catch (e) {
        console.warn('[PTV] sendVideoMessage falhou:', e);
      }
    }
  
    // Fallbacks (cobrem diferentes versões do WA-JS)
    const tries = [
      // coloque primeiro o combo mais aceito:
      { filename, type:'video', isPtv:true, ptv:true, videoNote:true, asVideoNote:true, sendMediaAsVideoNote:true },
  
      // variantes vistas em builds antigos/novos:
      { filename, type:'ptv' },
      { filename, type:'video', isPtv:true },
      { filename, type:'video', isVideoMessage:true, isNote:true },
      { filename, videoType:'ptv' },
    ];
  
    for (const opt of tries) {
      try {
        return await sendFile(jid, src, opt);
      } catch (e) {
        console.warn('[PTV] tentativa falhou', opt, e);
      }
    }
  
    console.warn('[PTV] todas as tentativas falharam; enviando como vídeo comum.');
    return await sendFile(jid, src, { filename, type:'video' });
  };
  
  // aliases enxutos (sem duplicar definições)
  window.__wppSendVideoNoteUrl = (jid, urlOrB64, filename='note.mp4') => __wppSendVideoNote(jid, urlOrB64, filename);
  window.__wppSendVideoNoteB64 = (jid, b64,       filename='note.mp4') => __wppSendVideoNote(jid, b64,       filename);

  window.__wppSendVCard = async (to, vcardOrIdOrArray, name='Contato') => {
    const ensure = typeof __ensureJid === 'function'
      ? __ensureJid
      : (s)=>{ s=String(s||'').trim().toLowerCase(); return /@c\.us|@g\.us$/.test(s)?s:/^\d+$/.test(s)?s+'@c.us':s; };
  
    const jid = ensure(to);
  
    try {
      // vCard em texto (BEGIN:VCARD…)
      if (typeof vcardOrIdOrArray === 'string' && /^\s*BEGIN:VCARD/i.test(vcardOrIdOrArray)) {
        return await WPP.chat.sendRawMessage(jid, {
          type: 'vcard',
          body: vcardOrIdOrArray,
          vcardFormattedName: name
        });
      }
  
      // Único ID ou lista de {id,name}
      if (Array.isArray(vcardOrIdOrArray)) {
        const arr = vcardOrIdOrArray.map(x => ({
          id: ensure(x.id || x),
          name: x.name || name
        }));
        return await WPP.chat.sendVCardContactMessage(jid, arr);
      } else {
        return await WPP.chat.sendVCardContactMessage(jid, {
          id: ensure(vcardOrIdOrArray),
          name
        });
      }
    } catch (e) {
      console.error('[__wppSendVCard] erro:', e);
      throw e;
    }
  };
  
  window.__wppSendSticker = async (jidOrNumber, fileOrUrl, filename = 'sticker.webp') => {
    const jid = __ensureJid(jidOrNumber);
    let src = fileOrUrl;
    if (typeof src === 'string' && !/^https?:\/\//i.test(src) && !/^data:/i.test(src)) {
      src = `data:image/webp;base64,${src}`;
    }
    if (typeof WPP?.chat?.sendSticker === 'function') {
      try { return await WPP.chat.sendSticker(jid, src, { filename }); } catch {}
    }
    const tries = [
      { filename, type:'sticker' },
      { filename, isSticker:true },
      { filename, asSticker:true },
      { filename, sendMediaAsSticker:true }
    ];
    for (const opt of tries) { try { return await WPP.chat.sendFileMessage(jid, src, opt); } catch {} }
    return await WPP.chat.sendFileMessage(jid, src, { filename, caption:'' });
  };

  window.__wppSendImage = async (jid, fileOrUrl, caption, filename) => {
    const sendFile = WPP?.chat?.sendFileMessage;
    if (!sendFile) throw new Error('sendFileMessage indisponível');
    let src = fileOrUrl;
    if (typeof src === 'string' && !/^https?:\/\//i.test(src) && !/^data:/i.test(src)) {
      const mime = __mimeFromExt(filename || 'image.jpg');
      const use = mime.startsWith('image/') ? mime : 'image/jpeg';
      src = `data:${use};base64,${src}`;
    }
    if (typeof WPP?.chat?.sendImageMessage === 'function') {
      try { return await WPP.chat.sendImageMessage(jid, src, { caption, filename }); } catch {}
    }
    const tries = [
      { filename, caption, type:'image' },
      { filename, caption, isImage:true },
      { filename, caption, asImage:true },
      { filename, caption, sendMediaAsDocument:false },
    ];
    for (const opts of tries) { try { return await sendFile(jid, src, opts); } catch {} }
    return await sendFile(jid, src, { filename, caption });
  };

  window.__wppSendVoiceNote = async (jidOrNumber, fileOrUrl, filename='audio.ogg', mimeHint) => {
    const jid = __ensureJid(jidOrNumber);
    const guessed = mimeHint || __mimeFromExt(filename || 'audio.ogg');
  
    // Para PTT, o que mais funciona é OGG/Opus. Se você gravou em webm, considere usar filename='audio.ogg'
    const src = await __ensureDataUrl(fileOrUrl, guessed);
  
    // Se houver API dedicada no seu build:
    if (typeof WPP?.chat?.sendVoiceMessage === 'function') {
      try { return await WPP.chat.sendVoiceMessage(jid, src, { filename, ptt:true }); } catch {}
    }
  
    const tries = [
      // tenta logo o caminho mais compatível:
      { filename, type:'audio', ptt:true, isPtt:true, waveform:true },

      { filename, type:'ptt',   ptt:true, isPtt:true },
      { filename,               ptt:true, isPtt:true },
      { filename, isVoice:true, asVoiceNote:true },
    ];
    for (const opt of tries) { try { return await WPP.chat.sendFileMessage(jid, src, opt); } catch {} }
  
    // Cai como áudio comum (não PTT)
    return await WPP.chat.sendFileMessage(jid, src, { filename });
  };
  
  // Arquivar / desarquivar chat
  window.__wppArchiveChat = async (jidOrNumber, archive = true) => {
    const jid = (typeof __ensureJid === 'function') ? __ensureJid(jidOrNumber) : String(jidOrNumber||'');
    const w = (window.WPP && WPP.whatsapp) || {};

    // caminhos "oficiais" quando existem
    try { if (typeof WPP?.chat?.archiveChat   === 'function') return await WPP.chat.archiveChat(jid, archive); } catch {}
    try { if (typeof WPP?.chat?.setArchive    === 'function') return await WPP.chat.setArchive(jid, archive); } catch {}
    try { if (typeof WPP?.chat?.setArchived   === 'function') return await WPP.chat.setArchived(jid, archive); } catch {}

    // fallbacks por Store/Cmd/Chat
    let chat = null;
    try { chat = w.ChatStore?.get?.(jid) || w.ChatStore?.find?.(jid) || null; } catch {}
    try { if (!chat && w.ChatStore?.getOrCreate) chat = w.ChatStore.getOrCreate(jid); } catch {}

    if (w.Cmd?.archiveChat)                 return await w.Cmd.archiveChat(chat, archive);
    if (typeof chat?.setArchive   === 'function') return await chat.setArchive(archive);
    if (typeof chat?.setArchived  === 'function') return await chat.setArchived(archive);
    if (typeof chat?.archive      === 'function') return await chat.archive(archive);

    throw new Error('archive_unavailable');
  };

  // Conferir se está arquivado
  window.__wppIsArchived = (jidOrNumber) => {
    const jid = (typeof __ensureJid === 'function') ? __ensureJid(jidOrNumber) : String(jidOrNumber||'');
    const w = (window.WPP && WPP.whatsapp) || {};
    const c = w.ChatStore?.get?.(jid) || w.ChatStore?.find?.(jid) || null;
    if (!c) return null;
    return !!(c.archive || c.isArchived || c.__x_archive || c.__x_isArchived);
  };

  // Desarquivar conversa
  window.__wppUnarchiveChat = async (jidOrNumber) => {
    const jid = (typeof __ensureJid === 'function') ? __ensureJid(jidOrNumber) : String(jidOrNumber||'');

    if (WPP?.chat?.unarchiveChat) {
      await WPP.chat.unarchiveChat(jid);
      return true;
    }

    const w = WPP?.whatsapp || {};
    let chat = null;
    try { chat = w.ChatStore?.get?.(jid) || w.ChatStore?.find?.(jid) || null; } catch {}
    if (!chat) { try { await (window.__wppOpen?.(jid) || Promise.resolve()); chat = w.ChatStore?.get?.(jid) || null; } catch {} }

    try { if (chat?.unarchive)      { await chat.unarchive();      return true; } } catch {}
    try { if (chat?.setArchived)    { await chat.setArchived(false); return true; } } catch {}
    try { if (chat?.setArchive)     { await chat.setArchive(false);  return true; } } catch {}
    try { if (w.Cmd?.unarchiveChat) { await w.Cmd.unarchiveChat(chat.id); return true; } } catch {}
    try { if (w.Cmd?.changeChatArchiveStatus) { await w.Cmd.changeChatArchiveStatus(chat, false); return true; } } catch {}

    throw new Error('unarchiveChat_unavailable');
  };


  // Limpar conversa (FOR ME) com fallbacks e opção de manter favoritos
  window.__wppClearChat = async (jidOrNumber, keepStarred = false) => {
    const jid = (typeof __ensureJid === 'function') ? __ensureJid(jidOrNumber) : String(jidOrNumber||'');
    const w = (window.WPP && WPP.whatsapp) || {};
    const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));

    // 1) caminhos "oficiais" quando existem (alguns builds aceitam options)
    try { 
      if (typeof WPP?.chat?.clearChat === 'function') {
        try { return await WPP.chat.clearChat(jid, { keepStarred: !!keepStarred }); } catch {}
        try { return await WPP.chat.clearChat(jid); } catch {}
      }
    } catch {}

    // 2) garantir que o chat existe/carregado
    try { if (typeof window.__wppOpen === 'function') await window.__wppOpen(jid); } catch {}

    // 3) pegar o modelo do chat
    let chat = null;
    try { chat = w.ChatStore?.get?.(jid) || w.ChatStore?.find?.(jid) || null; } catch {}
    try { if (!chat && w.ChatStore?.getOrCreate) chat = w.ChatStore.getOrCreate(jid); } catch {}
    if (!chat) throw new Error('chat_not_found');

    // 4) coletar IDs das mensagens (respeitando keepStarred)
    const getModels = (c) => {
      try { if (c?.msgs?.getModelsArray) return c.msgs.getModelsArray(); } catch {}
      try { if (Array.isArray(c?.msgs?.models)) return c.msgs.models; } catch {}
      try { if (Array.isArray(c?._msgs?._models)) return c._msgs._models; } catch {}
      return [];
    };
    const all = getModels(chat) || [];
    const ids = [];
    for (const m of all) {
      if (!m) continue;
      if (keepStarred && (m.star || m.isStarred || m.__x_star)) continue;
      const id = (m.id && (m.id._serialized || m.id)) || null;
      if (id) ids.push(id);
    }
    if (ids.length === 0) return true;

    // 5) apagar em lotes (evita estouro)
    const chunk = 100;
    for (let i = 0; i < ids.length; i += chunk) {
      const partIds = ids.slice(i, i + chunk);

      // caminho preferido
      try { await WPP.chat.deleteMessages(jid, partIds, false); }
      catch (e1) {
        // alguns builds querem os objetos MessageKey (m.id) em vez de string
        const partObjs = [];
        for (let k = i; k < Math.min(i+chunk, all.length); k++) {
          const mk = all[k]?.id;
          if (mk) partObjs.push(mk);
        }
        try { await WPP.chat.deleteMessages(jid, partObjs, false); }
        catch (e2) {
          // últimos resorts, por método no chat
          try { if (typeof chat?.deleteMessages === 'function') await chat.deleteMessages(partObjs, false); else throw e2; }
          catch (e3) { throw e3; }
        }
      }

      await sleep(80);
    }
    return true;
  };

  // Deletar TODAS mensagens “for everyone” que forem SUAS (regras de tempo do WhatsApp se aplicam)
  window.__wppDeleteAllMyMessages = async (jidOrNumber, revoke = true) => {
    const jid = (typeof __ensureJid === 'function') ? __ensureJid(jidOrNumber) : String(jidOrNumber||'');
    const w = (window.WPP && WPP.whatsapp) || {};
    const me = (typeof window.__wppMyJid === 'function') ? window.__wppMyJid() : null;

    let chat = null;
    try { chat = w.ChatStore?.get?.(jid) || w.ChatStore?.find?.(jid) || null; } catch {}
    if (!chat) { try { await window.__wppOpen?.(jid); chat = w.ChatStore?.get?.(jid) || null; } catch {} }
    if (!chat) throw new Error('chat_not_found');

    const getModels = (c) => {
      try { if (c?.msgs?.getModelsArray) return c.msgs.getModelsArray(); } catch {}
      try { if (Array.isArray(c?.msgs?.models)) return c.msgs.models; } catch {}
      try { if (Array.isArray(c?._msgs?._models)) return c._msgs._models; } catch {}
      return [];
    };

    const all = getModels(chat) || [];
    const myIds = [];
    for (const m of all) {
      const from = (m?.from?._serialized || m?.author?._serialized || m?.from || '').toLowerCase();
      if (me && from && from.split('@')[0] !== me.split('@')[0]) continue; // só as minhas
      const mid = (m.id && (m.id._serialized || m.id)) || null;
      if (mid) myIds.push(mid);
    }
    if (!myIds.length) return true;

    const chunk = 80;
    for (let i = 0; i < myIds.length; i += chunk) {
      const part = myIds.slice(i, i + chunk);
      await WPP.chat.deleteMessages(jid, part, !!revoke).catch(()=>{ /* ignora as que não dá p/ revogar */ });
      await new Promise(r=>setTimeout(r,60));
    }
    return true;
  };

  // Remover o chat da lista
  window.__wppDeleteChat = async (jidOrNumber) => {
    const jid = (typeof __ensureJid === 'function') ? __ensureJid(jidOrNumber) : String(jidOrNumber||'');
    if (WPP?.chat?.deleteChat) {
      await WPP.chat.deleteChat(jid);
      return true;
    }
    const w = WPP?.whatsapp || {};
    let chat = null;
    try { chat = w.ChatStore?.get?.(jid) || w.ChatStore?.find?.(jid) || null; } catch {}
    if (!chat) { try { await (window.__wppOpen?.(jid) || Promise.resolve()); chat = w.ChatStore?.get?.(jid) || null; } catch {} }
    // alguns builds expõem "archiveAndDelete" ou "sendDelete" no modelo de chat
    try { if (chat?.archiveAndDelete) { await chat.archiveAndDelete(); return true; } } catch {}
    try { if (chat?.sendDelete)       { await chat.sendDelete();       return true; } } catch {}
    throw new Error('deleteChat_unavailable');
  };

  // Apagar mensagens (suporta strings de id e faz fallback p/ MessageKey)
  window.__wppDeleteMessages = async (jidOrNumber, ids, revoke) => {
    const jid = (typeof __ensureJid === 'function') ? __ensureJid(jidOrNumber) : String(jidOrNumber||'');
    let list = Array.isArray(ids) ? ids.slice() : (ids ? [ids] : []);
    try {
      // 1) tentativa direta (strings)
      return await WPP.chat.deleteMessages(jid, list, !!revoke);
    } catch (e) {
      // 2) fallback: construir MessageKey a partir do ChatStore
      const w = WPP?.whatsapp || {};
      let chat = null;
      try { chat = w.ChatStore?.get?.(jid) || w.ChatStore?.find?.(jid) || null; } catch {}
      if (!chat) { try { await (window.__wppOpen?.(jid) || Promise.resolve()); chat = w.ChatStore?.get?.(jid) || null; } catch {} }

      // usamos seu helper interno:
      const msgs = (typeof __msgsOf === 'function') ? __msgsOf(chat) : (chat?.msgs?.models || []);
      const keys = [];

      for (const id of list) {
        let key = null;
        const m = (msgs || []).find(mm => {
          const ser = (mm?.id && (mm.id._serialized || mm.id)) || (mm && mm.key);
          return String(ser || '').toLowerCase() === String(id || '').toLowerCase();
        });

        if (m?.id) key = m.id; // melhor: usa o MessageKey original
        if (!key) {
          // fallback "sintético" (nem sempre necessário, mas ajuda em alguns builds)
          key = { id, fromMe: !!revoke, remoteJid: jid };
        }

        // se for "apagar para todos", só inclua mensagens que são suas
        if (revoke === true) {
          const fromMe = (typeof m?.id?.fromMe !== 'undefined') ? !!m.id.fromMe : (m?.fromMe === true);
          if (fromMe !== true) continue;
        }
        keys.push(key);
      }

      if (!keys.length) return false;
      return await WPP.chat.deleteMessages(jid, keys, !!revoke);
    }
  };

  // === SEEN (marcar como lido) ===
  window.__wppSendSeen = async (jidOrNumber) => {
    const jid = (typeof __ensureJid === 'function') ? __ensureJid(jidOrNumber) : String(jidOrNumber||'');
    // caminhos oficiais se existirem
    try { if (typeof WPP?.chat?.markIsRead === 'function') return await WPP.chat.markIsRead(jid); } catch {}
    try { if (typeof WPP?.chat?.sendSeen   === 'function') return await WPP.chat.sendSeen(jid);   } catch {}

    // fallbacks internos
    const w = WPP?.whatsapp || {};
    let chat = null;
    try { chat = w.ChatStore?.get?.(jid) || w.ChatStore?.find?.(jid) || null; } catch {}
    if (!chat) { try { await (window.__wppOpen?.(jid) || Promise.resolve()); chat = w.ChatStore?.get?.(jid) || w.ChatStore?.find?.(jid) || null; } catch {} }

    try { if (chat?.sendSeen)   return await chat.sendSeen(); } catch {}
    try { if (chat?.markSeen)   return await chat.markSeen(); } catch {}
    try { if (chat?.markAsRead) return await chat.markAsRead(); } catch {}

    // último recurso: abrir o chat (costuma disparar o read receipt)
    try { if (await window.__wppOpen?.(jid)) return true; } catch {}
    return false;
  };

  // === Ler o chat (abrir e opcionalmente marcar como lido) ===
  window.__wppReadChat = async (jidOrNumber, alsoSeen = true) => {
    const jid = (typeof __ensureJid === 'function') ? __ensureJid(jidOrNumber) : String(jidOrNumber||'');
    try { await window.__wppOpen?.(jid); } catch {}
    if (alsoSeen !== false) {
      try { await window.__wppSendSeen?.(jid); } catch {}
    }
    return true;
  };
  
  window.__wppSendLocation = async (jidOrNumber, latitude, longitude, name = '', address = '') => {
    const jid = __ensureJid(jidOrNumber);
    const lat = Number(latitude), lng = Number(longitude);
    if (typeof WPP?.chat?.sendLocationMessage === 'function') {
      try { return await WPP.chat.sendLocationMessage(jid, { latitude:lat, longitude:lng, name, address }); } catch {}
    }
    const payloads = [
      { type:'location', lat, lng, loc: name || address || '' },
      { type:'location', degreesLatitude:lat, degreesLongitude:lng, name:name||'', address:address||'' }
    ];
    if (typeof WPP?.chat?.sendRawMessage === 'function') {
      for (const p of payloads) { try { return await WPP.chat.sendRawMessage(jid, p); } catch {} }
    }
    const url = `https://maps.google.com/?q=${lat},${lng}`;
    return await (WPP?.chat?.sendTextMessage || WPP?.chat?.sendMessage)(jid, `${name? name+' - ' : ''}${url}`);
  };


  window.__wppCheckNumber = async (num, showConsole = false, opts = {}) => {
    const s0 = String(num || "").trim();
    const hasSuffix  = /(@c\.us|@g\.us)$/i.test(s0);
    const onlyDigits = s0.replace(/\D+/g, "");
    const jid = hasSuffix ? s0.toLowerCase()
                          : (onlyDigits ? (onlyDigits + "@c.us") : s0.toLowerCase());
  
    // shape fixo para o retorno (compatível com seu C#)
    const base = {
      input: s0.replace(/@c\.us$|@g\.us$/i, ""),
      jid,
      exists: false,
      canReceive: null,
      isBusiness: null,
      code: null,
      profileStatus: null,
      displayName: null,
      pushname: null,
      verifiedName: null,
      notifyName: null,
      businessName: null,
      source: "WPP.contact.queryExists",
      error: null
    };
  
    if (!(window.WPP && WPP.contact && typeof WPP.contact.queryExists === "function")) {
      return { ...base, error: "WPP.contact.queryExists não disponível" };
    }
  
    try {
      const r = await WPP.contact.queryExists(jid);
  
      const wid =
        (r?.wid && (r.wid._serialized || r.wid)) ||
        (r?.id  && (r.id._serialized  || r.id))  ||
        (r?.jid && (r.jid._serialized || r.jid)) || null;
  
      const code =
        (typeof r?.status === "number") ? r.status :
        (typeof r?.status === "string" && /^\d+$/.test(r.status)) ? parseInt(r.status, 10) :
        null;
  
      const out = {
        ...base,
        jid: wid || jid,
        exists: !!wid || code === 200,
        isBusiness: r?.biz === true || !!r?.bizInfo,
        businessName: r?.bizInfo?.verifiedName?.name ?? null,
        verifiedName: r?.bizInfo?.verifiedName?.name ?? null,
        profileStatus: (typeof r?.status === "string" && !/^\d+$/.test(r.status)) ? r.status : null,
        code: code,
        canReceive: (typeof r?.canReceiveMessage === "boolean") ? r.canReceiveMessage :
                    (typeof r?.canReceive       === "boolean") ? r.canReceive : null,
        error: null
      };
  
      if (showConsole) console.log("[__wppCheckNumber]", out);
      return out;
    } catch (e) {
      return { ...base, error: String(e && e.message || e) };
    }
  };
  
  try { if (!window.top.__wppCheckNumber) window.top.__wppCheckNumber = window.__wppCheckNumber; } catch {}
  try { if (!window.parent.__wppCheckNumber) window.parent.__wppCheckNumber = window.__wppCheckNumber; } catch {}

  // Adicione isto DEPOIS da sua função atual:
  window.__wppCheckNumberJSON = async (num, showConsole = false, opts = {}) => {
    try {
      const out = await window.__wppCheckNumber(num, showConsole, opts);
      return JSON.stringify(out);
    } catch (e) {
      return JSON.stringify({
        input: String(num || ""),
        jid: null,
        exists: false,
        canReceive: null,
        isBusiness: null,
        code: null,
        profileStatus: null,
        displayName: null,
        pushname: null,
        verifiedName: null,
        notifyName: null,
        businessName: null,
        source: "__wppCheckNumber",
        error: String(e && e.message || e)
      });
    }
  };
  try { if (!window.top.__wppCheckNumberJSON) window.top.__wppCheckNumberJSON = window.__wppCheckNumberJSON; } catch {}
  try { if (!window.parent.__wppCheckNumberJSON) window.parent.__wppCheckNumberJSON = window.__wppCheckNumberJSON; } catch {}

  // === ENQUETE (POLL) ===
  window.__wppSendPoll = async (jidOrNumber, pergunta, opcoes, allowMultiple=false) => {
    const jid = __ensureJid(jidOrNumber);
    // APIs variam entre builds → tentamos as duas assinaturas conhecidas
    if (typeof WPP?.chat?.sendPollMessage === 'function') {
      try { return await WPP.chat.sendPollMessage(jid, allowMultiple, pergunta, opcoes); } catch {}
      try { return await WPP.chat.sendPollMessage(jid, pergunta, opcoes, { allowMultipleAnswers: allowMultiple }); } catch {}
    }
    // Fallback: botões (não é “enquete” de verdade, mas resolve)
    const btns = (opcoes||[]).slice(0,3).map((t,i)=>({ id:`opt_${i}`, title:String(t) }));
    if (typeof WPP?.chat?.sendButtons === 'function') {
      return await WPP.chat.sendButtons(jid, pergunta, btns);
    }
    // Último recurso: texto simples com opções
    return await WPP.chat.sendTextMessage(jid, pergunta + '\n' + (opcoes||[]).map((o,i)=>`${i+1}) ${o}`).join('\n'));
  };

  // === BOTÕES RÁPIDOS ===
  window.__wppSendButtons = async (jidOrNumber, texto, botoes) => {
    const jid = __ensureJid(jidOrNumber);
    const btns = (botoes||[]).slice(0,3).map((t,i)=>({ id:`b${i+1}`, title:String(t) }));
    if (typeof WPP?.chat?.sendButtons === 'function') {
      return await WPP.chat.sendButtons(jid, texto, btns);
    }
    // Fallback → lista
    if (typeof WPP?.chat?.sendListMessage === 'function') {
      return await WPP.chat.sendListMessage(jid, { title: texto, sections:[{ title:'Opções', rows: btns.map(b=>({ id:b.id, title:b.title })) }]});
    }
    // Último: texto
    return await WPP.chat.sendTextMessage(jid, texto + '\n' + btns.map((b,i)=>`[${i+1}] ${b.title}`).join('\n'));
  };


  // util interno p/ array de mensagens do chat
  function __msgsOf(chat){
    try { if (chat?.msgs?.getModelsArray) return chat.msgs.getModelsArray(); } catch {}
    try { if (Array.isArray(chat?.msgs?.models)) return chat.msgs.models; } catch {}
    try { if (Array.isArray(chat?._msgs?._models)) return chat._msgs._models; } catch {}
    return [];
  }

  // === Responder (com ou sem citação) ===
  window.__wppReply = async (jidOrNumber, text, quotedId=null) => {
    const jid = __ensureJid(jidOrNumber);
    const opts = quotedId ? { quotedMsgId: quotedId } : {};
    const fn = WPP?.chat?.sendTextMessage || WPP?.chat?.sendMessage;
    if (!fn) throw new Error('sendTextMessage indisponível');
    return await fn(jid, String(text||''), opts);
  };

  window.__wppMyJid = () => {
    const c = [
      WPP?.conn?.wid?._serialized || WPP?.conn?.wid,
      WPP?.conn?.user?.id?._serialized || WPP?.conn?.user?.id,
      WPP?.whatsapp?.Conn?.wid?._serialized || WPP?.whatsapp?.Conn?.wid,
      WPP?.conn?.getMyDeviceId?.()
    ].find(Boolean);
    if (!c) return '';
    return String(c).toLowerCase()
      .replace('@s.whatsapp.net','@c.us')
      .replace('@whatsapp.net','@c.us')
      .replace(/:(\d+)(?=@)/,''); // remove :N antes do @
  };

  window.__wppMyNumber = () => (window.__wppMyJid()?.split('@')[0] || '');

  window.__wppMeJSON = async () => {
    const jid = __wppMyJid();
    const out = { jid, number: __wppMyNumber(), pushname:null, notifyName:null, name:null, isBusiness:null };
    try {
      if (WPP?.contact?.getContactById) {
        const c = await WPP.contact.getContactById(jid);
        out.pushname   = c?.pushname || c?.contact?.pushname || null;
        out.notifyName = c?.notifyName || c?.contact?.notifyName || null;
        out.name       = c?.name || c?.contact?.name || c?.formattedName || null;
        out.isBusiness = !!(c?.isBusiness || c?.biz);
      }
    } catch {}
    return out;
  };





})();


// CHATBOT
(function () {
  if (window.__unreadHelpers_v2) return;
  window.__unreadHelpers_v2 = true;

  async function waitForWPP(ms = 8000) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (window.WPP?.chat?.list && window.WPP?.chat?.getMessages) return true;
      await new Promise(r => setTimeout(r, 100));
    }
    return false;
  }

  const jidOf = (id) => (id && (id._serialized || id)) || '';

  async function collectFromChats(chats, limitPerChat, skipCiphertext) {
    const out = [];
    for (const c of (chats || [])) {
      const jid = jidOf(c.id);
      let ms = [];
      try {
        ms = await WPP.chat.getMessages(jid, {
          onlyUnread: true,
          includeMe: false,
          count: limitPerChat
        });
      } catch (_) {}

      for (const m of (ms || [])) {
        const type = m.type || (m.mimetype?.split('/')?.[0]) || '';
        if (skipCiphertext && type === 'ciphertext') continue;

        const body = m.body || m.caption || m.text ||
          (type==='image'    ? '[imagem]'    :
           type==='video'    ? '[vídeo]'     :
           type==='sticker'  ? '[figurinha]' :
           type==='ptt'      ? '[áudio/ptt]' :
           type==='document' ? '[documento]' : '');

        out.push({
          jid,
          id:   (m.id && (m.id._serialized || m.id)) || '',
          from: m.author || m.from || jid,
          type,
          body: String(body || ''),
          ts:   (m.t || m.timestamp || Date.now())|0
        });
      }
    }
    return out;
  }

  /**
   * @param {number}  limitPerChat    -1=todas, >0 limite por chat
   * @param {boolean} skipCiphertext  true=ignora ciphertext
   * @param {boolean} forceAll        true=varrer todos os chats (ignora onlyWithUnreadMessage)
   */
  window.getAllUnreadMessages = async (limitPerChat = -1, skipCiphertext = false, forceAll = false) => {
    if (!(await waitForWPP())) return [];

    let all = [];
    try { all = await WPP.chat.list(); } catch { all = []; }

    // 1) tenta só com não-lidas
    let chats = [];
    if (!forceAll) {
      try { chats = await WPP.chat.list({ onlyWithUnreadMessage: true }); } catch {}
      if (!chats || chats.length === 0) {
        // 2) fallback por unreadCount do próprio chat
        chats = (all || []).filter(c => (c.unreadCount|0) > 0);
      }
    } else {
      chats = all;
    }

    let out = await collectFromChats(chats, limitPerChat, skipCiphertext);

    // 3) se ainda 0 e não forçado, varre TODOS como último fallback
    if (out.length === 0 && !forceAll) {
      out = await collectFromChats(all, limitPerChat, skipCiphertext);
    }

    try { console.debug('[unread] chats:', chats?.length||0, 'msgs:', out.length); } catch {}
    return out;
  };

  window.getAllUnreadMessagesJSON = async (limitPerChat = -1, skipCiphertext = false, forceAll = false) => {
    try {
      const arr = await window.getAllUnreadMessages(limitPerChat, skipCiphertext, forceAll);
      return JSON.stringify(arr);
    } catch (e) {
      return JSON.stringify({ __err: String(e && (e.message || e)) });
    }
  };
})();





// === JOIN POR CONVITE (grupo) — compatível com build que tem só WPP.group.join ===
(function () {
  window.__wpp_join_v1 = true;

  function extractInviteCode(inv) {
    const s = String(inv || '').trim();
    const m1 = s.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/i);
    if (m1) return m1[1];
    const m2 = s.match(/([A-Za-z0-9]{10,})/);
    return m2 ? m2[1] : '';
  }

  const pickId = (r) =>
    (r && (r._serialized || r.id?._serialized || r.gid?._serialized || r.id || r.gid)) || null;

  const safe = (v) => { try { return JSON.parse(JSON.stringify(v)); } catch { return null; } };

  async function waitForWPP(ms = 12000) {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      if (window.WPP && (WPP.group || WPP.chat)) return true;
      await new Promise(r => setTimeout(r, 120));
    }
    throw new Error('WPP não disponível');
  }

  // ------- núcleo: tenta join por code e, se falhar por formato, tenta link -------
  async function tryJoinWithFallback(code) {
    if (typeof WPP?.group?.join !== 'function') throw new Error('join_unavailable');

    const tryJoin = async (arg, triedLink) => {
      try {
        const r = await WPP.group.join(arg);
        const rid = pickId(r);
        return { okHint: !!(r?.ok === true || r?.member === true || rid || r), rid, raw: r, err: null };
      } catch(e) {
        const msg = String(e?.message||e||'').toLowerCase();

        // já é membro → sucesso
        if (msg.includes('already') || msg.includes('já participa') || msg.includes('participant'))
          return { okHint: true, rid: null, raw: null, err: null };

        // alguns builds esperam LINK e não CODE → tenta link uma vez
        if (!triedLink) {
          const link = 'https://chat.whatsapp.com/' + code;
          return await tryJoin(link, true);
        }

        return { okHint: false, rid: null, raw: null, err: msg };
      }
    };

    return await tryJoin(code, false);
  }

  // ====== BOOL: o que você usa no app ======
  window.__wppJoinByInviteOK = async function(input){
    await waitForWPP();
    const code = extractInviteCode(input);
    if (!code) return false;

    const { okHint, rid } = await tryJoinWithFallback(code);

    // Se veio id e existe iAmMember, confirma (quando disponível)
    if (rid && typeof WPP?.group?.iAmMember === 'function') {
      try { if (await WPP.group.iAmMember(rid)) return true; } catch {}
    }

    return !!okHint;
  };

  // ====== OBJETO (opcional, coerente com seu formato) ======
  window.__wppJoinByInvite = async function(inviteOrCode){
    await waitForWPP();
    const code = extractInviteCode(inviteOrCode);
    if (!code) return { ok:false, error:'Código/Link inválido' };

    const { okHint, rid, raw } = await tryJoinWithFallback(code);

    let member = null;
    if (rid && typeof WPP?.group?.iAmMember === 'function') {
      try { member = !!(await WPP.group.iAmMember(rid)); } catch {}
    }

    return {
      ok: !!(member === true || okHint),
      gid: rid || null,
      member,
      result: safe(raw),
      info: null // getInviteInfo indisponível no seu build atual
    };
  };

  window.__wppJoinByInviteJSON = async function(inviteOrCode){
    try { return JSON.stringify(await window.__wppJoinByInvite(inviteOrCode)); }
    catch(e){ return JSON.stringify({ ok:false, error:String(e && (e.message||e)) }); }
  };

  // ====== CHECK: degrade com erro claro quando getInviteInfo não existe ======
  window.__wppCheckJoinedFromInvite = async function(inviteOrCode){
    await waitForWPP();
    const code = extractInviteCode(inviteOrCode);
    if (!code) return { ok:false, error:'Código/Link inválido' };

    if (typeof WPP?.group?.getInviteInfo !== 'function') {
      return { ok:false, gid:null, member:null, error:'getInviteInfo_unavailable' };
    }

    let info=null, gid=null, member=null;
    try {
      info = await WPP.group.getInviteInfo(code);
      gid  = pickId(info);
    } catch(e){
      return { ok:false, gid:null, member:null, error:String(e?.message||e) };
    }

    try { if (gid && typeof WPP?.group?.iAmMember === 'function') member = await WPP.group.iAmMember(gid); } catch {}
    return { ok:true, gid, member };
  };

  window.__wppCheckJoinedFromInviteJSON = async function(inviteOrCode){
    try { return JSON.stringify(await window.__wppCheckJoinedFromInvite(inviteOrCode)); }
    catch(e){ return JSON.stringify({ ok:false, error:String(e && (e.message||e)) }); }
  };
})();





(function(){
  if (window.__MY_BOOT?.ver === '1.0.0') return;   // já carregado
  // se existia versão antiga, limpe timers/listeners:
  try {
    if (window.__MY_BOOT?.timer) clearInterval(window.__MY_BOOT.timer);
    if (window.__MY_BOOT?.handler) {
      window.removeEventListener('wh:ready', window.__MY_BOOT.handler);
    }
  } catch {}
  window.__MY_BOOT = { ver: '1.0.0' };

  // ... inicialização aqui ...
  window.__MY_BOOT.handler = (e)=>{/*...*/};
  window.addEventListener('wh:ready', window.__MY_BOOT.handler, { once:true });

  window.__MY_BOOT.timer = setInterval(()=>{/*...*/}, 400);
})();




// typing-utils.js
(function () {
  if (window.__typingFinal_v1) return; window.__typingFinal_v1 = true;

  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
  const ensureJid = (s)=>{
    s = String(s||'').trim().toLowerCase();
    if (/@(c|g)\.us$/.test(s)) return s;
    if (/^\d+$/.test(s)) return s + '@c.us';
    return s;
  };

  // -------- núcleo (oficial + fallback DOM) ----------
  async function wppTyping(jidOrNumber, ms=1500, {ensureChat=false}={}) {
    const jid = ensureJid(jidOrNumber);

    // opcional: garantir chat carregado (evita falha do assertGetChat em alguns builds)
    if (ensureChat) {
      try { await (WPP?.chat?.openChatBottom?.(jid) || WPP?.chat?.openChat?.(jid)); } catch {}
    }

    // caminho oficial (manda presença pro destinatário)
    try {
      if (WPP?.chat?.markIsComposing) {
        await WPP.chat.markIsComposing(jid, ms); // auto-pausa ao fim de ms
        return true;
      }
    } catch {}

    // fallback DOM (só anima sua UI; útil quando a API de presença está indisponível)
    try {
      if (window.__wppTypingDOM) { await __wppTypingDOM(jid, ms); return true; }
    } catch {}

    return false;
  }

  // para textos: calcula um tempo humano
  function typingMsFor(text,{cps=8,min=900,max=7000,jitter=0.35}={}) {
    const base = Math.max(min, Math.min(max, (String(text||'').length/Math.max(1,cps))*1000));
    const delta = base * jitter * (Math.random()*2-1);
    return Math.round(base + delta);
  }

  // enviar texto com “digitando…”
  async function wppSendTextTyping(jidOrNumber, text, opts={}) {
    const jid = ensureJid(jidOrNumber);
    const ms  = Number.isFinite(opts.ms) ? opts.ms : typingMsFor(text, opts);
    await wppTyping(jid, ms, {ensureChat:false});
    const send = WPP?.chat?.sendTextMessage || WPP?.chat?.sendMessage;
    return await send(jid, String(text||''), { createChat:true });
  }

  // manter digitando por longos períodos (repulsa a presença a cada ~3.5s)
  async function wppTypingHold(jidOrNumber, totalMs=8000) {
    const jid = ensureJid(jidOrNumber);
    const step = 3500;
    const end = Date.now() + totalMs;
    while (Date.now() < end) {
      try { await WPP.chat.markIsComposing?.(jid, step+300); } catch {}
      await sleep(step);
    }
    try { await WPP.chat.markIsPaused?.(jid); } catch {}
    return true;
  }

  // expõe no window
  window.wppTyping = wppTyping;
  window.wppSendTextTyping = wppSendTextTyping;
  window.wppTypingHold = wppTypingHold;
})();

(function () {
  if (window.__recordingHelpers_v1) return; window.__recordingHelpers_v1 = true;

  const sleep = (ms)=>new Promise(r=>setTimeout(r, ms));
  const _ensure = (typeof __ensureJid==='function')
    ? __ensureJid
    : (s)=>{ s=String(s||'').trim().toLowerCase();
             if(/@(c|g)\.us$/.test(s)) return s;
             if(/^\d+$/.test(s)) return s+'@c.us';
             return s; };

  async function __wppRecording(jidOrNumber, ms=1800){
    const jid = _ensure(jidOrNumber);
    try { await (window.__wppOpen?.(jid) || Promise.resolve()); } catch {}
    const w = WPP?.whatsapp || {};

    const start = async () => {
      try { if (WPP?.chat?.markIsRecording) return await WPP.chat.markIsRecording(jid); } catch {}
      try { if (WPP?.chat?.setRecording)     return await WPP.chat.setRecording(jid, true); } catch {}
      try {
        const chat = w.ChatStore?.get?.(jid) || w.ChatStore?.find?.(jid) || null;
        if (chat?.sendRecording)             return await chat.sendRecording();
        if (chat?.sendChatStateRecording)    return await chat.sendChatStateRecording();
        if (w.SendChatState?.sendChatStateRecording)
          return await w.SendChatState.sendChatStateRecording(chat||jid);
      } catch {}
      // último fallback → presença de texto
      try { if (WPP?.chat?.markIsComposing) return await WPP.chat.markIsComposing(jid); } catch {}
    };

    const stop = async () => {
      try { if (WPP?.chat?.markIsPaused)     return await WPP.chat.markIsPaused(jid); } catch {}
      try { if (WPP?.chat?.setRecording)     return await WPP.chat.setRecording(jid, false); } catch {}
      try {
        const chat = w.ChatStore?.get?.(jid) || w.ChatStore?.find?.(jid) || null;
        if (chat?.sendPaused)                return await chat.sendPaused();
        if (chat?.sendChatStatePaused)       return await chat.sendChatStatePaused();
        if (w.SendChatState?.sendChatStatePaused)
          return await w.SendChatState.sendChatStatePaused(chat||jid);
      } catch {}
    };

    const end = Date.now() + ms;
    while (true) {
      await start();
      const left = end - Date.now();
      if (left <= 0) break;
      await sleep(Math.min(3500, left)); // “ping” para não cair o status
    }
    await stop();
    return true;
  }

  // wrappers: “mostrar gravando” e depois enviar
  window.__wppRecording = __wppRecording;

  window.__wppSendVoiceNoteRecording = async (jid, fileOrUrl, filename='audio.ogg', mimeHint, ms=1800) => {
    try { await __wppRecording(jid, ms); } catch {}
    return await __wppSendVoiceNote(jid, fileOrUrl, filename, mimeHint);
  };

  window.__wppSendVideoNoteRecording = async (jid, fileOrUrl, filename='note.mp4', mimeHint, ms=1800) => {
    try { await __wppRecording(jid, ms); } catch {}
    return await __wppSendVideoNote(jid, fileOrUrl, filename, mimeHint);
  };
})();


