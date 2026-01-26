const express = require('express');
const app = express();

const mongoose = require('mongoose');

const dotenv = require('dotenv');
dotenv.config();

// const connectToDB = require('./config/db');
// connectToDB();

isConnected = false;

async function connectToDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to Database');
        isConnected = true;
    }
    catch (err) {
        console.error('Database connection error:', err);
    }
}

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

app.use((req, res, next) => {
    if (!isConnected) {
        connectToDB();
    }
    next();
})

const userRouter = require('./routes/user.routes');
app.use('/', userRouter);

// app.listen(3000, () => {
//     console.log('App Listening on Port 3000');
// });

module.exports = app;