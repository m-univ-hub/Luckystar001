import { Link, Outlet, useLocation } from "react-router";
import {
  LayoutDashboard,
  FileText,
  Database,
  LogOut,
  Star,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const menuItems = [
  { path: "/", icon: LayoutDashboard, label: "工作台" },
  { path: "/records", icon: FileText, label: "操作记录" },
  { path: "/data", icon: Database, label: "数据管理" },
];

export function Layout() {
  const location = useLocation();
  const { user, signOut } = useAuth();

  // 从邮箱取显示名（邮箱前缀或 @ 前部分）
  const displayName = user?.email?.split("@")[0] ?? "投资者";
  const avatarChar = displayName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    await signOut();
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* 侧边栏 */}
      <aside className="w-60 glass-sidebar flex flex-col shrink-0">
        {/* Logo */}
        <div className="h-16 flex items-center px-5 border-b border-blue-500/10">
          <div className="relative flex items-center gap-2.5">
            <div className="relative w-8 h-8 flex items-center justify-center">
              <Star className="w-7 h-7 text-yellow-400 fill-yellow-400 lucky-star absolute" />
              <Star
                className="w-7 h-7 text-yellow-300/60 fill-yellow-300/60 lucky-star"
                style={{ animationDelay: "1s" }}
              />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-wide">
                Luckystar
              </span>
              <div className="flex items-center gap-1 mt-[-2px]">
                <Sparkles className="w-2.5 h-2.5 text-blue-400/70" />
                <span className="text-[10px] text-blue-300/60 tracking-widest uppercase">
                  Trading Hub
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 导航 */}
        <nav className="flex-1 px-3 py-5">
          <div className="text-[10px] text-blue-300/40 uppercase tracking-widest px-3 mb-3">
            导航菜单
          </div>
          <div className="space-y-1">
            {menuItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-sm ${
                    isActive
                      ? "glass-button text-white"
                      : "text-slate-400 hover:text-white hover:bg-white/[0.04]"
                  }`}
                >
                  <item.icon className="w-[18px] h-[18px]" />
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 glow-dot text-blue-400" />
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* 底部用户 */}
        <div className="p-3 border-t border-blue-500/10">
          <div className="flex items-center justify-between px-3 py-2.5 rounded-lg glass-panel">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500/40 to-indigo-500/40 flex items-center justify-center text-white text-xs border border-blue-400/20 shrink-0">
                {avatarChar}
              </div>
              <div className="min-w-0">
                <div className="text-sm text-white/90 truncate">{displayName}</div>
                <div className="text-[10px] text-slate-500 truncate">{user?.email ?? "个人账户"}</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="退出登录"
              className="text-slate-500 hover:text-white transition-colors p-1 shrink-0 ml-1"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 主内容 */}
      <main className="flex-1 overflow-auto tech-grid">
        <Outlet />
      </main>
    </div>
  );
}
