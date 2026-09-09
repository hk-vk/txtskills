import type { Metadata } from "next";
import { TrustPage } from "@/components/trust-page";

export const metadata: Metadata = {
  title: "Privacy | txtskills",
  description: "A plain-language overview of data handled by txtskills.",
};

export default function PrivacyPage() {
  return (
    <TrustPage
      title="Privacy"
      intro="A short, plain-language overview of the data handled by this developer tool."
    >
      <p>
        txtskills does not require an account or password. When you convert a documentation URL, the service
        receives that URL so it can fetch and parse the source. When you paste content, the submitted content
        is sent to the conversion service so it can generate the skill. The resulting skill metadata may be
        published to the public skills registry when the conversion flow is configured to publish it.
      </p>
      <p>
        Do not submit secrets, API keys, credentials, private documentation, or personal data that you do not
        want processed. The service is designed for public documentation. Source URLs and generated metadata
        can be visible to people and agents browsing the public registry.
      </p>
      <p>
        The CLI can send installation events containing the skill name, CLI version, operating system, and
        Node.js version. Those events are used for aggregate install counts. Production pages also load Umami
        analytics. This page is an implementation note, not legal advice; review the repository and deployment
        configuration before using txtskills for sensitive or regulated data.
      </p>
    </TrustPage>
  );
}
