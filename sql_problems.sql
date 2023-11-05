-- 1. Select the [first name, last name, income] of customers whose income is within [$50,000, $60,000] and order by income (desc), last name (asc), and then first name (asc).
SELECT firstName, lastName, income
FROM Customer
WHERE income BETWEEN 50000 AND 60000
ORDER BY income DESC, lastName ASC, firstName ASC
LIMIT 10;
-- 2. Select the [SIN, branch name, salary, manager’s salary - salary (that is, the salary of the employee’s manager minus salary of the employee)] of all employees in London or Berlin, and order by descending (manager’s salary - salary).
SELECT Employee.sin, Branch.branchName, Employee.salary, (Manager.salary - Employee.salary) AS "manager's salary - salary"
FROM Employee
JOIN Branch
ON Employee.branchNumber = Branch.branchNumber
JOIN Employee AS Manager
ON Manager.sin = Branch.managerSIN
WHERE Branch.branchName = "London" OR Branch.branchName = "Berlin"
ORDER BY (Manager.salary - Employee.salary) DESC
LIMIT 10;
-- 3. Select the [first name, last name, income] of customers whose income is at least double the income of every customer whose last name is Butler, and order by last name (asc) then first name (asc).
SELECT firstName, lastName, income
FROM Customer
WHERE income >= 2 * (SELECT income FROM Customer WHERE lastName = "Butler" ORDER BY income DESC LIMIT 1)
ORDER BY lastName, firstName
LIMIT 10;
-- 4.  Select the [customer ID, income, account number, branch number] of customers with incomes greater than $80,000 who own an account at both London and Latveria branches, and order by customer ID (asc) then account number (asc). The result should contain all the account numbers of customers who meet the criteria, even if the account itself is not held at London or Latveria. For example, if a customer with an income greater than $80,000 owns accounts in London, Latveria, and New York, the customer meets the criteria, and the New York account must also be in the result.
SELECT C.customerID, C.income, Owns.accNumber, Account.branchNumber
FROM Customer AS C
JOIN Owns
ON C.customerID = Owns.customerID
JOIN Account
ON Owns.accNumber = Account.accNumber
WHERE C.income > 80000
  AND EXISTS (  -- account in Latveria
    SELECT *
    FROM Customer
    JOIN Owns
    ON Customer.customerID = Owns.customerID
    JOIN Account
    ON Owns.accNumber = Account.accNumber
    JOIN Branch
    ON Account.branchNumber = Branch.branchNumber
    WHERE C.customerID = Customer.customerID
      AND Branch.branchName = "Latveria")
  AND EXISTS (  -- account in London
    SELECT *
    FROM Customer
    JOIN Owns
    ON Customer.customerID = Owns.customerID
    JOIN Account
    ON Owns.accNumber = Account.accNumber
    JOIN Branch
    ON Account.branchNumber = Branch.branchNumber
    WHERE C.customerID = Customer.customerID
      AND Branch.branchName = "London")
ORDER BY customerID, accNumber
LIMIT 10;
-- 5. Select the [customer ID, type, account number, balance] of business (type BUS) and savings (type SAV) accounts owned by customers who own at least one business account or at least one savings account, and order by customer ID (asc), type (asc), and then account number (asc).
SELECT Customer.customerID, Account.type, Owns.accNumber, Account.balance
FROM Customer
JOIN Owns
ON Customer.customerID = Owns.customerID
JOIN Account
ON Owns.accNumber = Account.accNumber
WHERE Account.type IN ("BUS", "SAV")
ORDER BY customerID, type, accNumber
LIMIT 10;
-- 6. Select the [branch name, account number, balance] of accounts with balances greater than $100,000 held at the branch managed by Phillip Edwards, and order by account number (asc).
SELECT Branch.branchName, Account.accNumber, Account.balance
FROM Account
JOIN Branch
ON Account.branchNumber = Branch.branchNumber
JOIN Employee
ON Branch.managerSIN = Employee.sin
WHERE Account.balance > 100000
  AND Employee.firstName = "Phillip"
  AND Employee.lastName = "Edwards"
ORDER BY accNumber
LIMIT 10;
-- 7. Select the [customer ID] of customers that 1) have an account at the New York branch, 2) do not own an account at the London branch, 3) do not co-own an account with another customer who owns an account at the London branch. Order the result by customer ID (asc). The result should not contain duplicate customer IDs. Write a query satisfying all three conditions.
SELECT C.customerID
FROM Customer AS C
WHERE EXISTS (  -- account in New York
    SELECT *
    FROM Customer
    JOIN Owns
    ON Customer.customerID = Owns.customerID
    JOIN Account
    ON Owns.accNumber = Account.accNumber
    JOIN Branch
    ON Account.branchNumber = Branch.branchNumber
    WHERE C.customerID = Customer.customerID
      AND Branch.branchName = "New York")
  AND NOT EXISTS (  -- no account in London
    SELECT *
    FROM Customer
    JOIN Owns
    ON Customer.customerID = Owns.customerID
    JOIN Account
    ON Owns.accNumber = Account.accNumber
    JOIN Branch
    ON Account.branchNumber = Branch.branchNumber
    WHERE C.customerID = Customer.customerID
      AND Branch.branchName = "London")
  AND NOT EXISTS (  -- no account co-ownership with London account holder
    SELECT DISTINCT C2.customerID    -- all customers who co-own an account with a customer who owns a london account
    FROM Customer as C2
    JOIN Owns AS O
    ON C2.customerID = O.customerID
    WHERE C.customerID = C2.customerID
      AND O.accNumber IN (
        SELECT Owns.accNumber   -- all accounts owned by london account holders
        FROM Owns
        JOIN Customer AS C1
        ON Owns.customerID = C1.customerID
        WHERE EXISTS (  -- customer holds a london account
            SELECT *
            FROM Customer
            JOIN Owns
            ON Customer.customerID = Owns.customerID
            JOIN Account
            ON Owns.accNumber = Account.accNumber
            JOIN Branch
            ON Account.branchNumber = Branch.branchNumber
            WHERE C1.customerID = Customer.customerID
              AND Branch.branchName = "London")))
ORDER BY customerID
LIMIT 10;
-- 8. Select the [SIN, first name, last name, salary, branch name] of employees who earn more than $50,000. If an employee is a manager, show the branch name of his/her branch. Otherwise, insert a NULL value for the branch name (the fifth column). Order the result by branch name (desc) then first name (asc). You must use an outer join in your solution for this problem.
SELECT Employee.sin, Employee.firstName, Employee.lastName, Employee.salary, Branch.branchName
FROM Employee
LEFT JOIN Branch
ON Employee.sin = Branch.ManagerSIN
WHERE Employee.salary > 50000
ORDER BY branchName DESC, firstName
LIMIT 10;
-- 9. Solve question (8) again without using any join operations. Here, using an implicit cross join such as FROM A, B is accepted, but there should be no JOIN operator in your query.
SELECT Employee.sin, Employee.firstName, Employee.lastName, Employee.salary, Branch.branchName
FROM Employee, Branch
WHERE Employee.branchNumber = Branch.branchNumber
  AND Employee.salary > 50000
  AND Branch.managerSIN = Employee.sin
UNION
SELECT Employee.sin, Employee.firstName, Employee.lastName, Employee.salary, NULL
FROM Employee, Branch
WHERE Employee.branchNumber = Branch.branchNumber
  AND Employee.salary > 50000
  AND Branch.managerSIN <> Employee.sin
ORDER BY branchName DESC, firstName
LIMIT 10;
-- 10. Select the [customer ID, first name, last name, income] of customers who have incomes greater than $5000 and own accounts in ALL of the branches that Helen Morgan owns accounts in, and order by income (desc). For example, if Helen owns accounts in London and Berlin, a customer who owns accounts in London, Berlin, and New York has to be included in the result. If a customer owns accounts in London and New York, the customer does not have to be in the result. The result should also contain Helen Morgan.
SELECT C.customerID, C.firstName, C.lastName, C.income
FROM Branch B
    JOIN Account A
    ON A.branchNumber = B.branchNumber
    JOIN Owns O
    ON O.accNumber = A.accNumber
    JOIN Customer C
    ON C.customerID = O.customerID
WHERE C.income > 5000
  AND B.branchName IN (SELECT Branch.branchName  -- all customer accounts in branches with helen accounts
    FROM Branch
    JOIN Account
    ON Account.branchNumber = Branch.branchNumber
    JOIN Owns
    ON Owns.accNumber = Account.accNumber
    JOIN Customer
    ON Customer.customerID = Owns.customerID
    WHERE Customer.firstName = "Helen" AND Customer.lastName = "Morgan")
GROUP BY C.customerID
HAVING COUNT(DISTINCT B.branchName) = (SELECT COUNT(DISTINCT Branch.branchName)  -- customers with same number of branches as helen
    FROM Branch
    JOIN Account
    ON Account.branchNumber = Branch.branchNumber
    JOIN Owns
    ON Owns.accNumber = Account.accNumber
    JOIN Customer
    ON Customer.customerID = Owns.customerID
    WHERE Customer.firstName = "Helen" AND Customer.lastName = "Morgan")
ORDER BY C.income DESC
LIMIT 10;
-- 11. Select the [SIN, first name, last name, salary] of the lowest paid employee (or employees) of the Berlin branch, and order by sin (asc).
SELECT Employee.sin, Employee.firstName, Employee.lastName, Employee.salary
FROM Employee
JOIN Branch
ON Employee.branchNumber = Branch.branchNumber
WHERE Branch.branchName = "Berlin"
  AND Employee.salary IN (
    SELECT MIN(Employee.salary)
    FROM Employee
    JOIN Branch
    ON Employee.branchNumber = Branch.branchNumber
    WHERE Branch.branchName = "Berlin")
ORDER BY sin
LIMIT 10;
-- 12. Select the [branch name, the difference of maximum salary and minimum salary (salary gap), average salary] of the employees at each branch, and order by branch name (asc).
SELECT Branch.branchName, (MAX(Employee.salary) - MIN(Employee.salary)) AS "salary gap", AVG(Employee.salary) AS "average salary"
FROM Employee
JOIN Branch
ON Employee.branchNumber = Branch.branchNumber
GROUP BY branchName
ORDER BY branchName
LIMIT 10;
-- 13. Select two values: (1) the number of employees working at the New York branch and (2) the number of different last names of employees working at the New York branch. The result should contain two numbers in a single row. Name the two columns countNY and countDIFF using the AS keyword.
SELECT COUNT(Employee.sin) AS countNY, COUNT(DISTINCT Employee.lastName) AS countDIFF
FROM Employee
JOIN Branch
ON Employee.branchNumber = Branch.branchNumber
WHERE Branch.branchName = "New York";
-- 14. Select the [sum of the employee salaries] at the Moscow branch. The result should contain a single number.
SELECT SUM(Employee.salary)
FROM Employee
JOIN Branch
ON Employee.branchNumber = Branch.branchNumber
WHERE Branch.branchName = "Moscow";
-- 15. Select the [customer ID, first name, last name] of customers who own accounts from only four different types of branches, and order by last name (asc) then first name (asc).
SELECT Customer.customerID, Customer.firstName, Customer.lastName
FROM Customer
JOIN Owns
ON Customer.customerID = Owns.customerID
JOIN Account
ON Owns.accNumber = Account.accNumber
GROUP BY Customer.customerID
HAVING COUNT(DISTINCT Account.branchNumber) = 4
ORDER BY lastName, firstName
LIMIT 10;
-- 16. Select the [average income] of customers older than 60 and [average income] of customers younger than 26. The result should contain the two numbers in a single row. (Hint: you can use MySQL time and date functions here: http://www.mysqltutorial.org/mysql-timestampdiff/ )
SELECT AVG(C1.income) AS "average income for 60+", AVG(C2.income) AS "average income for <26"
FROM Customer C1, Customer C2
WHERE TIMESTAMPDIFF(YEAR, C1.birthData, "2023-11-4") > 60
  AND TIMESTAMPDIFF(YEAR, C2.birthData, "2023-11-4") < 26;
-- 17. Select the [customer ID, first name, last name, income, average account balance] of customers who have at least three accounts, and whose last names begin with S and contain an e (e.g. Steve), and order by customer ID (asc).
SELECT Customer.customerID, Customer.firstName, Customer.lastName, Customer.income, AVG(Account.balance) AS "average account balance"
FROM Customer
JOIN Owns
ON Owns.customerID = Customer.customerID
JOIN Account
ON Account.accNumber = Owns.accNumber
WHERE Customer.lastName LIKE "S%"
  AND Customer.lastName LIKE "%e%"
GROUP BY Customer.customerID
HAVING COUNT(Owns.accNumber) > 3
ORDER BY Customer.customerID
LIMIT 10;
-- 18. Select the [account number, balance, sum of transaction amounts] for accounts in the Berlin branch that have at least 10 transactions, and order by transaction sum (asc).
SELECT Account.accNumber, Account.balance, SUM(Transactions.amount) AS "transaction sum"
FROM Account
JOIN Transactions
ON Account.accNumber = Transactions.accNumber
JOIN Branch
ON Account.branchNumber = Branch.branchNumber
WHERE Branch.branchName = "Berlin"
GROUP BY Account.accNumber
HAVING COUNT(Transactions.transNumber) >= 10
ORDER BY SUM(Transactions.amount)
LIMIT 10;
-- 19. Select the [branch name, account type, average transaction amount] of each account type of a branch for branches that have at least 50 accounts of any type. Order the result by branch name (asc) then account type (asc).
SELECT B.branchName, Account.type, AVG(Transactions.amount) AS "average transaction amount"
FROM Branch AS B
JOIN Account
ON Account.branchNumber = B.branchNumber
JOIN Transactions
ON Transactions.accNumber = Account.accNumber
WHERE EXISTS (  -- branches with at least 50 accounts
    SELECT *
    FROM Branch
    JOIN Account
    ON Account.branchNumber = Branch.branchNumber
    WHERE B.branchNumber = Branch.branchNumber
    GROUP BY Branch.branchName
    HAVING COUNT(Account.accNumber) >= 50)
GROUP BY B.branchName, Account.type
ORDER BY B.branchName, Account.type
LIMIT 10;
-- 20. Select the [account type, account number, transaction number, amount of transactions] of accounts where the average transaction amount is greater than three times the (overall) average transaction amount of accounts of that type. For example, if the average transaction amount of all business accounts is $2,000 then return transactions from business accounts where the average transaction amount for that account is greater than $6,000. Order by account type (asc), account number (asc), and then transaction number (asc). Note that all transactions of the qualifying accounts should be returned even if their amounts are less than the average amount of the account type.
SELECT A.type, A.accNumber, Transactions.transNumber, Transactions.amount
FROM Account AS A
JOIN Transactions
ON A.accNumber = Transactions.accNumber
WHERE EXISTS (
    SELECT *
    FROM Account AS A2
    JOIN Transactions
    ON A2.accNumber = Transactions.accNumber
    WHERE A2.accNumber = A.accNumber
    GROUP BY A2.accNumber
    HAVING AVG(Transactions.amount) > 3 * (
        SELECT AVG(Transactions.amount)
        FROM Account
        JOIN Transactions
        ON Account.accNumber = Transactions.accNumber
        WHERE Account.type = A2.type))
ORDER BY type, accNumber, transNumber
LIMIT 10;