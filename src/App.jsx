import { useEffect, useState } from "react";
import { io } from "socket.io-client";

/**
 * 1. INITIALIZE CONNECTION
 * We establish the connection outside the component so it doesn't 
 * disconnect and reconnect every time the React UI updates.
 */
const socket = io("http://localhost:8000");

function App() {
  // --- STATE MANAGEMENT ---
  const [username, setUsername] = useState("");   // Stores the current user's name
  const [isJoined, setIsJoined] = useState(false); // Tracks if user has clicked "Join"
  const [message, setMessage] = useState("");     // Stores the text currently in the input box
  const [messages, setMessages] = useState([]);   // Array of all chat messages received

  /**
   * 2. EVENT LISTENERS (The "Receiver")
   * useEffect runs once when the app starts.
   */
  useEffect(() => {
    // Listen for "receiveMessage" events sent by the server
    socket.on("receiveMessage", (data) => {
      // Functional update (prev) => [...] ensures we don't lose messages 
      // if multiple arrive at the exact same time.
      setMessages((prev) => [...prev, data]);
    });

    // CLEANUP: If the component closes, stop listening to avoid memory leaks
    return () => socket.off("receiveMessage");
  }, []);

  /**
   * 3. JOIN LOGIC
   * Tells the server a new user has entered the group.
   */
  const joinChat = () => {
    if (username.trim()) {
      socket.emit("join", username); // Send "join" event to server
      setIsJoined(true);             // Switch from Login UI to Chat UI
    }
  };

  /**
   * 4. SEND LOGIC (The "Sender")
   * Takes the local state and pushes it to the server.
   */
  const sendMessage = () => {
    if (message.trim()) {
      const messageData = {
        user: username,
        text: message,
      };

      // Emit sends the data to the server
      socket.emit("sendMessage", messageData);
      
      // Clear the input field so the user can type the next message
      setMessage("");
    }
  };

  // --- UI RENDERING ---

  // LOGIN VIEW: Only shown if isJoined is false
  if (!isJoined) {
    return (
      <div style={{ padding: 20 }}>
        <h3>Enter Username</h3>
        <input 
          value={username} 
          onChange={(e) => setUsername(e.target.value)} 
          placeholder="Type your name..."
        />
        <button onClick={joinChat}>Join</button>
      </div>
    );
  }

  // CHAT VIEW: Shown to all users after they join
  return (
    <div style={{ padding: 20 }}>
      <h2>Chat App (User: {username})</h2>

      {/* MESSAGE BOX: Displays the history for everyone */}
      <div style={{ 
        border: "1px solid #ccc", 
        height: 300, 
        overflowY: "auto", 
        marginBottom: 10, 
        padding: 10 
      }}>
        {messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: "5px" }}>
            <b style={{ color: "blue" }}>{msg.user}:</b> {msg.text}
          </div>
        ))}
      </div>

      {/* INPUT AREA */}
      <input 
        value={message} 
        onChange={(e) => setMessage(e.target.value)} 
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()} // Allow "Enter" key to send
        placeholder="Write a message..."
      />
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}

export default App;