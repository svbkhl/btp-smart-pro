import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";
import { Invoice } from "@/hooks/useInvoices";
import { SendToClientModal } from "@/components/billing/SendToClientModal";

interface SendToClientButtonProps {
  invoice: Invoice;
}

export const SendToClientButton = ({ invoice }: SendToClientButtonProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        variant="outline"
        className="gap-2 rounded-xl"
      >
        <Send className="w-4 h-4" />
        Envoyer au client
      </Button>
      
      <SendToClientModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        documentType="invoice"
        document={invoice}
        onSent={() => {
          setIsModalOpen(false);
        }}
      />
    </>
  );
};



