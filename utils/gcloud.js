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

// const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
// const { Storage } = require('@google-cloud/storage');
// const uuid = require('uuid').v4;

// let storage; // Cached storage client

// async function getStorage() {
//   if (storage) return storage;

//   const secretClient = new SecretManagerServiceClient();
// const [version] = await secretClient.accessSecretVersion({
//   name: 'projects/1067354145699/secrets/gcs-key-2/versions/latest',
// });


//   const key = JSON.parse(version.payload.data.toString());
//   storage = new Storage({ credentials: key, projectId: 'b-profiles-461910' });
//   return storage;
// }

// exports.uploadBufferToGCS = async (buffer, filename, folder = 'uploads') => {
//   const storage = await getStorage();
//   const bucket = storage.bucket('3bprofiles-products');

//   const gcsFileName = `${folder}/${uuid()}-${filename}`;
//   const file = bucket.file(gcsFileName);

//   return new Promise((resolve, reject) => {
//     const stream = file.createWriteStream({
//       metadata: {
//         contentType: 'auto',
//       },
//     });

//     stream.on('error', (err) => reject(err));

//     stream.on('finish', () => {
//       const publicUrl = `https://storage.googleapis.com/${bucket.name}/${gcsFileName}`;
//       resolve(publicUrl);
//     });

//     stream.end(buffer);
//   });
// };



// const { SecretManagerServiceClient } = require('@google-cloud/secret-manager');
// const { Storage } = require('@google-cloud/storage');
// const uuid = require('uuid').v4;

// let storage; // Cached storage client instance

// // Define the bucket name as a constant to be used by all functions
// const BUCKET_NAME = '3bprofiles-products';

// // This function correctly fetches credentials and initializes the storage client.
// // It's designed to be called by other functions in this file.
// async function getStorage() {
//   if (storage) return storage; // Return cached client if it exists

//   const secretClient = new SecretManagerServiceClient();
//   const [version] = await secretClient.accessSecretVersion({
//     name: 'projects/1067354145699/secrets/gcs-key-2/versions/latest',
//   });

//   const key = JSON.parse(version.payload.data.toString());
//   // Initialize the cached client
//   storage = new Storage({ credentials: key, projectId: 'b-profiles-461910' });
//   return storage;
// }

// // Your upload function is good, just updated to use the constant for the bucket name.
// exports.uploadBufferToGCS = async (buffer, filename, folder = 'uploads', contentType) => {
//   const storageClient = await getStorage();
//   const bucket = storageClient.bucket(BUCKET_NAME);

//   const gcsFileName = `${folder}/${uuid()}-${filename}`;
//   const file = bucket.file(gcsFileName);

//   return new Promise((resolve, reject) => {
//     const stream = file.createWriteStream({
//       metadata: {
//         contentType: contentType || 'image/jpeg', // Fallback to a common image type
//       },
//       resumable: false, // Recommended for smaller files
//     });

//     stream.on('error', (err) => reject(err));

//     stream.on('finish', () => {
//       // Return the full path (id) and the public URL separately
//       resolve({
//         id: gcsFileName,
//         url: `https://storage.googleapis.com/${bucket.name}/${gcsFileName}`
//       });
//     });

//     stream.end(buffer);
//   });
// };


// // ** THIS IS THE CORRECTED FUNCTION **
// // It was failing because `storage` and `bucketName` were not defined in its scope.
// exports.deleteFileFromGCS = async (fileName) => {
//   try {
//     // 1. Get the initialized storage client, just like the upload function does.
//     const storageClient = await getStorage();

//     // 2. Use the defined BUCKET_NAME constant to get the correct bucket.
//     await storageClient.bucket(BUCKET_NAME).file(fileName).delete();
    
//     console.log(`✅ Successfully deleted ${fileName} from GCS bucket.`);
//   } catch (error) {
//     // This error handling is good and has been kept.
//     if (error.code === 404) {
//       console.warn(`⚠️ File not found in GCS, skipping deletion: ${fileName}`);
//       return; // This is not a failure, the file is already gone.
//     }
//     // For all other errors, we re-throw them to be handled by the controller.
//     console.error(`❌ Error deleting file ${fileName} from GCS:`, error);
//     throw new Error(`Failed to delete file from cloud storage.`);
//   }
// };


// utils/gcloud.js
// const { Storage } = require("@google-cloud/storage");

// let storage;

// if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
//   const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
//   storage = new Storage({ credentials });
// } else {
//   // fallback for local dev
//   storage = new Storage({
//     keyFilename: require("path").join(__dirname, "../bprofiles-54714-firebase-adminsdk-fbsvc-5ae26f5109.json"),
//   });
// }

// const bucket = storage.bucket("3bprofiles-products");

// async function uploadBufferToGCS(buffer, filename, folder, mimetype) {
//   return new Promise((resolve, reject) => {
//     const file = bucket.file(`${folder}/${Date.now()}-${filename}`);
//     const stream = file.createWriteStream({
//       resumable: false,
//       contentType: mimetype,
//     });

//     stream.on("error", reject);
//     stream.on("finish", async () => {
//       await file.makePublic();
//       resolve({
//         url: `https://storage.googleapis.com/${bucket.name}/${file.name}`,
//       });
//     });

//     stream.end(buffer);
//   });
// }

// module.exports = { uploadBufferToGCS };

const { Storage } = require("@google-cloud/storage");

let storage;

if (process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) {
  const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);
  storage = new Storage({ credentials });
} else {
  storage = new Storage({
    keyFilename: require("path").join(
      __dirname,
      "../bprofiles-54714-firebase-adminsdk-fbsvc-5ae26f5109.json"
    ),
  });
}

// 👇 THIS was missing
const BUCKET_NAME = "3bprofiles-products";
const bucket = storage.bucket(BUCKET_NAME);



async function uploadBufferToGCS(buffer, filename, folder, mimetype = "application/octet-stream") {
  return new Promise((resolve, reject) => {
    const uniqueName = `${Date.now()}-${filename}`;
    const filePath = `${folder}/${uniqueName}`;
    const file = bucket.file(filePath);

    const stream = file.createWriteStream({
      resumable: false,
      contentType: mimetype,
    });

    stream.on("error", reject);
    stream.on("finish", () => {
      resolve({
        url: `https://storage.googleapis.com/${bucket.name}/${filePath}`,
        id: filePath, // always matches file.name
      });
    });

    stream.end(buffer);
  });
}


async function deleteFileFromGCS(fileName) {
  try {
    await bucket.file(fileName).delete();
    console.log(`✅ Successfully deleted ${fileName} from GCS bucket.`);
  } catch (error) {
    if (error.code === 404) {
      console.warn(`⚠️ File not found in GCS, skipping deletion: ${fileName}`);
      return;
    }
    console.error(`❌ Error deleting file ${fileName} from GCS:`, error);
    throw new Error(`Failed to delete file from cloud storage.`);
  }
}

// 👇 Export both properly
module.exports = {
  uploadBufferToGCS,
  deleteFileFromGCS,
};


