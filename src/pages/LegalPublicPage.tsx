import { Link, useParams, Navigate } from "react-router-dom";
import {
  PrivacyPolicySection,
  MentionsLegalesSection,
  TermsOfUseSection,
} from "@/components/legal/LegalSections";

const titles: Record<string, string> = {
  "politique-confidentialite": "Politique de confidentialité",
  "mentions-legales": "Mentions légales",
  "conditions-generales": "Conditions générales",
};

export default function LegalPublicPage() {
  const { page } = useParams<{ page: string }>();

  if (page === "politique-cookies") {
    return <Navigate to="/legal/politique-confidentialite" replace />;
  }

  const title = page ? titles[page] : "";

  if (!page || !title) {
    return <Navigate to="/" replace />;
  }

  let body: React.ReactNode;
  if (page === "politique-confidentialite") {
    body = <PrivacyPolicySection />;
  } else if (page === "mentions-legales") {
    body = <MentionsLegalesSection className="border-0 pt-0" />;
  } else if (page === "conditions-generales") {
    body = <TermsOfUseSection className="border-0 pt-0" />;
  } else {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50 px-4 py-3">
        <Link to="/" className="text-sm font-medium text-primary hover:underline">
          ← Retour à l’accueil
        </Link>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-bold tracking-tight">{title}</h1>
        {body}
      </main>
    </div>
  );
}
