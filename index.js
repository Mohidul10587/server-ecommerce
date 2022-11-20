const express = require('express')
const http = require('http');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const options = require('generator-nest-js-boilerplate/generators/app/options');

require('dotenv').config()

const app = express()
const port = process.env.PORT || 5001

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tw36kgy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
        await client.connect()
        console.log('connected')
        const productCollection = client.db('shop').collection('products');
        const cartProductsCollections = client.db('shop').collection('cart');
        const orderedVoucherCollections = client.db('shop').collection('customer_addresses');




        // Product related api 
        app.post('/product', async (req, res) => {
            const product = req.body;
            const result = productCollection.insertOne(product);
            res.send(result)
        })
        app.get('/products', async (req, res) => {
            const query = {};
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products)
        })
        app.get('/products/:categoryName', async (req, res) => {
            const categoryName = req.params.categoryName;
            const query = { category: categoryName };
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            res.send(products);
        })
        app.get('/pro/:subCategoryName', async (req, res) => {
            const subCategoryName = req.params.subCategoryName;

            const query = { sub_category: subCategoryName };
            const cur = productCollection.find(query);
            const pro = await cur.toArray();


            res.send(pro);
        })

        app.get('/product/:productId', async (req, res) => {
            const productId = req.params.productId;
            const product = await productCollection.findOne({ _id: ObjectId(productId) });
            res.send(product);
        })

        // Cart api
        app.post('/cart/:customersEmail', async (req, res) => {
            const customersEmail = req.params.customersEmail;
            const product = req.body;
            const query = {};
            const cursor = cartProductsCollections.find(query);
            const products = await cursor.toArray();

            for (let i = 0; i < products.length; i++) {
                if (products[i].customersEmail === customersEmail && products[i].name === product.name && products[i].price === product.price) {
                    res.send({ result: 'fail' })
                    return
                }

            }
            const result = cartProductsCollections.insertOne(product);
            res.send(result)
        })
        app.get('/cart/:customersEmail', async (req, res) => {
            const customersEmail = req.params.customersEmail;
            const query = { customersEmail: customersEmail };
            const cursor = cartProductsCollections.find(query);
            const products = await cursor.toArray();
            res.send(products)
        })
        app.get('/', async (req, res) => {
            res.send('This is first deployment in heroku')
        })


        // Delete product from cart

        app.delete('/cart/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await cartProductsCollections.deleteOne(filter);
            res.send(result);
        })
        app.put('/cart/:id', async (req, res) => {
            const id = req.params.id;
            const updatedObject = req.body;
            const filter = { _id: ObjectId(id) };
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    name: updatedObject.name,
                    price: updatedObject.price,
                    category: updatedObject.category,
                    sub_category: updatedObject.sub_category,
                    img: updatedObject.img,
                    quantity:updatedObject.quantity,
                    customersEmail: updatedObject.customersEmail
                }
            }
            const result = await cartProductsCollections.updateOne(filter ,updatedDoc,options);
            res.send(result);
        })
        app.delete('/cart2/:customersEmail', async (req, res) => {
            const customersEmail = req.params.customersEmail;
            const query = { customersEmail: customersEmail };
            const result = await cartProductsCollections.deleteMany(query);
            res.send(result);
        })



        // Customer's address collection


        app.post('/orderedVoucher', async (req, res) => {
            const orderedVoucher = req.body;
            const result = orderedVoucherCollections.insertOne(orderedVoucher);
            res.send(result)

        })


        app.get('/orderedVoucher', async (req, res) => {
            const query = {};
            const cursor = orderedVoucherCollections.find(query);
            const orderedVoucher = await cursor.toArray();
            res.send(orderedVoucher)
        })

        app.get('/orderedVoucher/:customersEmail', async (req, res) => {
            const customersEmail = req.params.customersEmail;
            const query = { customersEmail: customersEmail };
            const cursor = orderedVoucherCollections.find(query);
            const orderedVoucher = await cursor.toArray();
            res.send(orderedVoucher)
        })

    } finally {

    }

}


run().catch(console.dir)

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})
