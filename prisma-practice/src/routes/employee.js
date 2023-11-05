const express = require("express");

const router = express.Router();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

router.use(express.json());

router.post("/join", async (req, res) => {

    // use this command in git bash terminal to test
    // curl.exe -X POST http://localhost:3000/employee/join -H "Content-Type: application/json" -d '{"sin": 101, "firstName": "Pris", "lastName": "Smith", "salary": 10000, "branchNumber": 1}'

    console.log(req.body);
    const { sin, firstName, lastName, salary, branchNumber } = req.body;
    // const sin = req.body.sin;
    // const firstName = req.body.firstName;
    // const lastName = req.body.lastName;
    // const salary = req.body.salary;
    // const branchNumber = req.body.branchNumber;

    const createdEmployee = await prisma.employee.create({
        data: {
            sin: sin,
            firstName: firstName,
            lastName: lastName,
            salary: salary,
            branchNumber: branchNumber,
        },
    });
    console.log("created employee:\n" + createdEmployee);
    
    res.status(201).send(
        '이 팀은 미친듯이 일하는 일꾼들로 이루어진 광전사 설탕 노움 조합이다.<br> \
        분위기에 적응하기는 쉽지 않지만 아주 화력이 좋은 강력한 조합인거 같다.'
    );
});

router.post("/leave", async (req, res) => {

    // use this command in git bash terminal to test
    // curl.exe -X POST http://localhost:3000/employee/leave -H "Content-Type: application/json" -d '{"sin": 103}'

    console.log(req.body);
    const sin = req.body.sin;

    const deletedEmployee = await prisma.employee.delete({
        where: { sin: sin },
    });
    console.log("deleted employee:\n" + deletedEmployee);

    res.status(200).send(
        '<strong>안녕히 계세요 여러분!<br> \
        전 이 세상의 모든 굴레와 속박을 벗어 던지고 제 행복을 찾아 떠납니다!<br> \
        여러분도 행복하세요~~!</strong>'
    );
});


module.exports = router;