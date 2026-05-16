import { useEffect, useState } from 'react';
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

function AuthPanel({ initialRole, authMode, setAuthMode, onBack, onSuccess }) {
  const isLogin = authMode === 'login';
  const [form, setForm] = useState(() => ({
    name: '',
    email: '',
    password: '',
    phone: '',
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
      if (!form.phone?.trim()) {
        setError('رقم الهاتف مطلوب');
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
          phone: form.phone.trim(),
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
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'حدث خطأ');
        return;
      }
      onSuccess(data.token, data.user);
    } catch {
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button type="button" className="backBtn" onClick={onBack}>
        <ChevronRight /> عودة للرئيسية
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
          <input
            className="inp"
            type="tel"
            placeholder="رقم الهاتف *"
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
            dir="ltr"
          />

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
            setAuthMode(isLogin ? 'signup' : 'login');
          }}
        >
          {isLogin ? 'سجل الآن' : 'تسجيل الدخول'}
        </button>
      </p>
    </>
  );
}

export default function App() {
  const [view, setView] = useState('landing');
  const [token, setToken] = useState(() => localStorage.getItem('wasl_token'));
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('wasl_user') || 'null');
    } catch {
      return null;
    }
  });
  const [role, setRole] = useState(user?.role ?? null);
  const [authMode, setAuthMode] = useState('login');
  const [activeTab, setActiveTab] = useState('home');
  const [selectedFilter, setSelectedFilter] = useState('الكل');
  const [isFiltering, setIsFiltering] = useState(false);
  const [cases, setCases] = useState([]);
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [landingStats, setLandingStats] = useState({ donors: 0, donations: 0, hospitals: 0 });

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    setAuthMode('login');
    setView('auth');
  };

  const handleFilterChange = (filter) => {
    if (filter === selectedFilter) return;
    setSelectedFilter(filter);
  };

  const handleAuthSuccess = (newToken, newUser) => {
    localStorage.setItem('wasl_token', newToken);
    localStorage.setItem('wasl_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
    setRole(newUser.role);
    setView('app');
  };

  const handleLogout = () => {
    localStorage.removeItem('wasl_token');
    localStorage.removeItem('wasl_user');
    setToken(null);
    setUser(null);
    setRole(null);
    setProfile(null);
    setHistory([]);
    setCases([]);
    setAuthMode('login');
    setView('landing');
  };

  const mapRequestToCase = (r) => ({
    id: r.id,
    type: apiBloodToUi(r.blood_type),
    hospital: r.hospital_name,
    city: r.city,
    bags: `${r.bags_received ?? 0}/${r.bags_needed ?? 0}`,
    urgent: r.urgency === 'عاجل',
    status: r.status === 'مكتمل' ? 'done' : 'active',
  });

  const fetchCases = async () => {
    if (!token || role !== 'donor') return;
    setIsFiltering(true);
    try {
      let url = `${API}/requests?`;
      const apiFilter = uiBloodToApi(selectedFilter);
      if (apiFilter) url += `blood_type=${encodeURIComponent(apiFilter)}&`;
      if (user?.city) url += `city=${encodeURIComponent(user.city)}&`;
      const res = await fetch(url);
      const data = await res.json();
      setCases(Array.isArray(data) ? data.map(mapRequestToCase) : []);
    } catch {
      setCases([]);
    } finally {
      setIsFiltering(false);
    }
  };

  useEffect(() => {
    if (token && user) {
      setRole(user.role);
      setView('app');
    }
  }, []);

  useEffect(() => {
    if (view !== 'landing') return;
    fetch(`${API}/stats`)
      .then((r) => r.json())
      .then(setLandingStats)
      .catch(() => {});
  }, [view]);

  useEffect(() => {
    if (view === 'app' && activeTab === 'home' && role === 'donor' && token) {
      fetchCases();
    }
  }, [view, activeTab, selectedFilter, role, token, user?.city]);

  useEffect(() => {
    if (view !== 'app' || activeTab !== 'account' || !token) return;
    fetch(`${API}/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setProfile)
      .catch(() => setProfile(null));
  }, [view, activeTab, token]);

  useEffect(() => {
    if (view !== 'app' || activeTab !== 'records' || !token || role !== 'donor') return;
    fetch(`${API}/donations/history`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => (Array.isArray(data) ? setHistory(data) : setHistory([])))
      .catch(() => setHistory([]));
  }, [view, activeTab, token, role]);

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

  if (view === 'landing') {
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
            <button type="button" className="roleCard" onClick={() => handleRoleSelect('donor')}>
              <Droplet className="rIcon" />
              <div>
                <strong>متبرع</strong>
                <p>ساعد في إنقاذ حياة بالتبرع بدمك</p>
              </div>
              <ChevronLeft className="rArrow" />
            </button>

            <button type="button" className="roleCard" onClick={() => handleRoleSelect('patient')}>
              <Users className="rIcon" />
              <div>
                <strong>قريب المريض</strong>
                <p>أنشئ طلب دم لذويك واحصل على متبرع سريع</p>
              </div>
              <ChevronLeft className="rArrow" />
            </button>

            <button type="button" className="roleCard roleCardHospital" onClick={() => handleRoleSelect('hospital')}>
              <Building2 className="rIcon" />
              <div>
                <strong>مستشفى</strong>
                <p>أدر طلبات الدم وتابع الحالات بسهولة</p>
              </div>
              <ChevronLeft className="rArrow rArrowHospital" />
            </button>
          </div>
        </div>

        <div className="footer">
          © {new Date().getFullYear()} وصل — جميع الحقوق محفوظة
        </div>
      </div>
    );
  }

  if (view === 'auth') {
    return (
      <div className="authPage">
        <div className="authCard">
          <AuthPanel
            key={`${role}-${authMode}`}
            initialRole={role}
            authMode={authMode}
            setAuthMode={setAuthMode}
            onBack={() => {
              setAuthMode('login');
              setView('landing');
            }}
            onSuccess={handleAuthSuccess}
          />
        </div>
      </div>
    );
  }

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
          <button
            type="button"
            className={activeTab === 'home' ? 'active' : ''}
            onClick={() => setActiveTab('home')}
          >
            <Home /> الرئيسية
          </button>
          <button
            type="button"
            className={activeTab === 'records' ? 'active' : ''}
            onClick={() => setActiveTab('records')}
          >
            <ClipboardList /> سجلاتي
          </button>
          <button
            type="button"
            className={activeTab === 'account' ? 'active' : ''}
            onClick={() => setActiveTab('account')}
          >
            <User /> حسابي
          </button>
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
          <button type="button" className="iconBtn" onClick={handleLogout} aria-label="تسجيل الخروج">
            <LogOut />
          </button>
        </header>

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
                      <b>١</b>
                      <span>نشط</span>
                    </div>
                    <button type="button" className="newRequestBtn">
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
                      <b>١٢</b>
                      <span>حالة نشطة</span>
                    </div>
                    <div className="heroStatBox">
                      <b>٤٥</b>
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
                      <b>٣</b>
                      <span>تبرعاتك</span>
                    </div>
                    <div className="heroStatBox">
                      <b>١٥٠</b>
                      <span>نقطة</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="filterHead">
                <Filter /> فصائل الدم
              </div>
              <div className="filterScroll">
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
                <div className="cardsGrid">
                  {filteredCases.map((c) => {
                    const isUrgent = c.urgent && c.status !== 'done';
                    const isDone = c.status === 'done';
                    const cardClass = ['caseCard', isUrgent && 'urgent', isDone && 'done'].filter(Boolean).join(' ');

                    return (
                      <article key={c.id} className={cardClass}>
                        <div className="caseCardTop">
                          <span className={`badge lg ${isDone ? 'done' : ''}`} dir="ltr">
                            {c.type}
                          </span>
                          <div className="caseInfo">
                            <h4>
                              {c.hospital}
                              {isUrgent && (
                                <span className="urgentPill">
                                  <AlertCircle /> حالة عاجلة
                                </span>
                              )}
                            </h4>
                            <p className="caseMeta">
                              <MapPin /> {c.city}
                            </p>
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
                            <button type="button" className="donateBtn lg">
                              أريد التبرع
                            </button>
                          )}
                          {!isDone && role === 'hospital' && (
                            <button type="button" className="outlineBtn">
                              تأكيد الإنجاز
                            </button>
                          )}
                          {!isDone && role === 'patient' && (
                            <button type="button" className="outlineBtn gray">
                              تعديل الطلب
                            </button>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <div className="emptyState">
                  <Droplet />
                  <h3>لا توجد حالات حالياً</h3>
                  <p>لم يتم العثور على حالات مطابقة لفصيلة {selectedFilter}</p>
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

                {role === 'donor' && (
                  <div className="bloodTypeBox">
                    <div className="bloodTypeHead">
                      <span>فصيلة الدم الخاصة بك</span>
                      <span className="lockedTag">غير قابل للتعديل</span>
                    </div>
                    <input
                      className="inp disabled"
                      type="text"
                      value={apiBloodToUi(profile?.blood_type || user?.blood_type) || ''}
                      disabled
                      readOnly
                      dir="ltr"
                    />
                    <p className="bloodNote">
                      <AlertCircle />
                      لضمان دقة البيانات الطبية وسلامة المرضى، لا يمكن تغيير فصيلة الدم بعد التسجيل. إذا كان هناك خطأ،
                      يرجى التواصل مع الدعم الفني.
                    </p>
                  </div>
                )}

                <button type="button" className="saveBtn">
                  حفظ التعديلات
                </button>
              </div>
            </div>
          )}

          {activeTab === 'records' && (
            <div className="tabPanel">
              <h2 className="pageTitle">سجلاتي</h2>
              {history.length === 0 ? (
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

        <footer className="appFooter">
          © {new Date().getFullYear()} تطبيق وصل. جميع الحقوق محفوظة.
        </footer>
      </div>

      <nav className="bottomNav">
        <button
          type="button"
          className={activeTab === 'home' ? 'active' : ''}
          onClick={() => setActiveTab('home')}
        >
          <Home />
          <span>الرئيسية</span>
        </button>
        <button
          type="button"
          className={activeTab === 'records' ? 'active' : ''}
          onClick={() => setActiveTab('records')}
        >
          <ClipboardList />
          <span>سجلاتي</span>
        </button>
        <button
          type="button"
          className={activeTab === 'account' ? 'active' : ''}
          onClick={() => setActiveTab('account')}
        >
          <User />
          <span>حسابي</span>
        </button>
      </nav>
    </div>
  );
}
