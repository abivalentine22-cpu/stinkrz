import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const SECTIONS = [
  {
    title: "1. Acceptance of Terms",
    content: `By accessing or using Stinkrz ("the App"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the App. We reserve the right to update these terms at any time, and continued use of the App constitutes acceptance of any changes.`,
  },
  {
    title: "2. Eligibility",
    content: `You must be at least 18 years old to use Stinkrz. By creating an account, you confirm that you are 18 or older and that all information you provide is accurate and truthful.`,
  },
  {
    title: "3. User Accounts",
    content: `You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You agree to notify us immediately of any unauthorized use of your account. We reserve the right to terminate accounts at our discretion.`,
  },
  {
    title: "4. Acceptable Use & Community Guidelines",
    content: `You agree not to use Stinkrz to harass, threaten, or harm other users; post false, misleading, or fraudulent content; impersonate another person; distribute spam or unsolicited messages; upload malicious software or harmful content; share non-consensual explicit content or content involving minors; or engage in any activity that violates applicable laws or regulations. Stinkrz is an adult-oriented platform and permits NSFW (not safe for work) content, including nudity and explicit photos, provided all content is legal, consensual, and features adults 18+. All interactions must be consensual and respectful. Stinkrz includes features for expressing fetish and kink preferences. You can block or report any user who violates these guidelines, and our team reviews reports promptly.`,
  },
  {
    title: "5. User Content & NSFW Policy",
    content: `You retain ownership of content you post on Stinkrz, including profile photos, your photo gallery (up to 6 additional photos), bios, vibe badges, scent preferences, fetish and kink selections, status posts, and chat messages (including photos and videos shared in chat). By posting content, you grant Stinkrz a non-exclusive, royalty-free license to use, display, and distribute that content within the App. You are solely responsible for the content you share. NSFW content — including nudity and explicit photos — is allowed on Stinkrz for users 18 and older. All explicit content must be consensual, legal, and feature adults 18+. You agree not to share non-consensual explicit content, content involving minors, or any content that violates applicable laws. You are solely responsible for the content you share and must respect the boundaries and privacy of other users.`,
  },
  {
    title: "6. Privacy",
    content: `Your use of Stinkrz is also governed by our Privacy Policy, which is incorporated into these Terms by reference. Please review our Privacy Policy to understand our practices regarding your personal data, including location information.`,
  },
  {
    title: "7. Location & Visibility",
    content: `Stinkrz uses your location to show nearby users on the Scent Block map. Location sharing is optional but required for core App functionality. You can enable "Approximate Location" mode in your profile to share only a general area (~½ mile radius) rather than precise coordinates. You can also enable "Invisible Mode" to hide yourself from the map entirely while still browsing other users. Your approximate online status and last-active time may be shown to other users.`,
  },
  {
    title: "8. Disclaimers",
    content: `Stinkrz is provided "as is" without warranties of any kind. We do not verify user identities or the accuracy of profile information. We are not responsible for the actions of other users. Use caution and good judgment when meeting people you connect with through the App.`,
  },
  {
    title: "9. Limitation of Liability",
    content: `To the fullest extent permitted by law, Stinkrz shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the App, including but not limited to personal injury, property damage, or emotional distress resulting from interactions with other users.`,
  },
  {
    title: "10. Termination",
    content: `We reserve the right to suspend or terminate your access to Stinkrz at any time, for any reason, including violation of these Terms. You may also delete your account at any time from within the App's Settings.`,
  },
  {
    title: "11. Governing Law",
    content: `These Terms shall be governed by and construed in accordance with the laws of the United States. Any disputes arising from these Terms or your use of the App shall be resolved through binding arbitration or in a court of competent jurisdiction.`,
  },
  {
    title: "12. Contact",
    content: `If you have questions about these Terms, please contact us through the Help page.`,
  },
];

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
        <ArrowLeft className="w-4 h-4" /> Back to Home
      </Link>

      <h1 className="font-heading text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="font-body text-sm text-muted-foreground mb-10">Last updated: August 2026</p>

      <p className="font-body text-sm text-muted-foreground leading-relaxed mb-8">
        Welcome to Stinkrz. Please read these Terms of Service carefully before using our platform. These terms govern your access to and use of the Stinkrz application and services.
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