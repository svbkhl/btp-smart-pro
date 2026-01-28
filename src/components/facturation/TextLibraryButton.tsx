import { BookText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export const TextLibraryButton = () => {
  const navigate = useNavigate();

  return (
    <Button
      variant="outline"
      onClick={() => navigate("/text-library")}
      className="flex items-center gap-2"
    >
      <BookText className="h-4 w-4" />
      Bibliothèque de phrases
    </Button>
  );
};
