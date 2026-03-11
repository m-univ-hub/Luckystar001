import { useState, useEffect } from "react";
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  PieChart,
  Plus,
  ChevronDown,
  ChevronRight,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  StickyNote,
  X,
  Loader2,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { getDailyRecords, addDailyRecord, getWeeklySummary } from "../../services/recordsService";
import type { DailyRecord, Trade, Position } from "../../lib/types";

const DAY_OF_WEEK = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

function ReturnBadge({ rate }: { rate: number }) {
  if (rate === 0) return <span className="text-xs text-slate-500 tabular-nums">0.00%</span>;
  const positive = rate > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs tabular-nums ${positive ? "text-emerald-400" : "text-rose-400"}`}>
      {positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
      {positive ? "+" : ""}{rate.toFixed(2)}%
    </span>
  );
}

function DayCard({ record }: { record: DailyRecord }) {
  const [expanded, setExpanded] = useState(false);
  const pl = record.day_profit_loss;

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-blue-400/70" />
            <span className="text-base text-white tabular-nums">{record.date}</span>
            <span className="text-xs text-slate-500">{record.day_of_week}</span>
            {!record.is_trade_day && (
              <span className="text-[10px] text-slate-600 glass-badge px-1.5 py-0.5 rounded">休市</span>
            )}
          </div>
          {record.trades && record.trades.length > 0 && (
            <span className="text-[10px] text-blue-400 glass-badge px-2 py-0.5 rounded-full">
              {record.trades.length} 笔交易
            </span>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-[10px] text-slate-500 mb-0.5">日收益率</div>
            <div className={`text-base tabular-nums ${
              record.day_return_rate > 0 ? "text-emerald-400" :
              record.day_return_rate < 0 ? "text-rose-400" : "text-slate-400"
            }`}>
              {record.day_return_rate > 0 ? "+" : ""}{record.day_return_rate.toFixed(2)}%
            </div>
          </div>
          <div className="text-right min-w-[80px]">
            <div className="text-[10px] text-slate-500 mb-0.5">日盈亏</div>
            <div className={`text-base tabular-nums ${pl > 0 ? "text-emerald-400" : pl < 0 ? "text-rose-400" : "text-slate-400"}`}>
              {pl > 0 ? "+" : ""}¥{pl.toLocaleString()}
            </div>
          </div>
          <div className="text-right min-w-[90px] hidden sm:block">
            <div className="text-[10px] text-slate-500 mb-0.5">总资产</div>
            <div className="text-base text-white tabular-nums">¥{record.total_assets.toLocaleString()}</div>
          </div>
          <div className="text-right hidden md:block">
            <div className="text-[10px] text-slate-500 mb-0.5">累计收益</div>
            <ReturnBadge rate={record.cumulative_return} />
          </div>
          {expanded ? <ChevronDown className="w-4 h-4 text-slate-500 ml-2" /> : <ChevronRight className="w-4 h-4 text-slate-500 ml-2" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-blue-500/10">
          <div className="p-5 grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* 左：交易 + 复盘 */}
            <div className="lg:col-span-2 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <h4 className="text-sm text-slate-300">交易记录</h4>
                </div>
                {record.trades && record.trades.length > 0 ? (
                  <div className="space-y-2">
                    {record.trades.map((trade: Trade) => (
                      <div key={trade.id} className="glass-panel rounded-lg p-4 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                              trade.type === "买入" || trade.type === "加仓"
                                ? "bg-rose-500/10 border border-rose-500/20"
                                : "bg-emerald-500/10 border border-emerald-500/20"
                            }`}>
                              {trade.type === "买入" || trade.type === "加仓" ? (
                                <ArrowDownRight className="w-4 h-4 text-rose-400" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-white">{trade.stock}</span>
                                <span className="text-xs text-slate-500 tabular-nums">{trade.code}</span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded glass-badge ${
                                  trade.type === "买入" || trade.type === "加仓" ? "text-rose-400" : "text-emerald-400"
                                }`}>{trade.type}</span>
                              </div>
                              <span className="text-xs text-slate-500">{trade.time}</span>
                            </div>
                          </div>
                          {trade.profit_loss !== null && trade.profit_loss !== undefined && (
                            <div className="text-right">
                              <div className={`text-sm tabular-nums ${trade.profit_loss > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                {trade.profit_loss > 0 ? "+" : ""}¥{trade.profit_loss.toLocaleString()}
                              </div>
                              <div className={`text-xs tabular-nums ${trade.profit_rate && trade.profit_rate > 0 ? "text-emerald-400" : "text-rose-400"}`}>
                                {trade.profit_rate && trade.profit_rate > 0 ? "+" : ""}{trade.profit_rate?.toFixed(2)}%
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-4 gap-3 pt-3 border-t border-blue-500/5">
                          <div><div className="text-[10px] text-slate-600 mb-0.5">价格</div><div className="text-xs text-slate-300 tabular-nums">¥{trade.price.toFixed(2)}</div></div>
                          <div><div className="text-[10px] text-slate-600 mb-0.5">数量</div><div className="text-xs text-slate-300 tabular-nums">{trade.shares}股</div></div>
                          <div><div className="text-[10px] text-slate-600 mb-0.5">金额</div><div className="text-xs text-slate-300 tabular-nums">¥{trade.amount.toLocaleString()}</div></div>
                          <div><div className="text-[10px] text-slate-600 mb-0.5">佣金</div><div className="text-xs text-slate-300 tabular-nums">¥{trade.commission.toFixed(2)}</div></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="glass-panel rounded-lg p-6 text-center">
                    <Minus className="w-5 h-5 text-slate-600 mx-auto mb-2" />
                    <p className="text-xs text-slate-500">当日无交易操作</p>
                  </div>
                )}
              </div>

              {record.notes && (
                <div className="glass-panel rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <StickyNote className="w-3.5 h-3.5 text-amber-400/70" />
                    <span className="text-xs text-slate-400">复盘备注</span>
                  </div>
                  <p className="text-sm text-slate-300/90 leading-relaxed">{record.notes}</p>
                </div>
              )}
            </div>

            {/* 右：持仓 + 资金 */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Percent className="w-4 h-4 text-violet-400" />
                  <h4 className="text-sm text-slate-300">资金概况</h4>
                </div>
                <div className="glass-panel rounded-lg p-4 space-y-3">
                  <div className="flex justify-between"><span className="text-xs text-slate-500">总资产</span><span className="text-sm text-white tabular-nums">¥{record.total_assets.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-slate-500">持仓市值</span><span className="text-sm text-slate-300 tabular-nums">¥{record.total_market_value.toLocaleString()}</span></div>
                  <div className="flex justify-between"><span className="text-xs text-slate-500">现金余额</span><span className="text-sm text-slate-300 tabular-nums">¥{record.cash_balance.toLocaleString()}</span></div>
                  <div className="border-t border-blue-500/8 pt-3 flex justify-between">
                    <span className="text-xs text-slate-500">仓位比</span>
                    <span className="text-sm text-blue-400 tabular-nums">
                      {record.total_assets > 0 ? ((record.total_market_value / record.total_assets) * 100).toFixed(1) : "0.0"}%
                    </span>
                  </div>
                  <div className="flex justify-between"><span className="text-xs text-slate-500">日收益率</span><ReturnBadge rate={record.day_return_rate} /></div>
                  <div className="flex justify-between"><span className="text-xs text-slate-500">累计收益率</span><ReturnBadge rate={record.cumulative_return} /></div>
                </div>
              </div>

              {record.positions && record.positions.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <PieChart className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-sm text-slate-300">持仓明细</h4>
                  </div>
                  <div className="space-y-2">
                    {record.positions.map((pos: Position) => (
                      <div key={pos.id} className="glass-panel rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="text-sm text-white">{pos.stock}</div>
                            <div className="text-[10px] text-slate-500 tabular-nums">{pos.code}</div>
                          </div>
                          <div className="text-right">
                            <div className={`text-sm tabular-nums ${pos.profit_loss > 0 ? "text-emerald-400" : pos.profit_loss < 0 ? "text-rose-400" : "text-slate-400"}`}>
                              {pos.profit_loss > 0 ? "+" : ""}¥{pos.profit_loss.toLocaleString()}
                            </div>
                            <ReturnBadge rate={pos.profit_rate} />
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[10px] pt-2 border-t border-blue-500/5">
                          <div><span className="text-slate-600">持仓 </span><span className="text-slate-400 tabular-nums">{pos.shares}股</span></div>
                          <div><span className="text-slate-600">成本 </span><span className="text-slate-400 tabular-nums">¥{pos.avg_price.toFixed(2)}</span></div>
                          <div><span className="text-slate-600">现价 </span><span className="text-slate-400 tabular-nums">¥{pos.current_price.toFixed(2)}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// 新增记录弹窗
// =============================================
interface AddRecordModalProps {
  onClose: () => void;
  onSaved: () => void;
  userId: string;
}

function AddRecordModal({ onClose, onSaved, userId }: AddRecordModalProps) {
  const today = new Date().toISOString().split("T")[0];
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [totalAssets, setTotalAssets] = useState("");
  const [cashBalance, setCashBalance] = useState("");
  const [dayPL, setDayPL] = useState("");
  const [dayReturn, setDayReturn] = useState("");
  const [cumulativeReturn, setCumulativeReturn] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!date) { setError("请填写日期"); return; }
    if (!totalAssets) { setError("请填写总资产"); return; }
    setSaving(true);
    setError("");

    const d = new Date(date);
    const result = await addDailyRecord(userId, {
      date,
      day_of_week: DAY_OF_WEEK[d.getDay()],
      is_trade_day: true,
      total_assets: parseFloat(totalAssets) || 0,
      cash_balance: parseFloat(cashBalance) || 0,
      total_market_value: (parseFloat(totalAssets) || 0) - (parseFloat(cashBalance) || 0),
      day_profit_loss: parseFloat(dayPL) || 0,
      day_return_rate: parseFloat(dayReturn) || 0,
      cumulative_return: parseFloat(cumulativeReturn) || 0,
      notes,
    }, [], []);

    setSaving(false);
    if (result) {
      onSaved();
      onClose();
    } else {
      setError("保存失败，请检查 Supabase 配置");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="glass-card rounded-2xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base text-white">新增交易日记录</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">日期 *</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2.5 rounded-lg glass-input text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">总资产 (¥) *</label>
              <input type="number" value={totalAssets} onChange={e => setTotalAssets(e.target.value)} placeholder="118500" className="w-full px-3 py-2.5 rounded-lg glass-input text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">现金余额 (¥)</label>
              <input type="number" value={cashBalance} onChange={e => setCashBalance(e.target.value)} placeholder="17775" className="w-full px-3 py-2.5 rounded-lg glass-input text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">日盈亏 (¥)</label>
              <input type="number" value={dayPL} onChange={e => setDayPL(e.target.value)} placeholder="1250" className="w-full px-3 py-2.5 rounded-lg glass-input text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">日收益率 (%)</label>
              <input type="number" value={dayReturn} onChange={e => setDayReturn(e.target.value)} placeholder="1.06" step="0.01" className="w-full px-3 py-2.5 rounded-lg glass-input text-sm" />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">累计收益率 (%)</label>
              <input type="number" value={cumulativeReturn} onChange={e => setCumulativeReturn(e.target.value)} placeholder="18.5" step="0.01" className="w-full px-3 py-2.5 rounded-lg glass-input text-sm" />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">复盘备注</label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="今日市场行情分析，操作复盘..." className="w-full px-3 py-2.5 rounded-lg glass-input text-sm resize-none" />
          </div>

          {error && <p className="text-xs text-rose-400">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button onClick={onClose} className="flex-1 glass-button py-2.5 rounded-lg text-sm text-white">取消</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 glass-button-primary py-2.5 rounded-lg text-sm text-white flex items-center justify-center gap-2 disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "保存"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// Records 主组件
// =============================================
export function Records() {
  const { user } = useAuth();
  const [records, setRecords] = useState<DailyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [weeklySummary, setWeeklySummary] = useState({ totalTrades: 0, weeklyProfit: 0, weeklyReturn: 0, winRate: 0 });

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [recs, summary] = await Promise.all([
      getDailyRecords(user!.id),
      getWeeklySummary(user!.id),
    ]);
    setRecords(recs);
    setWeeklySummary(summary);
    setLoading(false);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {showModal && (
        <AddRecordModal
          userId={user!.id}
          onClose={() => setShowModal(false)}
          onSaved={loadData}
        />
      )}

      {/* 头部 */}
      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-5 h-5 text-blue-400" />
            <h1 className="text-2xl text-white">操作记录</h1>
          </div>
          <p className="text-sm text-slate-500">按交易日查看交易记录、持仓变化与复盘分析</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="glass-button-primary px-4 py-2 rounded-lg text-sm text-white flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          新增记录
        </button>
      </div>

      {/* 汇总条 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card rounded-xl p-4">
          <div className="text-[10px] text-slate-500 mb-1">本周交易</div>
          <div className="text-lg text-white tabular-nums">{weeklySummary.totalTrades} 笔</div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="text-[10px] text-slate-500 mb-1">本周收益</div>
          <div className={`text-lg tabular-nums ${weeklySummary.weeklyProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {weeklySummary.weeklyProfit >= 0 ? "+" : ""}¥{weeklySummary.weeklyProfit.toLocaleString()}
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="text-[10px] text-slate-500 mb-1">记录总数</div>
          <div className="text-lg text-blue-400 tabular-nums">{records.length} 天</div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="text-[10px] text-slate-500 mb-1">胜率</div>
          <div className="text-lg text-blue-400 tabular-nums">{weeklySummary.winRate}%</div>
        </div>
      </div>

      {/* 日记录 */}
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-blue-400 animate-spin mr-2" />
            <span className="text-sm text-slate-500">加载中...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base text-white mb-1">暂无交易记录</h3>
            <p className="text-xs text-slate-500 mb-4">点击"新增记录"开始记录您的交易日记</p>
            <button onClick={() => setShowModal(true)} className="glass-button-primary px-5 py-2 rounded-lg text-sm text-white inline-flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              新增第一条记录
            </button>
          </div>
        ) : (
          records.map((record) => <DayCard key={record.id} record={record} />)
        )}
      </div>
    </div>
  );
}
