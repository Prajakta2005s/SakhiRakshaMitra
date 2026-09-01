require("dotenv").config();

const express = require("express");
const cors = require("cors");
const multer = require("multer");
const twilio = require("twilio");
const fs = require("fs");
const path = require("path");

const app = express();

app.use(cors());
app.use(express.json());


// =====================================================
// TWILIO CONFIGURATION
// =====================================================

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

const client = twilio(accountSid, authToken);


// =====================================================
// AUDIO UPLOAD FOLDER
// =====================================================

const uploadFolder = path.join(
  __dirname,
  "voice-recordings"
);

if (!fs.existsSync(uploadFolder)) {
  fs.mkdirSync(uploadFolder, {
    recursive: true,
  });
}


// =====================================================
// MULTER CONFIGURATION
// =====================================================

const storage = multer.diskStorage({

  destination: (req, file, cb) => {
    cb(null, uploadFolder);
  },

  filename: (req, file, cb) => {

    const filename =
      `voice_sos_${Date.now()}.wav`;

    cb(null, filename);
  },

});

const upload = multer({
  storage: storage,
});


// =====================================================
// TEST ROUTE
// =====================================================

app.get("/", (req, res) => {

  res.json({
    success: true,
    message:
      "Sakhi RakshaMitra Voice SOS Server is running",
  });

});


// =====================================================
// VOICE SOS
// =====================================================

app.post(
  "/voice-sos",
  upload.single("audio"),
  async (req, res) => {

    try {

      console.log(
        "================================"
      );

      console.log(
        "VOICE SOS REQUEST RECEIVED"
      );

      console.log(
        "================================"
      );


      // -------------------------------------------------
      // CHECK AUDIO
      // -------------------------------------------------

      if (!req.file) {

        return res.status(400).json({
          success: false,
          message: "Audio file is required",
        });

      }


      const trustedName =
        req.body.trustedName || "Trusted Contact";


      const trustedPhone =
        req.body.trustedPhone;


      console.log(
        "Trusted Name:",
        trustedName
      );


      console.log(
        "Trusted Phone:",
        trustedPhone
      );


      console.log(
        "Audio File:",
        req.file.filename
      );


      console.log(
        "Audio Path:",
        req.file.path
      );


      // -------------------------------------------------
      // CHECK PHONE NUMBER
      // -------------------------------------------------

      if (!trustedPhone) {

        return res.status(400).json({
          success: false,
          message:
            "Trusted contact phone number is required",
        });

      }


      // -------------------------------------------------
      // FORMAT INDIAN PHONE NUMBER
      // -------------------------------------------------

      let phoneNumber =
        String(trustedPhone).replace(
          /[\s-]/g,
          ""
        );


      if (
        phoneNumber.startsWith("0")
      ) {

        phoneNumber =
          "+91" +
          phoneNumber.substring(1);

      } else if (
        /^[6-9]\d{9}$/.test(phoneNumber)
      ) {

        phoneNumber =
          "+91" +
          phoneNumber;

      }


      console.log(
        "SMS Number:",
        phoneNumber
      );


      // -------------------------------------------------
      // SEND SOS SMS
      // -------------------------------------------------

      let smsSent = false;
      let smsSid = null;
      let smsError = null;

      try {

        console.log(
          "================================"
        );

        console.log(
          "ATTEMPTING TO SEND SOS SMS"
        );

        console.log(
          "================================"
        );


        const message =
          await client.messages.create({

            body:
              "VOICE SOS ALERT from Sakhi RakshaMitra. Emergency voice command detected. Please check immediately.",

            from:
              twilioPhoneNumber,

            to:
              phoneNumber,

          });


        smsSent = true;

        smsSid =
          message.sid;


        console.log(
          "✅ SOS SMS SENT:",
          message.sid
        );


      } catch (error) {

        smsSent = false;

        smsError =
          error.message;


        console.log(
          "⚠️ SMS COULD NOT BE SENT"
        );


        console.log(
          "Twilio Error:",
          error.message
        );

      }


      // -------------------------------------------------
      // FINAL RESPONSE
      // -------------------------------------------------

      console.log(
        "================================"
      );


      if (smsSent) {

        console.log(
          "VOICE SOS COMPLETED"
        );

      } else {

        console.log(
          "VOICE SOS AUDIO SAVED"
        );

        console.log(
          "SMS FAILED BUT AUDIO WAS SAVED"
        );

      }


      console.log(
        "================================"
      );


      res.json({

        success: true,

        message: smsSent
          ? "Voice SOS audio received and SOS SMS sent successfully"
          : "Voice SOS audio received and saved successfully. SMS could not be sent from the Twilio Trial account.",

        smsSent:
          smsSent,

        sid:
          smsSid,

        smsError:
          smsError,

        audioFile:
          req.file.filename,

        trustedName:
          trustedName,

        trustedPhone:
          phoneNumber,

      });


    } catch (error) {

      console.error(
        "❌ VOICE SOS ERROR:",
        error.message
      );


      res.status(500).json({

        success: false,

        message:
          "Failed to process Voice SOS",

        error:
          error.message,

      });

    }

  }
);


// =====================================================
// START SERVER
// =====================================================

const PORT = 3000;

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log(
      `✅ Sakhi RakshaMitra Voice SOS Server running on port ${PORT}`
    );

  }
);