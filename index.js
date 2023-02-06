const express = require('express')
const jwt = require('jsonwebtoken')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');


require('dotenv').config()

const app = express()
const port = process.env.PORT || 5000

app.use(cors())
app.use(express.json())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.tw36kgy.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// verify token

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "Unauthorized access" })
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_VAR, function (err, decoded) {
        if (err) {
            return res.status(403).send({ massage: 'forbidden' })
        }
        req.decoded = decoded;
        next();
    });
}




async function run() {
    try {
        await client.connect()
        console.log('connected')
        const productCollection = client.db('shop').collection('products');
        const cartProductsCollections = client.db('shop').collection('cart');
        const orderedVoucherCollections = client.db('shop').collection('customer_addresses');
        const orderedVoucherForAdmin = client.db('shop').collection('orderedVoucherForAdmin');

        const usersCollection = client.db('shop').collection('users');



        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email
            const requesterAccount = await usersCollection.findOne({ email: requester })

            if (requesterAccount.roll === 'admin') {
                next()
            } else {
                res.status(403).send({ massage: 'Forbidden' })
            }
        }


        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {

                $set: user
            }
            const result = await usersCollection.updateOne(filter, updateDoc, options)
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_VAR, { expiresIn: '365d' })
            res.send({ result, token })

        })

        app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { roll: 'admin' }
            }
            const result = await usersCollection.updateOne(filter, updateDoc)
            res.send(result)

        })
        app.get('/admin/:email', async (req, res) => {
            const email = req.params.email
            const user = await usersCollection.findOne({ email: email });
            const isAdmin = user.roll === 'admin'
            res.send({ admin: isAdmin })
        })

        app.get('/user', verifyJWT, verifyAdmin, async (req, res) => {
            const users = await usersCollection.find().toArray()
            res.send(users)
        })


        app.delete('/deleteUser/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await usersCollection.deleteOne(filter);
            res.send(result);
        })

        // Product related api 
        app.post('/product', verifyJWT, verifyAdmin, async (req, res) => {
            const product = req.body;
            const result = productCollection.insertOne(product);
            res.send(result)
        })

        app.get('/productsName/:productName', async (req, res) => {
            const productName = req.params.productName;
            const query = {};
            const cursor = productCollection.find(query);
            products = await cursor.toArray();
            selectedProduct = []
            for (let i = 0; i < products.length; i++) {
                if (productName === 'All') {
                   return res.send(z)
                }

                if (products[i].name.toLowerCase().includes(productName.toLowerCase())) {
                    selectedProduct.push(products[i])
                }

            }
            res.send(selectedProduct)
        })

        app.get('/productsCount', async (req, res) => {
            const count = await productCollection.estimatedDocumentCount();
            res.send({ count })
        })



        app.get('/products/new', async (req, res) => {

            const page = parseInt(req.query.page);
            const size = parseInt(req.query.size);
            const categoryName = req.query.categoryName
            const query = { category: categoryName };

            const cursor = productCollection.find(query);
            let products;
            if (page || size) {
                products = await cursor.skip(page * size).limit(size).toArray();
            } else {
                products = await cursor.toArray();
            }
            res.send(products)
        })


        app.get('/productsCount/:categoryName', async (req, res) => {
            const categoryName = req.params.categoryName;
            const query = { category: categoryName };
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            const count = products.length
            res.send({ count })
        })

        app.get('/pro/:subCategoryName', async (req, res) => {
            const subCategoryName = req.params.subCategoryName;

            const query = { sub_category: subCategoryName };
            const cur = productCollection.find(query);
            const pro = await cur.toArray();
            res.send(pro);
        })

        app.get('/proCount/:subCategoryName', async (req, res) => {
            const categoryName = req.params.subCategoryName;
            const query = { sub_category: categoryName };
            const cursor = productCollection.find(query);
            const products = await cursor.toArray();
            const count = products.length
            res.send({ count })
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


        app.get('/cartProductsCount/:customersEmail', async (req, res) => {
            const customersEmail = req.params.customersEmail;
            const query = { customersEmail: customersEmail };
            const cursor = cartProductsCollections.find(query);
            const products = await cursor.toArray();

            let totalCartProduct = 0;
            for (let i = 0; i < products.length; i++) {
                totalCartProduct = totalCartProduct + products[i].quantity;
            }

            res.send({ count: totalCartProduct })
        })






        // Delete product from cart

        app.delete('/cart/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await cartProductsCollections.deleteOne(filter);
            res.send(result);
        })



        // update quantity of a product


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
                    quantity: updatedObject.quantity,
                    customersEmail: updatedObject.customersEmail
                }
            }







            const result = await cartProductsCollections.updateOne(filter, updatedDoc, options);
            res.send(result);
        })

        //  delete all cart product of a user

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
        app.post('/orderedVoucherForAdmin', async (req, res) => {
            const orderedVoucher = req.body;
            const result = orderedVoucherForAdmin.insertOne(orderedVoucher);
            res.send(result)

        })


        // app.get('/orderedVoucher', verifyJWT, async (req, res) => {
        //     const query = {};
        //     const cursor = orderedVoucherCollections.find(query);
        //     const orderedVoucher = await cursor.toArray();
        //     res.send(orderedVoucher)
        // })

        app.get('/orderedVoucherForAdmin', verifyJWT, async (req, res) => {
            const query = {};
            const cursor = orderedVoucherForAdmin.find(query);
            const orderedVoucher = await cursor.toArray();
            res.send(orderedVoucher)
        })


        app.get('/orderedVoucher/:customersEmail', verifyJWT, async (req, res) => {
            const customersEmail = req.params.customersEmail;
            const query = { customersEmail: customersEmail };
            const cursor = orderedVoucherCollections.find(query);
            const orderedVoucher = await cursor.toArray();
            res.send(orderedVoucher)
        })

        app.delete('/orderedVoucherForAdmin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const result = await orderedVoucherForAdmin.deleteOne(filter);
            res.send(result);
        })




    } finally {

    }

}


run().catch(console.dir)



app.get('/', async (req, res) => {
    res.send('This is first deployment in heroku')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})








