const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const AdminModel = require('../models/Admin.model');
const EmployeeModel = require('../models/Employee.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/FetchUser');
const taskModel = require('../models/Task.model');

router.post('/register/admin',
    body('username').trim().isLength({ min: 3 }).withMessage("Username must be atleast 3 Charachters Long"),
    body('email').trim().isEmail(),
    body('password').trim().isLength({ min: 5 }).withMessage("Password must be atleast 5 Charachters Long")
    , async (req, res) => {
        const errors = validationResult(req)

        if (!errors.isEmpty()) {
            return res.status(400).json({
                error: errors.array().map(err => err.msg)
            })
        }

        const { username, email, password } = req.body

        const existingUser = await AdminModel.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                error: 'Email Already Exists'
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await AdminModel.create({
            username: username,
            email: email,
            password: hashedPassword
        })

        res.json(user)
    })

router.post('/login',
    body('email').trim().isEmail(),
    body('password').trim(),
    async (req, res) => {
        try {
            const error = validationResult(req);

            if (!error.isEmpty()) {
                return res.status(400).json({
                    error: error.array().map(err => err.msg)
                })
            }

            const { email, password } = req.body

            let user = await AdminModel.findOne({ email: email });

            if (!user) {
                user = await EmployeeModel.findOne({ email: email });
                if (user) user.role = 'employee';
            }
            else {
                user.role = 'admin'
            }

            if (!user) {
                return res.status(400).json({
                    error: 'Incorrect Email or Password'
                })
            }

            const userPassword = await bcrypt.compare(password, user.password);

            if (!userPassword) {
                return res.status(400).json({
                    error: 'Email or Password is Incorrect'
                })
            }

            const token = jwt.sign({
                userid: user._id,
                username: user.username,
                role: user.role
            }, process.env.JWT_SECRET
            )

            res.cookie('token', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'strict',
            })

            res.json({
                message: 'Logged In Successfully',
                role: user.role,
                token: token
            })
        }
        catch (err) {
            return res.status(500).json({
                error: "Internal Server Error"
            })
        }
    }
)

router.get('/auth/check', authMiddleware, (req, res) => {
    const { userid, username, role } = req.user;
    res.json({
        authenticated: true,
        user: {
            userid,
            username,
            role
        }
    });
});

router.post('/register/employee', authMiddleware,
    body('username').trim().isLength({ min: 3 }).withMessage("Username must be atleast 3 Charachters Long"),
    body('email').trim().isEmail(),
    body('password').trim().isLength({ min: 5 }).withMessage("Password must be atleast 5 Charachters Long")
    , async (req, res) => {
        const error = validationResult(req);

        if (!error.isEmpty()) {
            return res.status(400).json({
                error: error.array().map(err => err.msg)
            })
        }

        const { username, email, password } = req.body;

        const oldUser = await EmployeeModel.findOne({ email: email });

        if (oldUser) {
            return res.status(400).json({
                error: 'Email Already Registered'
            })
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const user = await EmployeeModel.create({
            username: username,
            email: email,
            password: hashedPassword
        })

        res.send(user);
    })

router.post('/createtask', authMiddleware, async (req, res) => {
    try {
        const { taskTitle, taskDate, taskAssign, taskCategory, taskDescription } = req.body

        const employee = await EmployeeModel.findOne({ username: taskAssign });

        if (!employee) {
            return res.status(400).json({
                error: 'Employee not Found'
            })
        }

        const newTask = await taskModel.create({
            taskTitle: taskTitle,
            taskDate: taskDate,
            taskAssign: taskAssign,
            taskCategory: taskCategory,
            taskDescription: taskDescription,
            user: employee._id
        })

        console.log('Employee Before Save:', employee);

        employee.assignedTasks.newTask.push(newTask._id);

        // employee.newTask = (employee.newTask || 0) + 1;

        await employee.save();

        console.log('Employee updated successfully');

        res.status(200).json({
            message: 'Task Created and assigned successfully',
            task: newTask
        })
    }
    catch (err) {
        return res.status(500).json({
            error: 'Server error while creating task'
        })
    }
})

router.post('/logout', (req, res) => {
    res.clearCookie('token', {
        httpOnly: true,
        secure: true,
        sameSite: 'strict'
    })
    res.json({ message: 'Logged Out' })
})

router.get('/fetch-employees', async (req, res) => {
    try {
        const data = await EmployeeModel.find().populate([
            { path: 'assignedTasks.newTask' },
            { path: 'assignedTasks.completed' },
            { path: 'assignedTasks.failed' }
        ])
        res.status(200).json(data);
    }
    catch (err) {
        return res.status(500).json({
            error: 'Server Error'
        })
    }
})

router.get('/fetch-loggedin-user', authMiddleware, async (req, res) => {
    try {
        const data = await EmployeeModel.findById(req.user.userid).populate([
            { path: 'assignedTasks.newTask' },
            { path: 'assignedTasks.completed' },
            { path: 'assignedTasks.failed' }
        ]);
        console.log(req.user.userid);

        if (!data) {
            return res.status(400).json({
                error: 'User Not Found'
            })
        }

        res.json(data);
    }
    catch (err) {
        return res.status(500).json({
            error: err
        })
    }
})

router.put('/update-employee/:id', authMiddleware, async (req, res) => {
    const { username, email, password } = req.body;
    const { id } = req.params;

    try {
        const updatedEmployee = {}
        if (username) {
            updatedEmployee.username = username
        }
        if (email) {
            updatedEmployee.email = email
        }
        if (password) {
            updatedEmployee.password = password
        }

        const employee = await EmployeeModel.findByIdAndUpdate(
            id,
            { $set: updatedEmployee },
            { new: true }
        )

        if (!employee) {
            res.status(401).json({
                error: "Employee Not Found"
            })
        }

        res.status(200).json(employee);
    }
    catch (err) {
        res.status(500).json({
            error: err.message
        })
    }
})

router.delete('/delete-employee/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;

    try {
        const user = await EmployeeModel.findByIdAndDelete(id);

        if (!user) {
            res.status(404).json({
                error: 'User Not Found'
            })
        }

        res.status(200).send({
            message: "Employee Deleted Successfully", user
        })

    }
    catch (err) {
        res.status(500).json({
            error: err.message
        })
    }
})

router.put('/complete-task/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userid;

    try {
        const user = await EmployeeModel.findOne({ _id: userId });

        if (!user) {
            return res.status(404).json({
                error: 'User Not Found'
            })
        }

        const taskIndex = user.assignedTasks.newTask.findIndex(taskId => taskId.toString() === id);
        if (taskIndex === -1) {
            return res.status(404).json({
                error: "Task Not Found"
            })
        }

        user.assignedTasks.newTask.splice(taskIndex, 1);

        if (!user.assignedTasks.completed.some(taskId => taskId.toString() === id)) {
            user.assignedTasks.completed.push(id);
        }

        await user.save();

        res.status(200).json({
            message: "Task Marked as completed"
        })

    }
    catch (err) {
        res.status(500).json({
            error: err.message
        })
    }
})

router.put('/failed-task/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const userId = req.user.userid;

    try {
        const user = await EmployeeModel.findOne({ _id: userId });
        console.log(user);
        if (!user) {
            res.status(400).json({
                error: "User Not Found"
            })
        }

        const taskIndex = user.assignedTasks.newTask.findIndex(taskId => taskId.toString() === id);
        if (taskIndex === -1) {
            res.status(404).json({
                error: "Task Not Found"
            })
        }

        if (!user.assignedTasks.newTask.includes(id)) {
            return res.status(403).json({
                error: "Task not assigned to this user"
            });
        }

        user.assignedTasks.newTask.splice(taskIndex, 1);

        if (!user.assignedTasks.failed.some(taskId => taskId.toString() === id)) {
            user.assignedTasks.failed.push(id);
        }

        await user.save();

        res.status(200).json({
            message: "Task Updated"
        })
    }
    catch (err) {
        res.status(500).json({
            error: err.message
        })
    }
})

module.exports = router