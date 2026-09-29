import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import "./App.css";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

function App() {
  // ========================================
  const userIdRef = useRef(null);
  // SOCKET
  // ========================================
  const [socket, setSocket] = useState(null);

  // ========================================
  // ONLINE USERS
  // ========================================
  const [onlineUsers, setOnlineUsers] = useState({});

  // ========================================
  // SCREEN
  // ========================================
  const [screen, setScreen] = useState("register");

  // ========================================
  // REGISTRATION
  // ========================================
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // ========================================
  // OTP
  // ========================================

  const [otp, setOtp] = useState("");
  const [serverOtp, setServerOtp] = useState("");
  const [registrationToken, setRegistrationToken] = useState("");

  // Forgot Password OTP Timer
  const [otpTimer, setOtpTimer] = useState(0);

  useEffect(() => {
    if (otpTimer <= 0) {
      return;
    }

    const timer = setInterval(() => {
      setOtpTimer((previousTimer) => previousTimer - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [otpTimer]);

  // ========================================
  // USER
  // ========================================
  const [userId, setUserId] = useState(null);

  // ========================================
  // PROFILE
  // ========================================
  const [profileName, setProfileName] = useState("");
  const [bestFriend, setBestFriend] = useState("");
  const [bio, setBio] = useState("");
  const [partner, setPartner] = useState("");
  const [profilePhoto, setProfilePhoto] = useState(null);

  // ========================================
  // PASSWORD VISIBILITY
  // ========================================
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ========================================
  // GENERAL MESSAGES
  // ========================================
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // ========================================
  // LOGIN
  // ========================================
  const [loginMobile, setLoginMobile] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // ========================================
  // FORGOT PASSWORD
  // ========================================
  const [resetMobile, setResetMobile] = useState("");

  // ========================================
  // NEW PASSWORD
  // ========================================
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  // ========================================
  // MESSAGING
  // ========================================
  const [searchMobile, setSearchMobile] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [searchError, setSearchError] = useState("");
  const [messageError, setMessageError] = useState("");

  // ========================================
  // MEDIA VIEWER
  // ========================================
  const [viewer, setViewer] = useState(null);

  // ========================================
  // UPLOAD STATE
  // ========================================
  const [uploading, setUploading] = useState(false);

  // ========================================
  // VOICE MESSAGE
  // ========================================

  const [isRecording, setIsRecording] = useState(false);

  const [recordingSeconds, setRecordingSeconds] = useState(0);

  // Voice recording waiting for manual send
  const [recordedAudio, setRecordedAudio] = useState(null);

  const [recordedAudioUrl, setRecordedAudioUrl] = useState("");

  const mediaRecorderRef = useRef(null);

  const audioChunksRef = useRef([]);

  const recordingTimerRef = useRef(null);

  // ========================================
  // AUTO SCROLL REF
  // ========================================
  const messagesEndRef = useRef(null);

  // ========================================
  // RECENT CHATS
  // ========================================
  const [recentChats, setRecentChats] = useState([]);
  const [recentChatsLoading, setRecentChatsLoading] = useState(false);
  const [recentChatsError, setRecentChatsError] = useState("");

  // ========================================
  // MEDIA URL
  // ========================================
  const getMediaUrl = (fileUrl) => {
    if (!fileUrl) {
      return "";
    }

    if (fileUrl.startsWith("http://") || fileUrl.startsWith("https://")) {
      return fileUrl;
    }

    return `${API_URL}${fileUrl}`;
  };

  // ========================================
  // FILE TYPE HELPERS
  // ========================================
  const isImageMessage = (message) => {
    return (
      message.message_type === "image" ||
      message.mime_type?.startsWith("image/")
    );
  };

  const isVideoMessage = (message) => {
    return (
      message.message_type === "video" ||
      message.mime_type?.startsWith("video/")
    );
  };

  const isAudioMessage = (message) => {
    return (
      message.message_type === "audio" ||
      message.mime_type?.startsWith("audio/")
    );
  };

  const isDocumentMessage = (message) => {
    return (
      message.message_type === "document" ||
      (!isImageMessage(message) &&
        !isVideoMessage(message) &&
        !isAudioMessage(message) &&
        message.file_url)
    );
  };

  const isPdf = (message) => {
    return (
      message.mime_type === "application/pdf" ||
      message.file_name?.toLowerCase().endsWith(".pdf")
    );
  };

  // ========================================
  // OPEN MEDIA VIEWER
  // ========================================
  const openMediaViewer = (message) => {
    if (!message.file_url) {
      return;
    }

    setViewer({
      type: isImageMessage(message)
        ? "image"
        : isVideoMessage(message)
          ? "video"
          : isPdf(message)
            ? "pdf"
            : "document",
      url: getMediaUrl(message.file_url),
      name: message.file_name || message.content || "Document",
    });
  };

  // ========================================
  // CLOSE MEDIA VIEWER
  // ========================================
  const closeMediaViewer = () => {
    setViewer(null);
  };

  // ========================================
  // AUTO SCROLL
  // ========================================
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  // ========================================
  // LOAD RECENT CHATS
  // ========================================
  const loadRecentChats = async () => {
    if (!userId) {
      return;
    }

    setRecentChatsLoading(true);
    setRecentChatsError("");

    try {
      const response = await fetch(
        `${API_URL}/api/users/${userId}/conversations`,
      );

      const data = await response.json();

      if (!response.ok) {
        setRecentChatsError(data.message || "Could not load recent chats.");
        return;
      }

      setRecentChats(data.conversations || []);
    } catch (error) {
      console.error(error);

      setRecentChatsError("Cannot connect to NEXORA server.");
    } finally {
      setRecentChatsLoading(false);
    }
  };

  // ========================================
  // CHECK USER STATUS
  // ========================================
  const checkUserStatus = async (targetUserId) => {
    if (!targetUserId) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/users/${targetUserId}/status`,
      );

      const data = await response.json();

      if (response.ok) {
        setOnlineUsers((previousUsers) => ({
          ...previousUsers,
          [String(targetUserId)]: data.status === "online",
        }));
      }
    } catch (error) {
      console.error("Could not check user status:", error);
    }
  };

  // ========================================
  // SOCKET.IO CONNECTION
  // ========================================

  useEffect(() => {
    const newSocket = io(API_URL, {
      autoConnect: false,
    });

    newSocket.on("connect", () => {
      console.log("Connected to NEXORA Socket.IO:", newSocket.id);
    });

    newSocket.on("disconnect", () => {
      console.log("Disconnected from NEXORA Socket.IO");
    });

    // ========================================
    // LIVE USER STATUS
    // ========================================

    newSocket.on("user_status", ({ userId: statusUserId, status }) => {
      console.log("USER STATUS:", statusUserId, status);

      setOnlineUsers((previousUsers) => ({
        ...previousUsers,
        [String(statusUserId)]: status === "online",
      }));
    });

    // ========================================
    // NEW MESSAGE
    // ========================================

    newSocket.on("new_message", (newMessage) => {
      setMessages((previousMessages) => {
        const alreadyExists = previousMessages.some(
          (message) => message.id === newMessage.id,
        );

        if (alreadyExists) {
          return previousMessages;
        }

        return [...previousMessages, newMessage];
      });
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // ========================================
  // CONNECT / DISCONNECT USER PRESENCE
  // ========================================

  useEffect(() => {
    userIdRef.current = userId;
  }, [userId]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const announceOnline = () => {
      const currentUserId = userIdRef.current;

      if (!currentUserId) {
        return;
      }

      console.log("ANNOUNCING USER ONLINE:", currentUserId);

      socket.emit("user_online", currentUserId);
    };

    if (!socket.connected) {
      socket.connect();
    } else {
      announceOnline();
    }

    socket.on("connect", announceOnline);

    return () => {
      socket.off("connect", announceOnline);
    };
  }, [socket, userId]);

  // ========================================
  // RESTORE LOGIN
  // ========================================

  useEffect(() => {
    const savedUser = localStorage.getItem("nexoraUser");

    if (!savedUser) {
      return;
    }

    try {
      const user = JSON.parse(savedUser);

      setUserId(user.id);
      setMobile(user.mobile);

      fetch(`${API_URL}/api/profile/${user.id}`)
        .then((response) => response.json())
        .then((data) => {
          if (data.profile) {
            const profile = data.profile;

            setProfileName(profile.name || "");

            setBestFriend(profile.best_friend || "");

            setBio(profile.bio || "");

            setPartner(profile.partner || "");

            if (profile.profile_photo) {
              setProfilePhoto(profile.profile_photo);
            }

            setScreen("home");
          }
        })
        .catch((error) => {
          console.error("Failed to load saved user:", error);
        });
    } catch (error) {
      console.error("Invalid saved user data:", error);

      localStorage.removeItem("nexoraUser");
    }
  }, []);
  // ========================================
  // LOAD RECENT CHATS HOME
  // ========================================
  useEffect(() => {
    if (screen !== "home" || !userId) {
      return;
    }

    loadRecentChats();
  }, [screen, userId]);

  // ========================================
  // CHECK CURRENT CHAT USER STATUS
  // ========================================
  useEffect(() => {
    if (!conversation?.otherUser?.id) {
      return;
    }

    checkUserStatus(conversation.otherUser.id);
  }, [conversation?.otherUser?.id]);

  // ========================================
  // REGISTER
  // ========================================
  const handleRegister = async () => {
    setError("");
    setSuccess("");

    if (!/^\d{10}$/.test(mobile)) {
      setError("Please enter a valid 10 digit mobile number.");
      return;
    }

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Registration failed.");
        return;
      }

      // Save temporary registration token
      setRegistrationToken(data.registrationToken);

      // Show development OTP received from server
      setServerOtp(data.otp);

      // Clear previous OTP
      setOtp("");

      // Move to OTP verification screen
      setScreen("otp");
    } catch (error) {
      console.error(error);
      setError("Cannot connect to NEXORA server.");
    }
  };

  // ========================================
  // REGISTRATION OTP
  // ========================================

  const verifyOtp = async () => {
    setError("");
    setSuccess("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter the 6-digit OTP.");
      return;
    }

    if (!registrationToken) {
      setError("Registration session expired. Please register again.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          registrationToken,
          otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Invalid OTP.");
        return;
      }

      // Account is created only after successful OTP verification
      setUserId(data.user.id);

      setServerOtp("");
      setOtp("");
      setRegistrationToken("");

      // OTP verified → directly open PROFILE
      setError("");
      setSuccess("");
      setScreen("profile");
    } catch (error) {
      console.error(error);
      setError("Cannot connect to NEXORA server.");
    }
  };

  // ========================================
  // RESEND REGISTRATION OTP
  // ========================================

  const resendOtp = async () => {
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/api/resend-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Could not resend OTP.");
        return;
      }

      setOtp("");

      setSuccess(data.message || "A new NEXORA OTP has been generated.");
    } catch (error) {
      console.error(error);
      setError("Cannot connect to NEXORA server.");
    }
  };

  // ========================================
  // PROFILE PHOTO
  // ========================================

  const handleProfilePhoto = (e) => {
    const file = e.target.files?.[0];

    if (!file) {
      return;
    }

    setProfilePhoto(file);
    setError("");
  };

  // ========================================
  // SAVE PROFILE
  // ========================================

  const continueFromProfile = async () => {
    setError("");
    setSuccess("");

    // ========================================
    // VALIDATION
    // ========================================

    if (!profileName.trim()) {
      setError("Please enter your name.");
      return;
    }

    if (!bestFriend.trim()) {
      setError("Please enter your best friend's name.");
      return;
    }

    if (!bio.trim()) {
      setError("Please write a short bio.");
      return;
    }

    if (!profilePhoto) {
      setError("Please upload a profile photo.");
      return;
    }

    if (!userId) {
      setError("User ID not found. Please register again.");
      return;
    }

    try {
      // ========================================
      // SEND PROFILE AS MULTIPART FORM DATA
      // ========================================

      const formData = new FormData();

      formData.append("userId", String(userId));
      formData.append("name", profileName.trim());
      formData.append("bestFriend", bestFriend.trim());
      formData.append("bio", bio.trim());
      formData.append("partner", partner.trim());

      // ========================================
      // PROFILE PHOTO
      // ========================================
      // Upload only when user selects a NEW photo.
      // Existing Cloudinary photo is kept by backend.

      if (profilePhoto instanceof File) {
        formData.append("profilePhoto", profilePhoto);
      }

      // ========================================
      // SAVE PROFILE
      // ========================================

      const response = await fetch(`${API_URL}/api/profile`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      // ========================================
      // HANDLE ERROR
      // ========================================

      if (!response.ok) {
        setError(data.message || "Profile could not be saved.");
        return;
      }

      // ========================================
      // UPDATE PHOTO FROM SERVER
      // ========================================

      if (data.profile?.profile_photo) {
        setProfilePhoto(data.profile.profile_photo);
      }

      // ========================================
      // SUCCESS
      // ========================================

      setSuccess("Profile saved successfully!");

      setTimeout(() => {
        setSuccess("");
        setScreen("home");
      }, 800);
    } catch (error) {
      console.error("Profile save error:", error);

      setError("Cannot connect to NEXORA server.");
    }
  };

  // ========================================
  // LOGIN
  // ========================================
  const handleLogin = async () => {
    setError("");
    setSuccess("");

    if (!/^\d{10}$/.test(loginMobile)) {
      setError("Please enter a valid 10 digit mobile number.");
      return;
    }

    if (!loginPassword) {
      setError("Please enter your password.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: loginMobile,
          password: loginPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Login failed.");
        return;
      }

      setUserId(data.user.id);
      setMobile(data.user.mobile);

      localStorage.setItem(
        "nexoraUser",
        JSON.stringify({
          id: data.user.id,
          mobile: data.user.mobile,
        }),
      );

      if (data.profileCompleted) {
        const profileResponse = await fetch(
          `${API_URL}/api/profile/${data.user.id}`,
        );

        const profileData = await profileResponse.json();

        if (profileResponse.ok) {
          const profile = profileData.profile;

          setProfileName(profile.name || "");

          setBestFriend(profile.best_friend || "");

          setBio(profile.bio || "");

          setPartner(profile.partner || "");

          if (profile.profile_photo) {
            setProfilePhoto(profile.profile_photo);
          }
        }

        setSuccess("Login successful!");

        setTimeout(() => {
          setSuccess("");
          setScreen("home");
        }, 700);
      } else {
        setSuccess("Login successful. Complete your profile.");

        setTimeout(() => {
          setSuccess("");
          setScreen("profile");
        }, 700);
      }
    } catch (error) {
      console.error(error);

      setError("Cannot connect to NEXORA server.");
    }
  };

  // ========================================
  // FORGOT PASSWORD
  // ========================================

  const sendResetOtp = async () => {
    setError("");
    setSuccess("");

    if (!/^\d{10}$/.test(resetMobile)) {
      setError("Please enter a valid 10 digit mobile number.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/forgot-password/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: resetMobile,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.remainingSeconds) {
          setOtpTimer(data.remainingSeconds);
        }

        setError(data.message || "Could not send OTP.");
        return;
      }

      setOtp("");

      // Start 60 second resend timer
      setOtpTimer(60);

      setSuccess("OTP sent successfully.");

      console.log("🔐 NEXORA Forgot Password OTP:", data.otp);

      alert(`Your NEXORA verification OTP is: ${data.otp}`);

      setTimeout(() => {
        setSuccess("");
        setScreen("reset-otp");
      }, 800);
    } catch (error) {
      console.error("Send reset OTP error:", error);

      setError("Cannot connect to NEXORA server.");
    }
  };

  // ========================================
  // RESEND FORGOT PASSWORD OTP
  // ========================================

  const handleResendOtp = async () => {
    if (otpTimer > 0) {
      return;
    }

    setError("");
    setSuccess("");

    try {
      const response = await fetch(`${API_URL}/api/forgot-password/send-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: resetMobile,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.remainingSeconds) {
          setOtpTimer(data.remainingSeconds);
        }

        setError(data.message || "Could not resend OTP.");
        return;
      }

      setOtp("");

      // Start new 60 second timer
      setOtpTimer(60);

      setSuccess("New OTP sent successfully.");

      console.log("🔄 New NEXORA Forgot Password OTP:", data.otp);

      setTimeout(() => {
        setSuccess("");
      }, 1500);
    } catch (error) {
      console.error("Resend OTP error:", error);

      setError("Cannot connect to NEXORA server.");
    }
  };

  // ========================================
  // RESET OTP
  // ========================================

  const verifyResetOtp = async () => {
    setError("");
    setSuccess("");

    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter a valid 6 digit OTP.");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/forgot-password/verify-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            mobile: resetMobile,
            otp: otp,
          }),
        },
      );

      const data = await response.json();

      console.log("VERIFY OTP RESPONSE:", response.status, data);

      if (!response.ok) {
        setError(data.message || "Invalid OTP.");
        return;
      }

      setSuccess("OTP verified successfully.");

      setTimeout(() => {
        setSuccess("");
        setOtp("");
        setNewPassword("");
        setConfirmNewPassword("");
        setScreen("new-password");
      }, 700);
    } catch (error) {
      console.error("Reset OTP verification error:", error);

      setError("Cannot connect to NEXORA server.");
    }
  };
  // ========================================
  // RESET PASSWORD
  // ========================================
  const handleResetPassword = async () => {
    setError("");
    setSuccess("");

    if (newPassword.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mobile: resetMobile,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Password reset failed.");
        return;
      }

      setSuccess("Password reset successfully!");

      setTimeout(() => {
        setSuccess("");
        setResetMobile("");
        setNewPassword("");
        setConfirmNewPassword("");
        setLoginMobile("");
        setLoginPassword("");
        setScreen("login");
      }, 1000);
    } catch (error) {
      console.error(error);

      setError("Cannot connect to NEXORA server.");
    }
  };

  // ========================================
  // OPEN MESSAGING
  // ========================================
  const openMessaging = () => {
    setError("");
    setSuccess("");
    setSearchError("");
    setMessageError("");
    setSearchMobile("");
    setSearchResult(null);
    setConversation(null);
    setMessages([]);
    setMessageText("");
    setSelectedFiles([]);
    setViewer(null);

    setScreen("messaging");
  };

  // ========================================
  // SEARCH USER
  // ========================================
  const searchUser = async () => {
    setSearchError("");
    setSearchResult(null);

    if (!/^\d{10}$/.test(searchMobile)) {
      setSearchError("Enter a valid 10 digit mobile number.");
      return;
    }

    if (searchMobile === mobile) {
      setSearchError("You cannot search for yourself.");
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/api/users/search/${searchMobile}`,
      );

      const data = await response.json();

      if (!response.ok) {
        setSearchError(data.message || "User not found.");
        return;
      }

      setSearchResult(data.user);

      await checkUserStatus(data.user.id);
    } catch (error) {
      console.error(error);

      setSearchError("Cannot connect to NEXORA server.");
    }
  };

  // ========================================
  // START CHAT
  // ========================================

  const startChat = async () => {
    setSearchError("");

    if (!searchResult) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          otherUserId: searchResult.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setSearchError(data.message || "Could not start conversation.");
        return;
      }

      // Set current conversation
      setConversation({
        ...data.conversation,
        otherUser: searchResult,
      });

      // Check latest online/offline status
      await checkUserStatus(searchResult.id);

      // Load messages
      await loadMessages(data.conversation.id);

      // Join conversation room
      if (socket) {
        socket.emit("join_conversation", data.conversation.id);
      }

      // Refresh recent chats
      await loadRecentChats();
    } catch (error) {
      console.error("Start chat error:", error);

      setSearchError("Cannot create conversation.");
    }
  };

  // ========================================
  // LOAD MESSAGES
  // ========================================

  const loadMessages = async (conversationId) => {
    setMessageError("");

    try {
      const response = await fetch(
        `${API_URL}/api/conversations/${conversationId}/messages?userId=${userId}`,
      );

      const data = await response.json();

      if (!response.ok) {
        setMessageError(data.message || "Could not load messages.");
        return;
      }

      setMessages(data.messages || []);
    } catch (error) {
      console.error("Load messages error:", error);
      setMessageError("Cannot load messages.");
    }
  };
  // ========================================
  // OPEN RECENT CHAT
  // ========================================
  const openRecentChat = async (chat) => {
    try {
      setMessageError("");
      setSearchError("");

      const response = await fetch(`${API_URL}/api/conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          otherUserId: chat.other_user_id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessageError(data.message || "Could not open conversation.");
        return;
      }

      setConversation({
        ...data.conversation,
        otherUser: {
          id: chat.other_user_id,
          mobile: chat.other_user_mobile,
          name: chat.other_user_name,
          profile_photo: chat.profile_photo,
        },
      });

      await checkUserStatus(chat.other_user_id);

      await loadMessages(data.conversation.id);

      if (socket) {
        socket.emit("join_conversation", data.conversation.id);
      }

      setScreen("messaging");
    } catch (error) {
      console.error(error);

      setMessageError("Cannot open conversation.");
    }
  };

  // ========================================
  // DELETE MESSAGE FOR ME
  // ========================================

  const deleteMessageForMe = async (messageId) => {
    setMessageError("");

    try {
      const response = await fetch(
        `${API_URL}/api/messages/${messageId}/for-me`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setMessageError(data.message || "Could not delete message.");
        return;
      }

      setMessages((previousMessages) =>
        previousMessages.filter(
          (message) => Number(message.id) !== Number(messageId),
        ),
      );

      await loadRecentChats();
    } catch (error) {
      console.error("Delete for me error:", error);
      setMessageError("Cannot delete message.");
    }
  };

  // ========================================
  // DELETE MESSAGE FOR EVERYONE
  // ========================================

  const deleteMessageForEveryone = async (messageId) => {
    setMessageError("");

    try {
      const response = await fetch(
        `${API_URL}/api/messages/${messageId}/for-everyone`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setMessageError(
          data.message || "Could not delete message for everyone.",
        );
        return;
      }

      setMessages((previousMessages) =>
        previousMessages.map((message) =>
          Number(message.id) === Number(messageId)
            ? {
                ...message,
                deleted_for_everyone: true,
                content: null,
                file_url: null,
                file_name: null,
                file_size: null,
                mime_type: null,
              }
            : message,
        ),
      );

      await loadRecentChats();
    } catch (error) {
      console.error("Delete for everyone error:", error);
      setMessageError("Cannot delete message for everyone.");
    }
  };

  // ========================================
  // SEND MESSAGE
  // ========================================

  const sendMessage = async () => {
    setMessageError("");

    if (!conversation) {
      setMessageError("Please start a chat first.");
      return;
    }

    if (!messageText.trim() && selectedFiles.length === 0) {
      return;
    }

    // ========================================
    // SEND SELECTED FILES
    // ========================================
    if (selectedFiles.length > 0) {
      setUploading(true);

      try {
        for (const file of selectedFiles) {
          const formData = new FormData();

          formData.append("conversationId", conversation.id);

          formData.append("senderId", userId);

          formData.append("file", file);

          const response = await fetch(`${API_URL}/api/messages/upload`, {
            method: "POST",
            body: formData,
          });

          const data = await response.json();

          if (!response.ok) {
            setMessageError(data.message || `Could not send ${file.name}`);

            setUploading(false);
            return;
          }

          setMessages((previousMessages) => {
            const alreadyExists = previousMessages.some(
              (message) => message.id === data.data.id,
            );

            if (alreadyExists) {
              return previousMessages;
            }

            return [...previousMessages, data.data];
          });
        }

        setSelectedFiles([]);

        const fileInput = document.getElementById("fileInput");

        if (fileInput) {
          fileInput.value = "";
        }

        await loadRecentChats();
      } catch (error) {
        console.error("File upload error:", error);

        setMessageError("Cannot upload files. Please try again.");
      } finally {
        setUploading(false);
      }
    }

    // ========================================
    // SEND TEXT MESSAGE
    // ========================================
    if (messageText.trim()) {
      try {
        const response = await fetch(`${API_URL}/api/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            conversationId: conversation.id,
            senderId: userId,
            content: messageText.trim(),
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setMessageError(data.message || "Message could not be sent.");
          return;
        }

        setMessages((previousMessages) => {
          const alreadyExists = previousMessages.some(
            (message) => message.id === data.data.id,
          );

          if (alreadyExists) {
            return previousMessages;
          }

          return [...previousMessages, data.data];
        });

        setMessageText("");

        await loadRecentChats();
      } catch (error) {
        console.error(error);

        setMessageError("Cannot connect to NEXORA server.");
      }
    }
  };

  // ========================================
  // START VOICE RECORDING
  // ========================================

  const startVoiceRecording = async () => {
    if (!conversation || uploading || isRecording || recordedAudio) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setMessageError("Voice recording is not supported in this browser.");
      return;
    }

    try {
      setMessageError("");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorderRef.current = mediaRecorder;

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });

        stream.getTracks().forEach((track) => {
          track.stop();
        });

        if (audioBlob.size === 0) {
          setMessageError("No voice recording was captured.");

          setRecordingSeconds(0);
          return;
        }

        const audioUrl = URL.createObjectURL(audioBlob);

        setRecordedAudio(audioBlob);
        setRecordedAudioUrl(audioUrl);

        setRecordingSeconds((previousSeconds) => previousSeconds);
      };

      mediaRecorder.start();

      setIsRecording(true);
      setRecordingSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((previousSeconds) => previousSeconds + 1);
      }, 1000);
    } catch (error) {
      console.error("Voice recording error:", error);

      setIsRecording(false);
      setRecordingSeconds(0);

      setMessageError("Microphone permission is required.");
    }
  };

  // ========================================
  // STOP VOICE RECORDING
  // ========================================

  const stopVoiceRecording = () => {
    if (!mediaRecorderRef.current) {
      return;
    }

    clearInterval(recordingTimerRef.current);

    recordingTimerRef.current = null;

    setIsRecording(false);

    const mediaRecorder = mediaRecorderRef.current;

    if (mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
    }
  };

  // ========================================
  // SEND VOICE MESSAGE
  // ========================================

  const sendVoiceMessage = async (audioBlob) => {
    if (!conversation || !userId || !audioBlob) {
      return;
    }

    setUploading(true);
    setMessageError("");

    try {
      const formData = new FormData();

      formData.append("conversationId", conversation.id);

      formData.append("senderId", userId);

      formData.append("file", audioBlob, `voice-${Date.now()}.webm`);

      const response = await fetch(`${API_URL}/api/messages/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        setMessageError(data.message || "Voice message could not be sent.");

        return;
      }

      setMessages((previousMessages) => {
        const alreadyExists = previousMessages.some(
          (message) => message.id === data.data.id,
        );

        if (alreadyExists) {
          return previousMessages;
        }

        return [...previousMessages, data.data];
      });

      await loadRecentChats();

      setMessageError("");
    } catch (error) {
      console.error("Voice message error:", error);

      setMessageError("Cannot send voice message.");
    } finally {
      setUploading(false);
      setRecordingSeconds(0);
    }
  };
  // ========================================
  // ENTER TO SEND
  // ========================================
  const handleMessageKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // ========================================
  // FILE SELECT
  // ========================================
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);

    setSelectedFiles(files);
    setMessageError("");
  };

  // ========================================
  // REMOVE SELECTED FILE
  // ========================================
  const removeSelectedFile = (index) => {
    setSelectedFiles((previousFiles) =>
      previousFiles.filter((_, i) => i !== index),
    );
  };

  // ========================================
  // OPEN HOME
  // ========================================
  const openHome = () => {
    setError("");
    setSuccess("");
    setMessageError("");
    setSearchError("");
    setViewer(null);

    setScreen("home");
  };

  // ========================================
  // LOGOUT
  // ========================================
  const handleLogout = () => {
    if (socket) {
      socket.disconnect();
    }

    localStorage.removeItem("nexoraUser");

    setUserId(null);
    setMobile("");
    setProfileName("");
    setBestFriend("");
    setBio("");
    setPartner("");
    setProfilePhoto(null);
    setRecentChats([]);
    setRecentChatsError("");
    setConversation(null);
    setMessages([]);
    setMessageText("");
    setSelectedFiles([]);
    setViewer(null);
    setOnlineUsers({});

    setError("");
    setSuccess("");

    setScreen("register");
  };

  // ========================================
  // RENDER MEDIA MESSAGE
  // ========================================

  const renderMediaMessage = (message) => {
    // IMAGE
    if (isImageMessage(message)) {
      return (
        <div
          style={{
            marginBottom: "6px",
            cursor: "pointer",
          }}
          onClick={() => openMediaViewer(message)}
        >
          <img
            src={getMediaUrl(message.file_url)}
            alt={message.file_name || "Photo"}
            style={{
              display: "block",
              width: "100%",
              maxWidth: "320px",
              maxHeight: "320px",
              objectFit: "cover",
              borderRadius: "12px",
            }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />

          <div
            style={{
              fontSize: "11px",
              opacity: 0.65,
              marginTop: "5px",
            }}
          >
            Click to view
          </div>
        </div>
      );
    }

    // VIDEO
    if (isVideoMessage(message)) {
      return (
        <div
          style={{
            marginBottom: "6px",
          }}
        >
          <video
            src={getMediaUrl(message.file_url)}
            controls
            preload="metadata"
            playsInline
            style={{
              display: "block",
              width: "100%",
              maxWidth: "360px",
              maxHeight: "320px",
              borderRadius: "12px",
              background: "#000",
            }}
          />

          <button
            type="button"
            onClick={() => openMediaViewer(message)}
            style={{
              marginTop: "6px",
              border: "none",
              background: "rgba(255,255,255,0.08)",
              color: "#fff",
              padding: "6px 10px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "11px",
            }}
          >
            Open Fullscreen
          </button>
        </div>
      );
    }

    // AUDIO / VOICE MESSAGE
    if (isAudioMessage(message)) {
      return (
        <div
          style={{
            marginBottom: "6px",
            padding: "8px 10px",
            borderRadius: "12px",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.10)",
          }}
        >
          <audio
            controls
            preload="metadata"
            src={getMediaUrl(message.file_url)}
            style={{
              display: "block",
              width: "260px",
              maxWidth: "100%",
            }}
          />
        </div>
      );
    }

    // DOCUMENT
    if (isDocumentMessage(message)) {
      return (
        <div
          style={{
            minWidth: "220px",
            maxWidth: "300px",
            padding: "12px",
            borderRadius: "12px",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.12)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
            }}
          >
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "linear-gradient(135deg, #6c5ce7, #8e44ad)",
                fontSize: "20px",
                flexShrink: 0,
              }}
            >
              📄
            </div>

            <div
              style={{
                minWidth: 0,
                flex: 1,
              }}
            >
              <div
                style={{
                  fontSize: "13px",
                  fontWeight: "600",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {message.file_name || message.content || "Document"}
              </div>

              <div
                style={{
                  fontSize: "10px",
                  opacity: 0.6,
                  marginTop: "3px",
                }}
              >
                {message.file_size
                  ? `${(Number(message.file_size) / (1024 * 1024)).toFixed(
                      2,
                    )} MB`
                  : "Document"}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openMediaViewer(message)}
            style={{
              width: "100%",
              marginTop: "10px",
              border: "1px solid rgba(255,255,255,0.15)",
              background: "linear-gradient(135deg, #6c5ce7, #8e44ad)",
              color: "#fff",
              padding: "8px 12px",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            OPEN DOCUMENT
          </button>
        </div>
      );
    }

    return null;
  };

  // ========================================
  // UI
  // ========================================
  return (
    <div className="register-page">
      <div className={`register-card ${screen}`}>
        {/* LOGO */}
        <div className="register-logo">NEXORA</div>

        {/* ========================================
            REGISTER
        ======================================== */}
        {screen === "register" && (
          <>
            {/* <h1>NEXORA</h1> */}

            <p className="register-subtitle">Create your account</p>

            <label>Mobile Number</label>

            <div className="mobile-field">
              <span>+91</span>

              <input
                type="tel"
                maxLength="10"
                placeholder="Enter 10 digit mobile number"
                value={mobile}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");

                  setMobile(value);
                  setError("");
                }}
              />
            </div>

            <label>Password</label>

            <div className="password-field">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Create password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <label>Confirm Password</label>

            <div className="password-field">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setError("");
                }}
              />

              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>

            {error && <p className="form-error">{error}</p>}

            {success && <p className="form-success">{success}</p>}

            <button className="register-button" onClick={handleRegister}>
              CREATE MY NEXORA ID
            </button>

            <p className="login-text">
              Already have an account?{" "}
              <span
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setLoginMobile("");
                  setLoginPassword("");
                  setScreen("login");
                }}
                style={{
                  cursor: "pointer",
                }}
              >
                Login
              </span>
            </p>
          </>
        )}

        {/* ========================================
            LOGIN
        ======================================== */}
        {screen === "login" && (
          <>
            <h1>Welcome Back</h1>

            <p className="register-subtitle">Login to your NEXORA account</p>

            <label>Mobile Number</label>

            <div className="mobile-field">
              <span>+91</span>

              <input
                type="tel"
                maxLength="10"
                placeholder="Enter 10 digit mobile number"
                value={loginMobile}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");

                  setLoginMobile(value);
                  setError("");
                }}
              />
            </div>

            <label>Password</label>

            <div className="password-field">
              <input
                type={showLoginPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={loginPassword}
                onChange={(e) => {
                  setLoginPassword(e.target.value);
                  setError("");
                }}
              />

              <button
                type="button"
                onClick={() => setShowLoginPassword(!showLoginPassword)}
              >
                {showLoginPassword ? "Hide" : "Show"}
              </button>
            </div>

            {error && <p className="form-error">{error}</p>}

            {success && <p className="form-success">{success}</p>}

            <button className="register-button" onClick={handleLogin}>
              LOGIN TO NEXORA
            </button>

            <p className="login-text">
              Don't have an account?{" "}
              <span
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setScreen("register");
                }}
                style={{
                  cursor: "pointer",
                }}
              >
                Create Account
              </span>
            </p>

            <p
              className="login-text"
              style={{
                marginTop: "8px",
              }}
            >
              <span
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setResetMobile("");
                  setOtp("");
                  setNewPassword("");
                  setConfirmNewPassword("");
                  setLoginMobile("");
                  setLoginPassword("");
                  setScreen("forgot-password");
                }}
                style={{
                  cursor: "pointer",
                }}
              >
                Forgot Password?
              </span>
            </p>
          </>
        )}

        {/* ========================================
            FORGOT PASSWORD
        ======================================== */}
        {screen === "forgot-password" && (
          <>
            <h1>Forgot Password</h1>

            <label>Mobile Number</label>

            <div className="mobile-field">
              <span>+91</span>

              <input
                type="tel"
                maxLength="10"
                placeholder="Enter 10 digit mobile number"
                value={resetMobile}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");

                  setResetMobile(value);
                  setError("");
                }}
              />
            </div>

            {error && <p className="form-error">{error}</p>}

            {success && <p className="form-success">{success}</p>}

            <button className="register-button" onClick={sendResetOtp}>
              SEND OTP
            </button>

            <p className="login-text">
              Remember your password?{" "}
              <span
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setResetMobile("");
                  setScreen("login");
                }}
                style={{
                  cursor: "pointer",
                }}
              >
                Login
              </span>
            </p>
          </>
        )}

        {/* ========================================
            RESET OTP
        ======================================== */}
        {screen === "reset-otp" && (
          <>
            <h1>Verify OTP</h1>

            <p className="register-subtitle">Enter the 6-digit OTP sent to</p>

            <p className="otp-mobile">+91 {resetMobile}</p>

            <label>Verification Code</label>

            <input
              className="otp-input"
              type="text"
              inputMode="numeric"
              maxLength="6"
              placeholder="Enter 6 digit OTP"
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");

                setOtp(value);
                setError("");
              }}
            />

            {error && <p className="form-error">{error}</p>}

            {success && <p className="form-success">{success}</p>}

            <button className="register-button" onClick={verifyResetOtp}>
              VERIFY OTP
            </button>

            <p className="otp-note">Didn't receive the OTP?</p>

            {otpTimer > 0 ? (
              <p className="otp-timer">
                Resend OTP in <strong>{otpTimer}s</strong>
              </p>
            ) : (
              <button
                type="button"
                className="resend-otp-button"
                onClick={handleResendOtp}
              >
                RESEND OTP
              </button>
            )}

            <p className="login-text">
              Wrong mobile number?{" "}
              <span
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setOtp("");
                  setOtpTimer(0);
                  setResetMobile("");
                  setScreen("forgot-password");
                }}
                style={{
                  cursor: "pointer",
                }}
              >
                Change Number
              </span>
            </p>
          </>
        )}

        {screen === "new-password" && (
          <>
            <h1>New Password</h1>

            <p className="register-subtitle">
              Create a new password for your NEXORA account
            </p>

            <label>New Password</label>

            <div className="password-field">
              <input
                type={showNewPassword ? "text" : "password"}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setError("");
                }}
              />

              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? "Hide" : "Show"}
              </button>
            </div>

            <label>Confirm New Password</label>

            <div className="password-field">
              <input
                type={showConfirmNewPassword ? "text" : "password"}
                placeholder="Confirm new password"
                value={confirmNewPassword}
                onChange={(e) => {
                  setConfirmNewPassword(e.target.value);
                  setError("");
                }}
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmNewPassword(!showConfirmNewPassword)
                }
              >
                {showConfirmNewPassword ? "Hide" : "Show"}
              </button>
            </div>

            {error && <p className="form-error">{error}</p>}
            {success && <p className="form-success">{success}</p>}

            <button className="register-button" onClick={handleResetPassword}>
              RESET PASSWORD
            </button>

            <p className="login-text">
              Remember your password?{" "}
              <span
                onClick={() => {
                  setError("");
                  setSuccess("");
                  setNewPassword("");
                  setConfirmNewPassword("");
                  setResetMobile("");
                  setScreen("login");
                }}
                style={{
                  cursor: "pointer",
                }}
              >
                Login
              </span>
            </p>
          </>
        )}

        {screen === "otp" && (
          <>
            <div className="otp-security-icon">🔐</div>

            <h1>Verify Your Number</h1>

            <p className="register-subtitle">
              Enter the 6-digit security code for
            </p>

            <p className="otp-mobile">+91 {mobile}</p>

            <div className="otp-security-box">
              <div className="otp-security-title">NEXORA SECURITY CODE</div>

              <div className="otp-security-code">{serverOtp || "------"}</div>

              <div className="otp-security-time">
                This code expires in 5 minutes
              </div>
            </div>

            <label>OTP</label>

            <input
              className="otp-input"
              type="text"
              inputMode="numeric"
              maxLength="6"
              placeholder="Enter 6 digit OTP"
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, "");
                setOtp(value);
                setError("");
              }}
            />

            {error && <p className="form-error">{error}</p>}

            <button className="register-button" onClick={verifyOtp}>
              VERIFY OTP
            </button>

            <button
              type="button"
              className="otp-resend-button"
              onClick={resendOtp}
            >
              RESEND OTP
            </button>

            <p className="otp-note">
              For development, this security code is displayed here.
            </p>
          </>
        )}

        {screen === "profile" && (
          <>
            <h1 style={{ color: "white", display: "block" }}>
              Complete Your Profile
            </h1>

            <p style={{ color: "white", display: "block" }}>
              Set up your NEXORA profile
            </p>

            <div className="profile-photo-section">
              {profilePhoto ? (
                <img
                  src={
                    profilePhoto instanceof File
                      ? URL.createObjectURL(profilePhoto)
                      : profilePhoto
                  }
                  alt="Profile"
                  className="profile-preview"
                />
              ) : (
                <div className="profile-placeholder">N</div>
              )}

              <label className="photo-upload-button">
                Upload Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];

                    if (!file) return;

                    setProfilePhoto(file);
                    setError("");
                  }}
                  hidden
                />
              </label>
            </div>

            <label>Your Name</label>

            <input
              type="text"
              placeholder="Enter your name"
              value={profileName}
              onChange={(e) => {
                setProfileName(e.target.value);
                setError("");
              }}
            />

            <label>Verified Mobile Number</label>

            <input type="text" value={`+91 ${mobile}`} disabled />

            <label>Best Friend Name</label>

            <input
              type="text"
              placeholder="Enter your best friend's name"
              value={bestFriend}
              onChange={(e) => {
                setBestFriend(e.target.value);
                setError("");
              }}
            />

            <label>Bio</label>

            <input
              type="text"
              placeholder="Write a short bio"
              value={bio}
              onChange={(e) => {
                setBio(e.target.value);
                setError("");
              }}
            />

            <label>Partner Name (Optional)</label>

            <input
              type="text"
              placeholder="Optional"
              value={partner}
              onChange={(e) => {
                setPartner(e.target.value);
              }}
            />

            {error && <p className="form-error">{error}</p>}

            {success && <p className="form-success">{success}</p>}

            <button className="register-button" onClick={continueFromProfile}>
              CONTINUE TO NEXORA
            </button>
          </>
        )}

        {/* ========================================
            HOME
======================================== */}

        {screen === "home" && (
          <>
            <h1>Welcome to NEXORA</h1>

            <p className="register-subtitle">Your profile is ready.</p>

            <div className="home-profile">
              {profilePhoto && (
                <img
                  src={
                    profilePhoto instanceof File
                      ? URL.createObjectURL(profilePhoto)
                      : getMediaUrl(profilePhoto)
                  }
                  alt="Profile"
                  className="profile-preview"
                />
              )}

              <h2>{profileName}</h2>

              <p>{bio}</p>

              <p>
                <strong>Mobile:</strong> +91 {mobile}
              </p>

              <p>
                <strong>Best Friend:</strong> {bestFriend}
              </p>

              {partner && (
                <p>
                  <strong>Partner:</strong> {partner}
                </p>
              )}
            </div>

            {/* ========================================
                RECENT CHATS
    ======================================== */}

            <div
              style={{
                width: "100%",
                marginTop: "20px",
                marginBottom: "15px",
              }}
            >
              <h2
                style={{
                  textAlign: "left",
                  marginBottom: "12px",
                }}
              >
                Recent Chats
              </h2>

              {/* ONLY THIS AREA WILL SCROLL */}
              <div className="recent-chats-scroll">
                {recentChatsLoading && (
                  <p className="register-subtitle">Loading chats...</p>
                )}

                {recentChatsError && (
                  <p className="form-error">{recentChatsError}</p>
                )}

                {!recentChatsLoading && recentChats.length === 0 && (
                  <p className="register-subtitle">No conversations yet.</p>
                )}

                {!recentChatsLoading &&
                  recentChats.map((chat) => (
                    <div
                      key={chat.conversation_id}
                      onClick={() => openRecentChat(chat)}
                      style={{
                        width: "100%",
                        padding: "12px",
                        marginBottom: "10px",
                        borderRadius: "14px",
                        background: "rgba(255,255,255,0.05)",
                        cursor: "pointer",
                        textAlign: "left",
                        boxSizing: "border-box",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        {/* PROFILE PHOTO */}

                        {chat.profile_photo ? (
                          <img
                            src={getMediaUrl(chat.profile_photo)}
                            alt={chat.other_user_name}
                            className="profile-preview"
                            style={{
                              width: "48px",
                              height: "48px",
                              margin: 0,
                              flexShrink: 0,
                              borderRadius: "50%",
                              objectFit: "cover",
                              display: "block",
                            }}
                          />
                        ) : (
                          <div className="profile-placeholder">
                            {chat.other_user_name
                              ? chat.other_user_name.charAt(0).toUpperCase()
                              : "N"}
                          </div>
                        )}

                        {/* CHAT INFO */}

                        <div
                          style={{
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          <strong>
                            {chat.other_user_name || "NEXORA User"}
                          </strong>

                          <p
                            style={{
                              margin: "4px 0 0",
                              opacity: 0.7,
                              fontSize: "13px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {chat.last_message ||
                              (chat.last_message_type === "image"
                                ? "📷 Photo"
                                : chat.last_message_type === "video"
                                  ? "🎥 Video"
                                  : chat.last_message_type === "document"
                                    ? "📄 Document"
                                    : "No messages yet")}
                          </p>
                        </div>

                        {/* TIME + UNREAD */}

                        <div
                          style={{
                            textAlign: "right",
                            fontSize: "11px",
                            opacity: 0.7,
                            flexShrink: 0,
                          }}
                        >
                          {chat.last_message_time
                            ? new Date(
                                chat.last_message_time,
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}

                          {Number(chat.unread_count) > 0 && (
                            <div
                              style={{
                                marginTop: "5px",
                                fontSize: "11px",
                                fontWeight: "bold",
                              }}
                            >
                              {chat.unread_count}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* ========================================
                ACTION BUTTONS
    ======================================== */}

            <button className="register-button" onClick={openMessaging}>
              START MESSAGING
            </button>

            <button
              className="register-button"
              onClick={() => {
                setScreen("profile");
              }}
              style={{
                marginTop: "10px",
              }}
            >
              EDIT PROFILE
            </button>

            <button className="register-button" onClick={handleLogout}>
              LOGOUT
            </button>
          </>
        )}

        {/* ========================================
            MESSAGING
        ======================================== */}
        {screen === "messaging" && (
          <>
            {!conversation ? (
              <>
                <h1>NEXORA MESSAGING</h1>

                <p className="register-subtitle">
                  Find a NEXORA user and start chatting.
                </p>

                <label>Search by Mobile Number</label>

                <div className="mobile-field">
                  <span>+91</span>

                  <input
                    type="tel"
                    maxLength="10"
                    placeholder="Enter mobile number"
                    value={searchMobile}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, "");

                      setSearchMobile(value);

                      setSearchError("");

                      setSearchResult(null);
                    }}
                  />
                </div>

                {searchError && <p className="form-error">{searchError}</p>}

                <button className="register-button" onClick={searchUser}>
                  SEARCH USER
                </button>

                {searchResult && (
  <div className="home-profile">
    {searchResult.profile_photo ? (
      <img
        src={searchResult.profile_photo}
        alt={searchResult.name || "Profile"}
        className="profile-preview"
      />
    ) : (
      <div className="profile-placeholder">
        {searchResult.name
          ? searchResult.name.charAt(0).toUpperCase()
          : "N"}
      </div>
    )}

    <h2>{searchResult.name || "NEXORA User"}</h2>

    <p>+91 {searchResult.mobile}</p>

    {searchResult.bio && <p>{searchResult.bio}</p>}

    <p
      style={{
        fontSize: "13px",
        marginTop: "8px",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          background: onlineUsers[String(searchResult.id)]
            ? "#2ecc71"
            : "#777",
          marginRight: "6px",
        }}
      />

      {onlineUsers[String(searchResult.id)]
        ? "Online"
        : "Offline"}
    </p>

    <button
      className="register-button"
      onClick={startChat}
    >
      START CHAT
    </button>
  </div>
)}

                <button
                  className="register-button"
                  onClick={openHome}
                  style={{
                    marginTop: "10px",
                  }}
                >
                  BACK TO HOME
                </button>
              </>
            ) : (
              <>
                {/* CHAT HEADER */}
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "10px 0 15px",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  {conversation.otherUser.profile_photo ? (
                    <img
                      src={getMediaUrl(conversation.otherUser.profile_photo)}
                      alt={conversation.otherUser.name}
                      className="profile-preview"
                      style={{
                        width: "48px",
                        height: "48px",
                        margin: 0,
                        borderRadius: "50%",
                        objectFit: "cover",
                        display: "block",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div className="profile-placeholder">
                      {conversation.otherUser.name
                        ? conversation.otherUser.name.charAt(0).toUpperCase()
                        : "N"}
                    </div>
                  )}

                  <div
                    style={{
                      textAlign: "left",
                      flex: 1,
                    }}
                  >
                    <h2
                      style={{
                        margin: 0,
                      }}
                    >
                      {conversation.otherUser.name || "NEXORA User"}
                    </h2>

                    <p
                      style={{
                        margin: "3px 0 0",
                        opacity: 0.65,
                        fontSize: "13px",
                      }}
                    >
                      +91 {conversation.otherUser.mobile}
                    </p>

                    {/* ONLINE / OFFLINE */}
                    <p
                      style={{
                        margin: "4px 0 0",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: onlineUsers[String(conversation.otherUser.id)]
                          ? "#2ecc71"
                          : "rgba(255,255,255,0.5)",
                      }}
                    >
                      <span
                        style={{
                          display: "inline-block",
                          width: "7px",
                          height: "7px",
                          borderRadius: "50%",
                          background: onlineUsers[
                            String(conversation.otherUser.id)
                          ]
                            ? "#2ecc71"
                            : "#777",
                          marginRight: "6px",
                        }}
                      />

                      {onlineUsers[String(conversation.otherUser.id)]
                        ? "Online"
                        : "Offline"}
                    </p>
                  </div>
                </div>

                {/* ========================================
    MESSAGES
======================================== */}

                <div
                  style={{
                    width: "100%",
                    minHeight: "280px",
                    maxHeight: "430px",
                    overflowY: "auto",
                    overflowX: "hidden",
                    marginTop: "15px",
                    marginBottom: "15px",
                    padding: "12px",
                    borderRadius: "16px",
                    background: "rgba(255,255,255,0.035)",
                    boxSizing: "border-box",
                  }}
                >
                  {messages.length === 0 ? (
                    <p
                      style={{
                        textAlign: "center",
                        opacity: 0.6,
                        marginTop: "100px",
                      }}
                    >
                      No messages yet.
                      <br />
                      Start the conversation.
                    </p>
                  ) : (
                    messages.map((message) => {
                      const isMine =
                        Number(message.sender_id) === Number(userId);

                      const isDeleted = Boolean(message.deleted_for_everyone);

                      const hasMedia = !isDeleted && Boolean(message.file_url);

                      return (
                        <div
                          key={message.id}
                          style={{
                            display: "flex",
                            justifyContent: isMine ? "flex-end" : "flex-start",
                            marginBottom: "10px",
                          }}
                        >
                          <div
                            style={{
                              position: "relative",
                              maxWidth: hasMedia ? "80%" : "75%",
                              padding: "10px 14px",
                              borderRadius: isMine
                                ? "16px 16px 4px 16px"
                                : "16px 16px 16px 4px",
                              background: isDeleted
                                ? "#30303d"
                                : isMine
                                  ? "#6c5ce7"
                                  : "#242438",
                              color: "#fff",
                              wordBreak: "break-word",
                              fontStyle: isDeleted ? "italic" : "normal",
                              opacity: isDeleted ? 0.7 : 1,
                            }}
                          >
                            {isDeleted ? (
                              <div
                                style={{
                                  fontSize: "13px",
                                  opacity: 0.8,
                                }}
                              >
                                This message was deleted
                              </div>
                            ) : (
                              <>
                                {hasMedia && renderMediaMessage(message)}

                                {!hasMedia && message.content && (
                                  <div
                                    style={{
                                      fontSize: "14px",
                                      lineHeight: "1.4",
                                    }}
                                  >
                                    {message.content}
                                  </div>
                                )}

                                {hasMedia &&
                                  isDocumentMessage(message) === false &&
                                  message.file_name && (
                                    <div
                                      style={{
                                        fontSize: "11px",
                                        opacity: 0.65,
                                        marginTop: "4px",
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                      }}
                                    >
                                      {message.file_name}
                                    </div>
                                  )}
                              </>
                            )}

                            <div
                              style={{
                                fontSize: "10px",
                                opacity: 0.65,
                                marginTop: "5px",
                                textAlign: "right",
                              }}
                            >
                              {new Date(message.created_at).toLocaleTimeString(
                                [],
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                },
                              )}
                            </div>

                            <details
                              style={{
                                position: "absolute",
                                top: "5px",
                                right: "5px",
                                zIndex: 10,
                              }}
                            >
                              <summary
                                style={{
                                  cursor: "pointer",
                                  listStyle: "none",
                                  fontSize: "15px",
                                  opacity: 0.7,
                                  userSelect: "none",
                                }}
                                title="Message options"
                              >
                                ⋮
                              </summary>

                              <div
                                style={{
                                  position: "absolute",
                                  right: "0",
                                  top: "22px",
                                  minWidth: "155px",
                                  background: "#171725",
                                  border: "1px solid rgba(255,255,255,0.12)",
                                  borderRadius: "10px",
                                  padding: "5px",
                                  boxShadow: "0 8px 25px rgba(0,0,0,0.35)",
                                }}
                              >
                                <button
                                  type="button"
                                  onClick={() => deleteMessageForMe(message.id)}
                                  style={{
                                    width: "100%",
                                    border: "none",
                                    background: "transparent",
                                    color: "#fff",
                                    padding: "9px 10px",
                                    textAlign: "left",
                                    cursor: "pointer",
                                    borderRadius: "7px",
                                    fontSize: "13px",
                                  }}
                                >
                                  Delete for me
                                </button>

                                {isMine && !isDeleted && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      deleteMessageForEveryone(message.id)
                                    }
                                    style={{
                                      width: "100%",
                                      border: "none",
                                      background: "transparent",
                                      color: "#ff6b6b",
                                      padding: "9px 10px",
                                      textAlign: "left",
                                      cursor: "pointer",
                                      borderRadius: "7px",
                                      fontSize: "13px",
                                    }}
                                  >
                                    Delete for everyone
                                  </button>
                                )}
                              </div>
                            </details>
                          </div>
                        </div>
                      );
                    })
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {messageError && <p className="form-error">{messageError}</p>}

                {/* ========================================
                    MESSAGE INPUT
                ======================================== */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    width: "100%",
                  }}
                >
                  {/* HIDDEN FILE INPUT */}
                  <input
                    type="file"
                    id="fileInput"
                    multiple
                    accept="image/*,video/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip"
                    style={{
                      display: "none",
                    }}
                    onChange={handleFileSelect}
                  />

                  {/* SELECTED FILE PREVIEW */}
                  {selectedFiles.length > 0 && (
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        padding: "10px",
                        border: "1px solid rgba(108,92,231,0.35)",
                        borderRadius: "14px",
                        background:
                          "linear-gradient(135deg, rgba(108,92,231,0.12), rgba(0,0,0,0.25))",
                        maxHeight: "180px",
                        overflowY: "auto",
                        flexWrap: "wrap",
                      }}
                    >
                      {selectedFiles.map((file, index) => (
                        <div
                          key={`${file.name}-${index}`}
                          style={{
                            position: "relative",
                            width: "90px",
                            minHeight: "75px",
                            padding: "8px",
                            borderRadius: "10px",
                            background: "rgba(255,255,255,0.07)",
                            border: "1px solid rgba(255,255,255,0.1)",
                            boxSizing: "border-box",
                          }}
                        >
                          {file.type.startsWith("image/") ? (
                            <img
                              src={URL.createObjectURL(file)}
                              alt={file.name}
                              style={{
                                width: "100%",
                                height: "55px",
                                objectFit: "cover",
                                borderRadius: "7px",
                              }}
                            />
                          ) : file.type.startsWith("video/") ? (
                            <video
                              src={URL.createObjectURL(file)}
                              style={{
                                width: "100%",
                                height: "55px",
                                objectFit: "cover",
                                borderRadius: "7px",
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                height: "55px",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "26px",
                              }}
                            >
                              📄
                            </div>
                          )}

                          <div
                            style={{
                              fontSize: "9px",
                              marginTop: "3px",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              whiteSpace: "nowrap",
                              opacity: 0.75,
                            }}
                          >
                            {file.name}
                          </div>

                          <button
                            type="button"
                            onClick={() => removeSelectedFile(index)}
                            style={{
                              position: "absolute",
                              top: "-6px",
                              right: "-6px",
                              width: "21px",
                              height: "21px",
                              border: "none",
                              borderRadius: "50%",
                              background: "#ff4757",
                              color: "#fff",
                              cursor: "pointer",
                              fontSize: "12px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* MESSAGE CONTROLS */}
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      width: "100%",
                    }}
                  >
                    {/* ATTACHMENT BUTTON */}

                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() =>
                        document.getElementById("fileInput").click()
                      }
                      title="Attach photos, videos or documents"
                      style={{
                        width: "45px",
                        height: "42px",
                        margin: 0,
                        cursor: uploading ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "1px solid rgba(255,255,255,0.12)",
                        borderRadius: "11px",
                        background:
                          "linear-gradient(135deg, #6c5ce7 0%, #8e44ad 50%, #24143f 100%)",
                        color: "#ffffff",
                        boxShadow:
                          "0 6px 18px rgba(108,92,231,0.35), inset 0 1px 0 rgba(255,255,255,0.18)",
                        transition: "all 0.2s ease",
                        opacity: uploading ? 0.5 : 1,
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                      </svg>
                    </button>

                    {/* VOICE RECORDING / VOICE PREVIEW */}

                    {isRecording && (
                      <span
                        style={{
                          minWidth: "55px",
                          height: "42px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "13px",
                          fontWeight: "600",
                          color: "#e74c3c",
                        }}
                      >
                        {String(Math.floor(recordingSeconds / 60)).padStart(
                          2,
                          "0",
                        )}
                        :{String(recordingSeconds % 60).padStart(2, "0")}
                      </span>
                    )}

                    {/* VOICE PREVIEW */}
                    {!isRecording && recordedAudio && (
                      <>
                        <audio
                          controls
                          src={recordedAudioUrl}
                          style={{
                            width: "220px",
                            height: "42px",
                          }}
                        />

                        {/* CANCEL VOICE */}
                        <button
                          type="button"
                          onClick={() => {
                            if (recordedAudioUrl) {
                              URL.revokeObjectURL(recordedAudioUrl);
                            }

                            setRecordedAudio(null);
                            setRecordedAudioUrl("");
                            setRecordingSeconds(0);
                          }}
                          disabled={uploading}
                          title="Cancel voice message"
                          style={{
                            width: "42px",
                            height: "42px",
                            margin: 0,
                            cursor: uploading ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "11px",
                            background: "#555",
                            color: "#ffffff",
                            fontSize: "18px",
                            opacity: uploading ? 0.5 : 1,
                          }}
                        >
                          ✕
                        </button>

                        {/* SEND VOICE */}
                        <button
                          type="button"
                          onClick={async () => {
                            if (!recordedAudio) {
                              return;
                            }

                            await sendVoiceMessage(recordedAudio);

                            if (recordedAudioUrl) {
                              URL.revokeObjectURL(recordedAudioUrl);
                            }

                            setRecordedAudio(null);
                            setRecordedAudioUrl("");
                            setRecordingSeconds(0);
                          }}
                          disabled={uploading}
                          title="Send voice message"
                          style={{
                            width: "45px",
                            height: "42px",
                            margin: 0,
                            cursor: uploading ? "not-allowed" : "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: "11px",
                            background:
                              "linear-gradient(135deg, #2ecc71 0%, #27ae60 100%)",
                            color: "#ffffff",
                            fontSize: "18px",
                            fontWeight: "700",
                            boxShadow: "0 6px 18px rgba(46,204,113,0.30)",
                            opacity: uploading ? 0.5 : 1,
                          }}
                        >
                          ➤
                        </button>
                      </>
                    )}

                    {/* RECORD / STOP BUTTON */}
                    {!recordedAudio && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isRecording) {
                            stopVoiceRecording();
                          } else {
                            startVoiceRecording();
                          }
                        }}
                        disabled={!conversation || uploading}
                        title={
                          isRecording
                            ? "Stop recording"
                            : "Record voice message"
                        }
                        style={{
                          width: "45px",
                          height: "42px",
                          margin: 0,
                          cursor:
                            !conversation || uploading
                              ? "not-allowed"
                              : "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: "11px",
                          background: isRecording
                            ? "#e74c3c"
                            : "linear-gradient(135deg, #6c5ce7 0%, #8e44ad 50%, #24143f 100%)",
                          color: "#ffffff",
                          fontSize: "18px",
                          boxShadow: "0 6px 18px rgba(108,92,231,0.35)",
                          transition: "all 0.2s ease",
                          opacity: !conversation || uploading ? 0.5 : 1,
                        }}
                      >
                        {isRecording ? "■" : "🎤"}
                      </button>
                    )}

                    {/* MESSAGE INPUT */}
                    <input
                      type="text"
                      placeholder={
                        uploading ? "Uploading..." : "Type a message..."
                      }
                      value={messageText}
                      disabled={uploading}
                      onChange={(e) => {
                        setMessageText(e.target.value);
                        setMessageError("");
                      }}
                      onKeyDown={handleMessageKeyDown}
                      style={{
                        flex: 1,
                        margin: 0,
                      }}
                    />

                    {/* SEND BUTTON */}
                    <button
                      className="register-button"
                      onClick={sendMessage}
                      disabled={uploading}
                      style={{
                        width: "90px",
                        margin: 0,
                        opacity: uploading ? 0.6 : 1,
                      }}
                    >
                      {uploading ? "..." : "SEND"}
                    </button>
                  </div>
                </div>

                {/* NAVIGATION */}
                <button
                  className="register-button"
                  onClick={() => {
                    setConversation(null);
                    setMessages([]);
                    setMessageText("");
                    setSelectedFiles([]);
                    setViewer(null);
                  }}
                  style={{
                    marginTop: "10px",
                  }}
                >
                  BACK TO USER SEARCH
                </button>

                <button
                  className="register-button"
                  onClick={openHome}
                  style={{
                    marginTop: "10px",
                  }}
                >
                  BACK TO HOME
                </button>
              </>
            )}
          </>
        )}

        {/* ========================================
            MEDIA VIEWER
        ======================================== */}
        {viewer && (
          <div
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                closeMediaViewer();
              }
            }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 9999,
              background: "rgba(0,0,0,0.92)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              boxSizing: "border-box",
              backdropFilter: "blur(8px)",
            }}
          >
            {/* CLOSE */}
            <button
              type="button"
              onClick={closeMediaViewer}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                width: "42px",
                height: "42px",
                border: "1px solid rgba(255,255,255,0.2)",
                borderRadius: "50%",
                background: "rgba(255,255,255,0.08)",
                color: "#fff",
                fontSize: "24px",
                cursor: "pointer",
                zIndex: 10001,
              }}
            >
              ×
            </button>

            {/* IMAGE VIEWER */}
            {viewer.type === "image" && (
              <img
                src={viewer.url}
                alt={viewer.name}
                style={{
                  maxWidth: "95vw",
                  maxHeight: "90vh",
                  objectFit: "contain",
                  borderRadius: "14px",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                }}
              />
            )}

            {/* VIDEO VIEWER */}
            {viewer.type === "video" && (
              <video
                src={viewer.url}
                controls
                autoPlay
                playsInline
                style={{
                  maxWidth: "95vw",
                  maxHeight: "90vh",
                  borderRadius: "14px",
                  background: "#000",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                }}
              />
            )}

            {/* PDF VIEWER */}
            {viewer.type === "pdf" && (
              <div
                style={{
                  width: "90vw",
                  height: "88vh",
                  background: "#fff",
                  borderRadius: "14px",
                  overflow: "hidden",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                }}
              >
                <iframe
                  src={viewer.url}
                  title={viewer.name}
                  style={{
                    width: "100%",
                    height: "100%",
                    border: "none",
                  }}
                />
              </div>
            )}

            {/* OTHER DOCUMENT */}
            {viewer.type === "document" && (
              <div
                style={{
                  width: "min(420px, 90vw)",
                  padding: "28px",
                  borderRadius: "18px",
                  background: "linear-gradient(145deg, #171323, #0a0910)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontSize: "52px",
                    marginBottom: "15px",
                  }}
                >
                  📄
                </div>

                <h3
                  style={{
                    color: "#fff",
                    margin: "0 0 8px",
                    wordBreak: "break-word",
                  }}
                >
                  {viewer.name}
                </h3>

                <p
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "13px",
                  }}
                >
                  This document cannot be previewed directly in the browser.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    window.open(viewer.url, "_blank", "noopener,noreferrer")
                  }
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "none",
                    borderRadius: "10px",
                    background: "linear-gradient(135deg, #6c5ce7, #8e44ad)",
                    color: "#fff",
                    fontWeight: "700",
                    cursor: "pointer",
                  }}
                >
                  OPEN DOCUMENT
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
