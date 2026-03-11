import { useState, useEffect, useRef } from "react";
import {
  Upload,
  CheckCircle,
  AlertCircle,
  FileText,
  Clock,
  Download,
  Zap,
  Shield,
  Loader2,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import {
  getUploadHistory,
  addUploadRecord,
  updateUploadStatus,
  getActivityLogs,
  getDataManagementStats,
} from "../../services/uploadService";
import type { UploadHistory, ActivityLog } from "../../lib/types";

const tabs = [
  { id: "upload", label: "截图上传", icon: Upload },
  { id: "verify", label: "数据校对", icon: Shield },
  { id: "logs", label: "操作日志", icon: Clock },
] as const;

type TabId = (typeof tabs)[number]["id"];

function StatusDot({ status }: { status: string }) {
  const cls =
    status === "已解析" ? "bg-emerald-400 text-emerald-400" :
    status === "待校对" ? "bg-amber-400 text-amber-400" :
    "bg-rose-400 text-rose-400";
  return <div className={`w-1.5 h-1.5 rounded-full glow-dot ${cls}`} />;
}

function LogIcon({ type }: { type: string }) {
  const map: Record<string, { icon: typeof Upload; color: string }> = {
    upload: { icon: Upload, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
    parse: { icon: Zap, color: "text-violet-400 bg-violet-500/10 border-violet-500/20" },
    verify: { icon: CheckCircle, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" },
    edit: { icon: AlertCircle, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" },
    export: { icon: Download, color: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
    other: { icon: FileText, color: "text-slate-400 bg-slate-500/10 border-slate-500/20" },
  };
  const cfg = map[type] || map.other;
  const Icon = cfg.icon;
  return (
    <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${cfg.color}`}>
      <Icon className="w-4 h-4" />
    </div>
  );
}

function Database(props: React.SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  );
}

export function DataManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabId>("upload");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadHistory, setUploadHistory] = useState<UploadHistory[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [stats, setStats] = useState({ total: 0, successRate: 0, pending: 0, totalRecords: 0 });
  const [loading, setLoading] = useState(true);
  const [uploadNotice, setUploadNotice] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setLoading(true);
    const [history, logs, statsData] = await Promise.all([
      getUploadHistory(user!.id),
      getActivityLogs(user!.id),
      getDataManagementStats(user!.id),
    ]);
    setUploadHistory(history);
    setActivityLogs(logs);
    setStats(statsData);
    setLoading(false);
  };

  const handleFileDrop = async (files: FileList | null) => {
    if (!files || files.length === 0 || !user) return;
    const file = files[0];
    if (!file.type.startsWith("image/")) {
      setUploadNotice("仅支持图片文件（PNG/JPG）");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadNotice("文件大小不能超过 10MB");
      return;
    }

    setUploading(true);
    setUploadNotice("");

    // 记录上传元数据（当前阶段不实际存储文件到 Supabase Storage）
    const id = await addUploadRecord(user.id, {
      file_name: file.name,
      file_path: null,
      upload_time: new Date().toISOString(),
      status: "待解析",
      records_count: 0,
      ocr_accuracy: 0,
      verified: false,
      error: null,
    });

    setUploading(false);
    if (id) {
      setUploadNotice(`✓ 文件「${file.name}」已上传，等待 OCR 解析`);
      await loadData();
    } else {
      setUploadNotice("上传失败，请检查 Supabase 配置");
    }
  };

  const handleVerify = async (id: string) => {
    if (!user) return;
    await updateUploadStatus(id, "已解析", true, user.id);
    await loadData();
  };

  const kpiItems = [
    { label: "总上传数", value: String(stats.total), sub: "累计文件", icon: Upload, color: "text-blue-400" },
    { label: "解析成功率", value: `${stats.successRate}%`, sub: `已解析文件`, icon: CheckCircle, color: "text-emerald-400" },
    { label: "待校对", value: String(stats.pending), sub: "需人工确认", icon: AlertCircle, color: "text-amber-400" },
    { label: "解析记录", value: String(stats.totalRecords), sub: "累计条数", icon: FileText, color: "text-violet-400" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* 头部 */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Database className="w-5 h-5 text-blue-400" />
          <h1 className="text-2xl text-white">数据管理</h1>
        </div>
        <p className="text-sm text-slate-500">上传交易截图，OCR 自动识别并入库</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {kpiItems.map((k) => (
          <div key={k.label} className="glass-card rounded-xl p-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-slate-500">{k.label}</span>
              <k.icon className={`w-3.5 h-3.5 ${k.color}`} />
            </div>
            {loading ? (
              <div className="h-6 bg-white/[0.04] rounded animate-pulse w-1/2" />
            ) : (
              <>
                <div className="text-xl text-white tabular-nums">{k.value}</div>
                <div className="text-[10px] text-slate-500 mt-0.5">{k.sub}</div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* 标签栏 */}
      <div className="flex gap-1 glass-panel rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm transition-all ${
              activeTab === tab.id ? "glass-button text-white" : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 截图上传 */}
      {activeTab === "upload" && (
        <div className="space-y-4">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={e => handleFileDrop(e.target.files)} />
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileDrop(e.dataTransfer.files); }}
            className={`glass-card rounded-xl p-10 text-center border-2 border-dashed transition-colors ${
              isDragging ? "border-blue-400/50 bg-blue-500/5" : "border-blue-500/10"
            }`}
          >
            <div className="w-14 h-14 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
              {uploading ? <Loader2 className="w-7 h-7 text-blue-400 animate-spin" /> : <Upload className="w-7 h-7 text-blue-400" />}
            </div>
            <h3 className="text-base text-white mb-1">拖拽文件到此处或点击上传</h3>
            <p className="text-xs text-slate-500 mb-4">支持 PNG / JPG，单个文件 ≤ 10MB</p>
            {uploadNotice && (
              <div className={`flex items-center justify-center gap-2 text-xs mb-3 ${uploadNotice.startsWith("✓") ? "text-emerald-400" : "text-rose-400"}`}>
                {uploadNotice.startsWith("✓") ? <CheckCircle className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
                {uploadNotice}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="glass-button-primary px-5 py-2 rounded-lg text-sm text-white inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              选择文件
            </button>
          </div>

          {/* 上传历史 */}
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="p-5 pb-0">
              <h3 className="text-base text-white">上传历史</h3>
              <p className="text-xs text-slate-500 mt-0.5">最近上传记录与解析状态</p>
            </div>
            <div className="p-5 space-y-2">
              {loading ? (
                <div className="py-6 text-center text-xs text-slate-500">
                  <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                  加载中...
                </div>
              ) : uploadHistory.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">暂无上传记录</div>
              ) : (
                uploadHistory.map((item) => (
                  <div key={item.id} className="glass-panel rounded-lg p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-slate-500/10 border border-slate-500/15 flex items-center justify-center">
                        <FileText className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <div className="text-sm text-white mb-0.5">{item.file_name}</div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500">
                          <span>{new Date(item.upload_time).toLocaleString("zh-CN")}</span>
                          {item.records_count > 0 && <span>• {item.records_count} 条记录</span>}
                          {item.ocr_accuracy > 0 && <span>• 准确率 {item.ocr_accuracy}%</span>}
                        </div>
                        {item.error && <p className="text-[10px] text-rose-400 mt-0.5">{item.error}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 glass-badge px-2 py-1 rounded text-xs">
                        <StatusDot status={item.status} />
                        <span className={
                          item.status === "已解析" ? "text-emerald-400" :
                          item.status === "待校对" ? "text-amber-400" : "text-rose-400"
                        }>{item.status}</span>
                      </div>
                      {item.verified && <CheckCircle className="w-4 h-4 text-emerald-400" />}
                      {item.status === "待校对" && (
                        <button onClick={() => handleVerify(item.id)} className="glass-button px-3 py-1 rounded text-xs text-white">校对</button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 数据校对 */}
      {activeTab === "verify" && (
        <div className="space-y-4">
          {uploadHistory.filter((i) => i.status === "待校对").length > 0 ? (
            uploadHistory.filter((i) => i.status === "待校对").map((item) => (
              <div key={item.id} className="glass-card rounded-xl overflow-hidden">
                <div className="p-5 border-b border-blue-500/10 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm text-white">{item.file_name}</h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">等待人工校对确认</p>
                  </div>
                  <div className="flex items-center gap-1.5 glass-badge px-2 py-1 rounded text-xs text-amber-400">
                    <StatusDot status="待校对" />
                    待校对
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-xs text-slate-400 mb-4">请确认该文件的解析结果是否正确，确认后数据将正式入库。</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleVerify(item.id)}
                      className="glass-button-primary px-4 py-2 rounded-lg text-sm text-white flex items-center gap-1.5"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      确认无误
                    </button>
                    <button className="glass-button px-4 py-2 rounded-lg text-sm text-white">编辑修正</button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="glass-card rounded-xl p-12 text-center">
              <CheckCircle className="w-10 h-10 text-emerald-400/50 mx-auto mb-3" />
              <h3 className="text-base text-white mb-1">暂无待校对数据</h3>
              <p className="text-xs text-slate-500">所有数据均已确认</p>
            </div>
          )}
        </div>
      )}

      {/* 操作日志 */}
      {activeTab === "logs" && (
        <div className="glass-card rounded-xl overflow-hidden">
          <div className="p-5 pb-0 flex items-center justify-between">
            <div>
              <h3 className="text-base text-white">操作日志</h3>
              <p className="text-xs text-slate-500 mt-0.5">全部数据操作历史</p>
            </div>
            <button className="glass-button px-3 py-1.5 rounded-lg text-xs text-white flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              导出
            </button>
          </div>
          <div className="p-5 space-y-2">
            {loading ? (
              <div className="py-6 text-center text-xs text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                加载中...
              </div>
            ) : activityLogs.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">暂无操作日志</div>
            ) : (
              activityLogs.map((log) => (
                <div key={log.id} className="glass-panel rounded-lg p-4 flex items-start gap-3 hover:bg-white/[0.02] transition-colors">
                  <LogIcon type={log.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm text-white">{log.action}</span>
                      <span className="text-[10px] text-slate-500 glass-badge px-1.5 py-0.5 rounded">{log.actor}</span>
                    </div>
                    <p className="text-xs text-slate-400 mb-1">{log.description}</p>
                    <div className="flex items-center gap-1 text-[10px] text-slate-600">
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(log.created_at).toLocaleString("zh-CN")}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}