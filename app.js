import express from 'express';
import pg from 'pg';

const app = express();
const PORT = 3000;

app.set('view engine', 'ejs');
app.set('views', './views');
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

// connecting with postgresql database
const db = new pg.Client({
    user: "postgres",
    host: "localhost",
    database: "banking_system",
    password: "postgres@224",
    port: 5432, 
});
db.connect();

async function getCustomerByName(req){
    const name = req.body.fullName;
    try {
      const result = await db.query("SELECT * FROM Customer WHERE Name = $1", [name]);
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching customer by name:', error);
      throw error;
    }
}


  async function getBankAccountByAccountNumber(req) {
    const accountNumber = req.body.accountNumber;
    try {
      const result = await db.query("SELECT * FROM BankAccount WHERE Account_number = $1", [accountNumber]);
      return result.rows[0];
    } catch (error) {
      console.error('Error fetching bank account by account number:', error);
      throw error;
    }
  }

  async function getRegistrationdetail(req) {
    const accountNumber = req.body.accountNumber;
    try {
      const result = await db.query("SELECT * FROM Registration WHERE Account_number = $1", [accountNumber]);
      return result.rows[0];
    } catch (error) {
      console.error('Accounnt Number is invalid:', error);
      throw error;
    }
  }

async function register(req, id){
    const { fullName, accountNumber, password, pin } = req.body;
        const query = `
          INSERT INTO Registration (Customer_id, Account_number, Password, PIN) 
          VALUES ($1, $2, $3, $4)
        `;
        try {
          await db.query(query, [id, accountNumber, password, pin]);

        } catch (error) {
          console.error('Error inserting registration data:', error);
          throw error;
        }
}

async function getBranch(req) {
    const accountNumber = req.body.accountNumber;
    try {
        const result = await db.query("SELECT * FROM Branch WHERE Account_number = $1", [accountNumber]);
        return result.rows[0];
    } catch (error) {
        console.error('Error fetching branch by account number:', error);
        throw error;
    }
}

async function getInsurancebyid(id) {

    try {
        const result = await db.query("SELECT * FROM Insurance_policy WHERE Customer_id = $1", [id]);
        return result.rows;
    } catch (error) {
        console.error('Error fetching policies:', error);
        throw error;
    }
}

async function getpayemntbyid(id) {
    try {
        const result = await db.query("SELECT * FROM Payment WHERE Customer_id = $1 ORDER BY Payment_date DESC", [id]);
        return result.rows;
    } catch (error) {
        console.error('Error fetching policies:', error);
        throw error;        
    }
}

async function getInsurancebypid(policy_id) {

    try {
        const result = await db.query("SELECT * FROM Insurance_policy WHERE Policy_id = $1", [policy_id]);
        return result.rows[0];
    } catch (error) {
        console.error('Error fetching policies:', error);
        throw error;
    }
}

async function getpayemntbypid(policy_id) {
    try {
        const result = await db.query("SELECT * FROM Payment WHERE Policy_id = $1 ORDER BY Payment_id DESC", [policy_id]);
        return result.rows;
    } catch (error) {
        console.error('Error fetching policies:', error);
        throw error;        
    }
}

async function makepayment(req){
    const {policyId, amount_left, amount, customer_id} = req.body;
    const paymentDate = new Date();
    const amountLeft = amount_left - amount;
    const query = `
    INSERT INTO Payment (Policy_Id, Payment_date, Amount_Paid, Amount_Left, Customer_id)
    VALUES ($1, $2, $3, $4, $5)
    `;
    try {
        await db.query(query, [policyId, paymentDate, amount, amountLeft, customer_id]);
    } catch (error) {
        console.log(error);
        throw error;
    }
}

app.get("/register",  (req, res) => {
    res.render("register");
});

app.post('/register', async(req, res) => {
    const { fullName, accountNumber, password, pin } = req.body;
    const customer = await getCustomerByName(req);
    const details = await getBankAccountByAccountNumber(req);
    console.log(customer);
    try {
        try {
            await register(req,customer.customer_id);
            res.redirect("login");
        } catch (error) {
            res.json("ERROR!!")
            console.log(error);
        }
        
    } catch (error) {
        throw error;
    }

});

app.get("/login",  (req, res) => {
    res.render("login");
});



app.post("/",  async(req, res) => {
    const reg_detail = await getRegistrationdetail(req);
    const password = req.body.password;
    try {
        if(password == reg_detail.password){
            const branch = await getBranch(req);
            const policies = await getInsurancebyid(reg_detail.customer_id);
            const payments = await getpayemntbyid(reg_detail.customer_id);
            console.log(branch);
            console.log(policies);
            console.log(payments);
            res.render("home",{
                branch,
                policies,
                payments,
            });
            
        }
    } catch (error) {
        console.log("Either password or Account number is invalid");
        throw error
    }
});


app.get('/policy/:policy_id', async (req, res) => {
    const policyId = req.params.policy_id;

    try {
        const policy = await getInsurancebypid(policyId);
        const payments = await getpayemntbypid(policyId);
        res.render("policy",{
            policy,
            payments
        });
    } catch (error) {

    }
});

app.get('/payment/:policy_id', async (req, res) => {
    const policyId = req.params.policy_id;

    try {
        const policy = await getInsurancebypid(policyId);
        const payments = await getpayemntbypid(policyId);
        const amount_left = payments[0].amount_left;
        console.log(payments);
        res.render("payment",{
            policy,
            amount_left
        });
    } catch (error) {

    }
});

app.post('/submit', async (req, res) => {
    const customer_id = req.body.customer_id;
    console.log(customer_id);
    try {
        await makepayment(req);

        res.redirect(`/success/?customer_id=${customer_id}`);
    } catch (error) {
        console.log(error);
        res.status(500).send("Something went wrong");
    }
});

app.get('/success', async (req, res) => {
    const customer_id = req.query.customer_id;
    console.log(customer_id);
    try {
        const policies = await getInsurancebyid(customer_id);
        const payments = await getpayemntbyid(customer_id);
        
        res.render('home', { 
            policies,
            payments
        });
    } catch (error) {
        console.log(error);
        res.status(500).send("Error loading data");
    }
});


app.listen(PORT, () => {
    console.log(`App is listening on port ${PORT}`);
});

