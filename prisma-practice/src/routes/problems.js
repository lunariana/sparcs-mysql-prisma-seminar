const express = require("express");

const router = express.Router();

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();


router.get("/1", async (req, res) => {

    /* 1. Select the [first name, last name, income] of customers whose income is within [$50,000, $60,000] 
        and order by income (desc), last name (asc), and then first name (asc). */

    // prisma query
    const result = await prisma.customer.findMany({
        // take: 10,
        select: {
            firstName: true,
            lastName: true,
            income: true,
        },
        where: {
            income: {
                gte: 50000,
                lte: 60000,
            },
        },
        orderBy: [
            {
                income: 'desc',
            },
            {
                lastName: 'asc',
            },
            {
                firstName: 'asc',
            },
        ],
    });

    // // raw query
    // const result = await prisma.$queryRaw`
    //     SELECT firstName, lastName, income
    //     FROM Customer
    //     WHERE income BETWEEN 50000 AND 60000
    //     ORDER BY income DESC, lastName ASC, firstName ASC
    //     LIMIT 10`;

    // res.json(result);
    res.type('json').send(JSON.stringify(result, null, 4));
});

router.get("/2", async (req, res) => {
    
    /* 2. Select the [SIN, branch name, salary, manager’s salary - salary (that is, the salary of the employee’s manager 
        minus salary of the employee)] of all employees in London or Berlin, and order by descending (manager’s salary - salary). */

    // prisma query
    const london_berlin_employees = await prisma.employee.findMany({
        select: {
            sin: true,
            Branch_Employee_branchNumberToBranch: {
                select: { branchName: true, },
            },
            salary: true,
        },
        where: {
            OR: [
                {
                    Branch_Employee_branchNumberToBranch: {
                        branchName: { equals: "Berlin" }
                    },
                },
                {
                    Branch_Employee_branchNumberToBranch: {
                        branchName: { equals: "London", },
                    },
                },
            ],
        },
    });

    const london_berlin_manager_salaries = await prisma.branch.findMany({
        select: {
            branchName: true,
            Employee_Branch_managerSINToEmployee: {
                select: { salary: true, },
            },
        },
        where: {
            OR: [
                { branchName: { equals: "Berlin" } },
                { branchName: { equals: "London" } },
            ],
        },
        orderBy: {
            branchName: 'asc',
        },
    });

    const berlin_manager_salary = london_berlin_manager_salaries[0]["Employee_Branch_managerSINToEmployee"]["salary"];
    const london_manager_salary = london_berlin_manager_salaries[1]["Employee_Branch_managerSINToEmployee"]["salary"];
    
    let result = [];
    for (employee of london_berlin_employees) {
        empl = {
            "sin": employee.sin,
            "branchName": employee.Branch_Employee_branchNumberToBranch.branchName,
            "salary": employee.salary,
        };
        if (empl.branchName === "Berlin") {
            empl["manager's salary - salary"] = berlin_manager_salary - empl.salary;
        } else {
            empl["manager's salary - salary"] = london_manager_salary - empl.salary;
        }
        result.push(empl);
    }
    result.sort((a, b) => b["manager's salary - salary"] - a["manager's salary - salary"]);    // sort by descending (manager's salary - salary)
    // result = result.slice(0, 10);    // first 10 results only

    // // raw query
    // const result = await prisma.$queryRaw`
    //     SELECT Employee.sin, Branch.branchName, Employee.salary, (Manager.salary - Employee.salary) AS "manager's salary - salary"
    //     FROM Employee
    //     JOIN Branch
    //     ON Employee.branchNumber = Branch.branchNumber
    //     JOIN Employee AS Manager
    //     ON Manager.sin = Branch.managerSIN
    //     WHERE Branch.branchName = "London" OR Branch.branchName = "Berlin"
    //     ORDER BY (Manager.salary - Employee.salary) DESC
    //     LIMIT 10`;

    res.type('json').send(JSON.stringify(result, 
        (key, value) => typeof value === 'bigint' ? value.toString() : value /* return everything else unchanged */, 
        4
    ));    // need this for raw sql query
});

router.get("/3", async (req, res) => {

    /* 3. Select the [first name, last name, income] of customers whose income is at least double the income 
        of every customer whose last name is Butler, and order by last name (asc) then first name (asc). */
    
    // get info for all customers
    const all_customers = await prisma.customer.findMany({
        select: {
            firstName: true,
            lastName: true,
            income: true,
        },
        orderBy: [
            { lastName: 'asc', },
            { firstName: 'asc', },
        ],
    });

    // get the income of every customer with last name Butler, in descending order by income
    const butler_incomes = await prisma.customer.findMany({
        select: {
            income: true,
        },
        where: {
            lastName: {
                equals: "Butler",
            },
        },
        orderBy: {
            income: 'desc',
        },
    });

    const min_income = 2 * butler_incomes[0].income;
    
    let result = [];
    for (let customer of all_customers) {
        if (customer.income >= min_income) {
            result.push(customer)
        }
    }
    // result = result.slice(0, 10)    // first 10 items only


    // // raw query
    // const result = await prisma.$queryRaw`
    //     SELECT firstName, lastName, income
    //     FROM Customer
    //     WHERE income >= 2 * (SELECT income FROM Customer WHERE lastName = "Butler" ORDER BY income DESC LIMIT 1)
    //     ORDER BY lastName, firstName
    //     LIMIT 10`;

    res.type('json').send(JSON.stringify(result, null, 4));
});

router.get("/4", async (req, res) => {

    /* 4.  Select the [customer ID, income, account number, branch number] of customers with incomes greater than $80,000 
        who own an account at both London and Latveria branches, and order by customer ID (asc) then account number (asc). 
        The result should contain all the account numbers of customers who meet the criteria, even if the account itself is 
        not held at London or Latveria. For example, if a customer with an income greater than $80,000 owns accounts in London, 
        Latveria, and New York, the customer meets the criteria, and the New York account must also be in the result. */

    // all accounts of customers with income greater than 80,000
    const customer_accounts = await prisma.owns.findMany({
        select: {
            Customer: {
                select: {
                    customerID: true,
                    income: true,
                },
            },
            accNumber: true,
            Account: {
                select: { branchNumber: true, },
            },
        },
        where: {
            Customer: {
                income: { gt: 80000 },
            },
        },
        orderBy: [
            { customerID: 'asc', },
            { accNumber: 'asc', },
        ],
    });

    // number and name of each branch
    const branch_number_name = await prisma.branch.findMany({
        select: {
            branchNumber: true,
            branchName: true,
        },
    });
    const london_branch_number = branch_number_name.find((branch) => branch.branchName === "London").branchNumber;
    const latveria_branch_number = branch_number_name.find((branch) => branch.branchName === "Latveria").branchNumber;

    // ids of customers who own an account at london
    let london_customers = new Set();
    for (acc of customer_accounts) {
        if ( acc.Account.branchNumber === london_branch_number ) {
            london_customers.add(acc.Customer.customerID);
        }
    }
    // ids of customers who own an account at latveria
    let latveria_customers = new Set();
    for (acc of customer_accounts) {
        if ( acc.Account.branchNumber === latveria_branch_number ) {
            latveria_customers.add(acc.Customer.customerID);
        }
    }
    // ids of customers who own accounts at both london and latveria
    let london_latveria_customers = new Set();
    for (cust of london_customers) {
        if ( latveria_customers.has(cust) ) {
            london_latveria_customers.add(cust);
        }
    }
    
    // all accounts of customers who own accounts at both london and latveria
    let result = [];
    for (acc of customer_accounts) {
        if (london_latveria_customers.has(acc.Customer.customerID)) {
            result.push({
                "customerID": acc.Customer.customerID,
                "income": acc.Customer.income,
                "accNumber": acc.accNumber,
                "branchNumber": acc.Account.branchNumber,
            });
        }
    }
    // result = result.slice(0, 10);

    // // raw query
    // const result = await prisma.$queryRaw`
    //     SELECT C.customerID, C.income, Owns.accNumber, Account.branchNumber
    //     FROM Customer AS C
    //     JOIN Owns
    //     ON C.customerID = Owns.customerID
    //     JOIN Account
    //     ON Owns.accNumber = Account.accNumber
    //     WHERE C.income > 80000
    //         AND EXISTS (  -- account in Latveria
    //             SELECT *
    //             FROM Customer
    //             JOIN Owns
    //             ON Customer.customerID = Owns.customerID
    //             JOIN Account
    //             ON Owns.accNumber = Account.accNumber
    //             JOIN Branch
    //             ON Account.branchNumber = Branch.branchNumber
    //             WHERE C.customerID = Customer.customerID
    //                 AND Branch.branchName = "Latveria")
    //         AND EXISTS (  -- account in London
    //             SELECT *
    //             FROM Customer
    //             JOIN Owns
    //             ON Customer.customerID = Owns.customerID
    //             JOIN Account
    //             ON Owns.accNumber = Account.accNumber
    //             JOIN Branch
    //             ON Account.branchNumber = Branch.branchNumber
    //             WHERE C.customerID = Customer.customerID
    //                 AND Branch.branchName = "London")
    //     ORDER BY customerID, accNumber
    //     LIMIT 10`;

    res.type('json').send(JSON.stringify(result, null, 4));
});

router.get("/5", async (req, res) => {

    /* 5. Select the [customer ID, type, account number, balance] of business (type BUS) and savings (type SAV) accounts 
        owned by customers who own at least one business account or at least one savings account, and order by customer ID 
        (asc), type (asc), and then account number (asc). */
    
    // all business and savings accounts
    const bus_sav_accounts = await prisma.owns.findMany({
        select: {
            customerID: true,
            Account: {
                select: {
                    type: true,
                    accNumber: true,
                    balance: true,
                },
            },
        },
        where: {
            OR: [
                { Account: { type: { equals: "BUS" }, }, },
                { Account: { type: { equals: "SAV" }, }, },
            ],
        },
        orderBy: [
            { customerID: 'asc', },
            { Account: { type: 'asc', }, },
            { accNumber: 'asc', },
        ],
    });
    
    // reformat query result
    let result = [];
    for (acc of bus_sav_accounts) {
        result.push({
            "customerID": acc.customerID,
            "type": acc.Account.type,
            "accNumber": acc.Account.accNumber,
            "balance": acc.Account.balance,
        });
    }
    // result = result.slice(0, 10);

    // raw query
    // const result = await prisma.$queryRaw`
    //     SELECT Customer.customerID, Account.type, Owns.accNumber, Account.balance
    //     FROM Customer
    //     JOIN Owns
    //     ON Customer.customerID = Owns.customerID
    //     JOIN Account
    //     ON Owns.accNumber = Account.accNumber
    //     WHERE Account.type IN ("BUS", "SAV")
    //     ORDER BY customerID, accNumber
    //     LIMIT 10;`;

    res.type('json').send(JSON.stringify(result, null, 4));
});

router.get("/6", async (req, res) => {

    /* 6. Select the [branch name, account number, balance] of accounts with balances greater than $100,000 held at 
        the branch managed by Phillip Edwards, and order by account number (asc). */
    
    // all accounts
    const accounts = await prisma.account.findMany({
        select: {
            Branch: { select: { branchName: true, }, },
            accNumber: true,
            balance: true,
        },
        orderBy: { accNumber: 'asc', },
    });

    // phillip edwards' SIN
    const phillip_edwards_sin = (await prisma.employee.findFirst({
            select: { sin: true, },
            where: {
                AND: [
                    { firstName: { equals: "Phillip" }},
                    { lastName: { equals: "Edwards" }},
                ],
            },
        }))
        .sin;
    // phillip edwards' branch (London)
    const phillip_edwards_branch = (await prisma.branch.findFirst({
            select: { branchName: true },
            where: { managerSIN: { equals: phillip_edwards_sin } },
        }))
        .branchName;

    // accounts with balance greater than 100,000 at the branch managed by phillip edwards
    let result = [];
    for (acc of accounts) {
        if ( acc.balance > 100000 && acc.Branch.branchName === phillip_edwards_branch ) {
            result.push({
                "branchName": acc.Branch.branchName,
                "accNumber": acc.accNumber,
                "balance": acc.balance,
            });
        }
    }

    // // raw query
    // const result = await prisma.$queryRaw`
    //     SELECT Branch.branchName, Account.accNumber, Account.balance
    //     FROM Account
    //     JOIN Branch
    //     ON Account.branchNumber = Branch.branchNumber
    //     JOIN Employee
    //     ON Branch.managerSIN = Employee.sin
    //     WHERE Account.balance > 100000
    //         AND Employee.firstName = "Phillip"
    //         AND Employee.lastName = "Edwards"
    //     ORDER BY accNumber
    //     LIMIT 10`;

    res.type('json').send(JSON.stringify(result, null, 4));
});

router.get("/7", async (req, res) => {

    /* 7. Select the [customer ID] of customers that 1) have an account at the New York branch, 2) do not own an account 
        at the London branch, 3) do not co-own an account with another customer who owns an account at the London branch. 
        Order the result by customer ID (asc). The result should not contain duplicate customer IDs. Write a query 
        satisfying all three conditions. */
    
    // all customer accounts
    const customer_accounts = await prisma.owns.findMany({
        select: {
            Customer: { select: { customerID: true } },
            Account: {
                select: {
                    accNumber: true,
                    Branch: { select: { branchName: true } },
                }
            }
        },
        orderBy: { customerID: 'asc' },
    });

    // new york customers
    let ny_customers = new Set();
    for (acc of customer_accounts) {
        if (acc.Account.Branch.branchName === "New York") {
            ny_customers.add(acc.Customer.customerID);
        }
    }
    // london customers
    let london_customers = new Set();
    for (acc of customer_accounts) {
        if (acc.Account.Branch.branchName === "London") {
            london_customers.add(acc.Customer.customerID);
        }
    }
    // all accounts owned by london customers
    let accounts_of_london_customers = new Set();
    for (acc of customer_accounts) {
        if (london_customers.has(acc.Customer.customerID)) {
            accounts_of_london_customers.add(acc.Account.accNumber);
        }
    }

    // customers who satisfy all three conditions
    let valid_customers = new Set();
    for (acc of customer_accounts) {
        if (ny_customers.has(acc.Customer.customerID)) {    // customers who have an account at the NY branch
            if (!london_customers.has(acc.Customer.customerID)) {    // customers who do not have an account at the London branch
                valid_customers.add(acc.Customer.customerID);
            }
        }
    }
    for (acc of customer_accounts) {
        // remove any customers who share an account with a customer who owns a London account
        if (accounts_of_london_customers.has(acc.Account.accNumber)) {
            valid_customers.delete(acc.Customer.customerID);
        }
    }

    let result = [];
    for (cust of valid_customers) {
        result.push({
            "customerID": cust,
        });
    }

    // // raw query
    // const result = await prisma.$queryRaw`
    //     SELECT C.customerID
    //     FROM Customer AS C
    //     WHERE EXISTS (  -- account in New York
    //             SELECT *
    //             FROM Customer
    //             JOIN Owns
    //             ON Customer.customerID = Owns.customerID
    //             JOIN Account
    //             ON Owns.accNumber = Account.accNumber
    //             JOIN Branch
    //             ON Account.branchNumber = Branch.branchNumber
    //             WHERE C.customerID = Customer.customerID
    //                 AND Branch.branchName = "New York")
    //         AND NOT EXISTS (  -- no account in London
    //             SELECT *
    //             FROM Customer
    //             JOIN Owns
    //             ON Customer.customerID = Owns.customerID
    //             JOIN Account
    //             ON Owns.accNumber = Account.accNumber
    //             JOIN Branch
    //             ON Account.branchNumber = Branch.branchNumber
    //             WHERE C.customerID = Customer.customerID
    //                 AND Branch.branchName = "London")
    //         AND NOT EXISTS (  -- no account co-ownership with London account holder
    //             SELECT DISTINCT C2.customerID    -- all customers who co-own an account with a customer who owns a london account
    //             FROM Customer as C2
    //             JOIN Owns AS O
    //             ON C2.customerID = O.customerID
    //             WHERE C.customerID = C2.customerID
    //                 AND O.accNumber IN (
    //                     SELECT Owns.accNumber   -- all accounts owned by london account holders
    //                     FROM Owns
    //                     JOIN Customer AS C1
    //                     ON Owns.customerID = C1.customerID
    //                     WHERE EXISTS (  -- customer holds a london account
    //                         SELECT *
    //                         FROM Customer
    //                         JOIN Owns
    //                         ON Customer.customerID = Owns.customerID
    //                         JOIN Account
    //                         ON Owns.accNumber = Account.accNumber
    //                         JOIN Branch
    //                         ON Account.branchNumber = Branch.branchNumber
    //                         WHERE C1.customerID = Customer.customerID
    //                             AND Branch.branchName = "London")))
    //     ORDER BY customerID
    //     LIMIT 10`;

    res.type('json').send(JSON.stringify(result, null, 4));
});

router.get("/8", async (req, res) => {

    /* 8. Select the [SIN, first name, last name, salary, branch name] of employees who earn more than $50,000. If an 
        employee is a manager, show the branch name of his/her branch. Otherwise, insert a NULL value for the branch name 
        (the fifth column). Order the result by branch name (desc) then first name (asc). You must use an outer join in your 
        solution for this problem. */
    
    // all employees who earn more than 50,000, in ascending order of first name
    const employees = await prisma.employee.findMany({
        select: {
            sin: true,
            firstName: true,
            lastName: true,
            salary: true,
        },
        where: {
            salary: { gt: 50000 },
        },
        orderBy: [
            { firstName: 'asc' },
        ]
    });
    
    // all managers who earn more than 50,000, in descending order of branch name and ascending order of first name
    const managers = await prisma.branch.findMany({
        select: {
            Employee_Branch_managerSINToEmployee: {
                select: {
                    sin: true,
                    firstName: true,
                    lastName: true,
                    salary: true,
                },
            },
            branchName: true,
        },
        where: {
            Employee_Branch_managerSINToEmployee: {
                salary: { gt: 50000 },
            },
        },
        orderBy: [
            { branchName: 'desc' },
            { Employee_Branch_managerSINToEmployee: { firstName: 'asc' } },
        ],
    });

    // store managers with branch names, then employees with null branch names
    let result = [];
    let manager_sins = new Set();
    for (man of managers) {
        result.push({
            "sin": man.Employee_Branch_managerSINToEmployee.sin,
            "firstName": man.Employee_Branch_managerSINToEmployee.firstName,
            "lastName": man.Employee_Branch_managerSINToEmployee.lastName,
            "salary": man.Employee_Branch_managerSINToEmployee.salary,
            "branchName": man.branchName,
        });
        manager_sins.add(man.Employee_Branch_managerSINToEmployee.sin);
    }
    for (empl of employees) {
        if (!manager_sins.has(empl.sin)) {
            result.push({
                ...empl,
                "branchName": null,
            });
        }
    }

    // // raw query
    // const result = await prisma.$queryRaw`
    //     SELECT Employee.sin, Employee.firstName, Employee.lastName, Employee.salary, Branch.branchName
    //     FROM Employee
    //     LEFT JOIN Branch
    //     ON Employee.sin = Branch.ManagerSIN
    //     WHERE Employee.salary > 50000
    //     ORDER BY branchName DESC, firstName
    //     LIMIT 10`;

    res.type('json').send(JSON.stringify(result, null, 4));
});

router.get("/9", async (req, res) => {

    /* 9. Solve question (8) again without using any join operations. Here, using an implicit cross join such as FROM A, B is 
        accepted, but there should be no JOIN operator in your query. */
    
    // prisma query is the same as that for #8
    // all employees who earn more than 50,000, in ascending order of first name
    const employees = await prisma.employee.findMany({
        select: {
            sin: true,
            firstName: true,
            lastName: true,
            salary: true,
        },
        where: {
            salary: { gt: 50000 },
        },
        orderBy: [
            { firstName: 'asc' },
        ]
    });
    
    // all managers who earn more than 50,000, in descending order of branch name and ascending order of first name
    const managers = await prisma.branch.findMany({
        select: {
            Employee_Branch_managerSINToEmployee: {
                select: {
                    sin: true,
                    firstName: true,
                    lastName: true,
                    salary: true,
                },
            },
            branchName: true,
        },
        where: {
            Employee_Branch_managerSINToEmployee: {
                salary: { gt: 50000 },
            },
        },
        orderBy: [
            { branchName: 'desc' },
            { Employee_Branch_managerSINToEmployee: { firstName: 'asc' } },
        ],
    });

    // store managers with branch names, then employees with null branch names
    let result = [];
    let manager_sins = new Set();
    for (man of managers) {
        result.push({
            "sin": man.Employee_Branch_managerSINToEmployee.sin,
            "firstName": man.Employee_Branch_managerSINToEmployee.firstName,
            "lastName": man.Employee_Branch_managerSINToEmployee.lastName,
            "salary": man.Employee_Branch_managerSINToEmployee.salary,
            "branchName": man.branchName,
        });
        manager_sins.add(man.Employee_Branch_managerSINToEmployee.sin);
    }
    for (empl of employees) {
        if (!manager_sins.has(empl.sin)) {
            result.push({
                ...empl,
                "branchName": null,
            });
        }
    }
    
    // // raw query
    // const result = await prisma.$queryRaw`
    //     SELECT Employee.sin, Employee.firstName, Employee.lastName, Employee.salary, Branch.branchName
    //     FROM Employee, Branch
    //     WHERE Employee.branchNumber = Branch.branchNumber
    //         AND Employee.salary > 50000
    //         AND Branch.managerSIN = Employee.sin
    //     UNION
    //     SELECT Employee.sin, Employee.firstName, Employee.lastName, Employee.salary, NULL
    //     FROM Employee, Branch
    //     WHERE Employee.branchNumber = Branch.branchNumber
    //         AND Employee.salary > 50000
    //         AND Branch.managerSIN <> Employee.sin
    //     ORDER BY branchName DESC, firstName
    //     LIMIT 10`;

    res.type('json').send(JSON.stringify(result, null, 4));
});

router.get("/10", async (req, res) => {

    /* 10. Select the [customer ID, first name, last name, income] of customers who have incomes greater than $5000 and own 
        accounts in ALL of the branches that Helen Morgan owns accounts in, and order by income (desc). For example, if Helen 
        owns accounts in London and Berlin, a customer who owns accounts in London, Berlin, and New York has to be included in 
        the result. If a customer owns accounts in London and New York, the customer does not have to be in the result. The 
        result should also contain Helen Morgan. */
    
    // all accounts of customers with incomes greater than 5000
    const accounts = await prisma.owns.findMany({
        select: {
            Customer: {
                select: {
                    customerID: true,
                    firstName: true,
                    lastName: true,
                    income: true,
                }
            },
            Account: {
                select: {
                    Branch: { select: { branchName: true } },
                }
            }
        },
        where: {
            Customer: { income: { gt: 5000 } },
        },
        orderBy: { Customer: { income: 'desc' } },
    });

    // all account branches of helen morgan
    const helen_morgan = await prisma.owns.findMany({
        select: {
            Account: {
                select: {
                    Branch: { select: { branchName: true } },
                }
            }
        },
        where: {
            Customer: {
                firstName: { equals: "Helen" },
                lastName: { equals: "Morgan"},
            },
        },
    });
    const helen_morgan_branches = helen_morgan.map((account) => account.Account.Branch.branchName);
    // console.log(helen_morgan_branches);

    let customers_accounts = new Map();
    // first add all customers with income > 5000 with their accounts
    for (acc of accounts) {
        cust_id = acc.Customer.customerID;
        acc_branch = acc.Account.Branch.branchName;
        if (customers_accounts.has(cust_id)) {
            customers_accounts.get(cust_id).add(acc_branch);    // add this account's branch to the customer's set
        } else {
            customers_accounts.set(cust_id, new Set([acc_branch]));    // add the customer and their account branch
        }
    }
    // ids of customers with accounts in all of helen morgan's account branches
    let valid_customers = new Set()
    for (let [cust_id, acc_branches] of customers_accounts) {
        // check if customer owns accounts in all of helen's branches
        let all_branches = true;
        for (branch of helen_morgan_branches) {
            if (!acc_branches.has(branch)) {
                all_branches = false;
            }
        }
        // if they do, add their id to the set
        if (all_branches) {
            valid_customers.add(cust_id);
        }
    }
    // console.log(valid_customers);

    let result = [];
    for (acc of accounts) {
        if (valid_customers.has(acc.Customer.customerID)) {
            result.push({
                "customerID": acc.Customer.customerID,
                "firstName": acc.Customer.firstName,
                "lastName": acc.Customer.lastName,
                "income": acc.Customer.income,
            });
            valid_customers.delete(acc.Customer.customerID);    // to prevent duplicate entries
        }
    }

    // // raw query
    // const result = await prisma.$queryRaw`
    //     SELECT C.customerID, C.firstName, C.lastName, C.income
    //     FROM Branch B
    //         JOIN Account A
    //         ON A.branchNumber = B.branchNumber
    //         JOIN Owns O
    //         ON O.accNumber = A.accNumber
    //         JOIN Customer C
    //         ON C.customerID = O.customerID
    //     WHERE C.income > 5000
    //         AND B.branchName IN (SELECT Branch.branchName  -- all customer accounts in branches with helen accounts
    //             FROM Branch
    //             JOIN Account
    //             ON Account.branchNumber = Branch.branchNumber
    //             JOIN Owns
    //             ON Owns.accNumber = Account.accNumber
    //             JOIN Customer
    //             ON Customer.customerID = Owns.customerID
    //             WHERE Customer.firstName = "Helen" AND Customer.lastName = "Morgan")
    //     GROUP BY C.customerID
    //     HAVING COUNT(DISTINCT B.branchName) = (SELECT COUNT(DISTINCT Branch.branchName)  -- customers with same number of branches as helen
    //         FROM Branch
    //         JOIN Account
    //         ON Account.branchNumber = Branch.branchNumber
    //         JOIN Owns
    //         ON Owns.accNumber = Account.accNumber
    //         JOIN Customer
    //         ON Customer.customerID = Owns.customerID
    //         WHERE Customer.firstName = "Helen" AND Customer.lastName = "Morgan")
    //     ORDER BY C.income DESC
    //     LIMIT 10`;

    res.type('json').send(JSON.stringify(result, null, 4));
});

router.get("/11", async (req, res) => {

    /* 11. Select the [SIN, first name, last name, salary] of the lowest paid employee (or employees) of the Berlin branch, 
        and order by sin (asc). */
    
    // all employees of the berlin branch
    const berlin_employees = await prisma.employee.findMany({
        select: {
            sin: true,
            firstName: true,
            lastName: true,
            salary: true,
        },
        where: {
            Branch_Employee_branchNumberToBranch: {
                branchName: { equals: "Berlin" }
            },
        },
        orderBy: {
            sin: 'asc'
        },
    });

    // minimum employee salary at berlin branch
    const berlin_min_salary = (await prisma.employee.aggregate({
            _min: {
                salary: true,
            },
            where: {
                Branch_Employee_branchNumberToBranch: {
                    branchName: { equals: "Berlin" }
                }
            },
        }))
        ._min.salary;
    // console.log(berlin_min_salary);

    // berlin employee with minimum salary
    const result = berlin_employees.filter((empl) => empl.salary === berlin_min_salary);

    // // raw query
    // const result = await prisma.$queryRaw`
    //     SELECT Employee.sin, Employee.firstName, Employee.lastName, Employee.salary
    //     FROM Employee
    //     JOIN Branch
    //     ON Employee.branchNumber = Branch.branchNumber
    //     WHERE Branch.branchName = "Berlin"
    //         AND Employee.salary IN (
    //             SELECT MIN(Employee.salary)
    //             FROM Employee
    //             JOIN Branch
    //             ON Employee.branchNumber = Branch.branchNumber
    //             WHERE Branch.branchName = "Berlin")
    //     ORDER BY sin
    //     LIMIT 10;`;

    res.type('json').send(JSON.stringify(result, null, 4));
});

router.get("/12", async (req, res) => {

    /* 12. Select the [branch name, the difference of maximum salary and minimum salary (salary gap), average salary] of the 
        employees at each branch, and order by branch name (asc). */
    
    // max, min, avg salaries for each branch number
    const branch_salary_stats = await prisma.employee.groupBy({
        by: 'branchNumber',
        _max: { salary: true },
        _min: { salary: true },
        _avg: { salary: true},
    });
    // console.log(branch_salary_stats);

    // name and number of each branch
    const branch_name_numbers = await prisma.branch.findMany({
        select: {
            branchName: true,
            branchNumber: true,
        },
        orderBy: {
            branchName: 'asc',
        },
    });

    // branch name, salary gap, avg salary for each branch
    let result = [];
    for (branch of branch_name_numbers) {
        for (stat of branch_salary_stats) {
            if (stat.branchNumber === branch.branchNumber) {
                result.push({
                    "branchName": branch.branchName,
                    "salary gap": stat._max.salary - stat._min.salary,
                    "average salary": stat._avg.salary,
                });
                break;
            }
        }
    }

    // // raw query
    // const result = await prisma.$queryRaw`
    //     SELECT Branch.branchName, (MAX(Employee.salary) - MIN(Employee.salary)) AS "salary gap", AVG(Employee.salary) AS "average salary"
    //     FROM Employee
    //     JOIN Branch
    //     ON Employee.branchNumber = Branch.branchNumber
    //     GROUP BY branchName
    //     ORDER BY branchName
    //     LIMIT 10;`;

    res.type('json').send(JSON.stringify(result, 
        (key, value) => typeof value === 'bigint' ? value.toString() : value, 
        4
    ));    // need this for raw sql query
});

router.get("/13", async (req, res) => {

    /* 13. Select two values: (1) the number of employees working at the New York branch and (2) the number of different last 
        names of employees working at the New York branch. The result should contain two numbers in a single row. Name the two 
        columns countNY and countDIFF using the AS keyword. */
    
    // 
    const employee_count = (await prisma.employee.aggregate({
            _count: { sin: true, },
            where: {
                Branch_Employee_branchNumberToBranch: {
                    branchName: { equals: "New York" },
                },
            },
        }))
        ._count.sin;
    // console.log(employee_count);

    const last_name_count = (await prisma.employee.findMany({
            where: {
                Branch_Employee_branchNumberToBranch: {
                    branchName: { equals: "New York" },
                },
            },
            distinct: ['lastName'],
        }))
        .length;
    // console.log(last_name_count);

    const result = [
        {
            "countNY": employee_count,
            "countDIFF": last_name_count,
        }
    ];
    
    // // raw query
    // const result = await prisma.$queryRaw`
    //     SELECT COUNT(Employee.sin) AS countNY, COUNT(DISTINCT Employee.lastName) AS countDIFF
    //     FROM Employee
    //     JOIN Branch
    //     ON Employee.branchNumber = Branch.branchNumber
    //     WHERE Branch.branchName = "New York";`;

    
    res.type('json').send(JSON.stringify(result, 
        (key, value) => typeof value === 'bigint' ? value.toString() : value, 
        4
    ));    // need this for raw sql query
});

router.get("/14", async (req, res) => {

    /* 14. Select the [sum of the employee salaries] at the Moscow branch. The result should contain a single number. */
    
    // 
    const result = await prisma.employee.aggregate({
        _sum: { salary: true },
        where: {
            Branch_Employee_branchNumberToBranch: {
                branchName: { equals: "Moscow" },
            },
        },
    });

    // raw query
    // const result = await prisma.$queryRaw`
    //     SELECT SUM(Employee.salary)
    //     FROM Employee
    //     JOIN Branch
    //     ON Employee.branchNumber = Branch.branchNumber
    //     WHERE Branch.branchName = "Moscow";`;

    res.type('json').send(JSON.stringify(result, null, 4));
});

router.get("/15", async (req, res) => {

    /* 15. Select the [customer ID, first name, last name] of customers who own accounts from only four different types of branches, 
        and order by last name (asc) then first name (asc). */
    
    // customers and accounts
    const customers_accounts = await prisma.owns.findMany({
        select: {
            Customer: {
                select: {
                    customerID: true,
                    firstName: true,
                    lastName: true,
                }
            },
            Account: {
                select: {
                    branchNumber: true,
                }
            },
        },
        orderBy: [
            { Customer: { lastName: 'asc' } },
            { Customer: { firstName: 'asc' } },
        ],
    });

    // customer id with set of account branches
    let cust_acc_branches = new Map();
    for (let acc of customers_accounts) {
        cust_id = acc.Customer.customerID;
        acc_branch = acc.Account.branchNumber;
        if (cust_acc_branches.has(cust_id)) {
            cust_acc_branches.get(cust_id).add(acc_branch);
        }
        else {
            cust_acc_branches.set(cust_id, new Set([acc_branch]));
        }
    }

    let result = [];
    for (let acc of customers_accounts) {
        cust_id = acc.Customer.customerID;
        if (cust_acc_branches.has(cust_id)) {
            // if customer has accounts in four different branches
            if (cust_acc_branches.get(cust_id).size === 4) {
                result.push({
                    "customerID": cust_id,
                    "firstName": acc.Customer.firstName,
                    "lastName": acc.Customer.lastName,
                });
                cust_acc_branches.delete(cust_id);
            }
        }
    }

    // // raw query
    // const result = await prisma.$queryRaw`
    //     SELECT Customer.customerID, Customer.firstName, Customer.lastName
    //     FROM Customer
    //     JOIN Owns
    //     ON Customer.customerID = Owns.customerID
    //     JOIN Account
    //     ON Owns.accNumber = Account.accNumber
    //     GROUP BY Customer.customerID
    //     HAVING COUNT(DISTINCT Account.branchNumber) = 4
    //     ORDER BY lastName, firstName
    //     LIMIT 10;`;

    res.type('json').send(JSON.stringify(result, null, 4));
});

router.get("/16", async (req, res) => {

    /* 16. Select the [average income] of customers older than 60 and [average income] of customers younger than 26. The result 
        should contain the two numbers in a single row. (Hint: you can use MySQL time and date functions here: 
        http://www.mysqltutorial.org/mysql-timestampdiff/ ) */

    const customer_birthdata_incomes = await prisma.customer.findMany({
        select: {
            birthData: true,
            income: true,
        },
    });

    let count_old = 0;
    let sum_income_old = 0;
    let count_young = 0;
    let sum_income_young = 0;
    for (cust of customer_birthdata_incomes) {
        const birth_date = new Date(cust.birthData);
        const age = new Date(Date.now() - birth_date).getFullYear() - 1970;
        // console.log(age);
        if (age > 60) {
            count_old++;
            sum_income_old += cust.income;
        } else if (age < 26) {
            count_young++;
            sum_income_young += cust.income;
        }
    }

    const result = [{
        "average income for 60+": sum_income_old / count_old,
        "average income for <26": sum_income_young / count_young,
    }];
    
    // // raw query
    // const result = await prisma.$queryRaw`
    //     SELECT AVG(C1.income) AS "average income for 60+", AVG(C2.income) AS "average income for <26"
    //     FROM Customer C1, Customer C2
    //     WHERE TIMESTAMPDIFF(YEAR, C1.birthData, "2023-11-4") > 60
    //         AND TIMESTAMPDIFF(YEAR, C2.birthData, "2023-11-4") < 26;`;

    res.type('json').send(JSON.stringify(result, null, 4));
});

router.get("/17", async (req, res) => {

    /* 17. Select the [customer ID, first name, last name, income, average account balance] of customers who have at least 
        three accounts, and whose last names begin with S and contain an e (e.g. Steve), and order by customer ID (asc). */
    
    // customers whose last names begin with S and contain e
    const customers_accounts = await prisma.owns.findMany({
        select: {
            Customer: {
                select: {
                    customerID: true,
                    firstName: true,
                    lastName: true,
                    income: true,
                },
            },
            Account: {
                select: {
                    balance: true,
                },
            },
        },
        where: {
            Customer: {
                lastName: {
                    startsWith: "S",
                    contains: "e",
                },
            },
        },
        orderBy: {
            Customer: {
                customerID: 'asc',
            },
        },
    });
    // console.log(customers_accounts);

    // total account balance and number of accounts held by each customer whose last name starts with s and contains e
    let sum_balance_acc_counts = new Map();
    for (acc of customers_accounts) {
        cust_id = acc.Customer.customerID;
        balance = Number(acc.Account.balance);
        if (sum_balance_acc_counts.has(cust_id)) {
            bal_cnt = sum_balance_acc_counts.get(cust_id);
            bal_cnt[0] += balance;
            bal_cnt[1] += 1;
        } else {
            sum_balance_acc_counts.set(cust_id, [balance, 1])
        }
    }
    // console.log(sum_balance_acc_counts);
    
    let result = [];
    for (acc of customers_accounts) {
        cust_id = acc.Customer.customerID;
        if (sum_balance_acc_counts.has(cust_id)) {
            const total_bal_num_accs = sum_balance_acc_counts.get(cust_id)
            const total_bal = total_bal_num_accs[0];
            const num_accs = total_bal_num_accs[1];
            if (num_accs >= 3) {
                result.push({
                    "customerID": cust_id,
                    "firstName": acc.Customer.firstName,
                    "lastName": acc.Customer.lastName,
                    "income": acc.Customer.income,
                    "average account balance": total_bal / num_accs,
                });
            }
            sum_balance_acc_counts.delete(cust_id);
        }
    }
    
    // // raw query
    // const result = await prisma.$queryRaw`
    //     SELECT Customer.customerID, Customer.firstName, Customer.lastName, Customer.income, AVG(Account.balance) AS "average account balance"
    //     FROM Customer
    //     JOIN Owns
    //     ON Owns.customerID = Customer.customerID
    //     JOIN Account
    //     ON Account.accNumber = Owns.accNumber
    //     WHERE Customer.lastName LIKE "S%"
    //         AND Customer.lastName LIKE "%e%"
    //     GROUP BY Customer.customerID
    //     HAVING COUNT(Owns.accNumber) > 3
    //     ORDER BY Customer.customerID
    //     LIMIT 10;`;

    res.type('json').send(JSON.stringify(result, null, 4));
});

router.get("/18", async (req, res) => {

    /* 18. Select the [account number, balance, sum of transaction amounts] for accounts in the Berlin branch that have at least 
        10 transactions, and order by transaction sum (asc). */
    
    // account number, balance, and transaction amount for transactions for accounts in the Berlin branch
    const accounts_transactions = await prisma.transactions.findMany({
        select: {
            Account: {
                select: {
                    accNumber: true,
                    balance: true,
                },
            },
            amount: true,
        },
        where: {
            Account: {
                Branch: {
                    branchName: { equals: "Berlin" }
                }
            }
        }
    });

    let account_transaction_stats = new Map();
    for (acc of accounts_transactions) {
        acc_num = acc.Account.accNumber;
        trans_amount = Number(acc.amount);
        if (account_transaction_stats.has(acc_num)) {
            stats = account_transaction_stats.get(acc_num);
            stats[0] += trans_amount;    // total transaction amount
            stats[1] += 1;    // number of transactions
        } else {
            account_transaction_stats.set(acc_num, [trans_amount, 1]);
        }
    }

    let result = [];
    for (acc of accounts_transactions) {
        acc_num = acc.Account.accNumber;
        if (account_transaction_stats.has(acc_num)) {
            stats = account_transaction_stats.get(acc_num);
            sum_trans_amount = stats[0];
            trans_count = stats[1];
            if (trans_count >= 10) {
                result.push({
                    "accNumber": acc_num,
                    "balance": acc.Account.balance,
                    "sum of transaction amounts": sum_trans_amount,
                });
            }
            account_transaction_stats.delete(acc_num);    // to prevent duplicate entries
        }
    }
    result = result.sort((a, b) => a["sum of transaction amounts"] - b["sum of transaction amounts"]);

    // // raw query
    // const result = await prisma.$queryRaw`
    //     SELECT Account.accNumber, Account.balance, SUM(Transactions.amount) AS "transaction sum"
    //     FROM Account
    //     JOIN Transactions
    //     ON Account.accNumber = Transactions.accNumber
    //     JOIN Branch
    //     ON Account.branchNumber = Branch.branchNumber
    //     WHERE Branch.branchName = "Berlin"
    //     GROUP BY Account.accNumber
    //     HAVING COUNT(Transactions.transNumber) >= 10
    //     ORDER BY SUM(Transactions.amount)
    //     LIMIT 10;`;

    res.type('json').send(JSON.stringify(result, null, 4));
});

router.get("/19", async (req, res) => {

    /* 19. Select the [branch name, account type, average transaction amount] of each account type of a branch for branches that 
        have at least 50 accounts of any type. Order the result by branch name (asc) then account type (asc). */

    // find the branches that have at least 50 accounts
    const branch_account_count = await prisma.account.groupBy({
        by: ['branchNumber'],
        _count: { accNumber: true },
    });
    // console.log(branch_account_count);

    const branch_name_numbers = await prisma.branch.findMany({
        select: {
            branchName: true,
            branchNumber: true,
        },
    });

    let valid_branch_numbers = [];
    for (branch of branch_account_count) {
        if (branch._count.accNumber >= 50) {
            valid_branch_numbers.push(branch.branchNumber);
        }
    }
    let valid_branches = [];
    for (branch of branch_name_numbers) {
        if (valid_branch_numbers.includes(branch.branchNumber)) {
            valid_branches.push(branch.branchName);
        }
    }
    // console.log(valid_branches);

    // all transactions at branches with at leas 50 accounts
    const transactions = await prisma.transactions.findMany({
        select: {
            Account: {
                select: {
                    Branch: {
                        select: { branchName: true },
                    },
                    type: true,
                }
            },
            amount: true,
        },
        where: {
            Account: {
                Branch: {
                    branchName: { in: valid_branches }
                }
            }
        },
        orderBy: [
            {
                Account: {
                    Branch: { branchName: 'asc' }
                }
            },
            {
                Account: {
                    type: 'asc'
                }
            },
        ]
    });

    // calculate average transaction amounts for each account type of each branch
    let branch_type_trans_stats = new Map();
    for (trans of transactions) {
        branch = trans.Account.Branch.branchName;
        type = trans.Account.type;
        trans_amount = Number(trans.amount);
        branch_type = branch.concat('_', type);
        if (branch_type_trans_stats.has(branch_type)) {
            const [total_trans_amount, trans_count] = branch_type_trans_stats.get(branch_type);
            branch_type_trans_stats.set(branch_type, [total_trans_amount + trans_amount, trans_count + 1]);
        } else {
            branch_type_trans_stats.set(branch_type, [trans_amount, 1]);
        }
    }
    console.log(branch_type_trans_stats);

    let result = [];
    for (let [branch_type, [total_trans_amount, trans_count]] of branch_type_trans_stats) {
        branch = branch_type.split("_")[0];
        type = branch_type.split("_")[1];
        result.push({
            "branchName": branch,
            "type": type,
            "average transaction amount": total_trans_amount / trans_count,
        });
    }
    
    // // raw query
    // const result = await prisma.$queryRaw`
    //     SELECT B.branchName, Account.type, AVG(Transactions.amount) AS "average transaction amount"
    //     FROM Branch AS B
    //     JOIN Account
    //     ON Account.branchNumber = B.branchNumber
    //     JOIN Transactions
    //     ON Transactions.accNumber = Account.accNumber
    //     WHERE EXISTS (  -- branches with at least 50 accounts
    //         SELECT *
    //         FROM Branch
    //         JOIN Account
    //         ON Account.branchNumber = Branch.branchNumber
    //         WHERE B.branchNumber = Branch.branchNumber
    //         GROUP BY Branch.branchName
    //         HAVING COUNT(Account.accNumber) >= 50)
    //     GROUP BY B.branchName, Account.type
    //     ORDER BY B.branchName, Account.type
    //     LIMIT 10;`;

    res.type('json').send(JSON.stringify(result, null, 4));
});

router.get("/20", async (req, res) => {

    /* 20. Select the [account type, account number, transaction number, amount of transactions] of accounts where the average 
        transaction amount is greater than three times the (overall) average transaction amount of accounts of that type. For 
        example, if the average transaction amount of all business accounts is $2,000 then return transactions from business 
        accounts where the average transaction amount for that account is greater than $6,000. Order by account type (asc), 
        account number (asc), and then transaction number (asc). Note that all transactions of the qualifying accounts should be 
        returned even if their amounts are less than the average amount of the account type. */

    // get all required transaction info from database
    const transactions = await prisma.transactions.findMany({
        select: {
            Account: {
                select: { type: true }
            },
            accNumber: true,
            transNumber: true,
            amount: true,
        },
        orderBy: [
            { Account: { type: 'asc' } },
            { accNumber: 'asc' },
            { transNumber: 'asc' },
        ],
    });

    // find average transaction amount of every account
    let transaction_stats = new Map();
    for (trans of transactions) {
        acc_num = trans.accNumber;
        trans_amount = Number(trans.amount);
        if (transaction_stats.has(acc_num)) {
            const [total_trans_amount, trans_count] = transaction_stats.get(acc_num);
            transaction_stats.set(acc_num, [total_trans_amount + trans_amount, trans_count + 1]);
        } else {
            transaction_stats.set(acc_num, [trans_amount, 1]);
        }
    }
    let avg_transaction_amounts = new Map();
    for ([acc_num, [total_amount, count]] of transaction_stats) {
        avg_transaction_amounts.set(acc_num, total_amount / count);
    }
    console.log(avg_transaction_amounts);

    // find avg transaction amount of each account type
    let type_transaction_stats = new Map();
    for (trans of transactions) {
        acc_type = trans.Account.type;
        trans_amount = Number(trans.amount);
        if (type_transaction_stats.has(acc_type)) {
            const [total_trans_amount, trans_count] = type_transaction_stats.get(acc_type);
            type_transaction_stats.set(acc_type, [total_trans_amount + trans_amount, trans_count + 1]);
        } else {
            type_transaction_stats.set(acc_type, [trans_amount, 1]);
        }
    }
    let type_avg_transaction_amounts = new Map();
    for ([acc_type, [total_amount, count]] of type_transaction_stats) {
        type_avg_transaction_amounts.set(acc_type, total_amount / count);
    }
    console.log(type_avg_transaction_amounts)

    // get transactions of accounts with avg transaction amount > 3 * avg transaction amount of corresponding account type
    let result = [];
    for (trans of transactions) {
        acc_type = trans.Account.type;
        acc_num = trans.accNumber;
        trans_num = trans.transNumber;
        trans_amount = trans.amount;
        if (avg_transaction_amounts.get(acc_num) > 3 * type_avg_transaction_amounts.get(acc_type)) {
            result.push({
                "type": acc_type,
                "accNumber": acc_num,
                "transNumber": trans_num,
                "amount": trans_amount,
            });
        }
    }
    
    // // raw query
    // const result = await prisma.$queryRaw`
    //     SELECT A.type, A.accNumber, Transactions.transNumber, Transactions.amount
    //     FROM Account AS A
    //     JOIN Transactions
    //     ON A.accNumber = Transactions.accNumber
    //     WHERE EXISTS (
    //         SELECT *
    //         FROM Account AS A2
    //         JOIN Transactions
    //         ON A2.accNumber = Transactions.accNumber
    //         WHERE A2.accNumber = A.accNumber
    //         GROUP BY A2.accNumber
    //         HAVING AVG(Transactions.amount) > 3 * (
    //             SELECT AVG(Transactions.amount)
    //             FROM Account
    //             JOIN Transactions
    //             ON Account.accNumber = Transactions.accNumber
    //             WHERE Account.type = A2.type))
    //     LIMIT 10;`;

    res.type('json').send(JSON.stringify(result, null, 4));
});


module.exports = router;