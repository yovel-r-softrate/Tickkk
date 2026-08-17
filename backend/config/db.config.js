const mongoose = require('mongoose');

require('dotenv').config();

const dbUser = process.env.MONGODB_USER;
const dbPassword = process.env.MONGODB_PASSWORD;
const dbName = process.env.MONGODB_DBNAME || 'tasksdb';
const dbHost = process.env.MONGODB_HOST || 'cluster0.re3ha3x.mongodb.net';

const mongoURI = process.env.MONGODB_URI || `mongodb+srv://${dbUser}:${dbPassword}@${dbHost}/${dbName}?retryWrites=true&w=majority`;

module.exports = async function connectDB() {
    try {
        await mongoose.connect(mongoURI);
        console.log('MongoDB connected');
    } catch (error) {
        console.error('MongoDB connection failed');
        console.error(error);
        process.exit(1);
    }
};