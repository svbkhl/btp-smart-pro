import { CreateInvoiceDialog } from "./CreateInvoiceDialog";
import { Quote } from "@/hooks/useQuotes";

interface CreateInvoiceFromQuoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote;
}

export const CreateInvoiceFromQuoteDialog = ({
  open,
  onOpenChange,
  quote,
}: CreateInvoiceFromQuoteDialogProps) => {
  return (
    <CreateInvoiceDialog
      open={open}
      onOpenChange={onOpenChange}
      quoteId={quote.id}
    />
  );
};

