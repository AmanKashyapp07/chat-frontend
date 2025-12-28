import { useEffect, useState, useRef, useMemo } from "react";
import { io } from "socket.io-client";

// --- CONFIGURATION ---
const API_BASE_URL = "http://localhost:8000";
const SOCKET_URL = "http://localhost:8000";

// Initialize Socket outside to prevent multiple connections
const socket = io(SOCKET_URL, {
  autoConnect: true,
});

/**
 * API HELPER
 */
const api_helper = async (endpoint, method = "GET", body = null, token = null) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const config = { method, headers };
  if (body && method !== "GET") config.body = JSON.stringify(body);

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Error ${response.status}`);
  }
  return response.status === 204 ? {} : await response.json();
};

/**
 * AUTH VIEW
 */
const AuthView = ({ onLoginSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const endpoint = isLogin ? "/api/auth/login" : "/api/auth/signup";
      const data = await api_helper(endpoint, "POST", { username, password });
      localStorage.setItem("chat_token", data.token);
      onLoginSuccess(data.user); 
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F2F2F7] px-4 font-sans">
      <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl p-8 rounded-[2.5rem] shadow-2xl border border-white flex flex-col items-center animate-in fade-in zoom-in duration-500">
        <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center mb-6 shadow-xl rotate-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
          </svg>
        </div>

        <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight mb-2">
          {isLogin ? "iChat" : "Create ID"}
        </h3>
        <p className="text-gray-400 mb-8 text-sm font-medium tracking-wide uppercase">
          {isLogin ? "Sign in with Username" : "Join the global network"}
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-3">
          <input 
            type="text" required placeholder="Username"
            className="w-full px-6 py-4 bg-gray-100/50 border-none rounded-2xl text-gray-900 focus:ring-2 focus:ring-blue-500/50 transition-all outline-none"
            value={username} onChange={(e) => setUsername(e.target.value)} 
          />
          <input 
            type="password" required placeholder="Password"
            className="w-full px-6 py-4 bg-gray-100/50 border-none rounded-2xl text-gray-900 focus:ring-2 focus:ring-blue-500/50 transition-all outline-none"
            value={password} onChange={(e) => setPassword(e.target.value)} 
          />

          {error && <p className="text-red-500 text-xs text-center font-semibold mt-2">{error}</p>}

          <button 
            disabled={loading}
            className="w-full mt-4 bg-blue-600 text-white font-bold py-4 rounded-2xl hover:bg-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-200"
          >
            {loading ? "Connecting..." : (isLogin ? "Sign In" : "Sign Up")}
          </button>
        </form>

        <button 
          onClick={() => { setError(""); setIsLogin(!isLogin); }}
          className="mt-8 text-sm text-blue-600 font-semibold hover:text-blue-800"
        >
          {isLogin ? "Create New Account" : "I already have an account"}
        </button>
      </div>
    </div>
  );
};

/**
 * CHAT VIEW
 */
const ChatView = ({ currentUser, onLogout }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);
  const hasJoined = useRef(false); // Fix for double join message

  useEffect(() => {
    // 1. Emit Join ONLY ONCE
    if (currentUser?.username && !hasJoined.current) {
      socket.emit("join", currentUser.username);
      hasJoined.current = true;
    }

    // 2. Listen for messages
    const handleReceive = (data) => setMessages((prev) => [...prev, data]);
    socket.on("receiveMessage", handleReceive);

    return () => {
      socket.off("receiveMessage", handleReceive);
    };
  }, [currentUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (message.trim()) {
      socket.emit("sendMessage", { user: currentUser.username, text: message });
      setMessage("");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="px-6 py-4 bg-white/70 backdrop-blur-2xl border-b border-gray-100 flex items-center justify-between sticky top-0 z-20">
        <div>
          <h2 className="text-xl font-bold text-black tracking-tight">{currentUser.username}</h2>
          <p className="text-[10px] text-green-500 font-bold uppercase tracking-widest">● Online</p>
        </div>
        <button onClick={onLogout} className="text-sm font-semibold text-blue-600 px-4 py-2 bg-blue-50 rounded-full hover:bg-blue-100 transition-colors">
          Leave
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
        {messages.map((msg, i) => {
          const isMe = msg.user === currentUser.username;
          const isSystem = msg.user === "System";

          if (isSystem) return (
            <div key={i} className="flex justify-center py-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-tighter bg-gray-50 px-3 py-1 rounded-full">{msg.text}</span>
            </div>
          );

          return (
            <div key={i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              {!isMe && <span className="text-[10px] font-bold text-gray-400 ml-3 mb-1 uppercase">{msg.user}</span>}
              <div className={`max-w-[80%] px-4 py-2.5 rounded-[20px] text-[15px] leading-relaxed shadow-sm ${
                isMe ? "bg-blue-600 text-white rounded-tr-none" : "bg-[#E9E9EB] text-black rounded-tl-none"
              }`}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex items-center gap-2 max-w-5xl mx-auto relative">
          <input 
            className="w-full bg-[#F2F2F7] border-none rounded-full px-6 py-3 text-sm focus:ring-1 focus:ring-gray-200 outline-none"
            placeholder="iMessage"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={!message.trim()}
            className="bg-blue-600 text-white p-2 rounded-full disabled:opacity-30 transition-all hover:scale-110 active:scale-90"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * MAIN APP
 */
export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const token = localStorage.getItem("chat_token");
      if (token) {
        try {
          const data = await api_helper("/api/auth/me", "GET", null, token);
          setUser(data);
        } catch {
          localStorage.removeItem("chat_token");
        }
      }
      setLoading(false);
    };
    init();
  }, []);

  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="antialiased">
      {user ? (
        <ChatView currentUser={user} onLogout={() => { localStorage.removeItem("chat_token"); setUser(null); }} />
      ) : (
        <AuthView onLoginSuccess={(u) => setUser(u)} />
      )}
    </div>
  );
}