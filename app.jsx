/* ─────────────────────────────────────────────────────────────────
   Холм — booking calendar, refined visual layer.
   Logic is faithful to the original (localStorage key bumped to v6
   so old test data doesn't leak in). All visual polish on top.
   ───────────────────────────────────────────────────────────────── */

const { useState, useEffect, useMemo, useRef } = React;

const STORAGE = "hill_v7";

const ROOMS = [
  { id: "rS", name: "Cabin Sparrow", glyph: "S", icon: "icons/cabin-s.png", size: "small",  beds: "sleeps 1–2", color: "#5B8A6E" },
  { id: "rM", name: "Cabin Meadow",  glyph: "M", icon: "icons/cabin-m.png", size: "medium", beds: "sleeps 2–3", color: "#3D7E94" },
  { id: "rL", name: "Cabin Linden",  glyph: "L", icon: "icons/cabin-l.png", size: "large",  beds: "sleeps 3–4", color: "#A06A4A" },
];

// Harmonized guest palette — single chroma band, varied hue.
const GUEST_COLORS = [
  "#5B8A6E", "#3D7E94", "#A06A4A", "#8A6FA8",
  "#C26A4E", "#4A8A8A", "#94864A", "#9E5878",
];

const MONTHS_FULL  = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const WDAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const LABEL_W = 184;
const CELL_W = 34;
const CELL_H = 56;
const HEAD_MONTH_H = 30;
const HEAD_DAY_H = 44;
const MONTHS_SHOWN = 4;
const TOTAL_DAYS = MONTHS_SHOWN * 31;

/* ─── Palettes — three thoughtful themes, all earthy/calm ────────── */
const PALETTES = {
  sage:  { name: "Sage",  page:"#F3F5F1", surface:"#FFFFFF", sunken:"#ECEFE9", border:"#E0E4DC", borderStrong:"#C9D0C3", text:"#1F2620", muted:"#6F7A6E", light:"#9AA59A", accent:"#4A7C59", weekend:"#EDF0E8", today:"#E8F0DD", todayInk:"#3A6647", auroraA:"#9CC7A8", auroraB:"#E9D5A1", auroraC:"#B3D0E0" },
  warm:  { name: "Clay",  page:"#F8F4ED", surface:"#FFFFFF", sunken:"#F1EBE0", border:"#E8E0D1", borderStrong:"#D1C5AE", text:"#2A2218", muted:"#7A6E5C", light:"#A89B85", accent:"#A06A4A", weekend:"#F1ECE0", today:"#F3E4D2", todayInk:"#8A4F2E", auroraA:"#E8B58E", auroraB:"#F0D9A8", auroraC:"#D9A38A" },
  slate: { name: "Slate", page:"#F2F4F7", surface:"#FFFFFF", sunken:"#E9ECF1", border:"#DFE3EA", borderStrong:"#C5CCD7", text:"#1A1F2A", muted:"#5F6878", light:"#8E97A6", accent:"#3D7E94", weekend:"#EAEDF2", today:"#DDE6EE", todayInk:"#2C5C71", auroraA:"#A8C8E0", auroraB:"#C9B8DF", auroraC:"#9FCEC8" },
};

/* ─── Date helpers ───────────────────────────────────────────────── */
function dkey(d){ const y=d.getFullYear(), m=String(d.getMonth()+1).padStart(2,"0"), dd=String(d.getDate()).padStart(2,"0"); return `${y}-${m}-${dd}`; }
function addDays(d,n){ const r=new Date(d); r.setDate(r.getDate()+n); r.setHours(0,0,0,0); return r; }
function parseKey(k){ const [y,m,d]=k.split("-").map(Number); return new Date(y,m-1,d); }
function diffDays(a,b){ return Math.round((parseKey(b)-parseKey(a))/(1000*60*60*24)); }
function fmtHuman(k){
  const d = parseKey(k);
  return `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;
}

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "sage",
  "showWeekday": true,
  "showSummary": true,
  "showDog": true,
  "showLandscape": true
}/*EDITMODE-END*/;

function App(){
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const C = PALETTES[t.palette] || PALETTES.sage;

  const today = useMemo(()=>{ const d=new Date(); d.setHours(0,0,0,0); return d; },[]);
  const [bk, setBk] = useState({});
  const [modal, setModal] = useState(null);
  const [inp, setInp] = useState("");
  const [sel, setSel] = useState(null);
  const [hov, setHov] = useState(null);
  const [startOffset, setStartOffset] = useState(-7);

  useEffect(()=>{
    try{
      const r=localStorage.getItem(STORAGE);
      if(r) setBk(JSON.parse(r));
      else seedDemo();
    }catch{}
  // eslint-disable-next-line
  },[]);
  useEffect(()=>{try{localStorage.setItem(STORAGE,JSON.stringify(bk));}catch{}},[bk]);

  /* one-time demo data so the empty state isn't lonely */
  function seedDemo(){
    const k = (off,len)=>{ const s=dkey(addDays(today,off)); const e=dkey(addDays(today,off+len)); return {s,e}; };
    const demo = {
      rS: [
        { id:1, name:"Anya",            ...k(-3,4), col: GUEST_COLORS[0] },
        { id:2, name:"Marcus",          ...k(8,3),  col: GUEST_COLORS[3] },
      ],
      rM: [
        { id:3, name:"The Petersons",   ...k(1,5),  col: GUEST_COLORS[1] },
        { id:4, name:"Leah & Pete",     ...k(20,4), col: GUEST_COLORS[5] },
      ],
      rL: [
        { id:5, name:"Yoga Retreat",    ...k(14,6), col: GUEST_COLORS[2] },
      ],
    };
    setBk(demo);
  }

  const startDate = useMemo(()=>addDays(today, startOffset), [today, startOffset]);
  const allDays = useMemo(()=>Array.from({length:TOTAL_DAYS},(_,i)=>addDays(startDate,i)), [startDate]);
  const todayKey = dkey(today);

  function getB(rid, k){
    return (bk[rid]||[]).find(b => b.s <= k && b.e >= k) || null;
  }

  function clickDay(rid, dateObj){
    const k = dkey(dateObj);
    const ex = getB(rid, k);
    if(ex){ setModal({t:"view", rid, b:ex}); return; }
    if(!sel){ setSel({rid, d:k}); return; }
    if(sel.rid === rid){
      const a = sel.d, b2 = k;
      const s = a<b2?a:b2, e = a<b2?b2:a;
      // Disallow overlap
      const overlap = (bk[rid]||[]).some(b => !(b.e < s || b.s > e));
      if(overlap){ setSel(null); return; }
      setModal({t:"add", rid, s, e}); setSel(null);
    } else {
      setSel({rid, d:k});
    }
  }

  function add(){
    if(!inp.trim()||!modal) return;
    const col = GUEST_COLORS[Object.values(bk).flat().length % GUEST_COLORS.length];
    const nb = {id:Date.now(), name:inp.trim(), s:modal.s, e:modal.e, col};
    setBk(p=>({...p,[modal.rid]:[...(p[modal.rid]||[]),nb]}));
    setInp(""); setModal(null);
  }

  function del(rid,id){
    setBk(p=>({...p,[rid]:(p[rid]||[]).filter(b=>b.id!==id)}));
    setModal(null);
  }

  function inSel(rid, k){
    if(!sel||sel.rid!==rid||!hov) return false;
    const s=sel.d<hov?sel.d:hov, e=sel.d<hov?hov:sel.d;
    return k>=s&&k<=e;
  }

  /* Month markers — positions in days from startDate */
  const monthMarkers = [];
  allDays.forEach((d,i)=>{
    if(d.getDate()===1 || i===0){
      monthMarkers.push({
        i,
        label: MONTHS_FULL[d.getMonth()],
        year: d.getFullYear(),
        isFirst: i===0,
      });
    }
  });

  /* Booking positioning — compute pill geometry per booking */
  const allBookings = [];
  ROOMS.forEach((room, ri)=>{
    (bk[room.id]||[]).forEach(b=>{
      const startIdx = diffDays(dkey(startDate), b.s);
      const endIdx   = diffDays(dkey(startDate), b.e);
      // Clip to visible range
      if(endIdx < 0 || startIdx >= TOTAL_DAYS) return;
      const left = Math.max(0, startIdx);
      const right = Math.min(TOTAL_DAYS-1, endIdx);
      allBookings.push({
        room, ri, b,
        startIdx, endIdx,
        clippedLeft: left, clippedRight: right,
        truncL: startIdx < 0,
        truncR: endIdx >= TOTAL_DAYS,
      });
    });
  });

  /* Summary */
  const activeGuests = [];
  const upcomingGuests = [];
  ROOMS.forEach(room=>{
    (bk[room.id]||[]).forEach(b=>{
      if(b.s<=todayKey&&b.e>=todayKey) activeGuests.push({...b,room});
      else if(b.s>todayKey) upcomingGuests.push({...b,room,daysUntil:diffDays(todayKey,b.s)});
    });
  });
  upcomingGuests.sort((a,b)=>a.daysUntil-b.daysUntil);

  const totalBookings = Object.values(bk).flat().length;

  /* ─── Render ───────────────────────────────────────────────────── */
  const showLandscape = t.showLandscape !== false;
  return (
    <div style={{
      minHeight:"100vh",
      backgroundColor: C.page,
      backgroundImage: showLandscape
        ? `linear-gradient(180deg, rgba(255,253,247,0.62) 0%, rgba(255,253,247,0.28) 35%, rgba(255,253,247,0.22) 70%, rgba(255,253,247,0.42) 100%), url('assets/landscape.png')`
        : "none",
      backgroundSize: "cover",
      backgroundPosition: "center bottom",
      backgroundAttachment: "fixed",
      backgroundRepeat: "no-repeat",
      color:C.text,
      fontFamily:`'Onest', ui-sans-serif, system-ui, -apple-system, sans-serif`,
      fontFeatureSettings:`'ss01','cv11'`,
      padding:"40px 36px 64px",
      fontVariantNumeric:"tabular-nums",
      position:"relative",
      overflow:"hidden",
    }}>

      {/* ─── AURORA — soft drifting gradient blobs behind the title ─ */}
      {!showLandscape && <Aurora C={C} />}

      {/* ─── NORFOLK TERRIER — trots back and forth across the page ─ */}
      {t.showDog && <NorfolkTerrier />}

      {/* ─── HEADER ─────────────────────────────────────────────── */}
      <header style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:24,marginBottom:32,flexWrap:"wrap",position:"relative",zIndex:1}}>
        <div>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
            <HillMark color={C.accent} />
            <span style={{fontSize:13,letterSpacing:".22em",textTransform:"uppercase",color:C.muted,fontWeight:500}}>
              Homestead · bookings
            </span>
          </div>
          <h1 style={{
            fontFamily:`'Instrument Serif', 'Onest', serif`,
            fontWeight:400,
            fontSize:54,
            lineHeight:1,
            letterSpacing:"-0.01em",
            margin:0,
            color:C.text,
            backgroundImage:`linear-gradient(180deg, ${C.text} 30%, color-mix(in oklch, ${C.text}, ${C.accent} 60%) 100%)`,
            WebkitBackgroundClip:"text",
            backgroundClip:"text",
            WebkitTextFillColor:"transparent",
          }}>
            Hill
            <span style={{color:C.light,fontStyle:"italic",marginLeft:14,fontSize:42,WebkitTextFillColor:C.light,backgroundImage:"none"}}>
              {today.toLocaleDateString("en-US",{day:"numeric",month:"long"})}
            </span>
          </h1>
          <div style={{fontSize:14,color:C.muted,marginTop:10,display:"flex",gap:18,alignItems:"center"}}>
            <Stat label="bookings" value={totalBookings} C={C}/>
            <Dot C={C}/>
            <Stat label="on the hill now" value={activeGuests.length} C={C}/>
            <Dot C={C}/>
            <Stat label="cabins" value={ROOMS.length} C={C}/>
          </div>
        </div>

        <nav style={{display:"flex",gap:6,alignItems:"center"}}>
          <NavBtn C={C} onClick={()=>setStartOffset(v=>v-14)} label="←" hint="−2 weeks"/>
          <NavBtn C={C} onClick={()=>setStartOffset(v=>v-7)} label="–7"/>
          <button onClick={()=>setStartOffset(-7)} style={{
            padding:"8px 16px",
            border:`1px solid ${C.borderStrong}`,
            borderRadius:999,
            background:C.text,
            color:C.surface,
            fontSize:13,fontWeight:500,
            cursor:"pointer",
            letterSpacing:".01em",
          }}>Today</button>
          <NavBtn C={C} onClick={()=>setStartOffset(v=>v+7)} label="+7"/>
          <NavBtn C={C} onClick={()=>setStartOffset(v=>v+14)} label="→" hint="+2 weeks"/>
        </nav>
      </header>

      {/* ─── SELECTION CHIP ─────────────────────────────────────── */}
      {sel && (
        <div style={{
          display:"inline-flex",alignItems:"center",gap:10,
          padding:"8px 14px 8px 12px",
          background:C.surface,
          border:`1px solid ${C.border}`,
          borderRadius:999,
          fontSize:13,color:C.text,
          marginBottom:14,
          boxShadow:`0 1px 0 ${C.border}`,
          position:"relative",zIndex:1,
        }}>
          <span style={{
            width:10,height:10,borderRadius:"50%",
            background:ROOMS.find(r=>r.id===sel.rid)?.color,
            boxShadow:`0 0 0 3px ${ROOMS.find(r=>r.id===sel.rid)?.color}22`,
          }}/>
          <span style={{color:C.muted}}>{ROOMS.find(r=>r.id===sel.rid)?.name}, from</span>
          <strong style={{fontWeight:600}}>{fmtHuman(sel.d)}</strong>
          <span style={{color:C.light}}>— click end date</span>
          <button onClick={()=>setSel(null)} style={{
            marginLeft:4,padding:"3px 8px",borderRadius:6,
            border:"none",background:"transparent",color:C.muted,
            fontSize:12,cursor:"pointer",
          }}>cancel</button>
        </div>
      )}

      {/* ─── CALENDAR CARD ──────────────────────────────────────── */}
      <div style={{
        position:"relative",zIndex:1,
        background:C.surface,
        borderRadius:18,
        border:`1px solid ${C.border}`,
        boxShadow: showLandscape
          ? `0 1px 0 ${C.border}, 0 24px 60px -20px rgba(20,30,20,0.22), 0 4px 12px -4px rgba(20,30,20,0.10)`
          : `0 1px 0 ${C.border}, 0 12px 32px -16px rgba(20,30,20,0.08)`,
        overflow:"hidden",
      }}>
        <CalendarGrid
          C={C}
          allDays={allDays}
          monthMarkers={monthMarkers}
          todayKey={todayKey}
          sel={sel}
          hov={hov}
          setHov={setHov}
          inSel={inSel}
          clickDay={clickDay}
          allBookings={allBookings}
          showWeekday={t.showWeekday}
          onOpenBooking={(rid,b)=>setModal({t:"view",rid,b})}
        />
      </div>

      {/* ─── SUMMARY ────────────────────────────────────────────── */}
      {t.showSummary && (
        <div style={{
          marginTop:22,
          display:"grid",
          gridTemplateColumns:"1fr 1fr",
          gap:18,
          position:"relative",zIndex:1,
        }}>
          <SummaryCard
            C={C}
            label="On the hill now"
            count={activeGuests.length}
            empty="no one here, all quiet"
            items={activeGuests.map(g=>({
              key:g.id, name:g.name, col:g.col, room:g.room,
              right: `until ${fmtHuman(g.e)}`,
              rightTone:"muted",
            }))}
          />
          <SummaryCard
            C={C}
            label="Coming up"
            count={upcomingGuests.length}
            empty="nothing on the horizon"
            items={upcomingGuests.slice(0,4).map(g=>({
              key:g.id, name:g.name, col:g.col, room:g.room,
              right: g.daysUntil===0?"today":g.daysUntil===1?"tomorrow":`in ${g.daysUntil}d`,
              rightTone: g.daysUntil<=3?"accent":"muted",
            }))}
          />
        </div>
      )}

      {/* ─── MODALS ─────────────────────────────────────────────── */}
      {modal?.t==="add" && (
        <Modal C={C} onClose={()=>setModal(null)}>
          <AddModalBody C={C} modal={modal} inp={inp} setInp={setInp} add={add} cancel={()=>setModal(null)}/>
        </Modal>
      )}
      {modal?.t==="view" && (
        <Modal C={C} onClose={()=>setModal(null)}>
          <ViewModalBody C={C} modal={modal} del={del} close={()=>setModal(null)}/>
        </Modal>
      )}

      {/* ─── TWEAKS ─────────────────────────────────────────────── */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Palette">
          <TweakRadio
            label="Theme"
            value={t.palette}
            options={[
              {value:"sage", label:"Sage"},
              {value:"warm", label:"Clay"},
              {value:"slate",label:"Slate"},
            ]}
            onChange={v=>setTweak("palette",v)}
          />
        </TweakSection>
        <TweakSection label="Display">
          <TweakToggle label="Weekday letters" value={t.showWeekday} onChange={v=>setTweak("showWeekday",v)}/>
          <TweakToggle label="Summary" value={t.showSummary} onChange={v=>setTweak("showSummary",v)}/>
          <TweakToggle label="Landscape backdrop 🌄" value={t.showLandscape} onChange={v=>setTweak("showLandscape",v)}/>
          <TweakToggle label="House terrier 🐕" value={t.showDog} onChange={v=>setTweak("showDog",v)}/>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

/* ─── Reusable bits ───────────────────────────────────────────────── */

function NorfolkTerrier(){
  /* Rigged terrier sprite — body, head, and tail are separate PNGs
     extracted from the sprite sheet, layered and animated independently.
       walk:  head bobs, tail wags, body bob
       sleep: head swaps to closed-eyes pose, whole rig lies on its side,
              breathing scale, Zzz floats up
       cycle: walk → sleep → flip → walk → sleep → flip → ... */
  const [pose, setPose] = React.useState("walk");
  const [x, setX] = React.useState(4);
  const [facing, setFacing] = React.useState(1);

  React.useEffect(() => {
    let cancelled = false;
    let timer;
    const wait = (ms) => new Promise(r => { timer = setTimeout(() => { if (!cancelled) r(); }, ms); });

    (async () => {
      let goRight = true;
      await wait(700);
      while (!cancelled) {
        setPose("walk");
        setX(goRight ? 74 : 4);
        await wait(13000); if (cancelled) return;
        setPose("sleep");
        await wait(11000); if (cancelled) return;
        setPose("walk");
        await wait(500); if (cancelled) return;
        goRight = !goRight;
        setFacing(goRight ? 1 : -1);
        await wait(400);
      }
    })();

    return () => { cancelled = true; clearTimeout(timer); };
  }, []);

  return (
    <>
      <style>{`
        .ter-host{
          position:fixed; bottom:6px; left:0;
          z-index:2; pointer-events:none;
          width:160px; height:220px;
          transform-origin: left bottom;
          transition: transform 13s cubic-bezier(.42,0,.58,1);
          filter: drop-shadow(0 7px 6px rgba(40,30,20,0.18));
        }
        .ter-flip{ width:100%; height:100%; position:relative;
          transition: transform .45s ease;
          transform-origin: center bottom;
        }
        .ter-rig{
          position:absolute; left:0; bottom:0;
          width:160px; height:220px;
          transform-origin: 50% 92%;
          transition: transform 1.1s cubic-bezier(.4,0,.3,1);
        }
        .ter-rig.ter-sleep{ transform: rotate(-78deg) translate(-10px,-18px); }

        .ter-anim{
          position:absolute; inset:0;
          transform-origin: center bottom;
        }
        .ter-walk .ter-anim{ animation: ter-bob .48s ease-in-out infinite; }
        .ter-sleep .ter-anim{ animation: ter-breathe 3.2s ease-in-out infinite; }
        @keyframes ter-bob{
          0%,100%{ transform: translateY(0); }
          50%    { transform: translateY(-2px); }
        }
        @keyframes ter-breathe{
          0%,100%{ transform: scale(1,1); }
          50%    { transform: scale(1.025,0.97); }
        }

        /* Body — smaller, centered at bottom */
        .ter-body{
          position:absolute;
          width:118px; height:auto;
          left: 21px;       /* (160-118)/2 */
          bottom: 0;
        }

        /* Tail — overlays body's built-in tail; pivots at base */
        .ter-tail{
          position:absolute;
          width:48px; height:auto;
          left: 102px;
          bottom: 92px;
          transform-origin: 22% 86%;
        }
        .ter-walk .ter-tail{ animation: ter-wag .58s ease-in-out infinite; }
        .ter-sleep .ter-tail{ animation: ter-wag-slow 2.4s ease-in-out infinite; opacity:.92; }
        @keyframes ter-wag{
          0%,100%{ transform: rotate(-22deg); }
          50%    { transform: rotate(22deg); }
        }
        @keyframes ter-wag-slow{
          0%,100%{ transform: rotate(-6deg); }
          50%    { transform: rotate(6deg); }
        }

        /* Head — sits in the body's neck hole, slight overlap */
        .ter-head{
          position:absolute;
          width:108px; height:auto;
          left: 10px;        /* B4 — head cocked to the left */
          bottom: 62px;      /* tucks collar deep into body's neck */
          transform-origin: 50% 88%;
        }
        .ter-head-sleep{ display:none; }
        .ter-rig.ter-sleep .ter-head-alert{ display:none; }
        .ter-rig.ter-sleep .ter-head-sleep{ display:block; }
        .ter-walk .ter-head{ animation: ter-head-bob .48s ease-in-out infinite; }
        @keyframes ter-head-bob{
          0%,100%{ transform: rotate(-1.6deg) translateY(0); }
          50%    { transform: rotate(1.6deg) translateY(-1px); }
        }

        /* Zzz floating sleep particles */
        .ter-zzz{
          position:absolute;
          left:120px; top:24px;
          font-family:'Instrument Serif', serif;
          font-style: italic;
          font-size: 26px;
          color: rgba(40,40,40,0.55);
          pointer-events:none;
        }
        .ter-zzz span{
          display:inline-block;
          animation: ter-zzz-rise 2.6s ease-in-out infinite;
        }
        .ter-zzz span:nth-child(2){ animation-delay: .85s; font-size: 22px; }
        .ter-zzz span:nth-child(3){ animation-delay: 1.7s; font-size: 17px; }
        @keyframes ter-zzz-rise{
          0%   { opacity: 0; transform: translate(0,4px) rotate(-4deg); }
          15%  { opacity: 1; }
          70%  { opacity: 1; }
          100% { opacity: 0; transform: translate(16px,-38px) rotate(8deg); }
        }

        @media (prefers-reduced-motion: reduce){
          .ter-host, .ter-flip, .ter-rig, .ter-anim, .ter-tail, .ter-head,
          .ter-zzz span { animation: none !important; transition: none !important; }
        }
      `}</style>
      <div className="ter-host" style={{ transform: `translateX(${x}vw) scale(0.5)` }} aria-hidden="true">
        <div className="ter-flip" style={{ transform: `scaleX(${facing})` }}>
          <div className={`ter-rig ter-${pose}`}>
            <div className="ter-anim">
              <img className="ter-body" src="dog/body.png" alt="" draggable="false"/>
              <img className="ter-tail" src="dog/tail.png" alt="" draggable="false"/>
              <img className="ter-head ter-head-alert" src="dog/head-alert.png" alt="" draggable="false"/>
              <img className="ter-head ter-head-sleep" src="dog/head-sleep.png" alt="" draggable="false"/>
            </div>
          </div>
          {pose === "sleep" && (
            <div className="ter-zzz">
              <span>z</span><span>z</span><span>z</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function Aurora({C}){
  /* Three soft radial gradient blobs that drift slowly. Each one is
     positioned with absolute coordinates and blurred heavily so they
     melt into the page background. Animation is GPU-cheap (transform
     only) and runs 24-36s — barely perceptible motion. */
  return (
    <>
      <style>{`
        @keyframes aurora-a { 0%{transform:translate3d(-10%,-8%,0) scale(1)} 50%{transform:translate3d(6%,4%,0) scale(1.08)} 100%{transform:translate3d(-10%,-8%,0) scale(1)} }
        @keyframes aurora-b { 0%{transform:translate3d(8%,-4%,0) scale(1.05)} 50%{transform:translate3d(-6%,8%,0) scale(1)} 100%{transform:translate3d(8%,-4%,0) scale(1.05)} }
        @keyframes aurora-c { 0%{transform:translate3d(-4%,6%,0) scale(1)} 50%{transform:translate3d(10%,-2%,0) scale(1.1)} 100%{transform:translate3d(-4%,6%,0) scale(1)} }
      `}</style>
      <div aria-hidden="true" style={{
        position:"absolute",top:-180,left:-120,width:780,height:520,
        background:`radial-gradient(closest-side, ${C.auroraA}, transparent 70%)`,
        opacity:0.55,
        filter:"blur(60px)",
        animation:"aurora-a 28s ease-in-out infinite",
        pointerEvents:"none",zIndex:0,
      }}/>
      <div aria-hidden="true" style={{
        position:"absolute",top:-60,left:340,width:620,height:460,
        background:`radial-gradient(closest-side, ${C.auroraB}, transparent 70%)`,
        opacity:0.42,
        filter:"blur(70px)",
        animation:"aurora-b 32s ease-in-out infinite",
        pointerEvents:"none",zIndex:0,
      }}/>
      <div aria-hidden="true" style={{
        position:"absolute",top:-40,right:-160,width:640,height:480,
        background:`radial-gradient(closest-side, ${C.auroraC}, transparent 70%)`,
        opacity:0.46,
        filter:"blur(64px)",
        animation:"aurora-c 36s ease-in-out infinite",
        pointerEvents:"none",zIndex:0,
      }}/>
    </>
  );
}

function HillMark({color}){
  const gid = `hillgrad-${color.replace("#","")}`;
  return (
    <svg width="32" height="22" viewBox="0 0 32 22" fill="none">
      <defs>
        <linearGradient id={gid} x1="0" y1="22" x2="32" y2="0">
          <stop offset="0%" stopColor={color} stopOpacity="0.35"/>
          <stop offset="100%" stopColor={color} stopOpacity="0.08"/>
        </linearGradient>
      </defs>
      <path d="M2 19 Q 8 6 14 12 Q 20 18 24 8 Q 28 2 30 10 L 30 20 L 2 20 Z"
            fill={`url(#${gid})`} stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
      <circle cx="22" cy="6" r="2" fill={color}/>
    </svg>
  );
}

function Stat({label, value, C}){
  return (
    <span style={{display:"inline-flex",alignItems:"baseline",gap:6}}>
      <strong style={{fontSize:18,fontWeight:600,color:C.text,letterSpacing:"-0.01em"}}>{value}</strong>
      <span style={{color:C.muted}}>{label}</span>
    </span>
  );
}

function Dot({C}){
  return <span style={{width:3,height:3,borderRadius:"50%",background:C.light,display:"inline-block"}}/>;
}

function NavBtn({C, onClick, label, hint}){
  return (
    <button onClick={onClick} title={hint||label} style={{
      padding:"8px 12px",
      minWidth:38,
      border:`1px solid ${C.border}`,
      borderRadius:999,
      background:C.surface,
      color:C.text,
      fontSize:13,fontWeight:500,
      cursor:"pointer",
      transition:"background .12s, border-color .12s",
    }} onMouseEnter={e=>{e.currentTarget.style.background=C.sunken;}}
       onMouseLeave={e=>{e.currentTarget.style.background=C.surface;}}>
      {label}
    </button>
  );
}

/* ─── Calendar Grid ──────────────────────────────────────────────── */
function CalendarGrid({C, allDays, monthMarkers, todayKey, sel, hov, setHov, inSel, clickDay, allBookings, showWeekday, onOpenBooking}){
  const totalDays = allDays.length;
  const fullW = LABEL_W + totalDays * CELL_W;
  const headerH = HEAD_MONTH_H + HEAD_DAY_H;

  return (
    <div style={{overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
      <div style={{width:fullW, minWidth:fullW, position:"relative"}}>

        {/* ─── MONTH BAND ──────────────────────────────────── */}
        <div style={{
          display:"flex",
          marginLeft:LABEL_W,
          height:HEAD_MONTH_H,
          borderBottom:`1px solid ${C.border}`,
          background:C.sunken,
          position:"relative",
        }}>
          {monthMarkers.map((m, mi)=>{
            const next = monthMarkers[mi+1];
            const endIdx = next? next.i : totalDays;
            const w = (endIdx - m.i) * CELL_W;
            return (
              <div key={mi} style={{
                width:w,flexShrink:0,position:"relative",
                borderLeft: m.isFirst ? "none" : `1px solid ${C.borderStrong}`,
                display:"flex",alignItems:"center",
                padding:"0 14px",
              }}>
                <span style={{
                  fontSize:12,
                  fontWeight:600,
                  color:C.text,
                  letterSpacing:".08em",
                  textTransform:"uppercase",
                }}>
                  {m.label}
                </span>
                <span style={{
                  fontSize:11,
                  color:C.light,
                  marginLeft:8,
                  fontWeight:400,
                }}>
                  {m.year}
                </span>
              </div>
            );
          })}
        </div>

        {/* ─── DAY HEADER ──────────────────────────────────── */}
        <div style={{
          display:"flex",
          marginLeft:LABEL_W,
          height:HEAD_DAY_H,
          borderBottom:`1px solid ${C.border}`,
          background:C.surface,
        }}>
          {allDays.map((d,i)=>{
            const wd=d.getDay(), weekend=wd===0||wd===6;
            const isToday=dkey(d)===todayKey;
            const isMonthStart = d.getDate()===1;
            return (
              <div key={i} style={{
                width:CELL_W,flexShrink:0,
                textAlign:"center",
                boxSizing:"border-box",
                padding:"6px 0 6px",
                background: weekend ? C.weekend : C.surface,
                borderLeft: isMonthStart ? `1px solid ${C.borderStrong}` : "none",
                position:"relative",
              }}>
                {showWeekday && (
                  <div style={{
                    fontSize:9.5,
                    color: weekend ? C.muted : C.light,
                    letterSpacing:".05em",
                    textTransform:"uppercase",
                    marginBottom:2,
                    fontWeight:500,
                  }}>{WDAYS[wd]}</div>
                )}
                <div style={{
                  width:22,height:22,margin:"0 auto",borderRadius:"50%",
                  background: isToday ? `conic-gradient(from 220deg, ${C.accent}, color-mix(in oklch, ${C.accent}, white 22%), ${C.accent})` : "transparent",
                  color: isToday ? "#fff" : (weekend?C.muted:C.text),
                  fontSize:12,
                  fontWeight: isToday ? 600 : 500,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontVariantNumeric:"tabular-nums",
                  marginTop: showWeekday?0:6,
                  boxShadow: isToday ? `0 2px 8px -2px ${C.accent}80, inset 0 0 0 0.5px rgba(255,255,255,0.2)` : "none",
                }}>{d.getDate()}</div>
              </div>
            );
          })}
        </div>

        {/* ─── ROOM ROWS ───────────────────────────────────── */}
        <div style={{position:"relative"}}>
          {ROOMS.map((room, ri)=>(
            <div key={room.id} style={{
              display:"flex",
              borderBottom: ri<ROOMS.length-1 ? `1px solid ${C.border}` : "none",
              position:"relative",
            }}>
              {/* Room label */}
              <div style={{
                width:LABEL_W,flexShrink:0,height:CELL_H,
                display:"flex",alignItems:"center",gap:12,
                padding:"0 18px",
                borderRight:`1px solid ${C.border}`,
                boxSizing:"border-box",
                background:C.surface,
                position:"sticky",left:0,zIndex:3,
              }}>
                <img
                  src={room.icon}
                  alt={room.name}
                  style={{
                    height: 44,
                    width: "auto",
                    display: "block",
                    flexShrink: 0,
                    filter: `drop-shadow(0 1px 1px rgba(0,0,0,0.06))`,
                  }}
                  draggable="false"
                />
                <div style={{display:"flex",flexDirection:"column",lineHeight:1.2}}>
                  <span style={{fontSize:13.5,fontWeight:600,color:C.text}}>{room.name}</span>
                  <span style={{fontSize:11,color:C.light,marginTop:2}}>{room.beds}</span>
                </div>
              </div>

              {/* Day cells */}
              {allDays.map((d,di)=>{
                const k=dkey(d);
                const isSel = inSel(room.id,k) || (sel?.rid===room.id && sel?.d===k);
                const wd=d.getDay(), weekend=wd===0||wd===6;
                const isToday=k===todayKey;
                const isMonthStart = d.getDate()===1;
                let bg = weekend ? C.weekend : C.surface;
                if(isToday) bg = C.today;
                if(isSel) bg = room.color+"30";

                return (
                  <div key={di}
                    onClick={()=>clickDay(room.id, d)}
                    onMouseEnter={()=>{ if(sel?.rid===room.id) setHov(k); }}
                    onMouseLeave={()=>{ if(sel?.rid===room.id) setHov(null); }}
                    style={{
                      width:CELL_W,flexShrink:0,height:CELL_H,
                      background:bg,cursor:"pointer",position:"relative",
                      boxSizing:"border-box",
                      borderLeft: isMonthStart ? `1px solid ${C.borderStrong}` : "none",
                      transition:"background .12s",
                    }}
                    onMouseOver={e=>{
                      if(!isSel && !sel) e.currentTarget.style.background = isToday?C.today:C.sunken;
                    }}
                    onMouseOut={e=>{
                      if(!isSel) e.currentTarget.style.background = bg;
                    }}
                  />
                );
              })}
            </div>
          ))}

          {/* ─── BOOKING PILLS (absolutely positioned overlay) ── */}
          <div style={{
            position:"absolute",
            top:0,left:LABEL_W,right:0,bottom:0,
            pointerEvents:"none",
          }}>
            {allBookings.map(({room, ri, b, clippedLeft, clippedRight, truncL, truncR})=>{
              const left = clippedLeft * CELL_W;
              const width = (clippedRight - clippedLeft + 1) * CELL_W;
              const top = ri * CELL_H + 10;
              const height = CELL_H - 20;
              const radius = 999;
              return (
                <div key={`${room.id}-${b.id}`}
                  onClick={(e)=>{ e.stopPropagation(); onOpenBooking(room.id, b); }}
                  style={{
                    position:"absolute",
                    left, top, width: width-3, height,
                    background: `linear-gradient(135deg, color-mix(in oklch, ${b.col}, white 14%) 0%, ${b.col} 45%, color-mix(in oklch, ${b.col}, black 18%) 100%)`,
                    borderRadius:
                      truncL && truncR ? 0 :
                      truncL ? `0 ${radius}px ${radius}px 0` :
                      truncR ? `${radius}px 0 0 ${radius}px` :
                      radius,
                    color:"#fff",
                    display:"flex",alignItems:"center",
                    padding:"0 14px",
                    fontSize:12.5,fontWeight:600,
                    letterSpacing:".005em",
                    boxShadow:`0 2px 6px -2px ${b.col}66, inset 0 1px 0 rgba(255,255,255,0.18)`,
                    pointerEvents:"auto",
                    cursor:"pointer",
                    overflow:"hidden",
                    whiteSpace:"nowrap",
                    textOverflow:"ellipsis",
                  }}
                >
                  {truncL && <span style={{opacity:.6,marginRight:6,flexShrink:0}}>‹</span>}
                  <span style={{textOverflow:"ellipsis",overflow:"hidden",minWidth:0,flex:"0 1 auto"}}>{b.name}</span>
                  {truncR && <span style={{opacity:.6,marginLeft:"auto",flexShrink:0}}>›</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Summary card ───────────────────────────────────────────────── */
function SummaryCard({C, label, count, empty, items}){
  return (
    <div style={{
      background:C.surface,
      border:`1px solid ${C.border}`,
      borderRadius:14,
      padding:"18px 20px 16px",
      boxShadow:`0 1px 0 ${C.border}`,
    }}>
      <div style={{
        display:"flex",alignItems:"baseline",justifyContent:"space-between",
        marginBottom:14,
      }}>
        <div style={{
          fontSize:11,fontWeight:600,color:C.muted,
          letterSpacing:".12em",textTransform:"uppercase",
        }}>{label}</div>
        <div style={{fontSize:12,color:C.light,fontVariantNumeric:"tabular-nums"}}>{count}</div>
      </div>
      {items.length===0 ? (
        <div style={{
          fontSize:14,color:C.light,
          fontFamily:`'Instrument Serif', 'Onest', serif`,
          fontStyle:"italic",
          padding:"4px 0",
        }}>{empty}</div>
      ) : (
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {items.map(it=>(
            <div key={it.key} style={{
              display:"flex",alignItems:"center",gap:10,
            }}>
              <span style={{
                width:8,height:8,borderRadius:"50%",
                background:it.col,
                boxShadow:`0 0 0 3px ${it.col}22`,
                flexShrink:0,
              }}/>
              <span style={{
                fontSize:13.5,fontWeight:600,color:C.text,
                whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",
                minWidth:0,flex:"0 1 auto",
              }}>{it.name}</span>
              <img
                src={it.room.icon}
                alt={it.room.glyph}
                style={{height:22,width:"auto",display:"block",flexShrink:0,opacity:0.9}}
                draggable="false"
              />
              <span style={{flex:1}}/>
              <span style={{
                fontSize:12,
                color: it.rightTone==="accent" ? C.accent : C.muted,
                fontWeight: it.rightTone==="accent" ? 600 : 500,
              }}>{it.right}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Modals ─────────────────────────────────────────────────────── */
function Modal({C, onClose, children}){
  return (
    <div onClick={onClose} style={{
      position:"fixed",inset:0,zIndex:100,
      background:"rgba(20,28,22,0.32)",
      backdropFilter:"blur(6px)",
      WebkitBackdropFilter:"blur(6px)",
      display:"flex",alignItems:"center",justifyContent:"center",
      padding:24,
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        background:C.surface,
        borderRadius:18,
        border:`1px solid ${C.border}`,
        padding:24,
        width:360,
        maxWidth:"100%",
        boxShadow:`0 24px 64px -16px rgba(20,30,20,0.32)`,
      }}>{children}</div>
    </div>
  );
}

function AddModalBody({C, modal, inp, setInp, add, cancel}){
  const room = ROOMS.find(r=>r.id===modal.rid);
  const nights = diffDays(modal.s, modal.e);
  return (
    <>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
        <img
          src={room.icon}
          alt={room.name}
          style={{height:48,width:"auto",display:"block",flexShrink:0,filter:"drop-shadow(0 1px 2px rgba(0,0,0,0.08))"}}
          draggable="false"
        />
        <div>
          <div style={{fontSize:11,letterSpacing:".1em",textTransform:"uppercase",color:C.muted,fontWeight:600}}>New booking</div>
          <div style={{fontSize:14,fontWeight:600,color:C.text,marginTop:1}}>{room.name} · {room.beds}</div>
        </div>
      </div>
      <div style={{
        display:"flex",alignItems:"center",gap:10,
        padding:"12px 14px",
        background:C.sunken,
        borderRadius:10,
        marginBottom:16,
      }}>
        <DateBlock C={C} k={modal.s} label="check-in"/>
        <div style={{flex:1,height:1,background:C.border,position:"relative"}}>
          <span style={{
            position:"absolute",top:-9,left:"50%",transform:"translateX(-50%)",
            background:C.sunken,padding:"0 6px",
            fontSize:11,color:C.muted,
          }}>{nights} {nights===1?"night":"nights"}</span>
        </div>
        <DateBlock C={C} k={modal.e} label="check-out"/>
      </div>
      <label style={{display:"block",fontSize:12,fontWeight:600,color:C.muted,marginBottom:6,letterSpacing:".05em",textTransform:"uppercase"}}>Who's coming?</label>
      <input autoFocus placeholder="Name or group" value={inp}
        onChange={e=>setInp(e.target.value)}
        onKeyDown={e=>{ if(e.key==="Enter") add(); if(e.key==="Escape") cancel(); }}
        style={{
          width:"100%",boxSizing:"border-box",
          padding:"11px 13px",
          border:`1px solid ${C.border}`,
          borderRadius:10,
          fontSize:14,
          color:C.text,
          background:C.surface,
          outline:"none",
          fontFamily:"inherit",
          marginBottom:18,
        }}
        onFocus={e=>e.target.style.borderColor=C.accent}
        onBlur={e=>e.target.style.borderColor=C.border}
      />
      <div style={{display:"flex",gap:8}}>
        <button onClick={cancel} style={{
          flex:"0 0 auto",padding:"11px 18px",borderRadius:10,
          border:`1px solid ${C.border}`,background:"transparent",
          color:C.muted,fontSize:14,fontWeight:500,cursor:"pointer",
          fontFamily:"inherit",
        }}>Cancel</button>
        <button onClick={add} style={{
          flex:1,padding:"11px",borderRadius:10,
          border:"none",
          background: room.color,
          color:"#fff",
          fontWeight:600,fontSize:14,
          cursor:"pointer",
          fontFamily:"inherit",
          boxShadow:`0 2px 8px -2px ${room.color}66`,
        }}>Book it</button>
      </div>
    </>
  );
}

function DateBlock({C, k, label}){
  const d = parseKey(k);
  return (
    <div style={{textAlign:"center",minWidth:60}}>
      <div style={{fontSize:10,color:C.muted,letterSpacing:".06em",textTransform:"uppercase",fontWeight:600,marginBottom:2}}>{label}</div>
      <div style={{fontSize:18,fontWeight:700,color:C.text,lineHeight:1,letterSpacing:"-0.02em"}}>{d.getDate()}</div>
      <div style={{fontSize:11,color:C.muted,marginTop:2}}>{MONTHS_SHORT[d.getMonth()]} · {WDAYS[d.getDay()]}</div>
    </div>
  );
}

function ViewModalBody({C, modal, del, close}){
  const room = ROOMS.find(r=>r.id===modal.rid);
  const nights = diffDays(modal.b.s, modal.b.e);
  return (
    <>
      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
        <div style={{
          width:44,height:44,borderRadius:14,
          background:modal.b.col,
          color:"#fff",
          display:"flex",alignItems:"center",justifyContent:"center",
          fontSize:18,fontWeight:700,
          letterSpacing:"-0.02em",
          boxShadow:`0 4px 12px -4px ${modal.b.col}80`,
        }}>{modal.b.name[0].toUpperCase()}</div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:11,letterSpacing:".1em",textTransform:"uppercase",color:C.muted,fontWeight:600}}>Booking</div>
          <div style={{fontSize:18,fontWeight:600,color:C.text,marginTop:1,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{modal.b.name}</div>
        </div>
      </div>
      <div style={{
        display:"flex",alignItems:"center",gap:10,
        padding:"12px 14px",
        background:C.sunken,
        borderRadius:10,
        marginBottom:8,
      }}>
        <DateBlock C={C} k={modal.b.s} label="check-in"/>
        <div style={{flex:1,height:1,background:C.border,position:"relative"}}>
          <span style={{
            position:"absolute",top:-9,left:"50%",transform:"translateX(-50%)",
            background:C.sunken,padding:"0 6px",
            fontSize:11,color:C.muted,
          }}>{nights} {nights===1?"night":"nights"}</span>
        </div>
        <DateBlock C={C} k={modal.b.e} label="check-out"/>
      </div>
      <div style={{
        fontSize:13,color:C.muted,
        padding:"10px 0 18px",
        display:"flex",alignItems:"center",gap:8,
      }}>
        <img
          src={room.icon}
          alt={room.name}
          style={{height:30,width:"auto",display:"block",flexShrink:0}}
          draggable="false"
        />
        <span>{room.name} · {room.beds}</span>
      </div>
      <div style={{display:"flex",gap:8}}>
        <button onClick={close} style={{
          flex:1,padding:"11px",borderRadius:10,
          border:`1px solid ${C.border}`,background:"transparent",
          color:C.text,fontSize:14,fontWeight:500,cursor:"pointer",
          fontFamily:"inherit",
        }}>Close</button>
        <button onClick={()=>del(modal.rid, modal.b.id)} style={{
          flex:"0 0 auto",padding:"11px 18px",borderRadius:10,
          border:`1px solid #C75649`,
          background:"transparent",
          color:"#C75649",
          fontWeight:600,fontSize:14,
          cursor:"pointer",
          fontFamily:"inherit",
        }}>Remove</button>
      </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App/>);
