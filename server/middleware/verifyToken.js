const jwt = require('jsonwebtoken');

module.exports = function (req, res, next) {
    /*const bearerHeader = req.header('authorization');
    if(typeof bearerHeader !== 'undefined') {
        const bearerData = authData.split(' ');
        const bearerToken = bearerData[1];
        
        jwt.verify(bearerToken, process.env.TOKEN_SECRET, (err, AuthData) => {
            if(err) {
                res.status(400).send({ message: err.message || "invalid Token" });
            }
            else {
                req.data = AuthData;
                next();
            }
        });
    }
    else {
        res.status(401).send({ messsage: "Access Denied" });
    }*/
    
    const token = req.header('auth-token');
    console.log("token: ", token);
    if(!token) {
        return res.status(401).send({ messsage: "Access Denied" });
    }
    try{
        const secret = process.env.TOKEN_SECRET || "TakeMeSecret";
        const verified = jwt.verify(token, secret);
        req.data = verified;
        next();
    }catch (err) {
        res.status(400).send({ message: err.message || "invalid Token" });
    }
}