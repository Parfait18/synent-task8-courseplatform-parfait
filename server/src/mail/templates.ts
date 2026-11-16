import type { MailMessage } from './mailer.js';

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/** One plain layout for every email: readable in any client, no images, no tracking. */
function layout(title: string, paragraphs: string[], action: { label: string; url: string }, footnote: string) {
  const body = paragraphs.map((text) => `<p style="margin:0 0 16px;line-height:1.6">${escapeHtml(text)}</p>`).join('');
  return `<!doctype html><html lang="en"><body style="margin:0;background:#F5F6FA;font-family:Arial,Helvetica,sans-serif;color:#1B2560">
<div style="max-width:560px;margin:0 auto;padding:32px 24px">
<p style="font-size:20px;font-weight:bold;margin:0 0 24px">Kalam</p>
<div style="background:#FFFFFF;border-radius:12px;padding:28px">
<h1 style="font-size:22px;margin:0 0 16px">${escapeHtml(title)}</h1>${body}
<p style="margin:24px 0"><a href="${escapeHtml(action.url)}" style="background:#F4A20C;color:#1B2560;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold">${escapeHtml(action.label)}</a></p>
<p style="font-size:13px;color:#4A5070;margin:0">${escapeHtml(footnote)}</p>
<p style="font-size:13px;color:#4A5070;margin:8px 0 0;word-break:break-all">${escapeHtml(action.url)}</p>
</div></div></body></html>`;
}

export function verificationEmail(to: string, name: string, url: string): MailMessage {
  return {
    to,
    subject: 'Confirm your email for Kalam',
    html: layout(`Welcome, ${name}`, ['Your Kalam account is ready. Confirm your email address so you can enrol in courses.'], { label: 'Confirm my email', url }, 'The link works once and expires in 24 hours. If you did not create an account, ignore this email.'),
    text: `Welcome, ${name}.\n\nConfirm your email address so you can enrol in courses:\n${url}\n\nThe link works once and expires in 24 hours.`,
    links: [url],
  };
}

export function passwordResetEmail(to: string, name: string, url: string): MailMessage {
  return {
    to,
    subject: 'Reset your Kalam password',
    html: layout('Reset your password', [`Hi ${name}, someone asked to reset the password of this account. If it was you, choose a new password.`], { label: 'Choose a new password', url }, 'The link works once and expires in 30 minutes. If you did not ask for it, ignore this email: your password stays the same.'),
    text: `Hi ${name},\n\nChoose a new password:\n${url}\n\nThe link works once and expires in 30 minutes.`,
    links: [url],
  };
}

export function enrollmentEmail(to: string, name: string, courseTitle: string, amountLabel: string, url: string): MailMessage {
  return {
    to,
    subject: `You are enrolled in ${courseTitle}`,
    html: layout(`You are enrolled in ${courseTitle}`, [`Hi ${name}, the course is now in your dashboard.`, `Amount paid: ${amountLabel}.`], { label: 'Start the first lesson', url }, 'Keep this email as your receipt.'),
    text: `Hi ${name},\n\nYou are enrolled in ${courseTitle}. Amount paid: ${amountLabel}.\nStart learning: ${url}`,
    links: [url],
  };
}

/** Sent when someone registers with an address that already has an account (no enumeration in the API). */
export function accountExistsEmail(to: string, name: string, url: string): MailMessage {
  return {
    to,
    subject: 'You already have a Kalam account',
    html: layout('You already have an account', [`Hi ${name}, someone tried to create a Kalam account with this email. You already have one, so nothing changed.`, 'If you forgot your password, you can choose a new one.'], { label: 'Reset my password', url }, 'If it was not you, ignore this email.'),
    text: `Hi ${name},\n\nSomeone tried to create a Kalam account with this email. You already have one.\nForgot your password? ${url}`,
    links: [url],
  };
}
