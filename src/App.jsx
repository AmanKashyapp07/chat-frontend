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
    <div className="flex items-center justify-center min-h-screen bg-[#1E1F22] relative overflow-hidden font-sans">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[100px]"></div>
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] bg-purple-600/10 rounded-full blur-[100px]"></div>
      </div>

      <div className="w-full max-w-sm bg-[#313338] p-8 rounded-md shadow-2xl flex flex-col items-center animate-in fade-in zoom-in duration-300 z-10 border border-[#2B2D31]">
        <div className="mb-6">
           <svg className="w-16 h-16 text-[#5865F2]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
           </svg>
        </div>
        
        <h3 className="text-2xl font-bold text-gray-100 mb-2">
          {isLogin ? "Welcome Back!" : "Join the Chat"}
        </h3>
        <p className="text-gray-400 mb-6 text-sm">
          {isLogin ? "We're so excited to see you again!" : "Create an account to start messaging."}
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 block">Username</label>
            <input 
              type="text" required
              className="w-full px-3 py-2.5 bg-[#1E1F22] rounded-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all"
              value={username} onChange={(e) => setUsername(e.target.value)} 
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 block">Password</label>
            <input 
              type="password" required
              className="w-full px-3 py-2.5 bg-[#1E1F22] rounded-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-400 transition-all"
              value={password} onChange={(e) => setPassword(e.target.value)} 
            />
          </div>
          {error && <p className="text-red-400 text-xs font-semibold mt-1">{error}</p>}
          <button 
            disabled={loading}
            className="w-full mt-2 bg-[#5865F2] text-white font-medium py-2.5 rounded hover:bg-[#4752C4] transition-colors disabled:opacity-50"
          >
            {loading ? "Loading..." : (isLogin ? "Log In" : "Register")}
          </button>
        </form>
        <button 
          onClick={() => { setError(""); setIsLogin(!isLogin); }}
          className="mt-4 text-xs text-[#00A8FC] hover:underline"
        >
          {isLogin ? "Need an account? Register" : "Already have an account?"}
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
      setProcessingUser(null);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#2B2D31]">
      <div className="px-4 py-3 bg-[#2B2D31] border-b border-[#1F2023] shadow-sm sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-base font-bold text-gray-100">Direct Messages</h1>
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-300 flex items-center gap-2 bg-[#1E1F22] px-2 py-1 rounded">
             <div className="w-2 h-2 rounded-full bg-green-500"></div>
             {currentUser.username}
          </div>
          <button onClick={onLogout} className="text-gray-400 hover:text-red-400 text-xs font-bold uppercase transition-colors">
            Log Out
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {loading ? <div className="text-center mt-10 text-gray-400 text-sm">Loading users...</div> : 
         users.length === 0 ? <div className="text-center mt-10 text-gray-400 text-sm">No friends found.</div> :
         users.map((u) => (
          <div key={u.id} onClick={() => handleUserClick(u)} 
            className={`flex items-center gap-3 px-2 py-2.5 rounded-md cursor-pointer mb-1 group transition-colors 
            ${processingUser === u.id ? 'opacity-50 pointer-events-none' : 'hover:bg-[#35373C] active:bg-[#3F4147]'}`}>
            
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium 
              ${processingUser === u.id ? "bg-gray-600 animate-pulse" : "bg-[#5865F2]"}`}>
              {processingUser === u.id ? "..." : u.username[0].toUpperCase()}
            </div>
            
            <div className="flex-1">
              <h3 className={`text-sm font-medium group-hover:text-gray-100 ${processingUser === u.id ? "text-gray-500" : "text-gray-300"}`}>
                {u.username}
              </h3>
              <p className="text-[11px] text-gray-400 group-hover:text-gray-300">
                {processingUser === u.id ? "Connecting..." : "Click to message"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * 3. CHAT VIEW (Private Conversation)
 * Updated: Messages align Right/Left
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

  return (
    <div className="flex flex-col h-screen bg-[#313338] animate-in slide-in-from-right duration-200">
      {/* Top Header */}
      <div className="px-4 py-3 bg-[#313338] border-b border-[#26272D] shadow-sm sticky top-0 z-20 flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 hover:text-gray-100 transition-colors">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
           <span className="text-2xl text-gray-400 font-light">@</span>
           <span className="text-base font-bold text-gray-100">{recipient.username}</span>
           <div className="w-2 h-2 rounded-full bg-green-500 ml-1"></div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#313338] scrollbar-thin scrollbar-thumb-[#1A1B1E] scrollbar-track-transparent">
        {messages.map((msg, i) => {
          // Check who sent the message
          const isMe = msg.senderId == currentUser.id; 

          return (
            <div key={i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                <div className={`flex items-end gap-2 max-w-[80%] ${isMe ? "flex-row-reverse" : "flex-row"}`}>
                    
                    {/* Avatar Bubble */}
                    <div className={`w-8 h-8 min-w-[32px] rounded-full flex items-center justify-center text-white font-bold text-xs 
                        ${isMe ? "bg-[#5865F2]" : "bg-gray-500"}`}>
                        {isMe ? currentUser.username[0].toUpperCase() : recipient.username[0].toUpperCase()}
                    </div>

                    {/* Text Bubble */}
                    <div className={`px-4 py-2 text-[15px] shadow-sm text-gray-100
                         ${isMe 
                           ? "bg-[#5865F2] rounded-[18px] rounded-br-none text-white" 
                           : "bg-[#2B2D31] border border-[#1F2023] rounded-[18px] rounded-bl-none text-gray-100"
                         }`}>
                        {msg.text}
                    </div>
                </div>
                
                {/* Tiny Timestamp/Name label */}
                <div className={`text-[10px] text-gray-500 mt-1 mx-12`}>
                   {isMe ? "You" : recipient.username}
                </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-4 pb-6 pt-2 bg-[#313338]">
        <div className="flex items-center gap-2 bg-[#383A40] rounded-lg px-4 py-0 transition-all">
            <button className="text-gray-400 hover:text-gray-200 p-2 -ml-2 rounded-full hover:bg-[#313338] transition-colors">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z"/></svg>
            </button>
            
            <input 
                className="flex-1 bg-transparent py-3 outline-none text-base text-gray-200 placeholder-gray-500"
                placeholder={`Message @${recipient.username}`}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
            />
          
            <button onClick={handleSend} disabled={!message.trim()} 
                className={`p-2 rounded hover:bg-[#313338] transition-all ${message.trim() ? "text-[#5865F2]" : "text-gray-500"}`}>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
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

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#313338]"><div className="w-10 h-10 border-4 border-[#5865F2] border-t-transparent rounded-full animate-spin"></div></div>;

  if (!user) return <AuthView onLoginSuccess={setUser} />;

  if (activeChat) return <ChatView currentUser={user} activeChat={activeChat} onBack={() => setActiveChat(null)} />;

  return <UserListView currentUser={user} onChatSelect={setActiveChat} onLogout={() => { localStorage.removeItem("chat_token"); setUser(null); window.location.reload(); }} />;
}