"use strict";
require('dotenv').config();

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");
const dns = require("dns");
const app = express();

// Basic Configuration
const port = process.env.PORT || 3000;

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || process.env.MONGO_URL;
mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", function() {
  console.log("we're connected!");
});

// Schema and Model
const urlSchema = new mongoose.Schema({
  original_url: String,
  short_url: Number
});

const Url = mongoose.model("Url", urlSchema);

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use("/public", express.static(process.cwd() + "/public"));

// Routes
app.get("/", function(req, res) {
  res.sendFile(process.cwd() + "/views/index.html");
});

// URL Shortener endpoints
app.post("/api/shorturl", async function(req, res) {
  const url = req.body.url;
  
  // Check URL format
  try {
    const urlObj = new URL(url);
    if (!urlObj.hostname) {
      return res.json({ error: 'invalid url' });
    }
    
    // DNS lookup
    dns.lookup(urlObj.hostname, async (err, address) => {
      if (err) {
        return res.json({ error: 'invalid url' });
      }
      
      try {
        // Check if URL already exists
        let doc = await Url.findOne({ original_url: url });
        
        if (doc) {
          return res.json({
            original_url: doc.original_url,
            short_url: doc.short_url
          });
        }
        
        // Create new short URL
        const count = await Url.countDocuments();
        const shortUrl = count + 1;
        
        const newUrl = new Url({
          original_url: url,
          short_url: shortUrl
        });
        
        await newUrl.save();
        
        res.json({
          original_url: url,
          short_url: shortUrl
        });
      } catch (err) {
        res.json({ error: 'invalid url' });
      }
    });
  } catch (err) {
    res.json({ error: 'invalid url' });
  }
});

app.get("/api/shorturl/:short_url", async function(req, res) {
  try {
    const short_url = parseInt(req.params.short_url);
    const url = await Url.findOne({ short_url: short_url });
    
    if (!url) {
      return res.json({ error: 'No short URL found for the given input' });
    }
    
    res.redirect(url.original_url);
  } catch (err) {
    res.json({ error: 'No short URL found for the given input' });
  }
});

app.listen(port, function() {
  console.log("Node.js listening on port " + port);
});
