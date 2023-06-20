const express = require('express');

const router = express.Router();

const knex = require('../database/knex');

//API tạo poll
router.post('/create_poll', async function (req, res, next) {
    const { namepoll, question, options } = req.body;
    let trx;

    try {
        // Bắt đầu một transaction
        trx = await knex.transaction();

        // Tạo một poll mới
        const [pollId] = await trx('polls')
            .insert({
                poll_name: namepoll,
                questions: question
            })
            .returning('id');

        // Tạo các tùy chọn và liên kết chúng với pollId
        const optionPromises = options.map(option =>
            trx('optionpoll')
                .insert({
                    poll: pollId,
                    title: option,
                    created_at: knex.fn.now()
                })
        );
        await Promise.all(optionPromises);

        // Commit transaction
        await trx.commit();

        // Trả về thông tin của poll mới được tạo
        const poll = { pollId, namepoll, question, options };
        res.json(poll);
    } catch (error) {
        // Nếu có lỗi, rollback transaction
        if (trx) await trx.rollback();
        console.error(error);
        res.status(500).json({ error: 'Error creating poll' });
    }
});
//API update poll
router.put('/update_polls/:id', async function (req, res) {
    const pollId = parseInt(req.params.id);
    const { namepoll, question } = req.body;

    try {
        await knex('polls')
            .where('id', pollId)
            .update({
                poll_name: namepoll,
                questions: question
            });

        res.json({ message: 'Poll updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error updating poll' });
    }
});
//API tạo option
router.post('/options/:idpoll', async function (req, res) {
    const pollId = parseInt(req.params.idpoll);
    const { title } = req.body;

    try {
        const optionId = await knex('optionpoll')
            .insert({
                poll: pollId,
                title: title
            })
            .returning('id');

        res.json({ optionId, title });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error adding option' });
    }
});
//API update option
router.put('/options/:optionId', async function (req, res) {
    const optionId = parseInt(req.params.optionId);
    const { title } = req.body;

    try {
        await knex('optionpoll')
            .where({ id: optionId })
            .update({ title: title });

        res.json({ message: 'Option updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error updating option' });
    }
});
//API xóa options
router.delete('/options/:optionId', async function (req, res) {
    const optionId = parseInt(req.params.optionId);

    try {
        await knex('optionpoll')
            .where({ id: optionId })
            .del();

        res.json({ message: 'Option deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error deleting option' });
    }
});
// API xem chi tiết poll
router.get('/polls/:pollId', async function (req, res, next) {
    const pollId = req.params.pollId;

    try {
        // Lấy thông tin của Poll từ bảng "polls"
        const poll = await knex('polls')
            .where({ id: pollId })
            .first();

        if (!poll) {
            return res.status(404).json({ error: 'Poll not found' });
        }

        // Lấy danh sách các tùy chọn từ bảng "optionpoll" liên quan đến pollId
        const options = await knex('optionpoll')
            .select('id', 'title')
            .where({ poll: pollId });

        // Tạo đối tượng PollDetails chứa thông tin Poll và danh sách tùy chọn
        const pollDetails = {
            id: poll.id,
            namepoll: poll.poll_name,
            question: poll.questions,
            options: options
        };

        // Trả về thông tin chi tiết của Poll
        res.json(pollDetails);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error retrieving Poll details' });
    }
});
// API delete poll
router.delete('/polls/:pollId', async function (req, res, next) {
    const pollId = parseInt(req.params.pollId);

    try {
        // Xóa Poll từ bảng "polls" dựa trên pollId
        await knex('polls')
            .where({ id: pollId })
            .delete();

        res.json({ message: 'Poll deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error deleting Poll' });
    }
});
// API submit option
router.post('/polls/:pollId/options/:optionId/submit', async function (req, res, next) {
    const pollId = parseInt(req.params.pollId);
    const optionId = parseInt(req.params.optionId);
    const userId = req.body.userId; // Lấy thông tin userId từ body request

    try {
        // Kiểm tra xem tùy chọn và người dùng có tồn tại hay không
        const optionExists = await knex('optionpoll')
            .where({
                id: optionId,
                poll: pollId
            })
            .first();

        const userExists = await knex('users')
            .where({ id: userId })
            .first();

        if (!optionExists || !userExists) {
            return res.status(404).json({ error: 'Option or User not found' });
        }

        // Kiểm tra xem đã tồn tại liên kết giữa người dùng và tùy chọn hay chưa
        const userOptionExists = await knex('user_option')
            .where({ id_user: userId, id_option: optionId })
            .first();

        if (userOptionExists) {
            return res.status(400).json({ error: 'User already submitted this Option' });
        }

        // Đăng ký tùy chọn bằng cách chèn thông tin vào bảng trung gian "user_option"
        await knex('user_option').insert({
            id_user: userId,
            id_option: optionId,
            created_at: knex.fn.now(),
        });

        res.json({ message: 'Option submitted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error submitting option' });
    }
});

// API unsubmit option
router.post('/polls/:pollId/options/:optionId/unsubmit', async function (req, res, next) {
    const pollId = req.params.pollId;
    const optionId = req.params.optionId;
    const userId = req.body.userId; // Lấy thông tin userId từ body request

    try {
        // Kiểm tra xem tùy chọn và người dùng có tồn tại hay không
        const optionExists = await knex('optionpoll')
            .where({ id: optionId, poll: pollId })
            .first();

        const userExists = await knex('users')
            .where({ id: userId })
            .first();

        if (!optionExists || !userExists) {
            return res.status(404).json({ error: 'Option or User not found' });
        }
        // Kiểm tra xem đã tồn tại liên kết giữa người dùng và tùy chọn hay chưa
        const userOptionExists = await knex('user_option')
            .where({ id_user: userId, id_option: optionId })
            .first();

        if (!userOptionExists) {
            return res.status(400).json({ error: 'User has not submitted this Option' });
        }

        // Hủy đăng ký tùy chọn bằng cách xóa thông tin khỏi bảng trung gian "user_option"
        await knex('user_option')
            .where({ id_user: userId, id_option: optionId })
            .del();

        res.json({ message: 'Option unsubmitted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error unsubmitting option' });
    }
});
module.exports = router;