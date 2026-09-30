import { createFileRoute, Link, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { useAuth } from "../lib/auth";
import { tokenStore } from "../lib/api";
import { toast } from "sonner";
import { Hexagon } from "lucide-react";

export const Route = createFileRoute("/login")({
  beforeLoad: () => {
    if (tokenStore.get()) {
      throw redirect({ to: "/dashboard" });
    }
  },
  component: Login,
});

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      await signIn(email, password);
      toast.success("Welcome back!");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message || "Failed to sign in. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      {/* Left Brand Panel */}
      <div className="flex-1 bg-zinc-950 text-white p-12 flex flex-col justify-between relative overflow-hidden hidden md:flex">
        {/* Geometric Motif */}
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] border border-zinc-800/50 rounded-full mix-blend-overlay pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] border border-zinc-800/50 rounded-full mix-blend-overlay pointer-events-none" />
        
        <div className="relative z-10 flex items-center gap-3">
          <Hexagon className="h-8 w-8 text-white" />
          <h1 className="text-2xl font-bold tracking-tight">SYNCDOCS</h1>
        </div>
        
        <div className="relative z-10">
          <h2 className="text-5xl font-bold tracking-tight mb-4 leading-tight text-white/90">
            Your documents.<br />
            Your workspace.<br />
            Your team.
          </h2>
          <p className="text-zinc-400 max-w-sm mt-4 text-lg">
            A premium collaborative document editing experience.
          </p>
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="flex-1 flex items-center justify-center p-8 bg-white dark:bg-zinc-950 relative">
        <div className="w-full max-w-md space-y-8">
          <div className="md:hidden flex items-center gap-2 mb-8">
            <Hexagon className="h-6 w-6 text-zinc-900 dark:text-white" />
            <span className="text-xl font-bold tracking-tight">SYNCDOCS</span>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-white">Welcome back</h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Enter your email and SyncDocs password to access your workspace.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="flex h-11 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:focus-visible:ring-zinc-300"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300" htmlFor="password">
                SyncDocs Password
              </label>
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="flex h-11 w-full rounded-md border border-zinc-300 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800 dark:focus-visible:ring-zinc-300"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex h-11 items-center justify-center rounded-md bg-zinc-900 px-8 text-sm font-medium text-zinc-50 shadow transition-colors hover:bg-zinc-900/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 disabled:pointer-events-none disabled:opacity-50 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-50/90"
            >
              {loading ? "Signing in..." : "SIGN IN"}
            </button>
          </form>

          <div className="text-center text-sm">
            <span className="text-zinc-500">Don't have an account? </span>
            <Link to="/register" className="font-medium text-zinc-900 hover:underline dark:text-zinc-50">
              Create account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
