import { useState } from "react";
import { useNavigate } from "react-router";
import { Star, Mail, Lock, Sparkles, ArrowRight, AlertCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export function Login() {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // 已登录则跳转主页
  if (user) {
    navigate("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (isRegister) {
        const { error } = await signUp(email, password);
        if (error) {
          setError(error.message || "注册失败，请稍后重试");
        } else {
          setError("");
          // Supabase 免费版需要邮箱验证，提示用户
          setError("注册成功！请检查邮箱验证链接后再登录。");
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes("Invalid login")) {
            setError("邮箱或密码错误，请重试");
          } else if (error.message.includes("Email not confirmed")) {
            setError("邮箱尚未验证，请查收验证邮件");
          } else {
            setError(error.message || "登录失败，请稍后重试");
          }
        } else {
          navigate("/");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      {/* 装饰光圈 */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="flex items-center justify-center mb-4">
            <div className="relative w-14 h-14 flex items-center justify-center">
              <Star className="w-14 h-14 text-yellow-400 fill-yellow-400 lucky-star absolute" />
              <Star className="w-14 h-14 text-yellow-300/50 fill-yellow-300/50 lucky-star" style={{ animationDelay: "1s" }} />
            </div>
          </div>
          <h1 className="text-3xl text-white mb-1 tracking-wide">Luckystar</h1>
          <div className="flex items-center justify-center gap-1.5">
            <Sparkles className="w-3 h-3 text-blue-400/60" />
            <span className="text-xs text-slate-500 tracking-widest uppercase">Trading Analytics Platform</span>
            <Sparkles className="w-3 h-3 text-blue-400/60" />
          </div>
        </div>

        {/* 登录卡片 */}
        <div className="glass-card rounded-2xl p-7">
          <h2 className="text-lg text-white mb-6">{isRegister ? "注册账户" : "登录账户"}</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block">邮箱地址</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg glass-input text-sm"
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs text-slate-400">密码</label>
                {!isRegister && (
                  <button type="button" className="text-[10px] text-blue-400/70 hover:text-blue-400 transition-colors">
                    忘记密码？
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg glass-input text-sm"
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>
              {isRegister && (
                <p className="text-[10px] text-slate-600 mt-1">密码至少 6 位</p>
              )}
            </div>

            {/* 错误提示 */}
            {error && (
              <div className={`flex items-start gap-2 p-3 rounded-lg text-xs ${
                error.includes("成功") ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-rose-500/10 border border-rose-500/20 text-rose-400"
              }`}>
                <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full glass-button-primary py-2.5 rounded-lg text-sm text-white flex items-center justify-center gap-2 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isRegister ? "注册" : "登录"}
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-slate-500">
              {isRegister ? "已有账户？" : "还没有账户？"}{" "}
              <button
                onClick={() => { setIsRegister(!isRegister); setError(""); }}
                className="text-blue-400/80 hover:text-blue-400 transition-colors"
              >
                {isRegister ? "立即登录" : "立即注册"}
              </button>
            </p>
          </div>
        </div>

        {/* 底部 */}
        <p className="text-center text-[10px] text-slate-600 mt-6 tracking-wide">
          记录交易 · 分析收益 · 长期复盘
        </p>
      </div>
    </div>
  );
}
