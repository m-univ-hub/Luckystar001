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
    // 移除 day_profit_loss，以防止 Supabase Schema 中未创建此列时导致全面报错
    const sanitizedPositions = positions.map(p => {
      const { day_profit_loss, ...rest } = p;
      return { ...rest, user_id: userId, daily_record_id: recordId };
    });
    const { error: posError } = await supabase.from("positions").insert(sanitizedPositions);
    if (posError) console.error("addDailyRecord error (positions):", posError);
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

// 更新日记录（支持更新记录主体、新增、更新、删除关联交易）
export async function updateDailyRecord(
  userId: string,
  recordId: string,
  recordUpdates: Partial<NewDailyRecord>,
  tradesToAdd: NewTrade[],
  tradesToUpdate: (Partial<NewTrade> & { id: string })[],
  tradeIdsToDelete: string[],
  positionsToAdd: NewPosition[] = [],      // 暂保留 positions 参数，以防将来需要
  positionsToUpdate: (Partial<NewPosition> & { id: string })[] = [],
  positionIdsToDelete: string[] = []
): Promise<boolean> {
  // 1. 更新日记录本身
  if (Object.keys(recordUpdates).length > 0) {
    const { error: recordError } = await supabase
      .from("daily_records")
      .update({ ...recordUpdates, updated_at: new Date().toISOString() })
      .eq("id", recordId)
      .eq("user_id", userId);

    if (recordError) {
      console.error("updateDailyRecord error (record):", recordError);
      return false;
    }
  }

  // 2. 删除需要删除的 trades
  if (tradeIdsToDelete.length > 0) {
    const { error: deleteTradesError } = await supabase
      .from("trades")
      .delete()
      .in("id", tradeIdsToDelete)
      .eq("user_id", userId);
    if (deleteTradesError) console.error("updateDailyRecord error (delete trades):", deleteTradesError);
  }

  // 3. 更新需要更新的 trades
  if (tradesToUpdate.length > 0) {
    for (const trade of tradesToUpdate) {
      const { id, ...updates } = trade;
      const { error: updateTradeError } = await supabase
        .from("trades")
        .update(updates)
        .eq("id", id)
        .eq("user_id", userId);
      if (updateTradeError) console.error("updateDailyRecord error (update trade):", updateTradeError);
    }
  }

  // 4. 新增 trades
  if (tradesToAdd.length > 0) {
    const { error: addTradesError } = await supabase
      .from("trades")
      .insert(tradesToAdd.map(t => ({ ...t, user_id: userId, daily_record_id: recordId })));
    if (addTradesError) console.error("updateDailyRecord error (add trades):", addTradesError);
  }

  // 5. 删除需要删除的 positions
  if (positionIdsToDelete.length > 0) {
    const { error: deletePosError } = await supabase
      .from("positions")
      .delete()
      .in("id", positionIdsToDelete)
      .eq("user_id", userId);
    if (deletePosError) console.error("updateDailyRecord error (delete positions):", deletePosError);
  }

  // 6. 更新需要更新的 positions
  if (positionsToUpdate.length > 0) {
    for (const pos of positionsToUpdate) {
      // 提取不需要或可能不存在的字段
      const { id, day_profit_loss, ...updates } = pos;
      const { error: updatePosError } = await supabase
        .from("positions")
        .update(updates)
        .eq("id", id)
        .eq("user_id", userId);
      if (updatePosError) console.error("updateDailyRecord error (update position):", updatePosError);
    }
  }

  // 7. 新增 positions
  if (positionsToAdd.length > 0) {
    // 移除 day_profit_loss 以防用户数据库尚未加此字段导致报错
    const sanitizedPositions = positionsToAdd.map(p => {
      const { day_profit_loss, ...rest } = p;
      return { ...rest, user_id: userId, daily_record_id: recordId };
    });
    const { error: addPosError } = await supabase
      .from("positions")
      .insert(sanitizedPositions);
    if (addPosError) console.error("updateDailyRecord error (add positions):", addPosError);
  }

  // 8. 记录操作日志
  await supabase.from("activity_logs").insert({
    user_id: userId,
    action: "编辑记录",
    description: `更新了交易日记录`,
    actor: "投资者",
    type: "edit",
  });

  return true;
}

// 删除日记录（由于外键设置，如果数据库配置了 cascades delete 或者手动删除关联数据）
// 假设数据库已经设置了 onDelete: 'CASCADE' 给 trades 和 positions
export async function deleteDailyRecord(id: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("daily_records")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
    
  if (error) {
    console.error("deleteDailyRecord error:", error);
    return false;
  }

  // 记录操作日志
  await supabase.from("activity_logs").insert({
    user_id: userId,
    action: "删除记录",
    description: `删除了交易日记录`,
    actor: "投资者",
    type: "edit",
  });

  return true;
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
