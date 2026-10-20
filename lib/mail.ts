import nodemailer from "nodemailer";

export async function sendMail(to: string, subject: string, html: string, text?: string) {
  if (!process.env.SMTP_HOST) {
    // Chưa cấu hình SMTP: in ra console để thử khi phát triển
    console.log(`\n[mail - dev] tới: ${to}\n${subject}\n${html}\n`);
    return;
  }
  const port = Number(process.env.SMTP_PORT ?? 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transport.sendMail({ from: process.env.MAIL_FROM, to, subject, html, text });
}
