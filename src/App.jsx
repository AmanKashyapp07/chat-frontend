import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

// --- CONFIGURATION ---
const API_BASE_URL = "http://localhost:8000";
const SOCKET_URL = "http://localhost:8000";

// Initialize Socket outside component
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
  
  // Allow body for POST, PUT, DELETE
  if (body && method !== "GET") {
    config.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.message || `Error ${response.status}`);
  }

  if (response.status === 204) return {};
  return await response.json();
};

/**
 * 1. AUTH VIEW (Login / Signup)
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
      const authData = await api_helper(endpoint, "POST", { username, password });
      
      localStorage.setItem("chat_token", authData.token);
      const userProfile = await api_helper("/api/auth/me", "GET", null, authData.token);
      
      onLoginSuccess(userProfile); 
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#EBE5DE] font-sans relative overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-[#D7C0AE] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-[#C0B2A3] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>

      <div className="w-full max-w-md bg-white/60 backdrop-blur-2xl p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/50 flex flex-col items-center z-10">
        <div className="w-16 h-16 bg-[#6F4E37] rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-[#6F4E37]/20 rotate-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-[#FFF8F0]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h3 className="text-3xl font-serif font-bold text-[#4A3B32] tracking-tight mb-2">
          {isLogin ? "Welcome Back" : "Join Us"}
        </h3>
        <p className="text-[#8D7B6F] mb-8 text-sm font-medium tracking-wide">
          {isLogin ? "Enter your credentials to continue" : "Start your aesthetic journey today"}
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="group">
            <input 
              type="text" required placeholder="Username"
              className="w-full px-6 py-4 bg-[#F5F2EF] border border-transparent rounded-xl text-[#4A3B32] placeholder-[#A6988D] focus:bg-white focus:border-[#D7C0AE] focus:ring-4 focus:ring-[#D7C0AE]/20 transition-all outline-none"
              value={username} onChange={(e) => setUsername(e.target.value)} 
            />
          </div>
          <div className="group">
            <input 
              type="password" required placeholder="Password"
              className="w-full px-6 py-4 bg-[#F5F2EF] border border-transparent rounded-xl text-[#4A3B32] placeholder-[#A6988D] focus:bg-white focus:border-[#D7C0AE] focus:ring-4 focus:ring-[#D7C0AE]/20 transition-all outline-none"
              value={password} onChange={(e) => setPassword(e.target.value)} 
            />
          </div>
          
          {error && <p className="text-rose-500 text-xs text-center font-medium mt-2 bg-rose-50 py-1 rounded-lg">{error}</p>}
          
          <button 
            disabled={loading}
            className="w-full mt-2 bg-[#6F4E37] text-[#FFF8F0] font-semibold py-4 rounded-xl hover:bg-[#5A3E2B] active:scale-[0.98] transition-all shadow-lg shadow-[#6F4E37]/20 disabled:opacity-50"
          >
            {loading ? "Processing..." : (isLogin ? "Sign In" : "Sign Up")}
          </button>
        </form>
        <button 
          onClick={() => { setError(""); setIsLogin(!isLogin); }}
          className="mt-8 text-sm text-[#8D7B6F] hover:text-[#6F4E37] transition-colors font-medium underline underline-offset-4 decoration-[#D7C0AE]"
        >
          {isLogin ? "Need an account? Create one" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
};

/**
 * 2. USER LIST VIEW (Dashboard)
 */
const UserListView = ({ currentUser, onChatSelect, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingUser, setProcessingUser] = useState(null); 

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("chat_token");
        const data = await api_helper("/api/users", "GET", null, token);
        setUsers(data);
      } catch (e) {
        console.error("Failed to fetch users");
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const handleUserClick = async (targetUser) => {
    if (processingUser) return; 
    setProcessingUser(targetUser.id);

    try {
      const token = localStorage.getItem("chat_token");
      const res = await api_helper("/api/chats/private", "POST", { userId: targetUser.id }, token);
      
      onChatSelect({ 
        chatId: res.chatId, 
        recipient: targetUser,
        history: res.messages || [] 
      });
    } catch (err) {
      alert("Could not open chat: " + err.message);
    } finally {
      setProcessingUser(null);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#FDFBF7]">
      {/* Header */}
      <div className="px-8 py-6 bg-white/80 backdrop-blur-md border-b border-[#EEE5DB] sticky top-0 z-10 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-[#4A3B32]">Messages</h1>
          <p className="text-xs font-medium text-[#9C8C7E] mt-0.5">Connected as {currentUser.username}</p>
        </div>
        <button onClick={onLogout} className="text-[#6F4E37] hover:text-white font-medium text-xs border border-[#6F4E37] px-4 py-2 rounded-full hover:bg-[#6F4E37] transition-all">
          Sign Out
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pt-4 space-y-2">
        {loading ? <div className="text-center mt-10 text-[#9C8C7E]">Loading contacts...</div> : 
         users.length === 0 ? <div className="text-center mt-10 text-[#9C8C7E]">No contacts found.</div> :
         users.map((u) => (
          <div key={u.id} onClick={() => handleUserClick(u)} 
            className={`flex items-center gap-5 p-4 bg-white border border-[#F2EDE6] rounded-2xl cursor-pointer hover:shadow-md hover:border-[#D7C0AE] active:scale-[0.99] transition-all group ${processingUser === u.id ? 'opacity-50 pointer-events-none' : ''}`}>
            
            <div className="w-14 h-14 rounded-full bg-[#F5F0EB] text-[#6F4E37] flex items-center justify-center font-serif text-xl font-bold border border-[#EBE5DE] group-hover:bg-[#6F4E37] group-hover:text-[#FFF8F0] transition-colors">
              {processingUser === u.id ? (
                 <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
              ) : u.username[0].toUpperCase()}
            </div>

            <div className="flex-1">
              <h3 className="font-semibold text-[#4A3B32] text-lg">{u.username}</h3>
              <p className="text-[#9C8C7E] text-sm group-hover:text-[#6F4E37] transition-colors">Tap to start conversation</p>
            </div>
            
            <div className="w-8 h-8 rounded-full bg-[#F9F7F5] flex items-center justify-center text-[#D7C0AE] group-hover:text-[#6F4E37] group-hover:bg-[#F0EBE5] transition-all">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * 3. CHAT VIEW (Private Conversation)
 */
const ChatView = ({ currentUser, activeChat, onBack }) => {
  const { chatId, recipient, history } = activeChat;
  const [messages, setMessages] = useState(history || []);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    socket.emit("joinChat", chatId);
    const handleReceive = (data) => {
      if (data.chatId == chatId) {
        setMessages((prev) => [...prev, data]);
      }
    };
    socket.on("receiveMessage", handleReceive);
    return () => { socket.off("receiveMessage", handleReceive); };
  }, [chatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (message.trim()) {
      socket.emit("sendMessage", { 
        chatId: chatId,        
        senderId: currentUser.id, 
        text: message 
      });
      setMessage("");
    }
  };

  // --- DELETE CHAT FUNCTIONALITY ---
  const handleDeleteChat = async () => {
    if (!window.confirm(`Are you sure you want to delete this entire conversation with ${recipient.username}?`)) {
      return;
    }

    try {
      const token = localStorage.getItem("chat_token");
      // Calling DELETE api with userId in body
      await api_helper("/api/chats/private", "DELETE", { userId: recipient.id }, token);
      
      // Navigate back to user list because this Chat ID no longer exists
      onBack();
    } catch (err) {
      alert("Failed to delete chat: " + err.message);
    }
  };

  return (
    <div className="flex flex-col h-screen animate-in slide-in-from-right duration-300 font-sans bg-[#FDFBF7]">
      
      {/* Header - Glassmorphism */}
      <div className="px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-[#EBE5DE] sticky top-0 z-20 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-[#F5F2EF] text-[#6F4E37] hover:bg-[#EBE5DE] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            </button>
            <div className="flex flex-col">
            <span className="text-lg font-serif font-bold text-[#4A3B32]">{recipient.username}</span>
            <span className="text-[11px] font-medium text-[#9C8C7E] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Online
            </span>
            </div>
        </div>

        {/* DELETE BUTTON (IN HEADER) */}
        <button 
            onClick={handleDeleteChat}
            title="Delete Conversation"
            className="w-10 h-10 flex items-center justify-center rounded-full text-[#9C8C7E] hover:bg-rose-50 hover:text-rose-500 transition-colors"
        >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
        </button>
      </div>

      {/* Messages Area - SOLID COLOR BG */}
      <div 
        className="flex-1 overflow-y-auto p-6 space-y-4"
        style={{ backgroundColor: '#F2EBE5' }}
      >
        {messages.map((msg, i) => {
          const isMe = msg.senderId == currentUser.id; 
          
          return (
            <div key={i} className={`flex flex-col ${isMe ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              <div className={`
                max-w-[75%] px-5 py-3 text-[15px] leading-relaxed shadow-sm
                ${isMe 
                  ? "bg-[#6F4E37] text-[#FFF8F0] rounded-2xl rounded-tr-sm" 
                  : "bg-[#FFFFFF]/95 backdrop-blur-sm text-[#4A3B32] border border-[#EBE5DE] rounded-2xl rounded-tl-sm"
                }
              `}>
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/90 backdrop-blur-md border-t border-[#EBE5DE]">
        <div className="max-w-4xl mx-auto flex items-center gap-3 bg-[#F9F7F5] border border-[#EBE5DE] rounded-[1.5rem] px-2 py-2 focus-within:ring-2 focus-within:ring-[#6F4E37]/10 focus-within:border-[#D7C0AE] transition-all shadow-sm">
          <input 
            className="flex-1 bg-transparent px-4 py-2 outline-none text-[15px] text-[#4A3B32] placeholder-[#A6988D]"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button onClick={handleSend} disabled={!message.trim()} 
            className={`p-3 rounded-full transition-all duration-300 ${message.trim() ? "bg-[#6F4E37] text-[#FFF8F0] shadow-md hover:scale-105" : "bg-[#EBE5DE] text-[#FFF8F0] cursor-default"}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeChat, setActiveChat] = useState(null);
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
    <div className="h-screen flex items-center justify-center bg-[#FDFBF7]">
        <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#EBE5DE] border-t-[#6F4E37] rounded-full animate-spin"></div>
            <p className="text-[#9C8C7E] text-sm font-medium animate-pulse">Loading experience...</p>
        </div>
    </div>
  );

  if (!user) return <AuthView onLoginSuccess={setUser} />;

  if (activeChat) return <ChatView currentUser={user} activeChat={activeChat} onBack={() => setActiveChat(null)} />;

  return <UserListView currentUser={user} onChatSelect={setActiveChat} onLogout={() => { localStorage.removeItem("chat_token"); setUser(null); window.location.reload(); }} />;
}