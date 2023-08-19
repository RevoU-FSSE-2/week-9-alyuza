const express = require('express')
const mysql = require('mysql2')
const bodyParser = require('body-parser')
require('dotenv').config()

const app = express()
const port = process.env.PORT || 8000;

const commonResponse = function (data, error) {
    if (error) {
        return {
            success: false,
            error: error
        }
    }
    return {
        success: true,
        data: data
    }
}

// ====== mysql connection
const mysqlCon = mysql.createConnection({
    host: process.env.MYSQL_HOST,
    port: process.env.MYSQL_PORT,
    user: process.env.MYSQL_USER,
    password: process.env.MYSQL_PASS,
    database: process.env.MYSQL_DB
})
// ====== connect database to railway
const mysqlCon2 = mysql.createConnection(`mysql://root:3RG8oJP05CsjeTxJl1Aw@containers-us-west-169.railway.app:6784/railway`)
mysqlCon2.connect((err) => {
    if (err) throw err
    console.log("mysql successfully connected")
})

app.use(bodyParser.json())

// ====== get all user
app.get('/user', (request, response) => {
    mysqlCon2.query("select * from user", (err, result, fields) => {
        if (err) {
            console.error(err)
            response.status(500).json(commonResponse(null, "server error"))
            response.end()
            return
        }
        response.status(200).json(commonResponse(result, null))
        response.end()
    })
})

// ====== get user by id
app.get('/user/:id', async (request, response) => {
    const id = request.params.id

    mysqlCon2.query(`
    SELECT u.id, u.name, u.address,
	    (SELECT sum(t.amount) - (SELECT sum(t.amount)
			FROM transaction t
			WHERE t.type = "expense" and t.user_id = ${request.params.id} )
		FROM transaction t
		WHERE t.type = "income" and t.user_id = ${request.params.id}) as balance,
	    (select sum(t.amount)
		    from transaction t
		    where t.type = "expense" and t.user_id = ${request.params.id}) as expense
        from user as u,
	    transaction AS t
        WHERE u.id = ${request.params.id}
        GROUP by u.id`,
        (err, result, fields) => {
            if (err) {
                console.error(err)
                response.status(500).json(commonResponse(null, "server error"))
                response.end
                return
            }
            if (result.affectedRows !== 0) {
                console.log("Transaction Connected", result)
                response.status(200).json(commonResponse(result, null))
                response.end
            } else {
                response.status(404).send("User ID is not found")
            }
        })
})

// ====== post
app.post('/transaction', (request, response) => {
    const body = request.body

    mysqlCon2.query(`
    insert into
    transaction (user_id, type, amount)
    values(?, ?, ?)`,
        [body.user_id, body.type, body.amount], (err, result, fields) => {
            if (err) {
                console.error(err)
                response.status(500).json(commonResponse(null, "Server error"))
                response.end
                return
            }
            response.status(200).json(commonResponse({ id: result.insertId }, null))
            response.end
        })
})

// ====== put
app.put('/transaction/:id', (request, response) => {
    const id = request.params.id;
    const { type, amount, user_id } = request.body
    console.log(request.body)
    mysqlCon2.query(
        `UPDATE transaction
        SET user_id=?, type=?, amount=?
        WHERE id=?`, [user_id, type, amount, id],
        (err, result, fields) => {
            if (err) {
                console.error(err)
                response.status(500).json((null), "Response error")
                response.end()
                return
            }
            console.log("transaction connected", result);
            response.status(200).json({ id: id })
            response.end()
        }
    )
}
);

// ====== delete
app.delete('/transaction/:id', (request, response) => {
    mysqlCon2.query(`
   delete from transaction
   where id = ${request.params.id}`,
        (err, result, fields) => {
            if (err) {
                console.error(err)
                response.status(500).json(commonResponse(null, "Server error"))
                response.end
                return
            }
            if (result.affectedRows !== 0) {
                console.log(" Transaction Success", result);
                response.status(200).json(commonResponse(`Successfully removed ID : ${request.params.id}`))
                response.end
            } else {
                response.status(404).send("User ID is not found")
            }
        })
})

app.listen(port, () => {
    console.log(`⚡️Server is running at localhost:${port}`);
});












// ====== put
// app.put('/transaction/:id', (request, response) => {
//     const { type, amount, user_id } = request.body
//     console.log(request.body)

//     mysqlCon2.query(`
//     update transaction
//     set user_id = ${user_id}, type = ${type}, amount = ${amount}
//     where id=${request.params.id}`, (err, result, fields) => {
//         if (err) {
//             console.error(err)
//             response.status(500).json(commonResponse(null, "Server error"))
//             response.end
//             return
//         }
//         if (result.affectedRows !== 0) {
//             console.log(" Transaction Success", result);
//             response.status(200).json(commonResponse(parseInt(request.params.id)), null)
//             response.end
//         } else {
//             response.status(404).send("User ID is not found")
//         }
//     })
// })