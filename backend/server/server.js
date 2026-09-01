require("dotenv").config();

const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 5000;

// =====================================================
// SERVER CONFIGURATION
// =====================================================

const PUBLIC_URL =
  process.env.PUBLIC_URL ||
  "https://quake-proofs-president.ngrok-free.dev";

const EMAIL_USER =
  process.env.EMAIL_USER;

const EMAIL_APP_PASSWORD =
  process.env.EMAIL_APP_PASSWORD;


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());

app.use(
  express.json({
    limit: "2mb",
  })
);


// =====================================================
// IN-MEMORY STORAGE
// =====================================================

const liveLocations = new Map();

const journeys = new Map();

const sosHistory = [];

const safetyChecks = new Map();


// =====================================================
// EMAIL
// =====================================================

let transporter = null;

if (
  EMAIL_USER &&
  EMAIL_APP_PASSWORD
) {

  transporter =
    nodemailer.createTransport({

      service: "gmail",

      auth: {
        user: EMAIL_USER,
        pass: EMAIL_APP_PASSWORD,
      },

    });

  transporter.verify(
    (error) => {

      if (error) {

        console.log(
          "❌ EMAIL CONNECTION ERROR:",
          error.message
        );

      } else {

        console.log(
          "✅ EMAIL SERVER READY"
        );

      }

    }
  );

} else {

  console.log(
    "⚠️ EMAIL_USER or EMAIL_APP_PASSWORD missing."
  );

}


// =====================================================
// HELPERS
// =====================================================

function createId(prefix = "") {

  return (
    prefix +
    Date.now() +
    "-" +
    crypto
      .randomBytes(5)
      .toString("hex")
  );

}


function isValidLocation(
  latitude,
  longitude
) {

  const lat =
    Number(latitude);

  const lng =
    Number(longitude);

  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );

}


function distanceMeters(
  latitude1,
  longitude1,
  latitude2,
  longitude2
) {

  const earthRadius = 6371000;

  const lat1 =
    latitude1 *
    Math.PI /
    180;

  const lat2 =
    latitude2 *
    Math.PI /
    180;

  const deltaLat =
    (latitude2 - latitude1) *
    Math.PI /
    180;

  const deltaLng =
    (longitude2 - longitude1) *
    Math.PI /
    180;

  const a =
    Math.sin(deltaLat / 2) *
    Math.sin(deltaLat / 2) +

    Math.cos(lat1) *
    Math.cos(lat2) *

    Math.sin(deltaLng / 2) *
    Math.sin(deltaLng / 2);

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadius * c;

}


// =====================================================
// POINT TO LINE / ROUTE DISTANCE
// =====================================================
//
// Checks distance from current GPS position to the
// nearest point in the planned route.
//
// This is used for route deviation detection.
// =====================================================

function distanceToRoute(
  latitude,
  longitude,
  routeCoordinates
) {

  if (
    !Array.isArray(routeCoordinates) ||
    routeCoordinates.length === 0
  ) {

    return Infinity;

  }

  let minimumDistance =
    Infinity;

  for (
    const point of routeCoordinates
  ) {

    if (
      !point ||
      !isValidLocation(
        point.latitude,
        point.longitude
      )
    ) {

      continue;

    }

    const distance =
      distanceMeters(
        latitude,
        longitude,
        point.latitude,
        point.longitude
      );

    if (
      distance <
      minimumDistance
    ) {

      minimumDistance =
        distance;

    }

  }

  return minimumDistance;

}


// =====================================================
// GET ROUTE FROM OSRM
// =====================================================
//
// Input:
// startLatitude
// startLongitude
// destinationLatitude
// destinationLongitude
//
// OSRM expects:
// longitude,latitude
//
// =====================================================

async function getRoadRoute(
  startLatitude,
  startLongitude,
  destinationLatitude,
  destinationLongitude
) {

  const url =
    "https://router.project-osrm.org/route/v1/driving/" +

    `${startLongitude},${startLatitude};` +

    `${destinationLongitude},${destinationLatitude}` +

    "?overview=full&geometries=geojson";

  console.log(
    "🗺️ REQUESTING ROAD ROUTE"
  );

  console.log(
    url
  );

  const response =
    await fetch(url);

  if (!response.ok) {

    throw new Error(
      `Routing service returned HTTP ${response.status}`
    );

  }

  const data =
    await response.json();

  if (
    data.code !== "Ok" ||
    !data.routes ||
    !data.routes.length
  ) {

    throw new Error(
      "Unable to calculate road route."
    );

  }

  const route =
    data.routes[0];

  const coordinates =
    route.geometry.coordinates;

  const routeCoordinates =
    coordinates.map(
      point => ({

        longitude:
          Number(point[0]),

        latitude:
          Number(point[1]),

      })
    );

  return {

    distanceMeters:
      route.distance,

    durationSeconds:
      route.duration,

    routeCoordinates,

  };

}


// =====================================================
// GEOCODING
// =====================================================
//
// Allows:
//
// "Solapur"
// "Pune"
//
// to be converted into coordinates.
//
// =====================================================

async function geocodePlace(
  place
) {

  const query =
    encodeURIComponent(
      place
    );

  const url =
    `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${query}`;

  const response =
    await fetch(
      url,
      {

        headers: {

          "User-Agent":
            "SakhiRakshaMitra/1.0",

        },

      }
    );

  if (!response.ok) {

    throw new Error(
      `Geocoding service returned HTTP ${response.status}`
    );

  }

  const results =
    await response.json();

  if (
    !results ||
    !results.length
  ) {

    throw new Error(
      `Unable to find location: ${place}`
    );

  }

  return {

    latitude:
      Number(results[0].lat),

    longitude:
      Number(results[0].lon),

    displayName:
      results[0].display_name,

  };

}


// =====================================================
// EMAIL VALIDATION
// =====================================================

function cleanEmails(
  recipients
) {

  if (
    !Array.isArray(recipients)
  ) {

    return [];

  }

  return recipients
    .map(
      email =>
        String(email)
          .trim()
          .toLowerCase()
    )
    .filter(
      email =>
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/
          .test(email)
    );

}


// =====================================================
// SEND EMAIL HELPER
// =====================================================

async function sendEmail(
  recipients,
  subject,
  text,
  html
) {

  if (
    !transporter
  ) {

    throw new Error(
      "Email server is not configured."
    );

  }

  const emailList =
    cleanEmails(
      recipients
    );

  if (
    emailList.length === 0
  ) {

    throw new Error(
      "No valid email recipients."
    );

  }

  return await transporter.sendMail({

    from:
      `"Sakhi RakshaMitra" <${EMAIL_USER}>`,

    to:
      emailList[0],

    bcc:
      emailList.slice(1),

    subject,

    text,

    html,

  });

}


// =====================================================
// HOME
// =====================================================

app.get(
  "/",
  (req, res) => {

    res.json({

      success:
        true,

      message:
        "Sakhi RakshaMitra Journey Monitoring Server is running.",

      publicUrl:
        PUBLIC_URL,

    });

  }
);


// =====================================================
// CREATE JOURNEY
// =====================================================
//
// POST /create-journey
//
// Body:
//
// {
//   destination: "Pune",
//   startLatitude: 17.6599,
//   startLongitude: 75.9064,
//   startAccuracy: 10,
//   startTimestamp: 123456,
//   trustedEmails: [
//      "parent@gmail.com"
//   ]
// }
//
// Optional:
//
// destinationLatitude
// destinationLongitude
//
// If destination coordinates aren't supplied,
// server geocodes destination.
// =====================================================

app.post(
  "/create-journey",
  async (req, res) => {

    try {

      const destination =
        String(
          req.body.destination ||
          ""
        ).trim();

      const startLatitude =
        Number(
          req.body.startLatitude
        );

      const startLongitude =
        Number(
          req.body.startLongitude
        );

      const startAccuracy =
        req.body.startAccuracy !== undefined
          ? Number(
              req.body.startAccuracy
            )
          : null;

      const startTimestamp =
        req.body.startTimestamp ||
        Date.now();

      const trustedEmails =
        cleanEmails(
          req.body.trustedEmails ||
          []
        );


      if (!destination) {

        return res.status(400).json({

          success:
            false,

          message:
            "Destination is required.",

        });

      }


      if (
        !isValidLocation(
          startLatitude,
          startLongitude
        )
      ) {

        return res.status(400).json({

          success:
            false,

          message:
            "Invalid starting location.",

        });

      }


      console.log("");
      console.log(
        "======================================"
      );

      console.log(
        "🧭 CREATE JOURNEY"
      );

      console.log(
        "======================================"
      );

      console.log(
        "Destination:",
        destination
      );


      // -------------------------------------------------
      // GET DESTINATION COORDINATES
      // -------------------------------------------------

      let destinationLocation;


      if (
        isValidLocation(
          req.body.destinationLatitude,
          req.body.destinationLongitude
        )
      ) {

        destinationLocation = {

          latitude:
            Number(
              req.body.destinationLatitude
            ),

          longitude:
            Number(
              req.body.destinationLongitude
            ),

          displayName:
            destination,

        };

      } else {

        destinationLocation =
          await geocodePlace(
            destination
          );

      }


      console.log(
        "DESTINATION:",
        destinationLocation
      );


      // -------------------------------------------------
      // CALCULATE ROAD ROUTE
      // -------------------------------------------------

      const route =
        await getRoadRoute(

          startLatitude,

          startLongitude,

          destinationLocation.latitude,

          destinationLocation.longitude

        );


      const journeyId =
        createId(
          "journey-"
        );


      const now =
        new Date();


      const journey = {

        journeyId,

        destination,

        startLocation: {

          latitude:
            startLatitude,

          longitude:
            startLongitude,

          accuracy:
            startAccuracy,

          timestamp:
            startTimestamp,

        },

        destinationLocation,

        routeCoordinates:
          route.routeCoordinates,

        plannedDistanceMeters:
          route.distanceMeters,

        plannedDurationSeconds:
          route.durationSeconds,

        trustedEmails,

        startedAt:
          now.toISOString(),

        endedAt:
          null,

        duration:
          null,

        active:
          true,

        routeDeviation:

          {

            active:
              false,

            currentDistanceMeters:
              null,

            detectedAt:
              null,

            alertSent:
              false,

          },

        locationHistory:
          [

            {

              latitude:
                startLatitude,

              longitude:
                startLongitude,

              accuracy:
                startAccuracy,

              timestamp:
                startTimestamp,

              routeDistanceMeters:
                distanceToRoute(

                  startLatitude,

                  startLongitude,

                  route.routeCoordinates

                ),

              routeDeviation:
                false,

            },

          ],

        lastLocation: {

          latitude:
            startLatitude,

          longitude:
            startLongitude,

          accuracy:
            startAccuracy,

          timestamp:
            startTimestamp,

        },

      };


      journeys.set(
        journeyId,
        journey
      );


      console.log(
        "✅ JOURNEY CREATED:",
        journeyId
      );

      console.log(
        "Planned distance:",
        Math.round(
          route.distanceMeters
        ),
        "meters"
      );

      console.log(
        "Route points:",
        route.routeCoordinates.length
      );


      return res.json({

        success:
          true,

        journeyId,

        destination,

        destinationLocation,

        plannedDistanceMeters:
          route.distanceMeters,

        plannedDurationSeconds:
          route.durationSeconds,

        routeCoordinates:
          route.routeCoordinates,

        routeDeviationThresholdMeters:
          3000,

        message:
          "Journey created and planned route calculated.",

      });


    } catch (error) {

      console.log(
        "❌ CREATE JOURNEY ERROR:",
        error.message
      );


      return res.status(500).json({

        success:
          false,

        message:
          "Unable to create journey.",

        error:
          error.message,

      });

    }

  }
);


// =====================================================
// UPDATE JOURNEY LOCATION
// =====================================================
//
// POST /update-journey-location
//
// Body:
//
// {
//   journeyId,
//   latitude,
//   longitude,
//   accuracy,
//   timestamp
// }
//
// =====================================================

app.post(
  "/update-journey-location",
  async (req, res) => {

    try {

      const journeyId =
        req.body.journeyId;

      const journey =
        journeys.get(
          journeyId
        );


      if (!journey) {

        return res.status(404).json({

          success:
            false,

          message:
            "Journey not found.",

        });

      }


      if (!journey.active) {

        return res.status(400).json({

          success:
            false,

          message:
            "Journey is no longer active.",

        });

      }


      const latitude =
        Number(
          req.body.latitude
        );

      const longitude =
        Number(
          req.body.longitude
        );

      const accuracy =
        req.body.accuracy !== undefined
          ? Number(
              req.body.accuracy
            )
          : null;

      const timestamp =
        req.body.timestamp ||
        Date.now();


      if (
        !isValidLocation(
          latitude,
          longitude
        )
      ) {

        return res.status(400).json({

          success:
            false,

          message:
            "Invalid GPS location.",

        });

      }


      // -------------------------------------------------
      // DISTANCE FROM PLANNED ROUTE
      // -------------------------------------------------

      const routeDistance =
        distanceToRoute(

          latitude,

          longitude,

          journey.routeCoordinates

        );


      // -------------------------------------------------
      // ROUTE DEVIATION THRESHOLD
      // -------------------------------------------------
      //
      // 3 KM corridor.
      //
      // This avoids false alarms caused by small GPS
      // inaccuracies or normal road movement.
      //
      // You can later change this to 2000 or 5000.
      // -------------------------------------------------

      const ROUTE_DEVIATION_THRESHOLD =
        3000;


      const isDeviation =
        routeDistance >
        ROUTE_DEVIATION_THRESHOLD;


      const wasAlreadyDeviating =
        journey.routeDeviation.active;


      // -------------------------------------------------
      // UPDATE JOURNEY LOCATION
      // -------------------------------------------------

      journey.lastLocation = {

        latitude,

        longitude,

        accuracy,

        timestamp,

      };


      journey.locationHistory.push({

        latitude,

        longitude,

        accuracy,

        timestamp,

        routeDistanceMeters:
          routeDistance,

        routeDeviation:
          isDeviation,

      });


      // Keep memory reasonable.

      if (
        journey.locationHistory.length >
        5000
      ) {

        journey.locationHistory.shift();

      }


      // -------------------------------------------------
      // DEVIATION STARTED
      // -------------------------------------------------

      if (
        isDeviation &&
        !wasAlreadyDeviating
      ) {

        console.log("");
        console.log(
          "======================================"
        );

        console.log(
          "🚨 ROUTE DEVIATION DETECTED"
        );

        console.log(
          "======================================"
        );

        console.log(
          "Journey:",
          journeyId
        );

        console.log(
          "Destination:",
          journey.destination
        );

        console.log(
          "Current latitude:",
          latitude
        );

        console.log(
          "Current longitude:",
          longitude
        );

        console.log(
          "Distance from planned route:",
          Math.round(
            routeDistance
          ),
          "meters"
        );


        journey.routeDeviation = {

          active:
            true,

          currentDistanceMeters:
            routeDistance,

          detectedAt:
            new Date().toISOString(),

          alertSent:
            false,

        };


        // -------------------------------------------------
        // SEND PARENT ALERT
        // -------------------------------------------------

        if (
          journey.trustedEmails.length > 0
        ) {

          try {

            await sendRouteDeviationEmail(
              journey
            );

            journey.routeDeviation.alertSent =
              true;

          } catch (emailError) {

            console.log(
              "❌ ROUTE DEVIATION EMAIL ERROR:",
              emailError.message
            );

          }

        }

      }


      // -------------------------------------------------
      // USER RETURNED TO ROUTE
      // -------------------------------------------------

      if (
        !isDeviation &&
        wasAlreadyDeviating
      ) {

        console.log(
          "✅ USER RETURNED TO PLANNED ROUTE"
        );


        journey.routeDeviation = {

          active:
            false,

          currentDistanceMeters:
            routeDistance,

          detectedAt:
            journey.routeDeviation.detectedAt,

          alertSent:
            journey.routeDeviation.alertSent,

        };

      }


      // -------------------------------------------------
      // UPDATE LIVE LOCATION
      // -------------------------------------------------

      journey.lastLocation.routeDistanceMeters =
        routeDistance;

      journey.lastLocation.routeDeviation =
        isDeviation;


      journeys.set(
        journeyId,
        journey
      );


      return res.json({

        success:
          true,

        journeyId,

        latitude,

        longitude,

        accuracy,

        routeDistanceMeters:
          routeDistance,

        routeDeviation:
          isDeviation,

        routeDeviationThresholdMeters:
          ROUTE_DEVIATION_THRESHOLD,

        routeDeviationAlertSent:
          journey.routeDeviation.alertSent,

        message:
          isDeviation
            ? "User is outside the planned route."
            : "Location is within the planned route corridor.",

      });


    } catch (error) {

      console.log(
        "❌ UPDATE JOURNEY LOCATION ERROR:",
        error.message
      );


      return res.status(500).json({

        success:
          false,

        message:
          "Unable to update journey location.",

        error:
          error.message,

      });

    }

  }
);


// =====================================================
// ROUTE DEVIATION EMAIL
// =====================================================

async function sendRouteDeviationEmail(
  journey
) {

  const location =
    journey.lastLocation;


  const mapsUrl =
    `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;


  let liveLocationUrl =
    null;


  if (
    journey.liveLocationId
  ) {

    liveLocationUrl =
      `${PUBLIC_URL}/live-location?locationId=${encodeURIComponent(
        journey.liveLocationId
      )}`;

  }


  const distanceKm =
    (
      journey.routeDeviation
        .currentDistanceMeters /
      1000
    ).toFixed(2);


  const subject =
    "🚨 ROUTE DEVIATION ALERT - Sakhi RakshaMitra";


  const text =

`🚨 ROUTE DEVIATION ALERT

Sakhi RakshaMitra has detected that the user appears to have moved away from the planned journey route.

Planned Journey:
${journey.startLocation.latitude}, ${journey.startLocation.longitude}
→ ${journey.destination}

Current Location:
Latitude: ${location.latitude}
Longitude: ${location.longitude}

Distance from planned route:
Approximately ${distanceKm} km

Google Maps:
${mapsUrl}

${
  liveLocationUrl
    ? `Live Location:
${liveLocationUrl}

`
    : ""
}

Please check the user's safety.

You may ask the user:
"Are you safe?"

This is an automated alert from Sakhi RakshaMitra.`;


  const html = `

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width,initial-scale=1.0"
/>

<title>
Route Deviation Alert
</title>

</head>

<body
style="
margin:0;
padding:20px;
background:#f5f5f5;
font-family:Arial,Helvetica,sans-serif;
">

<div
style="
max-width:600px;
margin:auto;
background:white;
padding:25px;
border-radius:12px;
">

<div
style="
background:#c62828;
color:white;
padding:20px;
border-radius:10px;
text-align:center;
">

<h1>
🚨 ROUTE DEVIATION
</h1>

<p>
Sakhi RakshaMitra
</p>

</div>


<div
style="
margin-top:20px;
color:#333;
line-height:1.6;
">

<h2>
⚠️ Route Deviation Detected
</h2>

<p>
The user appears to have moved away from the planned journey route.
</p>

<p>
<strong>
Destination:
</strong>

${escapeHtml(
  journey.destination
)}

</p>

<p>
<strong>
Distance from planned route:
</strong>

${distanceKm} km
</p>

</div>


<div
style="
margin-top:20px;
background:#f7f7f7;
padding:20px;
border-radius:10px;
">

<h3>
📍 Current Location
</h3>

<p>
Latitude:
${location.latitude}
</p>

<p>
Longitude:
${location.longitude}
</p>

<p>
Accuracy:
${
  location.accuracy !== null
    ? location.accuracy +
      " meters"
    : "Unavailable"
}
</p>

<a
href="${mapsUrl}"
target="_blank"
style="
display:inline-block;
background:#c62828;
color:white;
padding:13px 20px;
border-radius:6px;
text-decoration:none;
font-weight:bold;
">

📍 Open Current Location

</a>

</div>


${
  liveLocationUrl
    ? `

<div
style="
margin-top:20px;
background:#ffebee;
padding:20px;
border-radius:10px;
">

<h3>
🔴 Live Location
</h3>

<p>
You can monitor the user's latest location.
</p>

<a
href="${liveLocationUrl}"
target="_blank"
style="
display:inline-block;
background:#c62828;
color:white;
padding:13px 20px;
border-radius:6px;
text-decoration:none;
font-weight:bold;
">

📍 Open Live Location

</a>

</div>

`
    : ""
}


<div
style="
margin-top:20px;
background:#fff8e1;
padding:20px;
border-radius:10px;
">

<strong>
Please check the user's safety immediately.
</strong>

<p>
You may ask the user:
</p>

<p>
<strong>
"Are you safe?"
</strong>
</p>

</div>


<p
style="
text-align:center;
color:#777;
font-size:13px;
margin-top:25px;
">

Automated alert from Sakhi RakshaMitra.

</p>

</div>

</body>

</html>

`;


  const result =
    await sendEmail(

      journey.trustedEmails,

      subject,

      text,

      html

    );


  console.log(
    "✅ ROUTE DEVIATION EMAIL SENT"
  );


  return result;

}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHtml(
  value
) {

  return String(value)
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

}


// =====================================================
// SHARE LIVE LOCATION
// =====================================================
//
// POST /create-live-location
//
// Body:
//
// {
//   latitude,
//   longitude,
//   accuracy,
//   journeyId
// }
//
// =====================================================

app.post(
  "/create-live-location",
  (req, res) => {

    try {

      const latitude =
        Number(
          req.body.latitude
        );

      const longitude =
        Number(
          req.body.longitude
        );

      const accuracy =
        req.body.accuracy !== undefined
          ? Number(
              req.body.accuracy
            )
          : null;

      const journeyId =
        req.body.journeyId ||
        null;


      if (
        !isValidLocation(
          latitude,
          longitude
        )
      ) {

        return res.status(400).json({

          success:
            false,

          message:
            "Invalid latitude or longitude.",

        });

      }


      const locationId =
        createId(
          "location-"
        );


      const now =
        new Date()
          .toISOString();


      const session = {

        locationId,

        journeyId,

        latitude,

        longitude,

        accuracy,

        createdAt:
          now,

        updatedAt:
          now,

        active:
          true,

      };


      liveLocations.set(
        locationId,
        session
      );


      // Connect live location to journey.

      if (
        journeyId &&
        journeys.has(
          journeyId
        )
      ) {

        const journey =
          journeys.get(
            journeyId
          );

        journey.liveLocationId =
          locationId;

        journeys.set(
          journeyId,
          journey
        );

      }


      const liveLocationUrl =
        `${PUBLIC_URL}/live-location?locationId=${encodeURIComponent(
          locationId
        )}`;


      console.log(
        "📍 LIVE LOCATION CREATED:",
        locationId
      );


      return res.json({

        success:
          true,

        locationId,

        liveLocationUrl,

        latitude,

        longitude,

        accuracy,

      });


    } catch (error) {

      return res.status(500).json({

        success:
          false,

        message:
          "Unable to create live location.",

        error:
          error.message,

      });

    }

  }
);


// =====================================================
// UPDATE LIVE LOCATION
// =====================================================

app.post(
  "/update-location",
  (req, res) => {

    try {

      const locationId =
        req.body.locationId;

      const session =
        liveLocations.get(
          locationId
        );


      if (!session) {

        return res.status(404).json({

          success:
            false,

          message:
            "Live location session not found.",

        });

      }


      const latitude =
        Number(
          req.body.latitude
        );

      const longitude =
        Number(
          req.body.longitude
        );

      const accuracy =
        req.body.accuracy !== undefined
          ? Number(
              req.body.accuracy
            )
          : null;


      if (
        !isValidLocation(
          latitude,
          longitude
        )
      ) {

        return res.status(400).json({

          success:
            false,

          message:
            "Invalid location.",

        });

      }


      session.latitude =
        latitude;

      session.longitude =
        longitude;

      session.accuracy =
        accuracy;

      session.updatedAt =
        new Date()
          .toISOString();

      session.active =
        true;


      liveLocations.set(
        locationId,
        session
      );


      // Also update journey.

      if (
        session.journeyId &&
        journeys.has(
          session.journeyId
        )
      ) {

        const journey =
          journeys.get(
            session.journeyId
          );


        journey.lastLocation = {

          latitude,

          longitude,

          accuracy,

          timestamp:
            Date.now(),

        };


        journeys.set(
          session.journeyId,
          journey
        );

      }


      return res.json({

        success:
          true,

        message:
          "Live location updated.",

        locationId,

        latitude,

        longitude,

        accuracy,

        updatedAt:
          session.updatedAt,

      });


    } catch (error) {

      return res.status(500).json({

        success:
          false,

        message:
          "Unable to update live location.",

        error:
          error.message,

      });

    }

  }
);


// =====================================================
// GET LIVE LOCATION
// =====================================================

app.get(
  "/api/live-location/:locationId",
  (req, res) => {

    const locationId =
      req.params.locationId;

    const session =
      liveLocations.get(
        locationId
      );


    if (!session) {

      return res.status(404).json({

        success:
          false,

        message:
          "Live location session not found.",

      });

    }


    return res.json({

      success:
        true,

      locationId:
        session.locationId,

      journeyId:
        session.journeyId,

      latitude:
        session.latitude,

      longitude:
        session.longitude,

      accuracy:
        session.accuracy,

      createdAt:
        session.createdAt,

      updatedAt:
        session.updatedAt,

      active:
        session.active,

    });

  }
);


// =====================================================
// STOP LIVE LOCATION
// =====================================================

app.post(
  "/stop-live-location",
  (req, res) => {

    const locationId =
      req.body.locationId;

    const session =
      liveLocations.get(
        locationId
      );


    if (!session) {

      return res.status(404).json({

        success:
          false,

        message:
          "Live location session not found.",

      });

    }


    session.active =
      false;

    session.updatedAt =
      new Date()
        .toISOString();


    liveLocations.set(
      locationId,
      session
    );


    return res.json({

      success:
        true,

      message:
        "Live location sharing stopped.",

      locationId,

    });

  }
);


// =====================================================
// STOP JOURNEY
// =====================================================
//
// POST /stop-journey
//
// =====================================================

app.post(
  "/stop-journey",
  (req, res) => {

    try {

      const journeyId =
        req.body.journeyId;

      const journey =
        journeys.get(
          journeyId
        );


      if (!journey) {

        return res.status(404).json({

          success:
            false,

          message:
            "Journey not found.",

        });

      }


      const endTimestamp =
        req.body.endTimestamp ||
        Date.now();


      const duration =
        req.body.duration !== undefined
          ? Number(
              req.body.duration
            )
          : endTimestamp -
            new Date(
              journey.startedAt
            ).getTime();


      journey.active =
        false;

      journey.endedAt =
        new Date(
          endTimestamp
        ).toISOString();

      journey.duration =
        duration;


      if (
        isValidLocation(
          req.body.endLatitude,
          req.body.endLongitude
        )
      ) {

        journey.endLocation = {

          latitude:
            Number(
              req.body.endLatitude
            ),

          longitude:
            Number(
              req.body.endLongitude
            ),

        };

      }


      if (
        journey.liveLocationId &&
        liveLocations.has(
          journey.liveLocationId
        )
      ) {

        const session =
          liveLocations.get(
            journey.liveLocationId
          );

        session.active =
          false;

        session.updatedAt =
          new Date()
            .toISOString();

        liveLocations.set(
          journey.liveLocationId,
          session
        );

      }


      journeys.set(
        journeyId,
        journey
      );


      console.log(
        "✅ JOURNEY STOPPED:",
        journeyId
      );


      return res.json({

        success:
          true,

        message:
          "Journey stopped successfully.",

        journeyId,

        duration,

        journey,

      });


    } catch (error) {

      return res.status(500).json({

        success:
          false,

        message:
          "Unable to stop journey.",

        error:
          error.message,

      });

    }

  }
);


// =====================================================
// GET JOURNEY DETAILS
// =====================================================

app.get(
  "/journey/:journeyId",
  (req, res) => {

    const journey =
      journeys.get(
        req.params.journeyId
      );


    if (!journey) {

      return res.status(404).json({

        success:
          false,

        message:
          "Journey not found.",

      });

    }


    return res.json({

      success:
        true,

      journey,

    });

  }
);


// =====================================================
// GET JOURNEY HISTORY
// =====================================================

app.get(
  "/journeys",
  (req, res) => {

    return res.json({

      success:
        true,

      count:
        journeys.size,

      journeys:
        Array.from(
          journeys.values()
        ),

    });

  }
);


// =====================================================
// REQUEST SAFETY CHECK
// =====================================================
//
// POST /request-safety-check
//
// This can be called by the parent side.
//
// Body:
//
// {
//   journeyId: "..."
// }
//
// It creates a pending question for the user.
//
// The mobile app polls:
// GET /safety-check/pending/:journeyId
//
// =====================================================

app.post(
  "/request-safety-check",
  async (req, res) => {

    try {

      const journeyId =
        req.body.journeyId;

      const journey =
        journeys.get(
          journeyId
        );


      if (!journey) {

        return res.status(404).json({

          success:
            false,

          message:
            "Journey not found.",

        });

      }


      const safetyCheckId =
        createId(
          "safety-"
        );


      const safetyCheck = {

        safetyCheckId,

        journeyId,

        question:
          "Are you safe?",

        status:
          "pending",

        response:
          null,

        requestedAt:
          new Date()
            .toISOString(),

        respondedAt:
          null,

      };


      safetyChecks.set(
        safetyCheckId,
        safetyCheck
      );


      // -------------------------------------------------
      // EMAIL PARENTS
      // -------------------------------------------------

      if (
        journey.trustedEmails.length > 0
      ) {

        const current =
          journey.lastLocation;


        const mapsUrl =
          current
            ? `https://www.google.com/maps?q=${current.latitude},${current.longitude}`
            : null;


        const liveUrl =
          journey.liveLocationId
            ? `${PUBLIC_URL}/live-location?locationId=${encodeURIComponent(
                journey.liveLocationId
              )}`
            : null;


        const subject =
          "🛡️ SAFETY CHECK - Sakhi RakshaMitra";


        const text =

`🛡️ SAFETY CHECK

Please check with the user:

"Are you safe?"

Journey:
${journey.destination}

The user's current live location can be monitored.

${
  mapsUrl
    ? `Current Location:
${mapsUrl}

`
    : ""
}

${
  liveUrl
    ? `Live Location:
${liveUrl}

`
    : ""
}

The user can respond from the Sakhi RakshaMitra app.

Safety Check ID:
${safetyCheckId}`;


        const html = `

<div
style="
max-width:600px;
margin:auto;
font-family:Arial;
padding:20px;
">

<div
style="
background:#7425C9;
color:white;
padding:20px;
border-radius:10px;
text-align:center;
">

<h1>
🛡️ SAFETY CHECK
</h1>

<p>
Sakhi RakshaMitra
</p>

</div>

<h2>
Please check the user's safety.
</h2>

<p>
Ask the user:
</p>

<div
style="
background:#f5f5f5;
padding:20px;
border-radius:10px;
font-size:20px;
font-weight:bold;
">

"Are you safe?"

</div>


${
  mapsUrl
    ? `

<p style="margin-top:20px;">

<a
href="${mapsUrl}"
target="_blank"
style="
background:#c62828;
color:white;
padding:12px 18px;
text-decoration:none;
border-radius:6px;
">

📍 Current Location

</a>

</p>

`
    : ""
}


${
  liveUrl
    ? `

<p>

<a
href="${liveUrl}"
target="_blank"
style="
background:#c62828;
color:white;
padding:12px 18px;
text-decoration:none;
border-radius:6px;
">

🔴 Open Live Location

</a>

</p>

`
    : ""
}


<p
style="
color:#777;
font-size:13px;
margin-top:30px;
">

Safety Check ID:
${safetyCheckId}

</p>

</div>

`;


        try {

          await sendEmail(

            journey.trustedEmails,

            subject,

            text,

            html

          );

        } catch (emailError) {

          console.log(
            "SAFETY CHECK EMAIL ERROR:",
            emailError.message
          );

        }

      }


      return res.json({

        success:
          true,

        message:
          "Safety check requested.",

        safetyCheckId,

      });


    } catch (error) {

      return res.status(500).json({

        success:
          false,

        message:
          "Unable to request safety check.",

        error:
          error.message,

      });

    }

  }
);


// =====================================================
// GET PENDING SAFETY CHECK
// =====================================================
//
// Mobile app calls this periodically.
//
// =====================================================

app.get(
  "/safety-check/pending/:journeyId",
  (req, res) => {

    const journeyId =
      req.params.journeyId;


    const pending =
      Array.from(
        safetyChecks.values()
      )
      .filter(
        check =>
          check.journeyId ===
          journeyId &&
          check.status ===
          "pending"
      )
      .sort(
        (a, b) =>
          new Date(b.requestedAt) -
          new Date(a.requestedAt)
      );


    return res.json({

      success:
        true,

      pending:
        pending.length > 0,

      safetyCheck:
        pending[0] ||
        null,

    });

  }
);


// =====================================================
// USER SAFETY RESPONSE
// =====================================================
//
// POST /safety-check/respond
//
// Body:
//
// {
//   safetyCheckId,
//   response: "safe"
// }
//
// OR
//
// {
//   safetyCheckId,
//   response: "not_safe"
// }
//
// =====================================================

app.post(
  "/safety-check/respond",
  async (req, res) => {

    try {

      const safetyCheckId =
        req.body.safetyCheckId;

      const response =
        String(
          req.body.response ||
          ""
        ).trim()
        .toLowerCase();


      const safetyCheck =
        safetyChecks.get(
          safetyCheckId
        );


      if (!safetyCheck) {

        return res.status(404).json({

          success:
            false,

          message:
            "Safety check not found.",

        });

      }


      if (
        safetyCheck.status !==
        "pending"
      ) {

        return res.status(400).json({

          success:
            false,

          message:
            "This safety check has already been answered.",

        });

      }


      if (
        response !== "safe" &&
        response !== "not_safe"
      ) {

        return res.status(400).json({

          success:
            false,

          message:
            "Response must be 'safe' or 'not_safe'.",

        });

      }


      safetyCheck.response =
        response;

      safetyCheck.status =
        "answered";

      safetyCheck.respondedAt =
        new Date()
          .toISOString();


      safetyChecks.set(
        safetyCheckId,
        safetyCheck
      );


      const journey =
        journeys.get(
          safetyCheck.journeyId
        );


      // -------------------------------------------------
      // NOT SAFE
      // -------------------------------------------------

      if (
        response ===
        "not_safe"
      ) {

        console.log("");
        console.log(
          "🚨 USER RESPONDED: NOT SAFE"
        );


        if (
          journey &&
          journey.trustedEmails.length > 0
        ) {

          const current =
            journey.lastLocation;


          const mapsUrl =
            current
              ? `https://www.google.com/maps?q=${current.latitude},${current.longitude}`
              : null;


          const liveUrl =
            journey.liveLocationId
              ? `${PUBLIC_URL}/live-location?locationId=${encodeURIComponent(
                  journey.liveLocationId
                )}`
              : null;


          const subject =
            "🚨 EMERGENCY - USER REPORTED NOT SAFE";


          const text =

`🚨 EMERGENCY ALERT

The user has responded:

"I AM NOT SAFE"

Journey:
${journey.destination}

${
  mapsUrl
    ? `Current Location:
${mapsUrl}

`
    : ""
}

${
  liveUrl
    ? `Live Location:
${liveUrl}

`
    : ""
}

Please take immediate action.

Sakhi RakshaMitra`;


          const html = `

<div
style="
font-family:Arial;
max-width:600px;
margin:auto;
padding:20px;
">

<div
style="
background:#c62828;
color:white;
padding:20px;
text-align:center;
border-radius:10px;
">

<h1>
🚨 EMERGENCY ALERT
</h1>

</div>

<h2>
The user has reported:
</h2>

<div
style="
background:#ffebee;
padding:20px;
border-radius:10px;
font-size:22px;
font-weight:bold;
color:#c62828;
">

I AM NOT SAFE

</div>


${
  mapsUrl
    ? `

<p style="margin-top:25px;">

<a
href="${mapsUrl}"
target="_blank"
style="
background:#c62828;
color:white;
padding:14px 20px;
text-decoration:none;
border-radius:6px;
">

📍 Open Current Location

</a>

</p>

`
    : ""
}


${
  liveUrl
    ? `

<p>

<a
href="${liveUrl}"
target="_blank"
style="
background:#c62828;
color:white;
padding:14px 20px;
text-decoration:none;
border-radius:6px;
">

🔴 Open Live Location

</a>

</p>

`
    : ""
}


<p>
Please take immediate action.
</p>

</div>

`;


          try {

            await sendEmail(

              journey.trustedEmails,

              subject,

              text,

              html

            );

          } catch (emailError) {

            console.log(
              "NOT SAFE EMAIL ERROR:",
              emailError.message
            );

          }

        }

      }


      // -------------------------------------------------
      // SAFE
      // -------------------------------------------------

      if (
        response ===
        "safe"
      ) {

        console.log(
          "✅ USER RESPONDED: SAFE"
        );


        if (
          journey &&
          journey.trustedEmails.length > 0
        ) {

          try {

            await sendEmail(

              journey.trustedEmails,

              "✅ SAFETY CONFIRMED - Sakhi RakshaMitra",

              `✅ SAFETY CONFIRMED

The user has responded:

"I AM SAFE"

Journey:
${journey.destination}

The user has confirmed that they are safe.

Sakhi RakshaMitra`,

              `

<div
style="
font-family:Arial;
max-width:600px;
margin:auto;
padding:20px;
">

<div
style="
background:#2e7d32;
color:white;
padding:20px;
text-align:center;
border-radius:10px;
">

<h1>
✅ SAFETY CONFIRMED
</h1>

</div>

<p>
The user has responded:
</p>

<h2>
"I AM SAFE"
</h2>

<p>
Journey:
<strong>
${escapeHtml(
  journey.destination
)}
</strong>
</p>

<p>
The user has confirmed that they are safe.
</p>

</div>

`

            );

          } catch (emailError) {

            console.log(
              "SAFE EMAIL ERROR:",
              emailError.message
            );

          }

        }

      }


      return res.json({

        success:
          true,

        message:
          response === "safe"
            ? "Safety response recorded as SAFE."
            : "Safety response recorded as NOT SAFE.",

        safetyCheck,

      });


    } catch (error) {

      return res.status(500).json({

        success:
          false,

        message:
          "Unable to process safety response.",

        error:
          error.message,

      });

    }

  }
);


// =====================================================
// GET SAFETY CHECK
// =====================================================

app.get(
  "/safety-check/:safetyCheckId",
  (req, res) => {

    const safetyCheck =
      safetyChecks.get(
        req.params.safetyCheckId
      );


    if (!safetyCheck) {

      return res.status(404).json({

        success:
          false,

        message:
          "Safety check not found.",

      });

    }


    return res.json({

      success:
        true,

      safetyCheck,

    });

  }
);


// =====================================================
// SEND SOS EMAIL
// =====================================================
//
// This remains compatible with your previous
// LiveLocation/SOS system.
//
// =====================================================

app.post(
  "/send-sos",
  async (req, res) => {

    try {

      const recipients =
        cleanEmails(
          req.body.recipients ||
          []
        );

      const latitude =
        Number(
          req.body.latitude
        );

      const longitude =
        Number(
          req.body.longitude
        );

      const accuracy =
        req.body.accuracy !== undefined
          ? Number(
              req.body.accuracy
            )
          : null;

      const locationId =
        req.body.locationId ||
        null;


      if (
        recipients.length === 0
      ) {

        return res.status(400).json({

          success:
            false,

          message:
            "No Safety Circle email addresses found.",

        });

      }


      const locationAvailable =
        isValidLocation(
          latitude,
          longitude
        );


      const locationUrl =
        locationAvailable
          ? `https://www.google.com/maps?q=${latitude},${longitude}`
          : null;


      let liveLocationUrl =
        null;


      if (
        locationId &&
        liveLocations.has(
          locationId
        )
      ) {

        liveLocationUrl =
          `${PUBLIC_URL}/live-location?locationId=${encodeURIComponent(
            locationId
          )}`;

      }


      let text =

`🚨 SOS ALERT

Emergency SOS has been triggered.

Please check the user's safety immediately.

`;


      if (
        locationAvailable
      ) {

        text +=

`📍 CURRENT LOCATION

Latitude: ${latitude}
Longitude: ${longitude}
GPS Accuracy: ${
          accuracy !== null &&
          Number.isFinite(accuracy)
            ? accuracy + " meters"
            : "Unavailable"
        }

Google Maps:
${locationUrl}

`;

      }


      if (
        liveLocationUrl
      ) {

        text +=

`🔴 LIVE LOCATION

${liveLocationUrl}

`;

      }


      text +=

`This is an automated emergency alert from Sakhi RakshaMitra.`;


      const html = `

<div
style="
font-family:Arial;
max-width:600px;
margin:auto;
padding:20px;
">

<div
style="
background:#c62828;
color:white;
padding:20px;
text-align:center;
border-radius:10px;
">

<h1>
🚨 SOS ALERT
</h1>

<p>
Sakhi RakshaMitra
</p>

</div>

<h3>
Emergency SOS has been triggered.
</h3>

<p>
Please check the user's safety immediately.
</p>


${
  locationAvailable
    ? `

<div
style="
background:#f7f7f7;
padding:20px;
border-radius:10px;
">

<h3>
📍 Current Location
</h3>

<p>
Latitude:
${latitude}
</p>

<p>
Longitude:
${longitude}
</p>

<p>
GPS Accuracy:
${
  accuracy !== null &&
  Number.isFinite(accuracy)
    ? accuracy + " meters"
    : "Unavailable"
}
</p>

<a
href="${locationUrl}"
target="_blank"
style="
background:#c62828;
color:white;
padding:13px 20px;
text-decoration:none;
border-radius:6px;
">

📍 Open Current Location

</a>

</div>

`
    : ""
}


${
  liveLocationUrl
    ? `

<div
style="
margin-top:20px;
background:#ffebee;
padding:20px;
border-radius:10px;
">

<h3>
🔴 Live Location
</h3>

<a
href="${liveLocationUrl}"
target="_blank"
style="
background:#c62828;
color:white;
padding:13px 20px;
text-decoration:none;
border-radius:6px;
">

📍 Open Live Location

</a>

</div>

`
    : ""
}


<p
style="
margin-top:25px;
color:#777;
font-size:13px;
">

Automated emergency alert from
Sakhi RakshaMitra.

</p>

</div>

`;


      const result =
        await sendEmail(

          recipients,

          "🚨 SOS ALERT - Sakhi RakshaMitra",

          text,

          html

        );


      const sentAt =
        new Date();


      const historyRecord = {

        id:
          createId(
            "sos-"
          ),

        sentAt:
          sentAt.toISOString(),

        date:
          sentAt.toLocaleDateString(
            "en-IN"
          ),

        time:
          sentAt.toLocaleTimeString(
            "en-IN"
          ),

        recipients:
          recipients.map(
            email => ({

              email,

              sentAt:
                sentAt.toISOString(),

            })
          ),

        recipientCount:
          recipients.length,

        latitude:
          locationAvailable
            ? latitude
            : null,

        longitude:
          locationAvailable
            ? longitude
            : null,

        accuracy:
          accuracy !== null &&
          Number.isFinite(accuracy)
            ? accuracy
            : null,

        googleMapsUrl:
          locationUrl,

        locationId,

        liveLocationUrl,

      };


      sosHistory.push(
        historyRecord
      );


      console.log(
        "✅ SOS EMAIL SENT"
      );


      return res.json({

        success:
          true,

        message:
          "SOS email sent successfully.",

        recipientCount:
          recipients.length,

        locationUrl,

        liveLocationUrl,

        sentAt:
          historyRecord.sentAt,

        messageId:
          result.messageId,

      });


    } catch (error) {

      console.log(
        "❌ SOS EMAIL ERROR:",
        error.message
      );


      return res.status(500).json({

        success:
          false,

        message:
          "Failed to send SOS email.",

        error:
          error.message,

      });

    }

  }
);


// =====================================================
// SOS HISTORY
// =====================================================

app.get(
  "/sos-history",
  (req, res) => {

    res.json({

      success:
        true,

      count:
        sosHistory.length,

      history:
        sosHistory,

    });

  }
);


// =====================================================
// SOS HISTORY BY EMAIL
// =====================================================

app.get(
  "/sos-history-by-email",
  (req, res) => {

    const email =
      String(
        req.query.email ||
        ""
      )
      .trim()
      .toLowerCase();


    if (!email) {

      return res.status(400).json({

        success:
          false,

        message:
          "Email is required.",

      });

    }


    const records =
      sosHistory.filter(
        record =>
          record.recipients.some(
            recipient =>
              recipient.email ===
              email
          )
      );


    return res.json({

      success:
        true,

      email,

      count:
        records.length,

      history:
        records,

    });

  }
);


// =====================================================
// DELETE SOS HISTORY
// =====================================================

app.delete(
  "/sos-history",
  (req, res) => {

    sosHistory.length =
      0;

    res.json({

      success:
        true,

      message:
        "SOS history cleared.",

    });

  }
);


// =====================================================
// LIVE LOCATION WEBPAGE
// =====================================================

app.get(
  "/live-location",
  (req, res) => {

    const locationId =
      req.query.locationId;


    if (!locationId) {

      return res.status(400).send(`

<!DOCTYPE html>

<html>

<body
style="
font-family:Arial;
text-align:center;
padding:40px;
">

<h2>
Sakhi RakshaMitra
</h2>

<p>
Location ID is missing.
</p>

</body>

</html>

`);

    }


    const session =
      liveLocations.get(
        locationId
      );


    if (!session) {

      return res.status(404).send(`

<!DOCTYPE html>

<html>

<body
style="
font-family:Arial;
text-align:center;
padding:40px;
">

<h2>
Sakhi RakshaMitra
</h2>

<p>
Live location session not found.
</p>

<p>
The server may have restarted.
</p>

</body>

</html>

`);

    }


    const safeLocationId =
      JSON.stringify(
        locationId
      );


    res.send(`

<!DOCTYPE html>

<html>

<head>

<meta charset="UTF-8">

<meta
name="viewport"
content="width=device-width,initial-scale=1.0"
/>

<title>
Sakhi RakshaMitra - Live Location
</title>

<style>

body {

  margin:0;

  padding:20px;

  background:#f5f5f5;

  font-family:Arial;

}

.container {

  max-width:650px;

  margin:auto;

  background:white;

  padding:20px;

  border-radius:15px;

  box-shadow:
    0 2px 10px
    rgba(0,0,0,0.15);

}

.header {

  background:#c62828;

  color:white;

  padding:20px;

  border-radius:10px;

  text-align:center;

}

.location {

  margin-top:20px;

  padding:20px;

  background:#f7f7f7;

  border-radius:10px;

}

.value {

  font-size:18px;

  margin:12px 0;

}

.button {

  display:block;

  text-align:center;

  background:#c62828;

  color:white;

  padding:15px;

  border-radius:8px;

  text-decoration:none;

  margin-top:20px;

  font-weight:bold;

}

.status {

  text-align:center;

  margin-top:20px;

  color:#555;

}

.alert {

  display:none;

  margin-top:20px;

  padding:15px;

  background:#ffebee;

  color:#c62828;

  border-radius:8px;

  font-weight:bold;

}

</style>

</head>

<body>

<div class="container">

<div class="header">

<h1>
📍 LIVE LOCATION
</h1>

<p>
Sakhi RakshaMitra
</p>

</div>


<div class="location">

<h2>
Current Location
</h2>

<div
class="value"
id="latitude"
>
Loading...
</div>

<div
class="value"
id="longitude"
>
Loading...
</div>

<div
class="value"
id="accuracy"
>
Accuracy: -
</div>

<div
class="value"
id="updated"
>
Last updated: -
</div>

<div
class="value"
id="journeyStatus"
>
Journey: -
</div>


<a
id="googleMaps"
class="button"
href="#"
target="_blank"
>

📍 Open in Google Maps

</a>

</div>


<div
id="deviation"
class="alert"
>

🚨 ROUTE DEVIATION DETECTED

<br>

The user appears to be outside the planned journey route.

</div>


<div
class="status"
id="status"
>

Connecting...

</div>


</div>


<script>

const locationId =
${safeLocationId};


// =====================================================
// LOAD LOCATION
// =====================================================

async function loadLocation() {

  try {

    const response =
      await fetch(
        "/api/live-location/" +
        encodeURIComponent(
          locationId
        )
      );


    if (!response.ok) {

      throw new Error(
        "Location unavailable"
      );

    }


    const data =
      await response.json();


    if (!data.success) {

      throw new Error(
        data.message ||
        "Location unavailable"
      );

    }


    const latitude =
      Number(
        data.latitude
      );

    const longitude =
      Number(
        data.longitude
      );


    document.getElementById(
      "latitude"
    ).innerHTML =
      "<strong>Latitude:</strong> " +
      latitude.toFixed(6);


    document.getElementById(
      "longitude"
    ).innerHTML =
      "<strong>Longitude:</strong> " +
      longitude.toFixed(6);


    document.getElementById(
      "accuracy"
    ).innerHTML =
      "<strong>GPS Accuracy:</strong> " +
      (
        data.accuracy !== null &&
        data.accuracy !== undefined
          ? data.accuracy +
            " meters"
          : "Unavailable"
      );


    document.getElementById(
      "updated"
    ).innerHTML =
      "<strong>Last updated:</strong> " +
      new Date(
        data.updatedAt
      ).toLocaleString();


    document.getElementById(
      "journeyStatus"
    ).innerHTML =
      data.active
        ? "🟢 Journey/Sharing Active"
        : "🔴 Sharing Stopped";


    document.getElementById(
      "googleMaps"
    ).href =
      "https://www.google.com/maps?q=" +
      latitude +
      "," +
      longitude;


    document.getElementById(
      "status"
    ).innerHTML =
      data.active
        ? "🟢 Live location is updating automatically."
        : "🔴 Live location sharing has stopped.";


    // -------------------------------------------------
    // ASK SERVER FOR JOURNEY STATUS
    // -------------------------------------------------

    if (
      data.journeyId
    ) {

      try {

        const journeyResponse =
          await fetch(
            "/journey/" +
            encodeURIComponent(
              data.journeyId
            )
          );


        if (
          journeyResponse.ok
        ) {

          const journeyData =
            await journeyResponse.json();


          if (
            journeyData.success &&
            journeyData.journey
          ) {

            const deviation =
              journeyData.journey
                .routeDeviation;


            if (
              deviation &&
              deviation.active
            ) {

              document.getElementById(
                "deviation"
              ).style.display =
                "block";

            } else {

              document.getElementById(
                "deviation"
              ).style.display =
                "none";

            }

          }

        }

      } catch (error) {

        console.log(
          "Journey status error:",
          error
        );

      }

    }


  } catch (error) {

    console.log(
      error
    );


    document.getElementById(
      "status"
    ).innerHTML =
      "⚠️ Unable to update location. Retrying...";

  }

}


// First load.

loadLocation();


// Update every 5 seconds.

setInterval(
  loadLocation,
  5000
);

</script>

</body>

</html>

`);

  }
);


// =====================================================
// START SERVER
// =====================================================

app.listen(
  PORT,
  "0.0.0.0",
  () => {

    console.log("");

    console.log(
      "======================================"
    );

    console.log(
      "SAKHI RAKSHAMITRA SERVER"
    );

    console.log(
      "======================================"
    );

    console.log(
      `Server running on port ${PORT}`
    );

    console.log(
      `Local URL: http://localhost:${PORT}`
    );

    console.log(
      `Android Emulator URL: http://10.0.2.2:${PORT}`
    );

    console.log(
      `Public URL: ${PUBLIC_URL}`
    );

    console.log("");

    console.log(
      "AVAILABLE ENDPOINTS"
    );

    console.log(
      "--------------------------------------"
    );

    console.log(
      "GET  /"
    );

    console.log(
      "POST /create-journey"
    );

    console.log(
      "POST /update-journey-location"
    );

    console.log(
      "POST /stop-journey"
    );

    console.log(
      "GET  /journey/:journeyId"
    );

    console.log(
      "GET  /journeys"
    );

    console.log(
      "POST /create-live-location"
    );

    console.log(
      "POST /update-location"
    );

    console.log(
      "GET  /api/live-location/:locationId"
    );

    console.log(
      "POST /stop-live-location"
    );

    console.log(
      "GET  /live-location?locationId=..."
    );

    console.log(
      "POST /request-safety-check"
    );

    console.log(
      "GET  /safety-check/pending/:journeyId"
    );

    console.log(
      "POST /safety-check/respond"
    );

    console.log(
      "GET  /safety-check/:safetyCheckId"
    );

    console.log(
      "POST /send-sos"
    );

    console.log(
      "GET  /sos-history"
    );

    console.log(
      "GET  /sos-history-by-email?email=..."
    );

    console.log(
      "DELETE /sos-history"
    );

    console.log(
      "--------------------------------------"
    );

    console.log(
      "Route deviation threshold: 3000 meters"
    );

    console.log(
      "======================================"
    );

  }
);