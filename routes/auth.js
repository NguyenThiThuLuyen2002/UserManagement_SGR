const express = require('express');
const router = express.Router();
const jsonwebtoken = require('jsonwebtoken')

const crypto = require("crypto");
const { mailService } = require('../Services/mail.service')

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

// -----------------------------------------------------FORGOT PASSWORD--------------------------------
router.post('/sendemail', async (req, res) => {
    const { emailFrom, emailTo, emailSubject, emailText } = req.body;

    try {
        await mailService.sendEmail({ emailFrom, emailTo, emailSubject, emailText });
        res.status(200).json({ message: 'Email sent successfully.' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: 'Failed to send email.' });
    }
});

// router.post('/forgot-password', async (req, res) => {
//     try {
//         const email = req.body.email;
//         if (isEmailExisted(email) === false)
//             // If no: response
//             return res.status(400).json({
//                 message: 'email not found',
//             });
//         //tạo jwt

//         const passwordResetToken = createRandomToken();

//         const passwordResetExpiration = new Date(Date.now() + 10 * 60 * 1000);
//         const updateStatus = await updateOne({
//             db,
//             query: 'update user set passwordResetToken = ?, passwordResetExpiration = ? where email = ?',
//             params: [passwordResetToken, passwordResetExpiration, email],
//         });

//         if (updateStatus) {
//             mailService.sendEmail({
//                 emailFrom: 'admin@gmail.com',
//                 emailTo: email,
//                 emailSubject: 'Reset password',
//                 emailText: 'Here is your reset password token: ' + passwordResetToken,
//             });
//             return res.status(200).json({
//                 message: 'reset password email sent successfully',
//             });
//         }
//         return res.status(400).json({
//             message: "can't reset password!",
//         });
//     } catch (error) {
//         return res.status(500).json({
//             message: 'error',
//         });
//     }
// });

router.put('/forgot-password', async function (req, res) {
    try {
      const { email } = req.body;
  
      const user = await knex('users')
        .select('*')
        .where('email', email)
        .first();
  
      if (!user) {
        return res.status(400).json({
          message: 'Email not found',
        });
      }
  
      const secretKey = crypto.randomBytes(32).toString('hex');
      const passwordResetToken = crypto.createHash('sha256').update(secretKey).digest('hex');
  
      const passwordResetExpiration = new Date(Date.now() + 10 * 60 * 1000);
      const updateStatus = await knex('users')
        .where('email', email)
        .update({
          passwordResetToken: passwordResetToken,
          passwordResetExpiration: passwordResetExpiration,
        });
  
      if (updateStatus) {
        mailService.sendEmail({
          emailFrom: 'admin@gmail.com',
          emailTo: email,
          emailSubject: 'Reset password',
          emailText: 'Here is your reset password token: ' + passwordResetToken,
        });
  
        return res.status(200).json({
          message: 'reset password email sent successfully',
        });
      }
  
      return res.status(400).json({
        message: "can't reset password!",
      });
    } catch (error) {
      return res.status(500).json({
        message: 'error',
      });
    }
  });
  
  router.put('/reset-password', async function (req, res) {
    try {
      const { email, passwordResetToken, newPassword } = req.body;
      const user = await knex('users')
        .select('*')
        .where('email', email)
        .where('passwordResetToken', passwordResetToken)
        .where('passwordResetExpiration', '>=', new Date())
        .first();
  
      if (!user) {
        return res.status(400).json({
          message: 'invalid token or token has expired',
        });
      }
  
      const { hashedPassword, salt } = hashPassword(newPassword);
      const hashedPasswordString = hashedPassword.toString('base64');

      const updateStatus = await knex('users')
        .where('email', email)
        .update({
          password: hashedPasswordString,
          salt: salt,
          passwordResetToken: null,
          passwordResetExpiration: null,
        //   passwordLastResetDate: new Date(),
        });
  
      if (updateStatus) {
        return res.status(200).json({
          message: 'reset password successfully',
        });
      }
  
      return res.status(400).json({
        message: 'reset password failed',
      });
    } catch (error) {
      return res.status(500).json({
        message: 'error',
      });
    }
  });
  

module.exports = router;
