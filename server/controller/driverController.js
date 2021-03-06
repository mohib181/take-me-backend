const jwt = require('jsonwebtoken');
const Ride = require('../model/ride');
const Driver = require('../model/driver');
const Vehicle = require('../model/vehicle');
const DriverPool = require('../model/driverPool');

const mongoose = require('mongoose');

const secret = process.env.TOKEN_SECRET || "TakeMeSecret";

exports.register = (req, res) => {
    // validate request
    if(!req.body){
        return res.status(400).send({ message : "Content can not be emtpy!"});
    }
    
    Driver.findOne({ email: req.body.email })
        .then(data => {
            if(data) {
                //Email already Exists
                //console.log(data);
                return res.status(400).send({ message: "Email already Exists", data: data});
            }
            else {
                // new Driver
                const driver = new Driver({
                    name : req.body.name,
                    email : req.body.email,
                    password : req.body.password,
                    phone : req.body.phone,
                    gender: req.body.gender,
                    address : req.body.address,
                    nid : req.body.nid,
                    licenseNo : req.body.licenseNo
                });

                // save driver in the database
                driver.save()
                    .then(data => {
                        res.send(data);
                        //res.send({ message: "registration succesful" });
                        //res.redirect('/add-user');
                    })
                    .catch(err =>{
                        res.status(500).send({
                            message : err.message || "Some error occurred while creating a create operation"
                        });
                    });
            }
        })
        .catch(err =>{
            res.status(500).send({ message : err.message });
        });
}

//login function
exports.login = (req, res) => {
    Driver.findOne({'email': req.body.email, 'password': req.body.password})
    .then(data =>{
        if(!data){
            res.status(200).send({ message : "Invalid Email or Password" });
        }else{
            //console.log(data)
            const token = jwt.sign({_id: data._id}, secret);
            res.header('auth-token', token).send({ message: "login successful", data });
        }
    })
    .catch(err =>{
        res.status(200).send({ message: err.message || "Error retrieving driver with email " + req.body.email});
    });
}

//dashboard
exports.showDashboard = (req, res) => {
    const id = req.data._id;
    Driver.findById(id)
    .then(data =>{
        if(!data){
            res.status(404).send({ message : "Driver Not found with id" + id})
        }else{
            //console.log(data)
            res.send(data);
        }
    })
    .catch(err =>{
        res.status(500).send({ message: err.message || "Error retrieving driver with id " + id})
    });
}

//vehicleInfo
exports.showVehicleInfo = (req, res) => {
    const filter = {
        driverID: mongoose.Types.ObjectId(req.data._id)
    };
    
    Vehicle.findOne(filter)
    .then(data =>{
        if(!data){
            res.status(404).send({ message : "Vehicle Not found with driverID: " + req.data._id});
        }else{
            //console.log(data)
            res.send(data);
        }
    })
    .catch(err =>{
        res.status(500).send({ message: err.message || "Error retrieving Vehicle with driverID " + req.data._id})
    });
}

//show Ride History
exports.showRideHistory = async (req, res) => {
    try {
        const driverID = mongoose.Types.ObjectId(req.data._id);
        let getRideHistory = null, getTotalEarning = null;

        if(req.query.duration) {
            const duration = parseInt(req.query.duration)-1;

            let d = new Date();
            let start = new Date(d.getFullYear(), d.getMonth(), d.getDate()-duration).toISOString();
            let end = d.toISOString();

            getRideHistory = Ride.aggregate([
                { $match : { 'driverID': driverID, 'time': {$gte: new Date(start), $lte: new Date(end)} } },
                { $sort : { 'time' : -1, '_id': 1} }
            ]);
            getTotalEarning = Ride.aggregate([
                { $match : { 'driverID': driverID, 'time': {$gte: new Date(start), $lte: new Date(end)} } },
                { $group: { '_id': '$driverID', 'total': {$sum: '$fare'}}}
            ]);
        }
        else {
            getRideHistory = Ride.aggregate([
                { $match : { 'driverID': driverID } },
                { $sort : { 'time' : -1, '_id': 1} }
            ]);
            getTotalEarning = Ride.aggregate([
                { $match : { 'driverID': driverID } },
                { $group: { '_id': '$driverID', 'total': {$sum: '$fare'}}}
            ]);
        }

        let info = await Promise.all([getRideHistory, getTotalEarning]);
        let rideHistory = info[0];
        let earning = info[1].length>0 ? info[1][0].total: 0;
        res.status(200).send({ride: rideHistory, count: rideHistory.length, total: earning});
    } catch (error) {
        res.send({message: error.message});
    }   
}

//show Earning
exports.showEarning = (req, res) => {
    const driverID = mongoose.Types.ObjectId(req.data._id);
    let getEarning = null;

    if(req.query.duration) {
        const duration = parseInt(req.query.duration);

        let d = new Date();
        let start = new Date(d.getFullYear(), d.getMonth(), d.getDate()-duration).toISOString();
        let end = d.toISOString();

        //console.log("start: ", start);
        //console.log("end: ", end);
        
        getEarning = Ride.aggregate([
            { $match : { 'driverID': driverID, 'time': {$gte: new Date(start), $lte: new Date(end)} } },
            { $group: { '_id': '$driverID', 'total': {$sum: '$fare'}}}
        ]);
    }
    else {
        getEarning = Ride.aggregate([
            { $match : { 'driverID': driverID } },
            { $group: { '_id': '$driverID', 'total': {$sum: '$fare'}}}
        ]);
    }

    getEarning
    .then(data => {
        let earning = {
            total: 0
        };
        if(data.length > 0) {
            console.log(data);
            earning = {
                total: data[0].total
            };
        }
        
        res.status(200).send(earning);
    })
    .catch(err => {
        //console.log(err);
        res.status(500).send({message: err.message});
    });
}

//update Location
exports.updateLocation = async (req, res) => {
    let vehicleLocation = null;
    try {
        console.log("JSON parsing");
        vehicleLocation = JSON.parse(req.body.location);
    }
    catch(err) {
        console.log("err... so no parsing");
        vehicleLocation = req.body.location;
    }
    //console.log(passengerID, driverID, vehicleLocation);

    if(vehicleLocation) {
        const filter = {
            'driverID': mongoose.Types.ObjectId(req.data._id)
        };
        
        const vehicleUpdateBody = {
            $set: {
                'location.coordinates': [vehicleLocation[1], vehicleLocation[0]]
            }
        };
        const poolUpdateBody = {
            $set: {
                'vehicleLocation.coordinates': [vehicleLocation[1], vehicleLocation[0]]
            }
        };
        console.log(vehicleUpdateBody, poolUpdateBody);

        let vehicleUpdate = Vehicle.findOneAndUpdate(filter, vehicleUpdateBody, { useFindAndModify: false, new: true });
        let poolUpdate = DriverPool.findOneAndUpdate(filter, poolUpdateBody, { useFindAndModify: false, new: true });
        
        Promise.all([vehicleUpdate, poolUpdate])
        .then(data => {
            console.log(data);
            //if(data.length>1) console.log(data[1], "vehicleLocation: ", data[1].vehicleLocation.coordinates);
            res.status(200).send(data[0]);
        })
        .catch(err => {
            console.log(err);
            res.status(500).send(err);
        });
    }
    else {
        res.status(400).send({message: "empty body"});
    }
}

//maybe will delete these later
exports.getAllDrivers = (req, res) => {
    Driver.find({})
    .then( data => {
        res.send(data);
    })
    .catch( err => {
        res.status(400).send(err);
    });
}


//find Driver using vehicleID
exports.findByVehicleID = (req, res) => {
    Driver.find({ 'vehicleID': req.body._id })
    .then(data =>{
        if(data.length <= 0){
            res.status(404).send({ message : "No Driver with vehicleID: " + req.body._id });
        }else{
            //console.log(data)
            res.send(data);    
        }
    })
    .catch(err =>{
        res.status(500).send({ message: err.message || "Error retrieving Driver with vehicleID: " + req.body._id});
    });
}