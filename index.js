const express = require("express");
const cors = require("cors");
require("dotenv").config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();

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
    // await client.connect();

    const shopCollection = client.db("inventoryDB").collection("shops");
    const productsCollection = client.db("inventoryDB").collection("products");
    const userCollection = client.db("inventoryDB").collection("users");
    const cartCollection = client.db("inventoryDB").collection("carts");
    const salesCollection = client.db("inventoryDB").collection("sales");
    const paymentCollection = client.db("inventoryDB").collection("payment");


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
      const query = { _id: new ObjectId(id) };
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

    // cart related API
    app.get('/carts', async (req, res) => {
      const email = req.query.email;
      const query = { email: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result);
    });

    app.post('/carts/:id', async (req, res) => {
      const cartItem = req.body;
      const result = await cartCollection.insertOne(cartItem);
      res.send(result);
    });



    // user related API

    app.get('/user', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    app.post('/user', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists', insertedId: null })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.patch('/user/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      // const filter = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const userUpdateInfo = req.body;
      const userData = {
        $set: {
          name: userUpdateInfo.name,
          logo: userUpdateInfo.logo,
          productLimit: userUpdateInfo.productLimit,
          role: userUpdateInfo.role,

        }
      }
      const result = await productsCollection.updateOne(query, userData, options);
      res.send(result);

    });

    // sales related api

    app.get('/getPaid/:productId', async (req, res) => {
      try {
        const productId = req.params.productId;

        const productQuery = { productId: new ObjectId(productId) };
        const product = await salesCollection.findOne(productQuery);

        if (!product) {
          return res.status(404).json({ error: 'Product not found' });
        }

        res.status(200).json(product);
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });


    app.post('/getPaid/:productId', async (req, res) => {
      try {
        const productId = req.params.productId;


        const productQuery = { _id: new ObjectId(productId) };
        const product = await productsCollection.findOne(productQuery);

        if (!product) {
          return res.status(404).json({ error: 'Product not found' });
        }


        const sellingPrice = parseFloat(product.cost) + 0.075 * parseFloat(product.cost) + parseFloat(product.profit);

        const salesInfo = {
          productId: product._id,
          productName: product.name,
          quantity: product.quantity,
          sellingPrice,
          date: new Date(),
        };


        const result = await salesCollection.insertOne(salesInfo);


        const updateQuery = { _id: new ObjectId(productId) };
        const updateData = {
          $inc: { saleCount: 1 },
        };
        await productsCollection.updateOne(updateQuery, updateData);


        const newQuantity = product.quantity - 1;
        if (newQuantity < 0) {
          return res.status(400).json({ error: 'Product out of stock' });
        }
        const quantityUpdateQuery = { _id: new ObjectId(productId) };
        const quantityUpdateData = {
          $set: { quantity: newQuantity },
        };
        await productsCollection.updateOne(quantityUpdateQuery, quantityUpdateData);

        res.status(201).json({ message: 'Transaction completed successfully', result });
      } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
      }
    });


    // payment Api
    app.get('/payments/:email', async (req, res) => {
      const query = { email: req.params.email }
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    })

    // payment intent
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      // console.log(price);
      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });

    // app.post('/payments', async (req, res) => {
    //   const payment = req.body;
    //   const paymentResult = await paymentCollection.insertOne(payment);
    //   const deleteResult = await cartCollection.deleteMany(query);

    //   res.send({ paymentResult, deleteResult });
    // })

    app.post('/payments', async (req, res) => {
      const payment = req.body;

      try {

        const paymentResult = await paymentCollection.insertOne(payment);


        const updateUserQuery = { email: payment.email };
        let updatedProductLimit;

        switch (payment.plan) {
          case '$10':
            updatedProductLimit = 200;
            break;
          case '$20':
            updatedProductLimit = 450;
            break;
          case '$50':
            updatedProductLimit = 1500;
            break;
          default:
            updatedProductLimit = 0;
        }

        const updateResultUser = await userCollection.updateOne(
          updateUserQuery,
          { $set: { productLimit: updatedProductLimit } }
        );

        // Update the shop's product limit and increase income for admin
        if (payment.role === 'admin') {
          const updateResultShop = await shopCollection.updateOne(
            { ownerId: payment.userId },
            { $inc: { productLimit: updatedProductLimit, income: payment.amount } }
          );
        }

        res.send({ paymentResult, updateResultUser });
      } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
      }
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