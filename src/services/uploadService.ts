import { supabase } from "../lib/supabase";
import type { UploadHistory, ActivityLog, NewUploadHistory, NewActivityLog } from "../lib/types";

// 获取上传历史
export async function getUploadHistory(userId: string): Promise<UploadHistory[]> {
  const { data, error } = await supabase
    .from("upload_history")
    .select("*")
    .eq("user_id", userId)
    .order("upload_time", { ascending: false });

  if (error || !data) return [];
  return data as UploadHistory[];
}

// 新增上传记录
export async function addUploadRecord(userId: string, record: NewUploadHistory): Promise<string | null> {
  const { data, error } = await supabase
    .from("upload_history")
    .insert({ ...record, user_id: userId })
    .select("id")
    .single();

  if (error || !data) {
    console.error("addUploadRecord error:", error);
    return null;
  }

  // 记录操作日志
  await supabase.from("activity_logs").insert({
    user_id: userId,
    action: "截图上传",
    description: `上传了文件 ${record.file_name}`,
    actor: "投资者",
    type: "upload",
  });

  return (data as { id: string }).id;
}

// 更新上传记录状态
export async function updateUploadStatus(
  id: string,
  status: UploadHistory["status"],
  verified: boolean,
  userId: string
): Promise<boolean> {
  const { error } = await supabase
    .from("upload_history")
    .update({ status, verified })
    .eq("id", id);

  if (!error) {
    await supabase.from("activity_logs").insert({
      user_id: userId,
      action: "数据校对",
      description: `更新了上传记录状态为：${status}`,
      actor: "投资者",
      type: "verify",
    });
  }

  return !error;
}

// 获取操作日志
export async function getActivityLogs(userId: string): Promise<ActivityLog[]> {
  const { data, error } = await supabase
    .from("activity_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data as ActivityLog[];
}

// 新增操作日志
export async function addActivityLog(userId: string, log: NewActivityLog): Promise<void> {
  await supabase.from("activity_logs").insert({ ...log, user_id: userId });
}

// 获取数据管理 KPI 统计
export async function getDataManagementStats(userId: string) {
  const { data } = await supabase
    .from("upload_history")
    .select("status, records_count")
    .eq("user_id", userId);

  if (!data || data.length === 0) {
    return { total: 0, successRate: 0, pending: 0, totalRecords: 0 };
  }

  const uploads = data as { status: string; records_count: number }[];
  const total = uploads.length;
  const success = uploads.filter((u) => u.status === "已解析").length;
  const pending = uploads.filter((u) => u.status === "待校对").length;
  const totalRecords = uploads.reduce((sum, u) => sum + (u.records_count ?? 0), 0);

  return {
    total,
    successRate: total > 0 ? Math.round((success / total) * 1000) / 10 : 0,
    pending,
    totalRecords,
  };
}
