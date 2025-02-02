// media responses

const fs = require('fs');
const path = require('path');

// Reusable function to stream media files
const streamFile = (request, response, filePath, contentType) => {
  const file = path.resolve(__dirname, `../client/${filePath}`);

  // The callback of this function receives an err field and a stats object. If the err field
  // is not null, then there was an error. In that event we will respond with an error. If
  // the error code is ‘ENOENT’ (Error No Entry), then the file could not be found. We
  // will set the status code to 404. In the event of any error, we will send the error
  // back to the client for now.

  fs.stat(file, (err, stats) => {
    if (err) {
      if (err.code === 'ENOENT') {
        response.writeHead(404);
      }
      response.end(err);
      return;
    }

    // The code “let { range } = request.headers; is making use of a feature of ES6
    // javascript known as a destructuring assignment. Essentially what this code says
    // is “grab the range element out of the request.headers object, and store it in a
    // new variable I am making called range
    // let { range } = request.headers;

    let { range } = request.headers;
    if (!range) {
      range = 'bytes=0-';
    }

    // Next, we just need to check if we got an end position from the client. If not, we
    // will just set our end position to the end of the file.If so, we will parse it into base
    // 10. In the event that the start range is greater than the end range, we will need to
    // reset the start range

    const positions = range.replace(/bytes=/, '').split('-');
    let start = parseInt(positions[0], 10);
    const total = stats.size;
    const end = positions[1] ? parseInt(positions[1], 10) : total - 1;

    if (start > end) {
      start = end - 1;
    }

    // Now we will need to determine how big of a chunk we are sending back to the
    // browser (in bytes).
    // For a streaming file we need to send back the 206 success code (partial
    // content). This tells the browser that it can request other ranges (before or after),
    // but it has not received the entire file.

    const chunksize = (end - start) + 1;

    response.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    });

    // When the file opens, we will connect the file stream to our response with the
    // stream’s pipe function. The pipe function is a stream function in node that will set
    // the output of a stream to another stream. In our case, this is key to keep it
    // lightweight

    const stream = fs.createReadStream(file, { start, end });

    stream.on('open', () => {
      stream.pipe(response);
    });

    stream.on('error', (streamErr) => {
      response.end(streamErr);
    });
  });
};

// Handlers for specific media files
const getParty = (request, response) => streamFile(request, response, 'party.mp4', 'video/mp4');
const getBling = (request, response) => streamFile(request, response, 'bling.mp3', 'audio/mpeg');
const getBird = (request, response) => streamFile(request, response, 'bird.mp4', 'video/mp4');

module.exports = { getParty, getBling, getBird };
