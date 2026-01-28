import { PageLayout } from "@/components/layout/PageLayout";
import { TextLibraryManager } from "@/components/text-library/TextLibraryManager";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const TextLibrary = () => {
  const navigate = useNavigate();

  return (
    <PageLayout>
      <div className="p-3 sm:p-3 sm:p-4 md:p-6 lg:p-8 space-y-4 sm:space-y-4 sm:space-y-6 md:space-y-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Button>
        <TextLibraryManager />
      </div>
    </PageLayout>
  );
};

export default TextLibrary;
