import User from '../models/User.js';
import Channel from '../models/Channel.js';
import bcrypt from 'bcryptjs';

export async function initializeDatabase() {
  try {
    // Check if admin user exists
    const adminExists = await User.findOne({ role: 'admin' });
    
    if (!adminExists) {
      // Create default admin user
      const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 12);
      
      const adminUser = new User({
        username: process.env.ADMIN_USERNAME || 'admin',
        email: process.env.ADMIN_EMAIL || 'admin@example.com',
        password: hashedPassword,
        role: 'admin'
      });
      
      await adminUser.save();
      console.log('✅ Default admin user created');
      console.log(`👤 Username: ${adminUser.username}`);
      console.log(`🔑 Password: ${process.env.ADMIN_PASSWORD || 'admin123'}`);
    }

    // Create sample channels if none exist
    const channelCount = await Channel.countDocuments();
    if (channelCount === 0) {
      const sampleChannels = [
        {
          name: 'News Channel',
          description: 'Latest news and updates from around the world',
          category: 'news',
          streamUrl: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
          thumbnail: 'https://images.pexels.com/photos/1201996/pexels-photo-1201996.jpeg?auto=compress&cs=tinysrgb&w=400',
          isActive: true
        },
        {
          name: 'Sports Central',
          description: 'Live sports coverage and highlights',
          category: 'sports',
          streamUrl: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
          thumbnail: 'https://images.pexels.com/photos/274422/pexels-photo-274422.jpeg?auto=compress&cs=tinysrgb&w=400',
          isActive: true
        },
        {
          name: 'Entertainment Tonight',
          description: 'Movies, shows, and entertainment content',
          category: 'entertainment',
          streamUrl: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
          thumbnail: 'https://images.pexels.com/photos/7991579/pexels-photo-7991579.jpeg?auto=compress&cs=tinysrgb&w=400',
          isActive: true
        },
        {
          name: 'Music Live',
          description: 'Live music performances and music videos',
          category: 'music',
          streamUrl: 'https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8',
          thumbnail: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400',
          isActive: true
        }
      ];

      await Channel.insertMany(sampleChannels);
      console.log('✅ Sample channels created');
    }

  } catch (error) {
    console.error('❌ Database initialization error:', error);
  }
}