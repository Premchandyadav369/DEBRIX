import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, X, Bot, User, Sparkles, Rocket } from "lucide-react";
import ReactMarkdown from "react-markdown";

const EDGE_FN_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/k2-chat`;

const SYSTEM_PROMPT = `You are **DEBRIX AI** — a highly knowledgeable space & orbital-mechanics assistant embedded in the Debrix Space Debris Removal mission control website.

Your expertise includes:
- Space debris tracking, cataloging, and removal strategies
- Orbital mechanics: Kessler syndrome, orbital decay, collision avoidance maneuvers, delta-V budgets
- Active Debris Removal (ADR) technologies: robotic arms, nets, harpoons, ion-beam shepherding, laser ablation
- Satellite constellations: Starlink, OneWeb, Kuiper — their debris implications
- ISS operations, docking procedures, EVA protocols
- NASA, ESA, JAXA, ISRO missions and spacecraft
- Current astronauts in space, their missions and spacecraft
- Space weather: solar flares, CMEs, geomagnetic storms, radiation belts
- Near-Earth Objects (NEOs), planetary defense (DART mission)
- Launch vehicles, propulsion, re-entry dynamics
- Historical space events: Cosmos-1408 ASAT test, Iridium-Cosmos collision, Tiangong, Mir

Response guidelines:
- Be concise but thorough. Use markdown formatting (headers, bold, lists, code blocks).
- Include real data, numbers, and facts when possible.
- For astronaut queries, provide current crew info if known.
- Sign off complex answers with a relevant space fact or quote.
- Keep a professional yet enthusiastic tone befitting mission control.`;

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_PROMPTS = [
  "Who is currently on the ISS?",
  "Explain Kessler Syndrome",
  "How does Debrix remove debris?",
  "Latest NEO threats?",
  "What is orbital decay?",
];

export default function SpaceChatSection() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: Message = { role: "user", content: text.trim() };
      const history = [...messages, userMsg];
      setMessages(history);
      setInput("");
      setIsStreaming(true);

      let assistantContent = "";

      try {
        const res = await fetch(EDGE_FN_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "text/event-stream",
          },
          body: JSON.stringify({
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...history.map((m) => ({ role: m.role, content: m.content })),
            ],
            stream: true,
          }),
        });

        if (!res.ok) {
          throw new Error(`API error ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let buffer = "";

        const updateAssistant = (content: string) => {
          setMessages((prev) => {
            const last = prev[prev.length - 1];
            if (last?.role === "assistant") {
              return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content } : m));
            }
            return [...prev, { role: "assistant", content }];
          });
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIdx: number;
          while ((newlineIdx = buffer.indexOf("\n")) !== -1) {
            let line = buffer.slice(0, newlineIdx);
            buffer = buffer.slice(newlineIdx + 1);
            if (line.endsWith("\r")) line = line.slice(0, -1);
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6).trim();
            if (jsonStr === "[DONE]") break;
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                assistantContent += delta;
                updateAssistant(assistantContent);
              }
            } catch {
              // partial JSON, skip
            }
          }
        }

        // flush remaining buffer
        if (buffer.trim()) {
          for (let raw of buffer.split("\n")) {
            if (!raw.startsWith("data: ")) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                assistantContent += delta;
                updateAssistant(assistantContent);
              }
            } catch {}
          }
        }

        if (!assistantContent) {
          // Non-streaming fallback
          const fallbackRes = await fetch(EDGE_FN_URL, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messages: [
                { role: "system", content: SYSTEM_PROMPT },
                ...history.map((m) => ({ role: m.role, content: m.content })),
              ],
              stream: false,
            }),
          });
          const data = await fallbackRes.json();
          assistantContent = data.choices?.[0]?.message?.content || "I couldn't generate a response. Please try again.";
          updateAssistant(assistantContent);
        }
      } catch (err) {
        console.error("Chat error:", err);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "⚠️ Connection error. Please try again." },
        ]);
      } finally {
        setIsStreaming(false);
      }
    },
    [messages, isStreaming]
  );

  return (
    <>
      {/* Floating chat button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:scale-110 transition-transform ${isOpen ? "hidden" : ""}`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        title="Chat with DEBRIX AI"
      >
        <MessageCircle className="w-6 h-6" />
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-4rem)] flex flex-col rounded-2xl border border-border bg-card shadow-2xl overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/50">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Rocket className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-display font-semibold text-foreground">DEBRIX AI</p>
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    Powered by K2 Think V2
                  </p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin">
              {messages.length === 0 && (
                <div className="text-center pt-8">
                  <Sparkles className="w-10 h-10 text-primary mx-auto mb-3 opacity-60" />
                  <p className="text-sm font-display text-foreground mb-1">Welcome, Commander</p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Ask me anything about space debris, orbital mechanics, astronauts, or the Debrix mission.
                  </p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {QUICK_PROMPTS.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="text-[10px] px-3 py-1.5 rounded-full border border-border bg-secondary/50 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex gap-2 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" && (
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-3.5 h-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-secondary/70 text-foreground rounded-bl-sm"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_code]:text-[10px] [&_pre]:text-[10px]">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      msg.content
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center shrink-0 mt-1">
                      <User className="w-3.5 h-3.5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {isStreaming && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex gap-2">
                  <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                    <Bot className="w-3.5 h-3.5 text-primary animate-pulse" />
                  </div>
                  <div className="bg-secondary/70 rounded-xl px-3 py-2 text-xs text-muted-foreground">
                    <span className="animate-pulse">Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="px-3 py-3 border-t border-border bg-secondary/30">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  sendMessage(input);
                }}
                className="flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about space, debris, astronauts..."
                  disabled={isStreaming}
                  className="flex-1 bg-secondary/50 border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 transition-colors disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isStreaming || !input.trim()}
                  className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/80 transition-colors disabled:opacity-30"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
