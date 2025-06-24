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
const { Storage } = require('@google-cloud/storage');
const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
const uuid = require('uuid').v4;

const client = new SecretManagerServiceClient();

let storage;

async function getStorage() {
  if (!storage) {
    const [version] = await client.accessSecretVersion({
      name: 'projects/1067354145699/secrets/gcs-service-account-key/versions/latest',
    });

    const serviceAccountKey = JSON.parse(version.payload.data.toString());
    storage = new Storage({
      credentials: serviceAccountKey,
      projectId: 'b-profiles-461910',
    });
  }
  return storage;
}

exports.uploadBufferToGCS = async (buffer, filename, folder = 'uploads') => {
  const storage = await getStorage();
  const bucket = storage.bucket('3bprofiles-products');

  return new Promise((resolve, reject) => {
    const gcsFileName = `${folder}/${uuid()}-${filename}`;
    const file = bucket.file(gcsFileName);

    const stream = file.createWriteStream({
      metadata: {
        contentType: 'auto'
      }
    });

    stream.on('error', reject);
    stream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${gcsFileName}`;
      resolve(publicUrl);
    });

    stream.end(buffer);
  });
};
