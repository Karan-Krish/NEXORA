import { useState } from "react";
import "./App.css";

function App() {
  const [activeChat, setActiveChat] = useState(null);
  const [message, setMessage] = useState("");
  const [showNewChat, setShowNewChat] = useState(false);
  const [mobileNumber, setMobileNumber] = useState("");
  const [searchResult, setSearchResult] = useState(null);

  const [chats, setChats] = useState([
    {
      id: 1,
      name: "NEXORA Team",
      message: "Welcome to NEXORA",
      time: "10:42 AM",
      unread: 2,
      online: true,
    },
    {
      id: 2,
      name: "Alex",
      message: "Hey! How are you?",
      time: "09:18 AM",
      unread: 3,
      online: true,
    },
    {
      id: 3,
      name: "Rohan",
      message: "See you soon.",
      time: "Yesterday",
      unread: 0,
      online: false,
    },
  ]);

  const [messages, setMessages] = useState({
    1: [
      {
        id: 1,
        text: "Welcome to NEXORA",
        sender: "other",
        time: "10:42 AM",
      },
    ],
  });

  const openChat = (chat) => {
    setActiveChat(chat);

    setChats((previousChats) =>
      previousChats.map((item) =>
        item.id === chat.id ? { ...item, unread: 0 } : item,
      ),
    );
  };

  const sendMessage = () => {
    if (!message.trim() || !activeChat) return;

    const newMessage = {
      id: Date.now(),
      text: message,
      sender: "me",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((previousMessages) => ({
      ...previousMessages,
      [activeChat.id]: [...(previousMessages[activeChat.id] || []), newMessage],
    }));

    setChats((previousChats) =>
      previousChats.map((chat) =>
        chat.id === activeChat.id
          ? {
              ...chat,
              message: message,
              time: "Now",
            }
          : chat,
      ),
    );

    setMessage("");
  };

  return (
    <div className="home-page">
      {/* Sidebar */}
      <aside className="sidebar">
        {/* Brand */}
        <div className="home-brand">
          <div className="brand-icon">N</div>
          <div className="brand-name">NEXORA</div>
        </div>

        {/* User Profile */}
        <div className="user-profile">
          <div className="avatar">K</div>

          <div>
            <h3>Krish</h3>
            <p>Available</p>
          </div>
        </div>

        {/* Search */}
        <div className="search-box">
          <span>⌕</span>

          <input type="text" placeholder="Search conversations" />
        </div>

        {/* Chats */}
        <div className="chat-list">
          <div className="chat-heading">
            <span>MESSAGES</span>

            <button
              className="new-chat-button"
              onClick={() => {
                setShowNewChat(true);
                setMobileNumber("");
                setSearchResult(null);
              }}
            >
              +
            </button>
          </div>

          {chats.map((chat) => (
            <button
              className={`chat-item ${
                activeChat?.id === chat.id ? "active" : ""
              }`}
              key={chat.id}
              onClick={() => openChat(chat)}
            >
              <div className="chat-avatar">
                {chat.name.charAt(0)}
                {chat.online && <span className="online-dot"></span>}
              </div>

              <div className="chat-info">
                <div className="chat-top">
                  <strong>{chat.name}</strong>
                  <span>{chat.time}</span>
                </div>

                <div className="chat-bottom">
                  <p>{chat.message}</p>

                  {chat.unread > 0 && (
                    <span className="unread">{chat.unread}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Sidebar Bottom */}
        <div className="sidebar-bottom">
          <button>⚙ Settings</button>

          <button>◐ Theme</button>
        </div>
      </aside>

      {/* Chat Area */}
      <main className="chat-area">
        {activeChat ? (
          <>
            {/* Chat Header */}
            <header className="chat-header">
              <div className="chat-header-user">
                <div className="large-avatar">{activeChat.name.charAt(0)}</div>

                <div>
                  <h2>{activeChat.name}</h2>

                  <p>{activeChat.online ? "Online" : "Last seen recently"}</p>
                </div>
              </div>

              <div className="chat-actions">
                <button title="Voice call">☎</button>
                <button title="Video call">▣</button>
                <button title="More">⋮</button>
              </div>
            </header>

            {/* Messages */}
            <div className="messages-area">
              {(messages[activeChat.id] || []).map((item) => (
                <div
                  key={item.id}
                  className={`message-row ${
                    item.sender === "me" ? "my-message" : "their-message"
                  }`}
                >
                  <div className="chat-message">
                    <span>{item.text}</span>

                    <small>{item.time}</small>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="message-input-area">
              <button className="attach-button">+</button>

              <input
                type="text"
                placeholder="Write a message..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    sendMessage();
                  }
                }}
              />

              <button className="send-button" onClick={sendMessage}>
                ➤
              </button>
            </div>
          </>
        ) : (
          /* Empty Chat */
          <div className="empty-chat">
            <div className="empty-icon">N</div>

            <h1>Welcome to NEXORA</h1>

            <p>Select a conversation to start messaging.</p>

         <button
  className="start-chat-button"
  onClick={() => {
    setShowNewChat(true);
    setMobileNumber("");
    setSearchResult(null);
  }}
>
  + Start a new chat
</button>
          </div>
        )}

                {/* New Chat Popup */}

        {showNewChat && (
          <div className="new-chat-overlay">

            <div className="new-chat-modal">

              <button
                className="close-modal"
                onClick={() => setShowNewChat(false)}
              >
                ×
              </button>

              <h2>New Chat</h2>

              <p>
                Find a NEXORA user using their mobile number.
              </p>

              <label>Mobile Number</label>

              <div className="mobile-input">

                <span>+91</span>

                <input
                  type="tel"
                  maxLength="10"
                  placeholder="Enter 10 digit number"
                  value={mobileNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "");

                    setMobileNumber(value);
                    setSearchResult(null);
                  }}
                />

              </div>

              <button
                className="search-user-button"
                onClick={() => {

                  if (mobileNumber.length !== 10) {

                    setSearchResult({
                      error:
                        "Please enter a valid 10 digit mobile number."
                    });

                    return;
                  }

                  setSearchResult({
                    name: "Demo User",
                    mobile: mobileNumber
                  });

                }}
              >
                SEARCH USER
              </button>

              {searchResult && (
                <div className="search-result">

                  {searchResult.error ? (

                    <p className="search-error">
                      {searchResult.error}
                    </p>

                  ) : (

                    <>
                      <div className="result-avatar">
                        D
                      </div>

                      <div className="result-info">

                        <strong>
                          {searchResult.name}
                        </strong>

                        <span>
                          +91 {searchResult.mobile}
                        </span>

                      </div>

                      <button
                        className="start-result-chat"
                        onClick={() => {

                          const newChat = {
                            id: Date.now(),
                            name: searchResult.name,
                            message:
                              "Start a new conversation",
                            time: "Now",
                            unread: 0,
                            online: true
                          };

                          setChats((previousChats) => [
                            newChat,
                            ...previousChats
                          ]);

                          setMessages((previousMessages) => ({
                            ...previousMessages,
                            [newChat.id]: []
                          }));

                          setActiveChat(newChat);

                          setShowNewChat(false);

                        }}
                      >
                        CHAT
                      </button>

                    </>
                  )}

                </div>
              )}

            </div>

          </div>
        )}
      </main>
    </div>
  );
}

export default App;
