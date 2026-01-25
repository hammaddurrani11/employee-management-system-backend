const jwt = require('jsonwebtoken');

const FetchUser = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({
            message: 'Unauthorized'
        })
    }

    try {
        const data = jwt.verify(token, process.env.JWT_SECRET);
        req.user = data
        console.log(req.user);
        return next();
    }
    catch (err) {
        return res.status(401).json({
            message: 'Unauthorized'
        })
    }
}

module.exports = FetchUser