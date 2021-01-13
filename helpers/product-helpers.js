var db = require('../config/connection')
var collection = require('../config/collections');
const { response } = require('express');
var objectId = require('mongodb').ObjectID
module.exports = {
    addProudct: (product, callback) => {
        let user = {
            name: product.Name,
            category: product.category,
            discription: product.discription,
            price: parseInt(product.price)
        }
        //console.log(user);
        db.get().collection('product').insertOne(user).then((data) => {
            console.log(data)
            callback(data.ops[0]._id)
        })
    },
    login: (admin) => {
        return new Promise((resolve, reject) => {
            Main = {
                email: "easycart@gmail.com",
                passwd: "654"
            }
            if (Main.email == admin.Email && Main.passwd == admin.Password) {
                //console.log("yes");
                response.status = true
                response.admin
                resolve(response)
            } else {
                //console.log("Nooooo");
                response.status = false
                resolve(response)
            }
        })
    },
    getAllproduct: () => {
        return new Promise(async (resolve, reject) => {
            let product = await db.get().collection('product').find().toArray()
            resolve(product)
        })
    },
    deleteProduct: (ProId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).removeOne({ _id: objectId(ProId) }).then((response) => {
                resolve(response)
            })
        })
    },
    getProductDetails: (ProId) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({ _id: objectId(ProId) }).then((product) => {
                resolve(product)
            })
        })
    },
    updateProduct: (proId, proDetails) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.PRODUCT_COLLECTION)
                .updateOne({ _id: objectId(proId) }, {
                    $set: {
                        name: proDetails.Name,
                        discription: proDetails.discription,
                        price: parseInt(proDetails.price),
                        category: proDetails.category
                    }
                }).then((response) => {
                    resolve()
                })
        })
    },
    getAllOrders: () => {
        return new Promise(async (resolve, reject) => {
            let orders = await db.get().collection(collection.ORDER_COLLECTION).find().toArray()
            // console.log(orders);
            resolve(orders)
        })
    },
    viewOrderProducts: (id) => {
        return new Promise((resolve, reject) => {
            db.get().collection(collection.ORDER_COLLECTION).findOne({ _id: objectId(id) }).then((orders) => {
                // console.log(orders.products);
                resolve(orders.products)
            })
        })
    },
    getAllUsers: () => {
        return new Promise(async (resolve, reject) => {
            let users = await db.get().collection(collection.USER_COLLECTION).find().toArray()
            // console.log(users);
            resolve(users)
        })
    },
    deliverProduct: (id) => {
        return new Promise(async (resolve, reject) => {
            let order=await db.get().collection(collection.ORDER_COLLECTION).findOne({_id: objectId(id)})
            // console.log(order);
            await db.get().collection(collection.ORDER_COLLECTION).removeOne({_id:objectId(id)})
            order.status='Deliverd';
            // console.log(order);
            await db.get().collection(collection.ORDER_COLLECTION).insertOne(order).then(()=>{
                // console.log(order);
                resolve(order.deliveryDetails)
            })
        })
    },
    cancelOrder:(id)=>{
        return new Promise(async(resolve,reject)=>{
            let order=await db.get().collection(collection.ORDER_COLLECTION).findOne({_id: objectId(id)})
            // console.log(order);
            await db.get().collection(collection.ORDER_COLLECTION).removeOne({_id:objectId(id)})
            order.status='Cancelled'
            // console.log(order);
            await db.get().collection(collection.ORDER_COLLECTION).insertOne(order).then(()=>{
                resolve(order.deliveryDetails)
            })
        })
    },
    packOrder:(id)=>{
        return new Promise(async(resolve,reject)=>{
            let order=await db.get().collection(collection.ORDER_COLLECTION).findOne({_id: objectId(id)})
            // console.log(order);
            await db.get().collection(collection.ORDER_COLLECTION).removeOne({_id:objectId(id)})
            order.status='Packed'
            // console.log(order);
            await db.get().collection(collection.ORDER_COLLECTION).insertOne(order).then(()=>{
                resolve(order.deliveryDetails)
            })
        })
    },
    shippedOrder:(id)=>{
        return new Promise(async(resolve,reject)=>{
            let order=await db.get().collection(collection.ORDER_COLLECTION).findOne({_id: objectId(id)})
            // console.log(order);
            await db.get().collection(collection.ORDER_COLLECTION).removeOne({_id:objectId(id)})
            order.status='Shipped'
            // console.log(order);
            await db.get().collection(collection.ORDER_COLLECTION).insertOne(order).then(()=>{
                resolve(order.deliveryDetails)
            })
        })
    }
}