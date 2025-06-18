import dotenv from "dotenv";
dotenv.config();

export default {
  // ...other configures
  mailer: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
};
