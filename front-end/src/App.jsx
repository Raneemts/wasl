import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import "./App.css";

const API = "http://127.0.0.1:5000/api";

const REGIONS = [
  "الرياض", "جدة", "مكة المكرمة", "المدينة المنورة",
  "الدمام", "الخبر", "تبوك", "أبها",
  "بريدة", "حائل", "نجران", "جازان", "الباحة"
];

// ══════════════════════════════
//  ROOT
export default function App() {
  const [token, setToken]   = useState(localStorage.getItem("wasl_token"));
  const [user,  setUser]    = useState(JSON.parse(localStorage.getItem("wasl_user") || "null"));

  const login = (tok, u) => {
    localStorage.setItem("wasl_token", tok);
    localStorage.setItem("wasl_user", JSON.stringify(u));
    setToken(tok); setUser(u);
  };

  const logout = () => {
    localStorage.clear();
    setToken(null); setUser(null);
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        {!token ? (
          <>
            <Route path="/"         element={<><Landing /><Footer /></>} />
            <Route path="/login"    element={<AuthPage mode="login" onLogin={login} />} />
            <Route path="/register" element={<AuthPage mode="register" onLogin={login} />} />
            <Route path="*"         element={<Navigate to="/" />} />
          </>
        ) : (
          /* Protected Routes */
          <>
            <Route path="/home/*" element={
              user?.role === "donor"    ? <DonorApp    user={user} token={token} onLogout={logout} /> :
              user?.role === "patient"  ? <PatientApp  user={user} token={token} onLogout={logout} /> :
              user?.role === "hospital" ? <HospitalApp user={user} token={token} onLogout={logout} /> :
              <Navigate to="/" />
            } />
            <Route path="*" element={<Navigate to="/home" />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  );
}

// ══════════════════════════════
//  COMPONENTS
// ══════════════════════════════
function Logo({ sm }) {
  return (
    <div className={`logo ${sm ? "sm" : ""}`} style={{ display: "flex", alignItems: "center", gap: "10px", color: "white", fontWeight: "bold" }}>
      <svg viewBox="0 0 100 120" width={sm ? 24 : 40} height={sm ? 30 : 50}>
        <path d="M50,10 Q10,60 50,110 Q90,60 50,10" fill="#ff2d55" />
        <circle cx="50" cy="65" r="10" fill="white" opacity="0.4" />
      </svg>
      <span style={{ fontSize: sm ? "18px" : "28px" }}>وصل</span>
    </div>
  );
}

function Sidebar({ links }) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="sidebar">
      {links.map(l => (
        <button key={l.id} 
          className={`sideLink ${location.pathname.includes(l.path) ? "active" : ""}`}
          onClick={() => navigate(l.path)}>
          <span style={{ fontSize: "18px" }}>{l.icon}</span> {l.label}
        </button>
      ))}
    </div>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div style={{ display: "flex", justifyContent: "center", marginBottom: "20px" }}><Logo /></div>
      <p>منصة وصل للتبرع بالدم — جميع الحقوق محفوظة {new Date().getFullYear()}</p>
      <p style={{ marginTop: "10px", opacity: 0.6 }}>نربط القلوب لإنقاذ الأرواح</p>
    </footer>
  );
}

// ══════════════════════════════
//  LANDING
// ══════════════════════════════
function Landing() {
  const navigate = useNavigate();
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
        <div className="landingLogo"><Logo /></div>
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
            <button key={r.title} className="roleCard" onClick={() => navigate("/login")}
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
function AuthPage({ mode, onLogin }) {
  const navigate = useNavigate();
  const isLogin = mode === "login";
  const [form, setForm] = useState({
    name:"", email:"", password:"", phone:"", role:"donor", blood_type:"+O", city:"", region:""
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async () => {
    setLoading(true); setError("");

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      setError("يرجى إدخال بريد إلكتروني صحيح (مثال: name@gmail.com)");
      setLoading(false);
      return;
    }

    if (!isLogin) {
      if (!form.name?.trim()) {
        setError("الاسم الكامل مطلوب");
        setLoading(false);
        return;
      }
      if (!form.phone?.trim()) {
        setError("رقم الهاتف مطلوب");
        setLoading(false);
        return;
      }
      if (!form.city) {
        setError("يرجى اختيار المدينة");
        setLoading(false);
        return;
      }
    }

    try {
      const res  = await fetch(`${API}/${isLogin ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error);
      onLogin(data.token, data.user);
      navigate("/home");
    } catch { setError("خطأ في الاتصال"); }
    finally { setLoading(false); }
  };

  return (
    <div className="authPage" dir="rtl">
      <div className="authCard">
        <button className="backBtn" onClick={() => navigate("/login")}>→ رجوع</button>
        <div className="authLogo"><Logo sm /></div>
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

        {!isLogin && (
          <input className="inp" type="tel" placeholder="رقم الهاتف"
            value={form.phone} onChange={e => set("phone", e.target.value)} dir="ltr" />
        )}

        {!isLogin && <>
          <select className="inp" value={form.role} onChange={e => set("role", e.target.value)}>
            <option value="donor">متبرع</option>
            <option value="patient">قريب المريض</option>
            <option value="hospital">مستشفى</option>
          </select>
          <select className="inp" value={form.region} onChange={e => {
            set("region", e.target.value);
            set("city", e.target.value);
          }}>
            <option value="">— اختر المدينة —</option>
            {REGIONS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
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
          <span onClick={() => navigate(isLogin ? "/register" : "/login")}>{isLogin ? "سجّل الآن" : "سجّل دخولك"}</span>
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════
//  DONOR APP
// ══════════════════════════════
function DonorApp({ user, token, onLogout }) {
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
  const [loading, setLoading]   = useState(false);

  const H = { "Content-Type":"application/json", Authorization:`Bearer ${token}` };

  const fetchRequests = async () => {
    setLoading(true);
    let url = `${API}/requests?`;
    if (filter) url += `blood_type=${filter}&`;
    if (search) url += `search=${encodeURIComponent(search)}&`;
    if (user.city) url += `city=${encodeURIComponent(user.city)}&`;
    try {
      const r = await fetch(url);
      setRequests(await r.json());
    } finally { setLoading(false); }
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
  useEffect(() => { fetchProfile(); fetchHistory(); fetchNotifs(); }, []);

  const handleDonate = async () => {
    try {
      const r = await fetch(`${API}/requests/${selected.id}/donate`, {
        method: "POST",
        headers: H,
        body: JSON.stringify({ date: booking.date, time: booking.time })
      });
      const d = await r.json();
      if (!r.ok) { alert(d.error || "حدث خطأ"); return; }
      setMsg(d.message || "تم الحجز بنجاح ✅");
      setSelected(null);
      setBooking({ date: "", time: "" });
      fetchRequests();
      setTimeout(() => setMsg(""), 3000);
    } catch {
      alert("خطأ في الاتصال بالخادم");
    }
  };

  const unread = notifs.filter(n => !n.is_read).length;

  const sideLinks = [
    { id: "home",    label: "الرئيسية",  icon: "🏠", path: "/home" },
    { id: "history", label: "سجلاتي",    icon: "📋", path: "/home/history" },
    { id: "profile", label: "حسابي",     icon: "👤", path: "/home/profile" },
  ];

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

      <div className="appBody">
        <Sidebar links={sideLinks} />

        <Routes>
          <Route path="/" element={
            <main className="main">
              <div className="hero red">
                <div><h2>الحالات المتاحة 🩸</h2><p>اختر حالة وساعد في إنقاذ حياة</p></div>
              </div>

              <input className="inp searchBox" placeholder="🔍 ابحث عن مستشفى أو مدينة..."
                value={search} onChange={e=>setSearch(e.target.value)} />

              <div className="chips">
                <button className={!filter?"act":""} onClick={()=>setFilter(null)}>الكل</button>
                {["+O","-O","+A","-A","+B","-B","+AB","-AB"].map(b=>(
                  <button key={b} className={filter===b?"act":""} onClick={()=>setFilter(b===filter?null:b)}>{b}</button>
                ))}
              </div>

              <div className={`cards ${loading ? "loading-pulse" : ""}`}>
                {requests.length === 0
                  ? <p className="empty">{loading ? "جاري التحميل..." : "لا توجد حالات متاحة"}</p>
                  : requests.map(r => (
                    <div key={r.id} className={`card ${r.urgency==="عاجل"?"urgent":""}`}>
                      <div className="cardTop">
                        <span className="badge">{r.blood_type}</span>
                        <div>
                          <b>{r.hospital_name}</b>
                          <p>{r.city} • حالة محتاجة</p>
                          {r.urgency==="عاجل" && <span className="urgTag">🚨 عاجل</span>}
                        </div>
                      </div>
                      <div className="cardBot">
                        <div className="prog">
                          <div className="progFill" style={{width:`${Math.round(r.bags_received/r.bags_needed*100)}%`}}/>
                        </div>
                        <small>{r.bags_received}/{r.bags_needed} أكياس 🩸</small>
                        <button className="donateBtn" onClick={()=>{ setSelected(r); setBooking({date:"",time:""}); }}>
                          <span className="donateBtnIcon">🩸</span>
                          <span>تبرع الآن</span>
                        </button>
                      </div>
                    </div>
                  ))
                }
              </div>
            </main>
          } />

          <Route path="/history" element={
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
                          <p>{h.city} • تبرع مكتمل</p>
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
          } />

          <Route path="/profile" element={
            profile && (
              <main className="main">
                <div className="hero red"><h2>حسابي 👤</h2></div>
                <div className="profileCard">
                  <div className="profileAvatar"><span>{profile.name?.charAt(0)}</span></div>
                  <p className="profileName">{profile.name}</p>
                  <p className="profileEmail">{profile.email}</p>
                  <table className="profileTable">
                    <tbody>
                      <tr>
                        <td className="profileLabel">فصيلة الدم</td>
                        <td>
                          <input
                            className="inp bloodTypeLocked"
                            type="text"
                            value={profile.blood_type || ""}
                            disabled
                            dir="ltr"
                            readOnly
                          />
                        </td>
                      </tr>
                      <tr>
                        <td className="profileLabel">المدينة</td>
                        <td>{profile.city}</td>
                      </tr>
                      <tr>
                        <td className="profileLabel">النقاط</td>
                        <td><span className="pts">⭐ {profile.points} نقطة</span></td>
                      </tr>
                      <tr>
                        <td className="profileLabel">عدد التبرعات</td>
                        <td><span className="donationCount">🩸 {profile.donations} تبرع</span></td>
                      </tr>
                    </tbody>
                  </table>
                  <p style={{ marginTop: "12px", fontSize: "12px", color: "#999", textAlign: "center" }}>
                    لا يمكن تعديل فصيلة الدم بعد التسجيل لأسباب أمنية.
                  </p>
                </div>
              </main>
            )
          } />
        </Routes>
      </div>

      <Footer />

      {selected && (
        <div className="modal" dir="rtl" onClick={()=>setSelected(null)}>
          <div className="modalBox" onClick={e=>e.stopPropagation()}>
            <h3>حجز موعد تبرع 🩸</h3>
            <p>{selected.hospital_name} — {selected.blood_type}</p>
            <label className="dateLabel">📅 اختر التاريخ</label>
            <input className="inp dateInp" type="date" value={booking.date}
              min={new Date().toISOString().split("T")[0]}
              onChange={e=>setBooking({...booking, date:e.target.value})} />
            <label className="dateLabel">🕐 اختر الوقت</label>
            <select className="inp" value={booking.time}
              onChange={e=>setBooking({...booking, time:e.target.value})}>
              <option value="">— اختر الوقت —</option>
              <option value="08:00">8:00 صباحاً</option>
              <option value="09:00">9:00 صباحاً</option>
              <option value="10:00">10:00 صباحاً</option>
              <option value="11:00">11:00 صباحاً</option>
              <option value="12:00">12:00 ظهراً</option>
              <option value="13:00">1:00 مساءً</option>
              <option value="14:00">2:00 مساءً</option>
              <option value="15:00">3:00 مساءً</option>
              <option value="16:00">4:00 مساءً</option>
              <option value="17:00">5:00 مساءً</option>
            </select>
            <div className="modalBtns">
              <button className="authBtn" onClick={async () => {
                if (!booking.date || !booking.time) {
                  alert("يرجى اختيار التاريخ والوقت");
                  return;
                }
                await handleDonate();
              }}>تأكيد الحجز</button>
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
  const [selectedCity, setSelectedCity] = useState("");
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

  const fetchHospitals = async (city) => {
    const url = city ? `${API}/hospitals?city=${encodeURIComponent(city)}` : `${API}/hospitals`;
    const r = await fetch(url);
    const list = await r.json();
    setHospitals(list);
    setForm(f => ({ ...f, hospital_id: list.length ? String(list[0].id) : "" }));
  };

  useEffect(() => { fetchRequests(); fetchHospitals(""); fetchNotifs(); }, []);
  useEffect(() => { fetchHospitals(selectedCity); }, [selectedCity]);

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

  const sideLinks = [
    { id: "home", label: "طلبات الدم", icon: "🏥", path: "/home" },
    { id: "account", label: "حسابي", icon: "👤", path: "/home/profile" },
  ];

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

      <div className="appBody">
        <Sidebar links={sideLinks} />

        <Routes>
          <Route path="/" element={
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

                  <select className="inp" value={selectedCity} onChange={e=>setSelectedCity(e.target.value)}>
                    <option value="">— اختر المدينة —</option>
                    {REGIONS.map(r=><option key={r} value={r}>{r}</option>)}
                  </select>

                  <select className="inp" value={form.hospital_id} onChange={e=>setForm({...form,hospital_id:e.target.value})}>
                    {hospitals.length === 0
                      ? <option value="">لا توجد مستشفيات في هذه المدينة</option>
                      : hospitals.map(h=><option key={h.id} value={h.id}>{h.name} — {h.city}</option>)
                    }
                  </select>

                  <select className="inp" value={form.blood_type} onChange={e=>setForm({...form,blood_type:e.target.value})}>
                    {["+O","-O","+A","-A","+B","-B","+AB","-AB"].map(b=>
                      <option key={b} value={b}>{b}</option>
                    )}
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
          } />

          <Route path="/profile" element={
            <main className="main">
              <div className="hero orange"><h2>حسابي 👤</h2></div>
              <div className="profileCard">
                <div className="profileRow"><span>الاسم</span><b>{user.name}</b></div>
                <div className="profileRow"><span>الدور</span><b>قريب مريض</b></div>
                <div className="profileRow"><span>المدينة</span><b>{user.city}</b></div>
              </div>
            </main>
          } />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

// ══════════════════════════════
//  HOSPITAL APP
// ══════════════════════════════
function HospitalApp({ user, token, onLogout }) {
  const [requests, setRequests] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [msg, setMsg] = useState("");
  const H = { "Content-Type":"application/json", Authorization:`Bearer ${token}` };

  const fetchAll = async () => {
    const r = await fetch(`${API}/hospital/requests`, { headers: H });
    setRequests(await r.json());
  };

  const fetchAppointments = async () => {
    const r = await fetch(`${API}/hospital/appointments`, { headers: H });
    setAppointments(await r.json());
  };

  useEffect(() => { fetchAll(); fetchAppointments(); }, []);

  const action = async (id, endpoint, body={}) => {
    const r = await fetch(`${API}/requests/${id}/${endpoint}`, {
      method:"POST", headers:H, body:JSON.stringify(body)
    });
    const d = await r.json();
    setMsg(d.message || d.error);
    fetchAll(); fetchAppointments();
    setTimeout(() => setMsg(""), 3000);
  };

  const confirmDonation = async (did) => {
    const r = await fetch(`${API}/donations/${did}/confirm`, {
      method:"POST", headers:H
    });
    const d = await r.json();
    setMsg(d.message || d.error);
    fetchAll(); fetchAppointments();
    setTimeout(() => setMsg(""), 3000);
  };

  const pending   = requests.filter(r=>r.status==="معلق");
  const active    = requests.filter(r=>r.status==="نشط");
  const completed = requests.filter(r=>r.status==="مكتمل");
  const pendingApts = appointments.filter(a=>a.status==="معلق");
  const confirmedApts = appointments.filter(a=>a.status==="مؤكد");

  const sideLinks = [
    { id: "home", label: "الطلبات", icon: "📊", path: "/home" },
    { id: "appointments", label: `المواعيد ${pendingApts.length > 0 ? "🔔" : ""}`, icon: "📅", path: "/home/appointments" },
    { id: "account", label: "حسابي", icon: "👤", path: "/home/profile" },
  ];

  return (
    <div className="app" dir="rtl">
      {msg && <div className="successBar">{msg}</div>}
      <Navbar user={user} onLogout={onLogout} label="🏥 مستشفى" />
      
      <div className="appBody">
        <Sidebar links={sideLinks} />

        <Routes>
          <Route path="/" element={
            <main className="main">
              <div className="hero blue">
                <div><h2>لوحة التحكم 🏥</h2><p>إدارة طلبات الدم والحالات</p></div>
                <div className="heroStats">
                  <Stat v={pending.length}   l="معلقة" />
                  <Stat v={active.length}    l="نشطة" />
                  <Stat v={completed.length} l="مكتملة" />
                </div>
              </div>

              <h3 className="sectionTitle">🆕 طلبات جديدة — بانتظار التأكيد</h3>
              <div className="cards">
                {pending.length === 0
                  ? <p className="empty">لا توجد طلبات جديدة</p>
                  : pending.map(r => (
                    <div key={r.id} className="card">
                      <div className="cardTop">
                        <span className="badge">{r.blood_type}</span>
                        <div>
                          <b>{r.patient_name}</b>
                          <p>{r.requester_name} • {r.city}</p>
                        </div>
                      </div>
                      <div className="actionBtns">
                        <button className="actBtn green" onClick={()=>action(r.id,"confirm",{urgency:"عادي", bags_needed: prompt("كم عدد الأكياس المطلوبة؟") || 1})}>
                          تأكيد عادي
                        </button>
                        <button className="actBtn red" onClick={()=>action(r.id,"confirm",{urgency:"عاجل", bags_needed: prompt("كم عدد الأكياس المطلوبة؟") || 1})}>
                          تأكيد عاجل 🚨
                        </button>
                        <button className="actBtn gray" onClick={()=>action(r.id,"complete")}>رفض</button>
                      </div>
                    </div>
                  ))
                }
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
                          <button className="actBtn gray" onClick={()=>action(r.id,"complete")}>إغلاق ✅</button>
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
          } />

          <Route path="/appointments" element={
            <main className="main">
              <div className="hero blue">
                <div><h2>مواعيد التبرع 📅</h2><p>أكّد حضور المتبرعين</p></div>
              </div>

              <h3 className="sectionTitle">⏳ بانتظار التأكيد</h3>
              <div className="cards">
                {pendingApts.length === 0
                  ? <p className="empty">لا توجد مواعيد بانتظار التأكيد</p>
                  : pendingApts.map(a => (
                    <div key={a.id} className="card">
                      <div className="cardTop">
                        <span className="badge">{a.blood_type}</span>
                        <div>
                          <b>{a.donor_name}</b>
                          <p>للمريض: {a.patient_name}</p>
                        </div>
                      </div>
                      <div className="historyMeta">
                        {a.appointment_date && <span>📅 {a.appointment_date}</span>}
                        {a.appointment_time && <span>🕐 {a.appointment_time}</span>}
                      </div>
                      <div className="actionBtns" style={{marginTop:"10px"}}>
                        <button className="actBtn green" onClick={()=>confirmDonation(a.id)}>
                          تأكيد التبرع ✅
                        </button>
                      </div>
                    </div>
                  ))
                }
              </div>

              <h3 className="sectionTitle">✅ تم التأكيد</h3>
              <div className="cards">
                {confirmedApts.length === 0
                  ? <p className="empty">لا توجد مواعيد مؤكدة</p>
                  : confirmedApts.map(a => (
                    <div key={a.id} className="card done">
                      <div className="cardTop">
                        <span className="badge">{a.blood_type}</span>
                        <div>
                          <b>{a.donor_name}</b>
                          <p>للمريض: {a.patient_name}</p>
                        </div>
                      </div>
                      <div className="historyMeta">
                        {a.appointment_date && <span>📅 {a.appointment_date}</span>}
                        {a.appointment_time && <span>🕐 {a.appointment_time}</span>}
                        <span className="histStatus confirmed">✅ تم التبرع</span>
                      </div>
                    </div>
                  ))
                }
              </div>
            </main>
          } />

          <Route path="/profile" element={
            <main className="main">
              <div className="hero blue"><h2>حسابي 👤</h2></div>
              <div className="profileCard">
                <div className="profileRow"><span>الاسم</span><b>{user.name}</b></div>
                <div className="profileRow"><span>المدينة</span><b>{user.city}</b></div>
              </div>
            </main>
          } />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}

// ══════════════════════════════
//  SHARED
// ══════════════════════════════
function Navbar({ user, onLogout, label, notifCount = 0, onBell }) {
  return (
    <nav className="nav">
      <div className="navBrand"><Logo sm /></div>
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
