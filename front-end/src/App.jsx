import { useEffect, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:5000/api";

const REGIONS = [
  "الرياض", "مكة المكرمة", "المدينة المنورة", "الشرقية",
  "القصيم", "عسير", "تبوك", "حائل",
  "الحدود الشمالية", "جازان", "نجران", "الباحة", "الجوف"
];

// ══════════════════════════════
//  ROOT
export default function App() {
  const [token, setToken]   = useState(localStorage.getItem("wasl_token"));
  const [user,  setUser]    = useState(JSON.parse(localStorage.getItem("wasl_user") || "null"));
  const [screen, setScreen] = useState("landing");

  const login = (tok, u) => {
    localStorage.setItem("wasl_token", tok);
    localStorage.setItem("wasl_user", JSON.stringify(u));
    setToken(tok); setUser(u); setScreen("home");
  };

  const logout = () => {
    localStorage.clear();
    setToken(null); setUser(null); setScreen("landing");
  };

  if (token && user && screen === "home") {
    if (user.role === "donor")    return <DonorApp    user={user} token={token} onLogout={logout} />;
    if (user.role === "patient")  return <PatientApp  user={user} token={token} onLogout={logout} />;
    if (user.role === "hospital") return <HospitalApp user={user} token={token} onLogout={logout} />;
  }

  if (screen === "login" || screen === "register") {
    return (
      <AuthPage
        mode={screen}
        onLogin={login}
        onSwitch={() => setScreen(screen === "login" ? "register" : "login")}
        onBack={() => setScreen("landing")}
      />
    );
  }

  return <Landing onSelect={() => setScreen("login")} />;
}

// ══════════════════════════════
//  LANDING
// ══════════════════════════════
function Landing({ onSelect }) {
  const [stats, setStats] = useState({ donors: 0, donations: 0, hospitals: 0 });

  useEffect(() => {
    fetch(`${API}/stats`).then(r => r.json()).then(setStats).catch(() => {});
  }, []);

  const roles = [
    { icon: "🩸", title: "متبرع",         desc: "ساعد في إنقاذ حياة بالتبرع بدمك",           color: "#a0001c" },
    { icon: "👨‍👩‍👧", title: "قريب المريض", desc: "أنشئ طلب دم لذويك واحصل على متبرع سريع",   color: "#7b2d00" },
    { icon: "🏥", title: "مستشفى",         desc: "أدر طلبات الدم وتابع الحالات بسهولة",       color: "#003f7b" },
  ];

  return (
    <div className="landing" dir="rtl">
      <div className="landingBg" />
      <div className="landingBox">
        <div className="landingLogo"><div className="drop" /><span>وصل</span></div>
        <h1>كل قطرة دم <em>تفرق</em></h1>
        <p className="landingSub">منصة تربط المتبرعين بالمحتاجين في لحظات الطوارئ</p>

        <div className="landingStats">
          <div className="landingStat">
            <b>{stats.donors}</b><span>متبرع</span>
          </div>
          <div className="landingStat">
            <b>{stats.donations}</b><span>عملية تبرع</span>
          </div>
          <div className="landingStat">
            <b>{stats.hospitals}</b><span>مستشفى</span>
          </div>
        </div>

        <p className="whoAreYou">من أنت؟</p>
        <div className="roleCards">
          {roles.map(r => (
            <button key={r.title} className="roleCard" onClick={onSelect}
              style={{ "--c": r.color }}>
              <span className="rIcon">{r.icon}</span>
              <div>
                <strong>{r.title}</strong>
                <p>{r.desc}</p>
              </div>
              <span className="rArrow">←</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════
//  AUTH
// ══════════════════════════════
function AuthPage({ mode, onLogin, onSwitch, onBack }) {
  const isLogin = mode === "login";
  const [form, setForm] = useState({
    name:"", email:"", password:"", role:"donor", blood_type:"+O", city:"", region:""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API}/${isLogin ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error);
      onLogin(data.token, data.user);
    } catch { setError("خطأ في الاتصال"); }
    finally { setLoading(false); }
  };

  return (
    <div className="authPage" dir="rtl">
      <div className="authCard">
        <button className="backBtn" onClick={onBack}>→ رجوع</button>
        <div className="authLogo"><div className="drop sm" /><h2>وصل</h2></div>
        <h3>{isLogin ? "تسجيل الدخول" : "إنشاء حساب"}</h3>

        {error && <div className="errBox">{error}</div>}

        {!isLogin && (
          <input className="inp" placeholder="الاسم الكامل"
            value={form.name} onChange={e => set("name", e.target.value)} />
        )}
        <input className="inp" type="email" placeholder="البريد الإلكتروني"
          value={form.email} onChange={e => set("email", e.target.value)} />
        <input className="inp" type="password" placeholder="كلمة المرور"
          value={form.password} onChange={e => set("password", e.target.value)} />

        {!isLogin && <>
          <select className="inp" value={form.role} onChange={e => set("role", e.target.value)}>
            <option value="donor">متبرع</option>
            <option value="patient">قريب المريض</option>
            <option value="hospital">مستشفى</option>
          </select>
          <select className="inp" value={form.region} onChange={e => set("region", e.target.value)}>
            <option value="">— اختر المنطقة —</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <input className="inp" placeholder="المدينة"
            value={form.city} onChange={e => set("city", e.target.value)} />
          {form.role === "donor" && (
            <select className="inp" value={form.blood_type}
              onChange={e => set("blood_type", e.target.value)}>
              {["+O","-O","+A","-A","+B","-B","+AB","-AB"].map(b =>
                <option key={b} value={b}>{b}</option>
              )}
            </select>
          )}
        </>}

        <button className="authBtn" onClick={submit} disabled={loading}>
          {loading ? "..." : isLogin ? "دخول" : "إنشاء الحساب"}
        </button>
        <p className="switchTxt">
          {isLogin ? "ما عندك حساب؟" : "عندك حساب؟"}{" "}
          <span onClick={onSwitch}>{isLogin ? "سجّل الآن" : "سجّل دخولك"}</span>
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════
//  DONOR APP
// ══════════════════════════════
function DonorApp({ user, token, onLogout }) {
  const [tab, setTab]           = useState("home");
  const [requests, setRequests] = useState([]);
  const [filter, setFilter]     = useState(null);
  const [search, setSearch]     = useState("");
  const [profile, setProfile]   = useState(null);
  const [history, setHistory]   = useState([]);
  const [selected, setSelected] = useState(null);
  const [booking, setBooking]   = useState({ date:"", time:"" });
  const [msg, setMsg]           = useState("");
  const [notifs, setNotifs]     = useState([]);
  const [showNotif, setShowNotif] = useState(false);

  const H = { "Content-Type":"application/json", Authorization:`Bearer ${token}` };

  const fetchRequests = async () => {
    let url = `${API}/requests?`;
    if (filter) url += `blood_type=${filter}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    const r = await fetch(url);
    setRequests(await r.json());
  };

  const fetchProfile = async () => {
    const r = await fetch(`${API}/profile`, { headers: H });
    setProfile(await r.json());
  };

  const fetchHistory = async () => {
    const r = await fetch(`${API}/donations/history`, { headers: H });
    setHistory(await r.json());
  };

  const fetchNotifs = async () => {
    const r = await fetch(`${API}/notifications`, { headers: H });
    setNotifs(await r.json());
  };

  const markRead = async () => {
    await fetch(`${API}/notifications/read`, { method:"POST", headers: H });
    setNotifs(ns => ns.map(n => ({ ...n, is_read: true })));
  };

  useEffect(() => { fetchRequests(); }, [filter, search]);
  useEffect(() => { if (tab === "profile") fetchProfile(); }, [tab]);
  useEffect(() => { if (tab === "history") fetchHistory(); }, [tab]);
  useEffect(() => { fetchNotifs(); }, []);

  const handleDonate = async () => {
    const r = await fetch(`${API}/requests/${selected.id}/donate`, {
      method:"POST", headers:H,
      body: JSON.stringify(booking)
    });
    const d = await r.json();
    setMsg(d.message || d.error);
    setSelected(null);
    fetchRequests();
    setTimeout(() => setMsg(""), 3000);
  };

  const unread = notifs.filter(n => !n.is_read).length;

  return (
    <div className="app" dir="rtl">
      {msg && <div className="successBar">{msg}</div>}
      <Navbar user={user} onLogout={onLogout} label="🩸 متبرع"
        notifCount={unread} onBell={() => { setShowNotif(!showNotif); if (!showNotif) markRead(); }} />

      {showNotif && (
        <div className="notifDrop">
          <h4>الإشعارات</h4>
          {notifs.length === 0
            ? <p className="empty">لا توجد إشعارات</p>
            : notifs.map(n => (
              <div key={n.id} className={`notifItem ${n.is_read ? "" : "unread"}`}>
                <p>{n.message}</p>
                <small>{n.created_at}</small>
              </div>
            ))
          }
        </div>
      )}

      <div className="tabs">
        <button className={tab==="home"?"active":""} onClick={()=>setTab("home")}>الرئيسية</button>
        <button className={tab==="history"?"active":""} onClick={()=>setTab("history")}>سجلاتي</button>
        <button className={tab==="profile"?"active":""} onClick={()=>setTab("profile")}>حسابي</button>
      </div>

      {tab === "home" && (
        <main className="main">
          <div className="hero red">
            <div><h2>الحالات المتاحة 🩸</h2><p>اختر حالة وساعد في إنقاذ حياة</p></div>
          </div>

          <input className="inp searchBox" placeholder="🔍 ابحث عن مستشفى أو مدينة أو مريض..."
            value={search} onChange={e=>setSearch(e.target.value)} />

          <div className="chips">
            <button className={!filter?"act":""} onClick={()=>setFilter(null)}>الكل</button>
            {["+O","-O","+A","-A","+B","-B","+AB","-AB"].map(b=>(
              <button key={b} className={filter===b?"act":""} onClick={()=>setFilter(b===filter?null:b)}>{b}</button>
            ))}
          </div>

          <div className="cards">
            {requests.length === 0
              ? <p className="empty">لا توجد حالات متاحة</p>
              : requests.map(r => (
                <div key={r.id} className={`card ${r.urgency==="عاجل"?"urgent":""}`}>
                  <div className="cardTop">
                    <span className="badge">{r.blood_type}</span>
                    <div>
                      <b>{r.hospital_name}</b>
                      <p>{r.city} • {r.patient_name}</p>
                      {r.urgency==="عاجل" && <span className="urgTag">🚨 عاجل</span>}
                    </div>
                  </div>
                  <div className="cardBot">
                    <div className="prog">
                      <div className="progFill" style={{width:`${Math.round(r.bags_received/r.bags_needed*100)}%`}}/>
                    </div>
                    <small>{r.bags_received}/{r.bags_needed} أكياس</small>
                    <button className="donateBtn" onClick={()=>setSelected(r)}>تبرع 🩸</button>
                  </div>
                </div>
              ))
            }
          </div>
        </main>
      )}

      {tab === "history" && (
        <main className="main">
          <div className="hero red"><h2>سجل التبرعات 📋</h2></div>
          <div className="cards">
            {history.length === 0
              ? <p className="empty">لا توجد تبرعات سابقة</p>
              : history.map(h => (
                <div key={h.id} className="card">
                  <div className="cardTop">
                    <span className="badge">{h.blood_type}</span>
                    <div>
                      <b>{h.hospital_name}</b>
                      <p>{h.city} • {h.patient_name}</p>
                    </div>
                  </div>
                  <div className="historyMeta">
                    <span className={`histStatus ${h.status === "مؤكد" ? "confirmed" : ""}`}>
                      {h.status}
                    </span>
                    {h.appointment_date && <span>📅 {h.appointment_date}</span>}
                    {h.appointment_time && <span>🕐 {h.appointment_time}</span>}
                  </div>
                </div>
              ))
            }
          </div>
        </main>
      )}

      {tab === "profile" && profile && (
        <main className="main">
          <div className="hero red"><h2>حسابي 👤</h2></div>
          <div className="profileCard">
            <div className="profileRow"><span>الاسم</span><b>{profile.name}</b></div>
            <div className="profileRow"><span>البريد</span><b>{profile.email}</b></div>
            <div className="profileRow"><span>فصيلة الدم</span><b className="badge">{profile.blood_type}</b></div>
            <div className="profileRow"><span>المدينة</span><b>{profile.city}</b></div>
            <div className="profileRow"><span>النقاط</span><b className="pts">⭐ {profile.points} نقطة</b></div>
            <div className="profileRow"><span>عدد التبرعات</span><b>{profile.donations} تبرع</b></div>
          </div>
        </main>
      )}

      {selected && (
        <div className="modal" dir="rtl">
          <div className="modalBox">
            <h3>حجز موعد تبرع 🩸</h3>
            <p>{selected.hospital_name} — {selected.blood_type}</p>
            <input className="inp" type="date" value={booking.date}
              onChange={e=>setBooking({...booking, date:e.target.value})} />
            <input className="inp" type="time" value={booking.time}
              onChange={e=>setBooking({...booking, time:e.target.value})} />
            <div className="modalBtns">
              <button className="authBtn" onClick={handleDonate}>تأكيد الحجز</button>
              <button className="cancelBtn" onClick={()=>setSelected(null)}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ══════════════════════════════
//  PATIENT APP
// ══════════════════════════════
function PatientApp({ user, token, onLogout }) {
  const [requests, setRequests] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState("");
  const [form, setForm] = useState({
    patient_name:"", hospital_id:"", blood_type:"+O", bags_needed:1, urgency:"عادي"
  });
  const [msg, setMsg] = useState("");
  const [notifs, setNotifs] = useState([]);
  const [showNotif, setShowNotif] = useState(false);

  const H = { "Content-Type":"application/json", Authorization:`Bearer ${token}` };

  const fetchRequests = async () => {
    const r = await fetch(`${API}/requests`);
    setRequests(await r.json());
  };

  const fetchNotifs = async () => {
    const r = await fetch(`${API}/notifications`, { headers: H });
    setNotifs(await r.json());
  };

  const markRead = async () => {
    await fetch(`${API}/notifications/read`, { method:"POST", headers: H });
    setNotifs(ns => ns.map(n => ({ ...n, is_read: true })));
  };

  const fetchHospitals = async (region) => {
    const url = region ? `${API}/hospitals?region=${encodeURIComponent(region)}` : `${API}/hospitals`;
    const r = await fetch(url);
    const list = await r.json();
    setHospitals(list);
    setForm(f => ({ ...f, hospital_id: list.length ? String(list[0].id) : "" }));
  };

  useEffect(() => { fetchRequests(); fetchHospitals(""); fetchNotifs(); }, []);

  useEffect(() => { fetchHospitals(selectedRegion); }, [selectedRegion]);

  const unread = notifs.filter(n => !n.is_read).length;

  const submit = async () => {
    const r = await fetch(`${API}/requests`, {
      method:"POST", headers:H, body:JSON.stringify(form)
    });
    const d = await r.json();
    setMsg(d.message || d.error);
    setShowForm(false);
    fetchRequests();
    setTimeout(() => setMsg(""), 3000);
  };

  return (
    <div className="app" dir="rtl">
      {msg && <div className="successBar">{msg}</div>}
      <Navbar user={user} onLogout={onLogout} label="👨‍👩‍👧 عائلة مريض"
        notifCount={unread} onBell={() => { setShowNotif(!showNotif); if (!showNotif) markRead(); }} />

      {showNotif && (
        <div className="notifDrop">
          <h4>الإشعارات</h4>
          {notifs.length === 0
            ? <p className="empty">لا توجد إشعارات</p>
            : notifs.map(n => (
              <div key={n.id} className={`notifItem ${n.is_read ? "" : "unread"}`}>
                <p>{n.message}</p>
                <small>{n.created_at}</small>
              </div>
            ))
          }
        </div>
      )}

      <main className="main">
        <div className="hero orange">
          <div><h2>طلبات الدم 🏥</h2><p>أنشئ طلب وسنوصلك بمتبرع</p></div>
          <button className="newBtn" onClick={()=>setShowForm(!showForm)}>
            {showForm ? "إلغاء" : "+ طلب جديد"}
          </button>
        </div>

        {showForm && (
          <div className="formBox">
            <input className="inp" placeholder="اسم المريض"
              value={form.patient_name} onChange={e=>setForm({...form,patient_name:e.target.value})} />
            <select className="inp" value={selectedRegion}
              onChange={e=>setSelectedRegion(e.target.value)}>
              <option value="">— كل المناطق —</option>
              {REGIONS.map(r=><option key={r} value={r}>{r}</option>)}
            </select>
            <select className="inp" value={form.hospital_id}
              onChange={e=>setForm({...form,hospital_id:e.target.value})}>
              {hospitals.length === 0
                ? <option value="">لا توجد مستشفيات</option>
                : hospitals.map(h=><option key={h.id} value={h.id}>{h.name} — {h.city}</option>)
              }
            </select>
            <select className="inp" value={form.blood_type}
              onChange={e=>setForm({...form,blood_type:e.target.value})}>
              {["+O","-O","+A","-A","+B","-B","+AB","-AB"].map(b=>
                <option key={b} value={b}>{b}</option>
              )}
            </select>
            <input className="inp" type="number" min="1" placeholder="عدد الأكياس"
              value={form.bags_needed} onChange={e=>setForm({...form,bags_needed:+e.target.value})} />
            <select className="inp" value={form.urgency}
              onChange={e=>setForm({...form,urgency:e.target.value})}>
              <option value="عادي">عادي</option>
              <option value="عاجل">عاجل 🚨</option>
            </select>
            <button className="authBtn" onClick={submit}>إرسال الطلب</button>
          </div>
        )}

        <div className="cards">
          {requests.length === 0
            ? <p className="empty">لا توجد طلبات</p>
            : requests.map(r => (
              <div key={r.id} className={`card ${r.urgency==="عاجل"?"urgent":""}`}>
                <div className="cardTop">
                  <span className="badge">{r.blood_type}</span>
                  <div>
                    <b>{r.hospital_name}</b>
                    <p>{r.patient_name} • {r.city}</p>
                    {r.urgency==="عاجل" && <span className="urgTag">🚨 عاجل</span>}
                  </div>
                </div>
                <div className="cardBot">
                  <div className="prog">
                    <div className="progFill" style={{width:`${Math.round(r.bags_received/r.bags_needed*100)}%`}}/>
                  </div>
                  <small>{r.bags_received}/{r.bags_needed} أكياس</small>
                </div>
              </div>
            ))
          }
        </div>
      </main>
    </div>
  );
}

// ══════════════════════════════
//  HOSPITAL APP
// ══════════════════════════════
function HospitalApp({ user, token, onLogout }) {
  const [requests, setRequests] = useState([]);
  const [msg, setMsg] = useState("");
  const H = { "Content-Type":"application/json", Authorization:`Bearer ${token}` };

  const fetchAll = async () => {
    const r = await fetch(`${API}/hospital/requests`, { headers: H });
    setRequests(await r.json());
  };

  useEffect(() => { fetchAll(); }, []);

  const action = async (id, endpoint, body={}) => {
    const r = await fetch(`${API}/requests/${id}/${endpoint}`, {
      method:"POST", headers:H, body:JSON.stringify(body)
    });
    const d = await r.json();
    setMsg(d.message || d.error);
    fetchAll();
    setTimeout(() => setMsg(""), 3000);
  };

  const active    = requests.filter(r=>r.status==="نشط");
  const completed = requests.filter(r=>r.status==="مكتمل");

  return (
    <div className="app" dir="rtl">
      {msg && <div className="successBar">{msg}</div>}
      <Navbar user={user} onLogout={onLogout} label="🏥 مستشفى" />
      <main className="main">
        <div className="hero blue">
          <div><h2>لوحة التحكم 🏥</h2><p>إدارة طلبات الدم والحالات</p></div>
          <div className="heroStats">
            <Stat v={active.length}    l="نشطة" />
            <Stat v={completed.length} l="مكتملة" />
          </div>
        </div>

        <h3 className="sectionTitle">الحالات النشطة</h3>
        <div className="cards">
          {active.length === 0
            ? <p className="empty">لا توجد حالات نشطة</p>
            : active.map(r => (
              <div key={r.id} className={`card ${r.urgency==="عاجل"?"urgent":""}`}>
                <div className="cardTop">
                  <span className="badge">{r.blood_type}</span>
                  <div>
                    <b>{r.patient_name}</b>
                    <p>{r.requester_name} • {r.city}</p>
                    {r.urgency==="عاجل" && <span className="urgTag">🚨 عاجل</span>}
                  </div>
                </div>
                <div className="cardBot">
                  <div className="prog">
                    <div className="progFill" style={{width:`${Math.round(r.bags_received/r.bags_needed*100)}%`}}/>
                  </div>
                  <small>{r.bags_received}/{r.bags_needed} أكياس</small>
                  <div className="actionBtns">
                    <button className="actBtn green"
                      onClick={()=>action(r.id,"confirm",{urgency:"عادي"})}>تأكيد عادي</button>
                    <button className="actBtn red"
                      onClick={()=>action(r.id,"confirm",{urgency:"عاجل"})}>تأكيد عاجل 🚨</button>
                    <button className="actBtn gray"
                      onClick={()=>action(r.id,"complete")}>إغلاق</button>
                  </div>
                </div>
              </div>
            ))
          }
        </div>

        <h3 className="sectionTitle">الحالات المكتملة</h3>
        <div className="cards">
          {completed.length === 0
            ? <p className="empty">لا توجد حالات مكتملة</p>
            : completed.map(r => (
              <div key={r.id} className="card done">
                <div className="cardTop">
                  <span className="badge">{r.blood_type}</span>
                  <div>
                    <b>{r.patient_name}</b>
                    <p>✅ مكتمل</p>
                  </div>
                </div>
              </div>
            ))
          }
        </div>
      </main>
    </div>
  );
}

// ══════════════════════════════
//  SHARED
// ══════════════════════════════
function Navbar({ user, onLogout, label, notifCount = 0, onBell }) {
  return (
    <nav className="nav">
      <div className="navBrand"><div className="drop sm"/><strong>وصل</strong></div>
      <div className="navRight">
        <span className="roleTag">{label}</span>
        {onBell && (
          <button className="bellBtn" onClick={onBell}>
            🔔{notifCount > 0 && <span className="bellBadge">{notifCount}</span>}
          </button>
        )}
        <span className="userName">{user?.name}</span>
        <button className="logoutBtn" onClick={onLogout}>خروج</button>
      </div>
    </nav>
  );
}

function Stat({ v, l }) {
  return <div className="stat"><b>{v}</b><span>{l}</span></div>;
}