import { PageLayout } from "@/components/layout/PageLayout";
import { PaymentRemindersManager } from "@/components/reminders/PaymentRemindersManager";

const PaymentReminders = () => {
  return (
    <PageLayout title="Relances Clients">
      <PaymentRemindersManager />
    </PageLayout>
  );
};

export default PaymentReminders;
