import { useEffect, useState } from "react";
import "./App.css";

const API = "http://127.0.0.1:5000/api";
const bloodTypes = ["الكل", "+O", "-O", "+A", "-A", "+B", "-B", "+AB", "-AB"];

function App() {
  const [role, setRole] = useState(null);
  const [page, setPage] = useState("home");
  const [requests, setRequests] = useState([]);
  const [dashboard, setDashboard] = useState({});
  const [filter, setFilter] = useState("الكل");
  const [showAlert, setShowAlert] = useState(false);

  const loadData = async () => {
    try {
      const dash = await fetch(`${API}/dashboard`).then((r) => r.json());
      const reqs = await fetch(`${API}/requests?blood_type=${filter}`).then((r) =>
        r.json()
      );

      setDashboard(dash);
      setRequests(reqs);
    } catch (error) {
      console.error("Backend error:", error);
    }
  };

  useEffect(() => {
    if (role) loadData();
  }, [filter, role]);

  const donate = async (id) => {
    await fetch(`${API}/requests/${id}/donate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        donor_name: "أحمد العتيبي",
        donor_blood_type: "+O",
      }),
    });

    loadData();
  };

  const completeRequest = async (id) => {
    await fetch(`${API}/requests/${id}/complete`, {
      method: "POST",
    });

    loadData();
  };

  const reopenRequest = async (id) => {
    await fetch(`${API}/requests/${id}/reopen`, {
      method: "POST",
    });

    loadData();
  };

  if (!role) {
    return <Welcome setRole={setRole} setPage={setPage} />;
  }

  return (
    <div className="site" dir="rtl">
      <nav className="topNav">
        <div className="navBrand" onClick={() => setRole(null)}>
          <div className="miniDrop"></div>
          <strong>وصل</strong>
        </div>

        <div className="navLinks">
          <button
            onClick={() => setPage("home")}
            className={page === "home" ? "active" : ""}
          >
            الرئيسية 🏠
          </button>

          {role === "patient" && (
            <button
              onClick={() => setPage("newRequest")}
              className={page === "newRequest" ? "active" : ""}
            >
              طلب جديد ➕
            </button>
          )}

          <button
            onClick={() => setPage("requests")}
            className={page === "requests" ? "active" : ""}
          >
            الطلبات 📋
          </button>

          <button
            onClick={() => setPage("profile")}
            className={page === "profile" ? "active" : ""}
          >
            حسابي 👤
          </button>
        </div>
      </nav>

      <main className="main">
        {showAlert && (
          <div className="emergencyAlert">
            <span>🔔</span>
            <p>حالة طارئة: مطلوب دم +O في مستشفى الملك فهد الآن</p>
            <button onClick={() => setFilter("+O")}>عرض الحالة</button>
          </div>
        )}

        <header className="topbar">
          <div>
            <h2>
              {role === "donor" && "مرحباً، أحمد 👋"}
              {role === "patient" && "مرحباً، قريب المريض"}
              {role === "hospital" && "مستشفى الملك فهد 🏥"}
            </h2>
            <p>
              {role === "donor" && "تابع الحالات القريبة وتبرع بسهولة"}
              {role === "patient" && "أدخل بيانات المريض وتابع الطلب"}
              {role === "hospital" && "راجع الحالات وأكد اكتمال التبرعات"}
            </p>
          </div>

          <button className="bell" onClick={() => setShowAlert(!showAlert)}>
            🔔
          </button>
        </header>

        {page === "home" && role === "donor" && (
          <DonorHome
            dashboard={dashboard}
            requests={requests}
            filter={filter}
            setFilter={setFilter}
            donate={donate}
          />
        )}

        {page === "home" && role === "patient" && (
          <PatientHome setPage={setPage} requests={requests} />
        )}

        {page === "home" && role === "hospital" && (
          <HospitalHome
            dashboard={dashboard}
            requests={requests}
            completeRequest={completeRequest}
            reopenRequest={reopenRequest}
          />
        )}

        {page === "newRequest" && <NewRequest onDone={loadData} setPage={setPage} />}

        {page === "requests" && (
          <section className="panel">
            <h2>الطلبات الحالية</h2>

            <div className="cardsGrid">
              {requests.map((req) => (
                <RequestCard
                  key={req.id}
                  req={req}
                  donate={role === "donor" ? donate : null}
                  hospital={role === "hospital"}
                  completeRequest={completeRequest}
                  reopenRequest={reopenRequest}
                />
              ))}
            </div>
          </section>
        )}

        {page === "profile" && <Profile role={role} />}
      </main>
    </div>
  );
}

function Welcome({ setRole, setPage }) {
  const choose = (selectedRole) => {
    setRole(selectedRole);
    setPage("home");
  };

  return (
    <div className="welcomePage" dir="rtl">
      <div className="welcomeCard">
        <div className="bigDrop"></div>
        <h1>وصل</h1>
        <p>منصة التبرع بالدم الذكية</p>

        <div className="roleCards">
          <button onClick={() => choose("donor")}>
            <span>💧</span>
            <div>
              <b>متبرع بالدم</b>
              <small>شاهد الحالات وتبرع الآن</small>
            </div>
          </button>

          <button onClick={() => choose("patient")}>
            <span>👤</span>
            <div>
              <b>قريب المريض</b>
              <small>أدخل بيانات المريض واطلب تبرع</small>
            </div>
          </button>

          <button onClick={() => choose("hospital")}>
            <span>🏥</span>
            <div>
              <b>مستشفى</b>
              <small>إدارة الحالات وتأكيد الاكتمال</small>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function DonorHome({ dashboard, requests, filter, setFilter, donate }) {
  return (
    <>
      <section className="hero">
        <div>
          <h1>أنقذ حياة اليوم 💗</h1>
          <p>فصيلة دمك مطلوبة في حالات قريبة منك</p>
        </div>

        <div className="heroStats">
          <Stat value={dashboard.donations || 0} label="تبرعاتك" />
          <Stat value={dashboard.points || 0} label="نقطة" />
          <Stat value={dashboard.active_requests || 0} label="حالات نشطة" />
        </div>
      </section>

      <section className="panel">
        <div className="panelHead">
          <h2>الحالات المتاحة</h2>
          <span>{requests.length} حالة</span>
        </div>

        <div className="chips">
          {bloodTypes.map((type) => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={filter === type ? "active" : ""}
            >
              {type}
            </button>
          ))}
        </div>

        <div className="cardsGrid">
          {requests.map((req) => (
            <RequestCard key={req.id} req={req} donate={donate} />
          ))}
        </div>
      </section>
    </>
  );
}

function PatientHome({ setPage, requests }) {
  return (
    <section className="panel">
      <div className="patientHero">
        <h1>طلب تبرع جديد 📋</h1>
        <p>أدخل بيانات المريض وفصيلة الدم، وسيظهر الطلب للمتبرعين.</p>
        <button onClick={() => setPage("newRequest")}>إنشاء طلب الآن</button>
      </div>

      <h2>طلباتك</h2>

      <div className="cardsGrid">
        {requests.map((req) => (
          <RequestCard key={req.id} req={req} />
        ))}
      </div>
    </section>
  );
}

function HospitalHome({ dashboard, requests, completeRequest, reopenRequest }) {
  return (
    <section className="panel">
      <h2>لوحة تحكم المستشفى 🏥</h2>

      <div className="statsGrid">
        <StatBox value={dashboard.active_requests || 0} label="حالات نشطة" />
        <StatBox value={dashboard.completed_requests || 0} label="حالات مكتملة" />
        <StatBox value="95%" label="نسبة الاكتمال" />
        <StatBox value="+A" label="الأكثر طلباً" />
      </div>

      <div className="cardsGrid">
        {requests.map((req) => (
          <RequestCard
            key={req.id}
            req={req}
            hospital
            completeRequest={completeRequest}
            reopenRequest={reopenRequest}
          />
        ))}
      </div>
    </section>
  );
}

function NewRequest({ onDone, setPage }) {
  const [form, setForm] = useState({
    patient_name: "",
    hospital_id: 1,
    blood_type: "+A",
    bags_needed: 4,
    urgency: "عاجل",
  });

  const submit = async (e) => {
    e.preventDefault();

    await fetch(`${API}/requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(form),
    });

    onDone();
    setPage("home");
  };

  return (
    <section className="panel">
      <h2>بيانات المريض</h2>

      <form className="form bigForm" onSubmit={submit}>
        <input
          placeholder="اسم المريض"
          value={form.patient_name}
          onChange={(e) => setForm({ ...form, patient_name: e.target.value })}
          required
        />

        <select
          value={form.blood_type}
          onChange={(e) => setForm({ ...form, blood_type: e.target.value })}
        >
          {bloodTypes
            .filter((type) => type !== "الكل")
            .map((type) => (
              <option key={type}>{type}</option>
            ))}
        </select>

        <select
          value={form.hospital_id}
          onChange={(e) => setForm({ ...form, hospital_id: Number(e.target.value) })}
        >
          <option value={1}>مستشفى الملك فهد</option>
          <option value={2}>مستشفى سلمان</option>
          <option value={3}>مستشفى الرياض</option>
        </select>

        <input
          type="number"
          min="1"
          value={form.bags_needed}
          onChange={(e) =>
            setForm({ ...form, bags_needed: Number(e.target.value) })
          }
        />

        <select
          value={form.urgency}
          onChange={(e) => setForm({ ...form, urgency: e.target.value })}
        >
          <option value="عاجل">عاجل</option>
          <option value="عادي">عادي</option>
        </select>

        <button>إرسال الطلب</button>
      </form>
    </section>
  );
}

function RequestCard({ req, donate, hospital, completeRequest, reopenRequest }) {
  const percent = Math.min((req.bags_received / req.bags_needed) * 100, 100);

  return (
    <div className="requestCard">
      <div className="bloodBadge">{req.blood_type}</div>

      <span className={req.status === "مكتمل" ? "status done" : "status"}>
        {req.status === "مكتمل"
          ? "✓ مكتمل"
          : req.urgency === "عاجل"
          ? "🚨 عاجل"
          : "نشط"}
      </span>

      <h3>{req.hospital_name}</h3>

      <p>
        📍 {req.city} — المريض: {req.patient_name}
      </p>

      <div className="progressInfo">
        <b>
          {req.bags_received} / {req.bags_needed} أكياس
        </b>
        <small>الأكياس المتبرع بها</small>
      </div>

      <div className="progress">
        <div style={{ width: `${percent}%` }} />
      </div>

      <div className={hospital ? "actions threeActions" : "actions"}>
        <button className="light">التفاصيل</button>

        {hospital ? (
          <>
            <button onClick={() => completeRequest(req.id)} className="green">
              اكتملت ✓
            </button>
            <button onClick={() => reopenRequest(req.id)} className="dark">
              لم تكتمل
            </button>
          </>
        ) : donate ? (
          <button onClick={() => donate(req.id)} className="red">
            💧 تبرع الآن
          </button>
        ) : (
          <button className="red">متابعة الطلب</button>
        )}
      </div>
    </div>
  );
}

function Profile({ role }) {
  return (
    <section className="panel profile">
      <div className="profileHero">
        <div className="avatar">
          {role === "hospital" ? "🏥" : role === "patient" ? "👤" : "💧"}
        </div>

        <h1>
          {role === "hospital"
            ? "مستشفى الملك فهد"
            : role === "patient"
            ? "قريب المريض"
            : "أحمد العتيبي"}
        </h1>

        <p>{role === "donor" ? "فصيلة الدم: +O" : "حساب مستخدم في منصة وصل"}</p>

        <button>⭐ 240 نقطة</button>
      </div>
    </section>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <b>{value}</b>
      <span>{label}</span>
    </div>
  );
}

function StatBox({ value, label }) {
  return (
    <div className="statBox">
      <b>{value}</b>
      <p>{label}</p>
    </div>
  );
}

export default App;