"use strict";
require('dotenv').config();

const express = require("express");
const mongo = require("mongodb");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const dns = require("dns");
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

// MongoDB bağlantısı
const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL;
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function() {
  console.log("we're connected!");
});

//Schema and Model
const urlSchema = new mongoose.Schema({
  id: Number,
  url: String
});

const urlModel = mongoose.model("url", urlSchema);

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use("/public", express.static(process.cwd() + "/public"));

// Helper function to extract hostname
function extractHostname(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    return null;
  }
}

// Routes
app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

app.get("/api/author", function(req, res) {
  res.json({ greeting: "SpeX" });
});

// URL Shortener endpoints
app.post("/api/shorturl/new", function(req, res) {
  const originalUrl = req.body.url;
  
  // Try to create URL object to validate format
  try {
    const urlObj = new URL(originalUrl);
    if (!urlObj.protocol || !['http:', 'https:'].includes(urlObj.protocol)) {
      return res.json({ error: "invalid url" });
    }
    
    // Extract hostname for DNS lookup
    const hostname = urlObj.hostname.replace(/^www\./, '');
    
    dns.lookup(hostname, (err, address) => {
      if (err) {
        res.json({ error: "invalid url" });
      } else {
        urlModel
          .find()
          .exec()
          .then(data => {
            new urlModel({
              id: data.length + 1,
              url: originalUrl
            })
              .save()
              .then(() => {
                res.json({
                  original_url: originalUrl,
                  short_url: data.length + 1
                });
              })
              .catch(err => {
                res.json({ error: "invalid url" });
              });
          });
      }
    });
  } catch (error) {
    res.json({ error: "invalid url" });
  }
});

app.get("/api/shorturl/:number", function(req, res) {
  urlModel
    .find({ id: req.params.number })
    .exec()
    .then(url => {
      if (url.length === 0) {
        return res.json({ error: "No short URL found for the given input" });
      }
      res.redirect(url[0].url);
    })
    .catch(err => {
      res.json({ error: "No short URL found for the given input" });
    });
});

app.listen(port, function() {
  console.log("Node.js listening on port " + port);
});
