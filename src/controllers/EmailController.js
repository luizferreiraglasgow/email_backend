const MailQueue = require("../queue/MailQueue");
const dotenv = require("dotenv");
const mysql = require("mysql2");

// Load mysql configurations
dotenv.config();

// MySQL connection pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Verify pool connection ( developer test only )
console.log("Pool created with configurations:", pool.config);

async function sendEmail(request, reply) {
  const { email, firstName, lastName } = request.body;
  console.log("Request body:", request.body);

  const template = `
          Hey ${firstName} ${lastName}, Your subscription has been confirmed!
          To access its exclusive resources you just need to click here.
      `;

  try {
    // Get a connection from the pool
    pool.getConnection((err, connection) => {
      if (err) {
        console.error("Error getting MySQL connection:", err);
        return reply.code(500).send("Internal Server Error");
      }

      // Insert user data into the database
      connection.query(
        "INSERT INTO users (firstName, lastName, email) VALUES (?, ?, ?)",
        [firstName, lastName, email],
        (error, results) => {
          connection.release(); // Release the connection back to the pool

          console.log("SQL is running");

          if (error) {
            console.error("Error executing MySQL query:", error);
            return reply.code(500).send("Internal Server Error");
          }

          // Send the confirmation email
          MailQueue.add({
            to: email,
            from: process.env.EMAIL_FROM,
            subject: "Subscription Confirmed",
            text: template,
          })
            .then(() => {
              return reply.code(200).send();
            })
            .catch((mailError) => {
              console.error("Error sending confirmation email:", mailError);
              return reply.code(500).send("Internal Server Error");
            });
        }
      );
    });
  } catch (error) {
    console.error("Error:", error);
    return reply.code(500).send("Internal Server Error");
  }
}

module.exports = {
  sendEmail,
};
