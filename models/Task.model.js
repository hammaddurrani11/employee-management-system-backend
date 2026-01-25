const mongoose = require('mongoose');

const taskScehma = mongoose.Schema({
    taskTitle: {
        type: String,
        trim: true,
        required: true
    },
    taskDate: {
        type: String,
        required: true
    },
    taskAssign: {
        type: String,
        trim: true,
        required: true
    },
    taskCategory: {
        type: String,
        trim: true,
        required: true
    },
    taskDescription: {
        type: String,
        trim: true,
        required: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'employee'
    }
})

const task = mongoose.model('tasks', taskScehma);
module.exports = task