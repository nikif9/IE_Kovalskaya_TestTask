const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = 3000;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'test',
    password: 'admin',
    port: 5432,
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        balance INTEGER NOT NULL
    );
`;

const insertUser = `
    INSERT INTO users (id, balance)
    VALUES (1, 10000)
    ON CONFLICT (id) DO NOTHING
    RETURNING *;
`;

pool.query(createUsersTable)
    .then(() => pool.query(insertUser))
    .then((res) => {
        if (res.rows.length > 0) {
            console.log('User created:', res.rows[0]);
        } else {
            console.log('User already exists.');
        }
    })
    .catch((err) => console.error(err))
    .finally(() => {
        // You can keep the pool alive during the entire lifetime of your application
        // or close it when your application is terminating
        // pool.end();
    });

app.put('/updateBalance', async (req, res) => {
    const { userId, amount } = req.body;

    const client = await pool.connect();

    try {
        // Начинаем транзакцию
        await client.query('BEGIN');

        // Проверяем, не приведет ли операция к отрицательному балансу
        const checkResult = await client.query(`
            SELECT (balance + ${amount}) < 0 AS "notEnoughMoney"
            FROM users
            WHERE id = ${userId}
            FOR UPDATE;
          `);

        const { notEnoughMoney } = checkResult.rows[0];

        if (notEnoughMoney) {
            return res.status(400).json({ error: 'Not enough funds' });
        }

        // Обновляем баланс, т.к. проверка прошла успешно
        const updateResult = await client.query(`
            UPDATE users
            SET balance = balance + ${amount}
            WHERE id = ${userId}
            RETURNING *;
          `);

        if (updateResult.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const updatedUser = updateResult.rows[0];

        // Завершаем транзакцию
        await client.query('COMMIT');

        res.json(updatedUser);
    } catch (error) {
        // В случае ошибки откатываем транзакцию
        await client.query('ROLLBACK');
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        // Возвращаем клиента в пул соединений
        client.release();
    }
});

app.get('/users', async (req, res) => {
    try {
        const getUsersQuery = 'SELECT * FROM users;';
        const result = await pool.query(getUsersQuery);
        const users = result.rows;
        res.send(`
            <h1>All Users</h1>
            <ul>
                ${users.map(user => `<li>User ID: ${user.id}, Balance: ${user.balance}</li>`).join('')}
            </ul>
        `);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
