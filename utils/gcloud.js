// const { Storage } = require('@google-cloud/storage');
// const path = require('path');
// const uuid = require('uuid').v4;

// const storage = new Storage({
//  keyFilename: path.resolve('gcs-key.json'),

//   projectId: 'b-profiles-461910'
// });

// const bucket = storage.bucket('3bprofiles-products');

// exports.uploadBufferToGCS = (buffer, filename, folder = 'uploads') => {
//   return new Promise((resolve, reject) => {
//     const gcsFileName = `${folder}/${uuid()}-${filename}`;
//     const file = bucket.file(gcsFileName);

//     const stream = file.createWriteStream({
//       metadata: {
//         contentType: 'auto'
//       }
//     });

//     stream.on('error', err => reject(err));

//     stream.on('finish', () => {
//       // Skip makePublic() because UBLA is enabled
//       const publicUrl = `https://storage.googleapis.com/${bucket.name}/${gcsFileName}`;
//       resolve(publicUrl);
//     });

//     stream.end(buffer);
//   });
// };

// gcloud.js

const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const { Storage } = require('@google-cloud/storage');
const uuid = require('uuid').v4;

let storage; // Cached storage client

async function getStorage() {
  if (storage) return storage;

  const secretClient = new SecretManagerServiceClient();

  const [version] = await secretClient.accessSecretVersion({
    name: 'projects/1067354145699/secrets/gcs-service-account-key/versions/latest',
  });

  const key = JSON.parse(version.payload.data.toString());
  storage = new Storage({ credentials: key, projectId: 'b-profiles-461910' });
  return storage;
}

exports.uploadBufferToGCS = async (buffer, filename, folder = 'uploads') => {
  const storage = await getStorage();
  const bucket = storage.bucket('3bprofiles-products');

  const gcsFileName = `${folder}/${uuid()}-${filename}`;
  const file = bucket.file(gcsFileName);

  return new Promise((resolve, reject) => {
    const stream = file.createWriteStream({
      metadata: {
        contentType: 'auto',
      },
    });

    stream.on('error', (err) => reject(err));

    stream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${gcsFileName}`;
      resolve(publicUrl);
    });

    stream.end(buffer);
  });
};

