/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { MessageSquareText, Send, Sparkles, RefreshCw, Globe, HelpCircle, CornerDownRight } from "lucide-react";
import { ChatMessage } from "../types";
import { sendChatMessage } from "../services/apiService";

interface AIChatProps {
  onSelectStock: (ticker: string) => void;
}

export default function AIChat({ onSelectStock }: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "init",
      sender: "ai",
      text: `Welcome to the VM ALGO AI Terminal Chat Desk.

I am your Bloomberg-style Research Assistant with real-time web grounding across Indian Equity Exchanges.

Select a quick-analyst prompt below or enter a custom institutional inquiry.`,
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false })
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    { label: "Compare TCS and INFY", query: "Compare Tata Consultancy Services (TCS) and Infosys (INFY) fundamentals, operating margins and current ROE ratios." },
    { label: "Best Private Banks", query: "Which private banking stocks in the NSE index are undervalued based on P/B ratio and asset quality?" },
    { label: "Explain RELIANCE Moat", query: "Provide a detailed breakdown of Reliance Industries (RELIANCE) competitive moat and capital allocation strategy." },
    { label: "Nifty Derivatives Outlook", query: "What is the Nifty Options PCR and Max Pain level indicating for the upcoming weekly expiry?" }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: "user",
      text,
      timestamp: new Date().toLocaleTimeString("en-US", { hour12: false })
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue("");
    setLoading(true);

    try {
      const response = await sendChatMessage(text, messages);
      const aiMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: "ai",
        text: response.text || "Reasoning pipeline yielded null output.",
        timestamp: new Date().toLocaleTimeString("en-US", { hour12: false }),
        groundingSources: response.groundingSources
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: "ai",
        text: `Channel connection issue: ${err.message || "Unable to reach Gemini AI terminal."}. Please verify your network and GEMINI_API_KEY parameters in Settings.`,
        timestamp: new Date().toLocaleTimeString("en-US", { hour12: false })
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  // Safe client-side markdown formatter to bold **text** and render newlines
  const formatText = (inputText: string) => {
    const lines = inputText.split("\n");
    return lines.map((line, lineIdx) => {
      // Check for bullet lines
      const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("* ");
      const cleanLine = isBullet ? line.trim().substring(2) : line;

      // Simple regex bold replacement
      const parts = cleanLine.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, partIdx) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={partIdx} className="text-terminal-accent font-black">
              {part.substring(2, part.length - 2)}
            </strong>
          );
        }
        return part;
      });

      if (isBullet) {
        return (
          <li key={lineIdx} className="list-disc ml-4 mb-1 text-[9.5px]">
            {formattedParts}
          </li>
        );
      }

      return (
        <p key={lineIdx} className="mb-2 text-[9.5px] leading-relaxed">
          {formattedParts}
        </p>
      );
    });
  };

  return (
    <div className="p-4 flex flex-col h-[calc(100vh-80px)] font-mono text-xs select-none">
      {/* Search Header */}
      <div className="bg-terminal-card border border-terminal-border rounded p-3 flex items-center justify-between shrink-0 mb-3">
        <div className="flex items-center space-x-3">
          <MessageSquareText className="w-5 h-5 text-terminal-accent shrink-0" />
          <div>
            <h2 className="text-sm font-black text-white uppercase">BloombergGPT Institutional Terminal Chat</h2>
            <p className="text-terminal-muted text-[9px] uppercase">DIRECT CONVERSATIONAL CHANNELS WITH GOOGLE SEARCH GROUNDED AI ANALYST</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
        {/* Left Side: Message Logs */}
        <div className="flex-1 bg-terminal-card border border-terminal-border rounded flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => {
              const isUser = msg.sender === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-2xl rounded p-3 border ${isUser ? "bg-terminal-accent/10 border-terminal-accent/30 text-white" : "bg-terminal-bg/80 border-terminal-border text-[#eee]"}`}>
                    <div className="flex items-center justify-between text-[8px] text-terminal-muted font-bold border-b border-terminal-border/20 pb-1 mb-1.5">
                      <span className="flex items-center uppercase">
                        {isUser ? "CLIENT_ANALYST" : "VM_ALGO_AI_AGENT"}
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>

                    <div className="whitespace-pre-line text-[9.5px]">
                      {isUser ? <p className="leading-relaxed">{msg.text}</p> : formatText(msg.text)}
                    </div>

                    {/* Grounding Citations */}
                    {msg.groundingSources && msg.groundingSources.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-terminal-border/25 text-[8.5px] text-[#a0a0a0]">
                        <span className="font-bold flex items-center mb-1 text-terminal-accent uppercase tracking-wider">
                          <Globe className="w-3 h-3 mr-1" /> Verified Real-time Grounding Sources:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-sans">
                          {msg.groundingSources.map((src, sIdx) => (
                            <a
                              key={sIdx}
                              href={src.uri}
                              target="_blank"
                              rel="noreferrer"
                              className="block truncate hover:text-white hover:underline border border-terminal-border rounded p-1 bg-terminal-card-hover/20 transition-all text-terminal-accent"
                            >
                              • {src.title || "External Intelligence source"}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Waiting AI response skeletons */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-terminal-bg border border-terminal-border rounded p-3 w-80 space-y-2">
                  <div className="flex items-center justify-between border-b border-terminal-border/20 pb-1">
                    <span className="text-[8px] text-terminal-success font-bold flex items-center uppercase animate-pulse">
                      <RefreshCw className="w-2.5 h-2.5 mr-1.5 animate-spin text-terminal-success" />
                      SEARCH GROUNDING IN PROGRESS...
                    </span>
                  </div>
                  <div className="h-2 w-full bg-terminal-border rounded animate-pulse" />
                  <div className="h-2 w-3/4 bg-terminal-border rounded animate-pulse" />
                  <div className="h-2 w-1/2 bg-terminal-border rounded animate-pulse" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat bottom textbox input */}
          <div className="p-3 border-t border-terminal-border bg-terminal-bg/50">
            <div className="flex items-center bg-terminal-card border border-terminal-border rounded h-10 px-2 focus-within:border-terminal-accent transition-colors">
              <input
                type="text"
                placeholder="PROMPT TERMINAL GPT (e.g. Compare TCS and Reliance margins...)"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage(inputValue)}
                className="bg-transparent text-white w-full focus:outline-none placeholder-terminal-muted text-[10px] uppercase font-bold"
              />
              <button
                onClick={() => handleSendMessage(inputValue)}
                disabled={loading || !inputValue.trim()}
                className="p-1 hover:text-terminal-accent transition-colors text-terminal-muted disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Quick Helper Prompts Panel */}
        <div className="w-full md:w-60 bg-terminal-card border border-terminal-border rounded p-3 flex flex-col justify-between shrink-0">
          <div className="space-y-3">
            <span className="font-bold text-white uppercase text-[9.5px] block border-b border-terminal-border pb-1.5 flex items-center">
              <HelpCircle className="w-3.5 h-3.5 text-terminal-accent mr-1.5" /> Core Prompts
            </span>
            <div className="space-y-1.5">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt.query)}
                  className="w-full text-left p-2 bg-terminal-bg border border-terminal-border hover:border-terminal-accent rounded text-white hover:bg-terminal-card-hover/45 transition-colors text-[9px] flex items-start space-x-1.5 font-bold"
                >
                  <CornerDownRight className="w-3 h-3 text-terminal-accent shrink-0 mt-0.5" />
                  <span>{prompt.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="p-2 bg-terminal-accent/5 rounded border border-terminal-accent/20 text-[8.5px] leading-relaxed text-terminal-muted font-mono">
            Conversational logs are secured and token-cached server-side. Real-time grounding triggers standard web scraping models for actual BSE/NSE reports.
          </div>
        </div>
      </div>
    </div>
  );
}
