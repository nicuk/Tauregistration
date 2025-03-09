import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <div className="container mx-auto py-10 px-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Privacy Policy</CardTitle>
          <CardDescription>Last updated: March 9, 2025</CardDescription>
        </CardHeader>
        <CardContent className="prose dark:prose-invert">
          <h2>1. Information We Collect</h2>
          <p>
            We collect information you provide directly to us when you register for an account, 
            including your email address, username, country, and referral information. We also 
            collect information about your use of our services.
          </p>

          <h2>2. How We Use Your Information</h2>
          <p>
            We use the information we collect to:
          </p>
          <ul>
            <li>Provide, maintain, and improve our services</li>
            <li>Process and complete transactions</li>
            <li>Send you technical notices and support messages</li>
            <li>Respond to your comments and questions</li>
            <li>Develop new products and services</li>
            <li>Monitor and analyze trends and usage</li>
          </ul>

          <h2>3. Information Sharing</h2>
          <p>
            We do not share your personal information with third parties except as described in this 
            privacy policy or as required by law.
          </p>

          <h2>4. Security</h2>
          <p>
            We take reasonable measures to help protect information about you from loss, theft, 
            misuse, unauthorized access, disclosure, alteration, and destruction.
          </p>

          <h2>5. Your Choices</h2>
          <p>
            You may update, correct, or delete your account information at any time by logging into 
            your account. If you wish to delete your account, please contact us.
          </p>

          <h2>6. Changes to this Policy</h2>
          <p>
            We may change this privacy policy from time to time. If we make changes, we will notify 
            you by revising the date at the top of the policy.
          </p>

          <h2>7. Contact Us</h2>
          <p>
            If you have any questions about this privacy policy, please contact us at privacy@taumine.com.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
