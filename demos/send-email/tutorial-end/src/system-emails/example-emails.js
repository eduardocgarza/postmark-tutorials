export const EXAMPLE_WELCOME_EMAIL = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Our Service!</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 20px;
    }
    .container {
      background-color: #ffffff;
      padding: 20px;
      border-radius: 5px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 {
      color: #333333;
    }
    p {
      color: #555555;
    }
    .button {
      display: inline-block;
      padding: 10px 20px;
      margin-top: 20px;
      background-color: #007BFF;
      color: #ffffff;
      text-decoration: none;
      border-radius: 5px;
    }
    .button:hover {
      background-color: #0056b3;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Welcome to Our Service!</h1>
    <p>Hi there,</p>
    <p>Thank you for signing up for our service. We're excited to have you on board!</p>
    <p>To get started, please click the button below to verify your email address and complete your registration.</p>
    <a href="https://example.com/verify-email" class="button">Verify Email</a>
    <p>If you have any questions or need assistance, feel free to reply to this email. We're here to help!</p>
    <p>Best regards,<br />The Team</p>
  </div>
</body>
</html>
`;
