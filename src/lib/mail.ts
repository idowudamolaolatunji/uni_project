const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

export async function sendPasswordResetEmail(email: string, resetUrl: string) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    throw new Error("BREVO_API_KEY is not configured.");
  }

  const response = await fetch(BREVO_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      "api-key": apiKey,
    },
    body: JSON.stringify({
      sender: {
        email: process.env.EMAIL_FROM,
        name: process.env.EMAIL_FROM_NAME,
      },
      to: [{ email }],
      subject: "Reset your password",
      textContent: `Reset your password by visiting: ${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, you can ignore this email.`,
      htmlContent: `
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>This link expires in 1 hour. If you didn't request this, you can ignore this email.</p>
      `,
    }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    const message =
      typeof data.message === "string" ? data.message : "Failed to send email.";
    throw new Error(`Brevo error: ${message}`);
  }
}
