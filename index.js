const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
require("dotenv").config();
const port = process.env.PORT || 5000;

//  middleware

app.use(cors());
app.use(express.json());

// console.log(process.env.DB_USER);
// console.log(process.env.DB_PASS);

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster57.zv2w8cs.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server (optional starting in v4.7)
    await client.connect();

    const shopCollection = client.db("inventoryDB").collection("shops");
    const productsCollection = client.db("inventoryDB").collection("products");
    const userCollection = client.db("inventoryDB").collection("users");


// shop related API
    app.get('/shop', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await shopCollection.find(query).toArray();
      res.send(result);
    });

    
    app.post('/shop', async (req, res) => {
      try {
        const ownerEmail = req.body.ownerEmail;
        const userProductCount = await shopCollection.countDocuments({ ownerEmail });
        const maxProductsAllowed = 1;
        if (userProductCount >= maxProductsAllowed) {
          return res.status(403).json({ error: 'Product creation limit reached' });
        }
        const shopInfo = { ...req.body, ownerEmail };
        const result = await shopCollection.insertOne(shopInfo);
        res.status(201).json({ message: 'Product created successfully', result });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

// product related API
    app.get('/products', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await productsCollection.find(query).toArray();
      res.send(result);
    });
    
    app.post('/products', async (req, res) => {
      try {
        const ownerEmail = req.body.ownerEmail;
        const userProductCount = await productsCollection.countDocuments({ ownerEmail });
        const maxProductsAllowed = 3;
        if (userProductCount >= maxProductsAllowed) {
          return res.status(403).json({ error: 'Product added limit reached' });
        }
        const productsInfo = { ...req.body, ownerEmail };
        const result = await productsCollection.insertOne(productsInfo);
        res.status(201).json({ message: 'Product added successfully', result });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });

    app.get('/products/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId (id) };
      const result = await productsCollection.findOne(query);
      res.send(result);
    });

    app.delete('/products/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    })

    app.put('/products/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateInfo = req.body;
      const productData = {
        $set: {
          name: updateInfo.name,
          imageUrl: updateInfo.imageUrl,
          quantity: updateInfo.quantity,
          profit: updateInfo.profit,
          discount: updateInfo.discount,
          description: updateInfo.description,
          cost: updateInfo.cost,
          location: updateInfo.location,

        }
      }
      const result = await productsCollection.updateOne(filter, productData, options);
      res.send(result);

    });
    
    // app.patch('/products/:id', async (req, res) => {
    //   const id = req.params.id;
    //   const filter = { _id: new ObjectId(id) };
    //   // const updatedDoc = {
    //   //   // $set: {
    //   //   //   role: 'admin'
    //   //   // }
    //   // }
    //   const result = await productsCollection.updateOne(filter, updatedDoc);
    //   res.send(result);
    // })


    // user related API

    app.post('/user', async (req, res) => {
      const user = req.body;
      // insert email if user doesnt exists: 
      // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Inventory management system is running");
});

app.listen(port, () => {
  console.log(`Inventory management system on port ${port}`);
});