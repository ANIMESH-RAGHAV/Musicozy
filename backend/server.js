const express = require('express');
const axios = require('axios');
require('dotenv').config();
const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const historyRoutes = require('./routes/historyRoutes');


const app = express();
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.YT_Key;

app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/history', historyRoutes);

const Restricted_words = ['karaoke', 'live'];
const min_time = 60;   
const max_time = 500;  

function parseDuration(iso) {
  const match = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || '');
  if(!match){
    return 0;
  }
  // match = [id, hrs, mins, secs] Note: can use id again from here if needed -> checkpoint
  const h = parseInt(match[1] || '0', 10);
  const m = parseInt(match[2] || '0', 10);
  const s = parseInt(match[3] || '0', 10);
  return h*3600 + m*60 + s;
}

function isValidVideo1(item) {
  return ((item.id) && (item.id.kind==='youtube#video'));
}

function isValidVideo2(item) {
  const title = item.snippet.title.toLowerCase();
  return !Restricted_words.some(function(word) {
    return (title.includes(word));
  });
}


async function attachDurations(items) {
  if(items.length===0){
    return [];
  }

  const ids = items.map(
    function(item){
        return item.id.videoId; 
    }
  ).join(',');

  const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
    params: {
      part: 'contentDetails',
      id: ids,
      key: API_KEY
    }
  });

  const IdDurationMap = {};
  response.data.items.forEach(function(video) {
    IdDurationMap[video.id] = parseDuration(video.contentDetails.duration);
  });

  return items
    .map(function(item) {
      return { item: item, seconds: IdDurationMap[item.id.videoId] || 0 };
    })
    .filter(function(entry) {
      return (entry.seconds >= min_time) && (entry.seconds <= max_time);
    });
}

function formatTracks(entries) {
  return entries.map(function(entry, idx) {
    const item = entry.item;

    return {
      rankId: idx + 1,
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnail: item.snippet.thumbnails.high.url,  //  Choosing high for now, If Image is not displayed properly, change it to medium or low.
      publishedAt: item.snippet.publishedAt,
      durationSeconds: entry.seconds
    };
  });
}

app.get('/api/search', async function(req, res) {
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ error: 'Query parameter "q" is required.' });
  }

  try {
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        q: query + ' official audio',
        type: 'video',
        videoCategoryId: '10',
        maxResults: 25,        
        key: API_KEY
      }
    });
    let items = response.data.items.filter(isValidVideo1).filter(isValidVideo2);

    const entries = await attachDurations(items);
    const tracks = formatTracks(entries.slice(0, 10));

    res.json({
      query: query,
      totalResults: tracks.length,
      tracks: tracks
    });

  } catch (error) {
    const errorMsg = error.response && error.response.data ? error.response.data : error.message;
    console.error('YouTube API Error:', errorMsg);
    res.status(500).json({ error: 'Failed to fetch search results from YouTube backend.' });
  }
});

async function startServer() {
  await connectDB();
  app.listen(PORT, function() {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();