const express = require("express");
const app = express();

app.use(express.urlencoded({ extended: true }));

let students = [];

// نظام تسجيل الدخول مع التجميد
let loginAttempts = 0;
let isFrozen = false;
let freezeUntil = null;

// الرقم السري للعمليات (2026)
const SECRET_CODE = "2026";

function calculateAge(birthdate) {
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

// دالة للحصول على التاريخ والوقت الحالي
function getCurrentDateTime() {
  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  return now.toLocaleDateString('ar-SA', options);
}

// دالة للحصول على الوقت المتبقي من التجميد
function getRemainingFreezeTime() {
  if (!isFrozen || !freezeUntil) return 0;
  const remaining = Math.max(0, Math.ceil((freezeUntil - Date.now()) / 1000 / 60));
  return remaining;
}

// دالة مساعدة لتوليد الستايل المشترك (CSS) مع ألوان وحركات إضافية
const getStyles = () => `
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;700;900&display=swap');
  @import url('https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css');
  
  * { 
    box-sizing: border-box; 
    font-family: 'Cairo', sans-serif;
    margin: 0;
    padding: 0;
  }
  
  body {
    background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
    background-size: 400% 400%;
    animation: gradientBG 15s ease infinite;
    min-height: 100vh;
    margin: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    flex-direction: column;
    padding: 20px;
    position: relative;
    overflow-x: hidden;
  }

  @keyframes gradientBG {
    0% { background-position: 0% 50%; }
    50% { background-position: 100% 50%; }
    100% { background-position: 0% 50%; }
  }

  body::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 50%, rgba(255,255,255,0.1) 0%, transparent 50%);
    pointer-events: none;
    animation: pulse 4s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.5; }
    50% { opacity: 1; }
  }

  .container {
    background: rgba(255, 255, 255, 0.95);
    padding: 2rem;
    border-radius: 30px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.3), 0 0 0 2px rgba(255,255,255,0.5);
    width: 100%;
    max-width: 1000px;
    animation: slideInUp 0.8s ease-out;
    backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.3);
    position: relative;
    z-index: 1;
    transform-style: preserve-3d;
    transition: all 0.3s ease;
  }

  .container:hover {
    transform: translateY(-5px) rotateX(2deg);
    box-shadow: 0 30px 60px rgba(0,0,0,0.4), 0 0 0 3px rgba(255,255,255,0.6);
  }

  /* شريط التاريخ والوقت */
  .datetime-bar {
    background: linear-gradient(135deg, #2c3e50, #3498db);
    color: white;
    padding: 15px 25px;
    border-radius: 50px;
    margin-bottom: 20px;
    text-align: center;
    font-size: 1.2em;
    font-weight: bold;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2), 0 0 0 2px rgba(255,215,0,0.3);
    animation: glow 2s ease-in-out infinite;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 15px;
    flex-wrap: wrap;
  }

  .datetime-bar i {
    font-size: 1.5em;
    animation: spin 10s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .time-part, .date-part {
    background: rgba(255,255,255,0.1);
    padding: 5px 15px;
    border-radius: 30px;
    backdrop-filter: blur(5px);
    border: 1px solid rgba(255,255,255,0.2);
  }

  /* نافذة الرقم السري */
  .secret-modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.8);
    backdrop-filter: blur(10px);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    animation: fadeIn 0.3s ease;
  }

  .secret-modal.active {
    display: flex;
  }

  .secret-box {
    background: linear-gradient(135deg, #667eea, #764ba2);
    padding: 40px;
    border-radius: 30px;
    box-shadow: 0 30px 60px rgba(0,0,0,0.3), 0 0 0 3px #ffd700;
    max-width: 400px;
    width: 90%;
    animation: slideInDown 0.5s ease;
    position: relative;
    overflow: hidden;
  }

  .secret-box::before {
    content: '🔐';
    position: absolute;
    top: -20px;
    right: -20px;
    font-size: 100px;
    opacity: 0.1;
    transform: rotate(15deg);
  }

  .secret-box h3 {
    color: white;
    text-align: center;
    margin-bottom: 20px;
    font-size: 1.8em;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
  }

  .secret-input {
    width: 100%;
    padding: 15px;
    border: 3px solid rgba(255,255,255,0.3);
    border-radius: 15px;
    background: rgba(255,255,255,0.9);
    font-size: 1.2em;
    text-align: center;
    letter-spacing: 5px;
    margin-bottom: 20px;
    direction: ltr;
  }

  .secret-input:focus {
    border-color: #ffd700;
    box-shadow: 0 0 20px rgba(255,215,0,0.5);
    transform: scale(1.02);
  }

  .secret-buttons {
    display: flex;
    gap: 10px;
  }

  .secret-btn {
    flex: 1;
    padding: 12px;
    border: none;
    border-radius: 10px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 1.1em;
  }

  .secret-btn.confirm {
    background: linear-gradient(45deg, #2ed573, #7bed9f);
    color: white;
  }

  .secret-btn.cancel {
    background: linear-gradient(45deg, #ff4757, #ff6b81);
    color: white;
  }

  .secret-btn:hover {
    transform: translateY(-3px);
    box-shadow: 0 10px 20px rgba(0,0,0,0.2);
  }

  /* شريط التجميد */
  .freeze-bar {
    background: linear-gradient(135deg, #ff4757, #ff6b81);
    color: white;
    padding: 15px;
    border-radius: 15px;
    margin-bottom: 20px;
    text-align: center;
    font-weight: bold;
    animation: shake 0.5s ease-in-out infinite;
    border: 2px solid #fff;
    box-shadow: 0 0 30px rgba(255,71,87,0.5);
  }

  .freeze-timer {
    font-size: 2em;
    margin-top: 10px;
    background: rgba(0,0,0,0.2);
    padding: 10px;
    border-radius: 10px;
    display: inline-block;
  }

  /* مؤشر المحاولات */
  .attempts-indicator {
    display: flex;
    gap: 10px;
    justify-content: center;
    margin: 15px 0;
  }

  .attempt-dot {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #ddd;
    transition: all 0.3s ease;
  }

  .attempt-dot.active {
    background: #ffd700;
    box-shadow: 0 0 20px #ffd700;
    animation: pulse 1s ease infinite;
  }

  .attempt-dot.used {
    background: #ff4757;
  }

  h2 {
    text-align: center;
    color: #2c3e50;
    margin-bottom: 25px;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.1);
    font-size: 2.2em;
    font-weight: 900;
    background: linear-gradient(45deg, #3498db, #9b59b6, #e74c3c);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: shimmer 3s ease-in-out infinite;
    position: relative;
    display: inline-block;
    width: 100%;
  }

  h2::after {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 100px;
    height: 4px;
    background: linear-gradient(90deg, transparent, #3498db, #9b59b6, #e74c3c, transparent);
    border-radius: 2px;
    animation: lineWidth 3s ease-in-out infinite;
  }

  form {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 20px;
    margin-bottom: 30px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 25px;
    border-radius: 20px;
    border: 1px solid rgba(255,255,255,0.3);
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    position: relative;
    overflow: hidden;
  }

  form::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 70%);
    animation: rotate 10s linear infinite;
  }

  .secret-protected {
    position: relative;
  }

  .secret-protected::after {
    content: '🔐';
    position: absolute;
    top: 5px;
    right: 5px;
    font-size: 16px;
    opacity: 0.7;
  }

  input, select {
    padding: 15px 20px;
    border: 2px solid rgba(255,255,255,0.3);
    border-radius: 15px;
    outline: none;
    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    font-size: 15px;
    background: rgba(255,255,255,0.9);
    backdrop-filter: blur(5px);
    color: #2c3e50;
    font-weight: 600;
    position: relative;
    z-index: 1;
  }

  input:focus, select:focus {
    border-color: #ffd700;
    box-shadow: 0 0 20px rgba(255,215,0,0.3), 0 0 0 3px rgba(255,255,255,0.5);
    transform: scale(1.02) translateY(-2px);
    background: white;
  }

  button {
    padding: 15px 25px;
    background: linear-gradient(45deg, #ff6b6b, #ff8e53, #ffd700);
    background-size: 200% 200%;
    color: white;
    border: none;
    border-radius: 15px;
    cursor: pointer;
    font-weight: bold;
    font-size: 1.1em;
    transition: all 0.3s ease;
    grid-column: 1 / -1;
    position: relative;
    overflow: hidden;
    animation: gradientMove 3s ease infinite;
    text-shadow: 1px 1px 2px rgba(0,0,0,0.2);
    letter-spacing: 1px;
  }

  button.delete-btn {
    background: linear-gradient(45deg, #ff4757, #ff6b81);
  }

  button.edit-btn {
    background: linear-gradient(45deg, #2ed573, #7bed9f);
  }

  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 10px;
    margin-top: 25px;
    perspective: 1000px;
  }

  th, td {
    padding: 18px;
    text-align: center;
    position: relative;
    transition: all 0.3s ease;
  }

  th {
    background: linear-gradient(135deg, #2c3e50, #3498db);
    color: white;
    text-transform: uppercase;
    font-size: 0.95rem;
    letter-spacing: 2px;
    font-weight: 700;
    border: none;
    position: relative;
    overflow: hidden;
  }

  th:first-child { border-radius: 15px 0 0 15px; }
  th:last-child { border-radius: 0 15px 15px 0; }

  td {
    background: white;
    border-radius: 15px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.1);
    font-weight: 500;
  }

  .action-links {
    display: flex;
    gap: 8px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .action-btn {
    text-decoration: none;
    padding: 8px 16px;
    border-radius: 12px;
    font-size: 0.9rem;
    transition: all 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55);
    display: inline-block;
    margin: 2px;
    font-weight: 600;
    letter-spacing: 0.5px;
    cursor: pointer;
    border: none;
    color: white;
  }

  .btn-delete { 
    background: linear-gradient(45deg, #ff4757, #ff6b81);
  }
  
  .btn-edit { 
    background: linear-gradient(45deg, #2ed573, #7bed9f);
  }

  .login-box { 
    max-width: 450px;
  }

  .login-box form { 
    display: flex; 
    flex-direction: column; 
    gap: 20px;
  }

  .error-box {
    text-align: center;
    border: 3px solid #ff4757;
    background: linear-gradient(135deg, #fff5f5, #ffe8e8);
    animation: shake 0.5s ease-in-out;
  }

  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
    20%, 40%, 60%, 80% { transform: translateX(5px); }
  }

  .badge {
    display: inline-block;
    padding: 5px 10px;
    border-radius: 20px;
    background: linear-gradient(45deg, #f39c12, #f1c40f);
    color: white;
    font-size: 0.8em;
    font-weight: bold;
  }
</style>
`;
/* ===== LOGIN with Freeze System ===== */
app.get("/", (req, res) => {
  // التحقق من حالة التجميد
  if (isFrozen && freezeUntil && Date.now() >= freezeUntil) {
    isFrozen = false;
    freezeUntil = null;
    loginAttempts = 0;
  }

  const remainingMinutes = getRemainingFreezeTime();
  
  if (isFrozen && remainingMinutes > 0) {
    return res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>الموقع مجمد</title>
      ${getStyles()}
    </head>
    <body>
      <div class="container error-box animate__animated animate__shakeX">
        <div class="freeze-bar">
          <span style="font-size: 3em;">❄️</span>
          <h1 style="color: white; margin: 15px 0;">الموقع مجمد مؤقتاً</h1>
          <div class="freeze-timer" id="timer">${remainingMinutes}:00</div>
          <p style="margin-top: 15px;">تم تجاوز عدد المحاولات المسموحة</p>
        </div>
      </div>
      
      <script>
        let minutes = ${remainingMinutes};
        let seconds = 0;
        
        function updateTimer() {
          if (seconds === 0) {
            if (minutes === 0) {
              location.reload();
              return;
            }
            minutes--;
            seconds = 59;
          } else {
            seconds--;
          }
          
          document.getElementById('timer').textContent = 
            \`\${minutes}:\${seconds.toString().padStart(2, '0')}\`;
        }
        
        setInterval(updateTimer, 1000);
      </script>
    </body>
    </html>
    `);
  }

  const attemptsLeft = 3 - loginAttempts;
  
  res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>تسجيل الدخول - نظام التلاميذ</title>
${getStyles()}
</head>
<body>
<div class="container login-box animate__animated animate__fadeInDown">
  <div class="datetime-bar">
    <i>⏰</i>
    <span class="time-part" id="currentTime"></span>
    <span class="date-part" id="currentDate"></span>
  </div>
  
  <h2>🔐 تسجيل الدخول للنظام</h2>
  
  <div class="attempts-indicator">
    ${[1,2,3].map(i => `
      <div class="attempt-dot ${i > attemptsLeft ? 'used' : 'active'}" 
           style="animation-delay: ${i * 0.2}s"></div>
    `).join('')}
  </div>
  
  <p style="text-align: center; color: #666; margin-bottom: 10px;">
    المحاولات المتبقية: <strong style="color: ${attemptsLeft > 1 ? '#2ed573' : '#ff4757'}">${attemptsLeft}</strong>
  </p>
  
  <form method="POST" action="/login">
    <input name="username" placeholder="👤 اسم المستخدم (admin)" required>
    <input type="password" name="password" placeholder="🔑 كلمة المرور (0000)" required>
    <button type="submit">🚪 دخول</button>
  </form>
  
  <div style="text-align: center; margin-top: 20px; color: #666;">
    <small>✨ admin / 0000 ✨</small>
  </div>
</div>

<script>
function updateDateTime() {
  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  const timeOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  
  document.getElementById('currentDate').textContent = now.toLocaleDateString('ar-SA', options);
  document.getElementById('currentTime').textContent = now.toLocaleTimeString('ar-SA', timeOptions);
}

updateDateTime();
setInterval(updateDateTime, 1000);

document.addEventListener('contextmenu', e => e.preventDefault());
</script>
</body>
</html>
`);
});

app.post("/login", (req, res) => {
  if (isFrozen) {
    return res.redirect("/");
  }

  const { username, password } = req.body;
  
  if (username === "admin" && password === "0000") {
    // إعادة تعيين المحاولات بعد نجاح تسجيل الدخول
    loginAttempts = 0;
    res.redirect("/students");
  } else {
    loginAttempts++;
    
    if (loginAttempts >= 3) {
      // تجميد الموقع لمدة ساعة
      isFrozen = true;
      freezeUntil = Date.now() + (60 * 60 * 1000); // ساعة واحدة
      
      return res.send(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>تم تجميد الموقع</title>
        ${getStyles()}
      </head>
      <body>
        <div class="container error-box animate__animated animate__shakeX">
          <div class="freeze-bar">
            <span style="font-size: 4em;">⚠️</span>
            <h1 style="color: white; margin: 15px 0;">تم تجميد الموقع!</h1>
            <p style="font-size: 1.2em;">لقد تجاوزت الحد الأقصى من المحاولات</p>
            <div class="freeze-timer">60:00</div>
            <p style="margin-top: 15px;">سيتم إعادة تفعيل الموقع بعد ساعة واحدة</p>
            <a href="/" style="display: inline-block; margin-top: 20px; padding: 10px 30px; background: white; color: #ff4757; text-decoration: none; border-radius: 10px; font-weight: bold;">🔒 فهمت</a>
          </div>
        </div>
      </body>
      </html>
      `);
    }
    
    res.send(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <title>خطأ في تسجيل الدخول</title>
      ${getStyles()}
    </head>
    <body>
      <div class="container login-box error-box animate__animated animate__shakeX">
        <h1 style="color:#ff4757; font-size: 3em; margin-bottom: 10px;">❌</h1>
        <h2 style="color:#ff4757; margin-bottom: 20px;">بيانات الدخول غير صحيحة!</h2>
        <p style="color:#666; margin-bottom: 10px;">المحاولات المتبقية: <strong style="color:${3 - loginAttempts > 1 ? '#2ed573' : '#ff4757'}">${3 - loginAttempts}</strong></p>
        <a href="/" class="btn-edit" style="padding: 12px 30px; font-size: 1.1em;">🔙 العودة</a>
      </div>
    </body>
    </html>
    `);
  }
});

/* ===== MIDDLEWARE للتحقق من الرقم السري ===== */
app.use((req, res, next) => {
  // التحقق من حالة التجميد
  if (isFrozen && freezeUntil && Date.now() >= freezeUntil) {
    isFrozen = false;
    freezeUntil = null;
    loginAttempts = 0;
  }

  if (isFrozen && req.path !== '/') {
    return res.redirect('/');
  }
  
  // التحقق من الرقم السري لعمليات الإضافة والتعديل والحذف
  if ((req.path === '/add' || req.path.startsWith('/delete/') || req.path.startsWith('/update/')) && req.method !== 'GET') {
    const secretCode = req.body.secretCode || req.query.secretCode;
    
    if (secretCode !== SECRET_CODE) {
      return res.status(403).send(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>خطأ: الرقم السري غير صحيح</title>
        ${getStyles()}
      </head>
      <body>
        <div class="container error-box animate__animated animate__shakeX">
          <h1 style="color:#ff4757; font-size: 4em;">🔐</h1>
          <h2 style="color:#ff4757; margin: 20px 0;">الرقم السري غير صحيح!</h2>
          <p style="color:#666; margin-bottom: 30px;">يجب إدخال الرقم السري 2026 لإتمام هذه العملية</p>
          <a href="/students" class="btn-edit" style="padding: 12px 30px;">🔙 العودة</a>
        </div>
      </body>
      </html>
      `);
    }
  }
  
  next();
});

/* ===== STUDENTS ===== */
app.get("/students", (req, res) => {
  const currentDateTime = getCurrentDateTime();
  
  let rows = students.map((s, i) => `
<tr style="animation-delay: ${i * 0.1}s">
  <td><span class="badge" style="margin-left: 5px;">👤</span> ${s.firstName}</td>
  <td>${s.lastName}</td>
  <td>${s.birthDate}</td>
  <td>${s.birthPlace}</td>
  <td><strong>${s.age}</strong> <span style="color: #666; font-size: 0.9em;">سنة</span></td>
  <td class="action-links">
    <button onclick="showSecretModal('delete', ${i})" class="action-btn btn-delete">🗑 حذف</button>
    <button onclick="showSecretModal('edit', ${i})" class="action-btn btn-edit">✏️ تعديل</button>
  </td>
</tr>
`).join("");

  if(students.length === 0) {
      rows = `<tr><td colspan="6"><div class="empty-state animate__animated animate__pulse">
        <span style="font-size: 3em; display: block; margin-bottom: 10px;">📚</span>
        لا يوجد تلاميذ مسجلين حالياً
      </div></td></tr>`;
  }

  const totalStudents = students.length;
  const averageAge = students.length > 0 
    ? (students.reduce((acc, s) => acc + s.age, 0) / students.length).toFixed(1)
    : 0;

  res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>قائمة التلاميذ</title>
${getStyles()}
</head>
<body>

<!-- نافذة الرقم السري -->
<div class="secret-modal" id="secretModal">
  <div class="secret-box">
    <h3>🔐 إدخال الرقم السري</h3>
    <input type="password" class="secret-input" id="secretCode" placeholder="****" maxlength="4" pattern="[0-9]*" inputmode="numeric">
    <div class="secret-buttons">
      <button class="secret-btn confirm" onclick="verifySecret()">تأكيد</button>
      <button class="secret-btn cancel" onclick="closeSecretModal()">إلغاء</button>
    </div>
    <p style="color: rgba(255,255,255,0.8); text-align: center; margin-top: 15px; font-size: 0.9em;">
      الرقم السري هو: 2026
    </p>
  </div>
</div>

<div class="container animate__animated animate__fadeIn">
  <div class="datetime-bar">
    <i>⏰</i>
    <span class="time-part" id="currentTime"></span>
    <span class="date-part" id="currentDate"></span>
  </div>
  
  <h2>🎓 نظام إدارة التلاميذ</h2>
  
  <div style="display: flex; gap: 20px; justify-content: center; margin-bottom: 20px; flex-wrap: wrap;">
    <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 15px 25px; border-radius: 15px; color: white; box-shadow: 0 5px 15px rgba(102,126,234,0.3); animation: float 3s ease infinite;">
      <div style="font-size: 1.2em; margin-bottom: 5px;">👥 إجمالي التلاميذ</div>
      <div style="font-size: 2.5em; font-weight: bold;">${totalStudents}</div>
    </div>
    <div style="background: linear-gradient(135deg, #2ed573, #7bed9f); padding: 15px 25px; border-radius: 15px; color: white; box-shadow: 0 5px 15px rgba(46,213,115,0.3); animation: float 3s ease infinite 0.2s;">
      <div style="font-size: 1.2em; margin-bottom: 5px;">📊 متوسط الأعمار</div>
      <div style="font-size: 2.5em; font-weight: bold;">${averageAge}</div>
    </div>
  </div>

  <form method="POST" action="/add" id="addForm" onsubmit="return handleAddSubmit(event)">
    <input name="firstName" placeholder="👤 الاسم الأول" required>
    <input name="lastName" placeholder="👤 اللقب" required>
    <input type="date" name="birthDate" required>
    <select name="birthPlace" required>
      <option value="" disabled selected>📍 مكان الميلاد</option>
      <option>الجزائر</option>
      <option>وهران</option>
      <option>قسنطينة</option>
      <option>عنابة</option>
      <option>باتنة</option>
    </select>
    <input type="hidden" name="secretCode" id="addSecretCode">
    <button type="submit" class="secret-protected">➕ إضافة تلميذ جديد</button>
  </form>

  <div style="overflow-x: auto;">
    <table>
      <thead>
        <tr>
          <th>الاسم</th>
          <th>اللقب</th>
          <th>تاريخ الميلاد</th>
          <th>مكان الميلاد</th>
          <th>العمر</th>
          <th>الإجراءات</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>
</div>

<script>
let currentAction = null;
let currentId = null;

function updateDateTime() {
  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  const timeOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  
  document.getElementById('currentDate').textContent = now.toLocaleDateString('ar-SA', options);
  document.getElementById('currentTime').textContent = now.toLocaleTimeString('ar-SA', timeOptions);
}

updateDateTime();
setInterval(updateDateTime, 1000);

function showSecretModal(action, id = null) {
  currentAction = action;
  currentId = id;
  document.getElementById('secretModal').classList.add('active');
  document.getElementById('secretCode').value = '';
  document.getElementById('secretCode').focus();
}

function closeSecretModal() {
  document.getElementById('secretModal').classList.remove('active');
  currentAction = null;
  currentId = null;
}

function verifySecret() {
  const secretCode = document.getElementById('secretCode').value;
  
  if (secretCode === '2026') {
    if (currentAction === 'delete') {
      window.location.href = '/delete/' + currentId + '?secretCode=' + secretCode;
    } else if (currentAction === 'edit') {
      window.location.href = '/edit/' + currentId + '?secretCode=' + secretCode;
    }
    closeSecretModal();
  } else {
    alert('❌ الرقم السري غير صحيح!');
    document.getElementById('secretCode').value = '';
    document.getElementById('secretCode').focus();
  }
}

function handleAddSubmit(event) {
  event.preventDefault();
  
  const secretCode = prompt('🔐 الرجاء إدخال الرقم السري (2026) لإضافة تلميذ جديد:');
  
  if (secretCode === '2026') {
    document.getElementById('addSecretCode').value = secretCode;
    event.target.submit();
  } else {
    alert('❌ الرقم السري غير صحيح! لا يمكن إضافة التلميذ.');
    return false;
  }
}

document.addEventListener('contextmenu', e => e.preventDefault());

// تأثيرات إضافية
console.log("%c🔐 نظام محمي بالرقم السري 2026", "color: #ffd700; font-size: 14px;");
</script>

</body>
</html>
`);
});

/* ===== CRUD with Secret Code ===== */
app.post("/add", (req, res) => {
  const { firstName, lastName, birthDate, birthPlace, secretCode } = req.body;
  
  // التحقق من الرقم السري (تم التحقق في middleware ولكن نتحقق مرة أخرى للتأكد)
  if (secretCode !== SECRET_CODE) {
    return res.redirect("/students?error=invalid_secret");
  }
  
  const age = calculateAge(birthDate);
  students.push({ firstName, lastName, birthDate, birthPlace, age });
  res.redirect("/students");
});

app.get("/delete/:i", (req, res) => {
  const secretCode = req.query.secretCode;
  
  if (secretCode !== SECRET_CODE) {
    return res.redirect("/students?error=invalid_secret");
  }
  
  students.splice(req.params.i, 1);
  res.redirect("/students");
});

app.get("/edit/:i", (req, res) => {
  const secretCode = req.query.secretCode;
  
  if (secretCode !== SECRET_CODE) {
    return res.redirect("/students?error=invalid_secret");
  }
  
  const s = students[req.params.i];
  res.send(`
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>تعديل بيانات التلميذ</title>
${getStyles()}
</head>
<body>
<div class="container login-box animate__animated animate__fadeIn">
  <div class="datetime-bar">
    <i>⏰</i>
    <span class="time-part" id="currentTime"></span>
    <span class="date-part" id="currentDate"></span>
  </div>
  
  <h2>✏️ تعديل بيانات التلميذ</h2>
  
  <form method="POST" action="/update/${req.params.i}">
    <input name="firstName" value="${s.firstName}" placeholder="الاسم الأول" required>
    <input name="lastName" value="${s.lastName}" placeholder="اللقب" required>
    <input type="date" name="birthDate" value="${s.birthDate}" required>
    <select name="birthPlace" required>
      <option ${s.birthPlace === "الجزائر" ? "selected" : ""}>الجزائر</option>
      <option ${s.birthPlace === "وهران" ? "selected" : ""}>وهران</option>
      <option ${s.birthPlace === "قسنطينة" ? "selected" : ""}>قسنطينة</option>
      <option ${s.birthPlace === "عنابة" ? "selected" : ""}>عنابة</option>
      <option ${s.birthPlace === "باتنة" ? "selected" : ""}>باتنة</option>
    </select>
    <input type="hidden" name="secretCode" value="${secretCode}">
    <button type="submit" class="edit-btn">💾 حفظ التعديلات</button>
    <a href="/students" style="display:block; text-align:center; margin-top:15px; color:#666; text-decoration:none; font-weight:600;">🔙 إلغاء والعودة</a>
  </form>
</div>

<script>
function updateDateTime() {
  const now = new Date();
  const options = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  };
  const timeOptions = {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  };
  
  document.getElementById('currentDate').textContent = now.toLocaleDateString('ar-SA', options);
  document.getElementById('currentTime').textContent = now.toLocaleTimeString('ar-SA', timeOptions);
}

updateDateTime();
setInterval(updateDateTime, 1000);

document.addEventListener('contextmenu', e => e.preventDefault());
</script>
</body>
</html>
`);
});

app.post("/update/:i", (req, res) => {
  const { firstName, lastName, birthDate, birthPlace, secretCode } = req.body;
  
  if (secretCode !== SECRET_CODE) {
    return res.redirect("/students?error=invalid_secret");
  }
  
  const age = calculateAge(birthDate);
  students[req.params.i] = { firstName, lastName, birthDate, birthPlace, age };
  res.redirect("/students");
});

/* ===== PORT ===== */
app.listen(process.env.PORT || 3000, () => {
  console.log("%c🚀 Server running on port 3000", "color: #2ed573; font-size: 16px; font-weight: bold;");
  console.log("%c🌐 http://localhost:3000", "color: #3498db; text-decoration: underline;");
  console.log("%c🔐 Secret Code: 2026", "color: #ffd700; font-size: 14px;");
});
