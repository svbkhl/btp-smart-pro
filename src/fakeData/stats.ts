import { UserStats } from "@/hooks/useUserStats";

export const FAKE_USER_STATS: UserStats = {
  id: "fake-stats-1",
  user_id: "fake-user",
  total_projects: 8,
  total_clients: 24,
  total_revenue: 45280,
  total_profit: 14500,
  active_projects: 5,
  completed_projects: 3,
  created_at: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
  updated_at: new Date().toISOString(),
};


