type ActionEmailOptions = {
  preview: string;
  title: string;
  paragraphs: string[];
  buttonLabel: string;
  actionUrl: string;
  expiry: string;
  securityNote: string;
};

function escapeHtml(value: string) {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (char) => entities[char] ?? char);
}

export function createActionEmail({ preview, title, paragraphs, buttonLabel, actionUrl, expiry, securityNote }: ActionEmailOptions) {
  const safeUrl = escapeHtml(actionUrl);
  const safeButtonLabel = escapeHtml(buttonLabel);
  const paragraphHtml = paragraphs.map((paragraph) => `<p style="margin:0 0 16px;color:#4b3540;font-size:15px;line-height:1.7">${escapeHtml(paragraph)}</p>`).join("");
  const text = ["UsStory", title, ...paragraphs, `${buttonLabel}: ${actionUrl}`, `Thời hạn: ${expiry}`, securityNote, "Email tự động từ UsStory. Vui lòng không trả lời email này."].join("\n\n");
  const html = `<!doctype html>
<html lang="vi">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${escapeHtml(title)} | UsStory</title>
  </head>
  <body style="margin:0;padding:0;background:#fff7f8;font-family:Arial,Helvetica,sans-serif;color:#35242c">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preview)}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#fff7f8;padding:32px 12px">
      <tr><td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#ffffff;border:1px solid #f3dce4;border-radius:16px;overflow:hidden">
          <tr><td style="padding:24px 32px;border-bottom:1px solid #f6e8ed">
            <p style="margin:0;color:#a8174b;font-size:22px;font-weight:700;letter-spacing:.2px">UsStory</p>
          </td></tr>
          <tr><td style="padding:32px">
            <h1 style="margin:0 0 20px;color:#35242c;font-size:24px;line-height:1.3">${escapeHtml(title)}</h1>
            ${paragraphHtml}
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:24px 0">
              <tr><td align="center" style="border-radius:10px;background:#b51f58">
                <a href="${safeUrl}" style="display:inline-block;padding:13px 22px;border:1px solid #b51f58;border-radius:10px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">${safeButtonLabel}</a>
              </td></tr>
            </table>
            <p style="margin:0 0 8px;color:#6d5961;font-size:13px;line-height:1.6">Liên kết có hiệu lực ${escapeHtml(expiry)}.</p>
            <p style="margin:0 0 8px;color:#6d5961;font-size:13px;line-height:1.6">Nếu nút không hoạt động, hãy sao chép đường dẫn sau vào trình duyệt:</p>
            <p style="margin:0 0 20px;word-break:break-all;font-size:13px;line-height:1.6"><a href="${safeUrl}" style="color:#a8174b">${safeUrl}</a></p>
            <p style="margin:0;color:#6d5961;font-size:13px;line-height:1.6">${escapeHtml(securityNote)}</p>
          </td></tr>
          <tr><td style="padding:20px 32px;background:#fffafb;border-top:1px solid #f6e8ed">
            <p style="margin:0;color:#8b7780;font-size:12px;line-height:1.6">Email này được gửi tự động từ UsStory. Vui lòng không chia sẻ liên kết với người khác.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
  return { html, text };
}
