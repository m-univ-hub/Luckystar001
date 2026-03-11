import { supabase } from "../lib/supabase";
import type { DailyRecord, Trade, Position } from "../lib/types";

// 获取仪表板 KPI 数据（从最近一条日记录中取）
export async function getDashboardKPI(userId: string) {
  const { data, error } = await supabase
    .from("daily_records")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data as DailyRecord;
}

// 获取初始资金
export async function getInitialCapital(userId: string): Promise<number> {
  const { data } = await supabase
    .from("profiles")
    .select("initial_capital")
    .eq("id", userId)
    .single();
  return data?.initial_capital ?? 100000;
}

// 获取收益曲线数据（最近 30 天）
export async function getProfitChartData(userId: string) {
  const { data, error } = await supabase
    .from("daily_records")
    .select("date, total_assets")
    .eq("user_id", userId)
    .order("date", { ascending: true })
    .limit(60);

  if (error || !data) return [];

  return data.map((r: { date: string; total_assets: number }) => ({
    date: r.date.slice(5), // MM-DD
    value: r.total_assets,
  }));
}

// 获取最近 N 笔交易
export async function getRecentTrades(userId: string, limit = 5): Promise<Trade[]> {
  const { data, error } = await supabase
    .from("trades")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as Trade[];
}

// 获取最新持仓分布（取最近一次日记录的持仓）
export async function getLatestPositions(userId: string): Promise<Position[]> {
  // 先找最新日记录 id
  const { data: latestRecord } = await supabase
    .from("daily_records")
    .select("id")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(1)
    .single();

  if (!latestRecord) return [];

  const { data, error } = await supabase
    .from("positions")
    .select("*")
    .eq("daily_record_id", latestRecord.id);

  if (error || !data) return [];
  return data as Position[];
}

// 获取最大回撤日期
export async function getMaxDrawdownInfo(userId: string) {
  const { data, error } = await supabase
    .from("daily_records")
    .select("date, day_return_rate")
    .eq("user_id", userId)
    .order("day_return_rate", { ascending: true })
    .limit(1)
    .single();

  if (error || !data) return { rate: 0, date: "" };
  return { rate: data.day_return_rate as number, date: data.date as string };
}
