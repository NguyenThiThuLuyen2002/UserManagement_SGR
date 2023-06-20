const knex = require('./knex.js')

knex.schema.createTable('users', function (table) {
    table.increments('id').primary();
    table.string('username', 255).notNullable();
    table.string('password', 255).notNullable();
    table.string('salt', 255);
    table.string('name', 255);
    table.integer('age');
    table.string('gender', 255).notNullable();
    table.string('email', 255);
    table.string('passwordResetToken', 255);
    table.dateTime('passwordResetExpiration');
    table.dateTime('created_at');
    table.integer('created_by');
}).then(function () {
    console.log('Table "users" created');
}).catch(function (error) {
    console.error('Error creating table "users":', error);
});

// Tạo bảng 'polls'
knex.schema.createTable('polls', function (table) {
    table.increments('id').primary();
    table.string('poll_name', 255);
    table.string('questions', 255);
}).then(function () {
    console.log('Table "polls" created');
}).catch(function (error) {
    console.error('Error creating table "polls":', error);
});

// Tạo bảng 'optionpoll'
knex.schema.createTable('optionpoll', function (table) {
    table.increments('id').primary();
    table.integer('poll').unsigned();
    table.string('title', 255);
    table.dateTime('created_at');
    table.dateTime('created_by');
    table.foreign('poll').references('polls.id').onDelete('cascade').onUpdate('cascade');
}).then(function () {
    console.log('Table "optionpoll" created');
}).catch(function (error) {
    console.error('Error creating table "optionpoll":', error);
});

// Tạo bảng 'user_option'
knex.schema.createTable('user_option', function (table) {
    table.integer('id_user').unsigned();
    table.integer('id_option').unsigned();
    table.dateTime('created_at');
    table.foreign('id_user').references('users.id').onDelete('cascade').onUpdate('cascade');
    table.foreign('id_option').references('optionpoll.id').onDelete('cascade').onUpdate('cascade');
}).then(function () {
    console.log('Table "user_option" created');
}).catch(function (error) {
    console.error('Error creating table "user_option":', error);
});
