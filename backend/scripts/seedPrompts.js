const mongoose = require('mongoose');
const Prompt = require('../models/Prompt');
require('dotenv').config();

const prompts = [
  {
    text: "A cat wearing a superhero cape flying through the clouds",
    category: "animals",
    difficulty: "medium"
  },
  {
    text: "A magical tree house with glowing windows in an enchanted forest",
    category: "scenes",
    difficulty: "hard"
  },
  {
    text: "A robot making pancakes in a futuristic kitchen",
    category: "characters",
    difficulty: "medium"
  },
  {
    text: "A simple coffee cup with steam rising from it",
    category: "objects",
    difficulty: "easy"
  },
  {
    text: "An underwater city with fish swimming between the buildings",
    category: "scenes",
    difficulty: "hard"
  },
  {
    text: "A friendly dragon reading a book under a rainbow",
    category: "characters",
    difficulty: "medium"
  },
  {
    text: "A bicycle with flowers growing out of its basket",
    category: "objects",
    difficulty: "easy"
  },
  {
    text: "Swirling galaxies and stars forming a cosmic dance",
    category: "abstract",
    difficulty: "hard"
  },
  {
    text: "A penguin wearing sunglasses on a beach",
    category: "animals",
    difficulty: "easy"
  },
  {
    text: "A castle made entirely of ice cream and candy",
    category: "scenes",
    difficulty: "medium"
  }
];

async function seedPrompts() {
  try {
    console.log('🌱 Starting prompt seeding...');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('📦 Connected to MongoDB');
    
    // Clear existing prompts (optional - remove this if you want to keep existing ones)
    const existingCount = await Prompt.countDocuments();
    console.log(`📊 Found ${existingCount} existing prompts`);
    
    if (existingCount > 0) {
      console.log('🧹 Clearing existing prompts...');
      await Prompt.deleteMany({});
      console.log('✅ Existing prompts cleared');
    }
    
    // Insert new prompts
    console.log('📝 Inserting new prompts...');
    const insertedPrompts = await Prompt.insertMany(prompts);
    
    console.log(`✅ Successfully seeded ${insertedPrompts.length} prompts:`);
    insertedPrompts.forEach((prompt, index) => {
      console.log(`  ${index + 1}. [${prompt.difficulty.toUpperCase()}] ${prompt.text} (${prompt.category})`);
    });
    
    // Test random prompt selection
    console.log('\n🎲 Testing random prompt selection...');
    const randomPrompt = await Prompt.getRandomPrompt();
    console.log(`Random prompt: "${randomPrompt.text}" (${randomPrompt.category}, ${randomPrompt.difficulty})`);
    
    console.log('\n🎉 Prompt seeding completed successfully!');
    
  } catch (error) {
    console.error('❌ Error seeding prompts:', error);
  } finally {
    // Close connection
    await mongoose.connection.close();
    console.log('🔌 MongoDB connection closed');
    process.exit(0);
  }
}

// Run the seeding
seedPrompts();