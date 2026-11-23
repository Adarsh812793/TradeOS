// The wording and layout of every email the app sends. Each template returns { subject, text, html }.

// Makes text safe to place inside HTML: the five characters that can start a tag or break out of an attribute become
// harmless entities. A user can type anything as their name, and a name like <script> must show as text, never run.
export function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

// The email that carries the 6-digit sign-up code.
//   name     what the person typed as their name (escaped before it goes into the HTML)
//   code     the 6 digits       minutes   how long the code stays valid
// The subject deliberately does not contain the code: subjects show up in lock-screen notifications and mail lists.
export function otpEmail({ name, code, minutes }) {
    const subject = "Your TradeOS verification code";

    const text = [
        `Hi ${name},`,
        "",
        "Your TradeOS verification code is:",
        "",
        `    ${code}`,
        "",
        `It expires in ${minutes} minutes. If you did not try to create a TradeOS account, you can ignore this email.`,
        "",
        "TradeOS is a practice platform: it uses virtual money and simulated prices."
    ].join("\n");

    const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f4f5fb;font-family:Arial,Helvetica,sans-serif;color:#1b2150;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <tr><td>
        <p style="margin:0 0 16px;font-size:16px;">Hi ${escapeHtml(name)},</p>
        <p style="margin:0 0 20px;font-size:16px;">Your TradeOS verification code is:</p>
        <p style="margin:0 0 24px;font-size:32px;font-weight:bold;letter-spacing:8px;font-family:'Courier New',monospace;">${escapeHtml(code)}</p>
        <p style="margin:0 0 16px;font-size:14px;color:#4a5080;">It expires in ${escapeHtml(minutes)} minutes. If you did not try to create a TradeOS account, you can ignore this email.</p>
        <p style="margin:0;font-size:12px;color:#7a80a8;">TradeOS is a practice platform: it uses virtual money and simulated prices.</p>
      </td></tr>
    </table>
  </body>
</html>`;

    return { subject, text, html };
}


// The email that carries the 6-digit code for a forgotten password.
//   name     the account's name (escaped before it goes into the HTML)
//   code     the 6 digits       minutes   how long the code stays valid
// The subject does not contain the code, for the same reason as in otpEmail.
export function passwordResetEmail({ name, code, minutes }) {
    const subject = "Your TradeOS password reset code";

    const text = [
        `Hi ${name},`,
        "",
        "Someone asked to reset the password of your TradeOS account. Your code is:",
        "",
        `    ${code}`,
        "",
        `It expires in ${minutes} minutes. If this was not you, you can ignore this email: your password stays the same.`,
        "",
        "TradeOS is a practice platform: it uses virtual money and simulated prices."
    ].join("\n");

    const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f4f5fb;font-family:Arial,Helvetica,sans-serif;color:#1b2150;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <tr><td>
        <p style="margin:0 0 16px;font-size:16px;">Hi ${escapeHtml(name)},</p>
        <p style="margin:0 0 20px;font-size:16px;">Someone asked to reset the password of your TradeOS account. Your code is:</p>
        <p style="margin:0 0 24px;font-size:32px;font-weight:bold;letter-spacing:8px;font-family:'Courier New',monospace;">${escapeHtml(code)}</p>
        <p style="margin:0 0 16px;font-size:14px;color:#4a5080;">It expires in ${escapeHtml(minutes)} minutes. If this was not you, you can ignore this email: your password stays the same.</p>
        <p style="margin:0;font-size:12px;color:#7a80a8;">TradeOS is a practice platform: it uses virtual money and simulated prices.</p>
      </td></tr>
    </table>
  </body>
</html>`;

    return { subject, text, html };
}

// The email sent AFTER a password was reset, so an owner who did not do it notices at once.
export function passwordChangedEmail({ name }) {
    const subject = "Your TradeOS password was changed";

    const text = [
        `Hi ${name},`,
        "",
        "The password of your TradeOS account was just reset with a code sent to this email, and every device was signed out.",
        "",
        "If this was you, there is nothing more to do. If it was not, someone with access to your email may be trying to get into your account: reset your password again and secure your email.",
        "",
        "TradeOS is a practice platform: it uses virtual money and simulated prices."
    ].join("\n");

    const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:24px;background:#f4f5fb;font-family:Arial,Helvetica,sans-serif;color:#1b2150;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <tr><td>
        <p style="margin:0 0 16px;font-size:16px;">Hi ${escapeHtml(name)},</p>
        <p style="margin:0 0 16px;font-size:16px;">The password of your TradeOS account was just reset with a code sent to this email, and every device was signed out.</p>
        <p style="margin:0 0 16px;font-size:14px;color:#4a5080;">If this was you, there is nothing more to do. If it was not, someone with access to your email may be trying to get into your account: reset your password again and secure your email.</p>
        <p style="margin:0;font-size:12px;color:#7a80a8;">TradeOS is a practice platform: it uses virtual money and simulated prices.</p>
      </td></tr>
    </table>
  </body>
</html>`;

    return { subject, text, html };
}
