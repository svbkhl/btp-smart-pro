import { supabase } from "@/integrations/supabase/client";

export const createPayment = async ({
  quoteId,
  clientEmail,
  provider,
}: {
  quoteId: string;
  clientEmail: string;
  provider: string;
}) => {
  const { data, error } = await supabase
    .from("payments")
    .insert({
      quote_id: quoteId,
      client_email: clientEmail,
      payment_provider: provider,
      paid: false,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};
