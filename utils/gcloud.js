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
const { GoogleAuth } = require('google-auth-library');
const uuid = require('uuid').v4;

let storage; // Cached storage client

async function getStorage() {
  if (storage) return storage;

  const secretClient = new SecretManagerServiceClient();

  const [version] = await secretClient.accessSecretVersion({
    name: 'projects/1067354145699/secrets/gcs-service-account-key/versions/latest',
  });

  const key = JSON.parse(version.payload.data.toString());

  // Validate key structure
  if (!key.client_email || !key.private_key || !key.project_id) {
    throw new Error('Invalid service account key from Secret Manager');
  }

  // Create a GoogleAuth client manually
  const auth = new GoogleAuth({
    credentials: key,
    projectId: key.project_id,
    scopes: ['https://www.googleapis.com/auth/cloud-platform'],
  });

  const authClient = await auth.getClient();

  // Initialize GCS Storage client using auth client
  storage = new Storage({
    projectId: key.project_id,
    authClient,
  });

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

    stream.on('error', (err) => {
      console.error('Stream error during GCS upload:', err.message);
      reject(err);
    });

    stream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${gcsFileName}`;
      resolve(publicUrl);
    });

    stream.end(buffer);
  });
};

