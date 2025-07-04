const mongoose = require('mongoose');
require('dotenv').config(); // ✅ *** THIS IS THE FIX ***
const connectDB = require('./config/db');
const Category = require('./models/Category');

// The main migration function
async function migrateImageIds() {
  try {
    // 1. Establish database connection using your existing function
    console.log("Connecting to database...");
    await connectDB();
    console.log("✅ Database connected.");

    let updatedCount = 0;
    
    // 2. Find all categories where at least one image is missing an _id
    const categoriesToUpdate = await Category.find({ "images._id": { $exists: false } });

    if (categoriesToUpdate.length === 0) {
      console.log("✅ No categories need migration. All images already have an _id.");
      return; // Exit if there's nothing to do
    }

    console.log(`Found ${categoriesToUpdate.length} categories to migrate...`);

    // 3. Loop through each category and trigger a save
    for (const category of categoriesToUpdate) {
        await category.save();
        updatedCount++;
        console.log(`  -> Migrated _ids for category: ${category.name} (${category.categoryId})`);
    }

    console.log(`\n✅ Migration complete! Successfully updated ${updatedCount} categories.`);

  } catch (error) {
    console.error("❌ An error occurred during migration:", error);
  } finally {
    // 4. Ensure the database connection is closed
    await mongoose.connection.close();
    console.log("Database connection closed.");
  }
}

// Execute the migration function
migrateImageIds();