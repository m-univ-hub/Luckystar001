-- =============================================
-- Luckystar 股票交易平台 数据库初始化脚本
-- 在 Supabase Dashboard → SQL Editor 中执行
-- =============================================

-- 1. 用户信息表（关联 auth.users）
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  display_name TEXT,
  initial_capital NUMERIC(15, 2) DEFAULT 100000.00,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 每日交易日记表
CREATE TABLE IF NOT EXISTS public.daily_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  day_of_week TEXT NOT NULL,
  is_trade_day BOOLEAN DEFAULT TRUE,
  -- 资金汇总
  total_assets NUMERIC(15, 2) DEFAULT 0,
  cash_balance NUMERIC(15, 2) DEFAULT 0,
  total_market_value NUMERIC(15, 2) DEFAULT 0,
  -- 收益汇总
  day_profit_loss NUMERIC(15, 2) DEFAULT 0,
  day_return_rate NUMERIC(8, 4) DEFAULT 0,
  cumulative_return NUMERIC(8, 4) DEFAULT 0,
  -- 复盘备注
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- 3. 交易记录表
CREATE TABLE IF NOT EXISTS public.trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_record_id UUID REFERENCES public.daily_records(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  time TEXT NOT NULL DEFAULT '09:30',
  stock TEXT NOT NULL,
  code TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('买入', '卖出', '加仓', '减仓')),
  shares INTEGER NOT NULL DEFAULT 0,
  price NUMERIC(12, 4) NOT NULL DEFAULT 0,
  amount NUMERIC(15, 2) NOT NULL DEFAULT 0,
  commission NUMERIC(10, 2) DEFAULT 0,
  profit_loss NUMERIC(15, 2),
  profit_rate NUMERIC(8, 4),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. 持仓明细表（按日快照）
CREATE TABLE IF NOT EXISTS public.positions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  daily_record_id UUID REFERENCES public.daily_records(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  stock TEXT NOT NULL,
  code TEXT NOT NULL,
  shares INTEGER NOT NULL DEFAULT 0,
  avg_price NUMERIC(12, 4) DEFAULT 0,
  current_price NUMERIC(12, 4) DEFAULT 0,
  profit_loss NUMERIC(15, 2) DEFAULT 0,
  profit_rate NUMERIC(8, 4) DEFAULT 0,
  market_value NUMERIC(15, 2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. 截图上传历史表
CREATE TABLE IF NOT EXISTS public.upload_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT,
  upload_time TIMESTAMPTZ DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT '待解析' CHECK (status IN ('待解析', '已解析', '待校对', '解析失败')),
  records_count INTEGER DEFAULT 0,
  ocr_accuracy NUMERIC(5, 2) DEFAULT 0,
  verified BOOLEAN DEFAULT FALSE,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. 操作日志表
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  description TEXT DEFAULT '',
  actor TEXT DEFAULT '投资者',
  type TEXT NOT NULL DEFAULT 'other' CHECK (type IN ('upload', 'parse', 'verify', 'edit', 'export', 'other')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- Row Level Security (RLS) 策略
-- =============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.upload_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- daily_records
CREATE POLICY "Users can CRUD own daily_records" ON public.daily_records FOR ALL USING (auth.uid() = user_id);

-- trades
CREATE POLICY "Users can CRUD own trades" ON public.trades FOR ALL USING (auth.uid() = user_id);

-- positions
CREATE POLICY "Users can CRUD own positions" ON public.positions FOR ALL USING (auth.uid() = user_id);

-- upload_history
CREATE POLICY "Users can CRUD own upload_history" ON public.upload_history FOR ALL USING (auth.uid() = user_id);

-- activity_logs
CREATE POLICY "Users can CRUD own activity_logs" ON public.activity_logs FOR ALL USING (auth.uid() = user_id);

-- =============================================
-- 触发器：新用户注册时自动创建 profile
-- =============================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, SPLIT_PART(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================
-- 视图：仪表板 KPI（按用户计算）
-- =============================================
CREATE OR REPLACE VIEW public.dashboard_kpi AS
SELECT
  user_id,
  MAX(total_assets) as current_assets,
  MAX(cumulative_return) as cumulative_return,
  MIN(day_return_rate) as max_drawdown,
  COUNT(*) FILTER (WHERE is_trade_day = TRUE) as total_trade_days
FROM public.daily_records
GROUP BY user_id;
