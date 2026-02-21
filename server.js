const express = require("express");
const app = express();

app.use(express.urlencoded({ extended: true }));

let students = [];

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

/* ================= LOGIN PAGE ================= */

app.get("/", (req, res) => {
  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
  <title>Login</title>
  <style>
  body{
    margin:0;
    height:100vh;
    display:flex;
    justify-content:center;
    align-items:center;
    font-family: 'Segoe UI', sans-serif;
    background: linear-gradient(135deg,#667eea,#764ba2);
  }
  .card{
    background:white;
    padding:40px;
    border-radius:20px;
    width:350px;
    box-shadow:0 15px 40px rgba(0,0,0,0.3);
    animation:fadeIn 1s ease;
  }
  @keyframes fadeIn{
    from{opacity:0; transform:translateY(20px)}
    to{opacity:1; transform:translateY(0)}
  }
  h2{text-align:center; color:#444;}
  input{
    width:100%;
    padding:12px;
    margin:10px 0;
    border-radius:10px;
    border:1px solid #ddd;
    transition:0.3s;
  }
  input:focus{
    border-color:#667eea;
    box-shadow:0 0 8px #667eea55;
    outline:none;
  }
  button{
    width:100%;
    padding:12px;
    border:none;
    border-radius:10px;
    background:linear-gradient(45deg,#667eea,#764ba2);
    color:white;
    font-size:16px;
    cursor:pointer;
    transition:0.3s;
  }
  button:hover{
    transform:scale(1.05);
  }
  </style>
  </head>
  <body>
    <div class="card">
      <h2>🔐 تسجيل الدخول</h2>
      <form method="POST" action="/login">
        <input name="username" placeholder="اسم المستخدم" required>
        <input type="password" name="password" placeholder="كلمة المرور" required>
        <button>دخول</button>
      </form>
    </div>
  </body>
  </html>
  `);
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "0000") {
    res.redirect("/students");
  } else {
    res.send("<h2 style='color:red;text-align:center'>❌ بيانات غير صحيحة</h2>");
  }
});

/* ================= STUDENTS PAGE ================= */

app.get("/students", (req, res) => {

  let rows = students.map((s, index) => `
  <tr>
    <td>${s.firstName}</td>
    <td>${s.lastName}</td>
    <td>${s.birthDate}</td>
    <td>${s.birthPlace}</td>
    <td>${s.age}</td>
    <td>
      <a class="edit" href="/edit/${index}">✏ تعديل</a>
      <a class="delete" href="/delete/${index}">🗑 حذف</a>
    </td>
  </tr>
  `).join("");

  res.send(`
  <!DOCTYPE html>
  <html>
  <head>
  <title>Students</title>
  <style>
  body{
    font-family: 'Segoe UI', sans-serif;
    background:linear-gradient(to right,#43cea2,#185a9d);
    margin:0;
    padding:30px;
    color:white;
  }
  h2{text-align:center;}
  .container{
    background:white;
    color:#333;
    padding:25px;
    border-radius:20px;
    box-shadow:0 10px 30px rgba(0,0,0,0.3);
    animation:fadeIn 1s ease;
  }
  input,select{
    padding:10px;
    margin:5px;
    border-radius:8px;
    border:1px solid #ccc;
  }
  button{
    padding:10px 15px;
    border:none;
    border-radius:8px;
    background:#43cea2;
    color:white;
    cursor:pointer;
    transition:0.3s;
  }
  button:hover{
    background:#185a9d;
    transform:scale(1.05);
  }
  table{
    width:100%;
    margin-top:20px;
    border-collapse:collapse;
  }
  th,td{
    padding:10px;
    text-align:center;
  }
  th{
    background:#185a9d;
    color:white;
  }
  tr:nth-child(even){
    background:#f2f2f2;
  }
  .edit{
    color:#007bff;
    margin-right:10px;
    text-decoration:none;
  }
  .delete{
    color:red;
    text-decoration:none;
  }
  .top-actions{
    text-align:right;
    margin-bottom:15px;
  }
  .print-btn{
    background:#764ba2;
  }
  .logout{
    background:#e74c3c;
  }
  @media print{
    button,.top-actions{display:none;}
    body{background:white;}
  }
  </style>
  </head>
  <body>

  <h2>📚 نظام إدارة التلاميذ</h2>

  <div class="container">

    <div class="top-actions">
      <button class="print-btn" onclick="window.print()">🖨 طباعة</button>
      <a href="/"><button class="logout">تسجيل خروج</button></a>
    </div>

    <form method="POST" action="/add">
      <input name="firstName" placeholder="الاسم" required>
      <input name="lastName" placeholder="اللقب" required>
      <input type="date" name="birthDate" required>
      <select name="birthPlace">
        <option>الجزائر</option>
        <option>وهران</option>
        <option>قسنطينة</option>
      </select>
      <button>➕ إضافة</button>
    </form>

    <table border="1">
      <tr>
        <th>الاسم</th>
        <th>اللقب</th>
        <th>تاريخ الميلاد</th>
        <th>مكان الميلاد</th>
        <th>العمر</th>
        <th>إجراءات</th>
      </tr>
      ${rows}
    </table>

  </div>

  </body>
  </html>
  `);
});

/* ================= CRUD ================= */

app.post("/add", (req, res) => {
  const { firstName, lastName, birthDate, birthPlace } = req.body;
  const age = calculateAge(birthDate);
  students.push({ firstName, lastName, birthDate, birthPlace, age });
  res.redirect("/students");
});

app.get("/delete/:index", (req, res) => {
  students.splice(req.params.index, 1);
  res.redirect("/students");
});

app.get("/edit/:index", (req, res) => {
  const s = students[req.params.index];
  res.send(`
  <h2 style="text-align:center">تعديل</h2>
  <form method="POST" action="/update/${req.params.index}" style="text-align:center">
    <input name="firstName" value="${s.firstName}" required>
    <input name="lastName" value="${s.lastName}" required>
    <input type="date" name="birthDate" value="${s.birthDate}" required>
    <select name="birthPlace">
      <option ${s.birthPlace==="الجزائر"?"selected":""}>الجزائر</option>
      <option ${s.birthPlace==="وهران"?"selected":""}>وهران</option>
      <option ${s.birthPlace==="قسنطينة"?"selected":""}>قسنطينة</option>
    </select>
    <button>💾 تحديث</button>
  </form>
  `);
});

app.post("/update/:index", (req, res) => {
  const { firstName, lastName, birthDate, birthPlace } = req.body;
  const age = calculateAge(birthDate);
  students[req.params.index] = { firstName, lastName, birthDate, birthPlace, age };
  res.redirect("/students");
});

app.listen(process.env.PORT || 3000), () => {
  console.log("🚀 Server running at http://localhost:3000");
});