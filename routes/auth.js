const express = require('express');
const router = express.Router();
const jsonwebtoken = require('jsonwebtoken')


const knex = require('../database/knex');
const {
    hashPassword,
    comparePassword,

} = require('../helpers/hash');

function validateRegisterRequest(req, res, next) {
    if (req.body.username && req.body.password) {
        return next();
    }

    return res.status(400).json({ message: 'Error validating' });
}

async function isUsernameExisted(username) {
    const existingUser = await knex('users')
        .select('id')
        .where('username', username)
        .first();

    return !!existingUser; // Return true if user exists, false otherwise
}

// ----------------------------------------------REGISTER--------------------------------------------------
router.post('/register', [
    validateRegisterRequest,
], async function (req, res, next) {
    // Get info from request body
    const username = req.body.username;
    const password = req.body.password;
    const email = req.body.email;
    const gender = req.body.gender;
    const name = req.body.name;
    const age = req.body.age;
    const { hashedPassword, salt } = hashPassword(password);
    const hashedPasswordString = hashedPassword.toString('base64');

    try {
        // Check if user with that username already exists
        const userExists = await isUsernameExisted(username);
        if (userExists) {
            // If user already exists, respond with an error
            return res.status(400).json({ message: 'User already exists' });
        } else {
            // If user does not exist, insert new user
            const result = await knex('users').insert({
                username: username,
                password: hashedPasswordString,
                salt: salt,
                name: name,
                age: age,
                gender: gender,
                email: email,
                created_at: knex.fn.now(),
            });

            // Response to user
            res.status(201).json(result);
        }
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: 'Internal server error' });
    }
});



// ----------------------------------------------LOGIN--------------------------------------------------

router.post('/login', async function (req, res, next) {
    // Get username, password from request body
    const username = req.body.username;
    const password = req.body.password;

    // Check if user exists
    const user = await knex('users')
        .select('*')
        .where('username', username)
        .first();

    if (!user) {
        // If user not found, respond with an error
        return res.status(400).json({
            message: 'User not found',
        });
    }

    // Compare password
    if (comparePassword(user.password, user.salt, password)) {
        // If password is correct, generate JWT token
        const jwt = jsonwebtoken.sign(
            { 
                id: user.id,  
                username: user.username,
                email: user.email,
                age: user.age,
            },
            process.env.JWT_SECRET,
            {
                algorithm: 'HS256',
                expiresIn: process.env.JWT_EXPIRE_TIME,
            }
        );

        return res.status(200).json({
            data: jwt,
            message: 'Login success',
        });
    } else {
        // If password is incorrect, respond with an error
        return res.status(400).json({
            message: 'Wrong password',
        });
    }
});


module.exports = router;
