const LOCAL_LOBE_AI_API_URL = 'http://localhost:38101/v1/predict/90d3bafb-dc02-4a8f-b946-2034c6daf151';
const INPUT_DIR = 'input';
const OUTPUT_DIR = 'output';

const fs = require('fs');
const axios = require('axios');
const isImage = require('is-image');

// List all files in a folder as an array
// Need improvement: readdirAsync
const listFiles = (dir) => {
  let results = [];

  fs.readdirSync(dir).forEach((file) => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);

    if (stat && stat.isDirectory()) {
      results = results.concat(listFiles(file));
    } else if (isImage(file)) {
      results.push(file);
    }
  });

  return results;
}

// Encode file data to base64 encoded string
const base64Encode = (file) => {
  const bitmap = fs.readFileSync(file);
  return Buffer.from(bitmap).toString('base64');
}

// Call the local LobeAI API
const getPrediction = async (imageBase64) => {
  try {
    const config = {
      url: LOCAL_LOBE_AI_API_URL,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      data: JSON.stringify({
        'image': imageBase64
      })
    };
    return axios(config);
  } catch (error) {
    console.error(error);
  }
};

const files = listFiles(INPUT_DIR);
files.forEach(async (file) => {
  const base64 = base64Encode(file);
  getPrediction(base64).then((resp) => {
    const predictions = resp.data.predictions;
    // Get the  prediction by the max confidence
    const prediction = predictions.reduce((prev, curr) => {
      return prev.confidence > curr.confidence ? prev : curr;
    });
    prediction.file = file;
    console.log(prediction);

    // Move the file to the output directory by the prediction label
    const outputDir = OUTPUT_DIR + '/' + prediction.label;
    if (!fs.existsSync(outputDir)) {
      fs.mkdir(outputDir, { recursive: true }, err => { });
    }
    fs.renameSync(file, file.replace(INPUT_DIR, outputDir));
  }).catch((error) => {
    console.error(error);
  });
});