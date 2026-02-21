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

/* ===== LOGIN ===== */
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Login</title>
</head>
<body>
<h2>Login</h2>
<form method="POST" action="/login">
<input name="username" placeholder="Username" required><br><br>
<input type="password" name="password" placeholder="Password" required><br><br>
<button type="submit">Login</button>
</form>
</body>
</html>
`);
});

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "0000") {
    res.redirect("/students");
  } else {
    res.send("❌ بيانات خاطئة");
  }
});

/* ===== STUDENTS ===== */
app.get("/students", (req, res) => {
  let rows = students.map((s, i) => `
<tr>
<td>${s.firstName}</td>
<td>${s.lastName}</td>
<td>${s.birthDate}</td>
<td>${s.birthPlace}</td>
<td>${s.age}</td>
<td>
<a href="/delete/${i}">حذف</a> |
<a href="/edit/${i}">تعديل</a>
</td>
</tr>
`).join("");

  res.send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Students</title>
</head>
<body>

<h2>قائمة التلاميذ</h2>

<form method="POST" action="/add">
<input name="firstName" placeholder="الاسم" required>
<input name="lastName" placeholder="اللقب" required>
<input type="date" name="birthDate" required>
<select name="birthPlace">
<option>الجزائر</option>
<option>وهران</option>
<option>قسنطينة</option>
</select>
<button>إضافة</button>
</form>

<br>

<button onclick="window.print()">🖨 طباعة</button>

<table border="1" cellpadding="5">
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

</body>
</html>
`);
});

/* ===== CRUD ===== */
app.post("/add", (req, res) => {
  const { firstName, lastName, birthDate, birthPlace } = req.body;
  const age = calculateAge(birthDate);
  students.push({ firstName, lastName, birthDate, birthPlace, age });
  res.redirect("/students");
});

app.get("/delete/:i", (req, res) => {
  students.splice(req.params.i, 1);
  res.redirect("/students");
});

app.get("/edit/:i", (req, res) => {
  const s = students[req.params.i];
  res.send(`
<form method="POST" action="/update/${req.params.i}">
<input name="firstName" value="${s.firstName}">
<input name="lastName" value="${s.lastName}">
<input type="date" name="birthDate" value="${s.birthDate}">
<select name="birthPlace">
<option ${s.birthPlace==="الجزائر"?"selected":""}>الجزائر</option>
<option ${s.birthPlace==="وهران"?"selected":""}>وهران</option>
<option ${s.birthPlace==="قسنطينة"?"selected":""}>قسنطينة</option>
</select>
<button>تحديث</button>
</form>
`);
});

app.post("/update/:i", (req, res) => {
  const { firstName, lastName, birthDate, birthPlace } = req.body;
  const age = calculateAge(birthDate);
  students[req.params.i] = { firstName, lastName, birthDate, birthPlace, age };
  res.redirect("/students");
});

/* ===== PORT ===== */
app.listen(process.env.PORT || 3000, () => {
  console.log("Server running");
});
