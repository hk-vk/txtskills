import type { Metadata } from "next";
import Link from "next/link";
import { TrustPage } from "@/components/trust-page";

export const metadata: Metadata = {
  title: "Contact txtskills",
  description: "Contact txtskills through the public GitHub repository.",
};

export default function ContactPage() {
  return (
    <TrustPage
      title="Contact txtskills"
      intro="The public repository is the support channel for questions, bugs, and feature requests."
    >
      <p>
        Open an issue in the <a className="text-foreground underline underline-offset-4" href="https://github.com/hk-vk/txtskills/issues">txtskills GitHub issue tracker</a>.
        This is the best place to report a reproducible problem because it keeps the discussion attached to
        the code and makes the answer useful to other developers. Search existing issues before opening a
        duplicate, and include the page or CLI command that you used.
      </p>
      <p>
        For conversion problems, include the public documentation URL, whether you used Web mode, CLI mode,
        or Agent Skills mode, the command and version, and the relevant error message. Never include API keys,
        access tokens, credentials, private documentation, or other sensitive material in an issue. Redact
        private URLs before posting logs.
      </p>
      <p>
        Product documentation and machine-readable instructions are available from the <Link className="text-foreground underline underline-offset-4" href="/llms.txt">llms.txt guide</Link>.
        The repository also contains the CLI and web application source, so proposed fixes can be discussed
        openly and reviewed with the rest of the project.
      </p>
    </TrustPage>
  );
}
