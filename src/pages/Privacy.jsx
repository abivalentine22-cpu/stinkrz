import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const SECTIONS = [
  {
    title: "1. Information We Collect",
    content: `We collect information you provide directly, including your display name, age, bio, profile photo, scent preferences, and vibe badges. We also collect location data when you enable it, and messages you send through the App. We automatically collect usage data such as log-in times and feature interactions.`,
  },
  {
    title: "2. How We Use Your Information",
    content: `We use your information to provide and improve the Stinkrz service, show your profile to nearby users, deliver messages between users, send notifications about nearby matches (with your permission), enforce our Terms of Service, and respond to support requests.`,
  },
  {
    title: "3. Location Data",
    content: `Location data is central to Stinkrz. Your coordinates are stored and shared with other users so they can see you on the Scent Block map. You may enable "Approximate Location" mode in your profile to share only a general area (~½ mile radius) rather than your precise coordinates. You can stop sharing your location by disabling tracking in the App.`,
  },
  {
    title: "4. Sharing Your Information",
    content: `Your profile information (name, photo, scent details, bio, vibe badges) is visible to other Stinkrz users. Your messages are private between you and the recipient. We do not sell your personal data to third parties. We may share data with service providers who help us operate the App, subject to confidentiality obligations.`,
  },
  {
    title: "5. Push Notifications",
    content: `If you grant notification permissions, we may send you alerts about nearby scent matches. You can revoke notification permissions at any time through your device's settings. We limit how often these notifications are sent to avoid excessive alerts.`,
  },
  {
    title: "6. Data Retention",
    content: `We retain your profile data for as long as your account is active. Messages are stored to allow conversation history. If you delete your account, we will remove your personal data within 30 days, except where retention is required by law.`,
  },
  {
    title: "7. Security",
    content: `We take reasonable technical and organizational measures to protect your data. However, no method of transmission over the internet is 100% secure. We encourage you to use a strong password and to report any suspicious activity immediately.`,
  },
  {
    title: "8. Children's Privacy",
    content: `Stinkrz is not intended for users under 18 years of age. We do not knowingly collect personal data from minors. If we become aware that a minor has created an account, we will terminate it and delete associated data.`,
  },
  {
    title: "9. Your Rights",
    content: `You have the right to access, correct, or delete your personal data. You can update most profile information directly in the App, and you can delete your account at any time from Settings. For a data export, please contact us via the Help page.`,
  },
  {
    title: "10. Changes to This Policy",
    content: `We may update this Privacy Policy from time to time. We will notify users of significant changes through the App. Your continued use of Stinkrz after changes take effect constitutes your acceptance of the updated policy.`,
  },
  {
    title: "11. Contact Us",
    content: `If you have questions or concerns about this Privacy Policy or how we handle your data, please reach out through the Help page.`,
  },
];

export default function Privacy() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <h1 className="font-heading text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="font-body text-sm text-muted-foreground mb-10">Last updated: July 2026</p>

      <p className="font-body text-sm text-muted-foreground leading-relaxed mb-8">
        At Stinkrz, your privacy matters. This Privacy Policy explains what data we collect, how we use it, and the choices you have. By using Stinkrz, you agree to the practices described here.
      </p>

      <div className="space-y-8">
        {SECTIONS.map((section) => (
          <div key={section.title} className="border-b border-border pb-8 last:border-0">
            <h2 className="font-heading text-base font-semibold mb-3">{section.title}</h2>
            <p className="font-body text-sm text-muted-foreground leading-relaxed">{section.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}