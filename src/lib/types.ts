// =============================================
// Luckystar 数据库类型定义（与 supabase/schema.sql 对应）
// =============================================

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  initial_capital: number;
  created_at: string;
  updated_at: string;
}

export interface DailyRecord {
  id: string;
  user_id: string;
  date: string; // YYYY-MM-DD
  day_of_week: string;
  is_trade_day: boolean;
  total_assets: number;
  cash_balance: number;
  total_market_value: number;
  day_profit_loss: number;
  day_return_rate: number;
  cumulative_return: number;
  notes: string;
  created_at: string;
  updated_at: string;
  // 关联
  trades?: Trade[];
  positions?: Position[];
}

export interface Trade {
  id: string;
  user_id: string;
  daily_record_id: string | null;
  date: string;
  time: string;
  stock: string;
  code: string;
  type: "买入" | "卖出" | "加仓" | "减仓";
  shares: number;
  price: number;
  amount: number;
  commission: number;
  profit_loss: number | null;
  profit_rate: number | null;
  created_at: string;
}

export interface Position {
  id: string;
  user_id: string;
  daily_record_id: string | null;
  date: string;
  stock: string;
  code: string;
  shares: number;
  avg_price: number;
  current_price: number;
  profit_loss: number;
  profit_rate: number;
  market_value: number;
  created_at: string;
}

export interface UploadHistory {
  id: string;
  user_id: string;
  file_name: string;
  file_path: string | null;
  upload_time: string;
  status: "待解析" | "已解析" | "待校对" | "解析失败";
  records_count: number;
  ocr_accuracy: number;
  verified: boolean;
  error: string | null;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  action: string;
  description: string;
  actor: string;
  type: "upload" | "parse" | "verify" | "edit" | "export" | "other";
  created_at: string;
}

// 表单输入类型
export type NewDailyRecord = Omit<DailyRecord, "id" | "user_id" | "created_at" | "updated_at" | "trades" | "positions">;
export type NewTrade = Omit<Trade, "id" | "user_id" | "created_at">;
export type NewPosition = Omit<Position, "id" | "user_id" | "created_at">;
export type NewUploadHistory = Omit<UploadHistory, "id" | "user_id" | "created_at">;
export type NewActivityLog = Omit<ActivityLog, "id" | "user_id" | "created_at">;
