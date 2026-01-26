const express = require('express');
const app = express();

const mongoose = require('mongoose');

const dotenv = require('dotenv');
dotenv.config();

// const connectToDB = require('./config/db');
// connectToDB();

// Initialize database connection once on startup
isConnected = false;

async function connectToDB() {
    if (isConnected) return;
    
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 1,
            minPoolSize: 1,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            socketKeepAliveMS: 30000,
            keepAlive: true,
            retryWrites: true,
            w: 'majority',
            journal: true,
        });
        console.log('Connected to Database');
        isConnected = true;
    }
    catch (err) {
        console.error('Database connection error:', err);
        isConnected = false;
        throw err;
    }
}

// Connect to DB immediately on startup
connectToDB().catch(err => console.error('Initial DB connection failed:', err));

// Body parsing middleware MUST come BEFORE routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const cookieParser = require('cookie-parser');
app.use(cookieParser());

const cors = require('cors');
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true
}));

// Reconnect middleware
app.use(async (req, res, next) => {
    if (!isConnected) {
        try {
            await connectToDB();
        } catch (err) {
            console.error('Failed to connect to DB:', err);
            return res.status(503).json({ 
                error: 'Internal Server Error',
                message: 'Database connection unavailable'
            });
        }
    }
    next();
})

const userRouter = require('./routes/user.routes');
app.use('/', userRouter);

// app.listen(3000, () => {
//     console.log('App Listening on Port 3000');
// });

module.exports = app;