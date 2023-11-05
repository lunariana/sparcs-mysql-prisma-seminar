const express = require("express");
const app = express();
const port = process.env.PORT || 3000;

const problemsRouter = require("./routes/problems");
app.use("/problems", problemsRouter);

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
 
app.get("/", (req, res) => {
  	res.json({ message: "alive" });
});

app.listen(port, () => {
	console.log(`Listening to requests on port ${port}`);
});


// app.get("/quotes", async (req, res) => {    ///////// replace with your stuff
//   const currentPage = req.query.page || 1;
//   const listPerPage = 5;
//   const offset = (currentPage - 1) * listPerPage;
 
//   const allQuotes = await prisma.quote.findMany({
//     include: { author: true },
//     skip: offset,
//     take: listPerPage,
//   });
 
//   res.json({
//     data: allQuotes,
//     meta: { page: currentPage },
//   });
// });


// const bcrypt = require('bcryptjs')
// const jwt = require('jsonwebtoken')
// const {PrismaClient} = require('@prisma/client')
// const prisma = new PrismaClient()

// // SignUp (회원가입)
// // 1. 요청자가 email, password 등의 회원 정보를 보내면 이를 받아 User table에 추가
// app.post('/users/signup', async (req, res) => {
// 	const {email, password} = req.body
//     	const hashedPassword = bcrypt.hash(password, 10)
//     	const createdUser = await prisma.users.create({
//       	data : {
// 	        email,
// 	        password: hashedPassword,
// 	      }
// 	    })

//         res.status(201).json({createdUser})
// })

// // LogIn 
// // 1. 요청자의 email, password 체크
// app.post('/users/login', async (req, res) => {
//   try {
//     const { email, password: inputPassword } = req.body
//     const foundUser = await prisma.users.findOne({ where: { email } })

//     if (!foundUser) {
//       const error = new Error('invalid input')
//       error.statusCode = 400
//       throw error
//     }

//     const { id, password: hashedPassword } = foundUser
//     const isValidPassword = await bcrypt.compare(inputPassword, hashedPassword)

//     if (!isValidPassword) {
//       const error = new Error('invalid input')
//       error.statusCode = 400
//       throw error
//     }

//     const token = jwt.sign({ id }, 'node_blogs_secret_key', { expiresIn: '1h' })
//     res.status(200).json({ message: 'login success', token })
//   } catch (err) {
//     res.status(err.statusCode).json({ message: err.message })
//   }
// })