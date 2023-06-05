const crypto = require("crypto");

function hashPassword(plainPassword) {
    //
    // generate random salt
    const salt = crypto.randomBytes(16).toString('hex');

    // hash with salt we've generated
    const hashedPassword=  crypto
        .pbkdf2Sync(plainPassword, salt, 1000, 64, 'sha512')
        .toString('hex');
    return { hashedPassword, salt };
}

function comparePassword(hashedPassword, salt, plainPassword) {
    const hash = crypto
    .pbkdf2Sync(plainPassword, salt, 1000, 64, 'sha512')
    .toString('hex');
    const hashString = hash.toString('base64');
    return hashString === hashedPassword;
}


module.exports = {
    hashPassword,
    comparePassword,
};
