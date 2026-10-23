import mongoose from 'mongoose';
import News from './models/News.js';

const seed = async () => {
  try {
    await mongoose.connect('mongodb://127.0.0.1:27017/icdesign_lab');
    console.log('Connected to DB. Seeding...');

    const categories = ['World News', 'Vietnam News', 'Jobs'];
    let count = 0;

    for (const cat of categories) {
      for (let i = 1; i <= 50; i++) {
        const isJob = cat === 'Jobs';
        // Interleave Hanoi to test filtering
        const city = isJob && i % 2 === 0 ? 'Hanoi' : (isJob ? 'Ho Chi Minh' : '');
        const publishedAt = new Date();
        publishedAt.setDate(publishedAt.getDate() - (i % 15)); // Spread over 15 days
        
        const news = new News({
          title: `Sample ${cat} Item ${i}`,
          url: `https://example.com/sample-${cat.replace(/\s+/g, '-').toLowerCase()}-${i}`,
          source: isJob ? `Tech Company ${i % 5 + 1}` : `News Agency ${i % 3 + 1}`,
          summary: `This is an auto-generated sample summary for ${cat} item ${i}. It is used to test the pagination and filtering features of the application. ${isJob ? 'Location: ' + city : ''}`,
          content: `Full content for ${cat} article ${i}. This is just dummy data.`,
          publishedAt: publishedAt,
          createdAt: new Date(),
          updatedAt: new Date(),
          category: cat,
          status: 'approved', // Pre-approved so it shows up immediately
          score: Math.floor(Math.random() * 20) + 80,
          thumbnail: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&q=80&w=300&h=200',
          tags: isJob ? [city, 'Engineer'] : ['Tech', 'Semiconductor']
        });
        await news.save();
        count++;
      }
    }
    
    console.log(`Successfully seeded ${count} items (50 per category) with 'approved' status.`);
    process.exit(0);
  } catch (err) {
    console.error('Error seeding DB:', err);
    process.exit(1);
  }
};

seed();
