const express = require('express');
const Jimp = require('jimp');
const multer = require('multer'); 
const app = express();
const port = process.env.PORT || 3000;
const storage = multer.memoryStorage(); 
const upload = multer({ storage: storage });

app.get('/', (req, res) => {
  res.send(
    '<form action="/processImage" method="post" enctype="multipart/form-data">' +
      '<input type="file" name="image" />' +
      '<input type="submit" value="Upload Image" />' +
      '</form>'
  );
});

// Define a route for image processing
app.post('/processImage', upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      // No file provided
      return res.status(400).send('No image file uploaded.');
    }

    // Use Jimp to process the image
    console.log('Received POST request to /processImage');
    const image = await Jimp.read(req.file.buffer);

    // Perform glare removal
    removeGlare(image);

    // Send the processed image back to the client
    const processedBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);
    res.writeHead(200, {
      'Content-Type': Jimp.MIME_JPEG,
      'Content-Length': processedBuffer.length,
    });
    res.end(processedBuffer);
  } catch (error) {
    console.error('Error processing image:', error);
    next(error); // Pass the error to the next middleware
  }
});

function removeGlare(image) {
  image.greyscale();
  image.blur(1)
  const threshold = 300; 
  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    if (this.bitmap.data[idx] > threshold) {
      this.bitmap.data[idx] = 100;
      this.bitmap.data[idx + 1] = 100;
      this.bitmap.data[idx + 2] = 100;
    }
  });

  const minMaxValues = getMinMaxValues(image);
  if (minMaxValues.maxVal >= 253.0 && minMaxValues.minVal > 0.0 && minMaxValues.minVal < 20.0) {
    image.brightness(-0.5); 
    image.contrast(0.25)
    image.color([{ apply: 'mix', params: ['#ff0000', 15] }]);
    image.convolute([[-1, -1, -1], [-1, 9, -1], [-1, -1, -1]])
  } 
}

function getMinMaxValues(image) {
  let minVal = 255;
  let maxVal = 0;

  image.scan(0, 0, image.bitmap.width, image.bitmap.height, function (x, y, idx) {
    const brightness = this.bitmap.data[idx];
    minVal = Math.min(minVal, brightness);
    maxVal = Math.max(maxVal, brightness);
  });

  return { minVal, maxVal };
}


app.get('/', (req, res) => {
  res.send(
    '<form action="/processImage" method="post" enctype="multipart/form-data">' +
      '<input type="file" name="image" />' +
      '<input type="submit" value="Upload Image" />' +
      '</form>'
  );
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
