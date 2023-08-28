const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken')
const knex = require('../database/knex');
const { validationResult } = require('express-validator');
function Validaterequest(req, res, next) {

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}
// UPDATE USER INFO----err
router.put('/:id', [Validaterequest], async function (req, res, next) {
  const userId = parseInt(req.params.id);

  // Lấy dữ liệu từ request body
  const { name, age, gender } = req.body;

  // Lấy token từ headers
  const token = req.headers.authorization;

  // Xác thực token để đảm bảo tính hợp lệ của người dùng
  const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  console.log(decodedToken);
  // Kiểm tra xem ID của người dùng được yêu cầu có khớp với thông tin trong token hay không
  if (decodedToken.id !== userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  knex('users')
    .where('id', userId)
    .update({ name, age, gender })
    .then(() => {
      res.status(204).send();
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send('An error occurred');
    });
});


router.delete('/:id', async (req, res) => {
  const userId = req.params.id;

  try {
    // Xóa người dùng khỏi cơ sở dữ liệu
    await knex('users')
      .where('id', userId)
      .del();

    res.status(204).send();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
});



router.get('/search_users', async (req, res) => {
  
  // // Xác thực token để đảm bảo tính hợp lệ của người dùng
  // const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
  // console.log(decodedToken);
  // // Kiểm tra xem ID của người dùng được yêu cầu có khớp với thông tin trong token hay không
  // if (decodedToken.id !== userId) {
  //   return res.status(401).json({ message: 'Unauthorized' });
  // }

  const page = parseInt(req.params.page) || 1;
  const limit = parseInt(req.params.limit) || 5;
  const search = req.params.search || '';

  try {
    // Tính toán vị trí bắt đầu và vị trí kết thúc của dữ liệu phân trang
    const startIndex = (page - 1) * limit;
    const endIndex = page * limit;

    // Lấy danh sách người dùng từ cơ sở dữ liệu
    let query = knex.select('*').from('users');

    // Áp dụng điều kiện tìm kiếm (nếu có)
    if (search) {
      query = query.where('username', 'like', `%${search}%`);
    }

    const users = await query.offset(startIndex).limit(limit);

    // Đếm tổng số người dùng (không áp dụng phân trang và tìm kiếm)
    const totalCount = await knex.count('id as count').from('users').first();

    // Tạo đối tượng phân trang
    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(totalCount.count / limit),
    };

    // Tạo đối tượng kết quả trả về
    const response = {
      pagination,
      data: users,
    };

    res.json(response);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'An error occurred' });
  }
});



module.exports = router;
