const mongoose = require('mongoose');

const adminSchema = mongoose.Schema({
    username: {
        type: String,
        required: true,
        trim: true,
        minlength: [3, 'Username must be atleast 3 Characters Long']
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        trim: true,
        minlength: [5, 'Password must be atleast 5 Characters Long']
    }
})

const admin = mongoose.model('admin', adminSchema);
module.exports = admin