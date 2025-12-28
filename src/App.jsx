import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

// --- CONFIGURATION ---
const API_BASE_URL = "http://localhost:8000";
const SOCKET_URL = "http://localhost:8000";

// Initialize Socket outside component to prevent multiple connections
const socket = io(SOCKET_URL, {
  autoConnect: true,
});

/**
 * API HELPER
 * Handles Fetch calls, Headers, and Error throwing
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
      const data = await api_helper(endpoint, "POST", { username, password });
      
      // Store token and notify parent
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
        
        {/* Logo/Icon */}
        <div className="w-20 h-20 bg-gradient-to-tr from-blue-600 to-blue-400 rounded-2xl flex items-center justify-center mb-6 shadow-xl rotate-3">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
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
 * 2. USER LIST VIEW (Dashboard)
 */
const UserListView = ({ currentUser, onChatSelect, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("chat_token");
        // Fetches all users EXCEPT the logged-in user
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
    try {
      const token = localStorage.getItem("chat_token");
      // Call API to get Chat ID and History
      const res = await api_helper("/api/chats/private", "POST", { userId: targetUser.id }, token);
      
      // Pass data to parent to switch screens
      onChatSelect({ 
        chatId: res.chatId, 
        recipient: targetUser,
        history: res.messages || [] // Restore history from DB
      });
    } catch (err) {
      alert("Could not open chat: " + err.message);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Header */}
      <div className="px-6 py-4 bg-white/90 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-10 flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Chats</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-500">Hi, {currentUser.username}</span>
          <button onClick={onLogout} className="text-blue-600 font-medium text-sm bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors">
            Logout
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 pt-2">
        {loading ? <div className="text-center mt-10 text-gray-400">Loading contacts...</div> : 
         users.length === 0 ? <div className="text-center mt-10 text-gray-400">No contacts found.</div> :
         users.map((u) => (
          <div key={u.id} onClick={() => handleUserClick(u)} 
            className="flex items-center gap-4 py-4 border-b border-gray-50 cursor-pointer active:bg-gray-50 transition-colors group">
            {/* Avatar */}
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-gray-600 font-bold text-lg group-hover:from-blue-500 group-hover:to-blue-600 group-hover:text-white transition-all shadow-sm">
              {u.username[0].toUpperCase()}
            </div>
            {/* User Info */}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-lg">{u.username}</h3>
              <p className="text-gray-400 text-sm group-hover:text-blue-500 transition-colors">Tap to message</p>
            </div>
            {/* Chevron Icon */}
            <svg className="w-5 h-5 text-gray-300 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
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
  
  // Initialize messages state with history fetched from API
  const [messages, setMessages] = useState(history || []);
  const [message, setMessage] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // 1. Join the specific Room ID via Socket
    socket.emit("joinChat", chatId);

    // 2. Listen for incoming messages
    const handleReceive = (data) => {
      // Security check: ensure message belongs to THIS room
      if (data.chatId == chatId) {
        setMessages((prev) => [...prev, data]);
      }
    };
    
    socket.on("receiveMessage", handleReceive);

    // Cleanup listeners
    return () => {
      socket.off("receiveMessage", handleReceive);
    };
  }, [chatId]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (message.trim()) {
      const msgData = { 
        chatId: chatId,        // Room ID
        senderId: currentUser.id, // My ID
        text: message 
      };
      
      // Send to server (server will save to DB and broadcast back)
      socket.emit("sendMessage", msgData);
      
      setMessage("");
    }
  };

  return (
    <div className="flex flex-col h-screen bg-white animate-in slide-in-from-right duration-300">
      
      {/* Header */}
      <div className="px-4 py-3 bg-white/80 backdrop-blur-xl border-b border-gray-100 sticky top-0 z-20 flex items-center gap-3">
        <button onClick={onBack} className="text-blue-600 flex items-center gap-1 hover:opacity-70 transition-opacity pr-2">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          <span className="text-lg font-medium">Back</span>
        </button>
        
        <div className="flex flex-col items-center flex-1 pr-12">
           <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Conversation with</span>
           <span className="text-base font-bold text-black">{recipient.username}</span>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-white">
        {messages.map((msg, i) => {
          // Check if the logged-in user sent this message
          const isMe = msg.senderId === currentUser.id;
          
          return (
            <div key={i} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
              <div className={`
                max-w-[75%] px-4 py-2 text-[16px] leading-snug shadow-sm
                ${isMe 
                  ? "bg-blue-600 text-white rounded-[20px] rounded-br-none" 
                  : "bg-[#E9E9EB] text-black rounded-[20px] rounded-bl-none"
                }
              `}>
                {msg.text}
              </div>
            </div>
          );
        })}
        {/* Invisible element to auto-scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 bg-white border-t border-gray-100 pb-6">
        <div className="flex items-center gap-2 border border-gray-300 rounded-full px-4 py-1 focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 transition-all">
          <input 
            className="flex-1 bg-transparent py-2 outline-none text-base text-gray-900 placeholder-gray-500"
            placeholder="iMessage"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <button 
            onClick={handleSend}
            disabled={!message.trim()} 
            className={`
              p-1.5 rounded-full transition-all 
              ${message.trim() 
                ? "bg-blue-600 text-white hover:scale-105 active:scale-95" 
                : "bg-gray-300 text-white cursor-default"
              }
            `}
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * 4. MAIN APP CONTROLLER
 */
export default function App() {
  const [user, setUser] = useState(null);       // Current logged in user object
  const [activeChat, setActiveChat] = useState(null); // Currently open chat object
  const [loading, setLoading] = useState(true);

  // Check Login Status on Load
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

  // Show loading spinner while checking auth
  if (loading) return (
    <div className="h-screen flex items-center justify-center bg-white">
      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  // View Routing Logic
  if (!user) {
    return <AuthView onLoginSuccess={setUser} />;
  }

  if (activeChat) {
    return <ChatView currentUser={user} activeChat={activeChat} onBack={() => setActiveChat(null)} />;
  }

  return (
    <UserListView 
      currentUser={user} 
      onChatSelect={setActiveChat} 
      onLogout={() => { 
        localStorage.removeItem("chat_token"); 
        setUser(null); 
        window.location.reload(); // Reload to clear socket connection
      }} 
    />
  );
}