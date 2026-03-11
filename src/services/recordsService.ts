import { supabase } from "../lib/supabase";
import type { DailyRecord, Trade, Position, NewDailyRecord, NewTrade, NewPosition } from "../lib/types";

// 获取所有日记录（含交易和持仓）
export async function getDailyRecords(userId: string): Promise<DailyRecord[]> {
  const { data: records, error } = await supabase
    .from("daily_records")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false });

  if (error || !records) return [];

  // 为每条日记录加载关联的 trades 和 positions
  const enriched = await Promise.all(
    records.map(async (rec: DailyRecord) => {
      const [{ data: trades }, { data: positions }] = await Promise.all([
        supabase
          .from("trades")
          .select("*")
          .eq("daily_record_id", rec.id)
          .order("time", { ascending: true }),
        supabase
          .from("positions")
          .select("*")
          .eq("daily_record_id", rec.id),
      ]);
      return {
        ...rec,
        trades: (trades ?? []) as Trade[],
        positions: (positions ?? []) as Position[],
      };
    })
  );

  return enriched;
}

// 新增一条日记录
export async function addDailyRecord(
  userId: string,
  record: NewDailyRecord,
  trades: NewTrade[],
  positions: NewPosition[]
): Promise<{ id: string } | null> {
  // 插入日记录
  const { data, error } = await supabase
    .from("daily_records")
    .insert({ ...record, user_id: userId })
    .select("id")
    .single();

  if (error || !data) {
    console.error("addDailyRecord error:", error);
    return null;
  }

  const recordId = data.id as string;

  // 插入交易记录
  if (trades.length > 0) {
    await supabase.from("trades").insert(
      trades.map((t) => ({ ...t, user_id: userId, daily_record_id: recordId }))
    );
  }

  // 插入持仓明细
  if (positions.length > 0) {
    await supabase.from("positions").insert(
      positions.map((p) => ({ ...p, user_id: userId, daily_record_id: recordId }))
    );
  }

  // 记录操作日志
  await supabase.from("activity_logs").insert({
    user_id: userId,
    action: "新增记录",
    description: `创建了 ${record.date} 的交易日记录`,
    actor: "投资者",
    type: "edit",
  });

  return { id: recordId };
}

// 更新日记录备注
export async function updateDailyRecordNotes(id: string, notes: string): Promise<boolean> {
  const { error } = await supabase
    .from("daily_records")
    .update({ notes, updated_at: new Date().toISOString() })
    .eq("id", id);
  return !error;
}

// 删除日记录（级联删除 trades/positions）
export async function deleteDailyRecord(id: string): Promise<boolean> {
  const { error } = await supabase.from("daily_records").delete().eq("id", id);
  return !error;
}

// 获取周汇总统计
export async function getWeeklySummary(userId: string) {
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const startDate = oneWeekAgo.toISOString().split("T")[0];

  const { data } = await supabase
    .from("trades")
    .select("profit_loss")
    .eq("user_id", userId)
    .gte("date", startDate);

  if (!data || data.length === 0) {
    return { totalTrades: 0, weeklyProfit: 0, weeklyReturn: 0, winRate: 0 };
  }

  const trades = data as { profit_loss: number | null }[];
  const closedTrades = trades.filter((t) => t.profit_loss !== null);
  const totalProfit = closedTrades.reduce((sum, t) => sum + (t.profit_loss ?? 0), 0);
  const winCount = closedTrades.filter((t) => (t.profit_loss ?? 0) > 0).length;

  return {
    totalTrades: trades.length,
    weeklyProfit: totalProfit,
    weeklyReturn: 0, // 需要结合资产数据计算
    winRate: closedTrades.length > 0 ? Math.round((winCount / closedTrades.length) * 100) : 0,
  };
}
