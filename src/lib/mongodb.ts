import mongoose from 'mongoose';

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI가 없습니다.');
}

interface Cached {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const cached: Cached = (global as any).mongoose || { conn: null, promise: null };

if (process.env.NODE_ENV === 'development') {
  (global as any).mongoose = cached;
}

export const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: true,
    };

    cached.promise = mongoose.connect(process.env.MONGODB_URI!, opts)
      .then((mongoose) => {
        console.log('MongoDB 연결 성공!');
        return mongoose;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error('MongoDB 연결 실패:', error);
    throw error;
  }

  return cached.conn;
}; 