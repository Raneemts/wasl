import { useEffect, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:5000/api";
const BLOOD_TYPES = ["+O", "-O", "+A", "-A", "+B", "-B", "+AB", "-AB"];

// ─────────────────────────────
// APP ROOT
// ─────────────────────────────
function App() {
  const [token, setToken] = useState(localStorage.getItem("wasl_token"));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("wasl_user") || "null"));
  const [screen, setScreen] = useState("landing");
  const [selectedRole, setSelectedRole] = useState(null);

  const handleRoleSelect = (role) => { setSelectedRole(role); setScreen("login"); };

  const handleLogin = (tok, userData) => {
    localStorage.setItem("wasl_token", tok);
    localStorage.setItem("wasl_user", JSON.stringify(userData));
    setToken(tok); setUser(userData); setScreen("home");
  };

  const handleLogout = () => {
    localStorage.removeItem("wasl_token");
    localStorage.removeItem("wasl_user");
    setToken(null); setUser(null); setScreen("landing"); setSelectedRole(null);
  };

  if (token && user && screen === "home")
    return <HomePage user={user} token={token} onLogout={handleLogout} setUser={setUser} />;

  if (screen === "landing") return <LandingPage onSelect={handleRoleSelect} />;

  if (screen === "register")
    return <RegisterPage role={selectedRole} onSwitch={() => setScreen("login")}
             onLogin={handleLogin} onBack={() => setScreen("landing")} />;

  return <LoginPage role={selectedRole} onSwitch={() => setScreen("register")}
           onLogin={handleLogin} onBack={() => setScreen("landing")} />;
}

// ─────────────────────────────
// LANDING PAGE
// ─────────────────────────────
const ROLES = [
  { key: "donor",    icon: "🩸", title: "متبرع",       desc: "ساعد في إنقاذ حياة بالتبرع بدمك للحالات المحتاجة",   color: "#a0001c", bg: "#fff0f3", border: "#ffb3c1" },
  { key: "patient",  icon: "👨‍👩‍👧", title: "قريب المريض", desc: "أنشئ طلب دم لذويك واحصل على متبرعين في أسرع وقت",    color: "#7b3000", bg: "#fff5f0", border: "#ffd4b3" },
  { key: "hospital", icon: "🏥", title: "مستشفى",      desc: "أدر طلبات الدم وتابع التبرعات من لوحة تحكم متكاملة", color: "#003f7b", bg: "#f0f5ff", border: "#b3ccff" },
];

function LandingPage({ onSelect }) {
  return (
    <div className="landingPage" dir="rtl">
      <div className="landingBg">
        <div className="bgCircle c1" /><div className="bgCircle c2" /><div className="bgCircle c3" />
      </div>
      <div className="landingContent">
        <div className="landingLogo">
          <div className="logoDrop" />
          <span>وصل</span>
        </div>
        <h1 className="landingTitle">كل قطرة دم<br /><span>تفرق</span></h1>
        <p className="landingSubtitle">منصة تربط المتبرعين بالمحتاجين في لحظات الطوارئ</p>
        <p className="landingQuestion">من أنت؟</p>
        <div className="roleCards">
          {ROLES.map((r, i) => (
            <button key={r.key} className="roleCard"
              style={{ "--card-color": r.color, "--card-bg": r.bg, "--card-border": r.border, animationDelay: `${i * 0.1}s` }}
              onClick={() => onSelect(r.key)}>
              <span className="roleIcon">{r.icon}</span>
              <div className="roleText">
                <strong className="roleTitle">{r.title}</strong>
                <p className="roleDesc">{r.desc}</p>
              </div>
              <span className="roleArrow">←</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────
// LOGIN
// ─────────────────────────────
const ROLE_LABELS = { donor: "متبرع", patient: "قريب المريض", hospital: "مستشفى" };

function LoginPage({ role, onSwitch, onLogin, onBack }) {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error);
      onLogin(data.token, data.user);
    } catch { setError("خطأ في الاتصال بالخادم"); }
    finally { setLoading(false); }
  };

  return (
    <div className="authPage" dir="rtl">
      <div className="authCard">
        <button className="backBtn" onClick={onBack}>→ رجوع</button>
        <div className="authLogo"><div className="miniDrop" /><h1>وصل</h1></div>
        <span className="authRoleBadge">{ROLE_LABELS[role]}</span>
        <p className="authSub">سجّل دخولك للمتابعة</p>
        {error && <div className="errorMsg">{error}</div>}
        <input className="authInput" type="email" placeholder="البريد الإلكتروني"
          value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <input className="authInput" type="password" placeholder="كلمة المرور"
          value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        <button className="authBtn" onClick={handleSubmit} disabled={loading}>
          {loading ? "جاري التحميل..." : "تسجيل الدخول"}
        </button>
        <p className="authSwitch">ما عندك حساب؟ <span onClick={onSwitch}>سجّل الآن</span></p>
        <div className="testCredentials">
          <p>حسابات تجريبية (كلمة المرور: test1234)</p>
          <p>متبرع: donor@test.com</p>
          <p>قريب مريض: patient@test.com</p>
          <p>مستشفى: hosp1@test.com</p>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────
// REGISTER
// ─────────────────────────────
function RegisterPage({ role, onSwitch, onLogin, onBack }) {
  const [form, setForm] = useState({
    name: "", email: "", password: "", phone: "",
    role: role || "donor", blood_type: "+O", city: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/register`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error);
      onLogin(data.token, data.user);
    } catch { setError("خطأ في الاتصال بالخادم"); }
    finally { setLoading(false); }
  };

  return (
    <div className="authPage" dir="rtl">
      <div className="authCard">
        <button className="backBtn" onClick={onBack}>→ رجوع</button>
        <div className="authLogo"><div className="miniDrop" /><h1>وصل</h1></div>
        <span className="authRoleBadge">{ROLE_LABELS[role]}</span>
        <p className="authSub">إنشاء حساب جديد</p>
        {error && <div className="errorMsg">{error}</div>}
        <input className="authInput" placeholder="الاسم الكامل"
          value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
        <input className="authInput" type="email" placeholder="البريد الإلكتروني"
          value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <input className="authInput" type="password" placeholder="كلمة المرور"
          value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
        <input className="authInput" placeholder="رقم الهاتف"
          value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
        <input className="authInput" placeholder="المدينة"
          value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
        {role === "donor" && (
          <select className="authInput" value={form.blood_type}
            onChange={e => setForm({ ...form, blood_type: e.target.value })}>
            {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        )}
        <button className="authBtn" onClick={handleSubmit} disabled={loading}>
          {loading ? "جاري التسجيل..." : "إنشاء الحساب"}
        </button>
        <p className="authSwitch">عندك حساب؟ <span onClick={onSwitch}>سجّل دخولك</span></p>
      </div>
    </div>
  );
}

// ─────────────────────────────
// HOME ROUTER
// ─────────────────────────────
function HomePage({ user, token, onLogout, setUser }) {
  const role = user?.role;
  if (role === "hospital") return <HospitalHome user={user} token={token} onLogout={onLogout} />;
  if (role === "patient")  return <PatientHome  user={user} token={token} onLogout={onLogout} />;
  return                          <DonorHome    user={user} token={token} onLogout={onLogout} setUser={setUser} />;
}

// ─────────────────────────────
// DONOR HOME
// ─────────────────────────────
function DonorHome({ user, token, onLogout, setUser }) {
  const [tab, setTab] = useState("cases"); // cases | profile
  const [selectedBlood, setSelectedBlood] = useState(null);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ active_requests: 0, donations: 0, points: user?.points || 0 });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [alerts, setAlerts] = useState([]);
  const [donatingReq, setDonatingReq] = useState(null); // for appointment modal
  const [profile, setProfile] = useState(null);

  const auth = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const url = selectedBlood ? `${API}/requests?blood_type=${selectedBlood}` : `${API}/requests`;
      const res = await fetch(url, { headers: auth });
      setRequests(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/dashboard`, { headers: auth });
      setStats(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch(`${API}/emergency_alerts`, { headers: auth });
      setAlerts(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${API}/profile`, { headers: auth });
      const data = await res.json();
      setProfile(data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchRequests(); }, [selectedBlood]);
  useEffect(() => { fetchStats(); fetchAlerts(); fetchProfile(); }, []);

  const handleDonate = async (reqId, appointmentTime) => {
    try {
      const res = await fetch(`${API}/requests/${reqId}/donate`, {
        method: "POST", headers: auth,
        body: JSON.stringify({ appointment_time: appointmentTime }),
      });
      const data = await res.json();
      setSuccessMsg(data.message || data.error);
      setTimeout(() => setSuccessMsg(""), 4000);
      setDonatingReq(null);
      fetchRequests(); fetchStats(); fetchProfile();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="site" dir="rtl">
      {successMsg && <div className="successBanner">{successMsg}</div>}

      {/* تنبيهات الطوارئ */}
      {alerts.map(alert => (
        <div key={alert.id} className="emergencyAlert">
          <span className="alertIcon">🚨</span>
          <p>
            <strong>طارئ!</strong> مطلوب دم {alert.blood_type} في {alert.hospital_name}
            — {alert.bags_needed - alert.bags_received} كيس متبقي
          </p>
          <button onClick={() => setAlerts(a => a.filter(x => x.id !== alert.id))}>✕</button>
        </div>
      ))}

      <Nav user={user} onLogout={onLogout} label="🩸 متبرع" />

      {/* Hero */}
      <div className="donorHero">
        <div className="donorHeroInfo">
          <h1>أهلاً، {user?.name?.split(" ")[0]} 👋</h1>
          <p>فصيلة دمك: <strong>{user?.blood_type}</strong></p>
        </div>
        <div className="donorHeroStats">
          <StatCard value={stats.points}     label="نقطة"      icon="⭐" color="#ff2d55" />
          <StatCard value={stats.donations}  label="تبرع"       icon="🩸" color="#a0001c" />
          <StatCard value={stats.active_requests} label="حالة نشطة" icon="📋" color="#e05a00" />
        </div>
      </div>

      {/* Tabs */}
      <div className="tabBar">
        <button className={tab === "cases"   ? "tabBtn active" : "tabBtn"} onClick={() => setTab("cases")}>
          🏥 الحالات المتاحة
        </button>
        <button className={tab === "profile" ? "tabBtn active" : "tabBtn"} onClick={() => { setTab("profile"); fetchProfile(); }}>
          👤 ملفي الشخصي
        </button>
      </div>

      <main className="main">
        {tab === "profile" && profile && (
          <div className="profileCard">
            <div className="profileAvatar">{profile.name?.charAt(0)}</div>
            <h2 className="profileName">{profile.name}</h2>
            <p className="profileCity">📍 {profile.city}</p>
            <div className="profileGrid">
              <div className="profileItem">
                <div className="profileItemIcon" style={{ background: "#fff0f3", color: "#a0001c" }}>🩸</div>
                <span className="profileItemLabel">فصيلة الدم</span>
                <strong className="profileItemValue">{profile.blood_type}</strong>
              </div>
              <div className="profileItem">
                <div className="profileItemIcon" style={{ background: "#fff9e6", color: "#c08000" }}>⭐</div>
                <span className="profileItemLabel">النقاط</span>
                <strong className="profileItemValue">{profile.points}</strong>
              </div>
              <div className="profileItem">
                <div className="profileItemIcon" style={{ background: "#e6f9f0", color: "#1a7a4a" }}>✅</div>
                <span className="profileItemLabel">تبرعاتي</span>
                <strong className="profileItemValue">{profile.donation_count}</strong>
              </div>
              <div className="profileItem">
                <div className="profileItemIcon" style={{ background: "#e6f0ff", color: "#003f7b" }}>📱</div>
                <span className="profileItemLabel">الهاتف</span>
                <strong className="profileItemValue">{profile.phone || "—"}</strong>
              </div>
            </div>
            <div className="pointsBar">
              <div className="pointsBarFill" style={{ width: `${Math.min((profile.points / 500) * 100, 100)}%` }} />
            </div>
            <p className="pointsHint">{profile.points} / 500 نقطة لمستوى المتبرع الذهبي</p>
          </div>
        )}

        {tab === "cases" && (
          <section className="panel">
            <div className="panelHead">
              <h2>الحالات المتاحة</h2>
              <span>{requests.length} حالة</span>
            </div>
            <div className="chips">
              <button className={!selectedBlood ? "active" : ""} onClick={() => setSelectedBlood(null)}>الكل</button>
              {BLOOD_TYPES.map(b => (
                <button key={b} className={selectedBlood === b ? "active" : ""}
                  onClick={() => setSelectedBlood(b === selectedBlood ? null : b)}>{b}</button>
              ))}
            </div>
            {loading ? <p className="centerMsg">جاري التحميل...</p>
              : requests.length === 0 ? <p className="centerMsg">لا توجد حالات متاحة</p>
              : (
                <div className="requestsList">
                  {requests.map(req => (
                    <DonorRequestCard key={req.id} req={req} onDonate={() => setDonatingReq(req)} />
                  ))}
                </div>
              )}
          </section>
        )}
      </main>

      {donatingReq && (
        <AppointmentModal
          req={donatingReq}
          onConfirm={(time) => handleDonate(donatingReq.id, time)}
          onClose={() => setDonatingReq(null)}
        />
      )}
    </div>
  );
}

// ─────────────────────────────
// PATIENT HOME
// ─────────────────────────────
function PatientHome({ user, token, onLogout }) {
  const [requests, setRequests] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ patient_name: "", hospital_id: "", blood_type: "+O", bags_needed: 1 });
  const [successMsg, setSuccessMsg] = useState("");
  const [stats, setStats] = useState({ total_requests: 0, pending_requests: 0, active_requests: 0 });

  const auth = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const fetchAll = async () => {
    try {
      const [rRes, hRes, sRes] = await Promise.all([
        fetch(`${API}/requests`, { headers: auth }),
        fetch(`${API}/hospitals`),
        fetch(`${API}/dashboard`, { headers: auth }),
      ]);
      const hosps = await hRes.json();
      setRequests(await rRes.json());
      setHospitals(hosps);
      setStats(await sRes.json());
      if (hosps.length > 0 && !form.hospital_id) {
        setForm(f => ({ ...f, hospital_id: hosps[0].id }));
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleCreate = async () => {
    if (!form.patient_name || !form.hospital_id) return;
    try {
      const res = await fetch(`${API}/requests`, {
        method: "POST", headers: auth, body: JSON.stringify(form),
      });
      const data = await res.json();
      setSuccessMsg(data.message);
      setTimeout(() => setSuccessMsg(""), 4000);
      setShowForm(false);
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const statusInfo = (s) => {
    if (s === "بانتظار الموافقة") return { label: "⏳ بانتظار الموافقة", cls: "statusPending" };
    if (s === "نشط")              return { label: "✅ نشط — يظهر للمتبرعين", cls: "statusActive" };
    if (s === "مكتمل")            return { label: "🏁 مكتمل", cls: "statusDone" };
    return { label: s, cls: "" };
  };

  return (
    <div className="site" dir="rtl">
      {successMsg && <div className="successBanner">{successMsg}</div>}
      <Nav user={user} onLogout={onLogout} label="👨‍👩‍👧 عائلة مريض" />

      <div className="patientHero">
        <div>
          <h1>طلبات الدم 💉</h1>
          <p>أنشئ طلباً وسنوصلك بمتبرع في أسرع وقت</p>
        </div>
        <div className="donorHeroStats">
          <StatCard value={stats.total_requests}   label="طلباتي"    icon="📋" color="white" />
          <StatCard value={stats.pending_requests} label="بانتظار"   icon="⏳" color="white" />
          <StatCard value={stats.active_requests}  label="نشط"        icon="✅" color="white" />
        </div>
      </div>

      <main className="main">
        <section className="panel">
          <div className="panelHead">
            <h2>طلباتي</h2>
            <button className="newRequestBtn" onClick={() => setShowForm(!showForm)}>
              {showForm ? "✕ إلغاء" : "+ طلب جديد"}
            </button>
          </div>

          {showForm && (
            <div className="requestForm">
              <label className="formLabel">اسم المريض</label>
              <input className="authInput" placeholder="اسم المريض"
                value={form.patient_name} onChange={e => setForm({ ...form, patient_name: e.target.value })} />

              <label className="formLabel">المستشفى</label>
              <select className="authInput" value={form.hospital_id}
                onChange={e => setForm({ ...form, hospital_id: +e.target.value })}>
                {hospitals.map(h => <option key={h.id} value={h.id}>{h.name} — {h.city}</option>)}
              </select>

              <label className="formLabel">فصيلة الدم المطلوبة</label>
              <select className="authInput" value={form.blood_type}
                onChange={e => setForm({ ...form, blood_type: e.target.value })}>
                {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>

              <label className="formLabel">عدد الأكياس</label>
              <input className="authInput" type="number" min="1" max="20"
                value={form.bags_needed} onChange={e => setForm({ ...form, bags_needed: +e.target.value })} />

              <button className="authBtn" onClick={handleCreate}>إرسال الطلب للمستشفى 🏥</button>
              <p className="formHint">سيتم مراجعة الطلب من المستشفى قبل ظهوره للمتبرعين</p>
            </div>
          )}

          {requests.length === 0
            ? <p className="centerMsg">لا توجد طلبات بعد — اضغط "+ طلب جديد"</p>
            : (
              <div className="requestsList">
                {requests.map(req => {
                  const si = statusInfo(req.status);
                  return (
                    <div key={req.id} className={`requestCard ${req.urgency === "عاجل" ? "urgent" : ""}`}>
                      <div className="cardRight">
                        <span className="bloodBadge">{req.blood_type}</span>
                        <div>
                          <b>{req.patient_name}</b>
                          <p>{req.hospital_name} — {req.city}</p>
                          <span className={`statusBadge ${si.cls}`}>{si.label}</span>
                        </div>
                      </div>
                      <div className="cardLeft">
                        <div className="progressBar">
                          <div className="progressFill"
                            style={{ width: `${Math.round((req.bags_received / req.bags_needed) * 100)}%` }} />
                        </div>
                        <small>{req.bags_received}/{req.bags_needed} أكياس</small>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </section>
      </main>
    </div>
  );
}

// ─────────────────────────────
// HOSPITAL HOME
// ─────────────────────────────
function HospitalHome({ user, token, onLogout }) {
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ active_requests: 0, pending_requests: 0, completed_requests: 0, donations: 0 });
  const [successMsg, setSuccessMsg] = useState("");
  const [tab, setTab] = useState("pending"); // pending | active | done

  const auth = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const fetchAll = async () => {
    try {
      const [rRes, sRes] = await Promise.all([
        fetch(`${API}/requests`, { headers: auth }),
        fetch(`${API}/dashboard`, { headers: auth }),
      ]);
      setRequests(await rRes.json());
      setStats(await sRes.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchAll(); }, []);

  const action = async (id, endpoint, body = {}) => {
    try {
      const res = await fetch(`${API}/requests/${id}/${endpoint}`, {
        method: "POST", headers: auth, body: JSON.stringify(body),
      });
      const data = await res.json();
      setSuccessMsg(data.message || "تم ✅");
      setTimeout(() => setSuccessMsg(""), 3000);
      fetchAll();
    } catch (e) { console.error(e); }
  };

  const pending   = requests.filter(r => r.status === "بانتظار الموافقة");
  const active    = requests.filter(r => r.status === "نشط");
  const completed = requests.filter(r => r.status === "مكتمل" || r.status === "ملغي");

  const currentList = tab === "pending" ? pending : tab === "active" ? active : completed;

  return (
    <div className="site" dir="rtl">
      {successMsg && <div className="successBanner">{successMsg}</div>}
      <Nav user={user} onLogout={onLogout} label="🏥 مستشفى" />

      <div className="hospitalHero">
        <div>
          <h1>لوحة التحكم 🏥</h1>
          <p>{user?.name}</p>
        </div>
        <div className="donorHeroStats">
          <StatCard value={stats.pending_requests}   label="بانتظار"  icon="⏳" color="white" />
          <StatCard value={stats.active_requests}    label="نشطة"     icon="🟢" color="white" />
          <StatCard value={stats.completed_requests} label="مكتملة"   icon="✅" color="white" />
          <StatCard value={stats.donations}          label="تبرع"      icon="🩸" color="white" />
        </div>
      </div>

      <div className="tabBar">
        <button className={tab === "pending" ? "tabBtn active" : "tabBtn"} onClick={() => setTab("pending")}>
          ⏳ بانتظار الموافقة {pending.length > 0 && <span className="tabBadge">{pending.length}</span>}
        </button>
        <button className={tab === "active" ? "tabBtn active" : "tabBtn"} onClick={() => setTab("active")}>
          🟢 نشطة {active.length > 0 && <span className="tabBadge">{active.length}</span>}
        </button>
        <button className={tab === "done" ? "tabBtn active" : "tabBtn"} onClick={() => setTab("done")}>
          🏁 مكتملة
        </button>
      </div>

      <main className="main">
        <section className="panel">
          <div className="panelHead">
            <h2>
              {tab === "pending" ? "طلبات بانتظار الموافقة" : tab === "active" ? "الطلبات النشطة" : "الطلبات المكتملة"}
            </h2>
            <span>{currentList.length} طلب</span>
          </div>

          {currentList.length === 0
            ? <p className="centerMsg">لا توجد طلبات هنا</p>
            : (
              <div className="requestsList">
                {currentList.map(req => (
                  <div key={req.id} className={`requestCard ${req.urgency === "عاجل" ? "urgent" : ""}`}>
                    <div className="cardRight">
                      <span className="bloodBadge">{req.blood_type}</span>
                      <div>
                        <b>{req.patient_name}</b>
                        <p>{req.city}</p>
                        {req.urgency === "عاجل" && <span className="urgentTag">🚨 عاجل</span>}
                      </div>
                    </div>
                    <div className="cardLeft">
                      <div className="progressBar">
                        <div className="progressFill"
                          style={{ width: `${Math.round((req.bags_received / req.bags_needed) * 100)}%` }} />
                      </div>
                      <small>{req.bags_received}/{req.bags_needed} أكياس</small>

                      {tab === "pending" && (
                        <div className="actionRow">
                          <button className="actionBtn green"
                            onClick={() => action(req.id, "approve")}>قبول ✅</button>
                          <button className="actionBtn orange"
                            onClick={() => action(req.id, "approve").then(() => action(req.id, "mark_urgent", { urgency: "عاجل" }))}>
                            قبول كطارئ 🚨
                          </button>
                        </div>
                      )}

                      {tab === "active" && (
                        <div className="actionRow">
                          <button className={`actionBtn ${req.urgency === "عاجل" ? "red" : "orange"}`}
                            onClick={() => action(req.id, "mark_urgent", { urgency: req.urgency === "عاجل" ? "عادي" : "عاجل" })}>
                            {req.urgency === "عاجل" ? "إزالة الطارئ" : "🚨 طارئ"}
                          </button>
                          <button className="actionBtn green"
                            onClick={() => action(req.id, "complete")}>إغلاق</button>
                        </div>
                      )}

                      {tab === "done" && (
                        <button className="actionBtn blue"
                          onClick={() => action(req.id, "reopen")}>إعادة فتح</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
        </section>
      </main>
    </div>
  );
}

// ─────────────────────────────
// APPOINTMENT MODAL
// ─────────────────────────────
function AppointmentModal({ req, onConfirm, onClose }) {
  const [time, setTime] = useState("");

  const minDate = new Date();
  minDate.setHours(minDate.getHours() + 1);
  const minStr = minDate.toISOString().slice(0, 16);

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} dir="rtl">
        <button className="modalClose" onClick={onClose}>✕</button>
        <div className="modalHeader">
          <span className="modalBlood">{req.blood_type}</span>
          <div>
            <h3>{req.hospital_name}</h3>
            <p>{req.city}</p>
          </div>
        </div>
        {req.urgency === "عاجل" && <div className="modalUrgent">🚨 حالة طارئة — يُرجى الحضور في أقرب وقت</div>}
        <div className="modalProgress">
          <div className="progressBar" style={{ height: 10 }}>
            <div className="progressFill"
              style={{ width: `${Math.round((req.bags_received / req.bags_needed) * 100)}%` }} />
          </div>
          <p>{req.bags_received} من {req.bags_needed} أكياس اكتملت</p>
        </div>
        <label className="formLabel">اختر موعد حضورك للمستشفى</label>
        <input className="authInput" type="datetime-local" min={minStr}
          value={time} onChange={e => setTime(e.target.value)} />
        <button className="authBtn" onClick={() => onConfirm(time)} disabled={!time}>
          تأكيد التبرع 🩸
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────
// DONOR REQUEST CARD (clickable)
// ─────────────────────────────
function DonorRequestCard({ req, onDonate }) {
  const progress = Math.round((req.bags_received / req.bags_needed) * 100);
  return (
    <div className={`requestCard clickable ${req.urgency === "عاجل" ? "urgent" : ""}`} onClick={onDonate}>
      <div className="cardRight">
        <span className="bloodBadge">{req.blood_type}</span>
        <div>
          <b>{req.hospital_name}</b>
          <p>{req.city} • {req.patient_name}</p>
          {req.urgency === "عاجل" && <span className="urgentTag">🚨 عاجل</span>}
        </div>
      </div>
      <div className="cardLeft">
        <div className="progressBar">
          <div className="progressFill" style={{ width: `${progress}%` }} />
        </div>
        <small>{req.bags_received}/{req.bags_needed} أكياس</small>
        <button className="volunteerBtn" onClick={e => { e.stopPropagation(); onDonate(); }}>
          تطوع 🩸
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────
// SHARED COMPONENTS
// ─────────────────────────────
function Nav({ user, onLogout, label }) {
  return (
    <nav className="topNav">
      <div className="navBrand">
        <div className="miniDrop" />
        <strong>وصل</strong>
      </div>
      <div className="navUser">
        <span className="navRoleTag">{label}</span>
        <span className="navName">👤 {user?.name}</span>
        <button className="logoutBtn" onClick={onLogout}>خروج</button>
      </div>
    </nav>
  );
}

function StatCard({ value, label, icon, color }) {
  return (
    <div className="statCard">
      <span className="statIcon">{icon}</span>
      <b style={{ color: color === "white" ? "white" : color }}>{value}</b>
      <span>{label}</span>
    </div>
  );
}

export default App;
