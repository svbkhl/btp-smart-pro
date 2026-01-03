import type { UserStats } from "@/hooks/useUserStats";

export const FAKE_USER_STATS: UserStats = {
  id: "fake-stats-1",
  user_id: "fake-user-1",
  total_projects: 12,
  total_clients: 8,
  total_revenue: 125000,
  total_profit: 45000,
  active_projects: 5,
  completed_projects: 7,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};




















