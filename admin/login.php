<?php
session_start();
require '../api/db.php';

// If already logged in as admin, redirect
if (isset($_SESSION['user']) && $_SESSION['user']['accountType'] === 'admin') {
    header('Location: dashboard.php');
    exit;
}

$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $email = trim($_POST['email'] ?? '');
    $password = $_POST['password'] ?? '';

    if (!$email || !$password) {
        $error = "Email and password required.";
    } else {
        $stmt = $conn->prepare("SELECT id, full_name, email, account_type, password FROM users WHERE email = ? AND account_type = 'admin'");
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $row = $stmt->get_result()->fetch_assoc();

        if ($row && password_verify($password, $row['password'])) {
            $_SESSION['user'] = [
                'id' => (int)$row['id'],
                'accountType' => $row['account_type'],
                'fullName' => $row['full_name'],
                'email' => $row['email']
            ];
            header('Location: dashboard.php');
            exit;
        } else {
            $error = "Invalid email or password.";
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Login - HumanityLink</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    :root { --primary: #0ea5e9; --bg: #0f172a; --card: #1e293b; --text: #f8fafc; --text-muted: #94a3b8; --border: #334155; }
    body { margin: 0; font-family: 'Inter', sans-serif; background: var(--bg); color: var(--text); display: flex; align-items: center; justify-content: center; height: 100vh; }
    .login-box { background: var(--card); border: 1px solid var(--border); padding: 40px; border-radius: 12px; width: 100%; max-width: 400px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    h2 { margin: 0 0 20px; text-align: center; }
    .form-group { margin-bottom: 15px; }
    label { display: block; margin-bottom: 6px; font-size: 0.9rem; color: var(--text-muted); }
    input { width: 100%; padding: 10px 12px; background: rgba(255,255,255,0.05); border: 1px solid var(--border); border-radius: 8px; color: var(--text); box-sizing: border-box; }
    input:focus { outline: none; border-color: var(--primary); }
    button { width: 100%; padding: 12px; background: var(--primary); color: #fff; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: 600; margin-top: 10px; }
    button:hover { background: #0284c7; }
    .error { color: #ef4444; background: rgba(239, 68, 68, 0.1); padding: 10px; border-radius: 6px; font-size: 0.9rem; margin-bottom: 15px; border: 1px solid rgba(239, 68, 68, 0.3); text-align: center; }
  </style>
</head>
<body>
  <div class="login-box">
    <h2>Admin Login</h2>
    <?php if ($error): ?><div class="error"><?= htmlspecialchars($error) ?></div><?php endif; ?>
    <form method="POST">
      <div class="form-group">
        <label>Email Address</label>
        <input type="email" name="email" required placeholder="admin@charity.com">
      </div>
      <div class="form-group">
        <label>Password</label>
        <input type="password" name="password" required placeholder="••••••••">
      </div>
      <button type="submit">Login to Dashboard</button>
    </form>
  </div>
</body>
</html>
