import { useState, useEffect } from "react";
import {
  Calendar,
  TrendingUp,
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
  Trash2,
  Edit2,
  MoreVertical,
  Briefcase,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { 
  getDailyRecords, 
  addDailyRecord, 
  updateDailyRecord,
  deleteDailyRecord,
  getWeeklySummary 
} from "../../services/recordsService";
import type { DailyRecord, Trade, Position, NewTrade, NewPosition } from "../../lib/types";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../components/ui/alert-dialog";


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

function ProfitLossText({ amount }: { amount: number }) {
  if (amount === 0) return <span className="text-slate-400 tabular-nums">¥0</span>;
  const positive = amount > 0;
  return (
    <span className={`tabular-nums ${positive ? "text-emerald-400" : "text-rose-400"}`}>
      {positive ? "+" : ""}¥{amount.toLocaleString()}
    </span>
  );
}

function ProfitRateText({ rate }: { rate: number }) {
  if (rate === 0) return <span className="text-slate-400 tabular-nums">0.00%</span>;
  const positive = rate > 0;
  return (
    <span className={`tabular-nums ${positive ? "text-emerald-400" : "text-rose-400"}`}>
      {positive ? "+" : ""}{rate.toFixed(2)}%
    </span>
  );
}

function DayCard({ record, onEdit, onDelete }: { record: DailyRecord, onEdit: (r: DailyRecord) => void, onDelete: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 计算属性
  const totalCost = record.total_assets - record.cumulative_return; // 估算初始总成本
  const totalProfit = record.total_assets - 100000; // 假设初始资金 10w，或者取自 profile，此处由于 schema profile 默认是 100000 且暂无记录变动，按总资产-累计收益近似可视为净盈亏。或者直接用累计真实盈亏即可。我们用假定累计盈亏绝对值，如果没有真实数据就用 累计收益率 * 总资产估算
  const totalProfitValue = record.total_assets * (record.cumulative_return / 100); 

  return (
    <>
      <div className="glass-card rounded-xl overflow-hidden group">
        <div className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors border-b border-blue-500/10">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-1 flex items-center gap-4 text-left"
          >
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-400/70" />
              <span className="text-base text-white tabular-nums">{record.date}</span>
              <span className="text-xs text-slate-500">{record.day_of_week}</span>
              {!record.is_trade_day && (
                <span className="text-[10px] text-slate-600 glass-badge px-1.5 py-0.5 rounded">休市</span>
              )}
            </div>
          </button>
          
          <div className="flex items-center gap-2 pl-4">
            <DropdownMenu>
              <DropdownMenuTrigger className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-white/5 rounded-lg text-slate-400 outline-none">
                <MoreVertical className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-32 bg-slate-900 border-slate-800 text-slate-300">
                <DropdownMenuItem className="cursor-pointer hover:bg-slate-800 hover:text-white" onClick={() => onEdit(record)}>
                  <Edit2 className="w-4 h-4 mr-2" />
                  编辑记录
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer text-rose-400 hover:bg-rose-500/10 hover:text-rose-300" onClick={() => setShowDeleteConfirm(true)}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  删除记录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button onClick={() => setExpanded(!expanded)} className="p-1">
              {expanded ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
            </button>
          </div>
        </div>

        {/* 默认总是展示账户信息，不管展不展开 */}
        {!expanded && (
           <div className="p-4 grid grid-cols-4 sm:grid-cols-7 gap-3 text-center sm:text-left items-center cursor-pointer hover:bg-white/[0.01]" onClick={() => setExpanded(!expanded)}>
             <div><div className="text-[10px] text-slate-500 mb-0.5">总资产</div><div className="text-sm text-white tabular-nums">¥{record.total_assets.toLocaleString()}</div></div>
             <div className="hidden sm:block"><div className="text-[10px] text-slate-500 mb-0.5">总市值</div><div className="text-sm text-slate-300 tabular-nums">¥{record.total_market_value.toLocaleString()}</div></div>
             <div className="hidden sm:block"><div className="text-[10px] text-slate-500 mb-0.5">可用资金</div><div className="text-sm text-slate-300 tabular-nums">¥{record.cash_balance.toLocaleString()}</div></div>
             <div><div className="text-[10px] text-slate-500 mb-0.5">当日盈亏</div><div className="text-sm"><ProfitLossText amount={record.day_profit_loss} /></div></div>
             <div><div className="text-[10px] text-slate-500 mb-0.5">当日盈亏率</div><div className="text-sm"><ProfitRateText rate={record.day_return_rate} /></div></div>
             <div className="hidden sm:block"><div className="text-[10px] text-slate-500 mb-0.5">总盈亏</div><div className="text-sm"><ProfitLossText amount={totalProfitValue} /></div></div>
             <div><div className="text-[10px] text-slate-500 mb-0.5">总收益率</div><div className="text-sm"><ProfitRateText rate={record.cumulative_return} /></div></div>
           </div>
        )}

        {expanded && (
          <div className="p-5 space-y-6">
            {/* 1. 账户信息 */}
            <div>
               <div className="flex items-center gap-2 mb-3">
                 <Briefcase className="w-4 h-4 text-violet-400" />
                 <h4 className="text-sm text-slate-300">账户信息</h4>
               </div>
               <div className="glass-panel rounded-lg p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                 <div><div className="text-[10px] text-slate-500 mb-1">总资产</div><div className="text-base text-white tabular-nums">¥{record.total_assets.toLocaleString()}</div></div>
                 <div><div className="text-[10px] text-slate-500 mb-1">总市值</div><div className="text-base text-slate-300 tabular-nums">¥{record.total_market_value.toLocaleString()}</div></div>
                 <div><div className="text-[10px] text-slate-500 mb-1">可用现金</div><div className="text-base text-slate-300 tabular-nums">¥{record.cash_balance.toLocaleString()}</div></div>
                 <div><div className="text-[10px] text-slate-500 mb-1">仓位比</div><div className="text-base text-blue-400 tabular-nums">{record.total_assets > 0 ? ((record.total_market_value / record.total_assets) * 100).toFixed(1) : "0.0"}%</div></div>
                 
                 <div><div className="text-[10px] text-slate-500 mb-1">当日盈亏</div><div className="text-base"><ProfitLossText amount={record.day_profit_loss} /></div></div>
                 <div><div className="text-[10px] text-slate-500 mb-1">当日盈亏率</div><div className="text-base"><ProfitRateText rate={record.day_return_rate} /></div></div>
                 <div><div className="text-[10px] text-slate-500 mb-1">总盈亏 (估算)</div><div className="text-base"><ProfitLossText amount={totalProfitValue} /></div></div>
                 <div><div className="text-[10px] text-slate-500 mb-1">总收益率</div><div className="text-base"><ProfitRateText rate={record.cumulative_return} /></div></div>
               </div>
            </div>

            {/* 2. 持仓信息 */}
            <div>
               <div className="flex items-center gap-2 mb-3">
                 <PieChart className="w-4 h-4 text-cyan-400" />
                 <h4 className="text-sm text-slate-300">持仓信息</h4>
               </div>
               
               {record.positions && record.positions.length > 0 ? (
                 <div className="glass-panel rounded-lg overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                     <thead>
                       <tr className="border-b border-blue-500/10">
                         <th className="px-4 py-3 text-[10px] text-slate-500 font-medium">股票/代码</th>
                         <th className="px-4 py-3 text-[10px] text-slate-500 font-medium text-right">持仓/可用</th>
                         <th className="px-4 py-3 text-[10px] text-slate-500 font-medium text-right">成本/现价</th>
                         <th className="px-4 py-3 text-[10px] text-slate-500 font-medium text-right">市值</th>
                         <th className="px-4 py-3 text-[10px] text-slate-500 font-medium text-right">当日盈亏</th>
                         <th className="px-4 py-3 text-[10px] text-slate-500 font-medium text-right">总盈亏(率)</th>
                         <th className="px-4 py-3 text-[10px] text-slate-500 font-medium text-right">个股仓位</th>
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-blue-500/5">
                       {record.positions.map(pos => (
                         <tr key={pos.id} className="hover:bg-white/[0.02] transition-colors">
                           <td className="px-4 py-3">
                             <div className="text-sm text-white">{pos.stock}</div>
                             <div className="text-[10px] text-slate-500 tabular-nums">{pos.code}</div>
                           </td>
                           <td className="px-4 py-3 text-right">
                             <div className="text-sm text-slate-300 tabular-nums">{pos.shares}</div>
                             <div className="text-[10px] text-slate-500 tabular-nums">{pos.shares}</div>
                           </td>
                           <td className="px-4 py-3 text-right">
                             <div className="text-sm text-slate-300 tabular-nums">{pos.avg_price.toFixed(3)}</div>
                             <div className="text-[10px] text-slate-500 tabular-nums">{pos.current_price.toFixed(3)}</div>
                           </td>
                           <td className="px-4 py-3 text-right">
                             <div className="text-sm text-slate-300 tabular-nums">{pos.market_value.toLocaleString()}</div>
                           </td>
                           <td className="px-4 py-3 text-right text-sm">
                             <ProfitLossText amount={pos.day_profit_loss || 0} />
                           </td>
                           <td className="px-4 py-3 text-right">
                             <div className="text-sm"><ProfitLossText amount={pos.profit_loss} /></div>
                             <div className="text-[10px]"><ProfitRateText rate={pos.profit_rate} /></div>
                           </td>
                           <td className="px-4 py-3 text-right">
                             <div className="text-sm text-blue-400 tabular-nums">
                               {record.total_assets > 0 ? ((pos.market_value / record.total_assets) * 100).toFixed(1) : "0.0"}%
                             </div>
                           </td>
                         </tr>
                       ))}
                     </tbody>
                   </table>
                 </div>
               ) : (
                 <div className="glass-panel rounded-lg p-6 text-center">
                   <p className="text-xs text-slate-500">当日无持仓信息</p>
                 </div>
               )}
            </div>

            {/* 3. 当日操作 & 备注 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-4 h-4 text-blue-400" />
                  <h4 className="text-sm text-slate-300">当日操作</h4>
                </div>
                {record.trades && record.trades.length > 0 ? (
                  <div className="glass-panel rounded-lg overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-blue-500/10">
                          <th className="px-4 py-3 text-[10px] text-slate-500 font-medium">股票</th>
                          <th className="px-4 py-3 text-[10px] text-slate-500 font-medium text-center">操作状态</th>
                          <th className="px-4 py-3 text-[10px] text-slate-500 font-medium text-right">操作均价</th>
                          <th className="px-4 py-3 text-[10px] text-slate-500 font-medium text-right">成交数量</th>
                          <th className="px-4 py-3 text-[10px] text-slate-500 font-medium text-right">时间</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-blue-500/5">
                        {record.trades.map(trade => (
                          <tr key={trade.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="px-4 py-3">
                              <div className="text-sm text-white">{trade.stock}</div>
                              <div className="text-[10px] text-slate-500 tabular-nums">{trade.code}</div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className={`text-[10px] px-2 py-1 rounded glass-badge ${
                                trade.type === "买入" || trade.type === "加仓" ? "text-rose-400 bg-rose-500/5" : "text-emerald-400 bg-emerald-500/5"
                              }`}>{trade.type}</span>
                            </td>
                            <td className="px-4 py-3 text-right text-sm text-slate-300 tabular-nums">{trade.price.toFixed(3)}</td>
                            <td className="px-4 py-3 text-right text-sm text-slate-300 tabular-nums">{trade.shares}</td>
                            <td className="px-4 py-3 text-right text-[10px] text-slate-500 tabular-nums">{trade.time}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="glass-panel rounded-lg p-6 text-center">
                    <p className="text-xs text-slate-500">当日无交易操作</p>
                  </div>
                )}
              </div>
              
              {/* 备注 */}
              {record.notes && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <StickyNote className="w-4 h-4 text-amber-400/70" />
                    <h4 className="text-sm text-slate-300">复盘备注</h4>
                  </div>
                  <div className="glass-panel rounded-lg p-4 h-[calc(100%-28px)]">
                    <p className="text-sm text-slate-300/90 leading-relaxed whitespace-pre-wrap">{record.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-slate-900 border-slate-800 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除记录？</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              这将永久删除 {record.date} 的交易记录和操作明细，该操作不可恢复。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white">取消</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => onDelete(record.id)}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              确认删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// =============================================
// 编辑/新增记录弹窗
// =============================================
interface RecordModalProps {
  onClose: () => void;
  onSaved: () => void;
  userId: string;
  initialData?: DailyRecord; // 若有则是编辑模式
}

function RecordModal({ onClose, onSaved, userId, initialData }: RecordModalProps) {
  const isEditMode = !!initialData;
  const today = new Date().toISOString().split("T")[0];
  
  const [date, setDate] = useState(initialData?.date || today);
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [totalAssets, setTotalAssets] = useState(initialData?.total_assets.toString() || "");
  const [cashBalance, setCashBalance] = useState(initialData?.cash_balance.toString() || "");
  const [dayPL, setDayPL] = useState(initialData?.day_profit_loss.toString() || "");
  const [dayReturn, setDayReturn] = useState(initialData?.day_return_rate.toString() || "");
  const [cumulativeReturn, setCumulativeReturn] = useState(initialData?.cumulative_return.toString() || "");
  
  // Trades Local State
  type LocalTrade = Partial<Trade> & { localId: string, _status?: 'new'|'edit'|'delete' };
  const [trades, setTrades] = useState<LocalTrade[]>(
    initialData?.trades?.map(t => ({ ...t, localId: t.id, _status: 'edit' })) || []
  );

  // Positions Local State
  type LocalPosition = Partial<Position> & { localId: string, _status?: 'new'|'edit'|'delete' };
  const [positions, setPositions] = useState<LocalPosition[]>(
    initialData?.positions?.map(p => ({ ...p, localId: p.id, _status: 'edit' })) || []
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const addEmptyTrade = () => {
    setTrades([...trades, { 
      localId: Math.random().toString(), 
      _status: 'new',
      stock: '',
      code: '',
      type: '买入',
      time: new Date().toLocaleTimeString('zh-CN', { hour12: false }).substring(0, 5),
      date: date,
      price: 0,
      shares: 0,
      amount: 0,
      commission: 0
    }]);
  };

  const updateTrade = (localId: string, field: keyof LocalTrade, value: any) => {
    setTrades(trades.map(t => {
      if (t.localId === localId) {
        const newT = { ...t, [field]: value };
        if (field === 'price' || field === 'shares') {
          newT.amount = (Number(newT.price) || 0) * (Number(newT.shares) || 0);
          newT.commission = newT.amount * 0.0003; 
        }
        return newT;
      }
      return t;
    }));
  };

  const removeTrade = (localId: string) => {
    setTrades(trades.map(t => t.localId === localId ? { ...t, _status: 'delete' as const } : t));
  };

  const addEmptyPosition = () => {
    setPositions([...positions, {
      localId: Math.random().toString(),
      _status: 'new',
      stock: '',
      code: '',
      date: date,
      shares: 0,
      avg_price: 0,
      current_price: 0,
      profit_loss: 0,
      profit_rate: 0,
      market_value: 0,
      day_profit_loss: 0
    }]);
  };

  const updatePosition = (localId: string, field: keyof LocalPosition, value: any) => {
    setPositions(positions.map(p => {
      if (p.localId === localId) {
        const newP = { ...p, [field]: value };
        if (field === 'shares' || field === 'current_price') {
          newP.market_value = (Number(newP.shares) || 0) * (Number(newP.current_price) || 0);
        }
        return newP;
      }
      return p;
    }));
  };

  const removePosition = (localId: string) => {
    setPositions(positions.map(p => p.localId === localId ? { ...p, _status: 'delete' as const } : p));
  };


  const handleSave = async () => {
    if (!date) { setError("请填写日期"); return; }
    if (!totalAssets) { setError("请填写总资产"); return; }
    
    // validate active trades
    const activeTrades = trades.filter(t => t._status !== 'delete');
    for (const t of activeTrades) {
      if (!t.stock || !t.code || !t.price || !t.shares) {
        setError("请完整填写所有交易明细的必填项");
        return;
      }
    }
    
    // validate active positions
    const activePositions = positions.filter(p => p._status !== 'delete');
    for (const p of activePositions) {
      if (!p.stock || !p.code) {
        setError("请完整填写持仓明细的股票代码");
        return;
      }
    }

    setSaving(true);
    setError("");

    const d = new Date(date);
    
    // 自动计算一下总市值
    const calculatedMarketValue = activePositions.reduce((acc, p) => acc + (Number(p.market_value) || 0), 0);
    // 可用资金优先取用户手填，未手填则用 总资产-总市值 算
    const finalTotalAssets = parseFloat(totalAssets) || 0;
    const finalCashBalance = cashBalance ? parseFloat(cashBalance) : (finalTotalAssets - calculatedMarketValue);

    const recordData = {
      date,
      day_of_week: DAY_OF_WEEK[d.getDay()],
      is_trade_day: true,
      total_assets: finalTotalAssets,
      cash_balance: finalCashBalance,
      total_market_value: calculatedMarketValue,
      day_profit_loss: parseFloat(dayPL) || 0,
      day_return_rate: parseFloat(dayReturn) || 0,
      cumulative_return: parseFloat(cumulativeReturn) || 0,
      notes,
    };

    if (isEditMode) {
      const tradesToAdd: NewTrade[] = trades
        .filter(t => t._status === 'new')
        .map(t => ({
            date: t.date || date,
            time: t.time || '00:00',
            stock: t.stock || '',
            code: t.code || '',
            type: t.type as any || '买入',
            shares: Number(t.shares) || 0,
            price: Number(t.price) || 0,
            amount: Number(t.amount) || 0,
            commission: Number(t.commission) || 0,
            profit_loss: t.profit_loss || null,
            profit_rate: t.profit_rate || null,
            daily_record_id: initialData.id,
        }));

      const tradesToUpdate = trades
        .filter(t => t._status === 'edit' && t.id)
        .map(t => ({
          id: t.id!,
          time: t.time,
          stock: t.stock,
          code: t.code,
          type: t.type,
          shares: Number(t.shares),
          price: Number(t.price),
          amount: Number(t.amount),
          commission: Number(t.commission)
        }));

      const tradeIdsToDelete = trades
        .filter(t => t._status === 'delete' && t.id)
        .map(t => t.id!);

      const positionsToAdd: NewPosition[] = positions
        .filter(p => p._status === 'new')
        .map(p => ({
            date: p.date || date,
            stock: p.stock || '',
            code: p.code || '',
            shares: Number(p.shares) || 0,
            avg_price: Number(p.avg_price) || 0,
            current_price: Number(p.current_price) || 0,
            profit_loss: Number(p.profit_loss) || 0,
            profit_rate: Number(p.profit_rate) || 0,
            market_value: Number(p.market_value) || 0,
            day_profit_loss: Number(p.day_profit_loss) || 0,
            daily_record_id: initialData.id,
        }));

      const positionsToUpdate = positions
        .filter(p => p._status === 'edit' && p.id)
        .map(p => ({
            id: p.id!,
            stock: p.stock,
            code: p.code,
            shares: Number(p.shares),
            avg_price: Number(p.avg_price),
            current_price: Number(p.current_price),
            profit_loss: Number(p.profit_loss),
            profit_rate: Number(p.profit_rate),
            market_value: Number(p.market_value),
            day_profit_loss: Number(p.day_profit_loss),
        }));

      const positionIdsToDelete = positions
        .filter(p => p._status === 'delete' && p.id)
        .map(p => p.id!);

      const result = await updateDailyRecord(
        userId,
        initialData.id,
        recordData,
        tradesToAdd,
        tradesToUpdate,
        tradeIdsToDelete,
        positionsToAdd,
        positionsToUpdate,
        positionIdsToDelete
      );

      setSaving(false);
      if (result) {
        onSaved();
        onClose();
      } else {
        setError("更新失败，请重试");
      }
    } else {
      const newTrades: NewTrade[] = activeTrades.map(t => ({
        date: date,
        time: t.time || '00:00',
        stock: t.stock || '',
        code: t.code || '',
        type: t.type as any || '买入',
        shares: Number(t.shares) || 0,
        price: Number(t.price) || 0,
        amount: Number(t.amount) || 0,
        commission: Number(t.commission) || 0,
        profit_loss: null,
        profit_rate: null,
        daily_record_id: null,
      }));

      const newPositions: NewPosition[] = activePositions.map(p => ({
        date: date,
        stock: p.stock || '',
        code: p.code || '',
        shares: Number(p.shares) || 0,
        avg_price: Number(p.avg_price) || 0,
        current_price: Number(p.current_price) || 0,
        profit_loss: Number(p.profit_loss) || 0,
        profit_rate: Number(p.profit_rate) || 0,
        market_value: Number(p.market_value) || 0,
        day_profit_loss: Number(p.day_profit_loss) || 0,
        daily_record_id: null,
      }));

      const result = await addDailyRecord(userId, recordData, newTrades, newPositions);
      setSaving(false);
      if (result) {
        onSaved();
        onClose();
      } else {
        setError("保存失败，请检查配置");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="glass-card rounded-2xl p-6 w-full max-w-4xl my-8">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base text-white font-medium">{isEditMode ? '编辑交易日记录' : '新增交易日记录'}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto pr-2 pb-4 space-y-8 custom-scrollbar">
          {/* 基本信息区 */}
          <div className="space-y-4">
            <h4 className="text-sm text-slate-300 flex items-center gap-2 border-b border-slate-800 pb-2">
              <Briefcase className="w-4 h-4 text-violet-400" />
              1. 账户信息
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">日期 *</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} disabled={isEditMode} className="w-full px-3 py-2 rounded-lg glass-input text-xs disabled:opacity-50" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">总资产 (¥) *</label>
                <input type="number" value={totalAssets} onChange={e => setTotalAssets(e.target.value)} placeholder="0" className="w-full px-3 py-2 rounded-lg glass-input text-xs" />
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">现金余额 (¥)</label>
                <input type="number" value={cashBalance} onChange={e => setCashBalance(e.target.value)} placeholder="不填则自动计算" className="w-full px-3 py-2 rounded-lg glass-input text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">当日盈亏 (¥)</label>
                <input type="number" value={dayPL} onChange={e => setDayPL(e.target.value)} placeholder="0" className="w-full px-3 py-2 rounded-lg glass-input text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">当日盈亏率 (%)</label>
                <input type="number" value={dayReturn} onChange={e => setDayReturn(e.target.value)} placeholder="0.00" step="0.01" className="w-full px-3 py-2 rounded-lg glass-input text-xs" />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 mb-1 block">累计收益率 (%)</label>
                <input type="number" value={cumulativeReturn} onChange={e => setCumulativeReturn(e.target.value)} placeholder="0.00" step="0.01" className="w-full px-3 py-2 rounded-lg glass-input text-xs" />
              </div>
            </div>
          </div>

          {/* 持仓列表区 */}
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <h4 className="text-sm text-slate-300 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-cyan-400" />
                2. 持仓信息
              </h4>
              <button 
                onClick={addEmptyPosition}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded"
              >
                <Plus className="w-3 h-3" /> 添加持仓
              </button>
            </div>

            <div className="space-y-3">
              {positions.filter(p => p._status !== 'delete').map((pos) => (
                <div key={pos.localId} className="glass-panel p-4 rounded-lg border border-slate-700/50 relative">
                  <button 
                    onClick={() => removePosition(pos.localId)}
                    className="absolute top-2 right-2 text-slate-500 hover:text-rose-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">股票名称 *</label>
                      <input type="text" value={pos.stock} onChange={e => updatePosition(pos.localId, 'stock', e.target.value)} placeholder="例: 腾讯控股" className="w-full px-2 py-1.5 rounded glass-input text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">股票代码 *</label>
                      <input type="text" value={pos.code} onChange={e => updatePosition(pos.localId, 'code', e.target.value)} placeholder="例: 00700" className="w-full px-2 py-1.5 rounded glass-input text-xs tabular-nums" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">持仓数量 *</label>
                      <input type="number" value={pos.shares || ''} onChange={e => updatePosition(pos.localId, 'shares', e.target.value)} placeholder="0" className="w-full px-2 py-1.5 rounded glass-input text-xs tabular-nums" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">现价</label>
                      <input type="number" value={pos.current_price || ''} onChange={e => updatePosition(pos.localId, 'current_price', e.target.value)} placeholder="0.00" className="w-full px-2 py-1.5 rounded glass-input text-xs tabular-nums" />
                    </div>
                    
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">成本价</label>
                      <input type="number" value={pos.avg_price || ''} onChange={e => updatePosition(pos.localId, 'avg_price', e.target.value)} placeholder="0.00" className="w-full px-2 py-1.5 rounded glass-input text-xs tabular-nums" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">当日盈亏 (¥)</label>
                      <input type="number" value={pos.day_profit_loss || ''} onChange={e => updatePosition(pos.localId, 'day_profit_loss', e.target.value)} placeholder="0" className="w-full px-2 py-1.5 rounded glass-input text-xs tabular-nums" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">总盈亏 (¥)</label>
                      <input type="number" value={pos.profit_loss || ''} onChange={e => updatePosition(pos.localId, 'profit_loss', e.target.value)} placeholder="0" className="w-full px-2 py-1.5 rounded glass-input text-xs tabular-nums" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">盈亏率 (%)</label>
                      <input type="number" value={pos.profit_rate || ''} onChange={e => updatePosition(pos.localId, 'profit_rate', e.target.value)} placeholder="0.00" className="w-full px-2 py-1.5 rounded glass-input text-xs tabular-nums" />
                    </div>
                  </div>
                </div>
              ))}
              
              {positions.filter(p => p._status !== 'delete').length === 0 && (
                <div className="text-center py-4 border border-dashed border-slate-700/50 rounded-lg">
                  <p className="text-xs text-slate-500">此记录暂无持仓明细</p>
                </div>
              )}
            </div>
          </div>

          {/* 交易列表区 */}
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <h4 className="text-sm text-slate-300 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                3. 当日操作
              </h4>
              <button 
                onClick={addEmptyTrade}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 px-2 py-1 rounded"
              >
                <Plus className="w-3 h-3" /> 添加交易
              </button>
            </div>

            <div className="space-y-3">
              {trades.filter(t => t._status !== 'delete').map((trade) => (
                <div key={trade.localId} className="glass-panel p-4 rounded-lg border border-slate-700/50 relative">
                  <button 
                    onClick={() => removeTrade(trade.localId)}
                    className="absolute top-2 right-2 text-slate-500 hover:text-rose-400"
                  >
                    <X className="w-4 h-4" />
                  </button>
                  
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3 pr-6">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">股票名称 *</label>
                      <input type="text" value={trade.stock} onChange={e => updateTrade(trade.localId, 'stock', e.target.value)} placeholder="例: 贵州茅台" className="w-full px-2 py-1.5 rounded glass-input text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">股票代码 *</label>
                      <input type="text" value={trade.code} onChange={e => updateTrade(trade.localId, 'code', e.target.value)} placeholder="例: 600519" className="w-full px-2 py-1.5 rounded glass-input text-xs tabular-nums" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">操作类型</label>
                      <select value={trade.type as string} onChange={e => updateTrade(trade.localId, 'type', e.target.value)} className="w-full px-2 py-1.5 rounded glass-input text-xs bg-slate-800/50">
                        <option value="买入">买入</option>
                        <option value="卖出">卖出</option>
                        <option value="加仓">加仓</option>
                        <option value="减仓">减仓</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">时间</label>
                      <input type="time" value={trade.time} onChange={e => updateTrade(trade.localId, 'time', e.target.value)} className="w-full px-2 py-1.5 rounded glass-input text-xs tabular-nums" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">成交均价 *</label>
                      <input type="number" value={trade.price || ''} onChange={e => updateTrade(trade.localId, 'price', e.target.value)} placeholder="0.00" className="w-full px-2 py-1.5 rounded glass-input text-xs tabular-nums" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">成交数量 *</label>
                      <input type="number" value={trade.shares || ''} onChange={e => updateTrade(trade.localId, 'shares', e.target.value)} placeholder="0" className="w-full px-2 py-1.5 rounded glass-input text-xs tabular-nums" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">成交金额</label>
                      <input type="number" value={trade.amount || ''} onChange={e => updateTrade(trade.localId, 'amount', e.target.value)} className="w-full px-2 py-1.5 rounded glass-input text-xs tabular-nums text-slate-400" />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1">预估佣金</label>
                      <input type="number" value={trade.commission || ''} onChange={e => updateTrade(trade.localId, 'commission', e.target.value)} className="w-full px-2 py-1.5 rounded glass-input text-xs tabular-nums text-slate-400" />
                    </div>
                  </div>
                </div>
              ))}
              
              {trades.filter(t => t._status !== 'delete').length === 0 && (
                <div className="text-center py-4 border border-dashed border-slate-700/50 rounded-lg">
                  <p className="text-xs text-slate-500">此记录暂无交易明细</p>
                </div>
              )}
            </div>
            
            <div className="mt-6">
              <h4 className="text-sm text-slate-300 flex items-center gap-2 border-b border-slate-800 pb-2 mb-3">
                <StickyNote className="w-4 h-4 text-amber-400/70" />
                复盘备注
              </h4>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="今日行情总结，买卖逻辑复盘..." className="w-full px-3 py-2.5 rounded-lg glass-input text-xs resize-none" />
            </div>
          </div>
        </div>
        
        {error && <p className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded mt-4">{error}</p>}

        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-800">
          <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm text-slate-300 hover:text-white glass-button">
            取消
          </button>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2 rounded-lg text-sm text-white glass-button-primary flex items-center gap-2 disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "保存记录"}
          </button>
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
  const [editingRecord, setEditingRecord] = useState<DailyRecord | undefined>(undefined);
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

  const handleEdit = (record: DailyRecord) => {
    setEditingRecord(record);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!user) return;
    const success = await deleteDailyRecord(id, user.id);
    if (success) {
      loadData();
    }
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {showModal && (
        <RecordModal
          userId={user!.id}
          initialData={editingRecord}
          onClose={() => {
            setShowModal(false);
            setEditingRecord(undefined);
          }}
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
          <p className="text-sm text-slate-500">按交易日查看资金流水、持仓变化与交易明细</p>
        </div>
        <button
          onClick={() => {
            setEditingRecord(undefined);
            setShowModal(true);
          }}
          className="glass-button-primary px-4 py-2 rounded-lg text-sm text-white flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          新增记录
        </button>
      </div>

      {/* 汇总条 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass-card rounded-xl p-4">
          <div className="text-[10px] text-slate-500 mb-1">本周操作</div>
          <div className="text-lg text-white tabular-nums">{weeklySummary.totalTrades} 笔</div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="text-[10px] text-slate-500 mb-1">本周盈亏</div>
          <div className={`text-lg tabular-nums ${weeklySummary.weeklyProfit >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
            {weeklySummary.weeklyProfit >= 0 ? "+" : ""}¥{weeklySummary.weeklyProfit.toLocaleString()}
          </div>
        </div>
        <div className="glass-card rounded-xl p-4">
          <div className="text-[10px] text-slate-500 mb-1">记录天数</div>
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
            <span className="text-sm text-slate-500">数据加载中...</span>
          </div>
        ) : records.length === 0 ? (
          <div className="glass-card rounded-xl p-12 text-center">
            <Calendar className="w-10 h-10 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base text-white mb-1">暂无交易记录</h3>
            <p className="text-xs text-slate-500 mb-4">点击"新增记录"开始构建您的投资曲线</p>
            <button onClick={() => {
              setEditingRecord(undefined);
              setShowModal(true);
            }} className="glass-button-primary px-5 py-2 rounded-lg text-sm text-white inline-flex items-center gap-1.5">
              <Plus className="w-4 h-4" />
              新增第一条记录
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {records.map((record) => (
              <DayCard 
                key={record.id} 
                record={record} 
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
