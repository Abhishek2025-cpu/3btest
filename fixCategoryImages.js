require('dotenv').config(); // Make sure you have a .env file in your project root
const mongoose = require('mongoose');
const Category = require('./models/Category'); // adjust path if needed

async function fixImages() {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI is not set in your .env file');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const categories = await Category.find({});

  for (const cat of categories) {
    let changed = false;
    cat.images = cat.images.map(img => {
      if (typeof img.url === 'object' && img.url.url) {
        changed = true;
        return { id: img.url.id, url: img.url.url };
      }
      return img;
    });

    if (changed) await cat.save();
  }

  console.log('✅ All categories fixed!');
  mongoose.disconnect();
}

fixImages().catch(err => {
  console.error(err);
  mongoose.disconnect();
});
