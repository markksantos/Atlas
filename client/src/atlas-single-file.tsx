/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useEffect, useMemo, useRef, useState, createContext, useContext } from "react";
import {
Bot,
History,
Settings as SettingsIcon,
Info,
ChevronDown,
Search,
Share2,
Filter,
Download,
Moon,
Sun,
KeyRound,
CheckCircle2,
Send,
Loader2,
X as XIcon,
Plus,
} from "lucide-react";

// The user's provided UI, lightly adapted to call real backend endpoints

function cn(...cls: (string | false | null | undefined)[]) { return cls.filter(Boolean).join(" "); }
const accent = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ring-offset-transparent ring-blue-500";

function Button(props: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid"|"outline"|"ghost"|"danger"|"secondary"|"accent"; size?: "sm"|"md"|"lg"|"icon"; rounded?: "md"|"lg"|"full"; }) {
  const { className, variant = "solid", size = "md", rounded = "lg", ...rest } = props;
  const base = "inline-flex items-center justify-center whitespace-nowrap transition-colors disabled:opacity-50 disabled:pointer-events-none " + accent;
  const sizes: Record<string,string> = { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm", lg: "h-11 px-5 text-base", icon: "h-10 w-10" };
  const rounds: Record<string,string> = { md: "rounded-md", lg: "rounded-lg", full: "rounded-full" };
  const variants: Record<string,string> = {
    solid: "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-sm",
    outline: "border border-neutral-300 dark:border-neutral-700 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50",
    ghost: "text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100/60 dark:hover:bg-neutral-800/60",
    danger: "bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-sm",
    secondary: "bg-neutral-100 text-neutral-900 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-700",
    accent: "bg-cyan-600 text-white hover:bg-cyan-700 active:bg-cyan-800 shadow-sm",
  };
  return <button className={cn(base, sizes[size], rounds[rounded], variants[variant], className)} {...rest} />;
}

function Card({ className, children }: React.PropsWithChildren<{ className?: string }>) { return <div className={cn("rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm", className)}>{children}</div>; }
function CardHeader({ className, children }: React.PropsWithChildren<{ className?: string }>) { return <div className={cn("px-6 pt-5 pb-3", className)}>{children}</div>; }
function CardContent({ className, children }: React.PropsWithChildren<{ className?: string }>) { return <div className={cn("px-6 pb-6", className)}>{children}</div>; }

function Badge({ className, children, variant = "outline" }: React.PropsWithChildren<{ className?: string; variant?: "outline"|"solid" }>) {
  return (
  <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 h-7 text-xs border",
  variant === "outline" ? "border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300" : "border-transparent bg-neutral-900 text-white dark:bg-white dark:text-neutral-900",
  className)}>{children}</span>
  );
}

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(function InputBase({ className, ...rest }, ref) {
  return (
  <input
  ref={ref}
  className={cn(
  "h-10 w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 text-sm text-neutral-900 dark:text-neutral-100 placeholder:text-neutral-400 dark:placeholder:text-neutral-500",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
  className
  )}
  {...rest}
  />
  );
});

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(function TextareaBase({ className, ...rest }, ref) {
  return (
  <textarea
  ref={ref}
  className={cn(
  "w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent p-3 text-sm leading-relaxed",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
  className
  )}
  {...rest}
  />
  );
});

function Switch({ checked, onChange, id }: { checked: boolean; onChange: (v: boolean) => void; id?: string }) {
  return (
  <button aria-pressed={checked} aria-label={id} onClick={() => onChange(!checked)}
  className={cn("relative h-6 w-10 rounded-full transition-colors", checked ? "bg-blue-600" : "bg-neutral-300 dark:bg-neutral-700")}
  >
  <span className={cn(
  "absolute top-1/2 -translate-y-1/2 h-4 w-4 rounded-full bg-white shadow transition-transform left-1",
  checked ? "translate-x-4" : "translate-x-0"
  )} />
  </button>
  );
}
function Slider({ value, onChange, min = 0, max = 1, step = 0.01 }: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number }) { return <input type="range" min={min} max={max} step={step} value={value} className="w-full accent-blue-600" onChange={(e) => onChange(Number(e.target.value))} />; }
function Disclosure({ title, children, defaultOpen = false }: React.PropsWithChildren<{ title: string; defaultOpen?: boolean }>) {
  const [open, setOpen] = useState(defaultOpen);
  return (
  <div className="rounded-xl border border-neutral-200 dark:border-neutral-800">
    <button className="w-full flex items-center justify-between px-4 py-3 text-sm" onClick={() => setOpen((v) => !v)}>
      <span className="text-neutral-800 dark:text-neutral-200">{title}</span>
      <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
    </button>
    {open && <div className="border-t border-neutral-200 dark:border-neutral-800 p-4">{children}</div>}
  </div>
  );
}

function useToast() {
  const [toast, setToast] = useState<{ message: string } | null>(null);
  function show(message: string, ms = 2400) { setToast({ message }); setTimeout(() => setToast(null), ms); }
  const node = toast ? (
  <div className="fixed bottom-4 right-4 z-50">
    <div className="rounded-xl bg-neutral-900 text-white text-sm px-3 py-2 shadow-lg">{toast.message}</div>
  </div>
  ) : null;
  return { show, node };
}

function AutoTextarea({ value, onChange, placeholder, minRows = 1, maxRows = 12, className = "", onKeyDown }: { value: string; onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void; placeholder?: string; minRows?: number; maxRows?: number; className?: string; onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>; }) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    el.style.height = "auto";
    const lineHeight = 22;
    const maxHeight = maxRows * lineHeight + 18;
    el.style.height = Math.min(el.scrollHeight, maxHeight) + "px";
    el.style.overflowY = el.scrollHeight > maxHeight ? "auto" : "hidden";
  }, [value, maxRows]);
  return (
  <Textarea ref={ref} rows={minRows} value={value} onChange={onChange} placeholder={placeholder} className={cn("resize-none", className)} onKeyDown={onKeyDown} />
  );
}

function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      localStorage.getItem("mlom:theme") === "dark" ||
      (localStorage.getItem("mlom:theme") === null &&
        window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches)
    );
  });
  useEffect(() => {
    const root = document.documentElement;
    if (dark) { root.classList.add("dark"); localStorage.setItem("mlom:theme", "dark"); }
    else { root.classList.remove("dark"); localStorage.setItem("mlom:theme", "light"); }
  }, [dark]);
  return { dark, setDark };
}

const MODEL_CATALOG = [
  { id: "openai:gpt-5", label: "GPT-5", provider: "OpenAI", pricing: { input: 0.625, cached: 0.0625, output: 5.0 }, speed: "med", cost: "high", icon: "🧠" },
  { id: "openai:gpt-5-mini", label: "GPT-5 mini", provider: "OpenAI", pricing: { input: 0.125, cached: 0.0125, output: 1.0 }, speed: "fast", cost: "med", icon: "⚡" },
  { id: "openai:gpt-5-nano", label: "GPT-5 nano", provider: "OpenAI", pricing: { input: 0.025, cached: 0.0025, output: 0.2 }, speed: "fast", cost: "low", icon: "💡" },
  { id: "openai:gpt-4.1", label: "GPT-4.1", provider: "OpenAI", pricing: { input: 1.0, cached: null, output: 4.0 }, speed: "med", cost: "high", icon: "🔧" },
  { id: "openai:gpt-4.1-mini", label: "GPT-4.1 mini", provider: "OpenAI", pricing: { input: 0.2, cached: null, output: 0.8 }, speed: "fast", cost: "med", icon: "🚀" },
  { id: "openai:gpt-4.1-nano", label: "GPT-4.1 nano", provider: "OpenAI", pricing: { input: 0.05, cached: null, output: 0.2 }, speed: "fast", cost: "low", icon: "💸" },
  { id: "openai:gpt-4o", label: "GPT-4o", provider: "OpenAI", pricing: { input: 1.25, cached: null, output: 5.0 }, speed: "fast", cost: "high", icon: "🎥" },
  { id: "openai:gpt-4o-2024-05-13", label: "GPT-4o (2024-05-13)", provider: "OpenAI", pricing: { input: 2.5, cached: null, output: 7.5 }, speed: "med", cost: "high", icon: "🗂️" },
  { id: "openai:gpt-4o-mini", label: "GPT-4o-mini", provider: "OpenAI", pricing: { input: 0.075, cached: null, output: 0.3 }, speed: "fast", cost: "low", icon: "✨" },
  { id: "openai:o1", label: "o1", provider: "OpenAI", pricing: { input: 7.5, cached: null, output: 30.0 }, speed: "slow", cost: "high", icon: "🧮" },
  { id: "openai:o1-pro", label: "o1-pro", provider: "OpenAI", pricing: { input: 75.0, cached: null, output: 300.0 }, speed: "slow", cost: "very-high", icon: "🏆" },
  { id: "openai:o3-pro", label: "o3-pro", provider: "OpenAI", pricing: { input: 10.0, cached: null, output: 40.0 }, speed: "med", cost: "high", icon: "🔎" },
  { id: "openai:o3", label: "o3", provider: "OpenAI", pricing: { input: 1.0, cached: null, output: 4.0 }, speed: "med", cost: "med", icon: "🧰" },
  { id: "openai:o3-deep-research", label: "o3 deep research", provider: "OpenAI", pricing: { input: 5.0, cached: null, output: 20.0 }, speed: "slow", cost: "high", icon: "🔭" },
  { id: "openai:o4-mini", label: "o4-mini", provider: "OpenAI", pricing: { input: 0.55, cached: null, output: 2.2 }, speed: "fast", cost: "low", icon: "🧪" },
  { id: "openai:o4-mini-deep-research", label: "o4-mini deep research", provider: "OpenAI", pricing: { input: 1.0, cached: null, output: 4.0 }, speed: "med", cost: "med", icon: "🔍" },
  { id: "openai:o3-mini", label: "o3-mini", provider: "OpenAI", pricing: { input: 0.55, cached: null, output: 2.2 }, speed: "fast", cost: "low", icon: "⚡" },
  { id: "openai:o1-mini", label: "o1-mini", provider: "OpenAI", pricing: { input: 0.55, cached: null, output: 2.2 }, speed: "fast", cost: "low", icon: "🧩" },
  // Anthropic
  { id: "anthropic:claude-3-opus", label: "Claude 3 Opus", provider: "Anthropic", pricing: { input: null, cached: null, output: null }, speed: "slow", cost: "high", icon: "🧭" },
  { id: "anthropic:claude-3.5-sonnet", label: "Claude 3.5 Sonnet", provider: "Anthropic", pricing: { input: null, cached: null, output: null }, speed: "fast", cost: "med", icon: "✍️" },
  // Google
  { id: "google:gemini-2.5-pro", label: "Gemini 2.5 Pro", provider: "Google", pricing: { input: null, cached: null, output: null }, speed: "med", cost: "med", icon: "📄" },
  { id: "google:gemini-2.5-flash", label: "Gemini 2.5 Flash", provider: "Google", pricing: { input: null, cached: null, output: null }, speed: "fast", cost: "low", icon: "⚡" },
  // xAI
  { id: "xai:grok-4", label: "Grok 4", provider: "xAI", pricing: { input: null, cached: null, output: null }, speed: "med", cost: "med", icon: "🌐" },
  { id: "xai:grok-3", label: "Grok 3", provider: "xAI", pricing: { input: null, cached: null, output: null }, speed: "fast", cost: "low", icon: "💬" },
  { id: "xai:grok-heavy", label: "Grok Heavy", provider: "xAI", pricing: { input: null, cached: null, output: null }, speed: "slow", cost: "high", icon: "🏋️" },
  // DeepSeek
  { id: "deepseek:r1", label: "DeepSeek R1", provider: "DeepSeek", pricing: { input: null, cached: null, output: null }, speed: "fast", cost: "low", icon: "💹" },
  // Z.ai & Kimi
  { id: "z:latest", label: "Z.ai (latest)", provider: "Z.ai", pricing: { input: null, cached: null, output: null }, speed: "med", cost: "med", icon: "⚖️" },
  { id: "kimi:k2", label: "Kimi K2", provider: "Kimi", pricing: { input: null, cached: null, output: null }, speed: "med", cost: "low", icon: "🀄" },
  // Qwen
  { id: "qwen:latest", label: "Qwen (latest)", provider: "Alibaba", pricing: { input: null, cached: null, output: null }, speed: "med", cost: "low", icon: "🐉" },
];

const MAX_SELECTED = 5;
const PRESET_KEY = "mlom:custom-presets";
const AppCtx = createContext<any>(null);
function useApp() { return useContext(AppCtx); }

function AppProvider({ children }: React.PropsWithChildren) {
  const defaultSelected: Record<string, boolean> = { "openai:gpt-4o": true, "anthropic:claude-3.5-sonnet": true, "google:gemini-2.5-pro": true, "deepseek:r1": true };
  const [selectedModels, setSelectedModels] = useState<Record<string, boolean>>(() => { const map: Record<string, boolean> = {}; MODEL_CATALOG.forEach(m => map[m.id] = !!defaultSelected[m.id]); return map; });
  const [temp, setTemp] = useState(0.6);
  const [maxTokens, setMaxTokens] = useState(800);
  const [timeoutSec, setTimeoutSec] = useState(60);
  const [tools, setTools] = useState(true);
  const [safety, setSafety] = useState(true);
  const [showWork, setShowWork] = useState(false);
  const [presets, setPresets] = useState(() => { try { return JSON.parse(localStorage.getItem(PRESET_KEY) || "[]"); } catch { return []; } });
  const { show, node } = useToast();

  function selectedCountOf(map: Record<string, boolean> = selectedModels) { return Object.values(map).filter(Boolean).length; }
  function safeToggle(id: string, next: boolean) {
    if (next) {
      if (selectedCountOf() >= MAX_SELECTED) { show(`Limit reached (${MAX_SELECTED}). Deselect a model first.`); return; }
    }
    setSelectedModels((s) => ({ ...s, [id]: next }));
  }

  function applyPreset(ids: string[]) {
    const draft: Record<string, boolean> = {}; MODEL_CATALOG.forEach(m => draft[m.id] = false);
    ids.slice(0, MAX_SELECTED).forEach(id => { draft[id] = true; });
    setSelectedModels(draft);
  }

  function saveCustomPreset(name: string) {
    const ids = Object.entries(selectedModels).filter(([,v]) => v).map(([k]) => k);
    if (!name || !ids.length) { show("Name and at least 1 model required."); return; }
    const next = [...presets, { name, ids }]; setPresets(next); localStorage.setItem(PRESET_KEY, JSON.stringify(next)); show("Preset saved");
  }
  function deleteCustomPreset(name: string) {
    const next = presets.filter((p: any) => p.name !== name); setPresets(next); localStorage.setItem(PRESET_KEY, JSON.stringify(next)); show("Preset deleted");
  }

  const value = useMemo(() => ({ selectedModels, setSelectedModels, temp, setTemp, maxTokens, setMaxTokens, timeoutSec, setTimeoutSec, tools, setTools, safety, setSafety, showWork, setShowWork, presets, saveCustomPreset, deleteCustomPreset, applyPreset, safeToggle, toastNode: node }), [selectedModels, temp, maxTokens, timeoutSec, tools, safety, showWork, presets, node]);
  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

function AppShell() {
  const [route, setRoute] = useState("chat");
  const { dark, setDark } = useDarkMode();
  const { toastNode } = useApp();
  return (
  <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
    <div className="flex">
      <Sidebar route={route} setRoute={setRoute} />
      <div className="flex-1 grid grid-rows-[auto_1fr] min-h-screen">
        <Topbar dark={dark} setDark={setDark} />
        <main className="p-6 md:p-8">
          {route === "chat" && <ChatPage />}
          {route === "runs" && <RunsPage />}
          {route === "settings" && <SettingsPage />}
          {route === "about" && <AboutPage />}
        </main>
      </div>
    </div>
    {toastNode}
  </div>
  );
}

function Sidebar({ route, setRoute }: { route: string; setRoute: (r: string) => void }) {
  const NavItem = ({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) => (
    <button onClick={() => setRoute(value)} className={cn("flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-colors", route === value ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900" : "hover:bg-neutral-100 dark:hover:bg-neutral-900/50")}>
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
  return (
    <aside className="hidden md:flex w-64 flex-col gap-6 p-6 border-r border-neutral-200 dark:border-neutral-900">
      <div className="flex items-center gap-3"><div className="h-9 w-9 rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500" /><div className="font-semibold tracking-tight">Atlas</div></div>
      <div className="flex flex-col gap-2">
        <NavItem icon={<Bot className="h-4 w-4" />} label="Chat" value="chat" />
        <NavItem icon={<History className="h-4 w-4" />} label="Runs" value="runs" />
        <NavItem icon={<SettingsIcon className="h-4 w-4" />} label="Settings" value="settings" />
        <NavItem icon={<Info className="h-4 w-4" />} label="How It Works" value="about" />
      </div>
      <div className="mt-auto text-xs text-neutral-500">Fan‑out → Judge → Synthesis</div>
    </aside>
  );
}

function Topbar({ dark, setDark }: { dark: boolean; setDark: (v: boolean) => void }) {
  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-4 border-b border-neutral-200 dark:border-neutral-900">
      <div className="flex items-center gap-2">
        <Badge variant="outline">Enterprise</Badge>
        <Badge variant="outline">0% commissions</Badge>
        <Button size="sm" variant="secondary" onClick={() => (document.getElementById('codegen-modal') as HTMLDialogElement)?.showModal()}>Codegen</Button>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="toggle theme" onClick={() => setDark(!dark)} title="Toggle theme">{dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}</Button>
      </div>
    </header>
  );
}

function ChatPage() {
  const [messages, setMessages] = useState<{ who: "user"|"assistant"; text: string }[]>([{ who: "assistant", text: "Hey — ask me anything. I’ll quietly consult multiple models and bring you one clean answer." }]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [roundInfo, setRoundInfo] = useState<{ round?: number; totalRounds?: number }>({});
  const { selectedModels, temp, maxTokens, timeoutSec } = useApp();

  const threadRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { if (threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight; }, [messages, busy, step]);

  async function send() {
    if (!input.trim() || busy) return;
    const userText = input.trim();
    setMessages((m) => [...m, { who: "user", text: userText }]);
    setInput("");
    setBusy(true); setStep(0);

    const selected = Object.entries(selectedModels).filter(([,v]) => v).map(([k]) => k);
    const body = { messages: [...messages, { who: "user" as const, text: userText }], selectedModels: selected, params: { temperature: temp, maxTokens, timeoutSec, tools: true, safety: true, showWork: false } };

    const es = new EventSourcePolyfill("/api/chat", { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
    es.on("status", (e: MessageEvent) => {
      const data = JSON.parse(e.data);
      if (data.stage === "dispatch") { setStep(0); setRoundInfo({ round: data.round, totalRounds: data.totalRounds }); }
      else if (data.stage === "evaluate") { setStep(1); setRoundInfo((r)=>({ ...r, round: data.round ?? r.round, totalRounds: data.totalRounds ?? r.totalRounds })); }
      else if (data.stage === "synthesize") { setStep(2); }
    });
    es.on("partial", () => {});
    es.on("final", (e: MessageEvent) => {
      const payload = JSON.parse(e.data);
      const text = payload.text;
      const files: string[] | undefined = payload.files;
      let msg = text;
      if (Array.isArray(files) && files.length) {
        msg += "\n\nFiles:\n" + files.map(f=>`- ${f}`).join("\n");
      }
      setMessages((m) => [...m, { who: "assistant", text: msg }]);
      setBusy(false);
    });
    es.on("done", () => { es.close(); });
    es.on("error", (e: MessageEvent) => {
      setMessages((m) => [...m, { who: "assistant", text: "There was an error orchestrating models." }]);
      setBusy(false);
      es.close();
    });
  }
  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) { if ((e.key === "Enter" && !e.shiftKey) || (e.key === "Enter" && (e.metaKey || e.ctrlKey))) { e.preventDefault(); send(); } }

  const selectedCount = Object.values(selectedModels).filter(Boolean).length;

  return (
    <div className="mx-auto max-w-4xl h-full flex flex-col">
      <div ref={threadRef} className="flex-1 overflow-y-auto space-y-3 p-2 pb-40">
        {messages.map((m, i) => (<ChatBubble key={i} who={m.who} text={m.text} />))}
        {busy && (<div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-4"><StepTicker step={step} round={roundInfo.round} totalRounds={roundInfo.totalRounds} /></div>)}
      </div>
      <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
        <div className="mx-auto max-w-4xl px-4 pb-4">
          <div className="pointer-events-auto rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-neutral-950/90 backdrop-blur p-2 flex items-end gap-2 shadow-lg">
            <AutoTextarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={onKeyDown} placeholder="Type your message…" minRows={1} maxRows={12} className="flex-1" />
            <Button onClick={send} size="icon" title="Send" disabled={busy}><Send className="h-4 w-4" /></Button>
          </div>
          <div className="mt-2 flex items-center justify-between text-xs text-neutral-500 pointer-events-auto">
            <div className="flex items-center gap-2"><Badge variant="outline">{selectedCount} models</Badge><span>Temp {temp.toFixed(2)}</span><span>Max {maxTokens}</span></div>
            <div className="hidden sm:block">Enter to send • Shift+Enter for newline</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ who, text }: { who: "user"|"assistant"; text: string }) {
  const isUser = who === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div className={cn(isUser ? "bg-blue-600 text-white border-blue-700" : "bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 border-neutral-200 dark:border-neutral-800", "max-w-[80%] rounded-2xl px-4 py-3 shadow border")}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{text}</p>
      </div>
    </div>
  );
}

function StepTicker({ step, round, totalRounds }: { step: number; round?: number; totalRounds?: number }) {
  const steps = ["Dispatching to models", "Evaluating answers", "Synthesizing final answer"];
  return (
    <div className="w-full">
      <div className="h-2 w-full rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
        <div className="h-2 bg-blue-600 transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs text-neutral-500">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        <span>{steps[Math.min(step, steps.length - 1)]}{round ? ` · Round ${round}${totalRounds ? `/${totalRounds}`: ""}`: ""}</span>
      </div>
    </div>
  );
}

function RunsPage() {
  const [runs, setRuns] = useState<any[]>([]);
  useEffect(() => { fetch("/api/runs").then(r => r.json()).then(d => setRuns(d.runs || [])); }, []);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <Input className="pl-9" placeholder="Search prompts…" />
          </div>
          <Button variant="outline"><Filter className="h-4 w-4 mr-2" />Filter</Button>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline"><Download className="h-4 w-4 mr-2" />Export</Button>
          <Button variant="outline"><Share2 className="h-4 w-4 mr-2" />Share</Button>
        </div>
      </div>
      <div className="grid gap-3">
        {runs.map((r, i) => (
          <Card key={i}><CardContent className="p-4"><div className="flex items-center justify-between gap-3">
            <div className="min-w-0"><div className="text-sm line-clamp-1">{r.prompt}</div>
            <div className="text-xs text-neutral-500 mt-1">{r.created_at} • {JSON.parse(r.models || "[]").length} models • {r.status}</div></div>
            <div className="flex items-center gap-2"><Badge variant="outline">${(r.cost_cents/100).toFixed(3)}</Badge><Button size="sm" variant="secondary">Open</Button></div>
          </div></CardContent></Card>
        ))}
      </div>
    </div>
  );
}

function SettingsPage() {
  const { selectedModels, setSelectedModels, temp, setTemp, maxTokens, setMaxTokens, timeoutSec, setTimeoutSec, tools, setTools, safety, setSafety, showWork, setShowWork, presets, saveCustomPreset, deleteCustomPreset, applyPreset, safeToggle } = useApp();
  const selectedCount = useMemo(() => Object.values(selectedModels).filter(Boolean).length, [selectedModels]);
  const [newPresetName, setNewPresetName] = useState("");

  const presetsBuiltIn = [
    { name: "Smart core", ids: ["openai:gpt-4o","anthropic:claude-3.5-sonnet","google:gemini-2.5-pro","deepseek:r1","z:latest"] },
    { name: "Deep thinker", ids: ["openai:gpt-5","openai:o3-deep-research","google:gemini-2.5-pro","xai:grok-4","deepseek:r1"] },
    { name: "Everyday", ids: ["openai:gpt-4o","anthropic:claude-3.5-sonnet","google:gemini-2.5-flash","xai:grok-3","kimi:k2"] },
    { name: "Blazing fast", ids: ["openai:gpt-5-nano","openai:gpt-4.1-nano","openai:o3-mini","google:gemini-2.5-flash","xai:grok-3"] },
    { name: "Select all", ids: MODEL_CATALOG.map(m => m.id) },
    { name: "Clear all", ids: [] },
  ];

  function handleApplyPreset(ids: string[], name: string) {
    if (name === "Clear all") { const draft: Record<string, boolean> = {}; MODEL_CATALOG.forEach(m => draft[m.id] = false); setSelectedModels(draft); return; }
    applyPreset(ids);
  }

  function toggleModel(id: string, next: boolean) { safeToggle(id, next); }

  return (
  <div className="mx-auto max-w-4xl space-y-10">
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-sm font-medium">Models</h3>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline">{selectedCount}/{MAX_SELECTED} selected</Badge>
          {presetsBuiltIn.map(p => (
            <Button key={p.name} variant="outline" size="sm" onClick={() => handleApplyPreset(p.ids, p.name)}>{p.name}</Button>
          ))}
          {presets.map((p: any) => (
            <span key={p.name} className="inline-flex items-center">
              <Button variant="outline" size="sm" className="mr-1" onClick={() => applyPreset(p.ids)}>{p.name}</Button>
              <button className="h-6 w-6 inline-flex items-center justify-center rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={() => deleteCustomPreset(p.name)} title="Delete preset"><XIcon className="h-3.5 w-3.5" /></button>
            </span>
          ))}
          <div className="flex items-center gap-2">
            <Input placeholder="New preset name" value={newPresetName} onChange={e=>setNewPresetName(e.target.value)} className="h-9 w-40" />
            <Button size="sm" onClick={() => { const name = newPresetName.trim(); if (name) { saveCustomPreset(name); setNewPresetName(""); } }}><Plus className="h-4 w-4 mr-1" />Save preset</Button>
          </div>
        </div>
      </div>
      <Card>
        <CardContent className="divide-y divide-neutral-200 dark:divide-neutral-800 p-0">
          {MODEL_CATALOG.map((m) => (
            <div key={m.id} className="flex items-center justify-between p-4">
              <div className="min-w-0">
                <div className="text-sm font-medium truncate flex items-center gap-2"><span className="text-base" aria-hidden>{m.icon}</span><span>{m.label}</span></div>
                <div className="text-xs text-neutral-500 truncate">{m.provider} • speed {m.speed} • cost {m.cost}</div>
              </div>
              <Switch checked={!!selectedModels[m.id]} onChange={(v) => toggleModel(m.id, v)} />
            </div>
          ))}
        </CardContent>
      </Card>
    </section>

    <section className="space-y-3">
      <div className="flex items-center justify-between"><h3 className="text-sm font-medium">Parameters</h3><Badge>Pro</Badge></div>
      <Card>
        <CardContent className="grid md:grid-cols-2 gap-6 pt-6">
          <div><div className="flex items-center justify-between text-xs mb-2"><span>Temperature</span><span>{temp.toFixed(2)}</span></div><Slider value={temp} onChange={setTemp} min={0} max={1} step={0.01} /></div>
          <div><div className="flex items-center justify-between text-xs mb-2"><span>Max tokens</span><span>{maxTokens}</span></div><Slider value={maxTokens} onChange={setMaxTokens} min={128} max={4096} step={32} /></div>
          <div><div className="flex items-center justify-between text-xs mb-2"><span>Timeout (s)</span><span>{timeoutSec}</span></div><Slider value={timeoutSec} onChange={setTimeoutSec} min={10} max={180} step={5} /></div>
          <div className="flex items-center justify-between"><span className="text-sm">Tools</span><Switch checked={tools} onChange={setTools} /></div>
          <div className="flex items-center justify-between"><span className="text-sm">Safety</span><Switch checked={safety} onChange={setSafety} /></div>
          <div className="flex items-center justify-between"><span className="text-sm">Show work (breakdown & reasoning)</span><Switch checked={showWork} onChange={setShowWork} /></div>
        </CardContent>
      </Card>
    </section>

    <APIKeysSection />

    <section className="space-y-3">
      <h3 className="text-sm font-medium">Appearance & Data</h3>
      <Card>
        <CardContent className="grid md:grid-cols-2 gap-6 pt-6">
          <div className="flex items-center justify-between"><span className="text-sm">Theme</span><div className="flex items-center gap-2"><Button variant="outline" size="sm" onClick={() => { document.documentElement.classList.remove("dark"); localStorage.setItem("mlom:theme", "light"); }}>Light</Button><Button variant="outline" size="sm" onClick={() => { document.documentElement.classList.add("dark"); localStorage.setItem("mlom:theme", "dark"); }}>Dark</Button></div></div>
          <div className="flex items-center justify-between"><span className="text-sm">Clear history</span><Button variant="danger" size="sm" onClick={() => fetch("/api/runs", { method: "DELETE" }).then(() => location.reload())}>Clear</Button></div>
        </CardContent>
      </Card>
    </section>
  </div>
  );
}

function APIKeysSection() {
  const [keys, setKeys] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetch("/api/keys").then(r => r.json()).then(d => { setKeys(d.keys || {}); }).finally(() => setLoading(false));
  }, []);
  function updateKey(name: string, value: string) { setKeys((k) => ({ ...k, [name]: value })); }
  function save() { fetch("/api/keys", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ keys }) }).then(() => alert("Saved")); }
  function clearAll() { fetch("/api/keys", { method: "DELETE" }).then(() => setKeys({})); }
  const fields = [ { id: "OPENAI_API_KEY", label: "OpenAI" }, { id: "ANTHROPIC_API_KEY", label: "Anthropic" }, { id: "GOOGLE_API_KEY", label: "Google (Gemini)" }, { id: "XAI_API_KEY", label: "xAI (Grok)" }, { id: "DEEPSEEK_API_KEY", label: "DeepSeek" }, { id: "Z_API_KEY", label: "Z.ai" }, { id: "KIMI_API_KEY", label: "Kimi" }, { id: "QWEN_API_KEY", label: "Qwen" } ];
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2"><KeyRound className="h-4 w-4" /><h3 className="text-sm font-medium">API Keys</h3></div>
      <Card>
        <CardContent className="grid gap-3 pt-6">
          {fields.map((k) => (
            <div key={k.id} className="grid grid-cols-4 items-center gap-3">
              <label className="col-span-1 text-sm">{k.label}</label>
              <Input className="col-span-3" type="password" placeholder={`sk-… (${k.id})`} value={keys[k.id] || ""} onChange={(e) => updateKey(k.id, e.target.value)} />
            </div>
          ))}
          <div className="flex justify-between">
            <Button variant="secondary" onClick={clearAll}>Clear all</Button>
            <Button onClick={save}>Save</Button>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function AboutPage() {
  return (
    <div className="relative">
      {/* Background visuals */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-grid dark:bg-grid-dark opacity-60" />
        <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-gradient-to-br from-blue-500/30 via-cyan-400/30 to-emerald-300/30 blur-3xl animate-floaty" />
        <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-gradient-to-br from-fuchsia-500/30 via-purple-400/30 to-blue-400/30 blur-3xl animate-floaty" style={{ animationDelay: '1.2s' }} />
      </div>

      <div className="mx-auto max-w-5xl space-y-10">
        {/* Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-neutral-200 dark:border-neutral-800 bg-white/70 dark:bg-neutral-900/70 backdrop-blur p-8 md:p-12">
          <div className="absolute -inset-1 opacity-30 pointer-events-none bg-[radial-gradient(1200px_400px_at_80%_-10%,rgba(59,130,246,0.25),transparent)]" />
          <div className="grid md:grid-cols-2 gap-8 items-center relative">
            <div>
              <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">How It Works</h1>
              <p className="mt-3 text-neutral-600 dark:text-neutral-300 leading-relaxed">Atlas orchestrates multiple foundation models in parallel, judges responses, and synthesizes a single, clean answer. Built for clarity, leverage, and speed.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Badge>Fan‑out</Badge>
                <Badge>Judge</Badge>
                <Badge>Synthesize</Badge>
                <Badge variant="outline">Streaming</Badge>
                <Badge variant="outline">Enterprise‑ready</Badge>
              </div>
            </div>
            {/* Animated diagram */}
            <div className="relative">
              <div className="aspect-[4/3] rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-gradient-to-br from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900 p-6">
                <svg viewBox="0 0 520 360" className="h-full w-full">
                  <defs>
                    <linearGradient id="grad" x1="0" x2="1" y1="0" y2="1">
                      <stop offset="0%" stopColor="#60a5fa"/>
                      <stop offset="100%" stopColor="#22d3ee"/>
                    </linearGradient>
                  </defs>
                  {/* User prompt */}
                  <g>
                    <rect x="24" y="150" rx="12" ry="12" width="150" height="60" fill="url(#grad)" opacity="0.15" />
                    <text x="36" y="186" className="fill-neutral-700 dark:fill-neutral-200" fontSize="14">User Prompt</text>
                  </g>
                  {/* Model nodes */}
                  {Array.from({ length: 4 }).map((_, i) => (
                    <g key={i} transform={`translate(${220 + (i%2)*140}, ${90 + Math.floor(i/2)*120})`}>
                      <rect width="120" height="60" rx="12" ry="12" fill="#0ea5e9" opacity="0.12" />
                      <text x="16" y="36" className="fill-neutral-700 dark:fill-neutral-300" fontSize="13">Model {i+1}</text>
                    </g>
                  ))}
                  {/* Arrows fan-out */}
                  {Array.from({ length: 4 }).map((_, i) => (
                    <g key={`a${i}`}> 
                      <path d={`M174 180 C 200 ${150 + i*20}, ${220 + (i%2)*140} ${120 + Math.floor(i/2)*120}, ${220 + (i%2)*140} ${120 + Math.floor(i/2)*120}`} fill="none" stroke="url(#grad)" strokeWidth="2" className="animate-dash" />
                    </g>
                  ))}
                  {/* Judge node */}
                  <g>
                    <rect x="200" y="12" rx="12" ry="12" width="120" height="40" fill="#22c55e" opacity="0.15" />
                    <text x="218" y="38" className="fill-neutral-700 dark:fill-neutral-300" fontSize="13">Judge</text>
                  </g>
                  {/* Synthesis */}
                  <g>
                    <rect x="380" y="150" rx="12" ry="12" width="120" height="60" fill="#22c55e" opacity="0.15" />
                    <text x="394" y="186" className="fill-neutral-700 dark:fill-neutral-300" fontSize="13">Synthesis</text>
                  </g>
                  {/* Arrows back */}
                  {Array.from({ length: 2 }).map((_, i) => (
                    <path key={`b${i}`} d={`M${340 - i*10} ${180 - i*5} C 360 180, 380 180, 380 180`} fill="none" stroke="url(#grad)" strokeWidth="2" className="animate-dash" />
                  ))}
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-4">
          {[{title:'1. Fan‑out',desc:'Dispatch your prompt to multiple best‑in‑class models in parallel for coverage and diversity.'},{title:'2. Judge',desc:'Rank candidates by relevance, coherence, depth, and low repetition.'},{title:'3. Synthesize',desc:'Blend the best pieces into a single, fluent final answer.'}].map((s, i) => (
            <div key={i} className="relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
              <div className="absolute -inset-1 opacity-20 bg-gradient-to-br from-blue-500/30 via-cyan-400/30 to-emerald-300/30 animate-gradient" />
              <div className="relative">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500" />
                <h3 className="mt-4 font-medium">{s.title}</h3>
                <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-400">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Stats / Infographic */}
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <div className="text-sm text-neutral-500">Live telemetry</div>
              <div className="text-lg font-medium">Throughput & Savings</div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-3 text-center">
                {[{k:'Avg time',v:'2.8s'},{k:'Tokens saved',v:'32%'},{k:'Win‑rate',v:'78%'}].map((m,i)=> (
                  <div key={i} className="rounded-xl border border-neutral-200 dark:border-neutral-800 p-4">
                    <div className="text-xs text-neutral-500">{m.k}</div>
                    <div className="text-lg font-semibold mt-1">{m.v}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 h-36 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-gradient-to-b from-neutral-50 to-white dark:from-neutral-950 dark:to-neutral-900">
                <svg viewBox="0 0 520 140" className="h-full w-full">
                  <polyline points="0,120 60,110 120,95 180,88 240,80 300,62 360,58 420,44 480,36 520,28" fill="none" stroke="url(#grad)" strokeWidth="3" />
                </svg>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="text-sm text-neutral-500">Providers</div>
              <div className="text-lg font-medium">Best‑of‑breed, side‑by‑side</div>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              {["OpenAI","Anthropic","Google","xAI","DeepSeek","Z.ai","Kimi","Qwen"].map((p,i)=> (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-neutral-200 dark:border-neutral-800 p-3">
                  <ProviderIcon name={p} />
                  <div className="text-sm">{p}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="flex items-center justify-between rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 p-6">
          <div>
            <div className="text-sm text-neutral-500">Ready to try?</div>
            <div className="text-lg font-medium">Open chat and ask anything.</div>
          </div>
          <a href="#" onClick={(e)=>{e.preventDefault(); (document.querySelector('[data-route="chat"]') as HTMLButtonElement)?.click();}}>
            <Button>Open Chat</Button>
          </a>
        </div>
      </div>
    </div>
  );
}

function ProviderIcon({ name }: { name: string }) {
  const common = "h-8 w-8 rounded-lg flex items-center justify-center shadow-sm border border-neutral-200 dark:border-neutral-800";
  switch (name) {
    case "OpenAI":
      return (
        <div className={cn(common, "bg-gradient-to-br from-neutral-900 to-neutral-700 text-white")}
             title="OpenAI" aria-label="OpenAI">
          <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M16 3.5c3 0 5.5 2.5 5.5 5.5v2.2c1.6.9 2.7 2.6 2.7 4.6 0 2.9-2.4 5.3-5.3 5.3h-2.2c-.9 1.6-2.6 2.7-4.6 2.7-3 0-5.5-2.5-5.5-5.5V16c-1.6-.9-2.7-2.6-2.7-4.6 0-2.9 2.4-5.3 5.3-5.3h2.2c.9-1.6 2.6-2.7 4.6-2.7z"/>
          </svg>
        </div>
      );
    case "Anthropic":
      return (
        <div className={cn(common, "bg-amber-500/10 text-amber-600 dark:text-amber-400")}
             title="Anthropic" aria-label="Anthropic">
          <span className="text-[13px] font-semibold">A</span>
        </div>
      );
    case "Google":
      return (
        <div className={cn(common, "bg-white dark:bg-neutral-900")}
             title="Google" aria-label="Google">
          <svg viewBox="0 0 24 24" className="h-5 w-5">
            <path fill="#4285F4" d="M21.35 12.2c0-.64-.06-1.27-.18-1.87H12v3.54h5.27a4.5 4.5 0 0 1-1.95 2.95v2.44h3.16c1.85-1.7 2.87-4.2 2.87-7.06z"/>
            <path fill="#34A853" d="M12 22c2.6 0 4.78-.86 6.37-2.34l-3.16-2.44c-.88.6-2.02.95-3.21.95-2.47 0-4.57-1.66-5.32-3.88H3.41v2.45A10 10 0 0 0 12 22z"/>
            <path fill="#FBBC05" d="M6.68 14.29a5.99 5.99 0 0 1 0-4.58V7.26H3.41a10 10 0 0 0 0 9.48l3.27-2.45z"/>
            <path fill="#EA4335" d="M12 5.5c1.41 0 2.68.49 3.68 1.46l2.75-2.75A9.53 9.53 0 0 0 12 2 10 10 0 0 0 3.41 7.26l3.27 2.45C7.43 7.48 9.53 5.5 12 5.5z"/>
          </svg>
        </div>
      );
    case "xAI":
      return (
        <div className={cn(common, "bg-neutral-900 text-white")}
             title="xAI" aria-label="xAI">
          <span className="text-[12px] font-semibold">x</span>
        </div>
      );
    case "DeepSeek":
      return (
        <div className={cn(common, "bg-sky-500/10 text-sky-600 dark:text-sky-400")}
             title="DeepSeek" aria-label="DeepSeek">
          <span className="text-[12px] font-semibold">DS</span>
        </div>
      );
    case "Z.ai":
      return (
        <div className={cn(common, "bg-violet-500/10 text-violet-600 dark:text-violet-400")}
             title="Z.ai" aria-label="Z.ai">
          <span className="text-[12px] font-semibold">Z</span>
        </div>
      );
    case "Kimi":
      return (
        <div className={cn(common, "bg-pink-500/10 text-pink-600 dark:text-pink-400")}
             title="Kimi" aria-label="Kimi">
          <span className="text-[12px] font-semibold">K</span>
        </div>
      );
    case "Qwen":
      return (
        <div className={cn(common, "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400")}
             title="Qwen" aria-label="Qwen">
          <span className="text-[12px] font-semibold">Q</span>
        </div>
      );
    default:
      return <div className={cn(common, "bg-neutral-100 dark:bg-neutral-900")} />;
  }
}

function useDesignSmokeTests() {
  useEffect(() => {
    try {
      console.assert(Array.isArray(MODEL_CATALOG) && MODEL_CATALOG.length > 0, "Model catalog exists");
      ["openai:gpt-4o","anthropic:claude-3.5-sonnet","google:gemini-2.5-pro","xai:grok-4","z:latest","kimi:k2","qwen:latest"].forEach(id => {
        console.assert(MODEL_CATALOG.some((m) => m.id === id), `Model missing: ${id}`);
      });
      console.log("[UI smoke tests] basic checks passed ✅");
    } catch (e) { console.warn("[UI smoke tests] failed", e); }
  }, []);
}

export default function App() {
  useDesignSmokeTests();
  return (
    <AppProvider>
      <AppShell />
      <CodegenModal />
    </AppProvider>
  );
}

// Minimal EventSource polyfill for POST streams using fetch + ReadableStream
class EventSourcePolyfill {
  private controller: AbortController;
  private listeners: Record<string, ((e: MessageEvent) => void)[]> = {};
  private isClosing = false;
  constructor(private url: string, private init: { method?: string; headers?: Record<string,string>; body?: string }) {
    this.controller = new AbortController();
    this.connect();
  }
  private async connect() {
    try {
      const resp = await fetch(this.url, { method: this.init.method || "GET", headers: this.init.headers, body: this.init.body, signal: this.controller.signal });
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buf.indexOf("\n\n")) !== -1) {
          const chunk = buf.slice(0, idx);
          buf = buf.slice(idx + 2);
          const event = parseSseChunk(chunk);
          if (event && this.listeners[event.event]) this.listeners[event.event].forEach(fn => fn(new MessageEvent(event.event, { data: event.data })));
        }
      }
    } catch (err: any) {
      if (this.isClosing && err?.name === 'AbortError') {
        // ignore expected abort during close
        return;
      }
      if (this.listeners['error']) this.listeners['error'].forEach(fn => fn(new MessageEvent('error', { data: JSON.stringify({ message: String(err?.message || err) }) })));
    }
  }
  on(event: string, fn: (e: MessageEvent) => void) { (this.listeners[event] ||= []).push(fn); }
  close() { this.isClosing = true; this.controller.abort(); }
}

function parseSseChunk(chunk: string): { event: string; data: string } | null {
  const lines = chunk.split(/\n/);
  let event = "message"; let data = "";
  for (const ln of lines) {
    if (ln.startsWith("event:")) event = ln.slice(6).trim();
    else if (ln.startsWith("data:")) data += (data ? "\n" : "") + ln.slice(5).trim();
  }
  return { event, data };
}

function CodegenModal() {
  const ref = useRef<HTMLDialogElement | null>(null);
  const [spec, setSpec] = useState("");
  const [files, setFiles] = useState<{ path: string; instruction: string }[]>([]);
  const { selectedModels } = useApp();
  function addRow() { setFiles((f)=>[...f, { path: "", instruction: "" }]); }
  async function plan() {
    const selected = Object.entries(selectedModels || {}).filter(([,v])=>v).map(([k])=>k);
    const resp = await fetch("/api/codegen/plan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spec, selectedModels: selected }) });
    const data = await resp.json();
    if (Array.isArray(data.files)) setFiles(data.files);
  }
  async function submit() {
    const selected = Object.entries(selectedModels || {}).filter(([,v])=>v).map(([k])=>k);
    const resp = await fetch("/api/codegen/zip", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ spec, files, selectedModels: selected, params: { rounds: 3, temperature: 0.4, maxTokens: 2048, timeoutSec: 60 } }) });
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'codegen.zip'; a.click();
    URL.revokeObjectURL(url);
    (ref.current as HTMLDialogElement).close();
  }
  return (
    <dialog id="codegen-modal" ref={ref} className="rounded-2xl p-0 border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 w-[640px] max-w-[90vw]">
      <div className="p-6">
        <div className="text-lg font-medium">Generate Project Files</div>
        <div className="text-sm text-neutral-500 mt-1">Manager agent will plan and request each file, bundling them as a zip.</div>
        <div className="mt-4 space-y-3">
          <div>
            <div className="text-xs mb-1">Project spec</div>
            <Textarea value={spec} onChange={(e)=>setSpec(e.target.value)} rows={6} placeholder="Describe the app, stack, and requirements..." />
          </div>
          <div>
            <div className="text-xs mb-1">Files</div>
            <div className="space-y-2">
              {files.map((f, i) => (
                <div key={i} className="grid grid-cols-5 gap-2">
                  <Input className="col-span-2" placeholder="path/to/file.ext" value={f.path} onChange={(e)=>{
                    const v = e.target.value; setFiles((arr)=>arr.map((x,idx)=> idx===i? {...x, path:v}: x));
                  }} />
                  <Input className="col-span-3" placeholder="Instruction for this file" value={f.instruction} onChange={(e)=>{
                    const v = e.target.value; setFiles((arr)=>arr.map((x,idx)=> idx===i? {...x, instruction:v}: x));
                  }} />
                </div>
              ))}
            </div>
            <div className="mt-2"><Button size="sm" variant="secondary" onClick={addRow}>Add file</Button></div>
          </div>
        </div>
        <div className="mt-5 flex justify-between gap-2">
          <div className="flex gap-2">
            <Button variant="secondary" onClick={plan}>Plan files</Button>
            <Button variant="secondary" onClick={addRow}>Add file</Button>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={()=> (ref.current as HTMLDialogElement).close()}>Cancel</Button>
            <Button onClick={submit}>Generate zip</Button>
          </div>
        </div>
      </div>
    </dialog>
  );
}

