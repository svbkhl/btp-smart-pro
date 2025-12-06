import { useCallback, useState } from "react";
import { createPayment } from "@/services/PaymentService";

export const usePayments = () => {
  const [loading, setLoading] = useState(false);

  const generatePayment = useCallback(
    async (payload: {
      quoteId: string;
      clientEmail: string;
      provider: string;
    }) => {
      try {
        setLoading(true);
        return await createPayment(payload);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    generatePayment,
    loading,
  };
};
