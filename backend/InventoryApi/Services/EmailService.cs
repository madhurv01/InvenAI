using System.Net;
using System.Net.Mail;
using InventoryApi.Services.Interfaces;

namespace InventoryApi.Services;

/// <summary>
/// Sends real email via Gmail SMTP (smtp.gmail.com:587, STARTTLS) using an account + free
/// App Password — no third-party email API, no billing. Configure Email:Username and
/// Email:AppPassword in appsettings.Development.json (the Gmail account needs 2-Step
/// Verification enabled to generate an App Password at myaccount.google.com/apppasswords).
/// </summary>
public class EmailService : IEmailService
{
    private readonly IConfiguration _config;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration config, ILogger<EmailService> logger)
    {
        _config = config;
        _logger = logger;
    }

    public async Task<bool> SendAsync(string toEmail, string subject, string body)
    {
        var username = _config["Email:Username"];
        var appPassword = _config["Email:AppPassword"];
        var fromName = _config["Email:FromName"] ?? "InvenAI Automate Workflow";
        var host = _config["Email:SmtpHost"] ?? "smtp.gmail.com";
        var port = int.TryParse(_config["Email:SmtpPort"], out var p) ? p : 587;

        if (string.IsNullOrWhiteSpace(username) || string.IsNullOrWhiteSpace(appPassword) || username.StartsWith("REPLACE_WITH"))
        {
            _logger.LogWarning("Email:Username/AppPassword not configured — skipping email to {To}: {Subject}", toEmail, subject);
            return false;
        }

        try
        {
            using var client = new SmtpClient(host, port)
            {
                EnableSsl = true,
                Credentials = new NetworkCredential(username, appPassword)
            };

            using var message = new MailMessage
            {
                From = new MailAddress(username, fromName),
                Subject = subject,
                Body = body,
                IsBodyHtml = false
            };
            message.To.Add(toEmail);

            await client.SendMailAsync(message);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email to {To}", toEmail);
            return false;
        }
    }
}
