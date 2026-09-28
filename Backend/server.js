const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const { Pool } = require("pg");
const bcrypt = require("bcrypt");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

// ========================================
// FILE UPLOAD SETUP
// ========================================

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, {
    recursive: true,
  });
}

app.use("/uploads", express.static(uploadDir));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);

    const uniqueName = `${Date.now()}-${Math.round(
      Math.random() * 1e9,
    )}${extension}`;

    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 100 * 1024 * 1024,
  },
});

// ========================================
// HTTP SERVER + SOCKET.IO
// ========================================

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});

// ========================================
// ONLINE USERS
// ========================================

const onlineUsers = new Map();

// ========================================
// POSTGRESQL CONNECTION - NEON
// ========================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl: {
    rejectUnauthorized: false,
  },
});

// ========================================
// TEST DATABASE CONNECTION
// ========================================

pool.query("SELECT NOW()", (error) => {
  if (error) {
    console.error(
      "❌ Database connection failed:",
      error.message,
    );
  } else {
    console.log(
      "✅ PostgreSQL connected successfully!",
    );
  }
});

// ========================================
// HOME ROUTE
// ========================================

app.get("/", (req, res) => {
  res.json({
    message: "NEXORA Backend is running",
  });
});

// ========================================
// REGISTRATION OTP STORAGE
// ========================================

const pendingRegistrations = new Map();

// ========================================
// REGISTER USER
// ========================================

app.post("/api/register", async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({
        message:
          "Mobile number and password are required.",
      });
    }

    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({
        message:
          "Mobile number must be 10 digits.",
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        message:
          "Password must contain at least 8 characters.",
      });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE mobile = $1",
      [mobile],
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({
        message:
          "An account with this mobile number already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(
      password,
      12,
    );

    const otp = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    const registrationToken =
      require("crypto").randomUUID();

    const expiresAt =
      Date.now() + 5 * 60 * 1000;

    pendingRegistrations.set(
      registrationToken,
      {
        mobile,
        passwordHash,
        otp,
        expiresAt,
        attempts: 0,
      },
    );

    console.log(
      "🔐 NEXORA OTP:",
      otp,
    );

    console.log(
      "📱 Mobile:",
      mobile,
    );

    res.status(200).json({
      message:
        "OTP generated successfully.",
      registrationToken,
      otp,
      expiresAt,
    });
  } catch (error) {
    console.error(
      "Registration error:",
      error.message,
    );

    res.status(500).json({
      message:
        "Something went wrong while starting registration.",
    });
  }
});

// ========================================
// VERIFY REGISTRATION OTP
// ========================================

app.post("/api/verify-otp", async (req, res) => {
  try {
    const {
      registrationToken,
      otp,
    } = req.body;

    if (!registrationToken || !otp) {
      return res.status(400).json({
        message:
          "Registration token and OTP are required.",
      });
    }

    const registration =
      pendingRegistrations.get(
        registrationToken,
      );

    if (!registration) {
      return res.status(400).json({
        message:
          "Registration session expired. Please register again.",
      });
    }

    if (
      Date.now() >
      registration.expiresAt
    ) {
      pendingRegistrations.delete(
        registrationToken,
      );

      return res.status(400).json({
        message:
          "OTP has expired. Please register again.",
      });
    }

    if (registration.attempts >= 5) {
      pendingRegistrations.delete(
        registrationToken,
      );

      return res.status(429).json({
        message:
          "Too many incorrect attempts. Please register again.",
      });
    }

    if (otp !== registration.otp) {
      registration.attempts += 1;

      return res.status(400).json({
        message: `Invalid OTP. ${
          5 - registration.attempts
        } attempts remaining.`,
      });
    }

    const existingUser = await pool.query(
      "SELECT id FROM users WHERE mobile = $1",
      [registration.mobile],
    );

    if (existingUser.rows.length > 0) {
      pendingRegistrations.delete(
        registrationToken,
      );

      return res.status(409).json({
        message:
          "An account with this mobile number already exists.",
      });
    }

    const result = await pool.query(
      `INSERT INTO users
       (mobile, password_hash)
       VALUES ($1, $2)
       RETURNING id, mobile, created_at`,
      [
        registration.mobile,
        registration.passwordHash,
      ],
    );

    console.log(
      "👤 Verified and registered user:",
      result.rows[0],
    );

    pendingRegistrations.delete(
      registrationToken,
    );

    res.status(201).json({
      message:
        "NEXORA account created successfully.",
      user: result.rows[0],
    });
  } catch (error) {
    console.error(
      "OTP verification error:",
      error.message,
    );

    res.status(500).json({
      message:
        "Something went wrong while verifying OTP.",
    });
  }
});

// ========================================
// RESEND REGISTRATION OTP
// ========================================

app.post("/api/resend-otp", async (req, res) => {
  try {
    const {
      registrationToken,
    } = req.body;

    if (!registrationToken) {
      return res.status(400).json({
        message:
          "Registration token is required.",
      });
    }

    const registration =
      pendingRegistrations.get(
        registrationToken,
      );

    if (!registration) {
      return res.status(400).json({
        message:
          "Registration session expired. Please register again.",
      });
    }

    const newOtp = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    const newExpiresAt =
      Date.now() + 5 * 60 * 1000;

    registration.otp = newOtp;
    registration.expiresAt =
      newExpiresAt;
    registration.attempts = 0;

    console.log(
      "🔄 New NEXORA OTP:",
      newOtp,
    );

    console.log(
      "📱 Mobile:",
      registration.mobile,
    );

    res.status(200).json({
      message:
        "New OTP generated successfully.",
      otp: newOtp,
      expiresAt: newExpiresAt,
    });
  } catch (error) {
    console.error(
      "Resend OTP error:",
      error.message,
    );

    res.status(500).json({
      message:
        "Something went wrong while generating a new OTP.",
    });
  }
});

// ========================================
// LOGIN USER
// ========================================

app.post("/api/login", async (req, res) => {
  try {
    const {
      mobile,
      password,
    } = req.body;

    console.log(
      "🔐 Login request:",
      {
        mobile,
      },
    );

    if (!mobile || !password) {
      return res.status(400).json({
        message:
          "Mobile number and password are required.",
      });
    }

    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({
        message:
          "Mobile number must be 10 digits.",
      });
    }

    const userResult = await pool.query(
      `SELECT
        id,
        mobile,
        password_hash,
        created_at
       FROM users
       WHERE mobile = $1`,
      [mobile],
    );

    if (userResult.rows.length === 0) {
      return res.status(401).json({
        message:
          "Invalid mobile number or password.",
      });
    }

    const user =
      userResult.rows[0];

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password_hash,
      );

    if (!passwordMatch) {
      return res.status(401).json({
        message:
          "Invalid mobile number or password.",
      });
    }

    const profileResult =
      await pool.query(
        `SELECT id
         FROM profiles
         WHERE user_id = $1`,
        [user.id],
      );

    const profileCompleted =
      profileResult.rows.length > 0;

    console.log(
      "✅ Login successful:",
      user.mobile,
    );

    res.status(200).json({
      message:
        "Login successful.",

      user: {
        id: user.id,
        mobile: user.mobile,
        created_at:
          user.created_at,
      },

      profileCompleted,
    });
  } catch (error) {
    console.error(
      "Login error:",
      error.message,
    );

    res.status(500).json({
      message:
        "Something went wrong while logging in.",
    });
  }
});

















// ========================================
// FORGOT PASSWORD OTP SYSTEM
// ========================================

const pendingPasswordResets =
  new Map();

// ========================================
// SEND FORGOT PASSWORD OTP
// ========================================

app.post(
  "/api/forgot-password/send-otp",
  async (req, res) => {
    try {
      const { mobile } =
        req.body;

      if (!mobile) {
        return res.status(400).json({
          message:
            "Mobile number is required.",
        });
      }

      if (!/^\d{10}$/.test(mobile)) {
        return res.status(400).json({
          message:
            "Mobile number must be 10 digits.",
        });
      }

      const userResult =
        await pool.query(
          "SELECT id FROM users WHERE mobile = $1",
          [mobile],
        );

      if (
        userResult.rows.length === 0
      ) {
        return res.status(404).json({
          message:
            "No account found with this mobile number.",
        });
      }

      const existingReset =
        pendingPasswordResets.get(
          mobile,
        );

      if (
        existingReset &&
        Date.now() <
          existingReset.resendAvailableAt
      ) {
        const remainingSeconds =
          Math.ceil(
            (existingReset.resendAvailableAt -
              Date.now()) /
              1000,
          );

        return res.status(429).json({
          message: `Please wait ${remainingSeconds} seconds before requesting another OTP.`,
          remainingSeconds,
        });
      }

      const otp = Math.floor(
        100000 +
          Math.random() * 900000,
      ).toString();

      const expiresAt =
        Date.now() + 5 * 60 * 1000;

      const resendAvailableAt =
        Date.now() + 60 * 1000;

      pendingPasswordResets.set(
        mobile,
        {
          otp,
          expiresAt,
          resendAvailableAt,
          attempts: 0,
          verified: false,
        },
      );

      console.log(
        "🔐 NEXORA Forgot Password OTP:",
        otp,
      );

      console.log(
        "📱 Mobile:",
        mobile,
      );

      res.status(200).json({
        message:
          "OTP generated successfully.",
        expiresAt,
        resendAvailableAt,

        // DEVELOPMENT ONLY
        otp,
      });
    } catch (error) {
      console.error(
        "Forgot password OTP error:",
        error.message,
      );

      res.status(500).json({
        message:
          "Something went wrong while sending OTP.",
      });
    }
  },
);

// ========================================
// VERIFY FORGOT PASSWORD OTP
// ========================================

app.post(
  "/api/forgot-password/verify-otp",
  async (req, res) => {
    try {
      const {
        mobile,
        otp,
      } = req.body;

      if (!mobile || !otp) {
        return res.status(400).json({
          message:
            "Mobile number and OTP are required.",
        });
      }

      if (!/^\d{10}$/.test(mobile)) {
        return res.status(400).json({
          message:
            "Mobile number must be 10 digits.",
        });
      }

      if (!/^\d{6}$/.test(otp)) {
        return res.status(400).json({
          message:
            "OTP must be 6 digits.",
        });
      }

      const resetData =
        pendingPasswordResets.get(
          mobile,
        );

      if (!resetData) {
        return res.status(400).json({
          message:
            "OTP session expired. Please request a new OTP.",
        });
      }

      if (
        Date.now() >
        resetData.expiresAt
      ) {
        pendingPasswordResets.delete(
          mobile,
        );

        return res.status(400).json({
          message:
            "OTP has expired. Please request a new OTP.",
        });
      }

      if (resetData.attempts >= 5) {
        pendingPasswordResets.delete(
          mobile,
        );

        return res.status(429).json({
          message:
            "Too many incorrect attempts. Please request a new OTP.",
        });
      }

      if (otp !== resetData.otp) {
        resetData.attempts += 1;

        return res.status(400).json({
          message: `Invalid OTP. ${
            5 - resetData.attempts
          } attempts remaining.`,
        });
      }

      resetData.verified = true;

      pendingPasswordResets.set(
        mobile,
        resetData,
      );

      console.log(
        "✅ Forgot Password OTP verified:",
        mobile,
      );

      res.status(200).json({
        message:
          "OTP verified successfully.",
      });
    } catch (error) {
      console.error(
        "Forgot password OTP verification error:",
        error.message,
      );

      res.status(500).json({
        message:
          "Something went wrong while verifying OTP.",
      });
    }
  },
);

// ========================================
// RESET PASSWORD
// ========================================

app.post(
  "/api/reset-password",
  async (req, res) => {
    try {
      const {
        mobile,
        newPassword,
      } = req.body;

      if (!mobile || !newPassword) {
        return res.status(400).json({
          message:
            "Mobile number and new password are required.",
        });
      }

      if (!/^\d{10}$/.test(mobile)) {
        return res.status(400).json({
          message:
            "Mobile number must be 10 digits.",
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          message:
            "Password must contain at least 8 characters.",
        });
      }

      const userResult =
        await pool.query(
          "SELECT id FROM users WHERE mobile = $1",
          [mobile],
        );

      if (
        userResult.rows.length === 0
      ) {
        return res.status(404).json({
          message:
            "No account found with this mobile number.",
        });
      }

      const passwordHash =
        await bcrypt.hash(
          newPassword,
          12,
        );

      await pool.query(
        `UPDATE users
         SET password_hash = $1
         WHERE mobile = $2`,
        [
          passwordHash,
          mobile,
        ],
      );

      console.log(
        "🔑 Password reset successful:",
        mobile,
      );

      res.status(200).json({
        message:
          "Password reset successfully.",
      });
    } catch (error) {
      console.error(
        "Password reset error:",
        error.message,
      );

      res.status(500).json({
        message:
          "Something went wrong while resetting the password.",
      });
    }
  },
);
// ========================================
// SAVE / UPDATE PROFILE
// ========================================

app.post(
  "/api/profile",
  upload.single("profilePhoto"),
  async (req, res) => {
    try {
      const {
        userId,
        name,
        bestFriend,
        bio,
        partner,
      } = req.body;

      // ========================================
      // VALIDATE REQUIRED FIELDS
      // ========================================

      if (!userId || !name || !bestFriend || !bio) {
        return res.status(400).json({
          message:
            "User ID, name, best friend and bio are required.",
        });
      }

      // ========================================
      // CHECK USER
      // ========================================

      const userResult = await pool.query(
        "SELECT id FROM users WHERE id = $1",
        [userId],
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({
          message: "User not found.",
        });
      }

      // ========================================
      // CHECK EXISTING PROFILE
      // ========================================

      const existingProfile = await pool.query(
        `SELECT
           id,
           profile_photo
         FROM profiles
         WHERE user_id = $1
         LIMIT 1`,
        [userId],
      );

      let result;

      // ========================================
      // NEW PROFILE PHOTO
      // ========================================

      let newProfilePhoto = null;

      if (req.file) {
        newProfilePhoto = `/uploads/${req.file.filename}`;
      }

      // ========================================
      // UPDATE EXISTING PROFILE
      // ========================================

      if (existingProfile.rows.length > 0) {
        const oldProfilePhoto =
          existingProfile.rows[0].profile_photo;

        // Keep old photo if user did not select a new one
        const finalProfilePhoto =
          newProfilePhoto || oldProfilePhoto;

        result = await pool.query(
          `UPDATE profiles
           SET
             name = $1,
             best_friend = $2,
             bio = $3,
             partner = $4,
             profile_photo = $5,
             updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $6
           RETURNING *`,
          [
            name.trim(),
            bestFriend.trim(),
            bio.trim(),
            partner ? partner.trim() : null,
            finalProfilePhoto,
            userId,
          ],
        );
      }

      // ========================================
      // CREATE NEW PROFILE
      // ========================================

      else {
        // Photo is required only when creating
        // the profile for the first time.

        if (!req.file) {
          return res.status(400).json({
            message: "Profile photo is required.",
          });
        }

        result = await pool.query(
          `INSERT INTO profiles
           (
             user_id,
             name,
             best_friend,
             bio,
             partner,
             profile_photo
           )
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [
            userId,
            name.trim(),
            bestFriend.trim(),
            bio.trim(),
            partner ? partner.trim() : null,
            newProfilePhoto,
          ],
        );
      }

      // ========================================
      // SUCCESS
      // ========================================

      console.log(
        "💾 Profile saved:",
        result.rows[0],
      );

      return res.status(200).json({
        message: "Profile saved successfully.",
        profile: result.rows[0],
      });
    } catch (error) {
      console.error(
        "Profile save error:",
        error.message,
      );

      return res.status(500).json({
        message:
          "Something went wrong while saving the profile.",
      });
    }
  },
);


// ========================================
// GET PROFILE
// ========================================

app.get(
  "/api/profile/:userId",
  async (req, res) => {
    try {
      const { userId } = req.params;

      // ========================================
      // GET PROFILE + USER MOBILE
      // ========================================

      const result = await pool.query(
        `SELECT
           p.id,
           p.user_id,
           p.name,
           p.best_friend,
           p.bio,
           p.partner,
           p.profile_photo,
           p.created_at,
           p.updated_at,
           u.mobile
         FROM profiles p
         JOIN users u
           ON u.id = p.user_id
         WHERE p.user_id = $1`,
        [userId],
      );

      // ========================================
      // PROFILE NOT FOUND
      // ========================================

      if (result.rows.length === 0) {
        return res.status(404).json({
          message: "Profile not found.",
        });
      }

      // ========================================
      // RETURN PROFILE
      // ========================================

      return res.status(200).json({
        profile: result.rows[0],
      });
    } catch (error) {
      console.error(
        "Profile fetch error:",
        error.message,
      );

      return res.status(500).json({
        message:
          "Something went wrong while loading the profile.",
      });
    }
  },
);

// ========================================
// SEARCH USER BY MOBILE
// ========================================

app.get(
  "/api/users/search/:mobile",
  async (req, res) => {
    try {
      const {
        mobile,
      } = req.params;

      if (!/^\d{10}$/.test(mobile)) {
        return res.status(400).json({
          message:
            "Mobile number must be 10 digits.",
        });
      }

      const result =
        await pool.query(
          `SELECT
            u.id,
            u.mobile,
            p.name,
            p.bio,
            p.profile_photo
           FROM users u
           LEFT JOIN profiles p
             ON p.user_id = u.id
           WHERE u.mobile = $1`,
          [mobile],
        );

      if (
        result.rows.length === 0
      ) {
        return res.status(404).json({
          message:
            "NEXORA user not found.",
        });
      }

      res.status(200).json({
        user:
          result.rows[0],
      });
    } catch (error) {
      console.error(
        "User search error:",
        error.message,
      );

      res.status(500).json({
        message:
          "Something went wrong while searching for the user.",
      });
    }
  },
);

// ========================================
// CREATE OR GET CONVERSATION
// ========================================

app.post(
  "/api/conversations",
  async (req, res) => {
    try {
      const {
        userId,
        otherUserId,
      } = req.body;

      if (!userId || !otherUserId) {
        return res.status(400).json({
          message:
            "Both user IDs are required.",
        });
      }

      if (
        Number(userId) ===
        Number(otherUserId)
      ) {
        return res.status(400).json({
          message:
            "You cannot create a chat with yourself.",
        });
      }

      const usersResult =
        await pool.query(
          `SELECT id
           FROM users
           WHERE id IN ($1, $2)`,
          [
            userId,
            otherUserId,
          ],
        );

      if (
        usersResult.rows.length !== 2
      ) {
        return res.status(404).json({
          message:
            "One or both users were not found.",
        });
      }

      const userOne =
        Math.min(
          Number(userId),
          Number(otherUserId),
        );

      const userTwo =
        Math.max(
          Number(userId),
          Number(otherUserId),
        );

      let conversationResult =
        await pool.query(
          `SELECT
            id,
            user_one_id,
            user_two_id,
            created_at
           FROM conversations
           WHERE user_one_id = $1
           AND user_two_id = $2`,
          [
            userOne,
            userTwo,
          ],
        );

      if (
        conversationResult.rows.length ===
        0
      ) {
        conversationResult =
          await pool.query(
            `INSERT INTO conversations
               (user_one_id, user_two_id)
             VALUES ($1, $2)
             RETURNING
               id,
               user_one_id,
               user_two_id,
               created_at`,
            [
              userOne,
              userTwo,
            ],
          );
      }

      res.status(200).json({
        message:
          "Conversation ready.",

        conversation:
          conversationResult.rows[0],
      });
    } catch (error) {
      console.error(
        "Conversation error:",
        error.message,
      );

      res.status(500).json({
        message:
          "Something went wrong while creating the conversation.",
      });
    }
  },
);

// ========================================
// SEND TEXT MESSAGE
// ========================================

app.post(
  "/api/messages",
  async (req, res) => {
    try {
      const {
        conversationId,
        senderId,
        content,
      } = req.body;

      console.log(
        "📨 Message request:",
        {
          conversationId,
          senderId,
          content,
        },
      );

      if (
        !conversationId ||
        !senderId ||
        !content
      ) {
        return res.status(400).json({
          message:
            "Conversation ID, sender ID and message are required.",
        });
      }

      const messageText =
        content.trim();

      if (!messageText) {
        return res.status(400).json({
          message:
            "Message cannot be empty.",
        });
      }

      const conversationResult =
        await pool.query(
          `SELECT
            user_one_id,
            user_two_id
           FROM conversations
           WHERE id = $1`,
          [conversationId],
        );

      if (
        conversationResult.rows.length ===
        0
      ) {
        return res.status(404).json({
          message:
            "Conversation not found.",
        });
      }

      const conversation =
        conversationResult.rows[0];

      const isMember =
        Number(
          conversation.user_one_id,
        ) === Number(senderId) ||
        Number(
          conversation.user_two_id,
        ) === Number(senderId);

      if (!isMember) {
        return res.status(403).json({
          message:
            "You are not a member of this conversation.",
        });
      }

      const result =
        await pool.query(
          `INSERT INTO messages
           (
             conversation_id,
             sender_id,
             message_type,
             content
           )
           VALUES ($1, $2, 'text', $3)
           RETURNING *`,
          [
            conversationId,
            senderId,
            messageText,
          ],
        );

      const newMessage =
        result.rows[0];

      console.log(
        "💾 Message saved:",
        newMessage,
      );

      const roomName =
        `conversation_${conversationId}`;

      io.to(roomName).emit(
        "new_message",
        newMessage,
      );

      res.status(201).json({
        message:
          "Message sent successfully.",
        data:
          newMessage,
      });
    } catch (error) {
      console.error(
        "Send message error:",
        error.message,
      );

      res.status(500).json({
        message:
          "Something went wrong while sending the message.",
      });
    }
  },
);

// ========================================
// SEND PHOTO / VIDEO / DOCUMENT / AUDIO
// ========================================

app.post(
  "/api/messages/upload",
  upload.single("file"),
  async (req, res) => {
    try {
      const {
        conversationId,
        senderId,
      } = req.body;

      if (
        !conversationId ||
        !senderId ||
        !req.file
      ) {
        return res.status(400).json({
          message:
            "Conversation ID, sender ID and file are required.",
        });
      }

      const conversationResult =
        await pool.query(
          `SELECT
            user_one_id,
            user_two_id
           FROM conversations
           WHERE id = $1`,
          [conversationId],
        );

      if (
        conversationResult.rows.length ===
        0
      ) {
        return res.status(404).json({
          message:
            "Conversation not found.",
        });
      }

      const conversation =
        conversationResult.rows[0];

      const isMember =
        Number(
          conversation.user_one_id,
        ) === Number(senderId) ||
        Number(
          conversation.user_two_id,
        ) === Number(senderId);

      if (!isMember) {
        return res.status(403).json({
          message:
            "You are not a member of this conversation.",
        });
      }

      let messageType =
        "document";

      if (
        req.file.mimetype.startsWith(
          "image/",
        )
      ) {
        messageType =
          "image";
      } else if (
        req.file.mimetype.startsWith(
          "video/",
        )
      ) {
        messageType =
          "video";
      } else if (
        req.file.mimetype.startsWith(
          "audio/",
        )
      ) {
        messageType =
          "audio";
      }

      const fileUrl =
        `/uploads/${req.file.filename}`;

      const result =
        await pool.query(
          `INSERT INTO messages
           (
             conversation_id,
             sender_id,
             message_type,
             content,
             file_url,
             file_name,
             file_size,
             mime_type
           )
           VALUES
           ($1, $2, $3, $4, $5, $6, $7, $8)
           RETURNING *`,
          [
            conversationId,
            senderId,
            messageType,
            req.file.originalname,
            fileUrl,
            req.file.originalname,
            req.file.size,
            req.file.mimetype,
          ],
        );

      const newMessage =
        result.rows[0];

      console.log(
        "📎 Media message saved:",
        newMessage,
      );

      const roomName =
        `conversation_${conversationId}`;

      io.to(roomName).emit(
        "new_message",
        newMessage,
      );

      res.status(201).json({
        message:
          "File sent successfully.",
        data:
          newMessage,
      });
    } catch (error) {
      console.error(
        "File upload error:",
        error.message,
      );

      res.status(500).json({
        message:
          "Something went wrong while sending the file.",
      });
    }
  },
);

// ========================================
// DELETE MESSAGE FOR ME
// ========================================

app.delete(
  "/api/messages/:messageId/for-me",
  async (req, res) => {
    try {
      const {
        messageId,
      } = req.params;

      const {
        userId,
      } = req.body;

      if (!messageId || !userId) {
        return res.status(400).json({
          message:
            "Message ID and user ID are required.",
        });
      }

      const messageResult =
        await pool.query(
          `SELECT
            m.id,
            m.conversation_id,
            m.sender_id,
            c.user_one_id,
            c.user_two_id
           FROM messages m
           JOIN conversations c
             ON c.id = m.conversation_id
           WHERE m.id = $1`,
          [messageId],
        );

      if (
        messageResult.rows.length ===
        0
      ) {
        return res.status(404).json({
          message:
            "Message not found.",
        });
      }

      const message =
        messageResult.rows[0];

      const isUserOne =
        Number(
          message.user_one_id,
        ) === Number(userId);

      const isUserTwo =
        Number(
          message.user_two_id,
        ) === Number(userId);

      if (!isUserOne && !isUserTwo) {
        return res.status(403).json({
          message:
            "You are not a member of this conversation.",
        });
      }

      let result;

      if (
        Number(message.sender_id) ===
        Number(userId)
      ) {
        result =
          await pool.query(
            `UPDATE messages
             SET
               deleted_for_sender = TRUE,
               deleted_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [messageId],
          );
      } else {
        result =
          await pool.query(
            `UPDATE messages
             SET
               deleted_for_receiver = TRUE,
               deleted_at = CURRENT_TIMESTAMP
             WHERE id = $1
             RETURNING *`,
            [messageId],
          );
      }

      const updatedMessage =
        result.rows[0];

      res.status(200).json({
        message:
          "Message deleted for you.",
        data:
          updatedMessage,
      });
    } catch (error) {
      console.error(
        "Delete for me error:",
        error.message,
      );

      res.status(500).json({
        message:
          "Something went wrong while deleting the message.",
      });
    }
  },
);

// ========================================
// DELETE MESSAGE FOR EVERYONE
// ========================================

app.delete(
  "/api/messages/:messageId/for-everyone",
  async (req, res) => {
    try {
      const {
        messageId,
      } = req.params;

      const {
        userId,
      } = req.body;

      if (!messageId || !userId) {
        return res.status(400).json({
          message:
            "Message ID and user ID are required.",
        });
      }

      const messageResult =
        await pool.query(
          `SELECT
            m.id,
            m.conversation_id,
            m.sender_id,
            m.message_type,
            m.deleted_for_everyone
           FROM messages m
           JOIN conversations c
             ON c.id = m.conversation_id
           WHERE m.id = $1
             AND (
               c.user_one_id = $2
               OR c.user_two_id = $2
             )`,
          [
            messageId,
            userId,
          ],
        );

      if (
        messageResult.rows.length ===
        0
      ) {
        return res.status(404).json({
          message:
            "Message not found or you are not a member of this conversation.",
        });
      }

      const message =
        messageResult.rows[0];

      if (
        Number(message.sender_id) !==
        Number(userId)
      ) {
        return res.status(403).json({
          message:
            "Only the sender can delete this message for everyone.",
        });
      }

      if (
        message.deleted_for_everyone
      ) {
        return res.status(400).json({
          message:
            "Message is already deleted for everyone.",
        });
      }

      const result =
        await pool.query(
          `UPDATE messages
           SET
             deleted_for_everyone = TRUE,
             deleted_at = CURRENT_TIMESTAMP,
             content = NULL,
             file_url = NULL,
             file_name = NULL,
             file_size = NULL,
             mime_type = NULL
           WHERE id = $1
           RETURNING *`,
          [messageId],
        );

      const updatedMessage =
        result.rows[0];

      const roomName =
        `conversation_${message.conversation_id}`;

      io.to(roomName).emit(
        "message_deleted_for_everyone",
        {
          messageId:
            Number(messageId),

          conversationId:
            Number(
              message.conversation_id,
            ),

          deletedBy:
            Number(userId),

          messageType:
            message.message_type,
        },
      );

      res.status(200).json({
        message:
          "Message deleted for everyone.",
        data:
          updatedMessage,
      });
    } catch (error) {
      console.error(
        "Delete for everyone error:",
        error.message,
      );

      res.status(500).json({
        message:
          "Something went wrong while deleting the message for everyone.",
      });
    }
  },
);

// ========================================
// GET RECENT CHATS
// ========================================

app.get(
  "/api/users/:userId/conversations",
  async (req, res) => {
    try {
      const {
        userId,
      } = req.params;

      if (
        !userId ||
        isNaN(Number(userId))
      ) {
        return res.status(400).json({
          message:
            "Valid user ID is required.",
        });
      }

      const result =
        await pool.query(
          `
        SELECT
          c.id AS conversation_id,

          CASE
            WHEN c.user_one_id = $1
            THEN c.user_two_id
            ELSE c.user_one_id
          END AS other_user_id,

          u.mobile AS other_user_mobile,

          COALESCE(
            p.name,
            'NEXORA User'
          ) AS other_user_name,

          p.profile_photo,

          lm.content AS last_message,
          lm.message_type AS last_message_type,
          lm.created_at AS last_message_time,

          COALESCE(
            unread.unread_count,
            0
          ) AS unread_count

        FROM conversations c

        JOIN users u
          ON u.id =
            CASE
              WHEN c.user_one_id = $1
              THEN c.user_two_id
              ELSE c.user_one_id
            END

        LEFT JOIN profiles p
          ON p.user_id = u.id

        LEFT JOIN LATERAL (
          SELECT
            m.content,
            m.message_type,
            m.created_at

          FROM messages m

          WHERE m.conversation_id = c.id
            AND m.deleted_for_everyone = FALSE

            AND (
              (
                m.sender_id = $1
                AND m.deleted_for_sender = FALSE
              )

              OR

              (
                m.sender_id <> $1
                AND m.deleted_for_receiver = FALSE
              )
            )

          ORDER BY
            m.created_at DESC

          LIMIT 1
        ) lm ON TRUE

        LEFT JOIN LATERAL (
          SELECT
            COUNT(*)::INTEGER AS unread_count

          FROM messages m

          WHERE m.conversation_id = c.id
            AND m.sender_id <> $1
            AND m.is_read = FALSE
            AND m.deleted_for_everyone = FALSE
            AND m.deleted_for_receiver = FALSE
        ) unread ON TRUE

        WHERE
          c.user_one_id = $1
          OR c.user_two_id = $1

        ORDER BY
          lm.created_at DESC NULLS LAST,
          c.created_at DESC
        `,
          [userId],
        );

      res.status(200).json({
        conversations:
          result.rows,
      });
    } catch (error) {
      console.error(
        "Get recent chats error:",
        error.message,
      );

      res.status(500).json({
        message:
          "Something went wrong while loading recent chats.",
      });
    }
  },
);

// ========================================
// GET MESSAGES
// ========================================

app.get(
  "/api/conversations/:conversationId/messages",
  async (req, res) => {
    try {
      const {
        conversationId,
      } = req.params;

      const {
        userId,
      } = req.query;

      if (!userId) {
        return res.status(400).json({
          message:
            "User ID is required to load messages.",
        });
      }

      const conversationResult =
        await pool.query(
          `SELECT
            user_one_id,
            user_two_id
           FROM conversations
           WHERE id = $1`,
          [conversationId],
        );

      if (
        conversationResult.rows.length ===
        0
      ) {
        return res.status(404).json({
          message:
            "Conversation not found.",
        });
      }

      const conversation =
        conversationResult.rows[0];

      const isMember =
        Number(
          conversation.user_one_id,
        ) === Number(userId) ||
        Number(
          conversation.user_two_id,
        ) === Number(userId);

      if (!isMember) {
        return res.status(403).json({
          message:
            "You are not a member of this conversation.",
        });
      }

      const result =
        await pool.query(
          `SELECT
            m.id,
            m.conversation_id,
            m.sender_id,
            m.message_type,
            m.content,
            m.file_url,
            m.file_name,
            m.file_size,
            m.mime_type,
            m.is_read,
            m.created_at,
            m.deleted_for_sender,
            m.deleted_for_receiver,
            m.deleted_for_everyone,
            m.deleted_at

           FROM messages m

           WHERE m.conversation_id = $1

             AND (
               m.deleted_for_everyone = TRUE

               OR

               (
                 m.sender_id = $2
                 AND m.deleted_for_sender = FALSE
               )

               OR

               (
                 m.sender_id <> $2
                 AND m.deleted_for_receiver = FALSE
               )
             )

           ORDER BY
             m.created_at ASC`,
          [
            conversationId,
            userId,
          ],
        );

      res.status(200).json({
        messages:
          result.rows,
      });
    } catch (error) {
      console.error(
        "Get messages error:",
        error.message,
      );

      res.status(500).json({
        message:
          "Something went wrong while loading messages.",
      });
    }
  },
);

// ========================================
// GET USER ONLINE STATUS
// ========================================

app.get(
  "/api/users/:userId/status",
  (req, res) => {
    const {
      userId,
    } = req.params;

    const isOnline =
      onlineUsers.has(
        String(userId),
      );

    res.status(200).json({
      userId:
        Number(userId),

      status:
        isOnline
          ? "online"
          : "offline",
    });
  },
);

// ========================================
// SOCKET.IO CONNECTION
// ========================================

io.on(
  "connection",
  (socket) => {
    console.log(
      "🟢 Socket connected:",
      socket.id,
    );

    // ========================================
    // USER ONLINE
    // ========================================

    socket.on(
      "user_online",
      (userId) => {
        if (!userId) {
          return;
        }

        const userIdString =
          String(userId);

        onlineUsers.set(
          userIdString,
          socket.id,
        );

        socket.userId =
          userIdString;

        console.log(
          `🟢 NEXORA user ${userIdString} is ONLINE`,
        );

        io.emit(
          "user_status",
          {
            userId:
              userIdString,

            status:
              "online",
          },
        );
      },
    );

    // ========================================
    // JOIN CONVERSATION
    // ========================================

    socket.on(
      "join_conversation",
      (conversationId) => {
        if (!conversationId) {
          return;
        }

        const roomName =
          `conversation_${conversationId}`;

        socket.join(
          roomName,
        );

        console.log(
          `💬 Socket ${socket.id} joined ${roomName}`,
        );

        const room =
          io.sockets.adapter.rooms.get(
            roomName,
          );

        console.log(
          `👥 Users currently in ${roomName}: ${
            room
              ? room.size
              : 0
          }`,
        );
      },
    );

    // ========================================
    // USER DISCONNECT
    // ========================================

    socket.on(
      "disconnect",
      () => {
        console.log(
          "🔴 Socket disconnected:",
          socket.id,
        );

        if (socket.userId) {
          const userIdString =
            String(
              socket.userId,
            );

          if (
            onlineUsers.get(
              userIdString,
            ) === socket.id
          ) {
            onlineUsers.delete(
              userIdString,
            );

            console.log(
              `🔴 NEXORA user ${userIdString} is OFFLINE`,
            );

            io.emit(
              "user_status",
              {
                userId:
                  userIdString,

                status:
                  "offline",
              },
            );
          }
        }
      },
    );
  },
);

// ========================================
// START SERVER
// ========================================

server.listen(
  PORT,
  () => {
    console.log(
      `🚀 NEXORA Backend running on http://localhost:${PORT}`,
    );
  },
);