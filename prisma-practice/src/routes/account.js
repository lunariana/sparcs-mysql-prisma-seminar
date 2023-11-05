const express = require("express");

const router = express.Router();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

router.use(express.json());

router.post("/:accountNo/deposit", async (req, res) => {

    // use this command in git bash terminal to test
    // curl.exe -X POST http://localhost:3000/account/1/deposit -H "Content-Type: application/json" -d '{"customerID": 11790, "depositAmount": 100}'

    console.log(req.params.accountNo)
    const accountNo = Number(req.params.accountNo);
    const customerID = req.body.customerID;
    const depositAmount = req.body.depositAmount;

    // check if customer ID for the account matches the given customer ID
    const valid_customerid = await prisma.owns.findFirst({
        select: {
            customerID: true,
        },
        where: {
            AND: [
                { customerID: { equals: customerID } },
                { accNumber: { equals: accountNo } },
            ],
        },
    });
    if (!valid_customerid) {    // wrong customer id
        const error = new Error("invalid customer ID");
        error.statusCode = 400;
        throw error;
    }

    // get current balance
    let currentBalance = await prisma.account.findFirst({
        select: {
            balance: true,
        },
        where: {
            accNumber: { equals: accountNo },
        },
    });
    currentBalance = Number(currentBalance.balance);

    // deposit money
    newBalance = currentBalance + depositAmount;
    newBalance = newBalance.toString();
    const balanceAfterDeposit = await prisma.account.update({
        select: {
            balance: true,
        },
        where: {
            accNumber: accountNo,
        },
        data: {
            balance: newBalance,
        },
    });
    console.log(balanceAfterDeposit);

    return res.status(201).send(balanceAfterDeposit.balance);
});

router.post("/:accountNo/withdraw", async (req, res) => {

    // use this command in git bash terminal to test
    // curl.exe -X POST http://localhost:3000/account/1/withdraw -H "Content-Type: application/json" -d '{"customerID": 11790, "withdrawalAmount": 100}'

    console.log(req.params.accountNo)
    const accountNo = Number(req.params.accountNo);
    const customerID = req.body.customerID;
    const withdrawalAmount = req.body.withdrawalAmount;

    // check if customer ID for the account matches the given customer ID
    const valid_customerid = await prisma.owns.findFirst({
        select: {
            customerID: true,
        },
        where: {
            AND: [
                { customerID: { equals: customerID } },
                { accNumber: { equals: accountNo } },
            ],
        },
    });
    if (!valid_customerid) {    // wrong customer id
        const error = new Error("invalid customer ID");
        error.statusCode = 400;
        throw error;
    }

    // get current balance
    let currentBalance = await prisma.account.findFirst({
        select: {
            balance: true,
        },
        where: {
            accNumber: { equals: accountNo },
        },
    });
    currentBalance = Number(currentBalance.balance);

    // deposit money
    newBalance = currentBalance - withdrawalAmount;
    // check if there is enough money to withdraw
    if (newBalance < 0) {
        const error = new Error("insufficient funds");
        error.statusCode = 400;
        throw error;
    }
    newBalance = newBalance.toString();
    const balanceAfterWithdrawal = await prisma.account.update({
        select: {
            balance: true,
        },
        where: {
            accNumber: accountNo,
        },
        data: {
            balance: newBalance,
        },
    });
    console.log(balanceAfterWithdrawal);

    return res.status(201).send(balanceAfterWithdrawal.balance);
});


module.exports = router;