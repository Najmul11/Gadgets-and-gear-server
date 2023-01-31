const express = require('express');
const cors = require('cors');
require('dotenv').config() 
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app=express()
const port=process.env.PORT || 5000;


app.use(cors())
app.use(express.json())


app.get('/',(req, res)=>{
    res.send('gear server connected')
})
app.listen(port,(req, res)=>{
    console.log('listening to the port',port);
})


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.u5tj5cw.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run (){
    try {
        const productsCollection=client.db('Gadgets-and-gear').collection('products')
        const productDetailsCollection=client.db('Gadgets-and-gear').collection('all-product-details')
        const categoriesCollection=client.db('Gadgets-and-gear').collection('company-category')
        const cartCollection=client.db('Gadgets-and-gear').collection('cart')
        const orderCollection=client.db('Gadgets-and-gear').collection('orders')
        const userCollection=client.db('Gadgets-and-gear').collection('users')

        //  get all products 
        app.get('/products', async(req, res)=>{
            let filter={}
            const result=await productsCollection.find(filter).toArray()
            res.send(result)
        })
        //  get single product for details
        app.get('/products/:id', async(req, res)=>{
            const id=req.params.id
            let filter={id:id}
            const result=await productDetailsCollection.findOne(filter)
            res.send(result)
        })

        // get category names 
        app.get('/categories', async(req, res)=>{
            let filter={}
            const result=await categoriesCollection.findOne(filter)
            res.send(result)
        }) 
        // get categorywise products
        app.get('/categories/:category', async(req, res)=>{
            const category=req.params.category
            let filter={category:category}
            const result=await productsCollection.find(filter).toArray()
            res.send(result)
        }) 

        // get cart items by user email
        app.get('/cart/:email', async(req, res)=>{
            const email=req.params.email
            let filter={email:email}
            const result=await cartCollection.find(filter).toArray()
            res.send(result)
        }) 
        // update qantity for item from cart page increment decrement button
        app.put('/cart/:_id', async(req, res)=>{
            const _id=req.params._id
            const info=req.body
            const quantity=info.modifiedQuantity
            let filter={_id:ObjectId(_id) }
            const option={upsert:true}
                const modified={
                    $set:{
                    quantity:quantity,
                    subTotal:quantity * info.price
                    }
                }
            const result=await cartCollection.updateOne(filter, modified, option)
            res.send(result)
        }) 
        // delete cartItem one by one from cart page delete button  
        app.delete('/cart/:_id', async(req, res)=>{
            const _id=req.params._id
            let filter={_id:new ObjectId(_id)}
            const result=await cartCollection.deleteOne(filter) 
            res.send(result)
        }) 
   
        // delete all items of cart by user using clear cart button from cart page 
        app.delete('/allcartitems/:email', async(req, res)=>{
            const email=req.params.email
            console.log(email);
            let filter={email}
            const result=await cartCollection.deleteMany(filter) 
            res.send(result)
        }) 
 
        // post for adding to cart from sinfleProduct details page
        app.post('/cart',async(req, res)=>{
            const cartItem=req.body
            const productId=cartItem.productId
            const email=cartItem.email
            const color=cartItem.color
            const filter={productId, email}
            const exist= await cartCollection.findOne(filter)
            
            if (exist && exist.color===color) {
                const newQuantity=(exist.quantity)+ 1
                const option={upsert:true}
                const modified={
                    $set:{
                    quantity:newQuantity,
                    subTotal:newQuantity * exist.price
                    }
                }
                const result=await cartCollection.updateOne(filter, modified, option)
                return res.send(result)
            } 
 
            const result=await cartCollection.insertOne(cartItem)
            res.send(result)
        })

        // get all orders for admin 
        app.get('/orders', async(req, res)=>{
            let filter={status:'pending'}
            const result=await orderCollection.find(filter).toArray()
            res.send(result)
        }) 
        // get user specific orders by email for users---order page
        app.get('/orders/:email', async(req, res)=>{
            const email=req.params.email
            let filter={email}
            const result=await orderCollection.find(filter).sort({ $natural: -1 }).toArray()
            res.send(result)
        }) 
        // get order by id to update status by admin
        app.put('/orders/:id', async(req, res)=>{
            const _id=req.params.id
            const condition=req.body.condition
            let filter={_id:ObjectId(_id)}
            const option={upsert:true}
            if (condition==='complete') {
                const modified={
                    $set:{
                        status:'completed'
                    }
                } 
                const result=await orderCollection.updateOne(filter, modified, option )
                res.send(result)
            }
            if (condition==='cancel') {
                const modified={
                    $set:{
                        status:'cancelled'
                    }
                } 
                    const result=await orderCollection.updateOne(filter, modified, option )
                res.send(result)
            }
        }) 


        // post order throgh checkout btn grom cart page 
        app.post('/orders', async(req, res)=>{
            const order=req.body
            const result=await orderCollection.insertOne(order)
            res.send(result)
        })
        // post user when registering
        app.post('/users', async(req, res)=>{
            const user=req.body
            const result=await userCollection.insertOne(user)
            res.send(result)
        })

         // check  admin  by email to give access as admin
         app.get('/users/admincheck/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await userCollection.findOne(query);
            res.send({ isAdmin: user?.role ==='admin'}); 
        })
         // get userinfo for showing address in account detail page
         app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await userCollection.findOne(query);
            res.send(user); 
        })

        // update billing address of user by user specific email
        app.put('/users/:email', async(req, res)=>{
            const email=req.params.email
            const info=req.body
            let filter={email}
            const option={upsert:true}
            const modified={
                $set:{
                    billingName:info.billname,
                    billingAddress:info.billaddress
                }
            }
            const result=await userCollection.updateOne(filter, modified, option)
            res.send(result)
            
        }) 
        // update shipping address of user by user specific email
        app.put('/user/:email', async(req, res)=>{
            const email=req.params.email
            const info=req.body
            let filter={email}
            const option={upsert:true}
            const modified={
                $set:{
                    shippingName:info.shipname,
                    shippingAddress:info.shipaddress
                }
            }
            const result=await userCollection.updateOne(filter, modified, option)
            res.send(result)
            
        })
   
    } 
    finally{
 
    }
}

run().catch(err=>{})
 