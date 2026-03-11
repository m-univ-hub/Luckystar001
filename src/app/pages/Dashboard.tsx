import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Zap,
  BarChart3,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useAuth } from "../contexts/AuthContext";
import {
  getDashboardKPI,
  getInitialCapital,
  getProfitChartData,
  getRecentTrades,
  getLatestPositions,
  getMaxDrawdownInfo,
} from "../../services/dashboardService";
import type { Trade, Position } from "../../lib/types";

// 持仓颜色列表
const POSITION_COLORS = [
  "from-blue-400 to-cyan-400",
  "from-emerald-400 to-teal-400",
  "from-violet-400 to-purple-400",
  "from-amber-400 to-orange-400",
  "from-rose-400 to-pink-400",
  "from-slate-400 to-slate-500",
];

function SkeletonLine({ w = "full" }: { w?: string }) {
  return <div className={`h-4 bg-white/[0.04] rounded animate-pulse w-${w}`} />;
}

export function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<{ date: string; value: number }[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [kpi, setKpi] = useState({
    cumulativeReturn: 0,
    annualizedReturn: 0,
    maxDrawdown: 0,
    maxDrawdownDate: "",
    totalAssets: 0,
    initialCapital: 100000,
  });
  const [updatedAt, setUpdatedAt] = useState("");

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [latestKpi, initialCap, chart, trades, pos, drawdown] = await Promise.all([
        getDashboardKPI(user!.id),
        getInitialCapital(user!.id),
        getProfitChartData(user!.id),
        getRecentTrades(user!.id, 5),
        getLatestPositions(user!.id),
        getMaxDrawdownInfo(user!.id),
      ]);

      const totalAssets = latestKpi?.total_assets ?? initialCap;
      const cumReturn = latestKpi?.cumulative_return ?? 0;

      // 简单估算年化（累计收益率 × 365 / 自建仓天数）
      const daysElapsed = chart.length > 0 ? Math.max(chart.length * 7, 1) : 1;
      const annualized = ((1 + cumReturn / 100) ** (365 / daysElapsed) - 1) * 100;

      setKpi({
        cumulativeReturn: cumReturn,
        annualizedReturn: annualized,
        maxDrawdown: drawdown.rate,
        maxDrawdownDate: drawdown.date,
        totalAssets,
        initialCapital: initialCap,
      });

      // 如果数据库为空，使用示例数据展示图表
      if (chart.length === 0) {
        setChartData([{ date: "今日", value: initialCap }]);
      } else {
        setChartData(chart);
      }

      setRecentTrades(trades);
      setPositions(pos);
      setUpdatedAt(new Date().toLocaleString("zh-CN", {
        year: "numeric", month: "2-digit", day: "2-digit",
        hour: "2-digit", minute: "2-digit",
      }));
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const kpiCards = [
    {
      label: "累计收益率",
      value: `${kpi.cumulativeReturn >= 0 ? "+" : ""}${kpi.cumulativeReturn.toFixed(2)}%`,
      sub: `初始 ¥${kpi.initialCapital.toLocaleString()}`,
      subColor: kpi.cumulativeReturn >= 0 ? "text-emerald-400" : "text-rose-400",
      icon: TrendingUp,
      iconColor: "text-emerald-400",
      accent: "from-emerald-500/20 to-emerald-500/5",
      SubIcon: kpi.cumulativeReturn >= 0 ? ArrowUpRight : ArrowDownRight,
    },
    {
      label: "年化收益率",
      value: `${kpi.annualizedReturn >= 0 ? "+" : ""}${kpi.annualizedReturn.toFixed(2)}%`,
      sub: "估算年化",
      subColor: "text-blue-400",
      icon: Activity,
      iconColor: "text-blue-400",
      accent: "from-blue-500/20 to-blue-500/5",
    },
    {
      label: "最大回撤",
      value: `${kpi.maxDrawdown.toFixed(2)}%`,
      sub: kpi.maxDrawdownDate || "暂无数据",
      subColor: "text-rose-400",
      icon: TrendingDown,
      iconColor: "text-rose-400",
      accent: "from-rose-500/20 to-rose-500/5",
      SubIcon: ArrowDownRight,
    },
    {
      label: "账户资产",
      value: `¥${kpi.totalAssets.toLocaleString()}`,
      sub: `初始 ¥${kpi.initialCapital.toLocaleString()}`,
      subColor: "text-slate-400",
      icon: Wallet,
      iconColor: "text-violet-400",
      accent: "from-violet-500/20 to-violet-500/5",
    },
  ];

  // 计算持仓分布百分比
  const totalMarketValue = positions.reduce((s, p) => s + p.market_value, 0);
  const positionSlices = positions.map((p, i) => ({
    name: p.stock,
    pct: totalMarketValue > 0 ? Math.round((p.market_value / totalMarketValue) * 100) : 0,
    color: POSITION_COLORS[i % POSITION_COLORS.length],
  }));
  // 加入现金
  const cashPct = kpi.totalAssets > 0
    ? Math.max(0, Math.round(((kpi.totalAssets - totalMarketValue) / kpi.totalAssets) * 100))
    : 0;
  if (cashPct > 0) {
    positionSlices.push({ name: "现金", pct: cashPct, color: "from-slate-400 to-slate-500" });
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* 头部 */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Zap className="w-5 h-5 text-blue-400" />
            <h1 className="text-2xl text-white">工作台</h1>
          </div>
          <p className="text-sm text-slate-500">实时监控投资组合表现</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500">数据更新于</div>
          <div className="text-sm text-slate-400">{updatedAt || "—"}</div>
        </div>
      </div>

      {/* KPI 指标 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiCards.map((kpi) => (
          <div key={kpi.label} className="glass-card rounded-xl p-5 relative overflow-hidden">
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl ${kpi.accent} rounded-full -translate-y-8 translate-x-8 blur-2xl`} />
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-400 tracking-wide">{kpi.label}</span>
                <kpi.icon className={`w-4 h-4 ${kpi.iconColor}`} />
              </div>
              {loading ? (
                <div className="space-y-2">
                  <SkeletonLine w="3/4" />
                  <SkeletonLine w="1/2" />
                </div>
              ) : (
                <>
                  <div className="text-2xl text-white mb-1 tabular-nums">{kpi.value}</div>
                  <div className={`text-xs ${kpi.subColor} flex items-center gap-1`}>
                    {kpi.SubIcon && <kpi.SubIcon className="w-3 h-3" />}
                    {kpi.sub}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 图表 + 持仓 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 收益曲线 */}
        <div className="lg:col-span-2 glass-card rounded-xl overflow-hidden">
          <div className="p-5 pb-0 flex items-center justify-between">
            <div>
              <h3 className="text-base text-white">收益曲线</h3>
              <p className="text-xs text-slate-500 mt-0.5">资产净值变化趋势</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 glass-badge rounded-full px-2.5 py-1">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 glow-dot text-emerald-400" />
              实时
            </div>
          </div>
          <div className="p-5 pt-3">
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="dashboardAreaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid key="grid" strokeDasharray="3 3" stroke="rgba(100,160,255,0.06)" vertical={false} />
                <XAxis key="xaxis" dataKey="date" stroke="rgba(148,163,184,0.4)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis key="yaxis" stroke="rgba(148,163,184,0.4)" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}万`} />
                <Tooltip
                  key="tooltip"
                  contentStyle={{
                    background: "rgba(10, 20, 50, 0.9)",
                    border: "1px solid rgba(100,160,255,0.2)",
                    borderRadius: "8px",
                    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                    backdropFilter: "blur(16px)",
                    color: "#e2e8f0",
                    fontSize: 12,
                  }}
                  formatter={(value: number) => [`¥${value.toLocaleString()}`, "净值"]}
                  labelStyle={{ color: "#94a3b8" }}
                />
                <Area
                  key="area"
                  type="monotone"
                  dataKey="value"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  fill="url(#dashboardAreaGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: "#3b82f6", stroke: "#1e3a5f", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 持仓分布 */}
        <div className="glass-card rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base text-white">持仓分布</h3>
              <p className="text-xs text-slate-500 mt-0.5">当前资产配置</p>
            </div>
            <BarChart3 className="w-4 h-4 text-slate-500" />
          </div>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i}>
                  <div className="flex justify-between mb-1.5">
                    <SkeletonLine w="1/3" />
                    <SkeletonLine w="10" />
                  </div>
                  <div className="h-1.5 bg-white/[0.04] rounded-full" />
                </div>
              ))}
            </div>
          ) : positionSlices.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">暂无持仓数据</div>
          ) : (
            <div className="space-y-4">
              {positionSlices.map((p) => (
                <div key={p.name}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-slate-300">{p.name}</span>
                    <span className="text-sm text-slate-400 tabular-nums">{p.pct}%</span>
                  </div>
                  <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${p.color} rounded-full transition-all duration-700`}
                      style={{ width: `${p.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-5 pt-4 border-t border-blue-500/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500">持仓集中度</span>
              <span className="text-amber-400">
                {positionSlices.filter(p => p.name !== "现金").length > 2 ? "较高" : positionSlices.length > 0 ? "适中" : "—"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 近期交易 */}
      <div className="glass-card rounded-xl overflow-hidden">
        <div className="p-5 pb-0 flex items-center justify-between">
          <div>
            <h3 className="text-base text-white">近期交易记录</h3>
            <p className="text-xs text-slate-500 mt-0.5">最近 5 笔操作</p>
          </div>
        </div>
        <div className="p-5 overflow-x-auto">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-4">
                  <SkeletonLine w="1/5" />
                  <SkeletonLine w="1/6" />
                  <SkeletonLine w="1/6" />
                  <SkeletonLine w="1/6" />
                </div>
              ))}
            </div>
          ) : recentTrades.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-500">暂无交易记录</div>
          ) : (
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-blue-500/10">
                  <th className="text-left py-2.5 px-3 text-xs text-slate-500 font-normal">股票</th>
                  <th className="text-left py-2.5 px-3 text-xs text-slate-500 font-normal">代码</th>
                  <th className="text-left py-2.5 px-3 text-xs text-slate-500 font-normal">操作</th>
                  <th className="text-right py-2.5 px-3 text-xs text-slate-500 font-normal">数量</th>
                  <th className="text-right py-2.5 px-3 text-xs text-slate-500 font-normal">价格</th>
                  <th className="text-right py-2.5 px-3 text-xs text-slate-500 font-normal">盈亏</th>
                  <th className="text-right py-2.5 px-3 text-xs text-slate-500 font-normal">日期</th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.map((t) => (
                  <tr key={t.id} className="border-b border-blue-500/5 hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-3 text-sm text-white">{t.stock}</td>
                    <td className="py-3 px-3 text-sm text-slate-500 tabular-nums">{t.code}</td>
                    <td className="py-3 px-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs glass-badge ${
                        t.type === "买入" || t.type === "加仓" ? "text-rose-400" : "text-emerald-400"
                      }`}>
                        <div className={`w-1 h-1 rounded-full ${t.type === "买入" || t.type === "加仓" ? "bg-rose-400" : "bg-emerald-400"}`} />
                        {t.type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-300 text-right tabular-nums">{t.shares}</td>
                    <td className="py-3 px-3 text-sm text-slate-300 text-right tabular-nums">¥{t.price.toFixed(2)}</td>
                    <td className="py-3 px-3 text-sm text-right tabular-nums">
                      {t.profit_loss !== null ? (
                        <span className={t.profit_loss > 0 ? "text-emerald-400" : "text-rose-400"}>
                          {t.profit_loss > 0 ? "+" : ""}¥{t.profit_loss.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-500 text-right">{t.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}