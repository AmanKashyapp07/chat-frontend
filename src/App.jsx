import { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";

// --- 1. INITIALIZE CONNECTION ---
const socket = io("http://localhost:8000");

function App() {
  // --- STATE MANAGEMENT ---
  const [username, setUsername] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);

  // Ref for auto-scrolling to the bottom of the chat
  const messagesEndRef = useRef(null);

  // --- 2. EVENT LISTENERS ---
  useEffect(() => {
    socket.on("receiveMessage", (data) => {
      setMessages((prev) => [...prev, data]);
    });
    return () => socket.off("receiveMessage");
  }, []);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- 3. JOIN LOGIC ---
  const joinChat = () => {
    if (username.trim()) {
      socket.emit("join", username);
      setIsJoined(true);
    }
  };

  // --- 4. SEND LOGIC ---
  const sendMessage = () => {
    if (message.trim()) {
      const messageData = { user: username, text: message };
      socket.emit("sendMessage", messageData);
      setMessage("");
    }
  };

  // --- UI RENDERING ---

  // 1. LOGIN SCREEN (Apple ID Card Style)
  if (!isJoined) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 px-4 font-sans">
        <div className="w-full max-w-sm bg-white p-8 rounded-3xl shadow-xl border border-gray-100 flex flex-col items-center animate-fade-in-up">
          {/* Icon/Logo Placeholder */}
          <div className="w-16 h-16 bg-blue-500 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-blue-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Welcome</h3>
          <p className="text-gray-500 mb-8 text-sm">Enter your name to join the chat</p>
          
          <input 
            className="w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:bg-white transition-all duration-300"
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            placeholder="John Doe"
            onKeyPress={(e) => e.key === 'Enter' && joinChat()}
          />
          
          <button 
            onClick={joinChat}
            className="w-full mt-6 bg-gray-900 text-white font-semibold py-4 rounded-2xl hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-lg"
          >
            Join Chat
          </button>
        </div>
      </div>
    );
  }

  // 2. CHAT SCREEN (iMessage Style)
  return (
    <div className="flex flex-col h-screen bg-white font-sans overflow-hidden">
      
      {/* HEADER: Glassmorphism */}
      <div className="px-6 py-4 bg-white/80 backdrop-blur-md border-b border-gray-100 sticky top-0 z-10 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
          <h2 className="text-lg font-semibold text-gray-800 tracking-tight">Group Chat</h2>
        </div>
        <div className="text-sm text-gray-400 font-medium">Logged in as <span className="text-blue-600">{username}</span></div>
      </div>

      {/* MESSAGES AREA */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 bg-gray-50/50 scroll-smooth">
        {messages.map((msg, index) => {
          const isMe = msg.user === username;
          const isSystem = msg.user === "System";

          if (isSystem) {
            return (
              <div key={index} className="flex justify-center my-4">
                <span className="px-3 py-1 bg-gray-200/60 rounded-full text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {msg.text}
                </span>
              </div>
            );
          }

          return (
            <div 
              key={index} 
              className={`flex flex-col ${isMe ? "items-end" : "items-start"} animate-in slide-in-from-bottom-2 duration-300`}
            >
              {/* Username label for others */}
              {!isMe && (
                <span className="ml-3 mb-1 text-xs text-gray-400 font-medium">
                  {msg.user}
                </span>
              )}

              {/* Chat Bubble */}
              <div 
                className={`
                  max-w-[75%] px-5 py-3 text-[15px] shadow-sm relative
                  ${isMe 
                    ? "bg-blue-600 text-white rounded-2xl rounded-tr-sm" // iMessage Blue Bubble
                    : "bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-tl-sm" // Gray/White Bubble
                  }
                `}
              >
                {msg.text}
              </div>
              
              {/* Tiny timestamp simulation (optional) */}
              <span className={`text-[10px] text-gray-300 mt-1 mx-1 ${isMe ? "text-right" : "text-left"}`}>
                Just now
              </span>
            </div>
          );
        })}
        {/* Invisible element to auto-scroll to */}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT AREA: Floating Bar Style */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex items-center space-x-2 max-w-4xl mx-auto">
          <input 
            value={message} 
            onChange={(e) => setMessage(e.target.value)} 
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()} 
            placeholder="iMessage"
            className="flex-1 bg-gray-100 text-gray-900 placeholder-gray-500 px-5 py-3 rounded-full focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 border border-transparent focus:border-blue-500/20 transition-all duration-200"
          />
          <button 
            onClick={sendMessage}
            disabled={!message.trim()}
            className={`
              p-3 rounded-full transition-all duration-200 flex items-center justify-center
              ${message.trim() 
                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md transform hover:scale-105" 
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
              }
            `}
          >
            {/* SVG Arrow Icon */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;