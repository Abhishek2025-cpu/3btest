const { Storage } = require('@google-cloud/storage');
const path = require('path');
const uuid = require('uuid').v4;

const storage = new Storage({
 keyFilename: path.resolve('gcs-key.json'),

  projectId: 'b-profiles-461910'
});

const bucket = storage.bucket('3bprofiles-products');

exports.uploadBufferToGCS = (buffer, filename, folder = 'uploads') => {
  return new Promise((resolve, reject) => {
    const gcsFileName = `${folder}/${uuid()}-${filename}`;
    const file = bucket.file(gcsFileName);

    const stream = file.createWriteStream({
      metadata: {
        contentType: 'auto'
      }
    });

    stream.on('error', err => reject(err));

    stream.on('finish', () => {
      file.makePublic().then(() => {
        resolve(`https://storage.googleapis.com/${bucket.name}/${gcsFileName}`);
      });
    });

    stream.end(buffer);
  });
};
