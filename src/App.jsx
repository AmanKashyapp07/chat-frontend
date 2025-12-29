import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

// --- CONFIGURATION ---
const API_BASE_URL = "http://localhost:8000";
const SOCKET_URL = "http://localhost:8000";

const socket = io(SOCKET_URL, { autoConnect: true });

// --- API HELPER ---
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
  if (response.status === 204) return {};
  return await response.json();
};

/**
 * 1. AUTH VIEW (Unchanged)
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
 * 2. DASHBOARD VIEW (Users & Groups)
 */
const UserListView = ({ currentUser, onChatSelect, onLogout }) => {
  const [users, setUsers] = useState([]);      // List of all users
  const [groups, setGroups] = useState([]);    // List of my groups
  const [view, setView] = useState("users");   // Toggle between 'users' and 'groups'
  const [loading, setLoading] = useState(true);
  
  // Modal State
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [selectedMembers, setSelectedMembers] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("chat_token");
      const [usersData, groupsData] = await Promise.all([
        api_helper("/api/users", "GET", null, token),
        api_helper("/api/chats/group", "GET", null, token) // Needs the new backend route
      ]);
      setUsers(usersData);
      setGroups(groupsData);
    } catch (e) {
      console.error("Fetch failed", e);
    } finally {
      setLoading(false);
    }
  };

  // --- START PRIVATE CHAT ---
  const handleUserClick = async (targetUser) => {
    try {
      const token = localStorage.getItem("chat_token");
      const res = await api_helper("/api/chats/private", "POST", { userId: targetUser.id }, token);
      onChatSelect({ 
        chatId: res.chatId, 
        recipient: targetUser, // Passed for Header Info
        type: 'private',
        history: res.messages || [] 
      });
    } catch (err) { alert(err.message); }
  };

  // --- OPEN GROUP CHAT ---
  const handleGroupClick = async (group) => {
    try {
      const token = localStorage.getItem("chat_token");
      
      // CHANGED: Pass ID in URL, use GET method, no body (null)
      const history = await api_helper(
        `/api/chats/group/fetch/${group.id}`, 
        "GET", 
        null, 
        token
      );

      onChatSelect({
        chatId: group.id,
        name: group.name,
        type: 'group',
        history: history || [] 
      });

    } catch (err) {
      console.error("Failed to load group history", err);
      // Fallback: Open empty chat
      onChatSelect({
        chatId: group.id,
        name: group.name,
        type: 'group',
        history: []
      });
    }
  };

  // --- CREATE GROUP LOGIC ---
  const toggleMemberSelection = (userId) => {
    if (selectedMembers.includes(userId)) {
      setSelectedMembers(prev => prev.filter(id => id !== userId));
    } else {
      setSelectedMembers(prev => [...prev, userId]);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || selectedMembers.length === 0) return alert("Name and members required");
    try {
      const token = localStorage.getItem("chat_token");
      await api_helper("/api/chats/group", "POST", { name: newGroupName, memberIds: selectedMembers }, token);
      setShowCreateGroup(false);
      setNewGroupName("");
      setSelectedMembers([]);
      fetchData(); // Refresh list
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="h-screen flex flex-col bg-[#FDFBF7]">
      {/* Header */}
      <div className="px-8 py-6 bg-white/80 backdrop-blur-md border-b border-[#EEE5DB] sticky top-0 z-10 flex justify-between items-center shadow-sm">
        <div>
          <h1 className="text-2xl font-serif font-bold tracking-tight text-[#4A3B32]">Chats</h1>
          <p className="text-xs font-medium text-[#9C8C7E]">Hi, {currentUser.username}</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => setShowCreateGroup(true)} className="text-[#FFF8F0] bg-[#6F4E37] text-xs px-4 py-2 rounded-full hover:bg-[#5A3E2B] transition-all">
               + New Group
            </button>
            <button onClick={onLogout} className="text-[#6F4E37] border border-[#6F4E37] text-xs px-4 py-2 rounded-full hover:bg-[#6F4E37] hover:text-white transition-all">
               Logout
            </button>
        </div>
      </div>

      {/* Toggle Tabs */}
      <div className="flex px-6 pt-4 gap-4">
        <button onClick={() => setView("users")} className={`pb-2 text-sm font-bold transition-all ${view === "users" ? "text-[#6F4E37] border-b-2 border-[#6F4E37]" : "text-[#9C8C7E]"}`}>Direct Messages</button>
        <button onClick={() => setView("groups")} className={`pb-2 text-sm font-bold transition-all ${view === "groups" ? "text-[#6F4E37] border-b-2 border-[#6F4E37]" : "text-[#9C8C7E]"}`}>My Groups</button>
      </div>

      {/* Lists */}
      <div className="flex-1 overflow-y-auto px-6 pt-4 space-y-2 pb-10">
        {loading ? <div className="text-center mt-10 text-[#9C8C7E]">Loading...</div> : (
            view === "users" ? (
                // USER LIST
                users.map(u => (
                    <div key={u.id} onClick={() => handleUserClick(u)} className="flex items-center gap-4 p-4 bg-white border border-[#F2EDE6] rounded-2xl cursor-pointer hover:shadow-md transition-all">
                        <div className="w-10 h-10 rounded-full bg-[#F5F0EB] text-[#6F4E37] flex items-center justify-center font-bold">
                            {u.username[0].toUpperCase()}
                        </div>
                        <div className="flex-1"><h3 className="font-semibold text-[#4A3B32]">{u.username}</h3></div>
                    </div>
                ))
            ) : (
                // GROUP LIST
                groups.length === 0 ? <p className="text-center text-[#9C8C7E] mt-10">No groups yet.</p> :
                groups.map(g => (
                    <div key={g.id} onClick={() => handleGroupClick(g)} className="flex items-center gap-4 p-4 bg-white border border-[#F2EDE6] rounded-2xl cursor-pointer hover:shadow-md transition-all">
                         <div className="w-10 h-10 rounded-full bg-[#D7C0AE] text-[#FFF8F0] flex items-center justify-center font-bold">
                            #
                        </div>
                        <div className="flex-1"><h3 className="font-semibold text-[#4A3B32]">{g.name}</h3></div>
                    </div>
                ))
            )
        )}
      </div>

      {/* CREATE GROUP MODAL */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-[2rem] shadow-2xl w-full max-w-md animate-in zoom-in duration-200">
                <h2 className="text-xl font-bold text-[#4A3B32] mb-4">Create New Group</h2>
                
                <input 
                    className="w-full px-4 py-3 bg-[#F5F2EF] rounded-xl text-[#4A3B32] outline-none mb-4"
                    placeholder="Group Name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                />
                
                <p className="text-sm font-bold text-[#9C8C7E] mb-2">Select Members:</p>
                <div className="h-40 overflow-y-auto space-y-2 mb-6 border border-[#F2EDE6] p-2 rounded-xl">
                    {users.map(u => (
                         u.id !== currentUser.id && (
                            <div key={u.id} onClick={() => toggleMemberSelection(u.id)} 
                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer ${selectedMembers.includes(u.id) ? "bg-[#6F4E37] text-white" : "hover:bg-[#F5F2EF]"}`}>
                                <div className={`w-4 h-4 border rounded-full flex items-center justify-center ${selectedMembers.includes(u.id) ? "bg-white border-white" : "border-[#9C8C7E]"}`}>
                                    {selectedMembers.includes(u.id) && <div className="w-2 h-2 bg-[#6F4E37] rounded-full"></div>}
                                </div>
                                <span className="font-medium">{u.username}</span>
                            </div>
                         )
                    ))}
                </div>

                <div className="flex gap-3">
                    <button onClick={() => setShowCreateGroup(false)} className="flex-1 py-3 text-[#6F4E37] font-bold hover:bg-[#F5F2EF] rounded-xl transition-colors">Cancel</button>
                    <button onClick={handleCreateGroup} className="flex-1 py-3 bg-[#6F4E37] text-white font-bold rounded-xl hover:bg-[#5A3E2B] transition-colors">Create</button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

/**
 * 3. CHAT VIEW (Private & Group)
 */
const ChatView = ({ currentUser, activeChat, onBack }) => {
  const { chatId, type, recipient, name, history } = activeChat; 
  
  // --- STATE DEFINITIONS ---
  const [messages, setMessages] = useState(history || []);
  const [message, setMessage] = useState("");
  
  // FIX: These three lines must be here for the members popup to work
  const [showMembers, setShowMembers] = useState(false);
  const [membersList, setMembersList] = useState([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false); 
  // -------------------------

  const messagesEndRef = useRef(null);

  // FETCH MESSAGES ON LOAD
  useEffect(() => {
    // Assuming 'socket' is defined globally or imported
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

  const handleDeleteChat = async () => {
    if (!window.confirm("Delete this conversation?")) return;
    try {
      const token = localStorage.getItem("chat_token");
      await api_helper("/api/chats/private", "DELETE", { userId: recipient?.id || 0 }, token);
      onBack();
    } catch (err) { alert("Failed to delete chat."); }
  };

  // --- FETCH MEMBERS FUNCTION ---
  const handleFetchMembers = async () => {
    // Toggle off if already showing
    if (showMembers) {
        setShowMembers(false);
        return;
    }
    
    // Set loading state (This caused your error before because the state wasn't defined)
    setIsLoadingMembers(true);
    
    try {
        const token = localStorage.getItem("chat_token");
        const response = await fetch(`http://localhost:8000/api/chats/group/fetch/${chatId}/members`, {
            headers: { "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` }
        });
        
        if (response.ok) {
            const data = await response.json();
            // Expecting data format: ["Name1", "Name2", "Name3"]
            setMembersList(data); 
            setShowMembers(true);
        } else {
            console.error("Failed to fetch members");
        }
    } catch (error) {
        console.error("Error fetching members:", error);
    } finally {
        setIsLoadingMembers(false);
    }
  };

  const chatTitle = type === 'group' ? name : recipient.username;

  return (
    <div className="flex flex-col h-screen animate-in slide-in-from-right duration-300 font-sans bg-[#FDFBF7]">
      {/* Header */}
      <div className="px-6 py-4 bg-white/80 backdrop-blur-xl border-b border-[#EBE5DE] sticky top-0 z-20 flex items-center justify-between shadow-sm relative">
        <div className="flex items-center gap-4">
            <button onClick={onBack} className="w-10 h-10 flex items-center justify-center rounded-full bg-[#F5F2EF] text-[#6F4E37] hover:bg-[#EBE5DE] transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div className="flex flex-col">
            <span className="text-lg font-serif font-bold text-[#4A3B32]">{chatTitle}</span>
            <span className="text-[11px] font-medium text-[#9C8C7E] flex items-center gap-1">
                {type === 'group' ? (
                    <button 
                        onClick={handleFetchMembers} 
                        className="hover:text-[#6F4E37] hover:underline decoration-dotted cursor-pointer transition-colors"
                    >
                        Members
                    </button>
                ) : (
                    'Online'
                )}
            </span>
            </div>
        </div>

        {/* --- MEMBERS POPUP --- */}
        {showMembers && type === 'group' && (
            <div className="absolute top-16 left-16 z-50 w-64 bg-white shadow-xl rounded-xl border border-[#EBE5DE] p-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-3 border-b border-[#F5F2EF] pb-2">
                    <h3 className="font-bold text-[#4A3B32] text-sm">Group Members</h3>
                    <button onClick={() => setShowMembers(false)} className="text-[#9C8C7E] hover:text-rose-500">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
                
                {isLoadingMembers ? (
                    <div className="text-xs text-[#9C8C7E] p-2 text-center">Loading...</div>
                ) : (
                    <ul className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                        {membersList && membersList.length > 0 ? (
                            membersList.map((member, index) => (
                                <li key={index} className="text-sm text-[#6F4E37] flex items-center gap-2 p-1 hover:bg-[#F9F7F5] rounded">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#D7C0AE]"></span>
                                    {/* Direct string rendering for ["Lakshya", "Maverick"...] */}
                                    {member}
                                </li>
                            ))
                        ) : (
                            <li className="text-xs text-gray-400 italic">No members found</li>
                        )}
                    </ul>
                )}
            </div>
        )}
        {/* --------------------- */}

        {/* Only show delete for private for now */}
        {type === 'private' && (
            <button onClick={handleDeleteChat} className="w-10 h-10 flex items-center justify-center rounded-full text-[#9C8C7E] hover:bg-rose-50 hover:text-rose-500 transition-colors">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
            </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-2" style={{ backgroundColor: '#F2EBE5' }}> 
        {messages.map((msg, i) => {
          const isMe = msg.senderId == currentUser.id; 
          
          return (
            <div key={i} className={`flex flex-col ${isMe ? "items-end" : "items-start"} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
              
              <div className={`max-w-[75%] px-3 py-2 shadow-sm ${
                isMe 
                  ? "bg-[#6F4E37] text-[#FFF8F0] rounded-2xl rounded-tr-none" 
                  : "bg-white text-[#4A3B32] rounded-2xl rounded-tl-none border border-[#EBE5DE]/50"
              }`}>
                
                {/* SENDER NAME (Only inside bubble for received group messages) */}
                {!isMe && type === 'group' && (
                  <p className="text-[12px] font-bold text-orange-700 mb-0.5 leading-tight">
                    {msg.sender_name}
                  </p>
                )}

                {/* MESSAGE TEXT */}
                <p className="text-[15px] leading-relaxed whitespace-pre-wrap break-words">
                  {msg.text}
                </p>

              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white/90 backdrop-blur-md border-t border-[#EBE5DE]">
        <div className="max-w-4xl mx-auto flex items-center gap-3 bg-[#F9F7F5] border border-[#EBE5DE] rounded-[1.5rem] px-2 py-2 focus-within:ring-2 focus-within:ring-[#6F4E37]/10 focus-within:border-[#D7C0AE] transition-all shadow-sm">
          <input className="flex-1 bg-transparent px-4 py-2 outline-none text-[15px] text-[#4A3B32] placeholder-[#A6988D]" placeholder="Type a message..." value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSend()} />
          <button onClick={handleSend} disabled={!message.trim()} className={`p-3 rounded-full transition-all duration-300 ${message.trim() ? "bg-[#6F4E37] text-[#FFF8F0] shadow-md hover:scale-105" : "bg-[#EBE5DE] text-[#FFF8F0] cursor-default"}`}>
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" /></svg>
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
        } catch { localStorage.removeItem("chat_token"); }
      }
      setLoading(false);
    };
    init();
  }, []);

  if (loading) return <div className="h-screen flex items-center justify-center bg-[#FDFBF7]"><div className="w-12 h-12 border-4 border-[#EBE5DE] border-t-[#6F4E37] rounded-full animate-spin"></div></div>;
  if (!user) return <AuthView onLoginSuccess={setUser} />;
  if (activeChat) return <ChatView currentUser={user} activeChat={activeChat} onBack={() => setActiveChat(null)} />;
  return <UserListView currentUser={user} onChatSelect={setActiveChat} onLogout={() => { localStorage.removeItem("chat_token"); setUser(null); window.location.reload(); }} />;
}