import { useEffect, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:5000/api";

// ─────────────────────────────
// APP ROOT
// ─────────────────────────────
function App() {
  const [token, setToken] = useState(localStorage.getItem("wasl_token"));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem("wasl_user") || "null"));
  const [screen, setScreen] = useState("landing"); // landing | login | register | home
  const [selectedRole, setSelectedRole] = useState(null);

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setScreen("login");
  };

  const handleLogin = (tok, userData) => {
    localStorage.setItem("wasl_token", tok);
    localStorage.setItem("wasl_user", JSON.stringify(userData));
    setToken(tok);
    setUser(userData);
    setScreen("home");
  };

  const handleLogout = () => {
    localStorage.removeItem("wasl_token");
    localStorage.removeItem("wasl_user");
    setToken(null);
    setUser(null);
    setScreen("landing");
    setSelectedRole(null);
  };

  if (token && user && screen === "home") {
    return <HomePage user={user} token={token} onLogout={handleLogout} />;
  }

  if (screen === "landing") {
    return <LandingPage onSelect={handleRoleSelect} />;
  }

  if (screen === "register") {
    return (
      <RegisterPage
        role={selectedRole}
        onSwitch={() => setScreen("login")}
        onLogin={handleLogin}
        onBack={() => setScreen("landing")}
      />
    );
  }

  return (
    <LoginPage
      role={selectedRole}
      onSwitch={() => setScreen("register")}
      onLogin={handleLogin}
      onBack={() => setScreen("landing")}
    />
  );
}

// ─────────────────────────────
// LANDING PAGE
// ─────────────────────────────
const ROLES = [
  {
    key: "donor",
    icon: "🩸",
    title: "متبرع",
    desc: "ساعد في إنقاذ حياة بالتبرع بدمك للحالات المحتاجة قريباً منك",
    color: "#a0001c",
    bg: "#fff0f3",
    border: "#ffb3c1",
  },
  {
    key: "patient",
    icon: "👨‍👩‍👧",
    title: "قريب المريض",
    desc: "أنشئ طلب دم لذويك واحصل على متبرعين في أسرع وقت",
    color: "#7b0014",
    bg: "#fff5f0",
    border: "#ffd4b3",
  },
  {
    key: "hospital",
    icon: "🏥",
    title: "مستشفى",
    desc: "أدر طلبات الدم وتابع التبرعات لمرضاك من لوحة تحكم متكاملة",
    color: "#003f7b",
    bg: "#f0f5ff",
    border: "#b3ccff",
  },
];

function LandingPage({ onSelect }) {
  return (
    <div className="landingPage" dir="rtl">
      {/* خلفية ديكورية */}
      <div className="landingBg">
        <div className="bgCircle c1"></div>
        <div className="bgCircle c2"></div>
        <div className="bgCircle c3"></div>
      </div>

      <div className="landingContent">
        {/* شعار */}
        <div className="landingLogo">
          <div className="logoDrop"></div>
          <span>وصل</span>
        </div>

        {/* عنوان */}
        <h1 className="landingTitle">
          كل قطرة دم <br />
          <span>تفرق</span>
        </h1>
        <p className="landingSubtitle">
          منصة تربط المتبرعين بالمحتاجين في لحظات الطوارئ
        </p>

        {/* البطاقات */}
        <p className="landingQuestion">من أنت؟</p>
        <div className="roleCards">
          {ROLES.map((r, i) => (
            <button
              key={r.key}
              className="roleCard"
              style={{
                "--card-color": r.color,
                "--card-bg": r.bg,
                "--card-border": r.border,
                animationDelay: `${i * 0.1}s`,
              }}
              onClick={() => onSelect(r.key)}
            >
              <span className="roleIcon">{r.icon}</span>
              <strong className="roleTitle">{r.title}</strong>
              <p className="roleDesc">{r.desc}</p>
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
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error);
      onLogin(data.token, data.user);
    } catch {
      setError("خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authPage" dir="rtl">
      <div className="authCard">
        <button className="backBtn" onClick={onBack}>→ رجوع</button>
        <div className="authLogo">
          <div className="miniDrop"></div>
          <h1>وصل</h1>
        </div>
        <p className="authRole">{ROLE_LABELS[role]}</p>
        <p className="authSub">سجّل دخولك للمتابعة</p>

        {error && <div className="errorMsg">{error}</div>}

        <input className="authInput" type="email" placeholder="البريد الإلكتروني"
          value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
        <input className="authInput" type="password" placeholder="كلمة المرور"
          value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />

        <button className="authBtn" onClick={handleSubmit} disabled={loading}>
          {loading ? "جاري التحميل..." : "تسجيل الدخول"}
        </button>
        <p className="authSwitch">
          ما عندك حساب؟ <span onClick={onSwitch}>سجّل الآن</span>
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────
// REGISTER
// ─────────────────────────────
function RegisterPage({ role, onSwitch, onLogin, onBack }) {
  const [form, setForm] = useState({
    name: "", email: "", password: "",
    phone: "", role: role || "donor", blood_type: "+O", city: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true); setError("");
    try {
      const res = await fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error);
      onLogin(data.token, { id: data.user_id, ...form });
    } catch {
      setError("خطأ في الاتصال بالخادم");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="authPage" dir="rtl">
      <div className="authCard">
        <button className="backBtn" onClick={onBack}>→ رجوع</button>
        <div className="authLogo">
          <div className="miniDrop"></div>
          <h1>وصل</h1>
        </div>
        <p className="authRole">{ROLE_LABELS[role]}</p>
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
            {["+O","-O","+A","-A","+B","-B","+AB","-AB"].map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        )}

        <button className="authBtn" onClick={handleSubmit} disabled={loading}>
          {loading ? "جاري التسجيل..." : "إنشاء الحساب"}
        </button>
        <p className="authSwitch">
          عندك حساب؟ <span onClick={onSwitch}>سجّل دخولك</span>
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────
// HOME — يتغير حسب الدور
// ─────────────────────────────
function HomePage({ user, token, onLogout }) {
  const role = user?.role;
  if (role === "hospital") return <HospitalHome user={user} token={token} onLogout={onLogout} />;
  if (role === "patient")  return <PatientHome  user={user} token={token} onLogout={onLogout} />;
  return                          <DonorHome    user={user} token={token} onLogout={onLogout} />;
}

// ─────────────────────────────
// DONOR HOME
// ─────────────────────────────
function DonorHome({ user, token, onLogout }) {
  const [showAlert, setShowAlert] = useState(true);
  const [selectedBlood, setSelectedBlood] = useState(null);
  const [requests, setRequests] = useState([]);
  const [stats, setStats] = useState({ active_requests: 0, donations: 0, points: 0 });
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const url = selectedBlood
        ? `${API}/requests?blood_type=${selectedBlood}`
        : `${API}/requests`;
      const res = await fetch(url);
      setRequests(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch(`${API}/dashboard`, { headers: authHeaders });
      setStats(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchRequests(); }, [selectedBlood]);
  useEffect(() => { fetchStats(); }, []);

  const handleDonate = async (reqId) => {
    try {
      const res = await fetch(`${API}/requests/${reqId}/donate`, {
        method: "POST", headers: authHeaders,
      });
      const data = await res.json();
      setSuccessMsg(data.message || data.error);
      setTimeout(() => setSuccessMsg(""), 3000);
      fetchRequests(); fetchStats();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="site" dir="rtl">
      {successMsg && <div className="successBanner">{successMsg}</div>}
      {showAlert && (
        <div className="emergencyAlert">
          <span>🔔</span>
          <p>حالة طارئة: مطلوب دم +O في مستشفى الملك فهد الآن</p>
          <button onClick={() => setShowAlert(false)}>إغلاق</button>
        </div>
      )}
      <Nav user={user} onLogout={onLogout} label="🩸 متبرع" />
      <main className="main">
        <section className="hero" style={{ background: "linear-gradient(135deg, #ff2d55, #a0001c)" }}>
          <div>
            <h1>أنقذ حياة اليوم 💗</h1>
            <p>فصيلة دمك مطلوبة في حالات قريبة منك</p>
          </div>
          <div className="heroStats">
            <Stat value={stats.donations} label="تبرعاتك" />
            <Stat value={stats.points} label="نقطة" />
            <Stat value={stats.active_requests} label="حالات نشطة" />
          </div>
        </section>

        <section className="panel">
          <div className="panelHead">
            <h2>الحالات المتاحة</h2>
            <span>{requests.length} حالة</span>
          </div>
          <div className="chips">
            <button className={!selectedBlood ? "active" : ""} onClick={() => setSelectedBlood(null)}>الكل</button>
            {["+O","-O","+A","-A","+B","-B","+AB","-AB"].map(b => (
              <button key={b} className={selectedBlood === b ? "active" : ""}
                onClick={() => setSelectedBlood(b === selectedBlood ? null : b)}>{b}</button>
            ))}
          </div>
          {loading ? <p className="centerMsg">جاري التحميل...</p>
            : requests.length === 0 ? <p className="centerMsg">لا توجد حالات متاحة</p>
            : (
              <div className="requestsList">
                {requests.map(req => (
                  <RequestCard key={req.id} req={req}
                    onDonate={() => handleDonate(req.id)} showDonate />
                ))}
              </div>
            )}
        </section>
      </main>
    </div>
  );
}

// ─────────────────────────────
// PATIENT HOME
// ─────────────────────────────
function PatientHome({ user, token, onLogout }) {
  const [requests, setRequests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    patient_name: "", hospital_id: 1, blood_type: "+O", bags_needed: 1, urgency: "عادي"
  });
  const [successMsg, setSuccessMsg] = useState("");

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchMyRequests = async () => {
    try {
      const res = await fetch(`${API}/requests`, { headers: authHeaders });
      setRequests(await res.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchMyRequests(); }, []);

  const handleCreate = async () => {
    try {
      const res = await fetch(`${API}/requests`, {
        method: "POST", headers: authHeaders,
        body: JSON.stringify(form),
      });
      const data = await res.json();
      setSuccessMsg(data.message);
      setTimeout(() => setSuccessMsg(""), 3000);
      setShowForm(false);
      fetchMyRequests();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="site" dir="rtl">
      {successMsg && <div className="successBanner">{successMsg}</div>}
      <Nav user={user} onLogout={onLogout} label="👨‍👩‍👧 عائلة مريض" />
      <main className="main">
        <section className="hero" style={{ background: "linear-gradient(135deg, #e05a00, #7b2d00)" }}>
          <div>
            <h1>طلبات الدم 🏥</h1>
            <p>أنشئ طلب وسنوصلك بمتبرع قريب منك</p>
          </div>
          <div className="heroStats">
            <Stat value={requests.length} label="طلباتك" />
          </div>
        </section>

        <section className="panel">
          <div className="panelHead">
            <h2>طلباتي</h2>
            <button className="newRequestBtn" onClick={() => setShowForm(!showForm)}>
              {showForm ? "إلغاء" : "+ طلب جديد"}
            </button>
          </div>

          {showForm && (
            <div className="requestForm">
              <input className="authInput" placeholder="اسم المريض"
                value={form.patient_name} onChange={e => setForm({ ...form, patient_name: e.target.value })} />
              <select className="authInput" value={form.blood_type}
                onChange={e => setForm({ ...form, blood_type: e.target.value })}>
                {["+O","-O","+A","-A","+B","-B","+AB","-AB"].map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <input className="authInput" type="number" placeholder="عدد الأكياس" min="1"
                value={form.bags_needed} onChange={e => setForm({ ...form, bags_needed: +e.target.value })} />
              <select className="authInput" value={form.urgency}
                onChange={e => setForm({ ...form, urgency: e.target.value })}>
                <option value="عادي">عادي</option>
                <option value="عاجل">عاجل 🚨</option>
              </select>
              <button className="authBtn" onClick={handleCreate}>إرسال الطلب</button>
            </div>
          )}

          {requests.length === 0
            ? <p className="centerMsg">لا توجد طلبات بعد</p>
            : (
              <div className="requestsList">
                {requests.map(req => <RequestCard key={req.id} req={req} />)}
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
  const [stats, setStats] = useState({ active_requests: 0, completed_requests: 0, donations: 0 });
  const [successMsg, setSuccessMsg] = useState("");

  const authHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const fetchAll = async () => {
    try {
      const [rRes, sRes] = await Promise.all([
        fetch(`${API}/requests`),
        fetch(`${API}/dashboard`, { headers: authHeaders }),
      ]);
      setRequests(await rRes.json());
      setStats(await sRes.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAction = async (id, action) => {
    try {
      await fetch(`${API}/requests/${id}/${action}`, {
        method: "POST", headers: authHeaders,
      });
      setSuccessMsg(action === "complete" ? "تم إغلاق الحالة ✅" : "تم إعادة فتح الحالة ✅");
      setTimeout(() => setSuccessMsg(""), 3000);
      fetchAll();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="site" dir="rtl">
      {successMsg && <div className="successBanner">{successMsg}</div>}
      <Nav user={user} onLogout={onLogout} label="🏥 مستشفى" />
      <main className="main">
        <section className="hero" style={{ background: "linear-gradient(135deg, #0055a0, #003f7b)" }}>
          <div>
            <h1>لوحة التحكم 🏥</h1>
            <p>إدارة طلبات الدم والتبرعات</p>
          </div>
          <div className="heroStats">
            <Stat value={stats.active_requests} label="نشطة" />
            <Stat value={stats.completed_requests} label="مكتملة" />
            <Stat value={stats.donations} label="تبرع" />
          </div>
        </section>

        <section className="panel">
          <div className="panelHead">
            <h2>جميع الطلبات</h2>
            <span>{requests.length} طلب</span>
          </div>
          {requests.length === 0
            ? <p className="centerMsg">لا توجد طلبات</p>
            : (
              <div className="requestsList">
                {requests.map(req => (
                  <div key={req.id} className={`requestCard ${req.urgency === "عاجل" ? "urgent" : ""}`}>
                    <div className="cardRight">
                      <span className="bloodBadge">{req.blood_type}</span>
                      <div>
                        <b>{req.hospital_name}</b>
                        <p>{req.patient_name} • {req.city}</p>
                        {req.urgency === "عاجل" && <span className="urgentTag">🚨 عاجل</span>}
                      </div>
                    </div>
                    <div className="cardLeft">
                      <div className="progressBar">
                        <div className="progressFill"
                          style={{ width: `${Math.round((req.bags_received / req.bags_needed) * 100)}%` }} />
                      </div>
                      <small>{req.bags_received}/{req.bags_needed} أكياس</small>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="actionBtn green"
                          onClick={() => handleAction(req.id, "complete")}>إغلاق</button>
                        <button className="actionBtn blue"
                          onClick={() => handleAction(req.id, "reopen")}>إعادة فتح</button>
                      </div>
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
// SHARED COMPONENTS
// ─────────────────────────────
function Nav({ user, onLogout, label }) {
  return (
    <nav className="topNav">
      <div className="navBrand">
        <div className="miniDrop"></div>
        <strong>وصل</strong>
      </div>
      <div className="navUser">
        <span className="navRoleTag">{label}</span>
        <span>👤 {user?.name}</span>
        <button className="logoutBtn" onClick={onLogout}>خروج</button>
      </div>
    </nav>
  );
}

function RequestCard({ req, onDonate, showDonate }) {
  const progress = Math.round((req.bags_received / req.bags_needed) * 100);
  return (
    <div className={`requestCard ${req.urgency === "عاجل" ? "urgent" : ""}`}>
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
        {showDonate && (
          <button className="volunteerBtn" onClick={onDonate}>تطوع 🩸</button>
        )}
      </div>
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div className="stat">
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

export default App;