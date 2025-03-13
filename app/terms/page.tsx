import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="container mx-auto py-10 px-4">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Terms of Service</CardTitle>
          <CardDescription>Last updated: March 9, 2025</CardDescription>
        </CardHeader>
        <CardContent className="prose dark:prose-invert">
          <h2>1. Introduction</h2>
          <p>
            Welcome to TAUMine. These Terms of Service govern your use of our website and services.
            By accessing or using TAUMine, you agree to be bound by these Terms.
          </p>

          <h2>2. Account Registration</h2>
          <p>
            To use certain features of TAUMine, you must register for an account. You agree to provide
            accurate, current, and complete information during the registration process and to update
            such information to keep it accurate, current, and complete.
          </p>

          <h2>3. Pioneer Numbers</h2>
          <p>
            Pioneer numbers are assigned to eligible users on a first-come, first-served basis.
            Pioneer numbers are unique identifiers within the TAUMine ecosystem and may confer
            certain benefits as outlined in our documentation.
          </p>

          <h2>4. Referral Program</h2>
          <p>
            Users may participate in our referral program subject to additional terms that may be
            provided. Referral benefits are subject to verification and may be modified or terminated
            at any time.
          </p>

          <h2>5. Privacy</h2>
          <p>
            Your privacy is important to us. Please review our <a href="/privacy">Privacy Policy</a> to
            understand how we collect, use, and disclose information about you.
          </p>

          <h2>6. Changes to Terms</h2>
          <p>
            We may modify these Terms at any time. We will provide notice of any material changes as
            required by applicable law. Your continued use of TAUMine after any changes indicates your
            acceptance of the modified Terms.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
