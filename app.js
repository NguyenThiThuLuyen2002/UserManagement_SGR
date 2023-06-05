require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');


const authRouter = require('./routes/auth');
const usersRouter = require('./routes/users');

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use('/auth', authRouter);
app.use('/users', usersRouter);

app.listen(process.env.PORT, (port) => {
    console.log("App start")
})

module.exports = app;


// START command: npm run start / node bin/www