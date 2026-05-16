import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  Routes,
  Route,
  Navigate,
  useNavigate,
  useParams,
  useLocation,
  NavLink,
} from 'react-router-dom';
import {
  Droplet,
  Users,
  Building2,
  HandHeart,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  MapPin,
  CheckCircle2,
  Plus,
  Home,
  ClipboardList,
  User,
  LogOut,
  Filter,
  Bell,
  Check,
  X,
} from 'lucide-react';
import './App.css';

const API = 'http://127.0.0.1:5000/api';

const REGIONS = [
  'الرياض',
  'جدة',
  'مكة المكرمة',
  'المدينة المنورة',
  'الدمام',
  'الخبر',
  'تبوك',
  'أبها',
  'بريدة',
  'حائل',
  'نجران',
  'جازان',
  'الباحة',
];

const SIGNUP_BLOOD_TYPES = ['+O', '-O', '+A', '-A', '+B', '-B', '+AB', '-AB'];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FILTER_BLOOD_TYPES = ['الكل', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const FILTER_LOAD_MS = 450;

const AuthContext = createContext(null);

function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth outside AuthContext');
  return ctx;
}

function minLoad(ms = FILTER_LOAD_MS) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function SiteFooter({ className = 'footer' }) {
  return (
    <footer className={className}>
      © {new Date().getFullYear()} وصل — جميع الحقوق محفوظة
    </footer>
  );
}

function uiBloodToApi(type) {
  if (!type || type === 'الكل') return null;
  const sign = type.includes('+') ? '+' : '-';
  const letter = type.replace('+', '').replace('-', '');
  return `${sign}${letter}`;
}

function apiBloodToUi(type) {
  if (!type) return '';
  if (type.startsWith('+')) return `${type.slice(1)}+`;
  if (type.startsWith('-')) return `${type.slice(1)}-`;
  return type;
}

function WaslLogo({ variant = 'light', center = false, withHayat = false }) {
  const classes = ['waslLogo', `waslLogo--${variant}`, center && 'waslLogo--center'].filter(Boolean).join(' ');
  return (
    <div className={classes}>
      <div className="waslLogoIcon">
        <Droplet size={20} strokeWidth={2.5} />
      </div>
      <span className="waslLogoText">
        {withHayat ? (
          <>
            وصل <em className="waslLogoHayat">حياة</em>
          </>
        ) : (
          'وصل'
        )}
      </span>
    </div>
  );
}

function AuthPanel({ initialRole, authMode, setAuthMode, onSuccess }) {
  const navigate = useNavigate();
  const isLogin = authMode === 'login';
  const [form, setForm] = useState(() => ({
    name: '',
    email: '',
    password: '',
    role: initialRole || 'donor',
    blood_type: '+O',
    city: '',
    region: '',
  }));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const getRoleName = (r) => {
    switch (r) {
      case 'patient':
        return 'قريب المريض';
      case 'hospital':
        return 'مستشفى';
      case 'donor':
        return 'متبرع';
      default:
        return '';
    }
  };

  const submit = async () => {
    setLoading(true);
    setError('');

    if (!form.email?.trim()) {
      setError('البريد الإلكتروني مطلوب');
      setLoading(false);
      return;
    }
    if (!EMAIL_REGEX.test(form.email.trim())) {
      setError('يرجى إدخال بريد إلكتروني صحيح (مثال: name@gmail.com)');
      setLoading(false);
      return;
    }
    if (!form.password) {
      setError('كلمة المرور مطلوبة');
      setLoading(false);
      return;
    }

    if (!isLogin) {
      if (!form.name?.trim()) {
        setError('الاسم الكامل مطلوب');
        setLoading(false);
        return;
      }
      if (!form.city) {
        setError('يرجى اختيار المدينة');
        setLoading(false);
        return;
      }
      if (form.role === 'donor' && !form.blood_type) {
        setError('يرجى اختيار فصيلة الدم');
        setLoading(false);
        return;
      }
    }

    const payload = isLogin
      ? { email: form.email.trim(), password: form.password }
      : {
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          role: form.role,
          blood_type: form.role === 'donor' ? form.blood_type : null,
          city: form.city,
          region: form.region || form.city,
        };

    try {
      const res = await fetch(`${API}/${isLogin ? 'login' : 'register'}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        setError('الخادم لا يستجيب بشكل صحيح. تأكد أن back-end يعمل على المنفذ 5000');
        return;
      }

      if (!res.ok) {
        setError(data.error || 'حدث خطأ');
        return;
      }
      if (data.account_status === 'pending' || !data.token) {
        setError(data.message || 'تم التسجيل — الحساب بانتظار الموافقة');
        return;
      }
      onSuccess(data.token, data.user);
    } catch {
      setError('تعذر الاتصال بالخادم. شغّل back-end: python app.py');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="backBtn"
        onClick={() => {
          if (isLogin) navigate('/');
          else navigate(`/login/${initialRole || 'donor'}`);
        }}
      >
        <ChevronRight /> {isLogin ? 'عودة للصفحة الرئيسية' : 'عودة لتسجيل الدخول'}
      </button>

      <WaslLogo variant="brand" />
      <h3>
        {isLogin ? `تسجيل الدخول - ${getRoleName(initialRole)}` : 'إنشاء حساب جديد'}
      </h3>

      {error && <div className="errBox">{error}</div>}

      {!isLogin && (
        <input
          className="inp"
          placeholder="الاسم الكامل"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
        />
      )}

      <input
        className="inp"
        type="email"
        placeholder="البريد الإلكتروني *"
        value={form.email}
        onChange={(e) => set('email', e.target.value)}
        dir="ltr"
      />

      <input
        className="inp"
        type="password"
        placeholder="كلمة المرور *"
        value={form.password}
        onChange={(e) => set('password', e.target.value)}
      />

      {!isLogin && (
        <>
          <select className="inp" value={form.role} onChange={(e) => set('role', e.target.value)}>
            <option value="donor">متبرع</option>
            <option value="patient">قريب المريض</option>
            <option value="hospital">مستشفى</option>
          </select>

          <select
            className="inp"
            value={form.city}
            onChange={(e) => {
              set('city', e.target.value);
              set('region', e.target.value);
            }}
          >
            <option value="">— اختر المدينة —</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {form.role === 'donor' && (
            <select
              className="inp"
              value={form.blood_type}
              onChange={(e) => set('blood_type', e.target.value)}
            >
              {SIGNUP_BLOOD_TYPES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          )}
        </>
      )}

      <button type="button" className="authBtn" onClick={submit} disabled={loading}>
        {loading ? 'جاري المعالجة...' : isLogin ? 'دخول' : 'إنشاء الحساب'}
      </button>

      <p className="switchTxt">
        {isLogin ? 'ليس لديك حساب؟' : 'لديك حساب؟'}{' '}
        <button
          type="button"
          className="switchLink"
          onClick={() => {
            setError('');
            const r = initialRole || 'donor';
            navigate(isLogin ? `/signup/${r}` : `/login/${r}`);
          }}
        >
          {isLogin ? 'سجل الآن' : 'تسجيل الدخول'}
        </button>
      </p>
    </>
  );
}

function LandingPage() {
  const navigate = useNavigate();
  const [landingStats, setLandingStats] = useState({ donors: 0, donations: 0, hospitals: 0 });

  useEffect(() => {
    fetch(`${API}/stats`)
      .then((r) => r.json())
      .then(setLandingStats)
      .catch(() => {});
  }, []);

  return (
    <div className="landing">
      <div className="landingBg" />
      <div className="landingBox">
        <WaslLogo variant="light" center withHayat />
        <h2 className="landingHeadline">
          كل قطرة دم <em>تفرق</em>
        </h2>
        <p className="landingSub">منصة تربط المتبرعين بالمحتاجين في الأوقات الطارئة</p>

        <div className="landingStats">
          <div className="landingStat">
            <b>{landingStats.donors}</b>
            <span>متبرع</span>
          </div>
          <div className="landingStat">
            <b>{landingStats.donations}</b>
            <span>عملية تبرع</span>
          </div>
          <div className="landingStat">
            <b>{landingStats.hospitals}</b>
            <span>مستشفى</span>
          </div>
        </div>

        <p className="whoAreYou">من أنت؟</p>
        <div className="roleCards">
          <button type="button" className="roleCard" onClick={() => navigate('/login/donor')}>
            <Droplet className="rIcon" />
            <div>
              <strong>متبرع</strong>
              <p>ساعد في إنقاذ حياة بالتبرع بدمك</p>
            </div>
            <ChevronLeft className="rArrow" />
          </button>

          <button type="button" className="roleCard" onClick={() => navigate('/login/patient')}>
            <Users className="rIcon" />
            <div>
              <strong>قريب المريض</strong>
              <p>أنشئ طلب دم لذويك واحصل على متبرع سريع</p>
            </div>
            <ChevronLeft className="rArrow" />
          </button>

          <button type="button" className="roleCard roleCardHospital" onClick={() => navigate('/login/hospital')}>
            <Building2 className="rIcon" />
            <div>
              <strong>مستشفى</strong>
              <p>أدر طلبات الدم وتابع الحالات بسهولة</p>
            </div>
            <ChevronLeft className="rArrow rArrowHospital" />
          </button>
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}

function AuthPage({ mode }) {
  const { role: roleParam } = useParams();
  const navigate = useNavigate();
  const { login } = useAuth();
  const role = roleParam || 'donor';
  const [authMode, setAuthMode] = useState(mode === 'signup' ? 'signup' : 'login');

  useEffect(() => {
    setAuthMode(mode === 'signup' ? 'signup' : 'login');
  }, [mode]);

  return (
    <div className="authPage">
      <div className="authCard">
        <AuthPanel
          key={`${role}-${authMode}`}
          initialRole={role}
          authMode={authMode}
          setAuthMode={setAuthMode}
          onSuccess={(tok, u) => {
            login(tok, u);
            navigate('/app/home', { replace: true });
          }}
        />
      </div>
      <SiteFooter className="footer authFooter" />
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem('wasl_token'));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('wasl_user') || 'null');
    } catch {
      return null;
    }
  });

  const login = useCallback((newToken, newUser) => {
    localStorage.setItem('wasl_token', newToken);
    localStorage.setItem('wasl_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('wasl_token');
    localStorage.removeItem('wasl_user');
    setToken(null);
    setUser(null);
  }, []);

  const authValue = { token, user, login, logout };

  return (
    <AuthContext.Provider value={authValue}>
      <Routes>
        <Route path="/" element={token ? <Navigate to="/app/home" replace /> : <LandingPage />} />
        <Route path="/login/:role" element={<AuthPage mode="login" />} />
        <Route path="/signup/:role" element={<AuthPage mode="signup" />} />
        <Route path="/app/*" element={token ? <DashboardApp /> : <Navigate to="/" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}

function DashboardApp() {
  const navigate = useNavigate();
  const location = useLocation();
  const { token, user, logout } = useAuth();
  const role = user?.role ?? null;
  const activeTab = location.pathname.includes('/records')
    ? 'records'
    : location.pathname.includes('/account')
      ? 'account'
      : 'home';
  const [selectedFilter, setSelectedFilter] = useState('الكل');
  const [isFiltering, setIsFiltering] = useState(false);
  const [cases, setCases] = useState([]);
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [donateTarget, setDonateTarget] = useState(null);
  const [booking, setBooking] = useState({ date: '', time: '' });
  const [donateError, setDonateError] = useState('');
  const [donateLoading, setDonateLoading] = useState(false);
  const [hospitalRequests, setHospitalRequests] = useState([]);
  const [actionMsg, setActionMsg] = useState('');
  const [hospitals, setHospitals] = useState([]);
  const [requestForm, setRequestForm] = useState({
    patient_name: '',
    hospital_id: '',
    blood_type: '+O',
    bags_needed: 1,
    urgency: 'عادي',
  });
  const [requestError, setRequestError] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [pendingHospitals, setPendingHospitals] = useState([]);

  const loadHomeCases = async (filterValue) => {
    if (!token) return;
    setIsFiltering(true);
    setCases([]);
    try {
      if (role === 'donor') {
        let url = `${API}/requests?`;
        const apiFilter = uiBloodToApi(filterValue);
        if (apiFilter) url += `blood_type=${encodeURIComponent(apiFilter)}&`;
        if (user?.city) url += `city=${encodeURIComponent(user.city)}&`;
        const [res] = await Promise.all([fetch(url), minLoad()]);
        const data = await res.json();
        setCases(Array.isArray(data) ? data.map(mapRequestToCase) : []);
      } else if (role === 'patient') {
        const [res] = await Promise.all([
          fetch(`${API}/my/requests`, { headers: { Authorization: `Bearer ${token}` } }),
          minLoad(),
        ]);
        const data = await res.json();
        let list = Array.isArray(data) ? data.map(mapRequestToCase) : [];
        if (filterValue !== 'الكل') list = list.filter((c) => c.type === filterValue);
        setCases(list);
      } else if (role === 'hospital') {
        const [res] = await Promise.all([
          fetch(`${API}/hospital/requests`, { headers: { Authorization: `Bearer ${token}` } }),
          minLoad(),
        ]);
        const data = await res.json();
        let list = Array.isArray(data) ? data.map(mapRequestToCase) : [];
        if (filterValue !== 'الكل') list = list.filter((c) => c.type === filterValue);
        setHospitalRequests(list);
        setCases(list);
      }
    } catch {
      setCases([]);
      if (role === 'hospital') setHospitalRequests([]);
    } finally {
      setIsFiltering(false);
    }
  };

  const handleFilterChange = (filter) => {
    if (filter === selectedFilter) return;
    setSelectedFilter(filter);
    if (activeTab === 'home') loadHomeCases(filter);
  };

  const handleLogout = () => {
    logout();
    setProfile(null);
    setHistory([]);
    setCases([]);
    navigate('/', { replace: true });
  };

  const mapRequestToCase = (r) => ({
    id: r.id,
    type: apiBloodToUi(r.blood_type),
    hospital: r.hospital_name,
    city: r.city,
    patientName: r.patient_name || null,
    bags: `${r.bags_received ?? 0}/${r.bags_needed ?? 0}`,
    urgent: r.urgency === 'عاجل',
    status: r.status === 'مكتمل' ? 'done' : 'active',
    rawStatus: r.status,
  });

  const getCaseCardLines = (c) => {
    if (role === 'patient') {
      return {
        title: c.hospital,
        meta: c.patientName ? `${c.patientName} • ${c.city}` : c.city,
      };
    }
    if (role === 'hospital') {
      return {
        title: c.patientName || c.hospital,
        meta: c.city,
      };
    }
    return {
      title: c.hospital,
      meta: c.city,
      sub: 'حالة محتاجة',
    };
  };

  const fetchPatientCases = () => loadHomeCases(selectedFilter);
  const fetchCases = () => loadHomeCases(selectedFilter);
  const fetchHospitalRequests = () => loadHomeCases(selectedFilter);

  const submitDonate = async () => {
    if (!donateTarget) return;
    setDonateError('');
    setDonateLoading(true);
    try {
      const res = await fetch(`${API}/requests/${donateTarget.id}/donate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ date: booking.date, time: booking.time }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDonateError(data.error || 'تعذر حجز الموعد');
        return;
      }
      setDonateTarget(null);
      setBooking({ date: '', time: '' });
      fetchCases();
      if (activeTab === 'records') fetchDonorHistory();
    } catch {
      setDonateError('تعذر الاتصال بالخادم');
    } finally {
      setDonateLoading(false);
    }
  };

  const hospitalConfirm = async (requestId, urgency) => {
    const bags = window.prompt('كم عدد الأكياس المطلوبة؟', '1');
    if (bags === null) return;
    try {
      const res = await fetch(`${API}/requests/${requestId}/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ urgency, bags_needed: Number(bags) || 1 }),
      });
      const data = await res.json();
      setActionMsg(data.message || 'تم تأكيد الحالة');
      loadHomeCases(selectedFilter);
      fetchNotifications();
    } catch {
      setActionMsg('تعذر تنفيذ العملية');
    }
  };

  const hospitalComplete = async (requestId) => {
    try {
      const res = await fetch(`${API}/requests/${requestId}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setActionMsg(data.message || 'تم');
      loadHomeCases(selectedFilter);
      fetchNotifications();
    } catch {
      setActionMsg('تعذر تنفيذ العملية');
    }
  };

  const fetchPendingHospitals = async () => {
    if (!token || role !== 'hospital') return;
    try {
      const res = await fetch(`${API}/users/pending`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setPendingHospitals(Array.isArray(data) ? data : []);
    } catch {
      setPendingHospitals([]);
    }
  };

  const reviewHospital = async (userId, action) => {
    try {
      const res = await fetch(`${API}/users/${userId}/${action}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setActionMsg(data.message || 'تم');
      fetchPendingHospitals();
      fetchNotifications();
    } catch {
      setActionMsg('تعذر تنفيذ العملية');
    }
  };

  const accountStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return 'بانتظار الموافقة';
      case 'rejected':
        return 'مرفوض';
      default:
        return 'معتمد';
    }
  };

  const fetchDonorHistory = async () => {
    if (!token || role !== 'donor') return;
    try {
      const res = await fetch(`${API}/donations/history`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch {
      setHistory([]);
    }
  };

  const loadHospitals = async () => {
    try {
      let list = [];
      if (user?.city) {
        const cityRes = await fetch(`${API}/hospitals?city=${encodeURIComponent(user.city)}`);
        const cityData = await cityRes.json();
        list = Array.isArray(cityData) ? cityData : [];
      }
      if (list.length === 0) {
        const allRes = await fetch(`${API}/hospitals`);
        const allData = await allRes.json();
        list = Array.isArray(allData) ? allData : [];
      }
      setHospitals(list);
    } catch {
      setHospitals([]);
    }
  };

  const openRequestModal = () => {
    setRequestError('');
    setRequestForm({
      patient_name: '',
      hospital_id: '',
      blood_type: '+O',
      bags_needed: 1,
      urgency: 'عادي',
    });
    setShowRequestModal(true);
    loadHospitals();
  };

  const submitNewRequest = async () => {
    setRequestError('');
    if (!requestForm.patient_name?.trim()) {
      setRequestError('اسم المريض مطلوب');
      return;
    }
    if (!requestForm.hospital_id) {
      setRequestError('يرجى اختيار المستشفى');
      return;
    }
    if (!requestForm.blood_type) {
      setRequestError('يرجى اختيار فصيلة الدم');
      return;
    }

    setRequestLoading(true);
    try {
      const res = await fetch(`${API}/requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          patient_name: requestForm.patient_name.trim(),
          hospital_id: Number(requestForm.hospital_id),
          blood_type: requestForm.blood_type,
          bags_needed: Number(requestForm.bags_needed) || 1,
          urgency: requestForm.urgency,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setRequestError(data.error || 'تعذر إنشاء الطلب');
        return;
      }
      setShowRequestModal(false);
      fetchPatientCases();
    } catch {
      setRequestError('تعذر الاتصال بالخادم');
    } finally {
      setRequestLoading(false);
    }
  };

  useEffect(() => {
    if (location.pathname === '/app' || location.pathname === '/app/') {
      navigate('/app/home', { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    if (role === 'patient' && token) loadHospitals();
  }, [role, token, user?.city]);

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchNotifications();
  }, [token, activeTab]);

  useEffect(() => {
    if (activeTab !== 'home' || !token) return;
    loadHomeCases(selectedFilter);
    if (role === 'donor') fetchDonorHistory();
    if (role === 'hospital') fetchPendingHospitals();
  }, [activeTab, role, token, user?.city]);

  useEffect(() => {
    if (activeTab !== 'account' || !token) return;
    fetch(`${API}/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [activeTab, token]);

  useEffect(() => {
    if (activeTab !== 'records' || !token) return;
    if (role === 'donor') fetchDonorHistory();
    if (role === 'patient') fetchPatientCases();
  }, [activeTab, token, role]);

  const getRoleName = (r) => {
    switch (r) {
      case 'patient':
        return 'قريب المريض';
      case 'hospital':
        return 'مستشفى';
      case 'donor':
        return 'متبرع';
      default:
        return '';
    }
  };

  const filteredCases = cases;
  const patientActiveCount = cases.filter((c) => c.status !== 'done').length;
  const hospitalActiveCount = hospitalRequests.filter((c) => c.status !== 'done').length;
  const hospitalDoneCount = hospitalRequests.filter((c) => c.status === 'done').length;
  const donorPoints = profile?.points ?? user?.points ?? 0;
  const donorDonationCount = history.length;

  const renderSkeleton = () => (
    <div className="cardsGrid">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="skeletonCard">
          <div className="skeletonLine w60" />
          <div className="skeletonLine w30" />
          <div className="skeletonBlock" />
        </div>
      ))}
    </div>
  );


  return (
    <div className="appShell">
      <aside className="sidebar">
        <div className="sidebarTop">
          <WaslLogo variant="brand" />
          <div className="sidebarUser">
            <div className="sidebarUserIcon">
              {role === 'patient' && <Users />}
              {role === 'hospital' && <Building2 />}
              {role === 'donor' && <HandHeart />}
            </div>
            <div>
              <p>مرحباً بك</p>
              <strong>{getRoleName(role)}</strong>
            </div>
          </div>
        </div>

        <nav className="sidebarNav">
          <NavLink to="/app/home" className={({ isActive }) => (isActive ? 'active' : '')}>
            <Home /> الرئيسية
          </NavLink>
          <NavLink to="/app/records" className={({ isActive }) => (isActive ? 'active' : '')}>
            <ClipboardList /> سجلاتي
          </NavLink>
          <NavLink to="/app/account" className={({ isActive }) => (isActive ? 'active' : '')}>
            <User /> حسابي
          </NavLink>
        </nav>

        <div className="sidebarBottom">
          <button type="button" className="sidebarLogout" onClick={handleLogout}>
            <LogOut /> تسجيل الخروج
          </button>
        </div>
      </aside>

      <div className="mainWrap">
        <header className="mobileHeader">
          <WaslLogo variant="brand" />
          <div className="mobileHeaderActions">
            <button
              type="button"
              className="bellBtn"
              aria-label="الإشعارات"
              onClick={() => setShowNotifs((v) => !v)}
            >
              <Bell />
              {notifications.some((n) => !n.is_read) && (
                <span className="bellBadge">{notifications.filter((n) => !n.is_read).length}</span>
              )}
            </button>
            <button type="button" className="iconBtn" onClick={handleLogout} aria-label="تسجيل الخروج">
              <LogOut />
            </button>
          </div>
        </header>
        {showNotifs && (
          <div className="notifDrop">
            <h4>الإشعارات</h4>
            {notifications.length === 0 ? (
              <p className="notifEmpty">لا توجد إشعارات</p>
            ) : (
              <ul className="notifList">
                {notifications.map((n) => (
                  <li key={n.id} className={n.is_read ? '' : 'unread'}>
                    {n.message}
                  </li>
                ))}
              </ul>
            )}
            <button
              type="button"
              className="outlineBtn gray"
              onClick={async () => {
                await fetch(`${API}/notifications/read`, {
                  method: 'POST',
                  headers: { Authorization: `Bearer ${token}` },
                });
                fetchNotifications();
              }}
            >
              تعليم الكل كمقروء
            </button>
          </div>
        )}

        <div className="contentArea">
          {activeTab === 'home' && (
            <div className="tabPanel">
              {role === 'patient' && (
                <div className="hero red">
                  <div>
                    <h2>طلبات التبرع</h2>
                    <p>تابع حالة طلباتك أو أنشئ طلباً جديداً</p>
                  </div>
                  <div className="heroStats">
                    <div className="heroStatBox">
                      <b>{patientActiveCount}</b>
                      <span>نشط</span>
                    </div>
                    <button type="button" className="newRequestBtn" onClick={openRequestModal}>
                      <Plus /> طلب جديد
                    </button>
                  </div>
                </div>
              )}

              {role === 'hospital' && (
                <div className="hero blue">
                  <div>
                    <h2>لوحة المستشفى</h2>
                    <p>متابعة الحالات النشطة وتأكيد التبرعات</p>
                  </div>
                  <div className="heroStats">
                    <div className="heroStatBox">
                      <b>{hospitalActiveCount}</b>
                      <span>حالة نشطة</span>
                    </div>
                    <div className="heroStatBox">
                      <b>{hospitalDoneCount}</b>
                      <span>تبرع مكتمل</span>
                    </div>
                  </div>
                </div>
              )}

              {role === 'donor' && (
                <div className="hero orange">
                  <div>
                    <h2>أنقذ حياة اليوم</h2>
                    <p>فصيلة دمك مطلوبة في حالات قريبة منك</p>
                  </div>
                  <div className="heroStats">
                    <div className="heroStatBox">
                      <b>{donorDonationCount}</b>
                      <span>تبرعاتك</span>
                    </div>
                    <div className="heroStatBox">
                      <b>{donorPoints}</b>
                      <span>نقطة</span>
                    </div>
                  </div>
                </div>
              )}

              {actionMsg && role === 'hospital' && (
                <div className="successBox">{actionMsg}</div>
              )}

              {role === 'hospital' && pendingHospitals.length > 0 && (
                <div className="pendingBox">
                  <h3 className="sectionTitle">مستشفيات بانتظار الاعتماد</h3>
                  <div className="cardsGrid">
                    {pendingHospitals.map((h) => (
                      <article key={h.id} className="caseCard">
                        <div className="caseInfo">
                          <h4>{h.name}</h4>
                          <p className="caseMeta">
                            <MapPin /> {h.city}
                          </p>
                          <p className="caseMeta">{h.email}</p>
                        </div>
                        <div className="hospitalActions">
                          <button type="button" className="outlineBtn" onClick={() => reviewHospital(h.id, 'approve')}>
                            <Check /> اعتماد
                          </button>
                          <button type="button" className="outlineBtn gray" onClick={() => reviewHospital(h.id, 'reject')}>
                            <X /> رفض
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              <div className={`filterHead ${isFiltering ? 'filterHeadLoading' : ''}`}>
                <Filter /> فصائل الدم
                {isFiltering && <span className="filterLoadingLabel">جاري التحميل...</span>}
              </div>
              <div className={`filterScroll ${isFiltering ? 'filterScrollBusy' : ''}`}>
                {FILTER_BLOOD_TYPES.map((bt) => (
                  <button
                    key={bt}
                    type="button"
                    className={`filterChip ${selectedFilter === bt ? 'act' : ''}`}
                    onClick={() => handleFilterChange(bt)}
                    dir="ltr"
                  >
                    {bt}
                  </button>
                ))}
              </div>

              {isFiltering ? (
                renderSkeleton()
              ) : filteredCases.length > 0 ? (
                <div className={`cardsGrid ${isFiltering ? 'loading-pulse' : ''}`}>
                  {filteredCases.map((c) => {
                    const isUrgent = c.urgent && c.status !== 'done';
                    const isDone = c.status === 'done';
                    const cardClass = ['caseCard', isUrgent && 'urgent', isDone && 'done'].filter(Boolean).join(' ');
                    const { title, meta, sub } = getCaseCardLines(c);

                    return (
                      <article key={c.id} className={cardClass}>
                        <div className="caseCardTop">
                          <span className={`badge lg ${isDone ? 'done' : ''}`} dir="ltr">
                            {c.type}
                          </span>
                          <div className="caseInfo">
                            <h4>
                              {title}
                              {isUrgent && (
                                <span className="urgentPill">
                                  <AlertCircle /> حالة عاجلة
                                </span>
                              )}
                            </h4>
                            <p className="caseMeta">
                              <MapPin /> {meta}
                            </p>
                            {sub && <p className="caseMeta caseMetaSub">{sub}</p>}
                          </div>
                          {isDone && <CheckCircle2 className="doneIcon" />}
                        </div>

                        <div className="caseCardFoot">
                          <div>
                            <span className="needLabel">الاحتياج</span>
                            <span className="needValue" dir="ltr">
                              {c.bags}
                            </span>
                          </div>

                          {!isDone && role === 'donor' && (
                            <button
                              type="button"
                              className="donateBtn lg"
                              onClick={() => {
                                setDonateError('');
                                setBooking({ date: '', time: '' });
                                setDonateTarget(c);
                              }}
                            >
                              أريد التبرع
                            </button>
                          )}
                          {!isDone && role === 'hospital' && (
                            <div className="hospitalActions">
                              <button
                                type="button"
                                className="outlineBtn"
                                onClick={() => hospitalConfirm(c.id, 'عادي')}
                              >
                                تأكيد عادي
                              </button>
                              <button
                                type="button"
                                className="donateBtn lg"
                                onClick={() => hospitalConfirm(c.id, 'عاجل')}
                              >
                                تأكيد عاجل
                              </button>
                              <button
                                type="button"
                                className="outlineBtn gray"
                                onClick={() => hospitalComplete(c.id)}
                              >
                                إغلاق الطلب
                              </button>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="emptyState">
                  <Droplet />
                  <h3>{role === 'patient' ? 'لا توجد طلبات' : 'لا توجد حالات حالياً'}</h3>
                  <p>
                    {role === 'patient'
                      ? selectedFilter === 'الكل'
                        ? 'اضغط «طلب جديد» لإنشاء أول طلب تبرع'
                        : `لا توجد طلبات لفصيلة ${selectedFilter}`
                      : `لم يتم العثور على حالات مطابقة لفصيلة ${selectedFilter}`}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'account' && (
            <div className="tabPanel accountWrap">
              <h2 className="pageTitle">حسابي الشخصي</h2>
              <div className="profileCard">
                <div className="profileHeader">
                  <div className="avatar">{(profile?.name || user?.name)?.charAt(0) || '؟'}</div>
                  <div>
                    <h3>{profile?.name || user?.name || '—'}</h3>
                    <span className="rolePill">{getRoleName(role)}</span>
                  </div>
                </div>

                <div className="formGrid">
                  <div className="field">
                    <label>الاسم الكامل / الجهة</label>
                    <input
                      className="inp"
                      type="text"
                      defaultValue={profile?.name || user?.name || ''}
                      readOnly
                    />
                  </div>
                  <div className="field">
                    <label>المدينة</label>
                    <input className="inp" type="text" defaultValue={profile?.city || user?.city || ''} readOnly />
                  </div>
                </div>

                <div className="field">
                  <label>البريد الإلكتروني</label>
                  <input className="inp" type="email" defaultValue={profile?.email || user?.email || ''} readOnly dir="ltr" />
                </div>

                <div className="field">
                  <label>حالة الحساب</label>
                  <input
                    className="inp"
                    type="text"
                    value={accountStatusLabel(profile?.account_status || user?.account_status)}
                    readOnly
                  />
                </div>

                {role === 'donor' && (
                  <div className="bloodTypeBox">
                    <div className="bloodTypeHead">
                      <span>فصيلة الدم الخاصة بك</span>
                      <span className="lockedTag">غير قابل للتعديل</span>
                    </div>
                    <select
                      className="inp disabled"
                      value={profile?.blood_type || user?.blood_type || '+O'}
                      disabled
                      dir="ltr"
                    >
                      {SIGNUP_BLOOD_TYPES.map((bt) => (
                        <option key={bt} value={bt}>
                          {apiBloodToUi(bt)}
                        </option>
                      ))}
                    </select>
                    <p className="bloodNote">
                      <AlertCircle />
                      لضمان دقة البيانات الطبية وسلامة المرضى، لا يمكن تغيير فصيلة الدم بعد التسجيل. إذا كان هناك خطأ،
                      يرجى التواصل مع الدعم الفني.
                    </p>
                  </div>
                )}

                <button type="button" className="saveBtn" disabled>
                  حفظ التعديلات
                </button>
              </div>
            </div>
          )}

          {activeTab === 'records' && (
            <div className="tabPanel">
              <h2 className="pageTitle">سجلاتي</h2>
              {role === 'patient' ? (
                cases.length === 0 ? (
                  <div className="recordsEmpty">
                    <ClipboardList />
                    <h3>لا توجد طلبات مسجّلة</h3>
                    <p>ستظهر هنا جميع طلبات التبرع التي أنشأتها.</p>
                  </div>
                ) : (
                  <div className="cardsGrid">
                    {cases.map((c) => {
                      const { title, meta } = getCaseCardLines(c);
                      return (
                        <article key={c.id} className="caseCard">
                          <div className="caseCardTop">
                            <span className="badge lg" dir="ltr">
                              {c.type}
                            </span>
                            <div className="caseInfo">
                              <h4>{title}</h4>
                              <p className="caseMeta">
                                <MapPin /> {meta}
                              </p>
                            </div>
                          </div>
                          <p className="caseMeta">الاحتياج: {c.bags}</p>
                        </article>
                      );
                    })}
                  </div>
                )
              ) : history.length === 0 ? (
                <div className="recordsEmpty">
                  <ClipboardList />
                  <h3>سجلك نظيف ومشرّف</h3>
                  <p>هنا ستظهر جميع السجلات السابقة الخاصة بك في وصل.</p>
                </div>
              ) : (
                <div className="cardsGrid">
                  {history.map((h) => (
                    <article key={h.id} className="caseCard">
                      <div className="caseCardTop">
                        <span className="badge lg" dir="ltr">
                          {apiBloodToUi(h.blood_type)}
                        </span>
                        <div className="caseInfo">
                          <h4>{h.hospital_name}</h4>
                          <p className="caseMeta">
                            <MapPin /> {h.city}
                          </p>
                        </div>
                      </div>
                      <p className="caseMeta">{h.status}</p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <p className="mobileFooterNote">© {new Date().getFullYear()} تطبيق وصل</p>
        <footer className="appFooter">
          © {new Date().getFullYear()} تطبيق وصل. جميع الحقوق محفوظة.
        </footer>
      </div>

      {donateTarget && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="donate-title"
          onClick={() => !donateLoading && setDonateTarget(null)}
        >
          <div className="modalBox" onClick={(e) => e.stopPropagation()}>
            <h3 id="donate-title">حجز موعد تبرع</h3>
            <p className="modalSub">
              {donateTarget.hospital} — {donateTarget.city}
            </p>
            {donateError && <div className="errBox">{donateError}</div>}
            <input
              className="inp"
              type="date"
              value={booking.date}
              onChange={(e) => setBooking((b) => ({ ...b, date: e.target.value }))}
            />
            <input
              className="inp"
              type="time"
              value={booking.time}
              onChange={(e) => setBooking((b) => ({ ...b, time: e.target.value }))}
            />
            <div className="modalBtns">
              <button
                type="button"
                className="outlineBtn gray"
                onClick={() => setDonateTarget(null)}
                disabled={donateLoading}
              >
                إلغاء
              </button>
              <button type="button" className="authBtn" onClick={submitDonate} disabled={donateLoading}>
                {donateLoading ? 'جاري الحجز...' : 'تأكيد الحجز'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRequestModal && (
        <div
          className="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-request-title"
          onClick={() => !requestLoading && setShowRequestModal(false)}
        >
          <div className="modalBox" onClick={(e) => e.stopPropagation()}>
            <h3 id="new-request-title">طلب تبرع جديد</h3>
            {requestError && <div className="errBox">{requestError}</div>}
            <input
              className="inp"
              placeholder="اسم المريض *"
              value={requestForm.patient_name}
              onChange={(e) => setRequestForm((f) => ({ ...f, patient_name: e.target.value }))}
            />
            <select
              className="inp"
              value={requestForm.hospital_id}
              onChange={(e) => setRequestForm((f) => ({ ...f, hospital_id: e.target.value }))}
            >
              <option value="">
                {hospitals.length === 0 ? 'جاري تحميل المستشفيات...' : 'اختر المستشفى *'}
              </option>
              {hospitals.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.name} — {h.city}
                </option>
              ))}
            </select>
            {hospitals.length === 0 && (
              <p className="modalHint">تأكد أن back-end يعمل. إن استمرت المشكلة، سجّل خروجاً وأعد الدخول بعد اختيار المدينة.</p>
            )}
            <select
              className="inp"
              value={requestForm.blood_type}
              onChange={(e) => setRequestForm((f) => ({ ...f, blood_type: e.target.value }))}
              dir="ltr"
            >
              {SIGNUP_BLOOD_TYPES.map((bt) => (
                <option key={bt} value={bt}>
                  {apiBloodToUi(bt)}
                </option>
              ))}
            </select>
            <select
              className="inp"
              value={requestForm.urgency}
              onChange={(e) => setRequestForm((f) => ({ ...f, urgency: e.target.value }))}
            >
              <option value="عادي">عادي</option>
              <option value="عاجل">عاجل</option>
            </select>
            <input
              className="inp"
              type="number"
              min={1}
              max={10}
              placeholder="عدد الأكياس المطلوبة"
              value={requestForm.bags_needed}
              onChange={(e) => setRequestForm((f) => ({ ...f, bags_needed: e.target.value }))}
            />
            <div className="modalBtns">
              <button
                type="button"
                className="outlineBtn gray"
                onClick={() => setShowRequestModal(false)}
                disabled={requestLoading}
              >
                إلغاء
              </button>
              <button type="button" className="authBtn" onClick={submitNewRequest} disabled={requestLoading}>
                {requestLoading ? 'جاري الإرسال...' : 'إرسال الطلب'}
              </button>
            </div>
          </div>
        </div>
      )}

      <nav className="bottomNav">
        <NavLink to="/app/home" className={({ isActive }) => (isActive ? 'active' : '')}>
          <Home />
          <span>الرئيسية</span>
        </NavLink>
        <NavLink to="/app/records" className={({ isActive }) => (isActive ? 'active' : '')}>
          <ClipboardList />
          <span>سجلاتي</span>
        </NavLink>
        <NavLink to="/app/account" className={({ isActive }) => (isActive ? 'active' : '')}>
          <User />
          <span>حسابي</span>
        </NavLink>
      </nav>
    </div>
  );
}
