const express = require('express');
const fs = require('fs');
const cors = require('cors');


const app = express();
app.use(cors());

let data;
try {
  data = JSON.parse(fs.readFileSync('videos.local.json', 'utf-8'));
} catch(error) {
  data = JSON.parse(fs.readFileSync('videos.json', 'utf-8'));
}

const videoFileMap = {};
data.videos.forEach(v => {
  const name = v.split('/').slice(-1)[0].split('.')[0];
  videoFileMap[name] = v;
});

// return videoFileMap for front-end use
app.get('/videos/data', (req, res) => {
  return res.status(200).json({ "data": videoFileMap });
});

app.get('/videos/:filename', (req, res) => {
  const fileName = req.params.filename;
  const filePath = videoFileMap[fileName];
  if (!filePath) {
    return res.status(404).send('File not found');
  }

  const fullFilePath = `${process.env.BASE_PATH}/${filePath}`;
  const stat = fs.statSync(fullFilePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunkSize = end - start + 1;
    const file = fs.createReadStream(fullFilePath, {start, end});
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunkSize,
      'Content-Type': 'video/mp4'
    };
    res.writeHead(206, head); // partial content
    file.pipe(res);
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4'
    };
    res.writeHead(200, head);
    fs.createReadStream(fullFilePath).pipe(res);
  }
});

app.listen(process.env.PORT, () => {
  console.log(`server is listening on port ${process.env.PORT}`);
});