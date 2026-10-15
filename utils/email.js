const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '465'),
  secure: true, // true for 465
  auth: {
    user: process.env.SMTP_USER || 'pkmslopex@gmail.com',
    pass: process.env.SMTP_PASS || 'slopex123'
  }
});

/**
 * Kirim email permohonan verifikasi ke admin (pkmslopex@gmail.com)
 */
async function sendAdminVerificationRequestEmail(user) {
  const adminEmail = process.env.SMTP_USER || 'pkmslopex@gmail.com';
  const baseUrl = process.env.BASE_URL || 'http://localhost:8828';
  const approveUrl = `${baseUrl}/api/auth/approve-user?token=${user.verificationToken}&id=${user.id}`;

  const htmlContent = `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #1e3a8a; margin: 0;">🚨 Permintaan Akses ${user.role.toUpperCase()} Baru - SLOPEX</h2>
      <p style="color: #64748b; font-size: 14px;">Smart Landslide Prevention System | UNPAD</p>
    </div>

    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #3b82f6;">
      <h3 style="margin-top: 0; color: #0f172a; font-size: 18px;">Permintaan Akses Baru</h3>
      <p style="color: #334155; font-size: 14px;">Seseorang telah mendaftar di sistem <strong>SLOPEX</strong> dan meminta akses sebagai <strong>${user.role.toUpperCase()}</strong>.</p>
      
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-size: 14px; width: 120px;"><strong>Nama:</strong></td>
          <td style="padding: 6px 0; color: #0f172a; font-size: 14px;">${user.name}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-size: 14px;"><strong>Email:</strong></td>
          <td style="padding: 6px 0; color: #0f172a; font-size: 14px;"><a href="mailto:${user.email}" style="color: #2563eb;">${user.email}</a></td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-size: 14px;"><strong>Role Diminta:</strong></td>
          <td style="padding: 6px 0; color: #0f172a; font-size: 14px;"><span style="background: #dbeafe; color: #1e40af; padding: 2px 8px; border-radius: 4px; font-weight: 600; font-size: 12px;">${user.role.toUpperCase()}</span></td>
        </tr>
        ${user.whatsapp ? `
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-size: 14px;"><strong>WhatsApp:</strong></td>
          <td style="padding: 6px 0; color: #0f172a; font-size: 14px;">${user.whatsapp}</td>
        </tr>` : ''}
        ${user.institution ? `
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-size: 14px;"><strong>Instansi:</strong></td>
          <td style="padding: 6px 0; color: #0f172a; font-size: 14px;">${user.institution}</td>
        </tr>` : ''}
      </table>
    </div>

    <p style="color: #475569; font-size: 14px; margin-bottom: 20px;">Silakan klik tombol di bawah ini jika Anda menyetujui dan ingin mengaktifkan akun tersebut:</p>

    <div style="text-align: center; margin-bottom: 30px;">
      <a href="${approveUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2);">Setujui & Aktifkan Akun</a>
    </div>

    <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; color: #94a3b8; font-size: 12px;">
      Jika Anda tidak mengenali orang ini, abaikan saja email ini.<br>
      SLOPEX System © 2026 Universitas Padjadjaran
    </div>
  </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"SLOPEX System" <${adminEmail}>`,
      to: adminEmail,
      subject: `🚨 Permintaan Akses ${user.role.toUpperCase()} Baru - SLOPEX`,
      html: htmlContent
    });
    console.log('[EMAIL] Verification email sent to admin:', info.messageId);
    return true;
  } catch (err) {
    console.error('[EMAIL] Failed to send verification email:', err.message);
    return false;
  }
}

/**
 * Kirim email konfirmasi ke user setelah disetujui admin
 */
async function sendUserApprovalNotificationEmail(user) {
  const adminEmail = process.env.SMTP_USER || 'pkmslopex@gmail.com';
  const htmlContent = `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
    <div style="text-align: center; margin-bottom: 20px;">
      <h2 style="color: #16a34a; margin: 0;">🎉 Akun SLOPEX Disetujui & Aktif!</h2>
      <p style="color: #64748b; font-size: 14px;">Smart Landslide Prevention System | UNPAD</p>
    </div>

    <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin-bottom: 24px; border-left: 4px solid #16a34a;">
      <p style="color: #166534; font-size: 15px; margin: 0;">Halo <strong>${user.name}</strong>,</p>
      <p style="color: #166534; font-size: 14px; margin-top: 10px;">Permohonan akses akun Anda sebagai <strong>${user.role.toUpperCase()}</strong> di sistem SLOPEX telah disetujui oleh Tim Administrator.</p>
    </div>

    <p style="color: #334155; font-size: 14px;">Anda sekarang dapat masuk ke dashboard SLOPEX menggunakan email dan password yang telah Anda daftarkan.</p>

    <div style="text-align: center; margin: 25px 0;">
      <a href="${process.env.BASE_URL || 'http://localhost:8828'}" style="background-color: #16a34a; color: #ffffff; padding: 12px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block;">Masuk ke SLOPEX Dashboard</a>
    </div>

    <div style="border-top: 1px solid #e2e8f0; padding-top: 15px; text-align: center; color: #94a3b8; font-size: 12px;">
      SLOPEX System © 2026 Universitas Padjadjaran
    </div>
  </div>
  `;

  try {
    await transporter.sendMail({
      from: `"SLOPEX System" <${adminEmail}>`,
      to: user.email,
      subject: `🎉 Akun SLOPEX Anda Telah Aktif!`,
      html: htmlContent
    });
    console.log('[EMAIL] Approval notification email sent to user:', user.email);
    return true;
  } catch (err) {
    console.error('[EMAIL] Failed to send approval email to user:', err.message);
    return false;
  }
}

module.exports = {
  sendAdminVerificationRequestEmail,
  sendUserApprovalNotificationEmail
};
